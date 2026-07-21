// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RHP_CANONICAL_ORIGIN,
  RHP_RELEASE_ID,
  RUNTIME_CONFIG_SCHEMA
} from "../../app/src/config/runtime-config";
import { OriginBlockedRoute } from "../../app/src/routes/origin-blocked";
import {
  OriginPolicyError,
  SENSITIVE_ORIGIN_OPERATIONS,
  evaluateOriginPolicy,
  requireOriginEligibility,
  type OriginContext,
  type OriginPolicyInput
} from "../../app/src/security/origin-policy";

const HASH_A = `sha256:${"1234567890abcdef".repeat(4)}`;
const HASH_B = `sha256:${"abcdef0123456789".repeat(4)}`;

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

function context(overrides: Partial<OriginContext> = {}): OriginContext {
  return {
    url: "https://hiri-protocol.org/#/home",
    basePath: "/",
    isTopLevel: true,
    redirectCount: 0,
    ...overrides
  };
}

function policyInput(overrides: Partial<OriginPolicyInput> = {}): OriginPolicyInput {
  return {
    runtimeConfig: runtimeConfig(),
    now: "2026-08-01T00:00:00Z",
    capability: "disposable-holder-authority",
    context: context(),
    profile: "production",
    ...overrides
  };
}

describe("Real Holder Preview origin isolation", () => {
  it("accepts only the configured HTTPS custom origin at the root path", () => {
    const decision = evaluateOriginPolicy(policyInput());
    expect(decision).toMatchObject({
      disposition: "origin-eligible",
      code: "RHP_ORIGIN_ELIGIBLE",
      mayInitializeSensitiveState: true,
      mayUseGeneratedTestState: false
    });
  });

  it("rejects the project Pages origin and lookalike or alternate origins", () => {
    expect(evaluateOriginPolicy(policyInput({ context: context({
      url: "https://skreen5hot.github.io/HIRI-Passport/#/home",
      basePath: "/HIRI-Passport/"
    }) }))).toMatchObject({ code: "RHP_ORIGIN_PROJECT_PAGES_FORBIDDEN" });

    for (const url of [
      "http://hiri-protocol.org/#/home",
      "https://hiri-protocol.org.evil.example/#/home",
      "https://hiri-protocol.org:8443/#/home",
      "https://www.hiri-protocol.org/#/home",
      "https://127.0.0.1/#/home"
    ]) expect(evaluateOriginPolicy(policyInput({ context: context({ url }) }))).toMatchObject({
      disposition: "blocked",
      code: "RHP_ORIGIN_MISMATCH",
      mayInitializeSensitiveState: false
    });
  });

  it("treats base path, application path, and query as exact boundaries while permitting hash routes", () => {
    expect(evaluateOriginPolicy(policyInput({ context: context({
      url: "https://hiri-protocol.org/HIRI-Passport/#/home",
      basePath: "/HIRI-Passport/"
    }) }))).toMatchObject({ code: "RHP_ORIGIN_BASE_PATH_MISMATCH" });
    expect(evaluateOriginPolicy(policyInput({ context: context({
      url: "https://hiri-protocol.org/index.html#/home"
    }) }))).toMatchObject({ code: "RHP_ORIGIN_PATH_MISMATCH" });
    expect(evaluateOriginPolicy(policyInput({ context: context({
      url: "https://hiri-protocol.org/?request=secret#/home"
    }) }))).toMatchObject({ code: "RHP_ORIGIN_PATH_MISMATCH" });
    expect(evaluateOriginPolicy(policyInput({ context: context({
      url: "https://hiri-protocol.org/#/request?item=local"
    }) }))).toMatchObject({ code: "RHP_ORIGIN_ELIGIBLE" });
  });

  it("rejects embedded and redirected navigation contexts", () => {
    expect(evaluateOriginPolicy(policyInput({ context: context({ isTopLevel: false }) })))
      .toMatchObject({ code: "RHP_ORIGIN_EMBEDDED_CONTEXT" });
    expect(evaluateOriginPolicy(policyInput({ context: context({ redirectCount: 1 }) })))
      .toMatchObject({ code: "RHP_ORIGIN_REDIRECT_REFUSED" });
    expect(evaluateOriginPolicy(policyInput({ context: context({ redirectCount: -1 }) })))
      .toMatchObject({ code: "RHP_ORIGIN_CONTEXT_INVALID" });
  });

  it("refuses stale configuration before origin eligibility", () => {
    const decision = evaluateOriginPolicy(policyInput({
      runtimeConfig: runtimeConfig({ capabilityEvidence: {
        sha256: HASH_B,
        notAfter: "2026-08-01T00:00:00Z"
      } })
    }));
    expect(decision).toMatchObject({
      disposition: "blocked",
      code: "RHP_ORIGIN_CONFIG_BLOCKED",
      runtimeConfigCode: "RHP_CAPABILITY_EVIDENCE_EXPIRED",
      mayInitializeSensitiveState: false
    });
  });

  it("permits exact loopback automation only for generated non-authoritative state", () => {
    const input = policyInput({
      context: context({ url: "http://127.0.0.1:4174/#/home" }),
      profile: "automated-test",
      automatedTest: {
        expectedOrigin: "http://127.0.0.1:4174",
        stateKind: "generated-non-authoritative"
      }
    });
    expect(evaluateOriginPolicy(input)).toMatchObject({
      disposition: "automated-test-only",
      code: "RHP_ORIGIN_AUTOMATED_TEST_ONLY",
      mayInitializeSensitiveState: false,
      mayUseGeneratedTestState: true
    });
    expect(() => requireOriginEligibility(input, "key-creation")).toThrow(OriginPolicyError);
    expect(evaluateOriginPolicy({ ...input, automatedTest: {
      expectedOrigin: "http://localhost:4174",
      stateKind: "generated-non-authoritative"
    } })).toMatchObject({ code: "RHP_ORIGIN_TEST_PROFILE_INVALID" });
  });

  it("does not accept a test-profile object in production", () => {
    expect(evaluateOriginPolicy(policyInput({
      automatedTest: {
        expectedOrigin: "https://hiri-protocol.org",
        stateKind: "generated-non-authoritative"
      }
    }))).toMatchObject({ code: "RHP_ORIGIN_TEST_PROFILE_INVALID" });
    expect(evaluateOriginPolicy(policyInput({
      profile: "unexpected" as OriginPolicyInput["profile"]
    }))).toMatchObject({ code: "RHP_ORIGIN_CONTEXT_INVALID" });
  });

  it("refuses every cross-origin state migration request", () => {
    const decision = evaluateOriginPolicy(policyInput({ context: context({
      migrationSourceOrigin: "https://skreen5hot.github.io"
    }) }));
    expect(decision).toMatchObject({
      disposition: "blocked",
      code: "RHP_ORIGIN_MIGRATION_REFUSED",
      mayInitializeSensitiveState: false
    });
  });

  it("guards every sensitive operation before a blocked-context side effect", () => {
    const input = policyInput({ context: context({ url: "https://attacker.example/#/home" }) });
    let sideEffects = 0;
    for (const operation of SENSITIVE_ORIGIN_OPERATIONS) {
      expect(() => {
        requireOriginEligibility(input, operation);
        sideEffects += 1;
      }).toThrow(OriginPolicyError);
    }
    expect(sideEffects).toBe(0);
  });

  it("renders a fixed inspect-only screen without echoing hostile origin data or offering a bypass", () => {
    const decision = evaluateOriginPolicy(policyInput({ context: context({
      url: "https://attacker.example/<script>alert(1)</script>"
    }) }));
    if (decision.disposition !== "blocked") throw new Error("expected a blocked decision");
    const markup = renderToStaticMarkup(createElement(OriginBlockedRoute, { decision }));
    expect(markup).toMatch(/Real Holder Preview is unavailable here/iu);
    expect(markup).toMatch(/No holder storage, keys, imports, signing, resolver, or delivery path has been initialized/iu);
    expect(markup).not.toContain("attacker.example");
    expect(markup).not.toMatch(/continue anyway|reset|migrate/iu);
  });
});
