import type { RuntimeConfig } from "../config/runtime-config";
import {
  assessPublicEndpointConfiguration,
  type PublicEndpointConfigurationAssessment
} from "../config/public-endpoints";

export const UNAVAILABLE_CURRENT_HEAD_EVIDENCE = Object.freeze({
  result: "unknown" as const,
  issuerAuthoritative: false as const,
  source: null,
  retrievedAt: null,
  headManifestHash: undefined,
  network: "not-attempted" as const,
  cache: "not-consulted" as const,
  discovery: "not-attempted" as const,
  holderSuppliedEvidenceAccepted: false as const
});

export type CurrentHeadResolutionUnknown = Readonly<{
  result: "unknown";
  status: "unknown";
  error: "CURRENT_HEAD_UNKNOWN";
  code:
    | "RHP_CURRENT_HEAD_RESOLUTION_DISABLED"
    | "RHP_CURRENT_HEAD_CONFIGURATION_NOT_AUTHORIZED";
  currentHead: null;
  currentHeadEvidence: typeof UNAVAILABLE_CURRENT_HEAD_EVIDENCE;
}>;

export type ProductionCurrentHeadResolver = Readonly<{
  disposition: "unavailable";
  code: CurrentHeadResolutionUnknown["code"];
  endpointConfiguration: PublicEndpointConfigurationAssessment;
  networkAccess: "disabled";
  cacheAccess: "disabled";
  resolve(input: unknown): Promise<CurrentHeadResolutionUnknown>;
}>;

function unknown(code: CurrentHeadResolutionUnknown["code"]): CurrentHeadResolutionUnknown {
  return Object.freeze({
    result: "unknown" as const,
    status: "unknown" as const,
    error: "CURRENT_HEAD_UNKNOWN" as const,
    code,
    currentHead: null,
    currentHeadEvidence: UNAVAILABLE_CURRENT_HEAD_EVIDENCE
  });
}

/**
 * D2-A configures no issuer-authoritative current-head source. The input is
 * intentionally not interpreted: credential URIs, TLS origins, redirects,
 * cached values, and holder-supplied assertions cannot infer authority.
 */
export function createCurrentHeadResolver(
  runtimeConfig: RuntimeConfig | unknown
): ProductionCurrentHeadResolver {
  const endpointConfiguration = assessPublicEndpointConfiguration(runtimeConfig);
  const code = endpointConfiguration.disposition === "closed"
    ? "RHP_CURRENT_HEAD_RESOLUTION_DISABLED" as const
    : "RHP_CURRENT_HEAD_CONFIGURATION_NOT_AUTHORIZED" as const;
  return Object.freeze({
    disposition: "unavailable" as const,
    code,
    endpointConfiguration,
    networkAccess: "disabled" as const,
    cacheAccess: "disabled" as const,
    resolve: async (_input: unknown): Promise<CurrentHeadResolutionUnknown> => unknown(code)
  });
}

export async function resolveCurrentHead(
  input: unknown,
  runtimeConfig: RuntimeConfig | unknown
): Promise<CurrentHeadResolutionUnknown> {
  return createCurrentHeadResolver(runtimeConfig).resolve(input);
}
