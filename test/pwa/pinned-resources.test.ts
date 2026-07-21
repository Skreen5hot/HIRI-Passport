// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../../app/src/config/runtime-config";
import {
  APPROVED_RESOURCE_BYTES,
  APPROVED_RESOURCE_MANIFEST_BYTES,
  APPROVED_RESOURCE_MANIFEST_SHA256,
  APPROVED_SCHEMA_VALIDATORS,
  PRODUCTION_RESOURCE_CATALOG,
  RESOURCE_APPROVAL_STATUS,
  RESOURCE_STATUS,
  SYNTHETIC_RESOURCE_CATALOG
} from "../../app/src/resources/catalog";
import { createProductionResourceRegistry } from "../../app/src/adapters/pinned-resources";

const HASH = `sha256:${"0123456789abcdef".repeat(4)}`;
const sha256 = Object.freeze({
  digest: async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)))
});

describe("pinned resources", () => {
  it("keeps every production activation constant empty while OWNER-RHP-03 and OPEN-CONTEXT-01 remain open", () => {
    expect(SYNTHETIC_RESOURCE_CATALOG).toEqual([]);
    expect(PRODUCTION_RESOURCE_CATALOG).toEqual([]);
    expect(APPROVED_RESOURCE_MANIFEST_SHA256).toBeUndefined();
    expect(APPROVED_RESOURCE_MANIFEST_BYTES).toBeUndefined();
    expect(APPROVED_RESOURCE_BYTES).toEqual([]);
    expect(APPROVED_SCHEMA_VALIDATORS).toEqual([]);
    expect(RESOURCE_STATUS).toEqual({ productionReady: false, blocker: "OPEN-CONTEXT-01" });
    expect(RESOURCE_APPROVAL_STATUS).toEqual({
      disposition: "unavailable",
      ownerGate: "OWNER-RHP-03",
      technicalBlocker: "OPEN-CONTEXT-01",
      independentReviewerDesignated: false,
      signedManifestApproved: false,
      candidateReady: false,
      classification: "project preview resource"
    });
  });

  it("returns unknown without parsing, fetching, or accepting a runtime-supplied manifest hash", async () => {
    const runtimeConfig = parseRuntimeConfig({
      schema: "hiri:real-holder-preview-runtime-config:v1",
      releaseId: "real-holder-preview",
      canonicalOrigin: "https://hiri-protocol.org",
      artifactResolverOrigins: [],
      issuerAuthoritativeCurrentHeadOrigins: [],
      remoteResourceOrigins: [],
      presentationDeliveryOrigins: [],
      resourceManifestSha256: HASH,
      identityAnchorSetVersion: "anchors-empty-v1",
      policyVersion: "policy-empty-v1",
      supportedCapabilities: ["persistent-self-assertions"],
      capabilityEvidence: { sha256: HASH, notAfter: "2026-10-20T00:00:00Z" }
    });
    const registry = await createProductionResourceRegistry({ runtimeConfig, sha256 });

    expect(registry).toMatchObject({
      disposition: "unavailable",
      code: "RHP_RESOURCE_MANIFEST_ABSENT",
      ownerGate: "OWNER-RHP-03",
      technicalBlocker: "OPEN-CONTEXT-01",
      candidateReady: false,
      resourceCount: 0,
      networkRetrieval: "disabled"
    });
    await expect(registry.load(
      "https://hiri-protocol.org/resources/preview/rhp-2026-07/schema/not-approved/v1",
      HASH,
      "schema"
    )).resolves.toEqual({ result: "unknown", error: "ARTIFACT_MISSING" });
    await expect(registry.validateSchema({},
      "https://hiri-protocol.org/resources/preview/rhp-2026-07/schema/not-approved/v1",
      HASH
    )).resolves.toEqual({ result: "unknown", error: "ARTIFACT_MISSING" });
  });
});
