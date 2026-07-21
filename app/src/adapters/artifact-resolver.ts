import type { RuntimeConfig } from "../config/runtime-config";
import {
  assessPublicEndpointConfiguration,
  type PublicEndpointConfigurationAssessment
} from "../config/public-endpoints";

const ARTIFACT_KINDS = Object.freeze(["hiriManifest", "jsonContent", "jsonSchema"] as const);
const SHA256 = /^sha256:[0-9a-f]{64}$/u;

export type ArtifactReference = Readonly<{
  kind: (typeof ARTIFACT_KINDS)[number];
  hash: string;
}>;

export const UNAVAILABLE_RESOLVER_PROVENANCE = Object.freeze({
  source: null,
  retrievedAt: null,
  transportAuthenticated: false as const,
  issuerAuthoritative: false as const,
  network: "not-attempted" as const,
  cache: "not-consulted" as const,
  discovery: "not-attempted" as const,
  redirects: "not-followed" as const
});

export type ArtifactResolutionUnknown = Readonly<{
  result: "unknown";
  error: "ARTIFACT_MISSING";
  code:
    | "RHP_ARTIFACT_RESOLUTION_DISABLED"
    | "RHP_ARTIFACT_RESOLVER_CONFIGURATION_NOT_AUTHORIZED"
    | "RHP_ARTIFACT_REFERENCE_INVALID";
  candidate: null;
  provenance: typeof UNAVAILABLE_RESOLVER_PROVENANCE;
}>;

export type ProductionArtifactResolver = Readonly<{
  disposition: "unavailable";
  code: "RHP_ARTIFACT_RESOLUTION_DISABLED" | "RHP_ARTIFACT_RESOLVER_CONFIGURATION_NOT_AUTHORIZED";
  endpointConfiguration: PublicEndpointConfigurationAssessment;
  networkAccess: "disabled";
  cacheAccess: "disabled";
  resolve(reference: unknown): Promise<ArtifactResolutionUnknown>;
  corePort: Readonly<{ resolve(reference: unknown): Promise<null> }>;
}>;

function validReference(value: unknown): value is ArtifactReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some(key => key !== "kind" && key !== "hash")) return false;
  if (!ARTIFACT_KINDS.includes(candidate.kind as ArtifactReference["kind"])) return false;
  if (typeof candidate.hash !== "string" || !SHA256.test(candidate.hash)) return false;
  const digest = candidate.hash.slice("sha256:".length);
  return !/^(.)\1{63}$/u.test(digest);
}

function unknown(code: ArtifactResolutionUnknown["code"]): ArtifactResolutionUnknown {
  return Object.freeze({
    result: "unknown" as const,
    error: "ARTIFACT_MISSING" as const,
    code,
    candidate: null,
    provenance: UNAVAILABLE_RESOLVER_PROVENANCE
  });
}

/**
 * Production resolver boundary for the signed empty D2-A configuration. It has
 * no URL, transport, cache, redirect, or discovery port to activate.
 */
export function createArtifactResolver(runtimeConfig: RuntimeConfig | unknown): ProductionArtifactResolver {
  const endpointConfiguration = assessPublicEndpointConfiguration(runtimeConfig);
  const code = endpointConfiguration.disposition === "closed"
    ? "RHP_ARTIFACT_RESOLUTION_DISABLED" as const
    : "RHP_ARTIFACT_RESOLVER_CONFIGURATION_NOT_AUTHORIZED" as const;

  const resolve = async (reference: unknown): Promise<ArtifactResolutionUnknown> => {
    if (!validReference(reference)) return unknown("RHP_ARTIFACT_REFERENCE_INVALID");
    return unknown(code);
  };

  // Passport-Core accepts a nullable candidate port. Returning null preserves
  // ARTIFACT_MISSING instead of manufacturing a resolver candidate.
  const corePort = Object.freeze({
    resolve: async (_reference: unknown): Promise<null> => null
  });

  return Object.freeze({
    disposition: "unavailable" as const,
    code,
    endpointConfiguration,
    networkAccess: "disabled" as const,
    cacheAccess: "disabled" as const,
    resolve,
    corePort
  });
}

export async function resolveArtifact(
  reference: unknown,
  runtimeConfig: RuntimeConfig | unknown
): Promise<ArtifactResolutionUnknown> {
  return createArtifactResolver(runtimeConfig).resolve(reference);
}
