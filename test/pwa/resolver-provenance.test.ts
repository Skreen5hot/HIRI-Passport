// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  createArtifactResolver,
  resolveArtifact,
  UNAVAILABLE_RESOLVER_PROVENANCE
} from "../../app/src/adapters/artifact-resolver";
import {
  assessPublicEndpointConfiguration,
  PUBLIC_ENDPOINTS
} from "../../app/src/config/public-endpoints";
import {
  parseRuntimeConfig,
  type RuntimeConfig
} from "../../app/src/config/runtime-config";
import { createResolutionService } from "../../app/src/services/resolution-service";

const HASH = `sha256:${"0123456789abcdef".repeat(4)}`;
const REFERENCE = Object.freeze({ kind: "hiriManifest" as const, hash: HASH });

function runtimeConfig(): RuntimeConfig {
  return parseRuntimeConfig({
    schema: "hiri:real-holder-preview-runtime-config:v1",
    releaseId: "real-holder-preview",
    canonicalOrigin: "https://hiri-protocol.org",
    artifactResolverOrigins: [],
    issuerAuthoritativeCurrentHeadOrigins: [],
    remoteResourceOrigins: [],
    presentationDeliveryOrigins: [],
    resourceManifestSha256: HASH,
    identityAnchorSetVersion: "rhp-d2-a-empty-v1",
    policyVersion: "rhp-d2-a-empty-v1",
    supportedCapabilities: ["persistent-self-assertions"],
    capabilityEvidence: { sha256: HASH, notAfter: "2026-10-20T00:00:00Z" }
  });
}

describe("D2-A artifact resolver provenance", () => {
  it("binds production to the signed empty endpoint configuration", () => {
    const assessment = assessPublicEndpointConfiguration(runtimeConfig());
    expect(assessment).toEqual({
      disposition: "closed",
      code: "RHP_PUBLIC_ENDPOINTS_EMPTY",
      authority: "RHP-DR-002 D2-A",
      artifactResolverOrigins: [],
      issuerAuthoritativeCurrentHeadOrigins: [],
      networkAccess: "disabled",
      discovery: "disabled",
      redirects: "disabled",
      candidateReady: false,
      technicalBlocker: "OPEN-HEAD-01"
    });
    expect(PUBLIC_ENDPOINTS.artifactResolverOrigins).toEqual([]);
    expect(PUBLIC_ENDPOINTS.issuerAuthoritativeCurrentHeadOrigins).toEqual([]);
    expect(Object.isFrozen(PUBLIC_ENDPOINTS.artifactResolverOrigins)).toBe(true);
  });

  it("returns explicit unknown provenance without attempting network access", async () => {
    const network = vi.fn(() => {
      throw new Error("network must not be touched");
    });
    vi.stubGlobal("fetch", network);
    try {
      const resolver = createArtifactResolver(runtimeConfig());
      await expect(resolver.resolve(REFERENCE)).resolves.toEqual({
        result: "unknown",
        error: "ARTIFACT_MISSING",
        code: "RHP_ARTIFACT_RESOLUTION_DISABLED",
        candidate: null,
        provenance: UNAVAILABLE_RESOLVER_PROVENANCE
      });
      expect(resolver.networkAccess).toBe("disabled");
      expect(resolver.cacheAccess).toBe("disabled");
      expect(network).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves the Core resolver interface as a null-candidate boundary", async () => {
    const resolver = createArtifactResolver(runtimeConfig());
    await expect(resolver.corePort.resolve(REFERENCE)).resolves.toBeNull();
    await expect(createResolutionService(runtimeConfig()).coreArtifactResolver.resolve(REFERENCE)).resolves.toBeNull();
  });

  it("rejects URL, redirect, origin, and authority-bearing resolver inputs", async () => {
    for (const member of ["url", "location", "redirect", "origin", "issuerAuthoritative"] as const) {
      const result = await resolveArtifact({
        ...REFERENCE,
        [member]: member === "issuerAuthoritative" ? true : "https://resolver.hiri-protocol.org/a"
      }, runtimeConfig());
      expect(result).toMatchObject({
        result: "unknown",
        error: "ARTIFACT_MISSING",
        code: "RHP_ARTIFACT_REFERENCE_INVALID",
        candidate: null
      });
      expect(result.provenance.issuerAuthoritative).toBe(false);
      expect(result.provenance.redirects).toBe("not-followed");
    }
  });

  it("rejects malformed and placeholder artifact references without discovery", async () => {
    for (const reference of [
      "https://resolver.hiri-protocol.org/a",
      { kind: "hiriManifest", hash: `sha256:${"0".repeat(64)}` },
      { kind: "unknown", hash: HASH },
      { kind: "hiriManifest", hash: "placeholder" }
    ]) {
      const result = await resolveArtifact(reference, runtimeConfig());
      expect(result.code).toBe("RHP_ARTIFACT_REFERENCE_INVALID");
      expect(result.provenance.discovery).toBe("not-attempted");
    }
  });

  it("rejects every non-empty endpoint set, including exact, wildcard, placeholder, path, and alternate-port entries", () => {
    const base = runtimeConfig();
    const entries = [
      "https://resolver.hiri-protocol.org",
      "https://*.hiri-protocol.org",
      "https://resolver.example",
      "https://resolver.hiri-protocol.org/redirect",
      "https://resolver.hiri-protocol.org:8443"
    ];
    for (const member of ["artifactResolverOrigins", "issuerAuthoritativeCurrentHeadOrigins"] as const) {
      for (const entry of entries) {
        const forged = { ...base, [member]: [entry] } as unknown as RuntimeConfig;
        expect(assessPublicEndpointConfiguration(forged)).toMatchObject({
          disposition: "not-authorized",
          code: "RHP_PUBLIC_ENDPOINTS_NOT_AUTHORIZED",
          networkAccess: "disabled"
        });
        expect(createArtifactResolver(forged).code)
          .toBe("RHP_ARTIFACT_RESOLVER_CONFIGURATION_NOT_AUTHORIZED");
      }
    }
  });

  it("contains no dormant browser network implementation in the production resolver modules", async () => {
    const sources = await Promise.all([
      "../../app/src/adapters/artifact-resolver.ts",
      "../../app/src/adapters/current-head-resolver.ts",
      "../../app/src/services/resolution-service.ts"
    ].map(path => readFile(new URL(path, import.meta.url), "utf8")));
    const source = sources.join("\n");
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|sendBeacon\s*\(/u);
    expect(source).not.toMatch(/redirect\s*:\s*["']follow["']/u);
  });
});
