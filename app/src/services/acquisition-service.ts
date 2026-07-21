import { jcsBytes } from "../../../src/core/canonical.mjs";
import { validateCoreBvsEvidence } from "../../../src/core/bvs-evidence.mjs";
import { validateCredentialClaim } from "../../../src/core/credential.mjs";
import { verifyPassportManifest } from "../../../src/core/manifest.mjs";
import {
  PACKAGE_LIMITS,
  resolvePackageArtifacts,
  validatePresentationPackage
} from "../../../src/core/presentation-package.mjs";
import { sha256Identifier } from "../../../src/core/proof.mjs";
import {
  assertClosedObject,
  methodAuthority,
  parseAbsoluteUri,
  parseEd25519Authority,
  parseNonce,
  parseRandomId,
  parseSha256Identifier,
  parseUtcSeconds
} from "../../../src/core/scalars.mjs";
import { validateMessageEnvelope } from "../../../src/core/message.mjs";
import { parseStrictJson } from "../../../src/sdk/strict-json.mjs";
import type { ImportedJsonDocument, ImportProvenance } from "../adapters/import-source";
import type { ProductionResourceRegistryAssessment } from "../adapters/pinned-resources";
import type { RuntimeConfig } from "../config/runtime-config";
import { createIdentityService } from "./identity-service";
import { createPolicyService } from "./policy-service";
import { createResolutionService } from "./resolution-service";

export type AcquisitionEvidenceState = "valid" | "invalid" | "unknown" | "not-evaluated";

export type AcquisitionEvidence = Readonly<{
  state: AcquisitionEvidenceState;
  code: string;
}>;

export type AcquisitionEvidenceSet = Readonly<{
  structure: AcquisitionEvidence;
  resourceAvailability: AcquisitionEvidence;
  contentHash: AcquisitionEvidence;
  signature: AcquisitionEvidence;
  methodAuthorization: AcquisitionEvidence;
  chain: AcquisitionEvidence;
  schema: AcquisitionEvidence;
  subjectBinding: AcquisitionEvidence;
  status: AcquisitionEvidence;
  issuerIdentity: AcquisitionEvidence;
  bvsProfile: AcquisitionEvidence;
  bvsIdentity: AcquisitionEvidence;
  policy: AcquisitionEvidence;
  cryptography: AcquisitionEvidence;
}>;

export type AcquisitionItem = Readonly<{
  provenance: "direct-issuer" | "bvs" | "self-asserted-persistent" | "unknown";
  credentialType: string | null;
  issuerAuthority: string | null;
  subjectHolderAuthority: string | null;
  manifestHash: string | null;
  contentHash: string | null;
  schema: string | null;
  schemaHash: string | null;
  evidence: AcquisitionEvidenceSet;
}>;

export type AcquisitionInspection = Readonly<{
  result: "inspection-only" | "blocked";
  code:
    | "RHP_ACQUISITION_INSPECTION_ONLY"
    | "RHP_ACQUISITION_RESOURCES_UNAVAILABLE"
    | "RHP_ACQUISITION_INVALID"
    | "RHP_ACQUISITION_UNSUPPORTED";
  kind: "credential" | "presentation-package" | null;
  disposition: "inspection-only";
  trusted: false;
  previewIssued: false;
  canPersist: false;
  activation: "prohibited";
  networkAccess: "disabled";
  persistence: "not-performed";
  importHash: string;
  provenance: ImportProvenance;
  evidence: AcquisitionEvidenceSet;
  items: readonly AcquisitionItem[];
}>;

export type AcquisitionSha256 = Readonly<{
  digest(bytes: Uint8Array): Promise<Uint8Array>;
}>;

export type AcquisitionHiriVerifier = Readonly<{
  verifyManifest(input: unknown): Promise<unknown>;
}>;

export type AcquisitionService = Readonly<{
  disposition: "inspection-only";
  networkAccess: "disabled";
  persistence: "prohibited";
  inspect(
    imported: ImportedJsonDocument,
    context: Readonly<{ now: string; holderAuthority?: string }>
  ): Promise<AcquisitionInspection>;
}>;

type JsonRecord = Record<string, unknown>;

const VALID = (code: string): AcquisitionEvidence => Object.freeze({ state: "valid", code });
const INVALID = (code: string): AcquisitionEvidence => Object.freeze({ state: "invalid", code });
const UNKNOWN = (code: string): AcquisitionEvidence => Object.freeze({ state: "unknown", code });
const NOT_EVALUATED = (code: string): AcquisitionEvidence => Object.freeze({ state: "not-evaluated", code });

const UNKNOWN_EVIDENCE = Object.freeze({
  structure: UNKNOWN("RHP_EVIDENCE_NOT_INSPECTED"),
  resourceAvailability: UNKNOWN("RHP_RESOURCE_REGISTRY_UNAVAILABLE"),
  contentHash: UNKNOWN("RHP_EVIDENCE_NOT_INSPECTED"),
  signature: UNKNOWN("KEY_STATE_UNKNOWN"),
  methodAuthorization: UNKNOWN("KEY_STATE_UNKNOWN"),
  chain: UNKNOWN("KEY_STATE_UNKNOWN"),
  schema: UNKNOWN("ARTIFACT_MISSING"),
  subjectBinding: UNKNOWN("RHP_HOLDER_AUTHORITY_NOT_SUPPLIED"),
  status: UNKNOWN("CURRENT_HEAD_UNKNOWN"),
  issuerIdentity: UNKNOWN("RHP_IDENTITY_ANCHORS_EMPTY"),
  bvsProfile: UNKNOWN("RHP_BVS_NOT_APPLICABLE"),
  bvsIdentity: UNKNOWN("RHP_BVS_NOT_APPLICABLE"),
  policy: NOT_EVALUATED("RHP_POLICY_NOT_EVALUATED"),
  cryptography: UNKNOWN("RHP_EVIDENCE_NOT_INSPECTED")
}) satisfies AcquisitionEvidenceSet;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stateOf(result: unknown, fallback: string): AcquisitionEvidence {
  if (!isRecord(result)) return UNKNOWN(fallback);
  const code = typeof result.error === "string" ? result.error : fallback;
  if (result.result === "valid") return VALID(code === fallback ? "RHP_EVIDENCE_VALID" : code);
  if (result.result === "invalid") return INVALID(code);
  return UNKNOWN(code);
}

function aggregate(code: string, values: readonly AcquisitionEvidence[]): AcquisitionEvidence {
  if (values.some(value => value.state === "invalid")) return INVALID(code);
  if (values.length > 0 && values.every(value => value.state === "valid")) return VALID(code);
  return UNKNOWN(code);
}

function emptyItem(evidence: AcquisitionEvidenceSet): AcquisitionItem {
  return Object.freeze({
    provenance: "unknown" as const,
    credentialType: null,
    issuerAuthority: null,
    subjectHolderAuthority: null,
    manifestHash: null,
    contentHash: null,
    schema: null,
    schemaHash: null,
    evidence
  });
}

function safeString(value: unknown, maximum = 1024): string | null {
  if (typeof value !== "string" || [...value].length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  return value;
}

function credentialAuthority(manifest: JsonRecord): string | null {
  const uri = manifest["@id"];
  if (typeof uri !== "string" || !uri.startsWith("hiri://") || !uri.includes("/data/credential-")) return null;
  const authority = uri.slice("hiri://".length, uri.indexOf("/data/credential-"));
  try {
    parseEd25519Authority(authority);
    return authority;
  } catch {
    return null;
  }
}

function importedBytes(imported: ImportedJsonDocument): Uint8Array {
  if (!imported || typeof imported !== "object" || typeof imported.text !== "string" || typeof imported.bytes !== "function") {
    throw new TypeError("invalid imported document");
  }
  const bytes = imported.bytes();
  if (!(bytes instanceof Uint8Array) || bytes.length !== imported.provenance?.originalByteLength) {
    throw new TypeError("invalid imported document");
  }
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded !== imported.text) throw new TypeError("invalid imported document");
  return bytes;
}

function classify(value: unknown): "credential" | "presentation-package" | null {
  if (!isRecord(value)) return null;
  if (value.protocol === "hiri-passport/2.0" && value.type === "PassportPresentationPackage") {
    return "presentation-package";
  }
  const keys = Object.keys(value);
  if (keys.length === 2 && keys.includes("manifest") && keys.includes("content")) return "credential";
  return null;
}

function baseInspection(
  input: Readonly<{
    result: AcquisitionInspection["result"];
    code: AcquisitionInspection["code"];
    kind: AcquisitionInspection["kind"];
    importHash: string;
    provenance: ImportProvenance;
    evidence: AcquisitionEvidenceSet;
    items?: readonly AcquisitionItem[];
  }>
): AcquisitionInspection {
  return Object.freeze({
    result: input.result,
    code: input.code,
    kind: input.kind,
    disposition: "inspection-only" as const,
    trusted: false as const,
    previewIssued: false as const,
    canPersist: false as const,
    activation: "prohibited" as const,
    networkAccess: "disabled" as const,
    persistence: "not-performed" as const,
    importHash: input.importHash,
    provenance: Object.freeze({ ...input.provenance }),
    evidence: input.evidence,
    items: Object.freeze([...(input.items ?? [])])
  });
}

function validatePresentationForInspection(value: unknown, now: string): JsonRecord {
  const presentation = assertClosedObject(value, [
    "protocol", "type", "presentationId", "holder", "requestBinding", "credentialPresentations",
    "selfAssertions", "createdAt", "expiresAt", "proof"
  ], [
    "protocol", "type", "presentationId", "holder", "requestBinding", "credentialPresentations",
    "selfAssertions", "createdAt", "expiresAt", "proof"
  ], "Passport Presentation") as JsonRecord;
  validateMessageEnvelope(presentation, "PassportPresentation", now);

  const holder = assertClosedObject(presentation.holder, ["authority", "verificationMethod"], ["authority", "verificationMethod"], "holder") as JsonRecord;
  parseEd25519Authority(holder.authority);
  if (methodAuthority(holder.verificationMethod) !== holder.authority || holder.verificationMethod !== (presentation.proof as JsonRecord).verificationMethod) {
    throw new TypeError("holder method binding mismatch");
  }
  const requestBinding = assertClosedObject(
    presentation.requestBinding,
    ["requestId", "nonce", "verifierAuthority"],
    ["requestId", "nonce", "verifierAuthority"],
    "requestBinding"
  ) as JsonRecord;
  parseRandomId(requestBinding.requestId);
  parseNonce(requestBinding.nonce);
  parseEd25519Authority(requestBinding.verifierAuthority);
  if (!Array.isArray(presentation.credentialPresentations) || !Array.isArray(presentation.selfAssertions)) {
    throw new TypeError("presentation item collections must be arrays");
  }
  const ids = new Set<string>();
  const requestIds = new Set<string>();
  for (const candidate of presentation.credentialPresentations) {
    const item = assertClosedObject(candidate, ["presentationItemId", "requestItemId", "provenance", "disclosureMode", "credentialRef"], ["presentationItemId", "requestItemId", "provenance", "disclosureMode", "credentialRef"], "credential presentation") as JsonRecord;
    parseRandomId(item.presentationItemId);
    parseRandomId(item.requestItemId);
    if (ids.has(item.presentationItemId as string) || requestIds.has(item.requestItemId as string)) throw new TypeError("duplicate presentation item");
    ids.add(item.presentationItemId as string);
    requestIds.add(item.requestItemId as string);
    if (!["direct-issuer", "bvs", "self-asserted-persistent"].includes(item.provenance as string) || item.disclosureMode !== "public") {
      throw new TypeError("unsupported credential presentation");
    }
    const ref = assertClosedObject(item.credentialRef, ["uri", "manifestHash", "contentHash"], ["uri", "manifestHash", "contentHash"], "credentialRef") as JsonRecord;
    if (!credentialAuthority({ "@id": ref.uri })) throw new TypeError("invalid credential URI");
    parseSha256Identifier(ref.manifestHash);
    parseSha256Identifier(ref.contentHash);
  }
  for (const candidate of presentation.selfAssertions) {
    const item = assertClosedObject(candidate, [
      "presentationItemId", "requestItemId", "provenance", "schema", "schemaHash", "claims"
    ], [
      "presentationItemId", "requestItemId", "provenance", "schema", "schemaHash", "claims"
    ], "ephemeral self-assertion") as JsonRecord;
    parseRandomId(item.presentationItemId);
    parseRandomId(item.requestItemId);
    if (ids.has(item.presentationItemId as string) || requestIds.has(item.requestItemId as string)) throw new TypeError("duplicate presentation item");
    ids.add(item.presentationItemId as string);
    requestIds.add(item.requestItemId as string);
    if (item.provenance !== "self-asserted-ephemeral" || !isRecord(item.claims)) {
      throw new TypeError("invalid ephemeral self-assertion");
    }
    parseAbsoluteUri(item.schema);
    parseSha256Identifier(item.schemaHash);
  }
  return presentation;
}

function invalidEvidence(structureCode = "RHP_ACQUISITION_INVALID"): AcquisitionEvidenceSet {
  return Object.freeze({
    ...UNKNOWN_EVIDENCE,
    structure: INVALID(structureCode),
    cryptography: INVALID(structureCode)
  });
}

function unavailableEvidence(): AcquisitionEvidenceSet {
  return Object.freeze({
    ...UNKNOWN_EVIDENCE,
    structure: VALID("RHP_IMPORT_STRUCTURE_CLASSIFIED"),
    resourceAvailability: UNKNOWN("RHP_RESOURCE_REGISTRY_UNAVAILABLE")
  });
}

async function inspectCredential(
  carrier: JsonRecord,
  context: Readonly<{ now: string; holderAuthority?: string }>,
  dependencies: Readonly<{
    runtimeConfig: RuntimeConfig;
    resources: ProductionResourceRegistryAssessment;
    sha256: AcquisitionSha256;
    hiriVerifier?: AcquisitionHiriVerifier;
  }>
): Promise<AcquisitionItem> {
  assertClosedObject(carrier, ["manifest", "content"], ["manifest", "content"], "local credential inspection pair");
  if (!isRecord(carrier.manifest) || !isRecord(carrier.content)) throw new TypeError("credential pair is invalid");
  const manifest = carrier.manifest;
  const content = carrier.content;
  const structureResult = validateCredentialClaim(content, { evaluationTime: context.now });
  const structure = stateOf(structureResult, "CREDENTIAL_SCHEMA_INVALID");

  let declaredContentHash: string | null = null;
  let contentHash = INVALID("HIRI_MANIFEST_INVALID");
  try {
    const declaration = manifest["hiri:content"] as JsonRecord;
    parseSha256Identifier(declaration.hash);
    declaredContentHash = declaration.hash as string;
    const actual = await sha256Identifier(jcsBytes(content), dependencies.sha256);
    contentHash = actual === declaredContentHash
      ? VALID("RHP_CONTENT_HASH_VALID")
      : INVALID("ARTIFACT_HASH_MISMATCH");
  } catch {
    contentHash = INVALID("HIRI_MANIFEST_INVALID");
  }

  let manifestResult: JsonRecord;
  try {
    manifestResult = await verifyPassportManifest({
      manifest,
      content,
      evaluationTime: context.now
    }, dependencies.hiriVerifier ? { hiriVerifier: dependencies.hiriVerifier } : {}) as JsonRecord;
  } catch {
    manifestResult = { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  }
  if (manifestResult.result === "valid") {
    try {
      parseEd25519Authority(manifestResult.authority);
      parseSha256Identifier(manifestResult.manifestHash);
    } catch {
      manifestResult = { result: "invalid", error: "RHP_HIRI_VERIFIER_OUTPUT_INVALID" };
    }
  }
  const signature = stateOf(manifestResult, "KEY_STATE_UNKNOWN");
  const chain = manifestResult.result === "valid"
    ? (manifestResult.chain === "valid" ? VALID("RHP_HIRI_CHAIN_VALID") : INVALID("HIRI_CHAIN_INVALID"))
    : manifestResult.result === "invalid" ? INVALID(String(manifestResult.error ?? "HIRI_CHAIN_INVALID")) : UNKNOWN("KEY_STATE_UNKNOWN");

  const issuerAuthority = credentialAuthority(manifest);
  const methodAuthorization = manifestResult.result === "valid" && issuerAuthority && manifestResult.authority === issuerAuthority
    ? VALID("RHP_SIGNATURE_METHOD_AUTHORIZED")
    : manifestResult.result === "valid"
      ? INVALID("SIGNATURE_METHOD_UNAUTHORIZED")
      : manifestResult.result === "invalid"
        ? INVALID(String(manifestResult.error ?? "SIGNATURE_METHOD_UNAUTHORIZED"))
        : UNKNOWN("KEY_STATE_UNKNOWN");

  let schema = UNKNOWN("ARTIFACT_MISSING");
  if (structure.state === "valid") {
    schema = stateOf(await dependencies.resources.validateSchema(
      content,
      content.schema as string,
      content.schemaHash as string,
      { maximumDepth: PACKAGE_LIMITS.jsonDepth, maximumStringLength: PACKAGE_LIMITS.stringLength }
    ), "ARTIFACT_MISSING");
  } else if (structure.state === "invalid") {
    schema = INVALID("CREDENTIAL_SCHEMA_INVALID");
  }

  let subjectBinding = UNKNOWN("RHP_HOLDER_AUTHORITY_NOT_SUPPLIED");
  if (context.holderAuthority !== undefined) {
    try {
      parseEd25519Authority(context.holderAuthority);
      subjectBinding = content.subjectHolderAuthority === context.holderAuthority
        ? VALID("RHP_SUBJECT_HOLDER_BINDING_VALID")
        : INVALID("RHP_SUBJECT_HOLDER_BINDING_INVALID");
    } catch {
      subjectBinding = INVALID("RHP_HOLDER_AUTHORITY_INVALID");
    }
  }

  const identityService = createIdentityService(dependencies.runtimeConfig);
  const issuerIdentity = issuerAuthority
    ? stateOf(identityService.evaluateIssuer({ authority: issuerAuthority, at: context.now }), "RHP_IDENTITY_ANCHORS_EMPTY")
    : UNKNOWN("RHP_IDENTITY_INPUT_INVALID");
  const resolutionService = createResolutionService(dependencies.runtimeConfig);
  const status = stateOf(await resolutionService.resolveCurrentHead({
    credentialUri: manifest["@id"],
    presentedManifestHash: manifestResult.manifestHash
  }), "CURRENT_HEAD_UNKNOWN");
  const policy = stateOf(createPolicyService(dependencies.runtimeConfig).evaluate({}), "RHP_POLICY_NOT_EVALUATED");

  const hasBvsEvidence = Object.hasOwn(content, "evidence");
  let bvsProfile = UNKNOWN("RHP_BVS_NOT_APPLICABLE");
  let bvsIdentity = UNKNOWN("RHP_BVS_NOT_APPLICABLE");
  if (hasBvsEvidence) {
    const evidence = isRecord(content.evidence) ? content.evidence : {};
    let profile: unknown;
    if (typeof evidence.evidenceProfile === "string" && typeof evidence.evidenceProfileHash === "string") {
      const loaded = await dependencies.resources.load(evidence.evidenceProfile, evidence.evidenceProfileHash, "profile");
      if (loaded.result === "valid" && isRecord(loaded.value)) {
        profile = Object.freeze({ ...loaded.value, hash: evidence.evidenceProfileHash });
      }
    }
    bvsProfile = stateOf(validateCoreBvsEvidence(content, {
      get: () => profile
    }), "BVP_PROFILE_UNAVAILABLE");
    bvsIdentity = issuerAuthority
      ? stateOf(identityService.evaluateBvs({ authority: issuerAuthority, at: context.now }), "RHP_IDENTITY_ANCHORS_EMPTY")
      : UNKNOWN("RHP_IDENTITY_INPUT_INVALID");
  }

  const cryptography = aggregate("RHP_CREDENTIAL_CRYPTOGRAPHY", [
    structure,
    contentHash,
    signature,
    methodAuthorization,
    chain,
    schema,
    subjectBinding
  ]);
  const evidence = Object.freeze({
    structure,
    resourceAvailability: VALID("RHP_RESOURCE_REGISTRY_READY"),
    contentHash,
    signature,
    methodAuthorization,
    chain,
    schema,
    subjectBinding,
    status,
    issuerIdentity,
    bvsProfile,
    bvsIdentity,
    policy: policy.state === "not-evaluated" ? policy : NOT_EVALUATED("RHP_POLICY_NOT_EVALUATED"),
    cryptography
  }) satisfies AcquisitionEvidenceSet;

  return Object.freeze({
    provenance: hasBvsEvidence ? "bvs" as const : "direct-issuer" as const,
    credentialType: safeString(content.credentialType),
    issuerAuthority,
    subjectHolderAuthority: safeString(content.subjectHolderAuthority),
    manifestHash: safeString(manifestResult.manifestHash),
    contentHash: declaredContentHash,
    schema: safeString(content.schema),
    schemaHash: safeString(content.schemaHash),
    evidence
  });
}

function aggregateItems(items: readonly AcquisitionItem[], structure: AcquisitionEvidence): AcquisitionEvidenceSet {
  const dimensions: (keyof AcquisitionEvidenceSet)[] = [
    "contentHash", "signature", "methodAuthorization", "chain", "schema", "subjectBinding",
    "status", "issuerIdentity", "bvsProfile", "bvsIdentity", "cryptography"
  ];
  const result = {
    ...UNKNOWN_EVIDENCE,
    structure,
    resourceAvailability: VALID("RHP_RESOURCE_REGISTRY_READY"),
    policy: NOT_EVALUATED("RHP_POLICY_NOT_EVALUATED")
  } as Record<keyof AcquisitionEvidenceSet, AcquisitionEvidence>;
  for (const dimension of dimensions) {
    result[dimension] = aggregate(`RHP_PACKAGE_${dimension.toUpperCase()}`, items.map(item => item.evidence[dimension]));
  }
  return Object.freeze(result) as AcquisitionEvidenceSet;
}

export function createAcquisitionService(dependencies: Readonly<{
  runtimeConfig: RuntimeConfig;
  resources: ProductionResourceRegistryAssessment;
  sha256: AcquisitionSha256;
  hiriVerifier?: AcquisitionHiriVerifier;
}>): AcquisitionService {
  const service = {
    disposition: "inspection-only" as const,
    networkAccess: "disabled" as const,
    persistence: "prohibited" as const,
    inspect: async (
      imported: ImportedJsonDocument,
      context: Readonly<{ now: string; holderAuthority?: string }>
    ): Promise<AcquisitionInspection> => {
      let importHash = "";
      let parsed: unknown;
      let kind: AcquisitionInspection["kind"] = null;
      try {
        parseUtcSeconds(context.now);
        const bytes = importedBytes(imported);
        importHash = await sha256Identifier(bytes, dependencies.sha256);
        parsed = parseStrictJson(imported.text, {
          maximumBytes: PACKAGE_LIMITS.packageBytes,
          maximumDepth: PACKAGE_LIMITS.jsonDepth,
          maximumStringLength: PACKAGE_LIMITS.stringLength
        });
        kind = classify(parsed);
      } catch {
        return baseInspection({
          result: "blocked",
          code: "RHP_ACQUISITION_INVALID",
          kind,
          importHash,
          provenance: imported?.provenance,
          evidence: invalidEvidence()
        });
      }

      if (!kind) {
        return baseInspection({
          result: "blocked",
          code: "RHP_ACQUISITION_UNSUPPORTED",
          kind: null,
          importHash,
          provenance: imported.provenance,
          evidence: invalidEvidence("RHP_ACQUISITION_UNSUPPORTED")
        });
      }

      if (dependencies.resources.disposition !== "ready") {
        const evidence = unavailableEvidence();
        return baseInspection({
          result: "blocked",
          code: "RHP_ACQUISITION_RESOURCES_UNAVAILABLE",
          kind,
          importHash,
          provenance: imported.provenance,
          evidence,
          items: [emptyItem(evidence)]
        });
      }

      try {
        if (kind === "credential") {
          const item = await inspectCredential(parsed as JsonRecord, context, dependencies);
          const blocked = Object.values(item.evidence).some(value => value.state === "invalid");
          return baseInspection({
            result: blocked ? "blocked" : "inspection-only",
            code: blocked ? "RHP_ACQUISITION_INVALID" : "RHP_ACQUISITION_INSPECTION_ONLY",
            kind,
            importHash,
            provenance: imported.provenance,
            evidence: item.evidence,
            items: [item]
          });
        }

        const packageValue = parsed as JsonRecord;
        validatePresentationPackage(packageValue);
        const presentation = validatePresentationForInspection(packageValue.presentation, context.now);
        const resolved = await resolvePackageArtifacts(
          packageValue,
          createResolutionService(dependencies.runtimeConfig).coreArtifactResolver,
          { sha256: dependencies.sha256 }
        ) as JsonRecord[];
        const itemInputs = presentation.credentialPresentations as JsonRecord[];
        const items: AcquisitionItem[] = [];
        for (let index = 0; index < itemInputs.length; index += 1) {
          const input = itemInputs[index];
          const manifestResolution = resolved[index * 2];
          const contentResolution = resolved[index * 2 + 1];
          if (manifestResolution?.result === "valid" && contentResolution?.result === "valid") {
            if (input.provenance === "self-asserted-persistent") {
              const hashes = aggregate("RHP_PACKAGE_ARTIFACT_INTEGRITY", [
                stateOf(manifestResolution, "ARTIFACT_MISSING"),
                stateOf(contentResolution, "ARTIFACT_MISSING")
              ]);
              const evidence = Object.freeze({
                ...UNKNOWN_EVIDENCE,
                structure: VALID("RHP_PRESENTATION_ITEM_STRUCTURE_VALID"),
                resourceAvailability: VALID("RHP_RESOURCE_REGISTRY_READY"),
                contentHash: hashes,
                policy: NOT_EVALUATED("RHP_POLICY_NOT_EVALUATED"),
                cryptography: UNKNOWN("RHP_SELF_ASSERTION_REQUIRES_HOLDER_VERIFICATION")
              }) satisfies AcquisitionEvidenceSet;
              items.push(Object.freeze({
                ...emptyItem(evidence),
                provenance: "self-asserted-persistent" as const,
                manifestHash: (input.credentialRef as JsonRecord).manifestHash as string,
                contentHash: (input.credentialRef as JsonRecord).contentHash as string
              }));
            } else {
              const inspected = await inspectCredential({
                manifest: manifestResolution.artifact,
                content: contentResolution.artifact
              }, context, dependencies);
              if (inspected.provenance !== input.provenance) {
                const mismatchEvidence = Object.freeze({
                  ...inspected.evidence,
                  structure: INVALID("PROVENANCE_MISMATCH"),
                  cryptography: INVALID("PROVENANCE_MISMATCH")
                }) satisfies AcquisitionEvidenceSet;
                items.push(Object.freeze({ ...inspected, evidence: mismatchEvidence }));
              } else {
                items.push(inspected);
              }
            }
          } else {
            const integrity = aggregate("RHP_PACKAGE_ARTIFACT_INTEGRITY", [
              stateOf(manifestResolution, "ARTIFACT_MISSING"),
              stateOf(contentResolution, "ARTIFACT_MISSING")
            ]);
            const evidence = Object.freeze({
              ...UNKNOWN_EVIDENCE,
              structure: VALID("RHP_PRESENTATION_ITEM_STRUCTURE_VALID"),
              resourceAvailability: VALID("RHP_RESOURCE_REGISTRY_READY"),
              contentHash: integrity,
              cryptography: integrity
            }) satisfies AcquisitionEvidenceSet;
            items.push(emptyItem(evidence));
          }
        }

        const evidence = aggregateItems(items, VALID("RHP_PRESENTATION_PACKAGE_STRUCTURE_VALID"));
        // A package is not accepted merely because its local artifacts hash.
        // Holder signature, request binding, and lifecycle verification need
        // verifier-side evidence that acquisition does not possess.
        const packageEvidence = Object.freeze({
          ...evidence,
          signature: UNKNOWN("RHP_PRESENTATION_SIGNATURE_NOT_VERIFIED"),
          methodAuthorization: UNKNOWN("RHP_PRESENTATION_METHOD_NOT_VERIFIED"),
          chain: UNKNOWN("RHP_PRESENTATION_LIFECYCLE_NOT_VERIFIED"),
          cryptography: evidence.cryptography.state === "invalid"
            ? evidence.cryptography
            : UNKNOWN("RHP_PRESENTATION_CRYPTOGRAPHY_INCOMPLETE")
        }) satisfies AcquisitionEvidenceSet;
        const blocked = Object.values(packageEvidence).some(value => value.state === "invalid");
        return baseInspection({
          result: blocked ? "blocked" : "inspection-only",
          code: blocked ? "RHP_ACQUISITION_INVALID" : "RHP_ACQUISITION_INSPECTION_ONLY",
          kind,
          importHash,
          provenance: imported.provenance,
          evidence: packageEvidence,
          items
        });
      } catch {
        return baseInspection({
          result: "blocked",
          code: "RHP_ACQUISITION_INVALID",
          kind,
          importHash,
          provenance: imported.provenance,
          evidence: invalidEvidence()
        });
      }
    }
  };
  return Object.freeze(service);
}

/**
 * Compatibility classifier retained for callers that have not yet composed
 * the production service. It never returns a credential record or a success
 * disposition and intentionally does not perform partial verification.
 */
export function reviewCredentialImport(text: string): Readonly<{
  result: "review" | "blocked";
  reasons: readonly string[];
}> {
  try {
    const value = parseStrictJson(text, {
      maximumBytes: PACKAGE_LIMITS.packageBytes,
      maximumDepth: PACKAGE_LIMITS.jsonDepth,
      maximumStringLength: PACKAGE_LIMITS.stringLength
    });
    return classify(value)
      ? Object.freeze({ result: "review" as const, reasons: Object.freeze(["RHP_ACQUISITION_SERVICE_REQUIRED"]) })
      : Object.freeze({ result: "blocked" as const, reasons: Object.freeze(["RHP_ACQUISITION_UNSUPPORTED"]) });
  } catch {
    return Object.freeze({ result: "blocked" as const, reasons: Object.freeze(["RHP_ACQUISITION_INVALID"]) });
  }
}
