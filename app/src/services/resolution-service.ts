import {
  createArtifactResolver,
  type ArtifactResolutionUnknown
} from "../adapters/artifact-resolver";
import {
  createCurrentHeadResolver,
  type CurrentHeadResolutionUnknown
} from "../adapters/current-head-resolver";
import {
  assessPublicEndpointConfiguration,
  type PublicEndpointConfigurationAssessment
} from "../config/public-endpoints";
import type { RuntimeConfig } from "../config/runtime-config";

export type ResolutionService = Readonly<{
  disposition: "unavailable";
  code: "RHP_RESOLUTION_DISABLED" | "RHP_RESOLUTION_CONFIGURATION_NOT_AUTHORIZED";
  endpointConfiguration: PublicEndpointConfigurationAssessment;
  networkAccess: "disabled";
  cacheAccess: "disabled";
  discovery: "disabled";
  resolveArtifact(reference: unknown): Promise<ArtifactResolutionUnknown>;
  resolveCurrentHead(input: unknown): Promise<CurrentHeadResolutionUnknown>;
  coreArtifactResolver: Readonly<{ resolve(reference: unknown): Promise<null> }>;
}>;

/**
 * Production composition for the D2-A resolver boundary. No transport or cache
 * dependency is accepted, so callers cannot accidentally activate network or
 * stale-evidence behavior through dependency injection.
 */
export function createResolutionService(runtimeConfig: RuntimeConfig | unknown): ResolutionService {
  const endpointConfiguration = assessPublicEndpointConfiguration(runtimeConfig);
  const artifactResolver = createArtifactResolver(runtimeConfig);
  const currentHeadResolver = createCurrentHeadResolver(runtimeConfig);
  const code = endpointConfiguration.disposition === "closed"
    ? "RHP_RESOLUTION_DISABLED" as const
    : "RHP_RESOLUTION_CONFIGURATION_NOT_AUTHORIZED" as const;

  return Object.freeze({
    disposition: "unavailable" as const,
    code,
    endpointConfiguration,
    networkAccess: "disabled" as const,
    cacheAccess: "disabled" as const,
    discovery: "disabled" as const,
    resolveArtifact: artifactResolver.resolve,
    resolveCurrentHead: currentHeadResolver.resolve,
    coreArtifactResolver: artifactResolver.corePort
  });
}
