import {
  StorageError,
  transaction,
  type PassportDatabase,
  type TransactionStores
} from "./database";
import type { StoreName } from "./schema";

export type Repository<T extends { id: string }> = Readonly<{
  get(id: string): Promise<T | undefined>;
  put(value: T): Promise<T>;
  delete(id: string): Promise<void>;
  all(): Promise<T[]>;
}>;

export function createRepository<T extends { id: string }>(database: PassportDatabase, storeName: StoreName): Repository<T> {
  return Object.freeze({
    get: (id: string) => database.runTransaction([storeName], "readonly", stores => {
      return stores.request<T | undefined>(stores.store(storeName).get(id));
    }),
    put: (value: T) => database.runTransaction([storeName], "readwrite", async stores => {
      // IndexedDB's structured-clone path preserves CryptoKey handles. Protocol
      // state is never converted through JSON or private-key encodings here.
      await stores.request(stores.store(storeName).put(value));
      return value;
    }),
    delete: (id: string) => database.runTransaction([storeName], "readwrite", async stores => {
      await stores.request(stores.store(storeName).delete(id));
    }),
    all: () => database.runTransaction([storeName], "readonly", stores => {
      return stores.request<T[]>(stores.store(storeName).getAll());
    })
  });
}

/** Executes related state changes in one all-or-nothing browser transaction. */
export function atomicTransaction<Names extends readonly StoreName[], Result>(
  database: PassportDatabase,
  storeNames: Names,
  operation: (stores: TransactionStores<Names>) => Result | Promise<Result>
): Promise<Result> {
  return database.runTransaction(storeNames, "readwrite", operation);
}

export type SensitiveOperationLease = Readonly<{
  id: string;
  ownerId: string;
  token: string;
  generation: number;
  acquiredAt: number;
  expiresAt: number;
}>;

export type AcquireLeaseInput = Readonly<{
  scope: string;
  ownerId: string;
  token: string;
  now: number;
  ttlMs: number;
}>;

function requireOpaqueMember(value: string): void {
  if (value.length < 1 || value.length > 256 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError("invalid sensitive-operation lease member");
  }
}

function validateLeaseInput(input: AcquireLeaseInput): void {
  requireOpaqueMember(input.scope);
  requireOpaqueMember(input.ownerId);
  requireOpaqueMember(input.token);
  if (!Number.isSafeInteger(input.now) || input.now < 0 || !Number.isSafeInteger(input.ttlMs) || input.ttlMs < 1) {
    throw new TypeError("invalid sensitive-operation lease time");
  }
  if (!Number.isSafeInteger(input.now + input.ttlMs)) throw new TypeError("invalid sensitive-operation lease expiry");
}

function isLease(value: unknown): value is SensitiveOperationLease {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const lease = value as Record<string, unknown>;
  return typeof lease.id === "string" &&
    typeof lease.ownerId === "string" &&
    typeof lease.token === "string" &&
    Number.isSafeInteger(lease.generation) &&
    Number.isSafeInteger(lease.acquiredAt) &&
    Number.isSafeInteger(lease.expiresAt);
}

export type SensitiveLeaseRepository = Readonly<{
  acquire(input: AcquireLeaseInput): Promise<SensitiveOperationLease>;
  inspect(scope: string): Promise<SensitiveOperationLease | undefined>;
  release(lease: SensitiveOperationLease): Promise<boolean>;
}>;

export function createSensitiveLeaseRepository(database: PassportDatabase): SensitiveLeaseRepository {
  return Object.freeze({
    acquire: async (input: AcquireLeaseInput): Promise<SensitiveOperationLease> => {
      validateLeaseInput(input);
      return database.runTransaction(["leases"], "readwrite", async stores => {
        const store = stores.store("leases");
        const currentValue = await stores.request<unknown>(store.get(input.scope));
        if (currentValue !== undefined && !isLease(currentValue)) {
          throw new StorageError("RHP_STORAGE_CORRUPT");
        }
        if (currentValue && currentValue.expiresAt > input.now) {
          if (currentValue.ownerId === input.ownerId && currentValue.token === input.token) return currentValue;
          throw new StorageError("RHP_STORAGE_LEASE_HELD");
        }

        const lease = Object.freeze({
          id: input.scope,
          ownerId: input.ownerId,
          token: input.token,
          generation: (currentValue?.generation ?? 0) + 1,
          acquiredAt: input.now,
          expiresAt: input.now + input.ttlMs
        });
        await stores.request(store.put(lease));
        return lease;
      });
    },
    inspect: async (scope: string): Promise<SensitiveOperationLease | undefined> => {
      requireOpaqueMember(scope);
      const value = await database.runTransaction(["leases"], "readonly", stores => {
        return stores.request<unknown>(stores.store("leases").get(scope));
      });
      if (value === undefined) return undefined;
      if (!isLease(value)) throw new StorageError("RHP_STORAGE_CORRUPT");
      return value;
    },
    release: (lease: SensitiveOperationLease): Promise<boolean> => {
      return database.runTransaction(["leases"], "readwrite", async stores => {
        const store = stores.store("leases");
        const current = await stores.request<unknown>(store.get(lease.id));
        if (!isLease(current) ||
          current.ownerId !== lease.ownerId ||
          current.token !== lease.token ||
          current.generation !== lease.generation) return false;
        await stores.request(store.delete(lease.id));
        return true;
      }, { allowDuringVersionChange: true });
    }
  });
}

// Compatibility repositories remain synthetic-only. Preview code must inject a
// PassportDatabase and use `createRepository` instead of importing this helper.
export function repository<T extends { id: string }>(store: StoreName): Repository<T> {
  return Object.freeze({
    get: (id: string) => transaction<T | undefined>(store, "readonly", target => target.get(id)),
    put: async (value: T) => {
      await transaction<IDBValidKey>(store, "readwrite", target => target.put(value));
      return value;
    },
    delete: async (id: string) => {
      await transaction<undefined>(store, "readwrite", target => target.delete(id));
    },
    all: () => transaction<T[]>(store, "readonly", target => target.getAll())
  });
}
