import {
  StorageError,
  asStorageError,
  type PassportDatabase,
  type StorageErrorCode,
  type VersionChangeNotice
} from "./database";
import {
  createSensitiveLeaseRepository,
  type AcquireLeaseInput,
  type SensitiveLeaseRepository
} from "./repositories";
import type { StorageProfile } from "./schema";

export type StorageRecoveryAction =
  | "close-other-tabs"
  | "retry"
  | "install-current-reviewed-version"
  | "free-device-storage"
  | "inspect-browser-storage"
  | "export-redacted-diagnostics"
  | "contact-project-support"
  | "acknowledge-possible-local-data-loss";

export type StorageCoordinatorState =
  | "idle"
  | "opening"
  | "ready"
  | "upgrade-blocked"
  | "version-change"
  | "eviction-suspected"
  | "failed"
  | "closed";

export type StorageCoordinatorSnapshot = Readonly<{
  state: StorageCoordinatorState;
  code?: StorageErrorCode;
  summary?: string;
  recoveryActions: readonly StorageRecoveryAction[];
}>;

export type StorageCoordinationMessage = Readonly<{
  type: "storage-version-change";
  profile: StorageProfile;
  targetVersion: number | null;
}>;

export type StorageCoordinationChannel = Readonly<{
  post(message: StorageCoordinationMessage): void;
  subscribe(listener: (message: unknown) => void): () => void;
  close?(): void;
}>;

export type StorageStartExpectation = "first-start-allowed" | "existing-state-required";

export type StorageCoordinatorOptions = Readonly<{
  database: PassportDatabase;
  ownerId: string;
  channel?: StorageCoordinationChannel;
  leases?: SensitiveLeaseRepository;
}>;

const NO_RECOVERY = Object.freeze([] as StorageRecoveryAction[]);

export function recoveryActionsFor(code: StorageErrorCode): readonly StorageRecoveryAction[] {
  switch (code) {
    case "RHP_STORAGE_UPGRADE_BLOCKED":
      return Object.freeze(["close-other-tabs", "retry"]);
    case "RHP_STORAGE_DOWNGRADE_REJECTED":
      return Object.freeze(["install-current-reviewed-version", "export-redacted-diagnostics"]);
    case "RHP_STORAGE_QUOTA_EXCEEDED":
      return Object.freeze(["free-device-storage", "retry", "export-redacted-diagnostics"]);
    case "RHP_STORAGE_EVICTION_SUSPECTED":
      return Object.freeze([
        "inspect-browser-storage",
        "acknowledge-possible-local-data-loss",
        "export-redacted-diagnostics",
        "contact-project-support"
      ]);
    case "RHP_STORAGE_VERSION_CHANGE":
      return Object.freeze(["close-other-tabs", "retry"]);
    case "RHP_STORAGE_CORRUPT":
    case "RHP_STORAGE_PARTIAL_MIGRATION":
      return Object.freeze(["export-redacted-diagnostics", "contact-project-support"]);
    case "RHP_STORAGE_TRANSACTION_ABORTED":
      return Object.freeze(["retry", "export-redacted-diagnostics"]);
    case "RHP_STORAGE_UNAVAILABLE":
      return Object.freeze(["inspect-browser-storage", "retry", "export-redacted-diagnostics"]);
    case "RHP_STORAGE_LEASE_HELD":
      return Object.freeze(["close-other-tabs", "retry"]);
  }
}

function snapshot(state: StorageCoordinatorState, error?: StorageError): StorageCoordinatorSnapshot {
  if (!error) return Object.freeze({ state, recoveryActions: NO_RECOVERY });
  return Object.freeze({
    state,
    code: error.code,
    summary: error.message,
    recoveryActions: recoveryActionsFor(error.code)
  });
}

function validCoordinationMessage(value: unknown, profile: StorageProfile): value is StorageCoordinationMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return Object.keys(message).length === 3 &&
    message.type === "storage-version-change" &&
    message.profile === profile &&
    (message.targetVersion === null || Number.isSafeInteger(message.targetVersion));
}

export class StorageCoordinator {
  readonly database: PassportDatabase;
  readonly ownerId: string;

  #channel?: StorageCoordinationChannel;
  #leases: SensitiveLeaseRepository;
  #unsubscribe: (() => void) | null = null;
  #listeners = new Set<(value: StorageCoordinatorSnapshot) => void>();
  #snapshot = snapshot("idle");
  #activeSensitiveOperations = 0;
  #pendingClose: (() => void) | null = null;
  #evictionLatched = false;

  constructor(options: StorageCoordinatorOptions) {
    if (!options.ownerId || options.ownerId.length > 256) throw new TypeError("storage coordinator owner is invalid");
    this.database = options.database;
    this.ownerId = options.ownerId;
    this.#channel = options.channel;
    this.#leases = options.leases ?? createSensitiveLeaseRepository(options.database);
    this.database.setVersionChangeHandler(notice => this.#handleVersionChange(notice));
    if (this.#channel) {
      this.#unsubscribe = this.#channel.subscribe(message => {
        if (validCoordinationMessage(message, this.database.profile)) {
          this.#handleVersionChange({
            oldVersion: this.database.version,
            newVersion: message.targetVersion,
            close: () => this.database.close()
          });
        }
      });
    }
  }

  get current(): StorageCoordinatorSnapshot {
    return this.#snapshot;
  }

  subscribe(listener: (value: StorageCoordinatorSnapshot) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#snapshot);
    return () => this.#listeners.delete(listener);
  }

  async start(expectation: StorageStartExpectation = "first-start-allowed"): Promise<StorageCoordinatorSnapshot> {
    if (this.#snapshot.state === "closed") return this.#snapshot;
    if (this.#evictionLatched) return this.#snapshot;
    this.#set(snapshot("opening"));
    try {
      await this.database.open();
      if (expectation === "existing-state-required" && this.database.lastOpenCreatedDatabase) {
        this.#evictionLatched = true;
        this.database.close();
        this.#set(snapshot("eviction-suspected", new StorageError("RHP_STORAGE_EVICTION_SUSPECTED")));
        return this.#snapshot;
      }
      this.#set(snapshot("ready"));
    } catch (error) {
      const storageError = asStorageError(error);
      this.#set(snapshot(
        storageError.code === "RHP_STORAGE_UPGRADE_BLOCKED" ? "upgrade-blocked" : "failed",
        storageError
      ));
    }
    return this.#snapshot;
  }

  async runSensitiveOperation<Result>(
    lease: Omit<AcquireLeaseInput, "ownerId">,
    operation: () => Result | Promise<Result>
  ): Promise<Result> {
    if (this.#snapshot.state !== "ready") {
      throw new StorageError(this.#snapshot.code ?? "RHP_STORAGE_UNAVAILABLE");
    }

    this.#activeSensitiveOperations += 1;
    let acquired: Awaited<ReturnType<SensitiveLeaseRepository["acquire"]>> | undefined;
    try {
      acquired = await this.#leases.acquire({ ...lease, ownerId: this.ownerId });
      if (this.#snapshot.state !== "ready") throw new StorageError("RHP_STORAGE_VERSION_CHANGE");
      return await operation();
    } catch (error) {
      if (error instanceof StorageError) {
        if (error.code === "RHP_STORAGE_QUOTA_EXCEEDED") this.#set(snapshot("failed", error));
        throw error;
      }
      // Domain cancellation, authentication, and cryptographic failures retain
      // their own typed semantics; the coordinator does not relabel them.
      throw error;
    } finally {
      if (acquired) {
        try {
          await this.#leases.release(acquired);
        } catch {
          // The bounded lease expires. Never reopen or reset state as cleanup.
        }
      }
      this.#activeSensitiveOperations -= 1;
      if (this.#activeSensitiveOperations === 0 && this.#pendingClose) {
        const close = this.#pendingClose;
        this.#pendingClose = null;
        close();
      }
    }
  }

  reportEvictionSignal(): StorageCoordinatorSnapshot {
    if (this.#snapshot.state === "closed") return this.#snapshot;
    this.#evictionLatched = true;
    this.#set(snapshot("eviction-suspected", new StorageError("RHP_STORAGE_EVICTION_SUSPECTED")));
    const close = () => this.database.close();
    if (this.#activeSensitiveOperations === 0) close();
    else this.#pendingClose = close;
    return this.#snapshot;
  }

  close(): void {
    this.database.setVersionChangeHandler(null);
    this.database.close();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#channel?.close?.();
    this.#set(snapshot("closed"));
  }

  #handleVersionChange(notice: VersionChangeNotice): void {
    if (this.#snapshot.state === "closed" || this.#snapshot.state === "version-change") return;
    const error = new StorageError("RHP_STORAGE_VERSION_CHANGE");
    this.#set(snapshot("version-change", error));
    this.#channel?.post(Object.freeze({
      type: "storage-version-change",
      profile: this.database.profile,
      targetVersion: notice.newVersion
    }));
    if (this.#activeSensitiveOperations === 0) notice.close();
    else this.#pendingClose = notice.close;
  }

  #set(value: StorageCoordinatorSnapshot): void {
    this.#snapshot = value;
    for (const listener of this.#listeners) listener(value);
  }
}

export function createStorageCoordinator(options: StorageCoordinatorOptions): StorageCoordinator {
  return new StorageCoordinator(options);
}

export function createBrowserStorageChannel(profile: StorageProfile): StorageCoordinationChannel | undefined {
  if (typeof BroadcastChannel !== "function") return undefined;
  const channel = new BroadcastChannel(`hiri-passport:${profile}:storage-lifecycle`);
  return Object.freeze({
    post: (message: StorageCoordinationMessage) => channel.postMessage(message),
    subscribe: (listener: (message: unknown) => void) => {
      const receive = (event: MessageEvent<unknown>) => listener(event.data);
      channel.addEventListener("message", receive);
      return () => channel.removeEventListener("message", receive);
    },
    close: () => channel.close()
  });
}
