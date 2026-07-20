import { evaluatePolicy } from "../../../src/core/identity-policy.mjs";
import { DEFAULT_POLICY } from "../config/relying-party-policy";
export const evaluateHolderDisplayPolicy = (evidence: unknown) => evaluatePolicy(evidence, DEFAULT_POLICY);
