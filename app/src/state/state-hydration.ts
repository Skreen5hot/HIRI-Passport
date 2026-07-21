import {
  type PassportDatabase,
  type StorageErrorCode
} from "../storage/database";
import { createRepository } from "../storage/repositories";
import type { StorageCoordinator, StorageStartExpectation } from "../storage/storage-coordinator";
import type { CredentialRecord, HolderAuthorityView, PrivacyEvent } from "../types";
import {
  stateForSnapshot,
  type AppLifecycleState,
  type AppSnapshot
} from "./app-state";
import type { AppStatePersistence } from "./app-state-context";

export const APP_VIEW_STATE_ID = "app:holder-view-state";
export const APP_VIEW_STATE_SCHEMA = "hiri-passport/app-view-state/1";

export class AppStatePersistenceError extends Error {
  readonly code: "RHP_STATE_NOT_READY" | "RHP_STATE_PORTFOLIO_UNAVAILABLE";

  constructor(code: AppStatePersistenceError["code"]) {
    super(code === "RHP_STATE_NOT_READY"
      ? "Persistent application state has not completed hydration."
      : "Encrypted portfolio persistence is unavailable.");
    this.name = "AppStatePersistenceError";
    this.code = code;
  }
}

export type StoredAppViewState = Readonly<{
  id: typeof APP_VIEW_STATE_ID;
  schema: typeof APP_VIEW_STATE_SCHEMA;
  authority: HolderAuthorityView | null;
}>;

export type AppStateAccessPort = Readonly<{
  inspect(signal: AbortSignal): Promise<"locked" | "unlocked">;
}>;

export type AppStateCredentialSource = Readonly<{
  list(signal: AbortSignal): Promise<unknown>;
  save?(record: CredentialRecord): Promise<void>;
}>;

export type AppStateMigrationTask = Readonly<{
  fromVersion: number;
  toVersion: number;
  run(signal: AbortSignal): Promise<void>;
}>;

export type AppStateMigrationPort = Readonly<{
  pending(signal: AbortSignal): Promise<AppStateMigrationTask | null>;
}>;

export type StatePreparation =
  | Readonly<{ state: "ready" }>
  | Readonly<{ state: "locked"; code: "RHP_STATE_LOCKED"; summary: string }>
  | Readonly<{
    state: "blocked";
    code: StorageErrorCode | "RHP_STATE_MIGRATION_BLOCKED";
    summary: string;
    recoveryActions: readonly string[];
  }>
  | Readonly<{
    state: "migrating";
    fromVersion: number;
    toVersion: number;
    complete(signal: AbortSignal): Promise<StatePreparation>;
  }>;

export type PersistentAppStateService = AppStatePersistence & Readonly<{
  prepare(signal: AbortSignal): Promise<StatePreparation>;
  load(signal: AbortSignal): Promise<AppSnapshot>;
}>;

export type IndexedDbAppStateOptions = Readonly<{
  database: PassportDatabase;
  coordinator: StorageCoordinator;
  access: AppStateAccessPort;
  expectation?: StorageStartExpectation;
  credentials?: AppStateCredentialSource;
  migrations?: AppStateMigrationPort;
}>;

const EMPTY_CREDENTIAL_SOURCE: AppStateCredentialSource = Object.freeze({
  list: async () => Object.freeze([])
});

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const PROTOCOL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function cancelled(): DOMException {
  return new DOMException("Application-state hydration was cancelled.", "AbortError");
}

function checkCancellation(signal: AbortSignal): void {
  if (signal.aborted) throw cancelled();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function boundedString(value: unknown, maximum = 4096): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum;
}

function validProtocolTime(value: unknown): value is string {
  if (typeof value !== "string" || !PROTOCOL_TIME_PATTERN.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().replace(".000Z", "Z") === value;
}

function validateAuthority(value: unknown): HolderAuthorityView {
  if (!isRecord(value) || !hasExactKeys(value, ["authority", "activeMethodId", "createdAt", "lifecycle"])) {
    throw new TypeError("invalid holder authority view state");
  }
  if (!boundedString(value.authority, 1024) ||
    !boundedString(value.activeMethodId, 1024) ||
    !validProtocolTime(value.createdAt) ||
    !["active", "compromised", "abandoned"].includes(String(value.lifecycle))) {
    throw new TypeError("invalid holder authority view state");
  }
  return Object.freeze({
    authority: value.authority,
    activeMethodId: value.activeMethodId,
    createdAt: value.createdAt,
    lifecycle: value.lifecycle as HolderAuthorityView["lifecycle"]
  });
}

function validateCredential(value: unknown): CredentialRecord {
  const keys = [
    "claims", "contentHash", "credentialType", "cryptography", "issuer", "issuerIdentity",
    "manifestHash", "policy", "provenance", "publicContent", "recordId", "schema", "schemaHash",
    "status", "title", "updatedAt"
  ] as const;
  if (!isRecord(value) || !hasExactKeys(value, keys)) throw new TypeError("invalid local credential view state");
  if (!boundedString(value.recordId, 256) ||
    !boundedString(value.title, 512) ||
    !boundedString(value.issuer, 1024) ||
    !boundedString(value.credentialType, 256) ||
    value.provenance !== "self-asserted-persistent" ||
    !["active", "suspended", "revoked", "expired", "superseded", "unknown"].includes(String(value.status)) ||
    !["valid", "invalid", "unknown", "not-applicable"].includes(String(value.cryptography)) ||
    !["valid", "invalid", "unknown", "not-applicable"].includes(String(value.issuerIdentity)) ||
    !["accepted", "rejected", "not-evaluated"].includes(String(value.policy)) ||
    !validProtocolTime(value.updatedAt) ||
    typeof value.publicContent !== "boolean" ||
    !isRecord(value.claims) ||
    !boundedString(value.schema, 2048) ||
    typeof value.manifestHash !== "string" || !HASH_PATTERN.test(value.manifestHash) ||
    typeof value.contentHash !== "string" || !HASH_PATTERN.test(value.contentHash) ||
    typeof value.schemaHash !== "string" || !HASH_PATTERN.test(value.schemaHash)) {
    throw new TypeError("invalid local credential view state");
  }
  const claimEntries = Object.entries(value.claims);
  if (claimEntries.length > 64 || claimEntries.some(([name, claim]) => !boundedString(name, 256) || !boundedString(claim, 8192))) {
    throw new TypeError("invalid local credential view state");
  }
  return Object.freeze({
    recordId: value.recordId,
    title: value.title,
    issuer: value.issuer,
    credentialType: value.credentialType,
    provenance: value.provenance,
    status: value.status as CredentialRecord["status"],
    cryptography: value.cryptography as CredentialRecord["cryptography"],
    issuerIdentity: value.issuerIdentity as CredentialRecord["issuerIdentity"],
    policy: value.policy as CredentialRecord["policy"],
    updatedAt: value.updatedAt,
    publicContent: value.publicContent,
    claims: Object.freeze(Object.fromEntries(claimEntries) as Record<string, string>),
    manifestHash: value.manifestHash,
    contentHash: value.contentHash,
    schema: value.schema,
    schemaHash: value.schemaHash
  });
}

function validatePrivacyEvent(value: unknown): PrivacyEvent {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "verifier", "purpose", "disclosed", "at", "delivery"])) {
    throw new TypeError("invalid local privacy history state");
  }
  if (!boundedString(value.id, 256) ||
    !boundedString(value.verifier, 1024) ||
    !boundedString(value.purpose, 4096) ||
    !Array.isArray(value.disclosed) ||
    value.disclosed.length > 256 ||
    value.disclosed.some(item => !boundedString(item, 512)) ||
    !validProtocolTime(value.at) ||
    !["delivered", "pending", "failed"].includes(String(value.delivery))) {
    throw new TypeError("invalid local privacy history state");
  }
  return Object.freeze({
    id: value.id,
    verifier: value.verifier,
    purpose: value.purpose,
    disclosed: Object.freeze([...value.disclosed]) as readonly string[],
    at: value.at,
    delivery: value.delivery as PrivacyEvent["delivery"]
  });
}

export function validateAppViewState(value: unknown): StoredAppViewState | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) ||
    !hasExactKeys(value, ["id", "schema", "authority"]) ||
    value.id !== APP_VIEW_STATE_ID ||
    value.schema !== APP_VIEW_STATE_SCHEMA) {
    throw new TypeError("invalid application view state");
  }
  return Object.freeze({
    id: APP_VIEW_STATE_ID,
    schema: APP_VIEW_STATE_SCHEMA,
    authority: value.authority === null ? null : validateAuthority(value.authority)
  });
}

export function createAppViewStateRecord(authority: HolderAuthorityView | null): StoredAppViewState {
  return Object.freeze({
    id: APP_VIEW_STATE_ID,
    schema: APP_VIEW_STATE_SCHEMA,
    authority: authority === null ? null : validateAuthority(authority)
  });
}

function duplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function blockedPreparation(input: Readonly<{
  code?: StorageErrorCode;
  summary?: string;
  recoveryActions: readonly string[];
}>): Extract<StatePreparation, { state: "blocked" }> {
  return Object.freeze({
    state: "blocked",
    code: input.code ?? "RHP_STORAGE_UNAVAILABLE",
    summary: input.summary ?? "Protected local state is unavailable.",
    recoveryActions: Object.freeze([...input.recoveryActions])
  });
}

export function createIndexedDbAppStateService(options: IndexedDbAppStateOptions): PersistentAppStateService {
  if (options.database.profile !== "real-holder-preview") {
    throw new TypeError("Persistent preview state requires the dedicated Real Holder Preview database.");
  }
  if (options.coordinator.database !== options.database) {
    throw new TypeError("Storage coordinator and application state must share one database boundary.");
  }

  const credentials = options.credentials ?? EMPTY_CREDENTIAL_SOURCE;
  const viewState = createRepository<StoredAppViewState>(options.database, "settings");
  const history = createRepository<PrivacyEvent>(options.database, "history");
  let readsEnabled = false;
  let mutationsEnabled = false;

  const enableReads = (): StatePreparation => {
    readsEnabled = true;
    return Object.freeze({ state: "ready" });
  };

  const requireMutationsEnabled = (): void => {
    if (!mutationsEnabled) throw new AppStatePersistenceError("RHP_STATE_NOT_READY");
  };

  const prepareReady = async (signal: AbortSignal): Promise<StatePreparation> => {
    checkCancellation(signal);
    const access = await options.access.inspect(signal);
    checkCancellation(signal);
    if (access === "locked") {
      return Object.freeze({
        state: "locked",
        code: "RHP_STATE_LOCKED",
        summary: "Local holder state is locked on this device."
      });
    }
    if (access !== "unlocked") throw new TypeError("invalid application-state access result");

    const migration = await options.migrations?.pending(signal) ?? null;
    checkCancellation(signal);
    if (!migration) return enableReads();
    if (!Number.isSafeInteger(migration.fromVersion) ||
      !Number.isSafeInteger(migration.toVersion) ||
      migration.fromVersion < 0 ||
      migration.toVersion <= migration.fromVersion) {
      return Object.freeze({
        state: "blocked",
        code: "RHP_STATE_MIGRATION_BLOCKED",
        summary: "Local application state requires an unsupported migration.",
        recoveryActions: Object.freeze(["export-redacted-diagnostics", "contact-project-support"])
      });
    }
    return Object.freeze({
      state: "migrating",
      fromVersion: migration.fromVersion,
      toVersion: migration.toVersion,
      complete: async (migrationSignal: AbortSignal): Promise<StatePreparation> => {
        checkCancellation(migrationSignal);
        await migration.run(migrationSignal);
        checkCancellation(migrationSignal);
        return enableReads();
      }
    });
  };

  return Object.freeze({
    prepare: async (signal: AbortSignal): Promise<StatePreparation> => {
      readsEnabled = false;
      mutationsEnabled = false;
      checkCancellation(signal);
      const storage = await options.coordinator.start(options.expectation ?? "first-start-allowed");
      checkCancellation(signal);
      if (storage.state !== "ready") return blockedPreparation(storage);
      return prepareReady(signal);
    },
    load: async (signal: AbortSignal): Promise<AppSnapshot> => {
      if (!readsEnabled) throw new AppStatePersistenceError("RHP_STATE_NOT_READY");
      checkCancellation(signal);
      const [rawCredentials, rawHistory, rawViewState] = await Promise.all([
        credentials.list(signal),
        history.all(),
        viewState.get(APP_VIEW_STATE_ID)
      ]);
      checkCancellation(signal);
      if (!Array.isArray(rawCredentials) || rawCredentials.length > 1000 || rawHistory.length > 10_000) {
        throw new TypeError("invalid application state collection");
      }
      const credentialValues = Object.freeze(rawCredentials.map(validateCredential));
      const historyValues = Object.freeze(rawHistory.map(validatePrivacyEvent));
      if (duplicate(credentialValues.map(value => value.recordId)) || duplicate(historyValues.map(value => value.id))) {
        throw new TypeError("duplicate application state identifiers");
      }
      const storedView = validateAppViewState(rawViewState);
      const authority = storedView?.authority ?? null;
      const snapshot = Object.freeze({
        credentials: credentialValues,
        history: historyValues,
        authority,
        authorityReady: authority !== null,
        backupVerified: false
      });
      mutationsEnabled = true;
      return snapshot;
    },
    saveCredential: async (record: CredentialRecord): Promise<void> => {
      requireMutationsEnabled();
      const validated = validateCredential(record);
      if (!credentials.save) {
        throw new AppStatePersistenceError("RHP_STATE_PORTFOLIO_UNAVAILABLE");
      }
      await credentials.save(validated);
    },
    recordHistory: async (event: PrivacyEvent): Promise<void> => {
      requireMutationsEnabled();
      await history.put(validatePrivacyEvent(event));
    },
    saveAuthority: async (authority: HolderAuthorityView | null): Promise<void> => {
      requireMutationsEnabled();
      await viewState.put(createAppViewStateRecord(authority));
    }
  });
}

export type HydrateAppStateOptions = Readonly<{
  signal: AbortSignal;
  onState?(state: AppLifecycleState): void;
}>;

export async function hydratePersistentAppState(
  service: PersistentAppStateService,
  options: HydrateAppStateOptions
): Promise<AppLifecycleState> {
  const publish = (state: AppLifecycleState): AppLifecycleState => {
    options.onState?.(state);
    return state;
  };
  publish(Object.freeze({ state: "loading" }));
  try {
    checkCancellation(options.signal);
    let preparation = await service.prepare(options.signal);
    checkCancellation(options.signal);
    while (preparation.state === "migrating") {
      publish(Object.freeze({
        state: "migrating",
        fromVersion: preparation.fromVersion,
        toVersion: preparation.toVersion
      }));
      preparation = await preparation.complete(options.signal);
      checkCancellation(options.signal);
    }
    if (preparation.state === "locked" || preparation.state === "blocked") return publish(preparation);
    const snapshot = await service.load(options.signal);
    checkCancellation(options.signal);
    return publish(stateForSnapshot(snapshot));
  } catch (error) {
    if (options.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) throw cancelled();
    const failed = Object.freeze({
      state: "failed",
      code: "RHP_STATE_HYDRATION_FAILED",
      summary: "Local holder state could not be loaded. No local data was reset."
    } as const);
    return publish(failed);
  }
}

export function isPersistentAppStateService(value: unknown): value is PersistentAppStateService {
  if (!isRecord(value)) return false;
  return typeof value.prepare === "function" &&
    typeof value.load === "function" &&
    typeof value.recordHistory === "function" &&
    typeof value.saveAuthority === "function";
}
