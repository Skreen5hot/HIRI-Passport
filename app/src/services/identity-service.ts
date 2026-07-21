import { evaluateIssuerIdentity } from "../../../src/core/identity-policy.mjs";
import {
  IDENTITY_ANCHORS,
  assessIdentityAnchorConfiguration,
  type IdentityAnchorConfigurationAssessment
} from "../config/identity-anchors";
import type { RuntimeConfig } from "../config/runtime-config";

export type IdentityRole = "issuer" | "verifier" | "bvs";

export type OrganizationalIdentityUnknown = Readonly<{
  result: "unknown";
  organizationalIdentity: "unknown";
  code:
    | "RHP_IDENTITY_ANCHORS_EMPTY"
    | "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED"
    | "RHP_IDENTITY_INPUT_INVALID";
  role: IdentityRole;
  authority: string | null;
  anchors: readonly [];
  anchorCount: 0;
  displayHintAccepted: false;
  tlsAccepted: false;
  holderSuppliedEvidenceAccepted: false;
  trustOnFirstUse: "not-performed";
  discovery: "not-attempted";
}>;

export type ProductionIdentityService = Readonly<{
  disposition: "identity-unknown";
  code: "RHP_IDENTITY_ANCHORS_EMPTY" | "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED";
  configuration: IdentityAnchorConfigurationAssessment;
  anchorCount: 0;
  discovery: "disabled";
  trustOnFirstUse: "disabled";
  coreIdentityAnchors: readonly [];
  evaluateIssuer(input: unknown): OrganizationalIdentityUnknown;
  evaluateVerifier(input: unknown): OrganizationalIdentityUnknown;
  evaluateBvs(input: unknown): OrganizationalIdentityUnknown;
}>;

function unknown(
  role: IdentityRole,
  code: OrganizationalIdentityUnknown["code"],
  authority: string | null = null
): OrganizationalIdentityUnknown {
  return Object.freeze({
    result: "unknown" as const,
    organizationalIdentity: "unknown" as const,
    code,
    role,
    authority,
    anchors: IDENTITY_ANCHORS,
    anchorCount: 0 as const,
    displayHintAccepted: false as const,
    tlsAccepted: false as const,
    holderSuppliedEvidenceAccepted: false as const,
    trustOnFirstUse: "not-performed" as const,
    discovery: "not-attempted" as const
  });
}

function evaluateInput(
  role: IdentityRole,
  input: unknown,
  configuration: IdentityAnchorConfigurationAssessment
): OrganizationalIdentityUnknown {
  if (configuration.disposition !== "empty") {
    return unknown(role, "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return unknown(role, "RHP_IDENTITY_INPUT_INVALID");
  }
  let authority: unknown;
  let at: unknown;
  try {
    const candidate = input as Record<string, unknown>;
    authority = candidate.authority;
    at = candidate.at;
  } catch {
    return unknown(role, "RHP_IDENTITY_INPUT_INVALID");
  }
  if (typeof authority !== "string" || typeof at !== "string") {
    return unknown(role, "RHP_IDENTITY_INPUT_INVALID");
  }
  try {
    const core = evaluateIssuerIdentity(authority, IDENTITY_ANCHORS, at);
    if (core.result !== "unknown" || !Array.isArray(core.anchors) || core.anchors.length !== 0) {
      return unknown(role, "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED");
    }
  } catch {
    return unknown(role, "RHP_IDENTITY_INPUT_INVALID");
  }
  return unknown(role, "RHP_IDENTITY_ANCHORS_EMPTY", authority);
}

/**
 * Identity evaluation is syntax plus the exact empty Core anchor set. Display
 * text, transport facts, holder evidence, and prior observations are ignored.
 */
export function createIdentityService(runtimeConfig: RuntimeConfig | unknown): ProductionIdentityService {
  const configuration = assessIdentityAnchorConfiguration(runtimeConfig);
  const code = configuration.disposition === "empty"
    ? "RHP_IDENTITY_ANCHORS_EMPTY" as const
    : "RHP_IDENTITY_CONFIGURATION_NOT_AUTHORIZED" as const;
  return Object.freeze({
    disposition: "identity-unknown" as const,
    code,
    configuration,
    anchorCount: 0 as const,
    discovery: "disabled" as const,
    trustOnFirstUse: "disabled" as const,
    coreIdentityAnchors: IDENTITY_ANCHORS,
    evaluateIssuer: (input: unknown) => evaluateInput("issuer", input, configuration),
    evaluateVerifier: (input: unknown) => evaluateInput("verifier", input, configuration),
    evaluateBvs: (input: unknown) => evaluateInput("bvs", input, configuration)
  });
}
