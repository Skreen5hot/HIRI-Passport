// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  RHP_CANONICAL_ORIGIN,
  RHP_RELEASE_ID,
  RUNTIME_CONFIG_SCHEMA,
  type RuntimeConfig
} from "../../app/src/config/runtime-config";
import {
  PreviewBootstrapFailure,
  preparePreviewBootstrap,
  type PreviewBootstrapPorts,
  type PreviewSensitivePorts
} from "../../app/src/bootstrap/preview-bootstrap";
import { emptyAppSnapshot } from "../../app/src/state/app-state";
import type { PersistentAppStateService } from "../../app/src/state/state-hydration";

const HASH_A = `sha256:${"13579bdf02468ace".repeat(4)}`;
const HASH_B = `sha256:${"eca86420fdb97531".repeat(4)}`;

function runtimeConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: RUNTIME_CONFIG_SCHEMA,
    releaseId: RHP_RELEASE_ID,
    canonicalOrigin: RHP_CANONICAL_ORIGIN,
    artifactResolverOrigins: [],
    issuerAuthoritativeCurrentHeadOrigins: [],
    remoteResourceOrigins: [],
    presentationDeliveryOrigins: [],
    resourceManifestSha256: HASH_A,
    identityAnchorSetVersion: "rhp-d2-a-empty-v1",
    policyVersion: "rhp-d2-a-empty-v1",
    supportedCapabilities: ["disposable-holder-authority"],
    capabilityEvidence: { sha256: HASH_B, notAfter: "2027-01-01T00:00:00Z" },
    ...overrides
  };
}

function stateService(overrides: Partial<PersistentAppStateService> = {}): PersistentAppStateService {
  return Object.freeze({
    prepare: async () => ({ state: "ready" as const }),
    load: async () => emptyAppSnapshot(),
    recordHistory: async () => {},
    saveAuthority: async () => {},
    ...overrides
  });
}

function sensitivePorts(storage: PersistentAppStateService = stateService()): PreviewSensitivePorts {
  const onboarding = Object.freeze({
    inspect: vi.fn(),
    prepareStorage: vi.fn(),
    complete: vi.fn()
  }) as unknown as PreviewSensitivePorts["onboarding"];
  const authentication = Object.freeze({
    inspect: vi.fn(),
    enroll: vi.fn(),
    authorize: vi.fn(),
    invalidate: vi.fn(),
    dispose: vi.fn()
  }) as unknown as PreviewSensitivePorts["authentication"];
  return {
    storage,
    cryptography: Object.freeze({}),
    resolver: Object.freeze({ available: false }),
    resources: Object.freeze({ productionReady: false }),
    identity: Object.freeze({ anchors: [] }),
    policy: Object.freeze({ result: "not-evaluated" }),
    randomness: Object.freeze({}),
    transport: Object.freeze({ localOnly: true }),
    onboarding,
    authentication,
    currentStateHash: () => `sha256:${"4".repeat(64)}`
  };
}

function ports(overrides: Partial<PreviewBootstrapPorts> = {}): PreviewBootstrapPorts {
  return {
    loadRuntimeConfig: async () => runtimeConfig(),
    clock: { now: () => "2026-08-01T00:00:00Z" },
    captureOriginContext: () => ({
      url: "https://hiri-protocol.org/#/",
      basePath: "/",
      isTopLevel: true,
      redirectCount: 0
    }),
    profile: "production",
    createSensitivePorts: () => sensitivePorts(),
    ...overrides
  };
}

describe("Real Holder Preview production bootstrap", () => {
  it("initializes sensitive ports only after configuration and origin pass", async () => {
    const events: string[] = [];
    const persistentState = stateService();
    const result = await preparePreviewBootstrap(ports({
      loadRuntimeConfig: async () => { events.push("config"); return runtimeConfig(); },
      clock: { now: () => { events.push("clock"); return "2026-08-01T00:00:00Z"; } },
      captureOriginContext: () => {
        events.push("origin");
        return { url: "https://hiri-protocol.org/#/", basePath: "/", isTopLevel: true, redirectCount: 0 };
      },
      createSensitivePorts: (config: RuntimeConfig) => {
        events.push(`ports:${config.releaseId}`);
        return sensitivePorts(persistentState);
      }
    }));
    expect(events).toEqual(["config", "clock", "origin", "ports:real-holder-preview"]);
    expect(result).toMatchObject({
      state: "ready",
      stateService: persistentState
    });
  });

  it("passes a persistent state service to post-gate hydration without reading it in bootstrap", async () => {
    const prepare = vi.fn(async () => ({ state: "ready" as const }));
    const load = vi.fn(async () => emptyAppSnapshot());
    const stateService: PersistentAppStateService = Object.freeze({
      prepare,
      load,
      recordHistory: async () => {},
      saveAuthority: async () => {}
    });
    const result = await preparePreviewBootstrap(ports({
      createSensitivePorts: () => sensitivePorts(stateService)
    }));
    expect(result).toMatchObject({
      state: "ready",
      runtimeConfig: expect.objectContaining({ releaseId: RHP_RELEASE_ID }),
      stateService
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("does not construct sensitive ports for missing, invalid, expired, or hostile startup", async () => {
    for (const override of [
      { loadRuntimeConfig: async () => undefined },
      { loadRuntimeConfig: async () => ({ invalid: true }) },
      { loadRuntimeConfig: async () => runtimeConfig({ capabilityEvidence: {
        sha256: HASH_B,
        notAfter: "2026-08-01T00:00:00Z"
      } }) },
      { captureOriginContext: () => ({
        url: "https://attacker.example/#/",
        basePath: "/",
        isTopLevel: true,
        redirectCount: 0
      }) }
    ]) {
      const createSensitivePorts = vi.fn(() => sensitivePorts());
      const result = await preparePreviewBootstrap(ports({ ...override, createSensitivePorts }));
      expect(result.state).toBe("blocked");
      expect(createSensitivePorts).not.toHaveBeenCalled();
    }
  });

  it("surfaces configuration loading failure without touching sensitive ports", async () => {
    const createSensitivePorts = vi.fn();
    const result = await preparePreviewBootstrap(ports({
      loadRuntimeConfig: async () => { throw new Error("raw loader detail must not escape"); },
      createSensitivePorts
    }));
    expect(result).toEqual({ state: "failed", code: "RHP_BOOTSTRAP_CONFIG_LOAD_FAILED" });
    expect(JSON.stringify(result)).not.toContain("raw loader detail");
    expect(createSensitivePorts).not.toHaveBeenCalled();
  });

  it("rejects the legacy in-memory state loader and never performs a silent reset", async () => {
    const loadInitialState = vi.fn(async () => ({ credentials: [], history: [], authority: null }));
    const reset = vi.fn();
    const result = await preparePreviewBootstrap(ports({
      createSensitivePorts: () => ({
        ...sensitivePorts(),
        storage: { loadInitialState, reset }
      } as unknown as PreviewSensitivePorts)
    }));
    expect(result).toEqual({ state: "failed", code: "RHP_BOOTSTRAP_PORTS_FAILED" });
    expect(loadInitialState).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it("keeps exact localhost automation outside the real sensitive-port factory", async () => {
    const createSensitivePorts = vi.fn();
    const result = await preparePreviewBootstrap(ports({
      profile: "automated-test",
      automatedTest: {
        expectedOrigin: "http://127.0.0.1:4174",
        stateKind: "generated-non-authoritative"
      },
      captureOriginContext: () => ({
        url: "http://127.0.0.1:4174/#/",
        basePath: "/",
        isTopLevel: true,
        redirectCount: 0
      }),
      createSensitivePorts
    }));
    expect(result).toMatchObject({ state: "automated-test-only" });
    expect(createSensitivePorts).not.toHaveBeenCalled();
  });

  it("renders recoverable failure copy without reset or invented success", () => {
    const markup = renderToStaticMarkup(<PreviewBootstrapFailure code="RHP_BOOTSTRAP_STATE_FAILED" />);
    expect(markup).toMatch(/could not start/iu);
    expect(markup).toMatch(/No local data was reset/iu);
    expect(markup).not.toMatch(/authority ready|credential valid|continue anyway/iu);
  });
});
