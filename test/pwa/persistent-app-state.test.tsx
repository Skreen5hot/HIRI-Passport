import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { createPassportDatabase } from "../../app/src/storage/database";
import { createRepository } from "../../app/src/storage/repositories";
import { createStorageCoordinator } from "../../app/src/storage/storage-coordinator";
import { emptyAppSnapshot, type AppLifecycleState } from "../../app/src/state/app-state";
import { PersistentAppStateRoot } from "../../app/src/state/app-state.tsx";
import { useAppState } from "../../app/src/state/app-state-context";
import {
  APP_VIEW_STATE_ID,
  APP_VIEW_STATE_SCHEMA,
  createIndexedDbAppStateService,
  hydratePersistentAppState,
  type AppStateAccessPort,
  type AppStateCredentialSource,
  type AppStateMigrationPort,
  type PersistentAppStateService
} from "../../app/src/state/state-hydration";
import type { CredentialRecord, HolderAuthorityView, PrivacyEvent } from "../../app/src/types";

const AUTHORITY: HolderAuthorityView = Object.freeze({
  authority: "key:ed25519:zPreviewAuthority",
  activeMethodId: "key:ed25519:zPreviewAuthority#method-1",
  createdAt: "2026-07-21T12:00:00Z",
  lifecycle: "active"
});

const HISTORY: PrivacyEvent = Object.freeze({
  id: "local-receipt-1",
  verifier: "key:ed25519:zUnknownVerifier",
  purpose: "Confirm a holder-provided statement",
  disclosed: Object.freeze(["Preferred name"]),
  at: "2026-07-21T12:05:00Z",
  delivery: "delivered"
});

const HASH = `sha256:${"a".repeat(64)}`;
const SELF_ASSERTION: CredentialRecord = Object.freeze({
  recordId: "local-self-assertion-1",
  title: "Preferred name",
  issuer: "You",
  credentialType: "PreferredNameAssertion",
  provenance: "self-asserted-persistent",
  status: "unknown",
  cryptography: "valid",
  issuerIdentity: "not-applicable",
  policy: "not-evaluated",
  updatedAt: "2026-07-21T12:01:00Z",
  publicContent: false,
  claims: Object.freeze({ "Preferred name": "Alex" }),
  manifestHash: HASH,
  contentHash: HASH,
  schema: "https://hiri-protocol.org/resources/preferred-name-v1.json",
  schemaHash: HASH
});

function unlocked(): AppStateAccessPort {
  return Object.freeze({ inspect: async (): Promise<"unlocked"> => "unlocked" });
}

function createHarness(input: Readonly<{
  factory?: IDBFactory;
  ownerId?: string;
  expectation?: "first-start-allowed" | "existing-state-required";
  access?: AppStateAccessPort;
  credentials?: AppStateCredentialSource;
  migrations?: AppStateMigrationPort;
}> = {}) {
  const factory = input.factory ?? new IDBFactory();
  const database = createPassportDatabase({ profile: "real-holder-preview", factory });
  const coordinator = createStorageCoordinator({
    database,
    ownerId: input.ownerId ?? `tab-${crypto.randomUUID()}`
  });
  const service = createIndexedDbAppStateService({
    database,
    coordinator,
    access: input.access ?? unlocked(),
    ...(input.expectation ? { expectation: input.expectation } : {}),
    ...(input.credentials ? { credentials: input.credentials } : {}),
    ...(input.migrations ? { migrations: input.migrations } : {})
  });
  return { factory, database, coordinator, service };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("persistent Real Holder Preview application state", () => {
  it("hydrates a new preview as loading then empty without synthetic state", async () => {
    const harness = createHarness();
    const states: AppLifecycleState[] = [];
    const result = await hydratePersistentAppState(harness.service, {
      signal: new AbortController().signal,
      onState: state => states.push(state)
    });

    expect(states.map(state => state.state)).toEqual(["loading", "empty"]);
    expect(result).toEqual({ state: "empty", snapshot: emptyAppSnapshot() });
    expect(JSON.stringify(result)).not.toMatch(/synthetic|credential valid|authority ready/iu);
    harness.coordinator.close();
  });

  it("reloads persisted public authority view and holder-controlled privacy history", async () => {
    const factory = new IDBFactory();
    const first = createHarness({ factory, ownerId: "first-tab" });
    await hydratePersistentAppState(first.service, { signal: new AbortController().signal });
    await first.service.saveAuthority(AUTHORITY);
    await first.service.recordHistory(HISTORY);
    first.coordinator.close();

    const reloaded = createHarness({
      factory,
      ownerId: "reloaded-tab",
      expectation: "existing-state-required"
    });
    const result = await hydratePersistentAppState(reloaded.service, {
      signal: new AbortController().signal
    });
    expect(result).toMatchObject({
      state: "ready",
      snapshot: {
        credentials: [],
        authority: AUTHORITY,
        authorityReady: true,
        backupVerified: false,
        history: [HISTORY]
      }
    });
    expect(JSON.stringify(result)).not.toMatch(/privateKey|pkcs8|jwk/iu);
    reloaded.coordinator.close();
  });

  it("refuses plaintext credential persistence until the encrypted portfolio service is injected", async () => {
    const harness = createHarness();
    await expect(harness.service.saveAuthority(AUTHORITY)).rejects.toMatchObject({
      code: "RHP_STATE_NOT_READY"
    });
    await hydratePersistentAppState(harness.service, { signal: new AbortController().signal });
    await expect(harness.service.saveCredential?.(SELF_ASSERTION)).rejects.toMatchObject({
      code: "RHP_STATE_PORTFOLIO_UNAVAILABLE",
      message: "Encrypted portfolio persistence is unavailable."
    });
    await expect(createRepository(harness.database, "records").all()).resolves.toEqual([]);
    harness.coordinator.close();
  });

  it("returns locked before reading holder records", async () => {
    const list = vi.fn(async () => [SELF_ASSERTION]);
    const harness = createHarness({
      access: { inspect: async () => "locked" },
      credentials: { list }
    });
    const result = await hydratePersistentAppState(harness.service, {
      signal: new AbortController().signal
    });
    expect(result).toEqual({
      state: "locked",
      code: "RHP_STATE_LOCKED",
      summary: "Local holder state is locked on this device."
    });
    expect(list).not.toHaveBeenCalled();
    harness.coordinator.close();
  });

  it("keeps repository failure details out of the failed state", async () => {
    const harness = createHarness({
      credentials: {
        list: async () => {
          throw new Error("SECRET claim value and database path");
        }
      }
    });
    const result = await hydratePersistentAppState(harness.service, {
      signal: new AbortController().signal
    });
    expect(result).toEqual({
      state: "failed",
      code: "RHP_STATE_HYDRATION_FAILED",
      summary: "Local holder state could not be loaded. No local data was reset."
    });
    expect(JSON.stringify(result)).not.toMatch(/SECRET|database path/iu);
    harness.coordinator.close();
  });

  it("cancels hydration without publishing a late ready or failed state", async () => {
    const accessResult = deferred<"unlocked">();
    const harness = createHarness({
      access: { inspect: () => accessResult.promise }
    });
    const controller = new AbortController();
    const states: AppLifecycleState[] = [];
    const hydration = hydratePersistentAppState(harness.service, {
      signal: controller.signal,
      onState: state => states.push(state)
    });
    await waitFor(() => expect(states.map(state => state.state)).toEqual(["loading"]));
    controller.abort();
    accessResult.resolve("unlocked");
    await expect(hydration).rejects.toMatchObject({ name: "AbortError" });
    expect(states.map(state => state.state)).toEqual(["loading"]);
    harness.coordinator.close();
  });

  it("gates record loading until an explicit application migration completes", async () => {
    const migrationFinish = deferred<void>();
    const list = vi.fn(async () => [SELF_ASSERTION]);
    const run = vi.fn(async () => migrationFinish.promise);
    const harness = createHarness({
      credentials: { list },
      migrations: {
        pending: async () => ({ fromVersion: 1, toVersion: 2, run })
      }
    });
    const states: AppLifecycleState[] = [];
    const hydration = hydratePersistentAppState(harness.service, {
      signal: new AbortController().signal,
      onState: state => states.push(state)
    });
    await waitFor(() => expect(states.some(state => state.state === "migrating")).toBe(true));
    expect(list).not.toHaveBeenCalled();
    migrationFinish.resolve();
    const result = await hydration;
    expect(run).toHaveBeenCalledOnce();
    expect(list).toHaveBeenCalledOnce();
    expect(states.map(state => state.state)).toEqual(["loading", "migrating", "ready"]);
    expect(result).toMatchObject({ state: "ready", snapshot: { credentials: [SELF_ASSERTION] } });
    harness.coordinator.close();
  });

  it("maps an unavailable storage coordinator to blocked without reading records", async () => {
    const list = vi.fn(async () => [SELF_ASSERTION]);
    const harness = createHarness({ credentials: { list } });
    harness.coordinator.close();
    const result = await hydratePersistentAppState(harness.service, {
      signal: new AbortController().signal
    });
    expect(result).toMatchObject({ state: "blocked", code: "RHP_STORAGE_UNAVAILABLE" });
    expect(list).not.toHaveBeenCalled();
  });

  it("does not hydrate state written to the synthetic demo database", async () => {
    const factory = new IDBFactory();
    const demoDatabase = createPassportDatabase({ profile: "synthetic-demo", factory });
    await createRepository<{
      id: string;
      schema: string;
      authority: HolderAuthorityView;
    }>(demoDatabase, "settings").put({
      id: APP_VIEW_STATE_ID,
      schema: APP_VIEW_STATE_SCHEMA,
      authority: AUTHORITY
    });
    await createRepository<PrivacyEvent>(demoDatabase, "history").put(HISTORY);
    demoDatabase.close();

    const preview = createHarness({ factory, ownerId: "preview-tab" });
    const result = await hydratePersistentAppState(preview.service, {
      signal: new AbortController().signal
    });
    expect(result).toEqual({ state: "empty", snapshot: emptyAppSnapshot() });
    preview.coordinator.close();
  });
});

function HistoryProbe() {
  const { history, addHistory } = useAppState();
  return <div>
    <p>History count: {history.length}</p>
    <button onClick={() => void addHistory(HISTORY)}>Record history</button>
  </div>;
}

describe("persistent application-state React boundary", () => {
  it("updates component state only after the persistence service commits", async () => {
    const committed = deferred<void>();
    const recordHistory = vi.fn(async () => committed.promise);
    const service: PersistentAppStateService = Object.freeze({
      prepare: async () => ({ state: "ready" as const }),
      load: async () => emptyAppSnapshot(),
      recordHistory,
      saveAuthority: async () => {}
    });
    render(<PersistentAppStateRoot service={service}><HistoryProbe /></PersistentAppStateRoot>);
    expect(await screen.findByText("History count: 0")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Record history" }));
    expect(recordHistory).toHaveBeenCalledWith(HISTORY);
    expect(screen.getByText("History count: 0")).toBeVisible();

    await act(async () => committed.resolve());
    await waitFor(() => expect(screen.getByText("History count: 1")).toBeVisible());
  });
});
