import type { CredentialRecord, HolderAuthorityView, PrivacyEvent } from "../types";
import type { StorageErrorCode } from "../storage/database";

export type AppSnapshot = Readonly<{
  credentials: readonly CredentialRecord[];
  history: readonly PrivacyEvent[];
  authority: HolderAuthorityView | null;
  authorityReady: boolean;
  backupVerified: boolean;
}>;

export type AppStateFailureCode =
  | "RHP_STATE_HYDRATION_FAILED"
  | "RHP_STATE_LOCKED"
  | "RHP_STATE_MIGRATION_BLOCKED"
  | "RHP_STATE_NOT_READY"
  | "RHP_STATE_PORTFOLIO_UNAVAILABLE";

export type AppLifecycleState =
  | Readonly<{ state: "loading" }>
  | Readonly<{ state: "locked"; code: "RHP_STATE_LOCKED"; summary: string }>
  | Readonly<{ state: "empty"; snapshot: AppSnapshot }>
  | Readonly<{ state: "ready"; snapshot: AppSnapshot }>
  | Readonly<{ state: "migrating"; fromVersion: number; toVersion: number }>
  | Readonly<{
    state: "blocked";
    code: StorageErrorCode | "RHP_STATE_MIGRATION_BLOCKED";
    summary: string;
    recoveryActions: readonly string[];
  }>
  | Readonly<{ state: "failed"; code: "RHP_STATE_HYDRATION_FAILED"; summary: string }>;

export function emptyAppSnapshot(): AppSnapshot {
  return Object.freeze({
    credentials: Object.freeze([]),
    history: Object.freeze([]),
    authority: null,
    authorityReady: false,
    backupVerified: false
  });
}

export function loadingAppState(): Extract<AppLifecycleState, { state: "loading" }> {
  return Object.freeze({ state: "loading" });
}

export function isEmptyAppSnapshot(snapshot: AppSnapshot): boolean {
  return snapshot.credentials.length === 0 &&
    snapshot.history.length === 0 &&
    snapshot.authority === null &&
    snapshot.authorityReady === false &&
    snapshot.backupVerified === false;
}

export function stateForSnapshot(snapshot: AppSnapshot): Extract<AppLifecycleState, { state: "empty" | "ready" }> {
  return Object.freeze({ state: isEmptyAppSnapshot(snapshot) ? "empty" : "ready", snapshot });
}

export { AppStateProvider, useAppState } from "./app-state-context";
