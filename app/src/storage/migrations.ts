import {
  DATABASE_VERSION,
  SCHEMA_METADATA_ID,
  STORES,
  VERSION_ONE_STORES,
  type StorageProfile
} from "./schema";

export type MigrationStatus = "started" | "applied";

export type MigrationJournalEntry = Readonly<{
  id: `v${number}`;
  from: number;
  to: number;
  status: MigrationStatus;
  startedAt: string;
  appliedAt?: string;
}>;

export type StorageSchemaMetadata = Readonly<{
  id: typeof SCHEMA_METADATA_ID;
  schemaVersion: number;
  profile: StorageProfile;
  initializedAt: string;
}>;

export type MigrationState = Readonly<{
  from: number;
  to: number;
  status: "planned" | "applied";
}>;

export type MigrationValidationFailure = Readonly<{
  kind: "downgrade" | "corrupt" | "partial-migration";
}>;

export class MigrationValidationError extends Error {
  readonly kind: MigrationValidationFailure["kind"];

  constructor(kind: MigrationValidationFailure["kind"]) {
    super("Stored state is not compatible with this reviewed application version.");
    this.name = "MigrationValidationError";
    this.kind = kind;
  }
}

export function planMigration(from: number, to = DATABASE_VERSION): MigrationState {
  if (!Number.isSafeInteger(from) || from < 0 || !Number.isSafeInteger(to) || to < 0 || from > to) {
    throw new RangeError("database downgrade is prohibited");
  }
  return Object.freeze({ from, to, status: from === to ? "applied" : "planned" });
}

function createStoreIfMissing(database: IDBDatabase, name: string): void {
  if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: "id" });
}

function journalEntry(version: number, status: MigrationStatus, at: string): MigrationJournalEntry {
  return Object.freeze({
    id: `v${version}`,
    from: version - 1,
    to: version,
    status,
    startedAt: at,
    ...(status === "applied" ? { appliedAt: at } : {})
  });
}

/**
 * Applies every structural step inside the browser's single version-change
 * transaction. A thrown error aborts schema changes and journal writes together.
 */
export function applyUpgradeMigrations(input: Readonly<{
  database: IDBDatabase;
  transaction: IDBTransaction;
  oldVersion: number;
  newVersion: number;
  profile: StorageProfile;
  timestamp: string;
}>): void {
  const { database, transaction, oldVersion, newVersion, profile, timestamp } = input;
  planMigration(oldVersion, newVersion);
  if (newVersion > DATABASE_VERSION) throw new RangeError("unknown database migration target");

  for (let version = oldVersion + 1; version <= newVersion; version += 1) {
    if (version === 1) {
      for (const store of VERSION_ONE_STORES) createStoreIfMissing(database, store);
    } else if (version === 2) {
      createStoreIfMissing(database, "leases");
    } else {
      throw new RangeError("missing database migration step");
    }

    const migrations = transaction.objectStore("migrations");
    migrations.put(journalEntry(version, "started", timestamp));
    migrations.put(journalEntry(version, "applied", timestamp));
  }

  // Normalize the old v1 prototype journal while upgrading an existing demo DB.
  if (oldVersion === 1 && newVersion >= 2) {
    transaction.objectStore("migrations").put(journalEntry(1, "applied", timestamp));
  }

  transaction.objectStore("settings").put(Object.freeze({
    id: SCHEMA_METADATA_ID,
    schemaVersion: newVersion,
    profile,
    initializedAt: timestamp
  } satisfies StorageSchemaMetadata));
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("storage validation request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("storage validation transaction aborted"));
    transaction.onerror = () => {
      // `abort` is the authoritative terminal event.
    };
  });
}

function isMetadata(value: unknown): value is StorageSchemaMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join("\0") === ["id", "initializedAt", "profile", "schemaVersion"].join("\0") &&
    record.id === SCHEMA_METADATA_ID &&
    Number.isSafeInteger(record.schemaVersion) &&
    (record.profile === "synthetic-demo" || record.profile === "real-holder-preview") &&
    typeof record.initializedAt === "string";
}

function isAppliedJournal(value: unknown, version: number): value is MigrationJournalEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join("\0") === ["appliedAt", "from", "id", "startedAt", "status", "to"].join("\0") &&
    record.id === `v${version}` &&
    record.from === version - 1 &&
    record.to === version &&
    record.status === "applied" &&
    typeof record.startedAt === "string" &&
    typeof record.appliedAt === "string";
}

/** Refuses missing, cross-profile, partial, corrupt, or future-version state. */
export async function validateMigrationState(database: IDBDatabase, profile: StorageProfile): Promise<void> {
  if (database.objectStoreNames.length !== STORES.length) throw new MigrationValidationError("corrupt");
  for (const store of STORES) {
    if (!database.objectStoreNames.contains(store)) throw new MigrationValidationError("corrupt");
  }

  const transaction = database.transaction(["settings", "migrations"], "readonly");
  const complete = transactionComplete(transaction);
  const metadataPromise = requestResult<unknown>(transaction.objectStore("settings").get(SCHEMA_METADATA_ID));
  const journalPromises = Array.from({ length: DATABASE_VERSION }, (_, index) => {
    const version = index + 1;
    return requestResult<unknown>(transaction.objectStore("migrations").get(`v${version}`));
  });
  const [metadata, journals] = await Promise.all([metadataPromise, Promise.all(journalPromises)]);
  await complete;

  if (!isMetadata(metadata)) throw new MigrationValidationError("corrupt");
  if (metadata.schemaVersion > DATABASE_VERSION) throw new MigrationValidationError("downgrade");
  if (metadata.schemaVersion !== DATABASE_VERSION || metadata.profile !== profile) {
    throw new MigrationValidationError("corrupt");
  }
  for (let version = 1; version <= DATABASE_VERSION; version += 1) {
    if (!isAppliedJournal(journals[version - 1], version)) {
      throw new MigrationValidationError("partial-migration");
    }
  }
}
