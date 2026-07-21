import { jcsBytes } from "../../../src/core/canonical.mjs";
import { decryptPortfolio } from "../../../src/core/portfolio-crypto.mjs";
import {
  applyPortfolioRecordChange,
  preparePortfolioRewrite,
  validatePortfolioPlaintext
} from "../../../src/core/portfolio-records.mjs";
import { sha256Identifier } from "../../../src/core/proof.mjs";
import {
  decodeBase64Url,
  encodeBase64Url,
  parseEd25519Authority,
  parseRandomId,
  parseSha256Identifier,
  parseUtcSeconds,
  unicodeScalarLength
} from "../../../src/core/scalars.mjs";
import type { ProtectedKeyDescriptor } from "../adapters/protected-key-store";
import type { PassportDatabase } from "../storage/database";
import {
  PORTFOLIO_HEAD_PREFIX,
  PORTFOLIO_HEAD_SCHEMA,
  PORTFOLIO_VERSION_PREFIX,
  PORTFOLIO_VERSION_SCHEMA,
  createPortfolioStore,
  type PortfolioManifest,
  type PortfolioStore,
  type PortfolioStoreSnapshot,
  type StoredPortfolioHead,
  type StoredPortfolioVersion
} from "../storage/portfolio-store";
import {
  ENCRYPTED_RECORD_PREFIX,
  ENCRYPTED_RECORD_SCHEMA,
  validateStoredEncryptedRecord,
  type StoredEncryptedRecord
} from "../storage/record-store";
import type { StorageCoordinator } from "../storage/storage-coordinator";
import type { KeyService } from "./key-service";

const PORTFOLIO_HEAD_INPUT_SCHEMA = "hiri-passport/local-portfolio-head-input/1" as const;
const PORTFOLIO_HEAD_AUTH_SCHEMA = "hiri-passport/local-portfolio-head-authentication/1" as const;
const LOCAL_METADATA_SCHEMA = "hiri-passport/local-record-metadata/1" as const;
const LOCAL_METADATA_AAD_SCHEMA = "hiri-passport/local-record-metadata-aad/1" as const;
const LOCAL_KDF_SALT_DOMAIN = "hiri-passport-local-state-salt-v1";
const HEAD_KEY_INFO = "hiri-passport-local-portfolio-head-key-v1";
const RECORD_REFERENCE_KEY_INFO = "hiri-passport-local-record-reference-key-v1";
const RECORD_ENCRYPTION_KEY_INFO = "hiri-passport-local-record-encryption-key-v1";
const LEASE_TTL_MS = 5 * 60 * 1000;
const MAX_LOCAL_METADATA_RECORDS = 128;
const MAX_LOCAL_ID_SCALARS = 256;
const MAX_LABEL_SCALARS = 256;
const MAX_NOTES_SCALARS = 16 * 1024;
const MAX_TAGS = 32;
const MAX_TAG_SCALARS = 128;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type PortfolioRecord = Readonly<Record<string, unknown> & { recordId: string }>;

export type PortfolioPlaintext = Readonly<{
  "@type": "hiri:passport:EncryptedPortfolio";
  schemaVersion: "2.0";
  holderAuthority: string;
  records: readonly PortfolioRecord[];
}>;

export type PortfolioRecordChange = Readonly<{
  removeRecordId?: string;
  upsert?: PortfolioRecord;
}>;

export type LocalRecordMetadata = Readonly<{
  recordId: string;
  localId: string;
  label?: string;
  notes?: string;
  archived?: boolean;
  favorite?: boolean;
  tags?: readonly string[];
}>;

export type LocalRecordMetadataChange = Readonly<{
  removeRecordId?: string;
  upsert?: LocalRecordMetadata;
}>;

export type PortfolioSnapshot = Readonly<{
  portfolioUri: string;
  authority: string;
  head: string;
  version: number;
  previousHead: string | null;
  publication: "local-only";
  conflict: StoredPortfolioHead["conflict"];
  portfolio: PortfolioPlaintext;
  metadata: readonly LocalRecordMetadata[];
}>;

export type PortfolioRewriteResult =
  | Readonly<{ result: "committed"; snapshot: PortfolioSnapshot }>
  | Readonly<{ result: "conflict"; baseHead: string | null; currentHead: string }>;

export type PortfolioService = Readonly<{
  initialize(input: Readonly<{ authority: string; signal?: AbortSignal }>): Promise<PortfolioSnapshot>;
  load(input: Readonly<{ authority: string; signal?: AbortSignal }>): Promise<PortfolioSnapshot>;
  rewrite(input: Readonly<{
    authority: string;
    expectedHead: string;
    change: PortfolioRecordChange;
    metadataChange?: LocalRecordMetadataChange;
    signal?: AbortSignal;
  }>): Promise<PortfolioRewriteResult>;
}>;

export type PortfolioServiceErrorCode =
  | "RHP_PORTFOLIO_INPUT_INVALID"
  | "RHP_PORTFOLIO_NOT_FOUND"
  | "RHP_PORTFOLIO_ALREADY_EXISTS"
  | "RHP_PORTFOLIO_KEY_UNAVAILABLE"
  | "RHP_PORTFOLIO_CORRUPT"
  | "RHP_PORTFOLIO_DECRYPT_FAILED"
  | "RHP_PORTFOLIO_ENCRYPT_FAILED"
  | "RHP_PORTFOLIO_CONFLICT"
  | "RHP_PORTFOLIO_FRESHNESS_FAILED";

const SAFE_MESSAGES = Object.freeze<Record<PortfolioServiceErrorCode, string>>({
  RHP_PORTFOLIO_INPUT_INVALID: "The private portfolio change is invalid.",
  RHP_PORTFOLIO_NOT_FOUND: "No private portfolio is available for this holder.",
  RHP_PORTFOLIO_ALREADY_EXISTS: "A private portfolio already exists for this holder.",
  RHP_PORTFOLIO_KEY_UNAVAILABLE: "The protected portfolio key is unavailable.",
  RHP_PORTFOLIO_CORRUPT: "The private portfolio did not pass integrity checks.",
  RHP_PORTFOLIO_DECRYPT_FAILED: "The private portfolio could not be decrypted.",
  RHP_PORTFOLIO_ENCRYPT_FAILED: "The private portfolio could not be encrypted safely.",
  RHP_PORTFOLIO_CONFLICT: "The private portfolio changed before this update could commit.",
  RHP_PORTFOLIO_FRESHNESS_FAILED: "Fresh encryption material could not be established for the private portfolio."
});

export class PortfolioServiceError extends Error {
  readonly code: PortfolioServiceErrorCode;

  constructor(code: PortfolioServiceErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "PortfolioServiceError";
    this.code = code;
  }
}

type AesGcmInput = Readonly<{
  key: Uint8Array | CryptoKey;
  iv: Uint8Array;
  plaintext: Uint8Array;
  additionalData?: Uint8Array;
  tagLength?: number;
}>;

type AesGcmDecryptInput = Readonly<{
  key: Uint8Array | CryptoKey;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  additionalData?: Uint8Array;
  tagLength?: number;
}>;

export type PortfolioCryptoPorts = Readonly<{
  randomBytes(length: number): Promise<Uint8Array>;
  sha256: Readonly<{ digest(input: Uint8Array): Promise<Uint8Array> }>;
  aesGcm: Readonly<{
    encrypt(input: AesGcmInput): Promise<Uint8Array>;
    decrypt(input: AesGcmDecryptInput): Promise<Uint8Array>;
  }>;
  hkdfSha256: Readonly<{
    derive(secret: Uint8Array, input: Readonly<{ salt: Uint8Array; info: Uint8Array; length: number }>): Promise<Uint8Array>;
  }>;
  x25519: Readonly<{
    generateKeyPair(): Promise<Readonly<{ privateKey: unknown; publicKey: Uint8Array }>>;
    derive(privateKey: unknown, publicKey: Uint8Array): Promise<Uint8Array>;
  }>;
  hmacSha256(key: Uint8Array, input: Uint8Array): Promise<Uint8Array>;
}>;

type LocalKeys = Readonly<{
  shared: Uint8Array;
  head: Uint8Array;
  reference: Uint8Array;
}>;

type EncryptedPortfolioResult = Readonly<{
  uri: string;
  publisher: string;
  privacy: PortfolioManifest["privacy"];
  content: PortfolioManifest["content"];
  ciphertext: Uint8Array;
}>;

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

function bytes(value: ArrayBuffer): Uint8Array {
  return new Uint8Array(value);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(value, key));
}

function portfolioUri(authority: string): string {
  try {
    parseEd25519Authority(authority);
    return `hiri://${authority}/data/passport-main`;
  } catch (error) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
  }
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function protocolNow(clock: Readonly<{ now(): string }>): Readonly<{ text: string; milliseconds: number }> {
  try {
    const text = clock.now();
    const milliseconds = parseUtcSeconds(text);
    return Object.freeze({ text, milliseconds });
  } catch (error) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT", { cause: error });
  }
}

function defaultNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function validLocalText(value: unknown, min: number, max: number): value is string {
  if (typeof value !== "string") return false;
  try {
    const length = unicodeScalarLength(value);
    return length >= min && length <= max && !/[\u0000\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
  } catch {
    return false;
  }
}

function validateLocalMetadata(value: unknown): LocalRecordMetadata {
  const allowed = ["archived", "favorite", "label", "localId", "notes", "recordId", "tags"] as const;
  if (!object(value) || !exactKeys(value, allowed, ["localId", "recordId"]) ||
    !validLocalText(value.localId, 1, MAX_LOCAL_ID_SCALARS) ||
    (value.label !== undefined && !validLocalText(value.label, 1, MAX_LABEL_SCALARS)) ||
    (value.notes !== undefined && !validLocalText(value.notes, 0, MAX_NOTES_SCALARS)) ||
    (value.archived !== undefined && typeof value.archived !== "boolean") ||
    (value.favorite !== undefined && typeof value.favorite !== "boolean") ||
    (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.length > MAX_TAGS ||
      value.tags.some(tag => !validLocalText(tag, 1, MAX_TAG_SCALARS)) || new Set(value.tags).size !== value.tags.length))) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID");
  }
  try {
    parseRandomId(value.recordId);
  } catch (error) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
  }
  return Object.freeze({
    recordId: value.recordId,
    localId: value.localId,
    ...(value.label === undefined ? {} : { label: value.label }),
    ...(value.notes === undefined ? {} : { notes: value.notes }),
    ...(value.archived === undefined ? {} : { archived: value.archived }),
    ...(value.favorite === undefined ? {} : { favorite: value.favorite }),
    ...(value.tags === undefined ? {} : { tags: Object.freeze([...value.tags]) })
  }) as LocalRecordMetadata;
}

function validateRecordChange(change: unknown): asserts change is PortfolioRecordChange {
  if (!object(change) || !exactKeys(change, ["removeRecordId", "upsert"], []) || Object.keys(change).length === 0) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID");
  }
  try {
    if (change.removeRecordId !== undefined) parseRandomId(change.removeRecordId);
    if (change.upsert !== undefined) {
      if (!object(change.upsert) || typeof change.upsert.recordId !== "string") throw new TypeError("invalid record");
      parseRandomId(change.upsert.recordId);
    }
  } catch (error) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
  }
}

function validateMetadataChange(change: unknown): asserts change is LocalRecordMetadataChange {
  if (!object(change) || !exactKeys(change, ["removeRecordId", "upsert"], []) || Object.keys(change).length === 0) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID");
  }
  try {
    if (change.removeRecordId !== undefined) parseRandomId(change.removeRecordId);
  } catch (error) {
    throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
  }
  if (change.upsert !== undefined) validateLocalMetadata(change.upsert);
}

function createDefaultCryptoPorts(keyService: KeyService): PortfolioCryptoPorts {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new PortfolioServiceError("RHP_PORTFOLIO_KEY_UNAVAILABLE");
  }
  return Object.freeze({
    randomBytes: async (length: number) => {
      if (!Number.isSafeInteger(length) || length < 1 || length > 65_536) throw new TypeError("invalid random length");
      return globalThis.crypto.getRandomValues(new Uint8Array(length));
    },
    sha256: Object.freeze({
      digest: async (input: Uint8Array) => bytes(await subtle.digest("SHA-256", source(input)))
    }),
    aesGcm: Object.freeze({
      encrypt: async ({ key, iv, plaintext, additionalData }: AesGcmInput) => {
        const cryptoKey = key instanceof Uint8Array
          ? await subtle.importKey("raw", source(key), { name: "AES-GCM", length: 256 }, false, ["encrypt"])
          : key;
        return bytes(await subtle.encrypt({
          name: "AES-GCM", iv: source(iv), additionalData: additionalData ? source(additionalData) : undefined, tagLength: 128
        }, cryptoKey, source(plaintext)));
      },
      decrypt: async ({ key, iv, ciphertext, additionalData }: AesGcmDecryptInput) => {
        const cryptoKey = key instanceof Uint8Array
          ? await subtle.importKey("raw", source(key), { name: "AES-GCM", length: 256 }, false, ["decrypt"])
          : key;
        return bytes(await subtle.decrypt({
          name: "AES-GCM", iv: source(iv), additionalData: additionalData ? source(additionalData) : undefined, tagLength: 128
        }, cryptoKey, source(ciphertext)));
      }
    }),
    hkdfSha256: Object.freeze({
      derive: async (secret: Uint8Array, input: Readonly<{ salt: Uint8Array; info: Uint8Array; length: number }>) => {
        const material = await subtle.importKey("raw", source(secret), "HKDF", false, ["deriveBits"]);
        return bytes(await subtle.deriveBits({
          name: "HKDF", hash: "SHA-256", salt: source(input.salt), info: source(input.info)
        }, material, input.length * 8));
      }
    }),
    x25519: Object.freeze({
      generateKeyPair: async () => {
        const pair = await subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]) as CryptoKeyPair;
        return Object.freeze({
          privateKey: pair.privateKey,
          publicKey: bytes(await subtle.exportKey("raw", pair.publicKey))
        });
      },
      derive: async (privateKey: unknown, publicKey: Uint8Array) => {
        if (typeof privateKey === "string") {
          return keyService.derive({ methodId: privateKey, peerPublicKey: publicKey });
        }
        if (!(privateKey instanceof CryptoKey)) throw new TypeError("invalid X25519 private key handle");
        const imported = await subtle.importKey("raw", source(publicKey), { name: "X25519" }, false, []);
        return bytes(await subtle.deriveBits({ name: "X25519", public: imported }, privateKey, 256));
      }
    }),
    hmacSha256: async (key: Uint8Array, input: Uint8Array) => {
      const cryptoKey = await subtle.importKey("raw", source(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return bytes(await subtle.sign("HMAC", cryptoKey, source(input)));
    }
  });
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

function wipe(...values: readonly Uint8Array[]): void {
  for (const value of values) value.fill(0);
}

function manifestFrom(encrypted: EncryptedPortfolioResult): PortfolioManifest {
  return Object.freeze({
    uri: encrypted.uri,
    publisher: encrypted.publisher,
    privacy: encrypted.privacy,
    content: encrypted.content
  });
}

function headInput(value: Readonly<{
  portfolioUri: string;
  authority: string;
  version: number;
  previousHead: string | null;
  storedAt: string;
  manifest: PortfolioManifest;
}>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    schema: PORTFOLIO_HEAD_INPUT_SCHEMA,
    portfolioUri: value.portfolioUri,
    authority: value.authority,
    version: value.version,
    previousHead: value.previousHead,
    storedAt: value.storedAt,
    publication: "local-only",
    manifest: value.manifest
  });
}

function headAuthInput(head: string, methodId: string): Uint8Array {
  return jcsBytes(Object.freeze({
    schema: PORTFOLIO_HEAD_AUTH_SCHEMA,
    head,
    keyBindingMethodId: methodId
  }));
}

function metadataAad(portfolioUriValue: string, head: string, reference: string): Uint8Array {
  return jcsBytes(Object.freeze({
    schema: LOCAL_METADATA_AAD_SCHEMA,
    portfolioUri: portfolioUriValue,
    head,
    reference
  }));
}

function emptyPortfolio(authority: string): PortfolioPlaintext {
  return Object.freeze({
    "@type": "hiri:passport:EncryptedPortfolio",
    schemaVersion: "2.0",
    holderAuthority: authority,
    records: Object.freeze([])
  });
}

function clonePortfolio(value: PortfolioPlaintext): PortfolioPlaintext {
  return structuredClone(value) as PortfolioPlaintext;
}

export function createPortfolioService(options: Readonly<{
  database: PassportDatabase;
  coordinator: StorageCoordinator;
  keyService: KeyService;
  clock?: Readonly<{ now(): string }>;
  randomId?: () => string;
  crypto?: PortfolioCryptoPorts;
  store?: PortfolioStore;
}>): PortfolioService {
  if (options.database.profile !== "real-holder-preview" || options.coordinator.database !== options.database ||
    options.keyService.database !== options.database) {
    throw new TypeError("portfolio service requires one real-holder-preview storage boundary");
  }
  const clock = options.clock ?? Object.freeze({ now: defaultNow });
  const randomId = options.randomId ?? (() => globalThis.crypto.randomUUID());
  const cryptoPorts = options.crypto ?? createDefaultCryptoPorts(options.keyService);
  const store = options.store ?? createPortfolioStore(options.database);

  async function descriptors(): Promise<readonly ProtectedKeyDescriptor[]> {
    return (await options.keyService.list()).filter(value => value.algorithm === "X25519" && value.purpose === "agreement");
  }

  async function agreementForWrite(authority: string): Promise<ProtectedKeyDescriptor> {
    const matches = (await descriptors()).filter(value => value.authority === authority && value.lifecycle === "active");
    if (matches.length !== 1 || matches[0].publicKeyBytes.length !== 32) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_KEY_UNAVAILABLE");
    }
    return matches[0];
  }

  async function agreementForVersion(version: StoredPortfolioVersion): Promise<ProtectedKeyDescriptor> {
    const matches = (await descriptors()).filter(value =>
      value.authority === version.authority && value.methodId === version.authentication.keyBindingMethodId &&
      value.lifecycle === "active"
    );
    if (matches.length !== 1 || matches[0].publicKeyBytes.length !== 32) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_KEY_UNAVAILABLE");
    }
    return matches[0];
  }

  async function deriveLocalKeys(descriptor: ProtectedKeyDescriptor): Promise<LocalKeys> {
    let shared: Uint8Array | undefined;
    try {
      shared = await options.keyService.derive({
        methodId: descriptor.methodId,
        peerPublicKey: descriptor.publicKeyBytes
      });
      const salt = await cryptoPorts.sha256.digest(encoder.encode(`${LOCAL_KDF_SALT_DOMAIN}\0${descriptor.authority}`));
      const [head, reference] = await Promise.all([
        cryptoPorts.hkdfSha256.derive(shared, { salt, info: encoder.encode(HEAD_KEY_INFO), length: 32 }),
        cryptoPorts.hkdfSha256.derive(shared, { salt, info: encoder.encode(RECORD_REFERENCE_KEY_INFO), length: 32 })
      ]);
      return Object.freeze({ shared, head, reference });
    } catch (error) {
      if (shared) wipe(shared);
      throw new PortfolioServiceError("RHP_PORTFOLIO_KEY_UNAVAILABLE", { cause: error });
    }
  }

  async function metadataEncryptionKey(shared: Uint8Array, head: string): Promise<Uint8Array> {
    const pairs = head.slice("sha256:".length).match(/../gu);
    if (!pairs || pairs.length !== 32) throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
    const salt = Uint8Array.from(pairs.map(value => Number.parseInt(value, 16)));
    return cryptoPorts.hkdfSha256.derive(shared, {
      salt,
      info: encoder.encode(RECORD_ENCRYPTION_KEY_INFO),
      length: 32
    });
  }

  async function authenticateVersion(input: Readonly<{
    authority: string;
    encrypted: EncryptedPortfolioResult;
    version: number;
    previousHead: string | null;
    storedAt: string;
    agreement: ProtectedKeyDescriptor;
  }>): Promise<StoredPortfolioVersion> {
    const manifest = manifestFrom(input.encrypted);
    const portfolioUriValue = portfolioUri(input.authority);
    let keys: LocalKeys | undefined;
    try {
      const head = await sha256Identifier(jcsBytes(headInput({
        portfolioUri: portfolioUriValue,
        authority: input.authority,
        version: input.version,
        previousHead: input.previousHead,
        storedAt: input.storedAt,
        manifest
      })), cryptoPorts.sha256);
      keys = await deriveLocalKeys(input.agreement);
      const authenticationValue = encodeBase64Url(await cryptoPorts.hmacSha256(
        keys.head,
        headAuthInput(head, input.agreement.methodId)
      ));
      return Object.freeze({
        id: `${PORTFOLIO_VERSION_PREFIX}${head}`,
        schema: PORTFOLIO_VERSION_SCHEMA,
        portfolioUri: portfolioUriValue,
        authority: input.authority,
        version: input.version,
        previousHead: input.previousHead,
        storedAt: input.storedAt,
        publication: "local-only",
        manifest,
        ciphertext: new Uint8Array(input.encrypted.ciphertext),
        head,
        authentication: Object.freeze({
          algorithm: "HMAC-SHA-256",
          keyBindingMethodId: input.agreement.methodId,
          value: authenticationValue
        })
      });
    } finally {
      if (keys) wipe(keys.shared, keys.head, keys.reference);
    }
  }

  function headFor(version: StoredPortfolioVersion): StoredPortfolioHead {
    return Object.freeze({
      id: `${PORTFOLIO_HEAD_PREFIX}${version.portfolioUri}`,
      schema: PORTFOLIO_HEAD_SCHEMA,
      portfolioUri: version.portfolioUri,
      authority: version.authority,
      currentHead: version.head,
      version: version.version,
      updatedAt: version.storedAt,
      authentication: version.authentication,
      conflict: Object.freeze({ state: "none" })
    });
  }

  async function verifyVersion(version: StoredPortfolioVersion): Promise<ProtectedKeyDescriptor> {
    const descriptor = await agreementForVersion(version);
    let keys: LocalKeys | undefined;
    try {
      const expectedContentHash = await sha256Identifier(version.ciphertext, cryptoPorts.sha256);
      if (expectedContentHash !== version.manifest.content.hash || version.manifest.content.size !== version.ciphertext.length) {
        throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
      }
      const expectedHead = await sha256Identifier(jcsBytes(headInput({
        portfolioUri: version.portfolioUri,
        authority: version.authority,
        version: version.version,
        previousHead: version.previousHead,
        storedAt: version.storedAt,
        manifest: version.manifest
      })), cryptoPorts.sha256);
      if (expectedHead !== version.head) throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
      keys = await deriveLocalKeys(descriptor);
      const expectedAuthentication = await cryptoPorts.hmacSha256(
        keys.head,
        headAuthInput(version.head, descriptor.methodId)
      );
      if (!constantTimeEqual(expectedAuthentication, decodeBase64Url(version.authentication.value, 32))) {
        throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
      }
      return descriptor;
    } catch (error) {
      if (error instanceof PortfolioServiceError) throw error;
      throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT", { cause: error });
    } finally {
      if (keys) wipe(keys.shared, keys.head, keys.reference);
    }
  }

  async function decryptCurrent(version: StoredPortfolioVersion, descriptor: ProtectedKeyDescriptor): Promise<PortfolioPlaintext> {
    const outcome = await decryptPortfolio({
      manifest: version.manifest,
      ciphertext: version.ciphertext,
      recipientKey: Object.freeze({ privateKey: descriptor.methodId })
    }, cryptoPorts);
    if (outcome.result !== "valid") throw new PortfolioServiceError("RHP_PORTFOLIO_DECRYPT_FAILED");
    try {
      validatePortfolioPlaintext(outcome.plaintext, version.authority);
      return outcome.plaintext as PortfolioPlaintext;
    } catch (error) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT", { cause: error });
    }
  }

  async function decryptMetadata(
    stored: readonly StoredEncryptedRecord[],
    version: StoredPortfolioVersion,
    descriptor: ProtectedKeyDescriptor,
    portfolio: PortfolioPlaintext
  ): Promise<readonly LocalRecordMetadata[]> {
    if (stored.length > MAX_LOCAL_METADATA_RECORDS) throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
    let keys: LocalKeys | undefined;
    let encryptionKey: Uint8Array | undefined;
    try {
      keys = await deriveLocalKeys(descriptor);
      encryptionKey = await metadataEncryptionKey(keys.shared, version.head);
      const recordIds = new Set(portfolio.records.map(record => record.recordId));
      const localIds = new Set<string>();
      const metadata: LocalRecordMetadata[] = [];
      for (const raw of stored) {
        const value = validateStoredEncryptedRecord(raw);
        if (value.head !== version.head || value.portfolioUri !== version.portfolioUri ||
          value.keyBindingMethodId !== descriptor.methodId ||
          await sha256Identifier(value.ciphertext, cryptoPorts.sha256) !== value.ciphertextHash) {
          throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
        }
        let plaintext: Uint8Array;
        try {
          plaintext = await cryptoPorts.aesGcm.decrypt({
            key: encryptionKey,
            iv: decodeBase64Url(value.iv, 12),
            ciphertext: value.ciphertext,
            additionalData: metadataAad(value.portfolioUri, value.head, value.reference)
          });
        } catch (error) {
          throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT", { cause: error });
        }
        let parsed: LocalRecordMetadata;
        try {
          const decoded = JSON.parse(decoder.decode(plaintext)) as unknown;
          if (!object(decoded) || decoded.schema !== LOCAL_METADATA_SCHEMA) {
            throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
          }
          const { schema: _schema, ...metadataValue } = decoded;
          parsed = validateLocalMetadata(metadataValue);
        } catch (error) {
          if (error instanceof PortfolioServiceError && error.code === "RHP_PORTFOLIO_CORRUPT") throw error;
          throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT", { cause: error });
        } finally {
          wipe(plaintext);
        }
        const reference = encodeBase64Url(await cryptoPorts.hmacSha256(keys.reference, encoder.encode(parsed.recordId)));
        if (reference !== value.reference || !recordIds.has(parsed.recordId) || localIds.has(parsed.localId)) {
          throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
        }
        localIds.add(parsed.localId);
        metadata.push(parsed);
      }
      return Object.freeze(metadata);
    } finally {
      if (encryptionKey) wipe(encryptionKey);
      if (keys) wipe(keys.shared, keys.head, keys.reference);
    }
  }

  async function encryptMetadata(
    metadata: readonly LocalRecordMetadata[],
    version: StoredPortfolioVersion,
    descriptor: ProtectedKeyDescriptor,
    prior: readonly StoredEncryptedRecord[]
  ): Promise<readonly StoredEncryptedRecord[]> {
    if (metadata.length > MAX_LOCAL_METADATA_RECORDS) throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID");
    let keys: LocalKeys | undefined;
    let encryptionKey: Uint8Array | undefined;
    try {
      keys = await deriveLocalKeys(descriptor);
      encryptionKey = await metadataEncryptionKey(keys.shared, version.head);
      const oldIvs = new Set(prior.map(value => value.iv));
      const newIvs = new Set<string>();
      const encrypted: StoredEncryptedRecord[] = [];
      for (const raw of metadata) {
        const value = validateLocalMetadata(raw);
        const reference = encodeBase64Url(await cryptoPorts.hmacSha256(keys.reference, encoder.encode(value.recordId)));
        let iv: Uint8Array | undefined;
        let encodedIv = "";
        for (let attempt = 0; attempt < 8; attempt += 1) {
          iv = await cryptoPorts.randomBytes(12);
          if (!(iv instanceof Uint8Array) || iv.length !== 12) throw new TypeError("randomBytes must return 12 bytes");
          encodedIv = encodeBase64Url(iv);
          if (!oldIvs.has(encodedIv) && !newIvs.has(encodedIv)) break;
          wipe(iv);
          iv = undefined;
        }
        if (!iv) throw new PortfolioServiceError("RHP_PORTFOLIO_FRESHNESS_FAILED");
        newIvs.add(encodedIv);
        const plaintext = jcsBytes(Object.freeze({ schema: LOCAL_METADATA_SCHEMA, ...value }));
        let ciphertext: Uint8Array;
        try {
          ciphertext = await cryptoPorts.aesGcm.encrypt({
            key: encryptionKey,
            iv,
            plaintext,
            additionalData: metadataAad(version.portfolioUri, version.head, reference)
          });
        } catch (error) {
          throw new PortfolioServiceError("RHP_PORTFOLIO_ENCRYPT_FAILED", { cause: error });
        } finally {
          wipe(iv, plaintext);
        }
        encrypted.push(Object.freeze({
          id: `${ENCRYPTED_RECORD_PREFIX}${reference}`,
          schema: ENCRYPTED_RECORD_SCHEMA,
          portfolioUri: version.portfolioUri,
          head: version.head,
          reference,
          keyBindingMethodId: descriptor.methodId,
          algorithm: "AES-256-GCM",
          iv: encodedIv,
          ciphertextHash: await sha256Identifier(ciphertext, cryptoPorts.sha256),
          ciphertext
        }));
      }
      return Object.freeze(encrypted);
    } finally {
      if (encryptionKey) wipe(encryptionKey);
      if (keys) wipe(keys.shared, keys.head, keys.reference);
    }
  }

  async function loadSnapshot(storage: PortfolioStoreSnapshot, signal?: AbortSignal): Promise<PortfolioSnapshot> {
    checkAbort(signal);
    let currentDescriptor: ProtectedKeyDescriptor | undefined;
    for (const version of storage.versions) {
      const descriptor = await verifyVersion(version);
      if (version.head === storage.current.head) currentDescriptor = descriptor;
      checkAbort(signal);
    }
    if (!currentDescriptor) throw new PortfolioServiceError("RHP_PORTFOLIO_CORRUPT");
    const portfolio = await decryptCurrent(storage.current, currentDescriptor);
    checkAbort(signal);
    const metadata = await decryptMetadata(storage.records, storage.current, currentDescriptor, portfolio);
    checkAbort(signal);
    return Object.freeze({
      portfolioUri: storage.current.portfolioUri,
      authority: storage.current.authority,
      head: storage.current.head,
      version: storage.current.version,
      previousHead: storage.current.previousHead,
      publication: "local-only",
      conflict: storage.head.conflict,
      portfolio: clonePortfolio(portfolio),
      metadata
    });
  }

  async function encryptVersion(input: Readonly<{
    portfolio: PortfolioPlaintext;
    agreement: ProtectedKeyDescriptor;
    previous?: StoredPortfolioVersion;
    storedAt: string;
  }>): Promise<StoredPortfolioVersion> {
    let rewritten;
    try {
      rewritten = await preparePortfolioRewrite({
        baseHead: input.previous?.head ?? null,
        currentHead: input.previous?.head ?? null,
        portfolio: input.portfolio,
        recipients: Object.freeze([Object.freeze({ publicKey: input.agreement.publicKeyBytes })]),
        publish: true
      }, cryptoPorts);
    } catch (error) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_ENCRYPT_FAILED", { cause: error });
    }
    if (rewritten.result !== "prepared") throw new PortfolioServiceError("RHP_PORTFOLIO_CONFLICT");
    const encrypted = rewritten.encrypted as EncryptedPortfolioResult;
    const prior = input.previous;
    if (prior && (
      encrypted.privacy.parameters.iv === prior.manifest.privacy.parameters.iv ||
      encrypted.privacy.parameters.ephemeralPublicKey === prior.manifest.privacy.parameters.ephemeralPublicKey ||
      encrypted.privacy.parameters.recipients[0]?.id === prior.manifest.privacy.parameters.recipients[0]?.id ||
      encrypted.content.hash === prior.manifest.content.hash
    )) throw new PortfolioServiceError("RHP_PORTFOLIO_FRESHNESS_FAILED");
    return authenticateVersion({
      authority: input.portfolio.holderAuthority,
      encrypted,
      version: (prior?.version ?? 0) + 1,
      previousHead: prior?.head ?? null,
      storedAt: input.storedAt,
      agreement: input.agreement
    });
  }

  function applyMetadataChange(
    current: readonly LocalRecordMetadata[],
    change: LocalRecordMetadataChange | undefined,
    portfolio: PortfolioPlaintext
  ): readonly LocalRecordMetadata[] {
    const next = new Map(current.map(value => [value.recordId, value]));
    if (change?.removeRecordId) next.delete(change.removeRecordId);
    if (change?.upsert) next.set(change.upsert.recordId, validateLocalMetadata(change.upsert));
    const retainedIds = new Set(portfolio.records.map(value => value.recordId));
    for (const id of next.keys()) if (!retainedIds.has(id)) next.delete(id);
    const values = [...next.values()];
    if (new Set(values.map(value => value.localId)).size !== values.length) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID");
    }
    return Object.freeze(values);
  }

  async function initialize(input: Readonly<{ authority: string; signal?: AbortSignal }>): Promise<PortfolioSnapshot> {
    const uri = portfolioUri(input.authority);
    checkAbort(input.signal);
    const now = protocolNow(clock);
    return options.coordinator.runSensitiveOperation({
      scope: `portfolio:${input.authority}`,
      token: `portfolio-${randomId()}`,
      now: now.milliseconds,
      ttlMs: LEASE_TTL_MS
    }, async () => {
      checkAbort(input.signal);
      if (await store.inspect(uri)) throw new PortfolioServiceError("RHP_PORTFOLIO_ALREADY_EXISTS");
      const agreement = await agreementForWrite(input.authority);
      const portfolio = emptyPortfolio(input.authority);
      const version = await encryptVersion({ portfolio, agreement, storedAt: now.text });
      checkAbort(input.signal);
      const committed = await store.commit({
        expectedHead: null,
        version,
        head: headFor(version),
        records: Object.freeze([]),
        detectedAt: now.text
      });
      if (committed.result === "conflict") {
        throw new PortfolioServiceError("RHP_PORTFOLIO_ALREADY_EXISTS");
      }
      // The transaction is the cancellation boundary. Once committed, report
      // the durable result even if the caller aborts during result hydration.
      return loadSnapshot(committed.snapshot);
    });
  }

  async function load(input: Readonly<{ authority: string; signal?: AbortSignal }>): Promise<PortfolioSnapshot> {
    const uri = portfolioUri(input.authority);
    checkAbort(input.signal);
    const storage = await store.inspect(uri);
    if (!storage) throw new PortfolioServiceError("RHP_PORTFOLIO_NOT_FOUND");
    return loadSnapshot(storage, input.signal);
  }

  async function rewrite(input: Readonly<{
    authority: string;
    expectedHead: string;
    change: PortfolioRecordChange;
    metadataChange?: LocalRecordMetadataChange;
    signal?: AbortSignal;
  }>): Promise<PortfolioRewriteResult> {
    const uri = portfolioUri(input.authority);
    try {
      parseSha256Identifier(input.expectedHead);
    } catch (error) {
      throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
    }
    validateRecordChange(input.change);
    if (input.metadataChange !== undefined) validateMetadataChange(input.metadataChange);
    checkAbort(input.signal);
    const now = protocolNow(clock);
    return options.coordinator.runSensitiveOperation({
      scope: `portfolio:${input.authority}`,
      token: `portfolio-${randomId()}`,
      now: now.milliseconds,
      ttlMs: LEASE_TTL_MS
    }, async () => {
      const storage = await store.inspect(uri);
      if (!storage) throw new PortfolioServiceError("RHP_PORTFOLIO_NOT_FOUND");
      const current = await loadSnapshot(storage, input.signal);
      let nextPortfolio: PortfolioPlaintext;
      try {
        nextPortfolio = applyPortfolioRecordChange(current.portfolio, input.change) as PortfolioPlaintext;
        validatePortfolioPlaintext(nextPortfolio, input.authority);
      } catch (error) {
        throw new PortfolioServiceError("RHP_PORTFOLIO_INPUT_INVALID", { cause: error });
      }
      const nextMetadata = applyMetadataChange(current.metadata, input.metadataChange, nextPortfolio);
      const agreement = await agreementForWrite(input.authority);
      const version = await encryptVersion({
        portfolio: nextPortfolio,
        agreement,
        previous: storage.current,
        storedAt: now.text
      });
      const records = await encryptMetadata(nextMetadata, version, agreement, storage.records);
      checkAbort(input.signal);
      const committed = await store.commit({
        expectedHead: input.expectedHead,
        version,
        head: headFor(version),
        records,
        detectedAt: now.text
      });
      if (committed.result === "conflict") return committed;
      return Object.freeze({
        result: "committed" as const,
        snapshot: await loadSnapshot(committed.snapshot)
      });
    });
  }

  return Object.freeze({ initialize, load, rewrite });
}
