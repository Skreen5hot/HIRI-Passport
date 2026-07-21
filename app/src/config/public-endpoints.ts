import type { RuntimeConfig } from "./runtime-config";

const EMPTY_ORIGINS = Object.freeze([] as string[]);

/**
 * RHP-DR-002 D2-A is the complete production endpoint authorization for this
 * release. A successor signed decision is required before either set can gain
 * an entry.
 */
export const PUBLIC_ENDPOINTS = Object.freeze({
  authority: "RHP-DR-002 D2-A" as const,
  artifactResolverOrigins: EMPTY_ORIGINS,
  issuerAuthoritativeCurrentHeadOrigins: EMPTY_ORIGINS,
  networkAccess: "disabled" as const,
  discovery: "disabled" as const,
  redirects: "disabled" as const,
  candidateReady: false as const,
  technicalBlocker: "OPEN-HEAD-01" as const
});

export type ClosedPublicEndpointConfiguration = Readonly<{
  disposition: "closed";
  code: "RHP_PUBLIC_ENDPOINTS_EMPTY";
  authority: typeof PUBLIC_ENDPOINTS.authority;
  artifactResolverOrigins: readonly [];
  issuerAuthoritativeCurrentHeadOrigins: readonly [];
  networkAccess: "disabled";
  discovery: "disabled";
  redirects: "disabled";
  candidateReady: false;
  technicalBlocker: "OPEN-HEAD-01";
}>;

export type RejectedPublicEndpointConfiguration = Readonly<{
  disposition: "not-authorized";
  code: "RHP_PUBLIC_ENDPOINT_CONFIGURATION_INVALID" | "RHP_PUBLIC_ENDPOINTS_NOT_AUTHORIZED";
  authority: typeof PUBLIC_ENDPOINTS.authority;
  networkAccess: "disabled";
  discovery: "disabled";
  redirects: "disabled";
  candidateReady: false;
  technicalBlocker: "OPEN-HEAD-01";
}>;

export type PublicEndpointConfigurationAssessment =
  | ClosedPublicEndpointConfiguration
  | RejectedPublicEndpointConfiguration;

function rejected(code: RejectedPublicEndpointConfiguration["code"]): RejectedPublicEndpointConfiguration {
  return Object.freeze({
    disposition: "not-authorized" as const,
    code,
    authority: PUBLIC_ENDPOINTS.authority,
    networkAccess: "disabled" as const,
    discovery: "disabled" as const,
    redirects: "disabled" as const,
    candidateReady: false as const,
    technicalBlocker: "OPEN-HEAD-01" as const
  });
}

/**
 * Defensively rechecks parsed runtime configuration at the adapter boundary.
 * Type assertions, object substitution, and future parser changes therefore
 * cannot turn a non-empty endpoint set into an authorized runtime capability.
 */
export function assessPublicEndpointConfiguration(
  runtimeConfig: RuntimeConfig | unknown
): PublicEndpointConfigurationAssessment {
  if (!runtimeConfig || typeof runtimeConfig !== "object" || Array.isArray(runtimeConfig)) {
    return rejected("RHP_PUBLIC_ENDPOINT_CONFIGURATION_INVALID");
  }

  let artifactResolverOrigins: unknown;
  let issuerAuthoritativeCurrentHeadOrigins: unknown;
  try {
    const candidate = runtimeConfig as Record<string, unknown>;
    artifactResolverOrigins = candidate.artifactResolverOrigins;
    issuerAuthoritativeCurrentHeadOrigins = candidate.issuerAuthoritativeCurrentHeadOrigins;
  } catch {
    return rejected("RHP_PUBLIC_ENDPOINT_CONFIGURATION_INVALID");
  }

  if (!Array.isArray(artifactResolverOrigins) || !Array.isArray(issuerAuthoritativeCurrentHeadOrigins)) {
    return rejected("RHP_PUBLIC_ENDPOINT_CONFIGURATION_INVALID");
  }
  if (artifactResolverOrigins.length !== 0 || issuerAuthoritativeCurrentHeadOrigins.length !== 0) {
    return rejected("RHP_PUBLIC_ENDPOINTS_NOT_AUTHORIZED");
  }

  return Object.freeze({
    disposition: "closed" as const,
    code: "RHP_PUBLIC_ENDPOINTS_EMPTY" as const,
    authority: PUBLIC_ENDPOINTS.authority,
    artifactResolverOrigins: Object.freeze([]) as readonly [],
    issuerAuthoritativeCurrentHeadOrigins: Object.freeze([]) as readonly [],
    networkAccess: "disabled" as const,
    discovery: "disabled" as const,
    redirects: "disabled" as const,
    candidateReady: false as const,
    technicalBlocker: "OPEN-HEAD-01" as const
  });
}
