import {
  createPinnedResourceRegistry,
  loadPinnedResource,
  validateWithPinnedSchema
} from "../../../src/core/resources.mjs";
import { bytesEqual } from "../../../src/core/canonical.mjs";
import type { RuntimeConfig } from "../config/runtime-config";
import {
  APPROVED_RESOURCE_BYTES,
  APPROVED_RESOURCE_MANIFEST_BYTES,
  APPROVED_RESOURCE_MANIFEST_SHA256,
  APPROVED_SCHEMA_VALIDATORS,
  RESOURCE_APPROVAL_STATUS
} from "../resources/catalog";
import {
  verifyResourcePackage,
  type ResourceKind,
  type ResourceSha256,
  type VerifiedResourcePackage
} from "../resources/resource-manifest";
import {
  createDraft202012SchemaValidator,
  type CompiledDraft202012Validator,
  type SchemaValidationLimits
} from "./schema-validator";

export type ResourceLoadResult =
  | Readonly<{
      result: "valid";
      value: unknown;
      bytes: Uint8Array;
      source: "packaged-project-preview-resource";
    }>
  | Readonly<{ result: "unknown"; error: "ARTIFACT_MISSING" }>
  | Readonly<{ result: "invalid"; error: "ARTIFACT_HASH_MISMATCH" }>;

export type ResourceSchemaResult =
  | Readonly<{ result: "valid" }>
  | Readonly<{ result: "unknown"; error: "ARTIFACT_MISSING" | "RESOURCE_LIMIT_EXCEEDED" }>
  | Readonly<{ result: "invalid"; error: "ARTIFACT_HASH_MISMATCH" | "CREDENTIAL_SCHEMA_INVALID" }>;

export type ProductionResourceRegistry = Readonly<{
  disposition: "ready";
  code: "RHP_RESOURCE_REGISTRY_READY";
  candidateReady: false;
  classification: "project preview resource";
  manifestHash: string;
  resourceCount: number;
  networkRetrieval: "disabled";
  load(id: string, hash: string, kind: ResourceKind): Promise<ResourceLoadResult>;
  validateSchema(
    value: unknown,
    uri: string,
    hash: string,
    limits?: SchemaValidationLimits
  ): Promise<ResourceSchemaResult>;
}>;

export type UnavailableProductionResourceRegistry = Readonly<{
  disposition: "unavailable";
  code: "RHP_RESOURCE_MANIFEST_ABSENT" | "RHP_RESOURCE_MANIFEST_NOT_APPROVED" |
    "RHP_RESOURCE_MANIFEST_INCOMPLETE" | "RHP_RESOURCE_VALIDATOR_MISSING";
  ownerGate: "OWNER-RHP-03";
  technicalBlocker: "OPEN-CONTEXT-01";
  candidateReady: false;
  classification: "project preview resource";
  resourceCount: 0;
  networkRetrieval: "disabled";
  load(id: string, hash: string, kind: ResourceKind): Promise<Readonly<{ result: "unknown"; error: "ARTIFACT_MISSING" }>>;
  validateSchema(
    value: unknown,
    uri: string,
    hash: string,
    limits?: SchemaValidationLimits
  ): Promise<Readonly<{ result: "unknown"; error: "ARTIFACT_MISSING" }>>;
}>;

export type ProductionResourceRegistryAssessment = ProductionResourceRegistry | UnavailableProductionResourceRegistry;

function unavailable(
  code: UnavailableProductionResourceRegistry["code"]
): UnavailableProductionResourceRegistry {
  const missing = async () => Object.freeze({ result: "unknown" as const, error: "ARTIFACT_MISSING" as const });
  return Object.freeze({
    disposition: "unavailable" as const,
    code,
    ownerGate: RESOURCE_APPROVAL_STATUS.ownerGate,
    technicalBlocker: RESOURCE_APPROVAL_STATUS.technicalBlocker,
    candidateReady: false as const,
    classification: RESOURCE_APPROVAL_STATUS.classification,
    resourceCount: 0 as const,
    networkRetrieval: "disabled" as const,
    load: missing,
    validateSchema: missing
  });
}

function preparedRegistry(
  resourcePackage: VerifiedResourcePackage,
  sha256: ResourceSha256,
  validators: readonly CompiledDraft202012Validator[]
): ProductionResourceRegistry | UnavailableProductionResourceRegistry {
  const schemas = resourcePackage.entries.filter(entry => entry.kind === "schema");
  const kinds = new Set(resourcePackage.entries.map(entry => entry.kind));
  if (!["configuration", "context", "schema"].every(kind => kinds.has(kind as ResourceKind))) {
    return unavailable("RHP_RESOURCE_MANIFEST_INCOMPLETE");
  }
  const schemaValidator = createDraft202012SchemaValidator(validators);
  if (schemas.some(entry => {
    const validator = validators.find(candidate => candidate.id === entry.id && candidate.sha256 === entry.sha256);
    return !validator || !bytesEqual(validator.schemaBytes, entry.bytes) || !schemaValidator.has(entry.id, entry.sha256);
  }) || validators.length !== schemas.length) {
    return unavailable("RHP_RESOURCE_VALIDATOR_MISSING");
  }
  const core = createPinnedResourceRegistry(resourcePackage.entries.map(entry => Object.freeze({
    id: entry.id,
    hash: entry.sha256,
    kind: entry.kind,
    bytes: new Uint8Array(entry.bytes),
    value: structuredClone(entry.value),
    source: entry.source
  })), {
    sha256,
    schemaValidator: (value: unknown, schema: unknown) => schemaValidator.validate(value, schema)
  });
  return Object.freeze({
    disposition: "ready" as const,
    code: "RHP_RESOURCE_REGISTRY_READY" as const,
    candidateReady: false as const,
    classification: resourcePackage.classification,
    manifestHash: resourcePackage.manifestHash,
    resourceCount: resourcePackage.entries.length,
    networkRetrieval: "disabled" as const,
    load: (id: string, hash: string, kind: ResourceKind) => loadPinnedResource(core, id, hash, kind) as Promise<ResourceLoadResult>,
    validateSchema: (
      value: unknown,
      uri: string,
      hash: string,
      limits: SchemaValidationLimits = {}
    ) => validateWithPinnedSchema(value, uri, hash, {
      maxDepth: limits.maximumDepth,
      maxStringLength: limits.maximumStringLength
    }, core) as Promise<ResourceSchemaResult>
  });
}

/**
 * The sole production constructor. It has no manifest/package injection point:
 * activation requires committed constants that bind an independently reviewed,
 * owner-signed package. Remote retrieval is deliberately not a capability.
 */
export async function createProductionResourceRegistry(input: Readonly<{
  runtimeConfig: RuntimeConfig;
  sha256: ResourceSha256;
}>): Promise<ProductionResourceRegistryAssessment> {
  if (input.runtimeConfig.remoteResourceOrigins.length !== 0) {
    return unavailable("RHP_RESOURCE_MANIFEST_NOT_APPROVED");
  }
  if (!APPROVED_RESOURCE_MANIFEST_SHA256 || !APPROVED_RESOURCE_MANIFEST_BYTES || APPROVED_RESOURCE_BYTES.length === 0) {
    return unavailable("RHP_RESOURCE_MANIFEST_ABSENT");
  }
  if (input.runtimeConfig.resourceManifestSha256 !== APPROVED_RESOURCE_MANIFEST_SHA256) {
    return unavailable("RHP_RESOURCE_MANIFEST_NOT_APPROVED");
  }
  const resourcePackage = await verifyResourcePackage({
    expectedManifestHash: APPROVED_RESOURCE_MANIFEST_SHA256,
    manifestBytes: APPROVED_RESOURCE_MANIFEST_BYTES,
    resources: APPROVED_RESOURCE_BYTES,
    sha256: input.sha256
  });
  return preparedRegistry(resourcePackage, input.sha256, APPROVED_SCHEMA_VALIDATORS);
}

/**
 * Review-tool composition for tests and independent package inspection. A
 * prepared registry is intentionally not returned as production-authorized.
 */
export function inspectVerifiedResourcePackage(
  resourcePackage: VerifiedResourcePackage,
  sha256: ResourceSha256,
  validators: readonly CompiledDraft202012Validator[] = Object.freeze([])
): Readonly<{
  disposition: "prepared-for-review";
  productionAuthorized: false;
  registry: ProductionResourceRegistry | UnavailableProductionResourceRegistry;
}> {
  return Object.freeze({
    disposition: "prepared-for-review" as const,
    productionAuthorized: false as const,
    registry: preparedRegistry(resourcePackage, sha256, validators)
  });
}
