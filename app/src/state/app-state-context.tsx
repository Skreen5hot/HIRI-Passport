import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { emptyAppSnapshot, type AppSnapshot } from "./app-state";
import type { CredentialRecord, HolderAuthorityView, PrivacyEvent } from "../types";

export type AppStatePersistence = Readonly<{
  saveCredential?(record: CredentialRecord): Promise<void>;
  recordHistory(event: PrivacyEvent): Promise<void>;
  saveAuthority(authority: HolderAuthorityView | null): Promise<void>;
}>;

export type AppStateContextValue = Readonly<{
  mode: "synthetic-demo" | "real-holder-preview";
  lifecycle: "empty" | "ready";
  credentials: readonly CredentialRecord[];
  history: readonly PrivacyEvent[];
  authority: HolderAuthorityView | null;
  authorityReady: boolean;
  backupVerified: boolean;
  addCredential(record: CredentialRecord): Promise<void>;
  addHistory(event: PrivacyEvent): Promise<void>;
  setAuthority(authority: HolderAuthorityView | null): Promise<void>;
  setAuthorityReady(ready: boolean): void;
  setBackupVerified(ready: boolean): void;
}>;

const Context = createContext<AppStateContextValue | null>(null);

export type AppStateProviderProps = Readonly<{
  children: ReactNode;
  mode?: "synthetic-demo" | "real-holder-preview";
  lifecycle?: "empty" | "ready";
  initialSnapshot?: AppSnapshot;
  persistence?: AppStatePersistence;
}>;

export function AppStateProvider({
  children,
  mode = "synthetic-demo",
  lifecycle: initialLifecycle = "empty",
  initialSnapshot = emptyAppSnapshot(),
  persistence
}: AppStateProviderProps) {
  if (mode === "real-holder-preview" && !persistence) {
    throw new Error("Real Holder Preview state requires persistence services.");
  }

  const [credentials, setCredentials] = useState(initialSnapshot.credentials);
  const [history, setHistory] = useState(initialSnapshot.history);
  const [authority, setAuthorityValue] = useState(initialSnapshot.authority);
  const [authorityReady, setAuthorityReadyValue] = useState(initialSnapshot.authorityReady);
  const [backupVerified, setBackupVerifiedValue] = useState(initialSnapshot.backupVerified);
  const [lifecycle, setLifecycle] = useState<"empty" | "ready">(initialLifecycle);

  const value = useMemo<AppStateContextValue>(() => Object.freeze({
    mode,
    lifecycle,
    credentials,
    history,
    authority,
    authorityReady,
    backupVerified,
    addCredential: async (record: CredentialRecord) => {
      if (persistence) {
        if (!persistence.saveCredential) throw new Error("Encrypted portfolio persistence is unavailable.");
        await persistence.saveCredential(record);
      }
      setCredentials(current => Object.freeze([record, ...current.filter(item => item.recordId !== record.recordId)]));
      setLifecycle("ready");
    },
    addHistory: async (event: PrivacyEvent) => {
      if (persistence) await persistence.recordHistory(event);
      setHistory(current => Object.freeze([event, ...current.filter(item => item.id !== event.id)]));
      setLifecycle("ready");
    },
    setAuthority: async (next: HolderAuthorityView | null) => {
      if (persistence) await persistence.saveAuthority(next);
      setAuthorityValue(next);
      setAuthorityReadyValue(next !== null);
      setLifecycle(next === null && credentials.length === 0 && history.length === 0 ? "empty" : "ready");
    },
    setAuthorityReady: (ready: boolean) => {
      if (mode !== "synthetic-demo") throw new Error("Preview authority state requires an authority service result.");
      setAuthorityReadyValue(ready);
      if (ready) setLifecycle("ready");
    },
    setBackupVerified: (ready: boolean) => {
      if (mode !== "synthetic-demo") throw new Error("Backup state is unavailable in Real Holder Preview.");
      setBackupVerifiedValue(ready);
      if (ready) setLifecycle("ready");
    }
  }), [
    authority,
    authorityReady,
    backupVerified,
    credentials,
    history,
    lifecycle,
    mode,
    persistence
  ]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("AppStateProvider is missing");
  return value;
}
