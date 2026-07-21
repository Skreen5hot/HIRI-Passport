import { useEffect, useState, type ReactNode } from "react";
import { AppStateProvider } from "./app-state-context";
import { loadingAppState, type AppLifecycleState } from "./app-state";
import {
  hydratePersistentAppState,
  type PersistentAppStateService
} from "./state-hydration";

export { AppStateProvider, useAppState } from "./app-state-context";

export function AppStateStatusView({ state }: { state: Exclude<AppLifecycleState, { state: "empty" | "ready" }> }) {
  if (state.state === "loading") {
    return <main id="main-content" className="shell-content" tabIndex={-1}>
      <section className="panel stack" role="status" aria-live="polite" data-app-state="loading">
        <p className="eyebrow">Protected local state</p>
        <h1>Opening your local preview…</h1>
        <p>No authority or portfolio result is shown until local state checks complete.</p>
      </section>
    </main>;
  }
  if (state.state === "migrating") {
    return <main id="main-content" className="shell-content" tabIndex={-1}>
      <section className="panel stack" role="status" aria-live="polite" data-app-state="migrating">
        <p className="eyebrow">Protected local state</p>
        <h1>Updating local state…</h1>
        <p>Holder workflows remain unavailable until the reviewed migration completes.</p>
      </section>
    </main>;
  }

  const locked = state.state === "locked";
  return <main id="main-content" className="shell-content" tabIndex={-1}>
    <section className="panel stack" role="alert" data-app-state={state.state} data-state-code={state.code}>
      <p className="eyebrow">{locked ? "Local state locked" : "Inspect-only boundary"}</p>
      <h1>{locked ? "Unlock is required on this device." : "Local holder state is unavailable."}</h1>
      <p>{state.summary}</p>
      {state.state === "failed" && <p>No local data was reset. Holder workflows remain blocked.</p>}
      {state.state === "blocked" && state.recoveryActions.length > 0 &&
        <p>Review the browser storage condition before retrying. Do not clear site data as a troubleshooting shortcut.</p>}
      <p className="technical">Code: {state.code}</p>
    </section>
  </main>;
}

export function PersistentAppStateRoot({
  service,
  children
}: Readonly<{ service: PersistentAppStateService; children: ReactNode }>) {
  const [state, setState] = useState<AppLifecycleState>(loadingAppState);
  useEffect(() => {
    const controller = new AbortController();
    void hydratePersistentAppState(service, {
      signal: controller.signal,
      onState: next => {
        if (!controller.signal.aborted) setState(next);
      }
    }).catch(error => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState(Object.freeze({
          state: "failed",
          code: "RHP_STATE_HYDRATION_FAILED",
          summary: "Local holder state could not be loaded. No local data was reset."
        }));
      }
    });
    return () => controller.abort();
  }, [service]);

  if (state.state !== "empty" && state.state !== "ready") return <AppStateStatusView state={state} />;
  return <AppStateProvider
    mode="real-holder-preview"
    lifecycle={state.state}
    initialSnapshot={state.snapshot}
    persistence={service}
  >{children}</AppStateProvider>;
}
