// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { deriveAuthority } from "../../src/core/authority.mjs";
import { evaluateIssuerIdentity } from "../../src/core/identity-policy.mjs";
import { evaluateBvsTrust } from "../../src/bvp/trust.mjs";
import { APPROVED_IDENTITY_ANCHOR_SET_VERSION } from "../../app/src/config/identity-anchors";
import { APPROVED_RELYING_PARTY_POLICY_VERSION } from "../../app/src/config/relying-party-policy";
import { parseRuntimeConfig, type RuntimeConfig } from "../../app/src/config/runtime-config";
import { createIdentityService } from "../../app/src/services/identity-service";
import { createPolicyService } from "../../app/src/services/policy-service";

const HASH = `sha256:${"fedcba9876543210".repeat(4)}`;
const AUTHORITY = deriveAuthority(new Uint8Array(32).fill(7));
const AT = "2026-07-21T00:00:00Z";

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
    identityAnchorSetVersion: APPROVED_IDENTITY_ANCHOR_SET_VERSION,
    policyVersion: APPROVED_RELYING_PARTY_POLICY_VERSION,
    supportedCapabilities: ["persistent-self-assertions"],
    capabilityEvidence: { sha256: HASH, notAfter: "2026-10-20T00:00:00Z" }
  });
}

describe("D2-A organizational identity evaluation", () => {
  it("keeps issuer, verifier, and BVS organizational identity unknown", () => {
    const service = createIdentityService(runtimeConfig());
    for (const [role, evaluate] of [
      ["issuer", service.evaluateIssuer],
      ["verifier", service.evaluateVerifier],
      ["bvs", service.evaluateBvs]
    ] as const) {
      expect(evaluate({ authority: AUTHORITY, at: AT })).toEqual({
        result: "unknown",
        organizationalIdentity: "unknown",
        code: "RHP_IDENTITY_ANCHORS_EMPTY",
        role,
        authority: AUTHORITY,
        anchors: [],
        anchorCount: 0,
        displayHintAccepted: false,
        tlsAccepted: false,
        holderSuppliedEvidenceAccepted: false,
        trustOnFirstUse: "not-performed",
        discovery: "not-attempted"
      });
    }
  });

  it("does not convert display hints, TLS, URLs, or holder-supplied anchors into identity", () => {
    const result = createIdentityService(runtimeConfig()).evaluateVerifier({
      authority: AUTHORITY,
      at: AT,
      display: { name: "Trusted Bank", domain: "bank.example" },
      transportAuthenticated: true,
      url: "https://bank.example/request",
      holderSuppliedEvidence: {
        authority: AUTHORITY,
        organization: "Trusted Bank",
        source: "holder",
        capturedAt: AT,
        result: "valid"
      }
    });
    expect(result).toMatchObject({
      result: "unknown",
      organizationalIdentity: "unknown",
      anchors: [],
      displayHintAccepted: false,
      tlsAccepted: false,
      holderSuppliedEvidenceAccepted: false,
      trustOnFirstUse: "not-performed",
      discovery: "not-attempted"
    });
  });

  it("proves syntax and parse success cannot establish organizational identity", () => {
    const service = createIdentityService(runtimeConfig());
    expect(evaluateIssuerIdentity(AUTHORITY, service.coreIdentityAnchors, AT)).toEqual({
      result: "unknown",
      issuerAuthority: AUTHORITY,
      anchors: []
    });
    expect(service.evaluateIssuer({ authority: AUTHORITY, at: AT }).result).toBe("unknown");
    expect(service.evaluateIssuer({ authority: "key:ed25519:invalid", at: AT })).toMatchObject({
      result: "unknown",
      code: "RHP_IDENTITY_INPUT_INVALID",
      authority: null
    });
  });

  it("does not acquire trust through repeated observation", () => {
    const service = createIdentityService(runtimeConfig());
    const first = service.evaluateVerifier({ authority: AUTHORITY, at: AT });
    const second = service.evaluateVerifier({ authority: AUTHORITY, at: AT, previouslySeen: true });
    expect(first).toEqual(second);
    expect(second.trustOnFirstUse).toBe("not-performed");
  });

  it("keeps cryptography, status, BVS evidence, provenance, identity, and policy independent", () => {
    const evidence = Object.freeze({
      cryptography: "valid",
      credentialStatus: "unknown",
      bvsEvidence: "valid",
      provenance: "bvs",
      issuerTrust: "unknown"
    });
    const before = structuredClone(evidence);
    const identity = createIdentityService(runtimeConfig()).evaluateBvs({
      authority: AUTHORITY,
      at: AT,
      evidence
    });
    const policyService = createPolicyService(runtimeConfig());
    const policy = policyService.evaluate({ ...evidence, identity });
    expect(identity.organizationalIdentity).toBe("unknown");
    expect(policy.result).toBe("not-evaluated");
    expect(evidence).toEqual(before);

    const bvsTrust = evaluateBvsTrust({
      bvsAuthority: AUTHORITY,
      evidence: {
        sourceProvider: "registry",
        sourceVerificationMethod: "record",
        adapterVersion: "1.0.0"
      },
      credential: { schema: "https://schema.invalid/claim" }
    }, identity, policyService.corePolicy);
    expect(bvsTrust).toMatchObject({
      result: "not-evaluated",
      issuerTrust: "unknown"
    });
  });

  it("rejects forged non-empty anchor configuration while preserving unknown", () => {
    const forged = {
      ...runtimeConfig(),
      verifierIdentityAnchors: [{ authority: AUTHORITY, result: "valid" }]
    } as unknown as RuntimeConfig;
    const service = createIdentityService(forged);
    expect(service).toMatchObject({
      disposition: "identity-unknown",
      code: "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED",
      anchorCount: 0,
      discovery: "disabled",
      trustOnFirstUse: "disabled"
    });
    expect(service.evaluateVerifier({ authority: AUTHORITY, at: AT })).toMatchObject({
      result: "unknown",
      code: "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED",
      authority: null,
      anchors: []
    });
  });

  it("performs no network or browser-state discovery", () => {
    const network = vi.fn(() => {
      throw new Error("network must not be touched");
    });
    const storageRead = vi.fn(() => {
      throw new Error("browser state must not be touched");
    });
    vi.stubGlobal("fetch", network);
    vi.stubGlobal("localStorage", { getItem: storageRead });
    try {
      createIdentityService(runtimeConfig()).evaluateVerifier({
        authority: AUTHORITY,
        at: AT,
        display: { domain: "bank.example" }
      });
      expect(network).not.toHaveBeenCalled();
      expect(storageRead).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("contains no discovery or persistence implementation in the identity service", async () => {
    const source = await readFile(
      new URL("../../app/src/services/identity-service.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bindexedDB\b|\blocalStorage\b/u);
  });
});
