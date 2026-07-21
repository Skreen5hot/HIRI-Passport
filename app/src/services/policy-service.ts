import {
  APPROVED_RELYING_PARTY_POLICY_VERSION,
  assessRelyingPartyPolicyConfiguration,
  type RelyingPartyPolicyConfigurationAssessment
} from "../config/relying-party-policy";
import type { RuntimeConfig } from "../config/runtime-config";

const NO_POLICY_REASONS = Object.freeze([
  Object.freeze({ predicate: "no-relying-party-policy-configured-under-rhp-dr-002-d2-a" })
]);

export type PolicyNotEvaluated = Readonly<{
  result: "not-evaluated";
  code: "RHP_POLICY_NOT_EVALUATED" | "RHP_POLICY_CONFIGURATION_NOT_AUTHORIZED";
  evaluated: false;
  policyId: null;
  policyVersion: null;
  configurationVersion: typeof APPROVED_RELYING_PARTY_POLICY_VERSION;
  reasons: typeof NO_POLICY_REASONS;
  evidenceModified: false;
}>;

export type ProductionPolicyService = Readonly<{
  disposition: "not-evaluated";
  code: PolicyNotEvaluated["code"];
  configuration: RelyingPartyPolicyConfigurationAssessment;
  policyCount: 0;
  discovery: "disabled";
  corePolicy: undefined;
  evaluate(evidence: unknown): PolicyNotEvaluated;
}>;

function notEvaluated(code: PolicyNotEvaluated["code"]): PolicyNotEvaluated {
  return Object.freeze({
    result: "not-evaluated" as const,
    code,
    evaluated: false as const,
    policyId: null,
    policyVersion: null,
    configurationVersion: APPROVED_RELYING_PARTY_POLICY_VERSION,
    reasons: NO_POLICY_REASONS,
    evidenceModified: false as const
  });
}

/**
 * The production service intentionally exposes no executable policy. Its Core
 * policy port is undefined, which is the Core representation of not evaluated.
 */
export function createPolicyService(runtimeConfig: RuntimeConfig | unknown): ProductionPolicyService {
  const configuration = assessRelyingPartyPolicyConfiguration(runtimeConfig);
  const code = configuration.disposition === "empty"
    ? "RHP_POLICY_NOT_EVALUATED" as const
    : "RHP_POLICY_CONFIGURATION_NOT_AUTHORIZED" as const;
  const result = notEvaluated(code);
  return Object.freeze({
    disposition: "not-evaluated" as const,
    code,
    configuration,
    policyCount: 0 as const,
    discovery: "disabled" as const,
    corePolicy: undefined,
    // Evidence is deliberately not read, cloned, summarized, or rewritten.
    evaluate: (_evidence: unknown): PolicyNotEvaluated => result
  });
}

export function evaluateHolderDisplayPolicy(
  evidence: unknown,
  runtimeConfig: RuntimeConfig | unknown
): PolicyNotEvaluated {
  return createPolicyService(runtimeConfig).evaluate(evidence);
}
