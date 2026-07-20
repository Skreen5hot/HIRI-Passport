import { DATABASE_NAME, DATABASE_VERSION, STORES, type StoreName } from "./schema";

let connection: Promise<IDBDatabase> | null = null;

export function openPassportDatabase(): Promise<IDBDatabase> {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("database open failed"));
    request.onblocked = () => reject(new Error("database upgrade blocked by another tab"));
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      request.transaction?.objectStore("migrations").put({ id: `v${DATABASE_VERSION}`, appliedAt: new Date(0).toISOString() });
    };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = null; }; resolve(db); };
  });
  return connection;
}

export async function transaction<T>(storeName: StoreName, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openPassportDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode); const request = operation(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("database request failed")); tx.onabort = () => reject(tx.error ?? new Error("database transaction aborted"));
  });
}

export function closePassportDatabase() { connection?.then(db => db.close()).catch(() => {}); connection = null; }
