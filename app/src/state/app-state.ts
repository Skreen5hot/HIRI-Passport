import type { CredentialRecord, PrivacyEvent } from "../types";
export { AppStateProvider, useAppState } from "./app-state-context";

export type AppSnapshot = Readonly<{
  credentials: CredentialRecord[];
  history: PrivacyEvent[];
  authorityReady: boolean;
  backupVerified: boolean;
}>;

export function emptyAppSnapshot(): AppSnapshot {
  return { credentials: [], history: [], authorityReady: false, backupVerified: false };
}
