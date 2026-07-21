import type { RuntimeConfig } from "./runtime-config";

export const APPROVED_RELYING_PARTY_POLICY_VERSION = "rhp-d2-a-empty-v1" as const;
export const RELYING_PARTY_POLICIES = Object.freeze([]) as readonly [];

export const RELYING_PARTY_POLICY_CONFIGURATION = Object.freeze({
  authority: "RHP-DR-002 D2-A" as const,
  version: APPROVED_RELYING_PARTY_POLICY_VERSION,
  policies: RELYING_PARTY_POLICIES,
  activePolicy: null,
  discovery: "disabled" as const,
  execution: "disabled" as const,
  candidateReady: false as const
});

export type RelyingPartyPolicyConfigurationAssessment = Readonly<{
  disposition: "empty" | "not-authorized";
  code:
    | "RHP_RELYING_PARTY_POLICIES_EMPTY"
    | "RHP_RELYING_PARTY_POLICY_CONFIGURATION_INVALID"
    | "RHP_RELYING_PARTY_POLICY_CONFIGURATION_NOT_AUTHORIZED";
  authority: typeof RELYING_PARTY_POLICY_CONFIGURATION.authority;
  version: typeof APPROVED_RELYING_PARTY_POLICY_VERSION;
  policies: readonly [];
  activePolicy: null;
  discovery: "disabled";
  execution: "disabled";
  candidateReady: false;
}>;

const INJECTION_MEMBERS = Object.freeze([
  "relyingPartyPolicies",
  "policies",
  "policy",
  "activePolicy",
  "policyEvaluator"
]);

function assessment(
  disposition: RelyingPartyPolicyConfigurationAssessment["disposition"],
  code: RelyingPartyPolicyConfigurationAssessment["code"]
): RelyingPartyPolicyConfigurationAssessment {
  return Object.freeze({
    disposition,
    code,
    authority: RELYING_PARTY_POLICY_CONFIGURATION.authority,
    version: APPROVED_RELYING_PARTY_POLICY_VERSION,
    policies: RELYING_PARTY_POLICIES,
    activePolicy: null,
    discovery: "disabled" as const,
    execution: "disabled" as const,
    candidateReady: false as const
  });
}

/**
 * Validates the signed empty policy configuration without accepting executable
 * policy callbacks or runtime entries.
 */
export function assessRelyingPartyPolicyConfiguration(
  runtimeConfig: RuntimeConfig | unknown
): RelyingPartyPolicyConfigurationAssessment {
  if (!runtimeConfig || typeof runtimeConfig !== "object" || Array.isArray(runtimeConfig)) {
    return assessment("not-authorized", "RHP_RELYING_PARTY_POLICY_CONFIGURATION_INVALID");
  }
  let version: unknown;
  try {
    const candidate = runtimeConfig as Record<string, unknown>;
    if (INJECTION_MEMBERS.some(member => Object.hasOwn(candidate, member))) {
      return assessment("not-authorized", "RHP_RELYING_PARTY_POLICY_CONFIGURATION_NOT_AUTHORIZED");
    }
    version = candidate.policyVersion;
  } catch {
    return assessment("not-authorized", "RHP_RELYING_PARTY_POLICY_CONFIGURATION_INVALID");
  }
  if (version !== APPROVED_RELYING_PARTY_POLICY_VERSION) {
    return assessment("not-authorized", "RHP_RELYING_PARTY_POLICY_CONFIGURATION_NOT_AUTHORIZED");
  }
  return assessment("empty", "RHP_RELYING_PARTY_POLICIES_EMPTY");
}
