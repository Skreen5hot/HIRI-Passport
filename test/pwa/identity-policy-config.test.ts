// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/core/identity-policy.mjs";
import {
  APPROVED_IDENTITY_ANCHOR_SET_VERSION,
  assessIdentityAnchorConfiguration,
  IDENTITY_ANCHOR_CONFIGURATION,
  IDENTITY_ANCHORS
} from "../../app/src/config/identity-anchors";
import {
  APPROVED_RELYING_PARTY_POLICY_VERSION,
  assessRelyingPartyPolicyConfiguration,
  RELYING_PARTY_POLICIES,
  RELYING_PARTY_POLICY_CONFIGURATION
} from "../../app/src/config/relying-party-policy";
import { parseRuntimeConfig, type RuntimeConfig } from "../../app/src/config/runtime-config";
import { createPolicyService } from "../../app/src/services/policy-service";

const HASH = `sha256:${"0123456789abcdef".repeat(4)}`;

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

describe("D2-A identity and policy configuration", () => {
  it("ships exact immutable empty anchor and policy sets", () => {
    expect(IDENTITY_ANCHORS).toEqual([]);
    expect(RELYING_PARTY_POLICIES).toEqual([]);
    expect(IDENTITY_ANCHOR_CONFIGURATION).toMatchObject({
      authority: "RHP-DR-002 D2-A",
      version: "rhp-d2-a-empty-v1",
      verifierIdentityAnchors: [],
      issuerIdentityAnchors: [],
      bvsIdentityAnchors: [],
      discovery: "disabled",
      trustOnFirstUse: "disabled"
    });
    expect(RELYING_PARTY_POLICY_CONFIGURATION).toMatchObject({
      authority: "RHP-DR-002 D2-A",
      version: "rhp-d2-a-empty-v1",
      policies: [],
      activePolicy: null,
      discovery: "disabled",
      execution: "disabled"
    });
    expect(Object.isFrozen(IDENTITY_ANCHORS)).toBe(true);
    expect(Object.isFrozen(RELYING_PARTY_POLICIES)).toBe(true);
  });

  it("accepts only the exact version-bound empty baseline", () => {
    expect(assessIdentityAnchorConfiguration(runtimeConfig())).toMatchObject({
      disposition: "empty",
      code: "RHP_IDENTITY_ANCHORS_EMPTY",
      anchors: [],
      networkAccess: "disabled"
    });
    expect(assessRelyingPartyPolicyConfiguration(runtimeConfig())).toMatchObject({
      disposition: "empty",
      code: "RHP_RELYING_PARTY_POLICIES_EMPTY",
      policies: [],
      activePolicy: null
    });
  });

  it("rejects mismatched configuration versions without selecting a fallback", () => {
    const base = runtimeConfig();
    const wrongAnchors = {
      ...base,
      identityAnchorSetVersion: "rhp-d2-a-empty-v2"
    } as unknown as RuntimeConfig;
    const wrongPolicy = {
      ...base,
      policyVersion: "rhp-d2-a-empty-v2"
    } as unknown as RuntimeConfig;
    expect(assessIdentityAnchorConfiguration(wrongAnchors)).toMatchObject({
      disposition: "not-authorized",
      code: "RHP_IDENTITY_ANCHOR_CONFIGURATION_NOT_AUTHORIZED"
    });
    expect(assessRelyingPartyPolicyConfiguration(wrongPolicy)).toMatchObject({
      disposition: "not-authorized",
      code: "RHP_RELYING_PARTY_POLICY_CONFIGURATION_NOT_AUTHORIZED"
    });
  });

  it("rejects every runtime anchor or executable-policy injection point", () => {
    const base = runtimeConfig();
    for (const member of [
      "identityAnchors",
      "issuerIdentityAnchors",
      "verifierIdentityAnchors",
      "bvsIdentityAnchors",
      "anchors",
      "identityAnchor"
    ]) {
      const forged = { ...base, [member]: [] } as unknown as RuntimeConfig;
      expect(assessIdentityAnchorConfiguration(forged).code)
        .toBe("RHP_IDENTITY_ANCHOR_CONFIGURATION_NOT_AUTHORIZED");
    }
    for (const member of [
      "relyingPartyPolicies",
      "policies",
      "policy",
      "activePolicy",
      "policyEvaluator"
    ]) {
      const forged = {
        ...base,
        [member]: member === "policyEvaluator" ? () => ({ result: "accepted" }) : []
      } as unknown as RuntimeConfig;
      expect(assessRelyingPartyPolicyConfiguration(forged).code)
        .toBe("RHP_RELYING_PARTY_POLICY_CONFIGURATION_NOT_AUTHORIZED");
      expect(createPolicyService(forged).evaluate({ cryptography: "valid" }).result)
        .toBe("not-evaluated");
    }
  });

  it("represents the absent Core policy as undefined, not as a callable default policy", () => {
    const service = createPolicyService(runtimeConfig());
    expect(service).toMatchObject({
      disposition: "not-evaluated",
      code: "RHP_POLICY_NOT_EVALUATED",
      policyCount: 0,
      discovery: "disabled",
      corePolicy: undefined
    });
    expect(evaluatePolicy({ cryptography: "valid" }, service.corePolicy)).toEqual({
      result: "not-evaluated"
    });
  });

  it("does not inspect or rewrite independent evidence dimensions", () => {
    const evidence = Object.freeze({
      cryptography: "invalid",
      credentialStatus: "unknown",
      issuerIdentity: "unknown",
      bvsEvidence: "valid",
      issuerTrust: "unknown",
      provenance: "bvs"
    });
    const before = structuredClone(evidence);
    const result = createPolicyService(runtimeConfig()).evaluate(evidence);
    expect(result).toEqual({
      result: "not-evaluated",
      code: "RHP_POLICY_NOT_EVALUATED",
      evaluated: false,
      policyId: null,
      policyVersion: null,
      configurationVersion: "rhp-d2-a-empty-v1",
      reasons: [{ predicate: "no-relying-party-policy-configured-under-rhp-dr-002-d2-a" }],
      evidenceModified: false
    });
    expect(evidence).toEqual(before);
    expect(result.result).not.toBe("accepted");
    expect(result.result).not.toBe("rejected");
  });

  it("does not read attacker-controlled evidence while no policy is configured", () => {
    const evidence = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(evidence, "display", {
      enumerable: true,
      get: () => {
        throw new Error("policy must not inspect evidence");
      }
    });
    expect(createPolicyService(runtimeConfig()).evaluate(evidence).result).toBe("not-evaluated");
  });

  it("contains no executable policy in the production configuration module", async () => {
    const source = await readFile(
      new URL("../../app/src/config/relying-party-policy.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toMatch(/\bevaluate\s*:/u);
    expect(source).not.toMatch(/\baccepted\b|\brejected\b/u);
  });
});
