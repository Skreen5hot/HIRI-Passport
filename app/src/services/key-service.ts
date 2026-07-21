import { deriveAuthority } from "../../../src/core/authority.mjs";
import { methodAuthority, parseVerificationMethod } from "../../../src/core/scalars.mjs";
import {
  ProtectedKeyError,
  createProtectedKeyStore,
  type KeyCapabilityEvidence,
  type ProtectedKeyAtomicSettings,
  type ProtectedKeyCrypto,
  type ProtectedKeyDescriptor,
  type ProtectedKeyStore
} from "../adapters/protected-key-store";
import type { PassportDatabase } from "../storage/database";
import type { StorageCoordinator } from "../storage/storage-coordinator";

export type KeyOperation =
  | "authority-creation"
  | "presentation-signing"
  | "same-device-rotation"
  | "key-compromise"
  | "authority-abandonment"
  | "destructive-key-deletion";

export type KeyOperationAuthorizer = Readonly<{
  authorize(input: Readonly<{ operation: KeyOperation; stateHash: string }>): Promise<void>;
}>;

export type HolderKeySet = Readonly<{
  authority: string;
  signing: ProtectedKeyDescriptor;
  agreement: ProtectedKeyDescriptor;
  createdAt: string;
}>;

export type HolderKeySetAtomicCommit = (input: Readonly<{
  holder: HolderKeySet;
  settings: ProtectedKeyAtomicSettings;
}>) => Promise<void>;

export type KeyService = Readonly<{
  database: PassportDatabase;
  authorization: KeyOperationAuthorizer;
  createHolderKeySet(input: Readonly<{
    stateHash: string;
    commitPublicState?: HolderKeySetAtomicCommit;
  }>): Promise<HolderKeySet>;
  createSuccessorSigningKey(input: Readonly<{
    authority: string;
    methodId: string;
    stateHash: string;
  }>): Promise<ProtectedKeyDescriptor>;
  inspect(keyId: string): Promise<ProtectedKeyDescriptor | undefined>;
  list(): Promise<readonly ProtectedKeyDescriptor[]>;
  sign(input: Readonly<{ methodId: string; bytes: Uint8Array; stateHash: string }>): Promise<Uint8Array>;
  derive(input: Readonly<{ methodId: string; peerPublicKey: Uint8Array }>): Promise<Uint8Array>;
  markCompromised(input: Readonly<{
    keyId: string;
    replacementKeyId: string;
    stateHash: string;
  }>): Promise<ProtectedKeyDescriptor>;
  retire(input: Readonly<{
    keyId: string;
    replacementKeyId: string;
    stateHash: string;
  }>): Promise<ProtectedKeyDescriptor>;
  deleteKey(input: Readonly<{
    keyId: string;
    confirmedMethodId: string;
    acknowledgeIrrecoverableLoss: true;
    abandonAuthority: boolean;
    replacementKeyId?: string;
    stateHash: string;
  }>): Promise<ProtectedKeyDescriptor>;
}>;

export type KeyServiceErrorCode =
  | "RHP_KEY_EVIDENCE_EXPIRED"
  | "RHP_KEY_AUTHORIZATION_INPUT_INVALID"
  | "RHP_KEY_AUTHORITY_EXISTS"
  | "RHP_KEY_REPLACEMENT_REQUIRED"
  | "RHP_KEY_DELETION_REFUSED";

const SAFE_MESSAGES = Object.freeze<Record<KeyServiceErrorCode, string>>({
  RHP_KEY_EVIDENCE_EXPIRED: "Protected-key capability evidence is missing or expired.",
  RHP_KEY_AUTHORIZATION_INPUT_INVALID: "The protected-key operation binding is invalid.",
  RHP_KEY_AUTHORITY_EXISTS: "A local holder authority already exists.",
  RHP_KEY_REPLACEMENT_REQUIRED: "Another active local method is required before this key can change state.",
  RHP_KEY_DELETION_REFUSED: "Protected key deletion confirmation did not match the stored method."
});

export class KeyServiceError extends Error {
  readonly code: KeyServiceErrorCode;

  constructor(code: KeyServiceErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "KeyServiceError";
    this.code = code;
  }
}

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const GENERATED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const LEASE_TTL_MS = 5 * 60 * 1000;

function defaultNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function requireStateHash(value: string): void {
  if (!HASH_PATTERN.test(value)) throw new KeyServiceError("RHP_KEY_AUTHORIZATION_INPUT_INVALID");
}

function requireProtocolTime(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)) {
    throw new KeyServiceError("RHP_KEY_EVIDENCE_EXPIRED");
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().replace(".000Z", "Z") !== value) {
    throw new KeyServiceError("RHP_KEY_EVIDENCE_EXPIRED");
  }
  return milliseconds;
}

function requireEvidence(evidence: KeyCapabilityEvidence, now: string): void {
  if (!HASH_PATTERN.test(evidence.sha256) || requireProtocolTime(now) >= requireProtocolTime(evidence.notAfter)) {
    throw new KeyServiceError("RHP_KEY_EVIDENCE_EXPIRED");
  }
}

function requireGeneratedId(value: string): string {
  if (!GENERATED_ID_PATTERN.test(value) || value.startsWith("rhp-probe-")) {
    throw new KeyServiceError("RHP_KEY_AUTHORIZATION_INPUT_INVALID");
  }
  return value;
}

function requireMethodForAuthority(methodId: string, authority: string): void {
  try {
    parseVerificationMethod(methodId);
    if (methodAuthority(methodId) !== authority) throw new TypeError("method authority mismatch");
  } catch (error) {
    throw new KeyServiceError("RHP_KEY_AUTHORIZATION_INPUT_INVALID", { cause: error });
  }
}

export function createKeyService(options: Readonly<{
  database: PassportDatabase;
  coordinator: StorageCoordinator;
  authorization: KeyOperationAuthorizer;
  capabilityEvidence: KeyCapabilityEvidence;
  clock?: Readonly<{ now(): string }>;
  randomId?: () => string;
  crypto?: ProtectedKeyCrypto;
  store?: ProtectedKeyStore;
}>): KeyService {
  if (options.database.profile !== "real-holder-preview" || options.coordinator.database !== options.database) {
    throw new TypeError("key service requires one real-holder-preview storage boundary");
  }
  if (!options.authorization || typeof options.authorization.authorize !== "function") {
    throw new TypeError("key operation authorizer is required");
  }
  const clock = options.clock ?? Object.freeze({ now: defaultNow });
  const randomId = options.randomId ?? (() => globalThis.crypto.randomUUID());
  const store = options.store ?? createProtectedKeyStore({ database: options.database, crypto: options.crypto });

  function freshNow(): Readonly<{ text: string; milliseconds: number }> {
    const text = clock.now();
    requireEvidence(options.capabilityEvidence, text);
    return Object.freeze({ text, milliseconds: requireProtocolTime(text) });
  }

  async function authorized<Result>(input: Readonly<{
    operation: KeyOperation;
    stateHash: string;
    scope: string;
    run(now: string): Promise<Result>;
  }>): Promise<Result> {
    requireStateHash(input.stateHash);
    const before = freshNow();
    const token = `key-op-${requireGeneratedId(randomId())}`;
    return options.coordinator.runSensitiveOperation({
      scope: input.scope,
      token,
      now: before.milliseconds,
      ttlMs: LEASE_TTL_MS
    }, async () => {
      await options.authorization.authorize(Object.freeze({
        operation: input.operation,
        stateHash: input.stateHash
      }));
      const after = freshNow();
      return input.run(after.text);
    });
  }

  async function requireReplacement(target: ProtectedKeyDescriptor, replacementKeyId: string): Promise<ProtectedKeyDescriptor> {
    const replacement = await store.inspect(replacementKeyId);
    if (!replacement || replacement.keyId === target.keyId || replacement.lifecycle !== "active" ||
      replacement.authority !== target.authority || replacement.purpose !== target.purpose) {
      throw new KeyServiceError("RHP_KEY_REPLACEMENT_REQUIRED");
    }
    if (!await store.hasProtectedHandle(replacement.keyId)) {
      throw new KeyServiceError("RHP_KEY_REPLACEMENT_REQUIRED");
    }
    return replacement;
  }

  async function createHolderKeySet(input: Readonly<{
    stateHash: string;
    commitPublicState?: HolderKeySetAtomicCommit;
  }>): Promise<HolderKeySet> {
    return authorized({
      operation: "authority-creation",
      stateHash: input.stateHash,
      scope: "protected-keys:authority-creation",
      run: async createdAt => {
        if ((await store.list()).some(value => value.purpose === "signing" && value.lifecycle !== "deleted")) {
          throw new KeyServiceError("RHP_KEY_AUTHORITY_EXISTS");
        }
        await store.verifyDurableSupport(["Ed25519", "X25519"]);
        const signingKeyId = `signing-${requireGeneratedId(randomId())}`;
        const agreementKeyId = `agreement-${requireGeneratedId(randomId())}`;
        let authority = "";
        const keys = await store.createKeys({
          definitions: Object.freeze([
            Object.freeze({ keyId: signingKeyId, algorithm: "Ed25519", purpose: "signing" }),
            Object.freeze({ keyId: agreementKeyId, algorithm: "X25519", purpose: "agreement" })
          ]),
          createdAt,
          capabilityEvidence: options.capabilityEvidence,
          identify(publicKeys) {
            authority = deriveAuthority(publicKeys[signingKeyId]);
            return Object.freeze([
              Object.freeze({
                keyId: signingKeyId,
                authority,
                methodId: `hiri://${authority}/key/main#key-1`
              }),
              Object.freeze({
                keyId: agreementKeyId,
                authority,
                methodId: `hiri://${authority}/key/main#key-agreement-1`
              })
            ]);
          },
          commitPublicState: input.commitPublicState
            ? async ({ keys, settings }) => {
                const signing = keys.find(value => value.keyId === signingKeyId);
                const agreement = keys.find(value => value.keyId === agreementKeyId);
                if (!signing || !agreement || !authority) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
                await input.commitPublicState?.({
                  holder: Object.freeze({ authority, signing, agreement, createdAt }),
                  settings
                });
              }
            : undefined
        });
        const signing = keys.find(value => value.keyId === signingKeyId);
        const agreement = keys.find(value => value.keyId === agreementKeyId);
        if (!signing || !agreement || !authority) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
        return Object.freeze({ authority, signing, agreement, createdAt });
      }
    });
  }

  async function createSuccessorSigningKey(input: Readonly<{
    authority: string;
    methodId: string;
    stateHash: string;
  }>): Promise<ProtectedKeyDescriptor> {
    requireMethodForAuthority(input.methodId, input.authority);
    return authorized({
      operation: "same-device-rotation",
      stateHash: input.stateHash,
      scope: `protected-keys:rotate:${input.authority}`,
      run: async createdAt => {
        const existing = await store.list();
        if (!existing.some(value => value.authority === input.authority && value.purpose === "signing" && value.lifecycle === "active") ||
          existing.some(value => value.methodId === input.methodId && value.lifecycle !== "deleted")) {
          throw new KeyServiceError("RHP_KEY_AUTHORIZATION_INPUT_INVALID");
        }
        await store.verifyDurableSupport(["Ed25519"]);
        const keyId = `signing-${requireGeneratedId(randomId())}`;
        const [created] = await store.createKeys({
          definitions: Object.freeze([Object.freeze({ keyId, algorithm: "Ed25519", purpose: "signing" })]),
          createdAt,
          capabilityEvidence: options.capabilityEvidence,
          identify: () => Object.freeze([Object.freeze({ keyId, authority: input.authority, methodId: input.methodId })])
        });
        if (!created) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
        return created;
      }
    });
  }

  async function transitionWithReplacement(input: Readonly<{
    keyId: string;
    replacementKeyId: string;
    stateHash: string;
    operation: "same-device-rotation" | "key-compromise";
    lifecycle: "retired" | "compromised";
  }>): Promise<ProtectedKeyDescriptor> {
    return authorized({
      operation: input.operation,
      stateHash: input.stateHash,
      scope: `protected-keys:lifecycle:${input.keyId}`,
      run: async at => {
        const target = await store.inspect(input.keyId);
        if (!target) throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
        if (target.lifecycle !== "active") throw new ProtectedKeyError("RHP_KEY_STATE_CONFLICT");
        await requireReplacement(target, input.replacementKeyId);
        return store.transition({
          keyId: target.keyId,
          expectedMethodId: target.methodId,
          from: "active",
          to: input.lifecycle,
          at
        });
      }
    });
  }

  async function deleteKey(input: Parameters<KeyService["deleteKey"]>[0]): Promise<ProtectedKeyDescriptor> {
    if (input.acknowledgeIrrecoverableLoss !== true || typeof input.abandonAuthority !== "boolean") {
      throw new KeyServiceError("RHP_KEY_DELETION_REFUSED");
    }
    return authorized({
      operation: "destructive-key-deletion",
      stateHash: input.stateHash,
      scope: `protected-keys:delete:${input.keyId}`,
      run: async at => {
        const target = await store.inspect(input.keyId);
        if (!target) throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
        if (target.methodId !== input.confirmedMethodId || target.lifecycle === "deleted") {
          throw new KeyServiceError("RHP_KEY_DELETION_REFUSED");
        }
        if (!input.abandonAuthority) {
          if (!input.replacementKeyId) throw new KeyServiceError("RHP_KEY_REPLACEMENT_REQUIRED");
          await requireReplacement(target, input.replacementKeyId);
        }
        const deleted = await store.deleteKey({ keyId: target.keyId, expectedMethodId: target.methodId, at });
        if (await store.hasProtectedHandle(target.keyId)) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
        return deleted;
      }
    });
  }

  return Object.freeze({
    database: options.database,
    authorization: options.authorization,
    createHolderKeySet,
    createSuccessorSigningKey,
    inspect: (keyId: string) => store.inspect(keyId),
    list: () => store.list(),
    sign: input => authorized({
      operation: "presentation-signing",
      stateHash: input.stateHash,
      scope: `protected-keys:sign:${input.methodId}`,
      run: () => store.sign(input.methodId, input.bytes)
    }),
    derive: input => {
      freshNow();
      return store.derive(input.methodId, input.peerPublicKey);
    },
    markCompromised: input => transitionWithReplacement({
      ...input,
      operation: "key-compromise",
      lifecycle: "compromised"
    }),
    retire: input => transitionWithReplacement({
      ...input,
      operation: "same-device-rotation",
      lifecycle: "retired"
    }),
    deleteKey
  });
}
