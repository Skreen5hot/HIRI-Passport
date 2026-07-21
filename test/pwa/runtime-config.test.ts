// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  RHP_CANONICAL_ORIGIN,
  RHP_RELEASE_ID,
  RUNTIME_CONFIG_SCHEMA,
  RuntimeConfigError,
  assessRuntimeConfig,
  parseRuntimeConfig,
  parseRuntimeConfigJson,
  type PreviewCapability
} from "../../app/src/config/runtime-config";

const HASH_A = `sha256:${"0123456789abcdef".repeat(4)}`;
const HASH_B = `sha256:${"fedcba9876543210".repeat(4)}`;

function validConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    supportedCapabilities: [
      "disposable-holder-authority",
      "local-file-request-ingress",
      "presentation-signing"
    ] satisfies PreviewCapability[],
    capabilityEvidence: { sha256: HASH_B, notAfter: "2027-01-01T00:00:00Z" },
    ...overrides
  };
}

describe("Real Holder Preview runtime configuration", () => {
  it("parses and deeply freezes the closed public configuration", () => {
    const config = parseRuntimeConfig(validConfig());
    expect(config).toMatchObject({
      schema: RUNTIME_CONFIG_SCHEMA,
      releaseId: "real-holder-preview",
      canonicalOrigin: "https://hiri-protocol.org",
      artifactResolverOrigins: [],
      presentationDeliveryOrigins: []
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.supportedCapabilities)).toBe(true);
    expect(Object.isFrozen(config.capabilityEvidence)).toBe(true);
  });

  it("rejects unknown and secret-bearing members at every shape", () => {
    expect(() => parseRuntimeConfig({ ...validConfig(), extra: true })).toThrow(/unknown member/iu);
    expect(() => parseRuntimeConfig({ ...validConfig(), clientSecret: "do-not-ship" })).toThrow(RuntimeConfigError);
    expect(() => parseRuntimeConfig(validConfig({ capabilityEvidence: {
      sha256: HASH_B,
      notAfter: "2027-01-01T00:00:00Z",
      token: "do-not-ship"
    } }))).toThrow(/secret-bearing/iu);
  });

  it("uses strict JSON parsing and rejects duplicate members", () => {
    const text = JSON.stringify(validConfig()).replace(
      `"releaseId":"${RHP_RELEASE_ID}"`,
      `"releaseId":"${RHP_RELEASE_ID}","releaseId":"${RHP_RELEASE_ID}"`
    );
    expect(() => parseRuntimeConfigJson(text)).toThrowError(expect.objectContaining({ code: "JSON_DUPLICATE_MEMBER" }));
  });

  it("requires the exact dedicated HTTPS origin", () => {
    for (const canonicalOrigin of [
      "http://hiri-protocol.org",
      "https://hiri-protocol.org/preview/",
      "https://user@hiri-protocol.org",
      "https://hiri-protocol.org:8443",
      "https://skreen5hot.github.io",
      "https://preview.example"
    ]) expect(() => parseRuntimeConfig(validConfig({ canonicalOrigin }))).toThrow(/canonicalOrigin/iu);
  });

  it("keeps every approved-empty network trust set closed", () => {
    for (const member of [
      "artifactResolverOrigins",
      "issuerAuthoritativeCurrentHeadOrigins",
      "remoteResourceOrigins",
      "presentationDeliveryOrigins"
    ]) {
      try {
        parseRuntimeConfig(validConfig({ [member]: ["https://resolver.hiri-protocol.org"] }));
        throw new Error("expected the open origin set to be rejected");
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeConfigError);
        expect((error as RuntimeConfigError).code).toBe("RHP_CONFIG_OPEN_CAPABILITY");
      }
    }
  });

  it("rejects missing, malformed, and obvious placeholder hashes and versions", () => {
    for (const resourceManifestSha256 of [undefined, "", "sha256:ABC", `sha256:${"0".repeat(64)}`]) {
      expect(() => parseRuntimeConfig(validConfig({ resourceManifestSha256 }))).toThrow(/resourceManifestSha256/iu);
    }
    expect(() => parseRuntimeConfig(validConfig({ identityAnchorSetVersion: "TBD" }))).toThrow(/identityAnchorSetVersion/iu);
    expect(() => parseRuntimeConfig(validConfig({ policyVersion: "example-v1" }))).toThrow(/policyVersion/iu);
  });

  it("rejects unknown open capabilities, duplicates, and nondeterministic ordering", () => {
    expect(() => parseRuntimeConfig(validConfig({ supportedCapabilities: ["https-presentation-delivery"] })))
      .toThrow(/open capability/iu);
    expect(() => parseRuntimeConfig(validConfig({ supportedCapabilities: [
      "presentation-signing",
      "presentation-signing"
    ] }))).toThrow(/duplicate/iu);
    expect(() => parseRuntimeConfig(validConfig({ supportedCapabilities: [
      "presentation-signing",
      "disposable-holder-authority"
    ] }))).toThrow(/lexical order/iu);
  });

  it("fails closed for missing, invalid, expired, or disabled configuration", () => {
    expect(assessRuntimeConfig(undefined, { now: "2026-08-01T00:00:00Z" })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CONFIG_MISSING"
    });
    expect(assessRuntimeConfig({ nope: true }, { now: "2026-08-01T00:00:00Z" })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CONFIG_INVALID"
    });
    expect(assessRuntimeConfig(validConfig(), { now: "not-a-time" })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CLOCK_INVALID"
    });
    expect(assessRuntimeConfig(validConfig({ capabilityEvidence: {
      sha256: HASH_B,
      notAfter: "2026-08-01T00:00:00Z"
    } }), { now: "2026-08-01T00:00:00Z" })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CAPABILITY_EVIDENCE_EXPIRED"
    });
    expect(assessRuntimeConfig(validConfig(), {
      now: "2026-08-01T00:00:00Z",
      capability: "local-clipboard-presentation-delivery"
    })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CAPABILITY_NOT_ENABLED"
    });
  });

  it("rechecks evidence for each configured operation without performing a network lookup", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const initial = assessRuntimeConfig(validConfig(), {
      now: "2026-08-01T00:00:00Z",
      capability: "presentation-signing"
    });
    const later = assessRuntimeConfig(validConfig(), {
      now: "2027-01-01T00:00:00Z",
      capability: "presentation-signing"
    });
    expect(initial).toMatchObject({
      disposition: "configuration-eligible",
      code: "RHP_CONFIG_ELIGIBLE",
      clockTamperResistant: false,
      networkCheckPerformed: false
    });
    expect(later).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CAPABILITY_EVIDENCE_EXPIRED"
    });
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("ships an intentionally invalid and expired example rather than invented owner evidence", async () => {
    const text = await readFile(new URL("../../config/holder-preview.example.json", import.meta.url), "utf8");
    const value = JSON.parse(text) as unknown;
    expect(() => parseRuntimeConfigJson(text)).toThrow(/resourceManifestSha256/iu);
    expect(assessRuntimeConfig(value, { now: "2026-08-01T00:00:00Z" })).toMatchObject({
      disposition: "inspect-only",
      code: "RHP_CONFIG_INVALID"
    });
  });
});
