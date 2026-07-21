import {
  decodeBase58Btc,
  decodeBase64Url,
  parseEd25519Authority,
  parseRandomId,
  parseSha256Identifier,
  parseUtcSeconds
} from "../../../src/core/scalars.mjs";
import { CORE_LIMITS } from "../../../src/core/constants.mjs";
import { StorageError, type PassportDatabase } from "./database";
import { atomicTransaction } from "./repositories";
import {
  replaceEncryptedRecords,
  validateStoredEncryptedRecord,
  type StoredEncryptedRecord
} from "./record-store";

export const PORTFOLIO_VERSION_SCHEMA = "hiri-passport/local-encrypted-portfolio-version/1" as const;
export const PORTFOLIO_HEAD_SCHEMA = "hiri-passport/local-encrypted-portfolio-head/1" as const;
export const PORTFOLIO_VERSION_PREFIX = "rhp:portfolio:version:" as const;
export const PORTFOLIO_HEAD_PREFIX = "rhp:portfolio:head:" as const;

export type PortfolioManifest = Readonly<{
  uri: string;
  publisher: string;
  privacy: Readonly<{
    mode: "encrypted";
    parameters: Readonly<{
      algorithm: "AES-256-GCM";
      iv: string;
      tagLength: 128;
      plaintextHash: string;
      plaintextSize: number;
      plaintextFormat: "application/ld+json";
      ephemeralPublicKey: string;
      keyAgreement: "X25519-HKDF-SHA256";
      recipients: readonly Readonly<{ id: string; encryptedKey: string }>[];
    }>;
  }>;
  content: Readonly<{
    hash: string;
    addressing: "raw-sha256";
    canonicalization: "JCS";
    format: "application/octet-stream";
    size: number;
  }>;
}>;

export type StoredPortfolioVersion = Readonly<{
  id: string;
  schema: typeof PORTFOLIO_VERSION_SCHEMA;
  portfolioUri: string;
  authority: string;
  version: number;
  previousHead: string | null;
  storedAt: string;
  publication: "local-only";
  manifest: PortfolioManifest;
  ciphertext: Uint8Array;
  head: string;
  authentication: Readonly<{
    algorithm: "HMAC-SHA-256";
    keyBindingMethodId: string;
    value: string;
  }>;
}>;

export type PortfolioConflictState =
  | Readonly<{ state: "none" }>
  | Readonly<{
      state: "divergent";
      attemptedBaseHead: string | null;
      currentHead: string;
      detectedAt: string;
    }>;

export type StoredPortfolioHead = Readonly<{
  id: string;
  schema: typeof PORTFOLIO_HEAD_SCHEMA;
  portfolioUri: string;
  authority: string;
  currentHead: string;
  version: number;
  updatedAt: string;
  authentication: StoredPortfolioVersion["authentication"];
  conflict: PortfolioConflictState;
}>;

export type PortfolioStoreSnapshot = Readonly<{
  head: StoredPortfolioHead;
  current: StoredPortfolioVersion;
  versions: readonly StoredPortfolioVersion[];
  records: readonly StoredEncryptedRecord[];
}>;

export type PortfolioCommitResult =
  | Readonly<{ result: "committed"; snapshot: PortfolioStoreSnapshot }>
  | Readonly<{ result: "conflict"; baseHead: string | null; currentHead: string }>;

const VERSION_KEYS = Object.freeze([
  "authentication", "authority", "ciphertext", "head", "id", "manifest", "portfolioUri", "previousHead",
  "publication", "schema", "storedAt", "version"
] as const);
const HEAD_KEYS = Object.freeze([
  "authentication", "authority", "conflict", "currentHead", "id", "portfolioUri", "schema", "updatedAt", "version"
] as const);
const AUTH_KEYS = Object.freeze(["algorithm", "keyBindingMethodId", "value"] as const);
const MANIFEST_KEYS = Object.freeze(["content", "privacy", "publisher", "uri"] as const);
const PRIVACY_KEYS = Object.freeze(["mode", "parameters"] as const);
const PARAMETER_KEYS = Object.freeze([
  "algorithm", "ephemeralPublicKey", "iv", "keyAgreement", "plaintextFormat", "plaintextHash", "plaintextSize",
  "recipients", "tagLength"
] as const);
const RECIPIENT_KEYS = Object.freeze(["encryptedKey", "id"] as const);
const CONTENT_KEYS = Object.freeze(["addressing", "canonicalization", "format", "hash", "size"] as const);

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function failCorrupt(cause?: unknown): never {
  throw new StorageError("RHP_STORAGE_CORRUPT", cause === undefined ? undefined : { cause });
}

function requirePortfolioUri(value: unknown, authority: string): string {
  const expected = `hiri://${authority}/data/passport-main`;
  if (value !== expected) throw new TypeError("portfolio URI mismatch");
  return expected;
}

function validateAuthentication(value: unknown): StoredPortfolioVersion["authentication"] {
  if (!object(value) || !exactKeys(value, AUTH_KEYS) || value.algorithm !== "HMAC-SHA-256" ||
    typeof value.keyBindingMethodId !== "string" || value.keyBindingMethodId.length < 1 ||
    value.keyBindingMethodId.length > 1024 || typeof value.value !== "string" || value.value.length !== 43) {
    throw new TypeError("invalid local head authentication");
  }
  decodeBase64Url(value.value, 32);
  return value as StoredPortfolioVersion["authentication"];
}

export function validatePortfolioManifest(value: unknown, authority: string, ciphertextLength: number): PortfolioManifest {
  if (!object(value) || !exactKeys(value, MANIFEST_KEYS)) throw new TypeError("invalid portfolio manifest");
  requirePortfolioUri(value.uri, authority);
  if (value.publisher !== authority) throw new TypeError("portfolio publisher mismatch");
  if (!object(value.privacy) || !exactKeys(value.privacy, PRIVACY_KEYS) || value.privacy.mode !== "encrypted") {
    throw new TypeError("invalid portfolio privacy envelope");
  }
  const parameters = value.privacy.parameters;
  if (!object(parameters) || !exactKeys(parameters, PARAMETER_KEYS) || parameters.algorithm !== "AES-256-GCM" ||
    parameters.tagLength !== 128 || parameters.plaintextFormat !== "application/ld+json" ||
    parameters.keyAgreement !== "X25519-HKDF-SHA256" || !Number.isSafeInteger(parameters.plaintextSize) ||
    (parameters.plaintextSize as number) < 1 || (parameters.plaintextSize as number) > CORE_LIMITS.maxPackageBytes ||
    typeof parameters.iv !== "string" || parameters.iv.length !== 16 ||
    typeof parameters.ephemeralPublicKey !== "string" || parameters.ephemeralPublicKey.length > 64 ||
    typeof parameters.plaintextHash !== "string" || parameters.plaintextHash.length !== 71 ||
    !Array.isArray(parameters.recipients) ||
    parameters.recipients.length !== 1) {
    throw new TypeError("invalid portfolio encryption parameters");
  }
  decodeBase64Url(parameters.iv, 12);
  decodeBase58Btc(parameters.ephemeralPublicKey, 32);
  parseSha256Identifier(parameters.plaintextHash);
  const recipientIds = new Set<string>();
  for (const recipient of parameters.recipients) {
    if (!object(recipient) || !exactKeys(recipient, RECIPIENT_KEYS) || typeof recipient.id !== "string" ||
      typeof recipient.encryptedKey !== "string" || recipient.encryptedKey.length !== 64 ||
      recipient.id.length !== 22) throw new TypeError("invalid portfolio recipient");
    parseRandomId(recipient.id);
    if (recipientIds.has(recipient.id)) throw new TypeError("duplicate recipient id");
    recipientIds.add(recipient.id);
    if (decodeBase64Url(recipient.encryptedKey).length !== 48) throw new TypeError("invalid wrapped content key");
  }
  if (!object(value.content) || !exactKeys(value.content, CONTENT_KEYS) || value.content.addressing !== "raw-sha256" ||
    value.content.canonicalization !== "JCS" || value.content.format !== "application/octet-stream" ||
    value.content.size !== ciphertextLength) throw new TypeError("invalid portfolio content descriptor");
  parseSha256Identifier(value.content.hash);
  return value as unknown as PortfolioManifest;
}

export function validateStoredPortfolioVersion(value: unknown): StoredPortfolioVersion {
  try {
    if (!object(value) || !exactKeys(value, VERSION_KEYS) || value.schema !== PORTFOLIO_VERSION_SCHEMA ||
      typeof value.authority !== "string" || !Number.isSafeInteger(value.version) || (value.version as number) < 1 ||
      typeof value.storedAt !== "string" || value.publication !== "local-only" ||
      !(value.ciphertext instanceof Uint8Array) || value.ciphertext.length < 16 ||
      value.ciphertext.length > CORE_LIMITS.maxPackageBytes + 16 || typeof value.head !== "string" ||
      typeof value.id !== "string") throw new TypeError("invalid stored portfolio version");
    parseEd25519Authority(value.authority);
    parseUtcSeconds(value.storedAt);
    parseSha256Identifier(value.head);
    if (value.previousHead !== null) parseSha256Identifier(value.previousHead);
    const portfolioUri = requirePortfolioUri(value.portfolioUri, value.authority);
    if (value.id !== `${PORTFOLIO_VERSION_PREFIX}${value.head}`) throw new TypeError("portfolio version id mismatch");
    validatePortfolioManifest(value.manifest, value.authority, value.ciphertext.length);
    if ((value.manifest as Record<string, unknown>).uri !== portfolioUri) throw new TypeError("portfolio URI mismatch");
    validateAuthentication(value.authentication);
    return value as unknown as StoredPortfolioVersion;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    return failCorrupt(error);
  }
}

export function validateStoredPortfolioHead(value: unknown): StoredPortfolioHead {
  try {
    if (!object(value) || !exactKeys(value, HEAD_KEYS) || value.schema !== PORTFOLIO_HEAD_SCHEMA ||
      typeof value.authority !== "string" || typeof value.currentHead !== "string" ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 1 || typeof value.updatedAt !== "string" ||
      typeof value.id !== "string" || !object(value.conflict)) throw new TypeError("invalid stored portfolio head");
    parseEd25519Authority(value.authority);
    parseSha256Identifier(value.currentHead);
    parseUtcSeconds(value.updatedAt);
    const portfolioUri = requirePortfolioUri(value.portfolioUri, value.authority);
    if (value.id !== `${PORTFOLIO_HEAD_PREFIX}${portfolioUri}`) throw new TypeError("portfolio head id mismatch");
    validateAuthentication(value.authentication);
    if (value.conflict.state === "none") {
      if (!exactKeys(value.conflict, ["state"])) throw new TypeError("invalid conflict state");
    } else if (value.conflict.state === "divergent") {
      if (!exactKeys(value.conflict, ["attemptedBaseHead", "currentHead", "detectedAt", "state"]) ||
        value.conflict.currentHead !== value.currentHead || typeof value.conflict.detectedAt !== "string") {
        throw new TypeError("invalid conflict state");
      }
      if (value.conflict.attemptedBaseHead !== null) parseSha256Identifier(value.conflict.attemptedBaseHead);
      parseUtcSeconds(value.conflict.detectedAt);
    } else {
      throw new TypeError("invalid conflict state");
    }
    return value as unknown as StoredPortfolioHead;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    return failCorrupt(error);
  }
}

function assembleSnapshot(
  headValue: unknown,
  versionValues: readonly unknown[],
  recordValues: readonly unknown[]
): PortfolioStoreSnapshot | undefined {
  if (headValue === undefined) {
    if (versionValues.length > 0 || recordValues.length > 0) failCorrupt();
    return undefined;
  }
  const head = validateStoredPortfolioHead(headValue);
  const versions = versionValues.map(validateStoredPortfolioVersion)
    .filter(value => value.portfolioUri === head.portfolioUri)
    .sort((left, right) => left.version - right.version);
  if (versions.length !== head.version) failCorrupt();
  let previous: string | null = null;
  for (let index = 0; index < versions.length; index += 1) {
    const version = versions[index];
    if (version.version !== index + 1 || version.previousHead !== previous || version.authority !== head.authority) failCorrupt();
    previous = version.head;
  }
  const current = versions.at(-1);
  if (!current || current.head !== head.currentHead || current.authentication.value !== head.authentication.value ||
    current.authentication.keyBindingMethodId !== head.authentication.keyBindingMethodId) failCorrupt();
  const records = recordValues.map(validateStoredEncryptedRecord);
  for (const value of records) {
    if (value.portfolioUri !== head.portfolioUri || value.head !== head.currentHead) failCorrupt();
  }
  return Object.freeze({ head, current, versions: Object.freeze(versions), records: Object.freeze(records) });
}

export type PortfolioStore = Readonly<{
  inspect(portfolioUri: string): Promise<PortfolioStoreSnapshot | undefined>;
  commit(input: Readonly<{
    expectedHead: string | null;
    version: StoredPortfolioVersion;
    head: StoredPortfolioHead;
    records: readonly StoredEncryptedRecord[];
    detectedAt: string;
  }>): Promise<PortfolioCommitResult>;
}>;

export function createPortfolioStore(database: PassportDatabase): PortfolioStore {
  if (database.profile !== "real-holder-preview") {
    throw new TypeError("encrypted portfolio storage requires the real-holder-preview profile");
  }
  return Object.freeze({
    inspect: async (portfolioUri: string) => {
      const values = await database.runTransaction(["portfolio", "heads", "records"], "readonly", async stores => {
        const [head, versions, records] = await Promise.all([
          stores.request<unknown>(stores.store("heads").get(`${PORTFOLIO_HEAD_PREFIX}${portfolioUri}`)),
          stores.request<unknown[]>(stores.store("portfolio").getAll()),
          stores.request<unknown[]>(stores.store("records").getAll())
        ]);
        return {
          head,
          versions,
          records
        };
      });
      return assembleSnapshot(values.head, values.versions, values.records);
    },
    commit: async input => {
      const version = validateStoredPortfolioVersion(input.version);
      const proposedHead = validateStoredPortfolioHead(input.head);
      if (version.portfolioUri !== proposedHead.portfolioUri || version.head !== proposedHead.currentHead ||
        version.version !== proposedHead.version || proposedHead.conflict.state !== "none") failCorrupt();
      parseUtcSeconds(input.detectedAt);
      if (input.expectedHead !== null) parseSha256Identifier(input.expectedHead);

      return atomicTransaction(database, ["portfolio", "heads", "records"], async stores => {
        const headStore = stores.store("heads");
        const [currentValue, currentVersions, currentRecords] = await Promise.all([
          stores.request<unknown>(headStore.get(`${PORTFOLIO_HEAD_PREFIX}${version.portfolioUri}`)),
          stores.request<unknown[]>(stores.store("portfolio").getAll()),
          stores.request<unknown[]>(stores.store("records").getAll())
        ]);
        const currentSnapshot = assembleSnapshot(currentValue, currentVersions, currentRecords);
        const current = currentSnapshot?.head;
        const currentHead = current?.currentHead ?? null;
        if (currentHead !== input.expectedHead) {
          if (!current) failCorrupt();
          const conflict = Object.freeze({
            ...current,
            updatedAt: input.detectedAt,
            conflict: Object.freeze({
              state: "divergent" as const,
              attemptedBaseHead: input.expectedHead,
              currentHead: current.currentHead,
              detectedAt: input.detectedAt
            })
          });
          await stores.request(headStore.put(conflict));
          return Object.freeze({
            result: "conflict" as const,
            baseHead: input.expectedHead,
            currentHead: current.currentHead
          });
        }
        if ((!current && version.version !== 1) || (current && (version.version !== current.version + 1 ||
          version.previousHead !== current.currentHead))) failCorrupt();
        const existingVersion = await stores.request<unknown>(stores.store("portfolio").get(version.id));
        if (existingVersion !== undefined) failCorrupt();
        await stores.request(stores.store("portfolio").put(version));
        await stores.request(headStore.put(proposedHead));
        await replaceEncryptedRecords(stores, version.portfolioUri, input.records);
        const [versions, records] = await Promise.all([
          stores.request<unknown[]>(stores.store("portfolio").getAll()),
          stores.request<unknown[]>(stores.store("records").getAll())
        ]);
        const snapshot = assembleSnapshot(
          proposedHead,
          versions,
          records
        );
        if (!snapshot) failCorrupt();
        return Object.freeze({
          result: "committed" as const,
          snapshot
        });
      });
    }
  });
}
