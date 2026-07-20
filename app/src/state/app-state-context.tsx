import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEMO_CREDENTIALS, DEMO_HISTORY } from "../demo/demo-fixtures";
import type { CredentialRecord, PrivacyEvent } from "../types";

type State = {
  credentials: CredentialRecord[];
  history: PrivacyEvent[];
  authorityReady: boolean;
  backupVerified: boolean;
  addCredential: (record: CredentialRecord) => void;
  addHistory: (event: PrivacyEvent) => void;
  setAuthorityReady: (ready: boolean) => void;
  setBackupVerified: (ready: boolean) => void;
};

const Context = createContext<State | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState(DEMO_CREDENTIALS);
  const [history, setHistory] = useState(DEMO_HISTORY);
  const [authorityReady, setAuthorityReady] = useState(false);
  const [backupVerified, setBackupVerified] = useState(false);
  const value = useMemo<State>(() => ({ credentials, history, authorityReady, backupVerified, addCredential: record => setCredentials(current => [record, ...current]), addHistory: event => setHistory(current => [event, ...current]), setAuthorityReady, setBackupVerified }), [credentials, history, authorityReady, backupVerified]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState() { const value = useContext(Context); if (!value) throw new Error("AppStateProvider is missing"); return value; }
