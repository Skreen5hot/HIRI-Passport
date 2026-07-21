// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  StorageError,
  createPassportDatabase
} from "../../app/src/storage/database";
import {
  atomicTransaction,
  createRepository,
  createSensitiveLeaseRepository
} from "../../app/src/storage/repositories";
import {
  DATABASE_VERSION,
  SCHEMA_METADATA_ID,
  STORES,
  VERSION_ONE_STORES,
  databaseNameFor
} from "../../app/src/storage/schema";

function openRaw(
  factory: IDBFactory,
  name: string,
  version: number,
  upgrade?: (database: IDBDatabase, transaction: IDBTransaction) => void
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => {
      if (request.transaction) upgrade?.(request.result, request.transaction);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function rawRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function rawWrite(database: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
}

describe("versioned IndexedDB state", () => {
  it("creates the complete schema, metadata, and an applied journal for every version", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({
      profile: "real-holder-preview",
      factory,
      clock: { now: () => "2026-07-21T00:00:00Z" }
    });
    const opened = await database.open();

    expect([...opened.objectStoreNames]).toEqual(expect.arrayContaining([...STORES]));
    const transaction = opened.transaction(["settings", "migrations"], "readonly");
    const metadata = await rawRequest<Record<string, unknown>>(
      transaction.objectStore("settings").get(SCHEMA_METADATA_ID)
    );
    expect(metadata).toEqual({
      id: SCHEMA_METADATA_ID,
      schemaVersion: DATABASE_VERSION,
      profile: "real-holder-preview",
      initializedAt: "2026-07-21T00:00:00Z"
    });
    for (let version = 1; version <= DATABASE_VERSION; version += 1) {
      await expect(rawRequest(transaction.objectStore("migrations").get(`v${version}`))).resolves.toMatchObject({
        id: `v${version}`,
        from: version - 1,
        to: version,
        status: "applied"
      });
    }
    database.close();
  });

  it("upgrades the prototype v1 database and normalizes its legacy journal", async () => {
    const factory = new IDBFactory();
    const name = databaseNameFor("synthetic-demo");
    const legacy = await openRaw(factory, name, 1, (database, transaction) => {
      for (const store of VERSION_ONE_STORES) database.createObjectStore(store, { keyPath: "id" });
      transaction.objectStore("migrations").put({ id: "v1", appliedAt: "1970-01-01T00:00:00.000Z" });
    });
    legacy.close();

    const database = createPassportDatabase({ profile: "synthetic-demo", factory });
    const opened = await database.open();
    expect(opened.version).toBe(DATABASE_VERSION);
    await expect(rawRequest(opened.transaction("migrations").objectStore("migrations").get("v1"))).resolves.toMatchObject({
      from: 0,
      to: 1,
      status: "applied"
    });
    database.close();
  });

  it("keeps synthetic demo and real preview records in different databases", async () => {
    const factory = new IDBFactory();
    const demoDatabase = createPassportDatabase({ profile: "synthetic-demo", factory });
    const previewDatabase = createPassportDatabase({ profile: "real-holder-preview", factory });
    const demoRecords = createRepository<{ id: string; kind: string }>(demoDatabase, "records");
    const previewRecords = createRepository<{ id: string; kind: string }>(previewDatabase, "records");

    await demoRecords.put({ id: "same-local-id", kind: "synthetic" });
    expect(await previewRecords.get("same-local-id")).toBeUndefined();
    await previewRecords.put({ id: "same-local-id", kind: "preview" });
    await expect(demoRecords.get("same-local-id")).resolves.toEqual({ id: "same-local-id", kind: "synthetic" });
    await expect(previewRecords.get("same-local-id")).resolves.toEqual({ id: "same-local-id", kind: "preview" });
    demoDatabase.close();
    previewDatabase.close();
  });

  it("preserves non-extractable CryptoKey handles through structured clone", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({ profile: "real-holder-preview", factory });
    const keys = createRepository<{ id: string; privateKey: CryptoKey }>(database, "keys");
    const privateKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    await keys.put({ id: "protected-handle", privateKey });
    database.close();
    const reloaded = createPassportDatabase({ profile: "real-holder-preview", factory });
    const stored = await createRepository<{ id: string; privateKey: CryptoKey }>(reloaded, "keys").get("protected-handle");
    expect(stored?.privateKey).toBeInstanceOf(CryptoKey);
    expect(stored?.privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", stored!.privateKey)).rejects.toThrow();
    reloaded.close();
  });

  it("commits related records atomically and rolls all of them back after abort", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({ profile: "real-holder-preview", factory });
    const records = createRepository<{ id: string; value: string }>(database, "records");
    const history = createRepository<{ id: string; value: string }>(database, "history");

    await atomicTransaction(database, ["records", "history"], async stores => {
      await stores.request(stores.store("records").put({ id: "committed", value: "record" }));
      await stores.request(stores.store("history").put({ id: "committed", value: "history" }));
    });
    await expect(records.get("committed")).resolves.toMatchObject({ value: "record" });
    await expect(history.get("committed")).resolves.toMatchObject({ value: "history" });

    const failed = atomicTransaction(database, ["records", "history"], async stores => {
      await stores.request(stores.store("records").put({ id: "rolled-back", value: "record" }));
      await stores.request(stores.store("history").put({ id: "rolled-back", value: "history" }));
      throw new DOMException("test quota detail must not escape", "QuotaExceededError");
    });
    await expect(failed).rejects.toMatchObject({
      code: "RHP_STORAGE_QUOTA_EXCEEDED",
      message: "The browser could not reserve enough protected local storage."
    });
    await expect(records.get("rolled-back")).resolves.toBeUndefined();
    await expect(history.get("rolled-back")).resolves.toBeUndefined();
    database.close();
  });

  it("refuses a partial journal without deleting the stored records", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({ profile: "real-holder-preview", factory });
    const records = createRepository<{ id: string; value: string }>(database, "records");
    await records.put({ id: "must-survive", value: "holder-local" });
    const opened = await database.open();
    await rawWrite(opened, "migrations", {
      id: `v${DATABASE_VERSION}`,
      from: DATABASE_VERSION - 1,
      to: DATABASE_VERSION,
      status: "started",
      startedAt: "2026-07-21T00:00:00Z"
    });
    database.close();

    const reopened = createPassportDatabase({ profile: "real-holder-preview", factory });
    await expect(reopened.open()).rejects.toMatchObject({ code: "RHP_STORAGE_PARTIAL_MIGRATION" });

    const inspection = await openRaw(factory, databaseNameFor("real-holder-preview"), DATABASE_VERSION);
    await expect(rawRequest(inspection.transaction("records").objectStore("records").get("must-survive"))).resolves.toEqual({
      id: "must-survive",
      value: "holder-local"
    });
    inspection.close();
  });

  it("classifies malformed schema metadata as corruption", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({ profile: "real-holder-preview", factory });
    const opened = await database.open();
    await rawWrite(opened, "settings", {
      id: SCHEMA_METADATA_ID,
      schemaVersion: DATABASE_VERSION,
      profile: "real-holder-preview",
      initializedAt: 42
    });
    database.close();

    const reopened = createPassportDatabase({ profile: "real-holder-preview", factory });
    await expect(reopened.open()).rejects.toMatchObject({ code: "RHP_STORAGE_CORRUPT" });
  });

  it("rejects a database created by a newer application version", async () => {
    const factory = new IDBFactory();
    const current = createPassportDatabase({ profile: "real-holder-preview", factory });
    await current.open();
    current.close();
    const future = await openRaw(factory, databaseNameFor("real-holder-preview"), DATABASE_VERSION + 1);
    future.close();

    const downgraded = createPassportDatabase({ profile: "real-holder-preview", factory });
    await expect(downgraded.open()).rejects.toMatchObject({ code: "RHP_STORAGE_DOWNGRADE_REJECTED" });
  });

  it("reports a blocked upgrade instead of waiting or resetting another tab", async () => {
    const factory = new IDBFactory();
    const name = databaseNameFor("real-holder-preview");
    const oldTab = await openRaw(factory, name, 1, database => {
      for (const store of VERSION_ONE_STORES) database.createObjectStore(store, { keyPath: "id" });
    });
    oldTab.onversionchange = () => {
      // Deliberately emulate a tab that has not reached a safe close boundary.
    };
    const upgradingTab = createPassportDatabase({ profile: "real-holder-preview", factory });
    await expect(upgradingTab.open()).rejects.toMatchObject({ code: "RHP_STORAGE_UPGRADE_BLOCKED" });
    expect(oldTab.version).toBe(1);
    oldTab.close();
  });
});

describe("sensitive-operation leases", () => {
  it("serializes concurrent tabs and permits explicit expired-lease takeover", async () => {
    const factory = new IDBFactory();
    const tabA = createPassportDatabase({ profile: "real-holder-preview", factory });
    const tabB = createPassportDatabase({ profile: "real-holder-preview", factory });
    await Promise.all([tabA.open(), tabB.open()]);
    const leasesA = createSensitiveLeaseRepository(tabA);
    const leasesB = createSensitiveLeaseRepository(tabB);

    const outcomes = await Promise.allSettled([
      leasesA.acquire({ scope: "authority:rotate", ownerId: "tab-a", token: "token-a", now: 100, ttlMs: 50 }),
      leasesB.acquire({ scope: "authority:rotate", ownerId: "tab-b", token: "token-b", now: 100, ttlMs: 50 })
    ]);
    expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find(outcome => outcome.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(StorageError);
    expect(rejected.reason).toMatchObject({ code: "RHP_STORAGE_LEASE_HELD" });

    const winner = (outcomes.find(outcome => outcome.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof leasesA.acquire>>>).value;
    const takeoverRepository = winner.ownerId === "tab-a" ? leasesB : leasesA;
    const takeover = await takeoverRepository.acquire({
      scope: "authority:rotate",
      ownerId: "tab-after-expiry",
      token: "token-after-expiry",
      now: 150,
      ttlMs: 50
    });
    expect(takeover.generation).toBe(winner.generation + 1);
    expect(await takeoverRepository.release(takeover)).toBe(true);
    tabA.close();
    tabB.close();
  });
});
