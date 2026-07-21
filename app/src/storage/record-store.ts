import { decodeBase64Url, parseSha256Identifier } from "../../../src/core/scalars.mjs";
import { StorageError, type PassportDatabase, type TransactionStores } from "./database";

export const ENCRYPTED_RECORD_SCHEMA = "hiri-passport/encrypted-local-record/1" as const;
export const ENCRYPTED_RECORD_PREFIX = "rhp:record:" as const;

export type StoredEncryptedRecord = Readonly<{
  id: string;
  schema: typeof ENCRYPTED_RECORD_SCHEMA;
  portfolioUri: string;
  head: string;
  reference: string;
  keyBindingMethodId: string;
  algorithm: "AES-256-GCM";
  iv: string;
  ciphertextHash: string;
  ciphertext: Uint8Array;
}>;

const RECORD_KEYS = Object.freeze([
  "algorithm", "ciphertext", "ciphertextHash", "head", "id", "iv", "keyBindingMethodId",
  "portfolioUri", "reference", "schema"
] as const);

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function validPortfolioUri(value: unknown): value is string {
  return typeof value === "string" && /^hiri:\/\/key:ed25519:z[^/]+\/data\/passport-main$/u.test(value);
}

export function validateStoredEncryptedRecord(value: unknown): StoredEncryptedRecord {
  try {
    if (!object(value) || !exactKeys(value, RECORD_KEYS) ||
      value.schema !== ENCRYPTED_RECORD_SCHEMA || value.algorithm !== "AES-256-GCM" ||
      typeof value.id !== "string" || !value.id.startsWith(ENCRYPTED_RECORD_PREFIX) ||
      !validPortfolioUri(value.portfolioUri) || typeof value.keyBindingMethodId !== "string" ||
      value.keyBindingMethodId.length < 1 || value.keyBindingMethodId.length > 1024 ||
      typeof value.reference !== "string" || value.reference.length !== 43 ||
      typeof value.iv !== "string" || value.iv.length !== 16 ||
      typeof value.head !== "string" || value.head.length !== 71 ||
      typeof value.ciphertextHash !== "string" || value.ciphertextHash.length !== 71 ||
      !(value.ciphertext instanceof Uint8Array) || value.ciphertext.length < 16 || value.ciphertext.length > 32 * 1024) {
      throw new TypeError("invalid encrypted record envelope");
    }
    decodeBase64Url(value.reference, 32);
    decodeBase64Url(value.iv, 12);
    parseSha256Identifier(value.head);
    parseSha256Identifier(value.ciphertextHash);
    if (value.id !== `${ENCRYPTED_RECORD_PREFIX}${value.reference}`) {
      throw new TypeError("encrypted record reference mismatch");
    }
    return value as StoredEncryptedRecord;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError("RHP_STORAGE_CORRUPT", { cause: error });
  }
}

export type RecordStore = Readonly<{
  list(portfolioUri: string, head?: string): Promise<readonly StoredEncryptedRecord[]>;
}>;

export function createRecordStore(database: PassportDatabase): RecordStore {
  if (database.profile !== "real-holder-preview") {
    throw new TypeError("encrypted record storage requires the real-holder-preview profile");
  }
  return Object.freeze({
    list: async (portfolioUri: string, head?: string) => {
      const values = await database.runTransaction(["records"], "readonly", stores => {
        return stores.request<unknown[]>(stores.store("records").getAll());
      });
      const validated = values.map(validateStoredEncryptedRecord);
      return Object.freeze(validated
        .filter(value => value.portfolioUri === portfolioUri && (head === undefined || value.head === head)));
    }
  });
}

export async function replaceEncryptedRecords(
  stores: TransactionStores<readonly ["records"] | readonly ["portfolio", "heads", "records"]>,
  portfolioUri: string,
  records: readonly StoredEncryptedRecord[]
): Promise<void> {
  const validated = records.map(validateStoredEncryptedRecord);
  if (validated.some(value => value.portfolioUri !== portfolioUri)) {
    throw new StorageError("RHP_STORAGE_CORRUPT");
  }
  const references = new Set(validated.map(value => value.reference));
  if (references.size !== validated.length) throw new StorageError("RHP_STORAGE_CORRUPT");

  const store = stores.store("records");
  const current = await stores.request<unknown[]>(store.getAll());
  for (const raw of current) {
    const value = validateStoredEncryptedRecord(raw);
    if (value.portfolioUri === portfolioUri) {
      await stores.request(store.delete(value.id));
    }
  }
  for (const value of validated) await stores.request(store.put(value));
}
