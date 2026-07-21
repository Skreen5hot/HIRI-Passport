// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createPassportDatabase, type StorageErrorCode } from "../../app/src/storage/database";
import {
  createStorageCoordinator,
  recoveryActionsFor,
  type StorageCoordinationChannel,
  type StorageCoordinationMessage
} from "../../app/src/storage/storage-coordinator";
import { DATABASE_VERSION, databaseNameFor } from "../../app/src/storage/schema";

function openRaw(factory: IDBFactory, name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function recordingChannel(): { channel: StorageCoordinationChannel; posted: StorageCoordinationMessage[] } {
  const posted: StorageCoordinationMessage[] = [];
  const listeners = new Set<(message: unknown) => void>();
  return {
    posted,
    channel: {
      post(message) {
        posted.push(message);
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    }
  };
}

function deferred(): { promise: Promise<void>; resolve(): void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

async function until(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error("condition not reached");
}

describe("storage coordinator", () => {
  it("allows an explicit first start but treats a missing expected database as possible eviction", async () => {
    const firstStart = createStorageCoordinator({
      database: createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() }),
      ownerId: "first-tab"
    });
    await expect(firstStart.start("first-start-allowed")).resolves.toMatchObject({ state: "ready" });
    firstStart.close();

    const expectedFactory = new IDBFactory();
    const expectedState = createStorageCoordinator({
      database: createPassportDatabase({ profile: "real-holder-preview", factory: expectedFactory }),
      ownerId: "returning-tab"
    });
    const result = await expectedState.start("existing-state-required");
    expect(result).toMatchObject({
      state: "eviction-suspected",
      code: "RHP_STORAGE_EVICTION_SUSPECTED"
    });
    expect(result.recoveryActions).toContain("acknowledge-possible-local-data-loss");
    await expect(expectedState.start("first-start-allowed")).resolves.toBe(result);
    expectedState.close();
  });

  it("fails closed when startup encounters an incomplete migration", async () => {
    const factory = new IDBFactory();
    const initial = createPassportDatabase({ profile: "real-holder-preview", factory });
    const opened = await initial.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = opened.transaction("migrations", "readwrite");
      transaction.objectStore("migrations").put({
        id: `v${DATABASE_VERSION}`,
        from: DATABASE_VERSION - 1,
        to: DATABASE_VERSION,
        status: "started",
        startedAt: "2026-07-21T00:00:00Z"
      });
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    initial.close();

    const coordinator = createStorageCoordinator({
      database: createPassportDatabase({ profile: "real-holder-preview", factory }),
      ownerId: "blocked-tab"
    });
    await expect(coordinator.start()).resolves.toMatchObject({
      state: "failed",
      code: "RHP_STORAGE_PARTIAL_MIGRATION",
      summary: "A storage migration did not complete."
    });
    await expect(coordinator.runSensitiveOperation(
      { scope: "sign", token: "never-used", now: 1, ttlMs: 10 },
      () => "must-not-run"
    )).rejects.toMatchObject({ code: "RHP_STORAGE_PARTIAL_MIGRATION" });
    coordinator.close();
  });

  it("blocks new operations on version change and closes only after the active operation boundary", async () => {
    const factory = new IDBFactory();
    const database = createPassportDatabase({ profile: "real-holder-preview", factory });
    const recorded = recordingChannel();
    const coordinator = createStorageCoordinator({ database, ownerId: "active-tab", channel: recorded.channel });
    await coordinator.start();

    const entered = deferred();
    const finish = deferred();
    const active = coordinator.runSensitiveOperation(
      { scope: "presentation:sign", token: "active-operation-token", now: 100, ttlMs: 500 },
      async () => {
        entered.resolve();
        await finish.promise;
        return "committed-boundary";
      }
    );
    await entered.promise;

    const upgrade = openRaw(factory, databaseNameFor("real-holder-preview"), DATABASE_VERSION + 1);
    await until(() => coordinator.current.state === "version-change");
    await expect(coordinator.runSensitiveOperation(
      { scope: "presentation:sign", token: "second-token", now: 101, ttlMs: 500 },
      () => "must-not-run"
    )).rejects.toMatchObject({ code: "RHP_STORAGE_VERSION_CHANGE" });

    finish.resolve();
    await expect(active).resolves.toBe("committed-boundary");
    const upgraded = await upgrade;
    expect(upgraded.version).toBe(DATABASE_VERSION + 1);
    expect(recorded.posted).toEqual([{
      type: "storage-version-change",
      profile: "real-holder-preview",
      targetVersion: DATABASE_VERSION + 1
    }]);
    expect(Object.keys(recorded.posted[0]!)).toEqual(["type", "profile", "targetVersion"]);
    upgraded.close();
    coordinator.close();
  });

  it("latches an explicit browser eviction signal and never offers silent reset", async () => {
    const coordinator = createStorageCoordinator({
      database: createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() }),
      ownerId: "eviction-tab"
    });
    await coordinator.start();
    const signaled = coordinator.reportEvictionSignal();
    expect(signaled).toMatchObject({
      state: "eviction-suspected",
      code: "RHP_STORAGE_EVICTION_SUSPECTED"
    });
    expect(signaled.recoveryActions.join(" ")).not.toMatch(/reset|delete|recreate/iu);
    await expect(coordinator.runSensitiveOperation(
      { scope: "authority:create", token: "blocked-token", now: 10, ttlMs: 20 },
      () => "must-not-run"
    )).rejects.toMatchObject({ code: "RHP_STORAGE_EVICTION_SUSPECTED" });
    coordinator.close();
  });

  it("provides only explicit, non-destructive recovery choices for every storage failure", () => {
    const codes: StorageErrorCode[] = [
      "RHP_STORAGE_UNAVAILABLE",
      "RHP_STORAGE_UPGRADE_BLOCKED",
      "RHP_STORAGE_DOWNGRADE_REJECTED",
      "RHP_STORAGE_CORRUPT",
      "RHP_STORAGE_PARTIAL_MIGRATION",
      "RHP_STORAGE_QUOTA_EXCEEDED",
      "RHP_STORAGE_TRANSACTION_ABORTED",
      "RHP_STORAGE_VERSION_CHANGE",
      "RHP_STORAGE_LEASE_HELD",
      "RHP_STORAGE_EVICTION_SUSPECTED"
    ];
    for (const code of codes) {
      const actions = recoveryActionsFor(code);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.join(" ")).not.toMatch(/reset|delete|recreate/iu);
    }
  });
});
