// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createCurrentHeadResolver } from "../../app/src/adapters/current-head-resolver";
import { type RuntimeConfig, parseRuntimeConfig } from "../../app/src/config/runtime-config";
import { createResolutionService } from "../../app/src/services/resolution-service";
import { createHeadCache } from "../../app/src/storage/head-cache";
import { evaluateCredentialStatus } from "../../src/core/status.mjs";

const HASH = `sha256:${"fedcba9876543210".repeat(4)}`;

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

describe("D2-A current-head resolution", () => {
  it("returns current status unknown without touching the network or cache", async () => {
    const network = vi.fn(() => {
      throw new Error("network must not be touched");
    });
    const databaseOpen = vi.fn(() => {
      throw new Error("cache must not be touched");
    });
    vi.stubGlobal("fetch", network);
    vi.stubGlobal("indexedDB", { open: databaseOpen });
    try {
      const service = createResolutionService(runtimeConfig());
      const result = await service.resolveCurrentHead({
        credentialUri: "https://issuer.hiri-protocol.org/credentials/1",
        presentedManifestHash: HASH
      });
      expect(result).toMatchObject({
        result: "unknown",
        status: "unknown",
        error: "CURRENT_HEAD_UNKNOWN",
        code: "RHP_CURRENT_HEAD_RESOLUTION_DISABLED",
        currentHead: null,
        currentHeadEvidence: {
          result: "unknown",
          issuerAuthoritative: false,
          source: null,
          retrievedAt: null,
          network: "not-attempted",
          cache: "not-consulted",
          discovery: "not-attempted"
        }
      });
      expect(network).not.toHaveBeenCalled();
      expect(databaseOpen).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not infer authority from a credential URI, TLS origin, caller set, or holder-supplied evidence", async () => {
    const holderInput = {
      credentialUri: "https://issuer.hiri-protocol.org/credentials/1",
      configuredAuthority: new Set(["https://issuer.hiri-protocol.org"]),
      holderSuppliedEvidence: {
        result: "valid",
        issuerAuthoritative: true,
        transportAuthenticated: true,
        source: "https://issuer.hiri-protocol.org",
        headManifestHash: HASH,
        signature: "valid",
        chainResult: "valid"
      }
    };
    const resolver = createCurrentHeadResolver(runtimeConfig());
    const result = await resolver.resolve(holderInput);
    expect(result.currentHeadEvidence).toMatchObject({
      result: "unknown",
      issuerAuthoritative: false,
      holderSuppliedEvidenceAccepted: false,
      source: null
    });
    expect(result.currentHead).toBeNull();
    expect(holderInput.holderSuppliedEvidence.issuerAuthoritative).toBe(true);
  });

  it("feeds Core explicit unavailable evidence so active status is impossible", async () => {
    const resolution = await createCurrentHeadResolver(runtimeConfig()).resolve({ manifestHash: HASH });
    const status = await evaluateCredentialStatus({
      presented: { manifestHash: HASH },
      currentHeadEvidence: resolution.currentHeadEvidence,
      evaluationTime: "2026-07-21T00:00:00Z",
      policy: { maximumStatusAgeSeconds: 300 }
    });
    expect(status).toMatchObject({
      result: "unknown",
      status: "unknown",
      error: "CURRENT_HEAD_UNKNOWN"
    });
    expect(status.status).not.toBe("active");
  });

  it("keeps the storage-facing head-cache interface disabled and non-persistent", async () => {
    const cache = createHeadCache();
    const entry = {
      id: "https://issuer.hiri-protocol.org/credentials/1",
      version: 1,
      manifestHash: HASH,
      source: "holder-supplied",
      retrievedAt: "2026-07-21T00:00:00Z",
      transportAuthenticated: true,
      issuerAuthoritative: true
    };
    await expect(cache.put(entry)).resolves.toEqual({
      result: "unavailable",
      code: "RHP_HEAD_CACHE_DISABLED",
      accepted: false,
      persisted: false
    });
    await expect(cache.get(entry.id)).resolves.toEqual({
      result: "unknown",
      error: "CURRENT_HEAD_UNKNOWN",
      code: "RHP_HEAD_CACHE_DISABLED",
      cache: "not-consulted",
      entry: null
    });
  });

  it("rejects forged current-head configuration before any resolution attempt", async () => {
    const forged = {
      ...runtimeConfig(),
      issuerAuthoritativeCurrentHeadOrigins: ["https://issuer.hiri-protocol.org"]
    } as unknown as RuntimeConfig;
    const resolver = createCurrentHeadResolver(forged);
    expect(resolver).toMatchObject({
      disposition: "unavailable",
      code: "RHP_CURRENT_HEAD_CONFIGURATION_NOT_AUTHORIZED",
      networkAccess: "disabled",
      cacheAccess: "disabled"
    });
    await expect(resolver.resolve({ issuerAuthoritative: true })).resolves.toMatchObject({
      result: "unknown",
      status: "unknown",
      code: "RHP_CURRENT_HEAD_CONFIGURATION_NOT_AUTHORIZED"
    });
  });

  it("contains no IndexedDB or repository path in the disabled production cache", async () => {
    const source = await readFile(new URL("../../app/src/storage/head-cache.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["']\.\/database["']|from\s+["']\.\/repositories["']|\bindexedDB\b|\.transaction\s*\(/u);
  });
});
