import type { RuntimeConfig } from "./runtime-config";

export const APPROVED_IDENTITY_ANCHOR_SET_VERSION = "rhp-d2-a-empty-v1" as const;
export const IDENTITY_ANCHORS = Object.freeze([]) as readonly [];

export const IDENTITY_ANCHOR_CONFIGURATION = Object.freeze({
  authority: "RHP-DR-002 D2-A" as const,
  version: APPROVED_IDENTITY_ANCHOR_SET_VERSION,
  verifierIdentityAnchors: IDENTITY_ANCHORS,
  issuerIdentityAnchors: IDENTITY_ANCHORS,
  bvsIdentityAnchors: IDENTITY_ANCHORS,
  discovery: "disabled" as const,
  trustOnFirstUse: "disabled" as const,
  networkAccess: "disabled" as const,
  candidateReady: false as const
});

export type IdentityAnchorConfigurationAssessment = Readonly<{
  disposition: "empty" | "not-authorized";
  code:
    | "RHP_IDENTITY_ANCHORS_EMPTY"
    | "RHP_IDENTITY_ANCHOR_CONFIGURATION_INVALID"
    | "RHP_IDENTITY_ANCHOR_CONFIGURATION_NOT_AUTHORIZED";
  authority: typeof IDENTITY_ANCHOR_CONFIGURATION.authority;
  version: typeof APPROVED_IDENTITY_ANCHOR_SET_VERSION;
  anchors: readonly [];
  discovery: "disabled";
  trustOnFirstUse: "disabled";
  networkAccess: "disabled";
  candidateReady: false;
}>;

const INJECTION_MEMBERS = Object.freeze([
  "identityAnchors",
  "issuerIdentityAnchors",
  "verifierIdentityAnchors",
  "bvsIdentityAnchors",
  "anchors",
  "identityAnchor"
]);

function assessment(
  disposition: IdentityAnchorConfigurationAssessment["disposition"],
  code: IdentityAnchorConfigurationAssessment["code"]
): IdentityAnchorConfigurationAssessment {
  return Object.freeze({
    disposition,
    code,
    authority: IDENTITY_ANCHOR_CONFIGURATION.authority,
    version: APPROVED_IDENTITY_ANCHOR_SET_VERSION,
    anchors: IDENTITY_ANCHORS,
    discovery: "disabled" as const,
    trustOnFirstUse: "disabled" as const,
    networkAccess: "disabled" as const,
    candidateReady: false as const
  });
}

/**
 * Rechecks the production configuration at the service boundary. The only
 * approved set is the exact empty D2-A set; runtime anchor injection is not an
 * extension point.
 */
export function assessIdentityAnchorConfiguration(
  runtimeConfig: RuntimeConfig | unknown
): IdentityAnchorConfigurationAssessment {
  if (!runtimeConfig || typeof runtimeConfig !== "object" || Array.isArray(runtimeConfig)) {
    return assessment("not-authorized", "RHP_IDENTITY_ANCHOR_CONFIGURATION_INVALID");
  }
  let version: unknown;
  try {
    const candidate = runtimeConfig as Record<string, unknown>;
    if (INJECTION_MEMBERS.some(member => Object.hasOwn(candidate, member))) {
      return assessment("not-authorized", "RHP_IDENTITY_ANCHOR_CONFIGURATION_NOT_AUTHORIZED");
    }
    version = candidate.identityAnchorSetVersion;
  } catch {
    return assessment("not-authorized", "RHP_IDENTITY_ANCHOR_CONFIGURATION_INVALID");
  }
  if (version !== APPROVED_IDENTITY_ANCHOR_SET_VERSION) {
    return assessment("not-authorized", "RHP_IDENTITY_ANCHOR_CONFIGURATION_NOT_AUTHORIZED");
  }
  return assessment("empty", "RHP_IDENTITY_ANCHORS_EMPTY");
}
