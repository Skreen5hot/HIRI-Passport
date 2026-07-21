import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { assertRuntimeMode } from "../config/runtime-mode";
import type { RuntimeConfig } from "../config/runtime-config";
import { OriginBlockedRoute } from "../routes/origin-blocked";
import { RealHolderOnboardingFlow } from "../routes/onboarding/holder-onboarding";
import type { LocalAuthentication } from "../adapters/local-auth";
import type { OnboardingService } from "../services/onboarding-service";
import { loadingAppState } from "../state/app-state";
import { AppStateStatusView, PersistentAppStateRoot } from "../state/app-state.tsx";
import { useAppState } from "../state/app-state-context";
import {
  isPersistentAppStateService,
  type PersistentAppStateService
} from "../state/state-hydration";
import {
  captureBrowserOriginContext,
  evaluateOriginPolicy,
  type BlockedOriginDecision,
  type OriginContext,
  type OriginPolicyDecision
} from "../security/origin-policy";

export type PreviewSensitivePorts = Readonly<{
  storage: PersistentAppStateService;
  cryptography: unknown;
  resolver: unknown;
  resources: unknown;
  identity: unknown;
  policy: unknown;
  randomness: unknown;
  transport: unknown;
  onboarding: OnboardingService;
  authentication: LocalAuthentication;
  currentStateHash(): string;
}>;

export type PreviewBootstrapPorts = Readonly<{
  loadRuntimeConfig(): Promise<unknown>;
  clock: Readonly<{ now(): string }>;
  captureOriginContext(): OriginContext;
  profile: "production" | "automated-test";
  automatedTest?: Readonly<{
    expectedOrigin: string;
    stateKind: "generated-non-authoritative";
  }>;
  createSensitivePorts(config: RuntimeConfig): PreviewSensitivePorts;
}>;

export type PreviewBootstrapFailureCode =
  | "RHP_BOOTSTRAP_CONFIG_LOAD_FAILED"
  | "RHP_BOOTSTRAP_CONTEXT_FAILED"
  | "RHP_BOOTSTRAP_PORTS_FAILED"
  | "RHP_BOOTSTRAP_STATE_FAILED";

export type PreviewBootstrapResult =
  | Readonly<{ state: "blocked"; decision: BlockedOriginDecision }>
  | Readonly<{ state: "automated-test-only"; decision: Extract<OriginPolicyDecision, { disposition: "automated-test-only" }> }>
  | Readonly<{ state: "failed"; code: PreviewBootstrapFailureCode }>
  | Readonly<{
      state: "ready";
      runtimeConfig: RuntimeConfig;
      stateService: PersistentAppStateService;
      onboarding: OnboardingService;
      authentication: LocalAuthentication;
      currentStateHash(): string;
    }>;

const SENSITIVE_PORT_MEMBERS = [
  "storage",
  "cryptography",
  "resolver",
  "resources",
  "identity",
  "policy",
  "randomness",
  "transport",
  "onboarding",
  "authentication",
  "currentStateHash"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateSensitivePorts(value: unknown): asserts value is PreviewSensitivePorts {
  if (!isRecord(value)) throw new TypeError("preview sensitive ports are unavailable");
  const keys = Object.keys(value);
  if (
    keys.length !== SENSITIVE_PORT_MEMBERS.length ||
    SENSITIVE_PORT_MEMBERS.some(member => !Object.hasOwn(value, member)) ||
    !isPersistentAppStateService(value.storage) ||
    !isRecord(value.onboarding) ||
    typeof value.onboarding.inspect !== "function" ||
    typeof value.onboarding.prepareStorage !== "function" ||
    typeof value.onboarding.complete !== "function" ||
    !isRecord(value.authentication) ||
    typeof value.authentication.inspect !== "function" ||
    typeof value.authentication.enroll !== "function" ||
    typeof value.authentication.authorize !== "function" ||
    typeof value.authentication.invalidate !== "function" ||
    typeof value.authentication.dispose !== "function" ||
    typeof value.currentStateHash !== "function"
  ) throw new TypeError("preview sensitive ports are incomplete");
}

/**
 * Orders startup so configuration and origin checks complete before the first
 * sensitive factory or storage call. Failures return stable, secret-free state;
 * this function never resets or deletes local data.
 */
export async function preparePreviewBootstrap(ports: PreviewBootstrapPorts): Promise<PreviewBootstrapResult> {
  let runtimeConfig: unknown;
  try {
    runtimeConfig = await ports.loadRuntimeConfig();
  } catch {
    return Object.freeze({ state: "failed", code: "RHP_BOOTSTRAP_CONFIG_LOAD_FAILED" });
  }

  let now: string;
  let context: OriginContext;
  try {
    now = ports.clock.now();
    context = ports.captureOriginContext();
  } catch {
    return Object.freeze({ state: "failed", code: "RHP_BOOTSTRAP_CONTEXT_FAILED" });
  }

  const decision = evaluateOriginPolicy({
    runtimeConfig,
    now,
    context,
    profile: ports.profile,
    ...(ports.automatedTest ? { automatedTest: ports.automatedTest } : {})
  });
  if (decision.disposition === "blocked") return Object.freeze({ state: "blocked", decision });
  if (decision.disposition === "automated-test-only") {
    return Object.freeze({ state: "automated-test-only", decision });
  }

  let sensitivePorts: PreviewSensitivePorts;
  try {
    sensitivePorts = ports.createSensitivePorts(decision.runtimeConfig);
    validateSensitivePorts(sensitivePorts);
  } catch {
    return Object.freeze({ state: "failed", code: "RHP_BOOTSTRAP_PORTS_FAILED" });
  }

  return Object.freeze({
    state: "ready",
    runtimeConfig: decision.runtimeConfig,
    stateService: sensitivePorts.storage,
    onboarding: sensitivePorts.onboarding,
    authentication: sensitivePorts.authentication,
    currentStateHash: sensitivePorts.currentStateHash
  });
}

function browserProtocolTime(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

export function createInertPreviewBootstrapPorts(): PreviewBootstrapPorts {
  return Object.freeze({
    loadRuntimeConfig: async () => undefined,
    clock: Object.freeze({ now: browserProtocolTime }),
    captureOriginContext: () => captureBrowserOriginContext(window, import.meta.env.BASE_URL),
    profile: "production",
    createSensitivePorts: () => {
      throw new Error("No approved Real Holder Preview runtime profile is packaged.");
    }
  });
}

export function PreviewBootstrapFailure({ code }: { code: PreviewBootstrapFailureCode | "RHP_BOOTSTRAP_TEST_ONLY" }) {
  return <main id="main-content" className="shell-content" tabIndex={-1}>
    <section className="panel stack" role="alert" data-bootstrap-failure={code}>
      <p className="eyebrow">Inspect-only boundary</p>
      <h1>Real Holder Preview could not start.</h1>
      <p className="lede">The startup checks did not complete. No holder workflow is available.</p>
      <p>No local data was reset. Reload only after the public configuration or browser context has been corrected.</p>
      <a className="button secondary" href="/preview/">Read preview limitations</a>
    </section>
  </main>;
}

function PreviewPersistentApp({ onboarding, authentication, currentStateHash }: Readonly<{
  onboarding: OnboardingService;
  authentication: LocalAuthentication;
  currentStateHash(): string;
}>) {
  const state = useAppState();
  const empty = state.lifecycle === "empty";
  if (empty) return <main id="main-content" className="shell-content" tabIndex={-1}>
    <RealHolderOnboardingFlow
      service={onboarding}
      authentication={authentication}
      stateHash={currentStateHash()}
      onComplete={() => window.location.reload()}
    />
  </main>;
  return <main id="main-content" className="shell-content" tabIndex={-1}>
    <section className="panel stack" data-preview-state={state.lifecycle}>
      <p className="eyebrow">Real Holder Preview</p>
      <h1>{empty ? "Your local preview is empty." : "Your local preview is ready."}</h1>
      <p className="lede">{empty
        ? "No authority, credentials, or disclosure history exists on this first start."
        : "Protected holder-local state passed startup and migration checks."}</p>
      <p className="technical">Credentials: {state.credentials.length} · History: {state.history.length} · Authority: {state.authority ? "present" : "not created"}</p>
    </section>
  </main>;
}

export async function startApplication(): Promise<void> {
  assertRuntimeMode("real-holder-preview");
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("application root is missing");

  const root = createRoot(rootElement);
  root.render(<StrictMode><AppStateStatusView state={loadingAppState()} /></StrictMode>);
  const result = await preparePreviewBootstrap(createInertPreviewBootstrapPorts());
  document.documentElement.dataset.hiriRuntimeMode = "real-holder-preview";
  document.title = "Real Holder Preview · HIRI Passport";
  root.render(<StrictMode>{
    result.state === "blocked" ? <OriginBlockedRoute decision={result.decision} />
      : result.state === "ready"
        ? <PersistentAppStateRoot service={result.stateService}><PreviewPersistentApp
            onboarding={result.onboarding}
            authentication={result.authentication}
            currentStateHash={result.currentStateHash}
          /></PersistentAppStateRoot>
        : <PreviewBootstrapFailure code={result.state === "failed" ? result.code : "RHP_BOOTSTRAP_TEST_ONLY"} />
  }</StrictMode>);
}
