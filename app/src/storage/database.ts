import {
  DATABASE_VERSION,
  databaseNameFor,
  type StorageProfile,
  type StoreName
} from "./schema";
import {
  MigrationValidationError,
  applyUpgradeMigrations,
  validateMigrationState
} from "./migrations";

export type StorageErrorCode =
  | "RHP_STORAGE_UNAVAILABLE"
  | "RHP_STORAGE_UPGRADE_BLOCKED"
  | "RHP_STORAGE_DOWNGRADE_REJECTED"
  | "RHP_STORAGE_CORRUPT"
  | "RHP_STORAGE_PARTIAL_MIGRATION"
  | "RHP_STORAGE_QUOTA_EXCEEDED"
  | "RHP_STORAGE_TRANSACTION_ABORTED"
  | "RHP_STORAGE_VERSION_CHANGE"
  | "RHP_STORAGE_LEASE_HELD"
  | "RHP_STORAGE_EVICTION_SUSPECTED";

const SAFE_STORAGE_MESSAGES = Object.freeze<Record<StorageErrorCode, string>>({
  RHP_STORAGE_UNAVAILABLE: "Protected local storage is unavailable.",
  RHP_STORAGE_UPGRADE_BLOCKED: "Another open tab is blocking the storage upgrade.",
  RHP_STORAGE_DOWNGRADE_REJECTED: "Stored state was created by a newer application version.",
  RHP_STORAGE_CORRUPT: "Protected local storage did not pass integrity checks.",
  RHP_STORAGE_PARTIAL_MIGRATION: "A storage migration did not complete.",
  RHP_STORAGE_QUOTA_EXCEEDED: "The browser could not reserve enough protected local storage.",
  RHP_STORAGE_TRANSACTION_ABORTED: "The protected local storage change did not commit.",
  RHP_STORAGE_VERSION_CHANGE: "A storage upgrade is pending in another tab.",
  RHP_STORAGE_LEASE_HELD: "Another tab is already performing this sensitive operation.",
  RHP_STORAGE_EVICTION_SUSPECTED: "Previously initialized local state may have been cleared or evicted."
});

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, options?: ErrorOptions) {
    super(SAFE_STORAGE_MESSAGES[code], options);
    this.name = "StorageError";
    this.code = code;
  }
}

export function asStorageError(error: unknown, fallback: StorageErrorCode = "RHP_STORAGE_UNAVAILABLE"): StorageError {
  if (error instanceof StorageError) return error;
  if (error instanceof MigrationValidationError) {
    if (error.kind === "downgrade") return new StorageError("RHP_STORAGE_DOWNGRADE_REJECTED", { cause: error });
    if (error.kind === "partial-migration") return new StorageError("RHP_STORAGE_PARTIAL_MIGRATION", { cause: error });
    return new StorageError("RHP_STORAGE_CORRUPT", { cause: error });
  }

  const name = error instanceof DOMException ? error.name :
    error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "VersionError") return new StorageError("RHP_STORAGE_DOWNGRADE_REJECTED", { cause: error });
  if (name === "QuotaExceededError") return new StorageError("RHP_STORAGE_QUOTA_EXCEEDED", { cause: error });
  if (name === "AbortError" || name === "ConstraintError" || name === "TransactionInactiveError") {
    return new StorageError("RHP_STORAGE_TRANSACTION_ABORTED", { cause: error });
  }
  return new StorageError(fallback, { cause: error });
}

export type VersionChangeNotice = Readonly<{
  oldVersion: number;
  newVersion: number | null;
  close(): void;
}>;

export type PassportDatabaseOptions = Readonly<{
  profile: StorageProfile;
  factory?: IDBFactory;
  clock?: Readonly<{ now(): string }>;
  name?: string;
}>;

export type TransactionStores<Names extends readonly StoreName[]> = Readonly<{
  transaction: IDBTransaction;
  store<Name extends Names[number]>(name: Name): IDBObjectStore;
  request<T>(request: IDBRequest<T>): Promise<T>;
}>;

type VersionChangeHandler = (notice: VersionChangeNotice) => void;

function defaultTimestamp(): string {
  return new Date().toISOString();
}

function requestPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("database request failed"));
  });
}

function completionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException("Transaction aborted", "AbortError"));
    transaction.onerror = () => {
      // Wait for `abort`, which is the transaction's terminal failure event.
    };
  });
}

export class PassportDatabase {
  readonly profile: StorageProfile;
  readonly name: string;
  readonly version = DATABASE_VERSION;

  #factory: IDBFactory;
  #clock: Readonly<{ now(): string }>;
  #connection: Promise<IDBDatabase> | null = null;
  #database: IDBDatabase | null = null;
  #versionChangeHandler: VersionChangeHandler | null = null;
  #versionChangePending = false;
  #lastOpenCreated = false;

  constructor(options: PassportDatabaseOptions) {
    this.profile = options.profile;
    this.name = options.name ?? databaseNameFor(options.profile);
    this.#factory = options.factory ?? globalThis.indexedDB;
    this.#clock = options.clock ?? Object.freeze({ now: defaultTimestamp });
  }

  get lastOpenCreatedDatabase(): boolean {
    return this.#lastOpenCreated;
  }

  get versionChangePending(): boolean {
    return this.#versionChangePending;
  }

  setVersionChangeHandler(handler: VersionChangeHandler | null): void {
    this.#versionChangeHandler = handler;
  }

  async open(): Promise<IDBDatabase> {
    if (this.#connection) return this.#connection;
    this.#versionChangePending = false;
    this.#lastOpenCreated = false;

    const attempt = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      let request: IDBOpenDBRequest;
      try {
        request = this.#factory.open(this.name, DATABASE_VERSION);
      } catch (error) {
        reject(asStorageError(error));
        return;
      }

      const fail = (error: StorageError): void => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      request.onerror = () => fail(asStorageError(request.error));
      request.onblocked = () => fail(new StorageError("RHP_STORAGE_UPGRADE_BLOCKED"));
      request.onupgradeneeded = event => {
        this.#lastOpenCreated = event.oldVersion === 0;
        try {
          const transaction = request.transaction;
          if (!transaction) throw new Error("version-change transaction unavailable");
          applyUpgradeMigrations({
            database: request.result,
            transaction,
            oldVersion: event.oldVersion,
            newVersion: event.newVersion ?? DATABASE_VERSION,
            profile: this.profile,
            timestamp: this.#clock.now()
          });
        } catch (error) {
          request.transaction?.abort();
          fail(asStorageError(error, "RHP_STORAGE_CORRUPT"));
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        void validateMigrationState(database, this.profile).then(() => {
          if (settled) {
            database.close();
            return;
          }
          settled = true;
          this.#database = database;
          database.onversionchange = event => {
            this.#versionChangePending = true;
            const close = () => this.#closeConnection(database);
            if (this.#versionChangeHandler) {
              this.#versionChangeHandler(Object.freeze({
                oldVersion: event.oldVersion,
                newVersion: event.newVersion,
                close
              }));
            } else {
              close();
            }
          };
          resolve(database);
        }, error => {
          database.close();
          fail(asStorageError(error, "RHP_STORAGE_CORRUPT"));
        });
      };
    });

    this.#connection = attempt;
    try {
      return await attempt;
    } catch (error) {
      if (this.#connection === attempt) this.#connection = null;
      throw error;
    }
  }

  async runTransaction<Names extends readonly StoreName[], Result>(
    storeNames: Names,
    mode: IDBTransactionMode,
    operation: (stores: TransactionStores<Names>) => Result | Promise<Result>,
    options: Readonly<{ allowDuringVersionChange?: boolean }> = {}
  ): Promise<Result> {
    if (this.#versionChangePending && options.allowDuringVersionChange !== true) {
      throw new StorageError("RHP_STORAGE_VERSION_CHANGE");
    }

    const database = await this.open();
    if (this.#versionChangePending && options.allowDuringVersionChange !== true) {
      throw new StorageError("RHP_STORAGE_VERSION_CHANGE");
    }

    let transaction: IDBTransaction;
    try {
      transaction = database.transaction([...storeNames], mode);
    } catch (error) {
      throw asStorageError(error, this.#versionChangePending ? "RHP_STORAGE_VERSION_CHANGE" : "RHP_STORAGE_UNAVAILABLE");
    }
    const completed = completionPromise(transaction);
    const stores: TransactionStores<Names> = Object.freeze({
      transaction,
      store: <Name extends Names[number]>(name: Name) => transaction.objectStore(name),
      request: requestPromise
    });

    let result: Result;
    try {
      result = await operation(stores);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted because of the same request.
      }
      try {
        await completed;
      } catch {
        // Preserve the operation's more specific failure below.
      }
      throw asStorageError(error, "RHP_STORAGE_TRANSACTION_ABORTED");
    }

    try {
      await completed;
      return result;
    } catch (error) {
      throw asStorageError(error, "RHP_STORAGE_TRANSACTION_ABORTED");
    }
  }

  close(): void {
    if (this.#database) this.#closeConnection(this.#database);
    this.#connection = null;
  }

  #closeConnection(database: IDBDatabase): void {
    database.close();
    if (this.#database === database) this.#database = null;
    this.#connection = null;
  }
}

export function createPassportDatabase(options: PassportDatabaseOptions): PassportDatabase {
  return new PassportDatabase(options);
}

const compatibilityDatabases = new Map<StorageProfile, PassportDatabase>();

function compatibilityDatabase(profile: StorageProfile): PassportDatabase {
  let database = compatibilityDatabases.get(profile);
  if (!database) {
    database = createPassportDatabase({ profile });
    compatibilityDatabases.set(profile, database);
  }
  return database;
}

/** Synthetic compatibility API. Preview composition must pass its profile explicitly. */
export function openPassportDatabase(profile: StorageProfile = "synthetic-demo"): Promise<IDBDatabase> {
  return compatibilityDatabase(profile).open();
}

/** Synthetic compatibility API for the current demo repositories. */
export function transaction<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return compatibilityDatabase("synthetic-demo").runTransaction([storeName], mode, async stores => {
    return stores.request(operation(stores.store(storeName)));
  });
}

export function closePassportDatabase(): void {
  for (const database of compatibilityDatabases.values()) database.close();
  compatibilityDatabases.clear();
}
