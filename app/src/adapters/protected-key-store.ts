import type { PassportDatabase } from "../storage/database";

export const PROTECTED_KEY_HANDLE_SCHEMA = "hiri-passport/protected-key-handle/1" as const;
export const PROTECTED_KEY_METADATA_SCHEMA = "hiri-passport/protected-key-metadata/1" as const;
export const PROTECTED_KEY_HANDLE_PREFIX = "rhp:key:handle:" as const;
export const PROTECTED_KEY_METADATA_PREFIX = "rhp:key:metadata:" as const;

export type ProtectedKeyAlgorithm = "Ed25519" | "X25519";
export type ProtectedKeyPurpose = "signing" | "agreement";
export type ProtectedKeyLifecycle = "active" | "retired" | "compromised" | "deleted";

export type KeyCapabilityEvidence = Readonly<{
  sha256: string;
  notAfter: string;
}>;

export type ProtectedKeyDescriptor = Readonly<{
  keyId: string;
  algorithm: ProtectedKeyAlgorithm;
  purpose: ProtectedKeyPurpose;
  authority: string;
  methodId: string;
  publicKeyBytes: Uint8Array;
  lifecycle: ProtectedKeyLifecycle;
  createdAt: string;
  updatedAt: string;
  compromisedAt: string | null;
  retiredAt: string | null;
  deletedAt: string | null;
  capabilityEvidence: KeyCapabilityEvidence;
}>;

export type ProtectedKeyDefinition = Readonly<{
  keyId: string;
  algorithm: ProtectedKeyAlgorithm;
  purpose: ProtectedKeyPurpose;
}>;

export type ProtectedKeyIdentity = Readonly<{
  keyId: string;
  authority: string;
  methodId: string;
}>;

export type ProtectedKeyCrypto = Readonly<Pick<SubtleCrypto,
  "deriveBits" | "exportKey" | "generateKey" | "importKey" | "sign" | "verify"
>>;

/**
 * A deliberately narrow view of the settings store used to commit public
 * holder state in the same transaction as newly generated protected keys.
 * Private CryptoKey handles are never exposed to the callback.
 */
export type ProtectedKeyAtomicSettings = Readonly<{
  get(id: string): Promise<unknown>;
  put(value: Readonly<{ id: string }>): Promise<void>;
}>;

export type ProtectedKeyAtomicCommit = (input: Readonly<{
  keys: readonly ProtectedKeyDescriptor[];
  settings: ProtectedKeyAtomicSettings;
}>) => Promise<void>;

export type ProtectedKeyStore = Readonly<{
  verifyDurableSupport(algorithms: readonly ProtectedKeyAlgorithm[]): Promise<void>;
  createKeys(input: Readonly<{
    definitions: readonly ProtectedKeyDefinition[];
    createdAt: string;
    capabilityEvidence: KeyCapabilityEvidence;
    identify(publicKeys: Readonly<Record<string, Uint8Array>>): readonly ProtectedKeyIdentity[];
    commitPublicState?: ProtectedKeyAtomicCommit;
  }>): Promise<readonly ProtectedKeyDescriptor[]>;
  inspect(keyId: string): Promise<ProtectedKeyDescriptor | undefined>;
  inspectMethod(methodId: string): Promise<ProtectedKeyDescriptor | undefined>;
  list(): Promise<readonly ProtectedKeyDescriptor[]>;
  sign(methodId: string, input: Uint8Array): Promise<Uint8Array>;
  derive(methodId: string, peerPublicKey: Uint8Array): Promise<Uint8Array>;
  transition(input: Readonly<{
    keyId: string;
    expectedMethodId: string;
    from: "active";
    to: "retired" | "compromised";
    at: string;
  }>): Promise<ProtectedKeyDescriptor>;
  deleteKey(input: Readonly<{
    keyId: string;
    expectedMethodId: string;
    at: string;
  }>): Promise<ProtectedKeyDescriptor>;
  hasProtectedHandle(keyId: string): Promise<boolean>;
}>;

export type ProtectedKeyErrorCode =
  | "RHP_KEY_CAPABILITY_UNAVAILABLE"
  | "RHP_KEY_DURABILITY_UNAVAILABLE"
  | "RHP_KEY_ALREADY_EXISTS"
  | "RHP_KEY_NOT_FOUND"
  | "RHP_KEY_NOT_AUTHORIZED"
  | "RHP_KEY_STATE_CONFLICT"
  | "RHP_KEY_CORRUPT";

const SAFE_MESSAGES = Object.freeze<Record<ProtectedKeyErrorCode, string>>({
  RHP_KEY_CAPABILITY_UNAVAILABLE: "Required protected-key cryptography is unavailable.",
  RHP_KEY_DURABILITY_UNAVAILABLE: "Protected key handles did not survive local storage.",
  RHP_KEY_ALREADY_EXISTS: "Protected key state already exists.",
  RHP_KEY_NOT_FOUND: "The protected key is unavailable.",
  RHP_KEY_NOT_AUTHORIZED: "The protected key is not authorized for this operation.",
  RHP_KEY_STATE_CONFLICT: "Protected key state changed before the operation completed.",
  RHP_KEY_CORRUPT: "Protected key state did not pass integrity checks."
});

export class ProtectedKeyError extends Error {
  readonly code: ProtectedKeyErrorCode;

  constructor(code: ProtectedKeyErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "ProtectedKeyError";
    this.code = code;
  }
}

type StoredProtectedKeyHandle = Readonly<{
  id: string;
  schema: typeof PROTECTED_KEY_HANDLE_SCHEMA;
  keyId: string;
  privateKey: CryptoKey;
}>;

type StoredProtectedKeyMetadata = Readonly<{
  id: string;
  schema: typeof PROTECTED_KEY_METADATA_SCHEMA;
  keyId: string;
  algorithm: ProtectedKeyAlgorithm;
  purpose: ProtectedKeyPurpose;
  authority: string;
  methodId: string;
  publicKeyBytes: Uint8Array;
  lifecycle: ProtectedKeyLifecycle;
  createdAt: string;
  updatedAt: string;
  compromisedAt: string | null;
  retiredAt: string | null;
  deletedAt: string | null;
  capabilityEvidence: KeyCapabilityEvidence;
}>;

type GeneratedKey = Readonly<{
  definition: ProtectedKeyDefinition;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBytes: Uint8Array;
}>;

const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const PROTOCOL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const METADATA_KEYS = Object.freeze([
  "algorithm", "authority", "capabilityEvidence", "compromisedAt", "createdAt", "deletedAt", "id", "keyId",
  "lifecycle", "methodId", "publicKeyBytes", "purpose", "retiredAt", "schema", "updatedAt"
] as const);

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

function bytes(value: ArrayBuffer): Uint8Array {
  return new Uint8Array(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function protocolTime(value: unknown): value is string {
  if (typeof value !== "string" || !PROTOCOL_TIME_PATTERN.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().replace(".000Z", "Z") === value;
}

function requireKeyId(value: string, allowProbe = false): void {
  if (!KEY_ID_PATTERN.test(value) || (!allowProbe && value.startsWith("rhp-probe-"))) {
    throw new TypeError("protected key identifier is invalid");
  }
}

function requireEvidence(value: KeyCapabilityEvidence): void {
  if (!record(value) || !exactKeys(value, ["notAfter", "sha256"]) ||
    typeof value.sha256 !== "string" || !HASH_PATTERN.test(value.sha256) || !protocolTime(value.notAfter)) {
    throw new TypeError("capability evidence reference is invalid");
  }
}

function requirePurpose(definition: ProtectedKeyDefinition): void {
  requireKeyId(definition.keyId);
  const expected = definition.algorithm === "Ed25519" ? "signing" : "agreement";
  if (definition.purpose !== expected) throw new TypeError("protected key purpose does not match its algorithm");
}

function usagesFor(algorithm: ProtectedKeyAlgorithm): readonly KeyUsage[] {
  return algorithm === "Ed25519" ? Object.freeze(["sign"] as KeyUsage[]) : Object.freeze(["deriveBits"] as KeyUsage[]);
}

function generationUsages(algorithm: ProtectedKeyAlgorithm): KeyUsage[] {
  return algorithm === "Ed25519" ? ["sign", "verify"] : ["deriveBits"];
}

function sameUsages(actual: readonly KeyUsage[], expected: readonly KeyUsage[]): boolean {
  return actual.length === expected.length && expected.every(usage => actual.includes(usage));
}

function cryptoKey(value: unknown): value is CryptoKey {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}

function requirePrivateKey(value: unknown, algorithm: ProtectedKeyAlgorithm): asserts value is CryptoKey {
  if (!cryptoKey(value) || value.type !== "private" || value.extractable ||
    value.algorithm.name !== algorithm || !sameUsages(value.usages, usagesFor(algorithm))) {
    throw new ProtectedKeyError("RHP_KEY_CORRUPT");
  }
}

function handleId(keyId: string): string {
  return `${PROTECTED_KEY_HANDLE_PREFIX}${keyId}`;
}

function metadataId(keyId: string): string {
  return `${PROTECTED_KEY_METADATA_PREFIX}${keyId}`;
}

function validateMetadata(value: unknown): StoredProtectedKeyMetadata {
  if (!record(value) || !exactKeys(value, METADATA_KEYS) ||
    value.schema !== PROTECTED_KEY_METADATA_SCHEMA || typeof value.keyId !== "string" ||
    value.id !== metadataId(value.keyId) || !KEY_ID_PATTERN.test(value.keyId) ||
    !["Ed25519", "X25519"].includes(String(value.algorithm)) ||
    !["signing", "agreement"].includes(String(value.purpose)) ||
    (value.algorithm === "Ed25519" ? value.purpose !== "signing" : value.purpose !== "agreement") ||
    typeof value.authority !== "string" || value.authority.length < 1 || value.authority.length > 1024 ||
    typeof value.methodId !== "string" || value.methodId.length < 1 || value.methodId.length > 2048 ||
    !value.methodId.startsWith(`hiri://${value.authority}/key/`) ||
    !(value.publicKeyBytes instanceof Uint8Array) || value.publicKeyBytes.byteLength !== 32 ||
    !["active", "retired", "compromised", "deleted"].includes(String(value.lifecycle)) ||
    !protocolTime(value.createdAt) || !protocolTime(value.updatedAt) ||
    (value.compromisedAt !== null && !protocolTime(value.compromisedAt)) ||
    (value.retiredAt !== null && !protocolTime(value.retiredAt)) ||
    (value.deletedAt !== null && !protocolTime(value.deletedAt))) {
    throw new ProtectedKeyError("RHP_KEY_CORRUPT");
  }
  try {
    requireEvidence(value.capabilityEvidence as KeyCapabilityEvidence);
  } catch (error) {
    throw new ProtectedKeyError("RHP_KEY_CORRUPT", { cause: error });
  }
  if ((value.lifecycle === "active" && (value.compromisedAt !== null || value.retiredAt !== null || value.deletedAt !== null)) ||
    (value.lifecycle === "compromised" && value.compromisedAt === null) ||
    (value.lifecycle === "retired" && value.retiredAt === null) ||
    (value.lifecycle === "deleted" && value.deletedAt === null)) {
    throw new ProtectedKeyError("RHP_KEY_CORRUPT");
  }
  return value as StoredProtectedKeyMetadata;
}

function validateHandle(value: unknown, metadata: StoredProtectedKeyMetadata, allowProbe = false): StoredProtectedKeyHandle {
  if (!record(value) || !exactKeys(value, ["id", "keyId", "privateKey", "schema"]) ||
    value.schema !== PROTECTED_KEY_HANDLE_SCHEMA || value.keyId !== metadata.keyId ||
    value.id !== handleId(metadata.keyId)) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
  requireKeyId(metadata.keyId, allowProbe);
  requirePrivateKey(value.privateKey, metadata.algorithm);
  return value as StoredProtectedKeyHandle;
}

function descriptor(metadata: StoredProtectedKeyMetadata): ProtectedKeyDescriptor {
  return Object.freeze({
    keyId: metadata.keyId,
    algorithm: metadata.algorithm,
    purpose: metadata.purpose,
    authority: metadata.authority,
    methodId: metadata.methodId,
    publicKeyBytes: new Uint8Array(metadata.publicKeyBytes),
    lifecycle: metadata.lifecycle,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    compromisedAt: metadata.compromisedAt,
    retiredAt: metadata.retiredAt,
    deletedAt: metadata.deletedAt,
    capabilityEvidence: Object.freeze({ ...metadata.capabilityEvidence })
  });
}

function pair(value: CryptoKeyPair | CryptoKey): CryptoKeyPair {
  if (!record(value) || !cryptoKey(value.privateKey) || !cryptoKey(value.publicKey)) {
    throw new ProtectedKeyError("RHP_KEY_CAPABILITY_UNAVAILABLE");
  }
  return value as CryptoKeyPair;
}

async function generate(
  cryptoPort: ProtectedKeyCrypto,
  definition: ProtectedKeyDefinition,
  allowProbe = false
): Promise<GeneratedKey> {
  try {
    requireKeyId(definition.keyId, allowProbe);
    const generated = pair(await cryptoPort.generateKey(
      { name: definition.algorithm },
      false,
      generationUsages(definition.algorithm)
    ));
    requirePrivateKey(generated.privateKey, definition.algorithm);
    if (generated.publicKey.type !== "public" || generated.publicKey.algorithm.name !== definition.algorithm) {
      throw new ProtectedKeyError("RHP_KEY_CAPABILITY_UNAVAILABLE");
    }
    const publicKeyBytes = bytes(await cryptoPort.exportKey("raw", generated.publicKey));
    if (publicKeyBytes.byteLength !== 32) throw new ProtectedKeyError("RHP_KEY_CAPABILITY_UNAVAILABLE");
    return Object.freeze({ definition, privateKey: generated.privateKey, publicKey: generated.publicKey, publicKeyBytes });
  } catch (error) {
    if (error instanceof ProtectedKeyError && error.code === "RHP_KEY_CAPABILITY_UNAVAILABLE") throw error;
    throw new ProtectedKeyError("RHP_KEY_CAPABILITY_UNAVAILABLE", { cause: error });
  }
}

function probeMetadata(definition: ProtectedKeyDefinition, publicKeyBytes: Uint8Array): StoredProtectedKeyMetadata {
  const timestamp = "1970-01-01T00:00:00Z";
  return {
    id: metadataId(definition.keyId),
    schema: PROTECTED_KEY_METADATA_SCHEMA,
    keyId: definition.keyId,
    algorithm: definition.algorithm,
    purpose: definition.purpose,
    authority: "probe",
    methodId: "hiri://probe/key/capability#probe",
    publicKeyBytes,
    lifecycle: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    compromisedAt: null,
    retiredAt: null,
    deletedAt: null,
    capabilityEvidence: { sha256: `sha256:${"0".repeat(64)}`, notAfter: "2100-01-01T00:00:00Z" }
  };
}

async function proveOperation(
  cryptoPort: ProtectedKeyCrypto,
  generated: GeneratedKey,
  persistedPrivateKey: CryptoKey
): Promise<void> {
  const challenge = new Uint8Array([72, 73, 82, 73]);
  if (generated.definition.algorithm === "Ed25519") {
    const signature = await cryptoPort.sign("Ed25519", persistedPrivateKey, source(challenge));
    const publicKey = await cryptoPort.importKey("raw", source(generated.publicKeyBytes), { name: "Ed25519" }, false, ["verify"]);
    if (!await cryptoPort.verify("Ed25519", publicKey, signature, source(challenge))) {
      throw new ProtectedKeyError("RHP_KEY_DURABILITY_UNAVAILABLE");
    }
    return;
  }
  const publicKey = await cryptoPort.importKey("raw", source(generated.publicKeyBytes), { name: "X25519" }, false, []);
  const shared = await cryptoPort.deriveBits({ name: "X25519", public: publicKey }, persistedPrivateKey, 256);
  if (shared.byteLength !== 32) throw new ProtectedKeyError("RHP_KEY_DURABILITY_UNAVAILABLE");
}

export function createProtectedKeyStore(options: Readonly<{
  database: PassportDatabase;
  crypto?: ProtectedKeyCrypto;
}>): ProtectedKeyStore {
  if (options.database.profile !== "real-holder-preview") {
    throw new TypeError("protected preview keys require the real-holder-preview storage profile");
  }
  const database = options.database;
  const cryptoPort = options.crypto ?? globalThis.crypto.subtle;

  async function metadataForKey(keyId: string): Promise<StoredProtectedKeyMetadata | undefined> {
    requireKeyId(keyId);
    const value = await database.runTransaction(["settings"], "readonly", stores => {
      return stores.request<unknown>(stores.store("settings").get(metadataId(keyId)));
    });
    return value === undefined ? undefined : validateMetadata(value);
  }

  async function pairForMethod(methodId: string): Promise<Readonly<{
    metadata: StoredProtectedKeyMetadata;
    handle: StoredProtectedKeyHandle | undefined;
  }>> {
    if (typeof methodId !== "string" || methodId.length < 1 || methodId.length > 2048) {
      throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
    }
    const values = await database.runTransaction(["keys", "settings"], "readonly", async stores => {
      const all = await stores.request<unknown[]>(stores.store("settings").getAll());
      const matches = all.filter(value => record(value) && typeof value.id === "string" &&
        value.id.startsWith(PROTECTED_KEY_METADATA_PREFIX) && value.methodId === methodId);
      if (matches.length === 0) return { status: "missing" } as const;
      if (matches.length !== 1) return { status: "corrupt" } as const;
      let metadata: StoredProtectedKeyMetadata;
      try {
        metadata = validateMetadata(matches[0]);
      } catch {
        return { status: "corrupt" } as const;
      }
      const handle = await stores.request<unknown>(stores.store("keys").get(handleId(metadata.keyId)));
      return { status: "found", metadata, handle } as const;
    });
    if (values.status === "missing") throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
    if (values.status === "corrupt") throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    return Object.freeze({
      metadata: values.metadata,
      handle: values.metadata.lifecycle === "active" ? validateHandle(values.handle, values.metadata) : undefined
    });
  }

  async function verifyDurableSupport(algorithms: readonly ProtectedKeyAlgorithm[]): Promise<void> {
    const unique = [...new Set(algorithms)];
    if (unique.some(value => value !== "Ed25519" && value !== "X25519")) {
      throw new ProtectedKeyError("RHP_KEY_CAPABILITY_UNAVAILABLE");
    }
    for (const algorithm of unique) {
      const definition: ProtectedKeyDefinition = {
        keyId: `rhp-probe-${algorithm.toLowerCase()}`,
        algorithm,
        purpose: algorithm === "Ed25519" ? "signing" : "agreement"
      };
      const id = handleId(definition.keyId);
      let stored = false;
      let failure: unknown;
      try {
        // A terminated prior probe may leave only this reserved internal
        // handle. Remove it before attempting the next capability proof.
        await database.runTransaction(["keys"], "readwrite", async stores => {
          await stores.request(stores.store("keys").delete(id));
        });
        const generated = await generate(cryptoPort, definition, true);
        await database.runTransaction(["keys"], "readwrite", async stores => {
          const keys = stores.store("keys");
          await stores.request(keys.put({
            id,
            schema: PROTECTED_KEY_HANDLE_SCHEMA,
            keyId: definition.keyId,
            privateKey: generated.privateKey
          } satisfies StoredProtectedKeyHandle));
        });
        stored = true;
        database.close();
        const persisted = await database.runTransaction(["keys"], "readonly", stores => {
          return stores.request<unknown>(stores.store("keys").get(id));
        });
        const metadata = probeMetadata(definition, generated.publicKeyBytes);
        const handle = validateHandle(persisted, metadata, true);
        await proveOperation(cryptoPort, generated, handle.privateKey);
      } catch (error) {
        failure = error;
      } finally {
        if (stored) {
          try {
            await database.runTransaction(["keys"], "readwrite", async stores => {
              await stores.request(stores.store("keys").delete(id));
            });
            const remains = await database.runTransaction(["keys"], "readonly", stores => {
              return stores.request<unknown>(stores.store("keys").get(id));
            });
            if (remains !== undefined) throw new Error("probe handle remains");
          } catch (error) {
            failure ??= error;
          }
        }
      }
      if (failure) {
        if (failure instanceof ProtectedKeyError && failure.code === "RHP_KEY_CAPABILITY_UNAVAILABLE") throw failure;
        throw new ProtectedKeyError("RHP_KEY_DURABILITY_UNAVAILABLE", { cause: failure });
      }
    }
  }

  async function createKeys(input: Parameters<ProtectedKeyStore["createKeys"]>[0]): Promise<readonly ProtectedKeyDescriptor[]> {
    if (!Array.isArray(input.definitions) || input.definitions.length < 1 || input.definitions.length > 8 ||
      !protocolTime(input.createdAt)) throw new TypeError("protected key creation input is invalid");
    requireEvidence(input.capabilityEvidence);
    for (const definition of input.definitions) requirePurpose(definition);
    if (new Set(input.definitions.map(value => value.keyId)).size !== input.definitions.length) {
      throw new TypeError("protected key identifiers must be unique");
    }

    const generated: GeneratedKey[] = [];
    for (const definition of input.definitions) generated.push(await generate(cryptoPort, definition));
    const publicKeys = Object.create(null) as Record<string, Uint8Array>;
    for (const value of generated) publicKeys[value.definition.keyId] = new Uint8Array(value.publicKeyBytes);
    const identities = input.identify(Object.freeze(publicKeys));
    if (!Array.isArray(identities) || identities.length !== generated.length ||
      new Set(identities.map(value => value.keyId)).size !== generated.length) {
      throw new TypeError("protected key identities are incomplete");
    }

    const metadata = generated.map(value => {
      const identity = identities.find(candidate => candidate.keyId === value.definition.keyId);
      if (!identity || typeof identity.authority !== "string" || typeof identity.methodId !== "string" ||
        identity.authority.length < 1 || identity.authority.length > 1024 ||
        identity.methodId.length < 1 || identity.methodId.length > 2048 ||
        !identity.methodId.startsWith(`hiri://${identity.authority}/key/`)) {
        throw new TypeError("protected key identity is invalid");
      }
      return {
        id: metadataId(value.definition.keyId),
        schema: PROTECTED_KEY_METADATA_SCHEMA,
        keyId: value.definition.keyId,
        algorithm: value.definition.algorithm,
        purpose: value.definition.purpose,
        authority: identity.authority,
        methodId: identity.methodId,
        publicKeyBytes: new Uint8Array(value.publicKeyBytes),
        lifecycle: "active",
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        compromisedAt: null,
        retiredAt: null,
        deletedAt: null,
        capabilityEvidence: Object.freeze({ ...input.capabilityEvidence })
      } satisfies StoredProtectedKeyMetadata;
    });

    const descriptors = Object.freeze(metadata.map(descriptor));
    const outcome = await database.runTransaction(["keys", "settings"], "readwrite", async stores => {
      for (const value of generated) {
        if (await stores.request(stores.store("keys").get(handleId(value.definition.keyId))) !== undefined ||
          await stores.request(stores.store("settings").get(metadataId(value.definition.keyId))) !== undefined) {
          return "exists" as const;
        }
      }
      for (let index = 0; index < generated.length; index += 1) {
        const value = generated[index];
        await stores.request(stores.store("keys").put({
          id: handleId(value.definition.keyId),
          schema: PROTECTED_KEY_HANDLE_SCHEMA,
          keyId: value.definition.keyId,
          privateKey: value.privateKey
        } satisfies StoredProtectedKeyHandle));
        await stores.request(stores.store("settings").put(metadata[index]));
      }
      if (input.commitPublicState) {
        const settingsStore = stores.store("settings");
        await input.commitPublicState(Object.freeze({
          keys: descriptors,
          settings: Object.freeze({
            get: (id: string) => stores.request<unknown>(settingsStore.get(id)),
            put: async (value: Readonly<{ id: string }>) => {
              if (!record(value) || typeof value.id !== "string" || value.id.length < 1 || value.id.length > 512 ||
                value.id.startsWith(PROTECTED_KEY_METADATA_PREFIX) || value.id.startsWith(PROTECTED_KEY_HANDLE_PREFIX)) {
                throw new TypeError("atomic public settings record is invalid");
              }
              await stores.request(settingsStore.put(value));
            }
          })
        }));
      }
      return "created" as const;
    });
    if (outcome === "exists") throw new ProtectedKeyError("RHP_KEY_ALREADY_EXISTS");
    return descriptors;
  }

  async function inspect(keyId: string): Promise<ProtectedKeyDescriptor | undefined> {
    const metadata = await metadataForKey(keyId);
    return metadata ? descriptor(metadata) : undefined;
  }

  async function list(): Promise<readonly ProtectedKeyDescriptor[]> {
    const values = await database.runTransaction(["settings"], "readonly", stores => {
      return stores.request<unknown[]>(stores.store("settings").getAll());
    });
    const result = values
      .filter(value => record(value) && typeof value.id === "string" && value.id.startsWith(PROTECTED_KEY_METADATA_PREFIX))
      .map(value => descriptor(validateMetadata(value)));
    return Object.freeze(result);
  }

  async function inspectMethod(methodId: string): Promise<ProtectedKeyDescriptor | undefined> {
    const matches = (await list()).filter(value => value.methodId === methodId);
    if (matches.length > 1) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    return matches[0];
  }

  async function sign(methodId: string, input: Uint8Array): Promise<Uint8Array> {
    const current = await pairForMethod(methodId);
    if (current.metadata.lifecycle !== "active" || current.metadata.algorithm !== "Ed25519") {
      throw new ProtectedKeyError("RHP_KEY_NOT_AUTHORIZED");
    }
    if (!current.handle) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    return bytes(await cryptoPort.sign("Ed25519", current.handle.privateKey, source(input)));
  }

  async function derive(methodId: string, peerPublicKey: Uint8Array): Promise<Uint8Array> {
    if (!(peerPublicKey instanceof Uint8Array) || peerPublicKey.byteLength !== 32) {
      throw new TypeError("X25519 peer public key must be 32 bytes");
    }
    const current = await pairForMethod(methodId);
    if (current.metadata.lifecycle !== "active" || current.metadata.algorithm !== "X25519") {
      throw new ProtectedKeyError("RHP_KEY_NOT_AUTHORIZED");
    }
    if (!current.handle) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    const publicKey = await cryptoPort.importKey("raw", source(peerPublicKey), { name: "X25519" }, false, []);
    return bytes(await cryptoPort.deriveBits({ name: "X25519", public: publicKey }, current.handle.privateKey, 256));
  }

  async function transition(input: Parameters<ProtectedKeyStore["transition"]>[0]): Promise<ProtectedKeyDescriptor> {
    requireKeyId(input.keyId);
    if (input.from !== "active" || !["retired", "compromised"].includes(input.to) || !protocolTime(input.at)) {
      throw new TypeError("protected key transition is invalid");
    }
    const result = await database.runTransaction(["settings"], "readwrite", async stores => {
      const settings = stores.store("settings");
      const raw = await stores.request<unknown>(settings.get(metadataId(input.keyId)));
      if (raw === undefined) return { status: "missing" } as const;
      let current: StoredProtectedKeyMetadata;
      try { current = validateMetadata(raw); } catch { return { status: "corrupt" } as const; }
      if (current.methodId !== input.expectedMethodId || current.lifecycle !== input.from) {
        return { status: "conflict" } as const;
      }
      const updated: StoredProtectedKeyMetadata = {
        ...current,
        lifecycle: input.to,
        updatedAt: input.at,
        compromisedAt: input.to === "compromised" ? input.at : current.compromisedAt,
        retiredAt: input.to === "retired" ? input.at : current.retiredAt
      };
      await stores.request(settings.put(updated));
      return { status: "updated", value: updated } as const;
    });
    if (result.status === "missing") throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
    if (result.status === "corrupt") throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    if (result.status === "conflict") throw new ProtectedKeyError("RHP_KEY_STATE_CONFLICT");
    return descriptor(result.value);
  }

  async function deleteKey(input: Parameters<ProtectedKeyStore["deleteKey"]>[0]): Promise<ProtectedKeyDescriptor> {
    requireKeyId(input.keyId);
    if (!protocolTime(input.at)) throw new TypeError("protected key deletion time is invalid");
    const result = await database.runTransaction(["keys", "settings"], "readwrite", async stores => {
      const settings = stores.store("settings");
      const raw = await stores.request<unknown>(settings.get(metadataId(input.keyId)));
      if (raw === undefined) return { status: "missing" } as const;
      let current: StoredProtectedKeyMetadata;
      try { current = validateMetadata(raw); } catch { return { status: "corrupt" } as const; }
      if (current.methodId !== input.expectedMethodId || current.lifecycle === "deleted") {
        return { status: "conflict" } as const;
      }
      const updated: StoredProtectedKeyMetadata = {
        ...current,
        lifecycle: "deleted",
        updatedAt: input.at,
        deletedAt: input.at
      };
      await stores.request(stores.store("keys").delete(handleId(input.keyId)));
      await stores.request(settings.put(updated));
      return { status: "deleted", value: updated } as const;
    });
    if (result.status === "missing") throw new ProtectedKeyError("RHP_KEY_NOT_FOUND");
    if (result.status === "corrupt") throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    if (result.status === "conflict") throw new ProtectedKeyError("RHP_KEY_STATE_CONFLICT");
    if (await hasProtectedHandle(input.keyId)) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    return descriptor(result.value);
  }

  async function hasProtectedHandle(keyId: string): Promise<boolean> {
    requireKeyId(keyId);
    const values = await database.runTransaction(["keys", "settings"], "readonly", async stores => {
      return {
        handle: await stores.request<unknown>(stores.store("keys").get(handleId(keyId))),
        metadata: await stores.request<unknown>(stores.store("settings").get(metadataId(keyId)))
      };
    });
    if (values.handle === undefined) return false;
    if (values.metadata === undefined) throw new ProtectedKeyError("RHP_KEY_CORRUPT");
    const metadata = validateMetadata(values.metadata);
    validateHandle(values.handle, metadata);
    return true;
  }

  return Object.freeze({
    verifyDurableSupport,
    createKeys,
    inspect,
    inspectMethod,
    list,
    sign,
    derive,
    transition,
    deleteKey,
    hasProtectedHandle
  });
}
