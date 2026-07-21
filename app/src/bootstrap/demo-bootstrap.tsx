import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoApp } from "../app";
import { assertSyntheticDemoBuild } from "../demo/demo-gate";
import { DEMO_CREDENTIALS, DEMO_HISTORY } from "../demo/demo-fixtures";
import { AppStateProvider } from "../state/app-state";

const DEMO_INITIAL_STATE = Object.freeze({
  credentials: Object.freeze([...DEMO_CREDENTIALS]),
  history: Object.freeze([...DEMO_HISTORY]),
  authority: null,
  authorityReady: false,
  backupVerified: false
});

export function startApplication(): void {
  assertSyntheticDemoBuild();
  const root = document.getElementById("root");
  if (!root) throw new Error("application root is missing");
  createRoot(root).render(
    <StrictMode>
      <AppStateProvider mode="synthetic-demo" lifecycle="ready" initialSnapshot={DEMO_INITIAL_STATE}>
        <DemoApp />
      </AppStateProvider>
    </StrictMode>
  );
}
