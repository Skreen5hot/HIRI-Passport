// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { jcsBytes } from "../../src/core/canonical.mjs";
import { validatePresentationPackage } from "../../src/core/presentation-package.mjs";
import { validateMessageEnvelope } from "../../src/core/message.mjs";
import {
  ACQUISITION_IMPORT_LIMITS,
  importFromFile,
  importFromPaste,
  ImportSourceError
} from "../../app/src/adapters/import-source";
import type { ProductionResourceRegistryAssessment } from "../../app/src/adapters/pinned-resources";
import type { RuntimeConfig } from "../../app/src/config/runtime-config";
import { createAcquisitionService } from "../../app/src/services/acquisition-service";

const NOW = "2026-07-21T12:00:00Z";
const AUTHORITY = `key:ed25519:z${"1".repeat(32)}`;
const METHOD = `hiri://${AUTHORITY}/key/main#key-1`;
const HASH = `sha256:${"a".repeat(64)}`;

const sha256 = Object.freeze({
  digest: async (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest())
});

const runtimeConfig = Object.freeze({
  schema: "hiri:real-holder-preview-runtime-config:v1",
  releaseId: "real-holder-preview",
  canonicalOrigin: "https://hiri-protocol.org",
  artifactResolverOrigins: Object.freeze([]),
  issuerAuthoritativeCurrentHeadOrigins: Object.freeze([]),
  remoteResourceOrigins: Object.freeze([]),
  presentationDeliveryOrigins: Object.freeze([]),
  resourceManifestSha256: HASH,
  identityAnchorSetVersion: "rhp-2026-07-empty",
  policyVersion: "rhp-2026-07-none",
  supportedCapabilities: Object.freeze(["persistent-self-assertions"]),
  capabilityEvidence: Object.freeze({ sha256: HASH, notAfter: "2026-10-20T00:00:00Z" })
}) as RuntimeConfig;

const readyResources = Object.freeze({
  disposition: "ready" as const,
  code: "RHP_RESOURCE_REGISTRY_READY" as const,
  candidateReady: false as const,
  classification: "project preview resource" as const,
  manifestHash: HASH,
  resourceCount: 3,
  networkRetrieval: "disabled" as const,
  load: async () => Object.freeze({ result: "unknown" as const, error: "ARTIFACT_MISSING" as const }),
  validateSchema: async () => Object.freeze({ result: "valid" as const })
}) satisfies ProductionResourceRegistryAssessment;

const unavailableResources = Object.freeze({
  disposition: "unavailable" as const,
  code: "RHP_RESOURCE_MANIFEST_ABSENT" as const,
  ownerGate: "OWNER-RHP-03" as const,
  technicalBlocker: "OPEN-CONTEXT-01" as const,
  candidateReady: false as const,
  classification: "project preview resource" as const,
  resourceCount: 0 as const,
  networkRetrieval: "disabled" as const,
  load: async () => Object.freeze({ result: "unknown" as const, error: "ARTIFACT_MISSING" as const }),
  validateSchema: async () => Object.freeze({ result: "unknown" as const, error: "ARTIFACT_MISSING" as const })
}) satisfies ProductionResourceRegistryAssessment;

async function identifier(value: unknown): Promise<string> {
  const digest = await sha256.digest(jcsBytes(value));
  return `sha256:${[...digest].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function credentialPair(options: Readonly<{
  subject?: string;
  bvs?: boolean;
}> = {}) {
  const content: Record<string, unknown> = {
    "@type": "hiri:passport:CredentialClaim",
    schema: "https://hiri-protocol.org/resources/preview/rhp-2026-07/credential-claim.schema.json",
    schemaHash: HASH,
    credentialType: "PreviewMembershipCredential",
    subjectHolderAuthority: options.subject ?? AUTHORITY,
    claims: { membership: "example" },
    issuanceDate: "2026-07-21T11:00:00Z",
    status: { state: "active", effectiveAt: "2026-07-21T11:00:00Z" }
  };
  if (options.bvs) {
    content.evidence = {
      type: "hiri:passport:BvsEvidence",
      evidenceProfile: "https://hiri-protocol.org/resources/preview/rhp-2026-07/bvs-profile.json",
      evidenceProfileHash: HASH,
      sourceProvider: "example-provider",
      sourceVerificationMethod: "account-authentication",
      verifiedAt: "2026-07-21T11:00:00Z",
      adapterId: "example-adapter",
      adapterVersion: "1.0.0"
    };
  }
  const contentHash = await identifier(content);
  const manifest = {
    "@id": `hiri://${AUTHORITY}/data/credential-preview`,
    "@type": "hiri:ResolutionManifest",
    "hiri:version": "0",
    "hiri:content": { hash: contentHash, addressing: "raw-sha256", canonicalization: "JCS" },
    "hiri:signature": {
      type: "Ed25519Signature2020",
      canonicalization: "JCS",
      created: "2026-07-21T11:00:00Z",
      verificationMethod: METHOD,
      proofValue: "z1"
    }
  };
  return { manifest, content };
}

function verifier() {
  return Object.freeze({
    verifyManifest: async (input: unknown) => {
      const manifest = (input as { manifest: unknown }).manifest;
      return {
        result: "valid",
        authority: AUTHORITY,
        manifestHash: await identifier(manifest),
        keyState: "valid",
        chain: "valid"
      };
    }
  });
}

function randomId(fill: number): string {
  return Buffer.alloc(16, fill).toString("base64url");
}

function nonce(fill: number): string {
  return Buffer.alloc(32, fill).toString("base64url");
}

describe("bounded acquisition import sources", () => {
  it("records paste and explicit-file provenance without network or persistence claims", async () => {
    const paste = importFromPaste("{}", NOW);
    expect(paste.provenance).toMatchObject({
      source: "paste",
      originalByteLength: 2,
      network: "not-attempted",
      persistence: "not-performed",
      transportAuthenticated: false
    });

    const file = await importFromFile({
      name: "credential.json",
      size: 2,
      type: "application/json",
      arrayBuffer: async () => new TextEncoder().encode("{}").buffer
    }, NOW);
    expect(file.provenance).toMatchObject({ source: "file", fileName: "credential.json" });
    const first = file.bytes();
    first[0] = 0;
    expect(new TextDecoder().decode(file.bytes())).toBe("{}");
  });

  it("rejects declared-size mismatches, non-JSON media, and invalid UTF-8", async () => {
    await expect(importFromFile({
      name: "credential.json",
      size: 3,
      type: "application/json",
      arrayBuffer: async () => new Uint8Array([123, 125]).buffer
    }, NOW)).rejects.toMatchObject({ code: "RHP_IMPORT_SOURCE_INVALID" });
    await expect(importFromFile({
      name: "credential.txt",
      size: 2,
      type: "text/plain",
      arrayBuffer: async () => new Uint8Array([123, 125]).buffer
    }, NOW)).rejects.toBeInstanceOf(ImportSourceError);
    await expect(importFromFile({
      name: "credential.json",
      size: 2,
      type: "application/json",
      arrayBuffer: async () => new Uint8Array([0xc3, 0x28]).buffer
    }, NOW)).rejects.toMatchObject({ code: "RHP_IMPORT_ENCODING_INVALID" });
    expect(() => importFromPaste("x".repeat(ACQUISITION_IMPORT_LIMITS.bytes + 1), NOW))
      .toThrowError(expect.objectContaining({ code: "RHP_IMPORT_LIMIT_EXCEEDED" }));
  });
});

describe("real credential acquisition inspection", () => {
  it("fails closed before verification while production resources remain unapproved", async () => {
    const hiriVerifier = { verifyManifest: vi.fn() };
    const service = createAcquisitionService({ runtimeConfig, resources: unavailableResources, sha256, hiriVerifier });
    const imported = importFromPaste(JSON.stringify(await credentialPair()), NOW);
    const result = await service.inspect(imported, { now: NOW, holderAuthority: AUTHORITY });

    expect(result).toMatchObject({
      result: "blocked",
      code: "RHP_ACQUISITION_RESOURCES_UNAVAILABLE",
      canPersist: false,
      trusted: false,
      previewIssued: false,
      networkAccess: "disabled",
      persistence: "not-performed"
    });
    expect(result.evidence.resourceAvailability.state).toBe("unknown");
    expect(hiriVerifier.verifyManifest).not.toHaveBeenCalled();
    expect("persist" in service).toBe(false);
  });

  it("separates valid artifact checks from unknown identity/status and unevaluated policy", async () => {
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256, hiriVerifier: verifier() });
    const result = await service.inspect(importFromPaste(JSON.stringify(await credentialPair()), NOW), {
      now: NOW,
      holderAuthority: AUTHORITY
    });

    expect(result.result).toBe("inspection-only");
    expect(result.items[0].provenance).toBe("direct-issuer");
    expect(result.evidence).toMatchObject({
      structure: { state: "valid" },
      contentHash: { state: "valid" },
      signature: { state: "valid" },
      methodAuthorization: { state: "valid" },
      chain: { state: "valid" },
      schema: { state: "valid" },
      subjectBinding: { state: "valid" },
      status: { state: "unknown" },
      issuerIdentity: { state: "unknown" },
      policy: { state: "not-evaluated" },
      cryptography: { state: "valid" }
    });
    expect(result.canPersist).toBe(false);
  });

  it("blocks content tampering and holder-subject mismatches independently", async () => {
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256, hiriVerifier: verifier() });
    const tampered = await credentialPair();
    (tampered.content.claims as Record<string, string>).membership = "tampered";
    const tamperResult = await service.inspect(importFromPaste(JSON.stringify(tampered), NOW), { now: NOW, holderAuthority: AUTHORITY });
    expect(tamperResult.result).toBe("blocked");
    expect(tamperResult.evidence.contentHash.state).toBe("invalid");

    const mismatch = await service.inspect(importFromPaste(JSON.stringify(await credentialPair({ subject: `key:ed25519:z${"1".repeat(31)}2` })), NOW), {
      now: NOW,
      holderAuthority: AUTHORITY
    });
    expect(mismatch.result).toBe("blocked");
    expect(mismatch.evidence.subjectBinding.state).toBe("invalid");
  });

  it("keeps BVS procedure and organizational identity unknown when no profile or anchor exists", async () => {
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256, hiriVerifier: verifier() });
    const result = await service.inspect(importFromPaste(JSON.stringify(await credentialPair({ bvs: true })), NOW), {
      now: NOW,
      holderAuthority: AUTHORITY
    });
    expect(result.result).toBe("inspection-only");
    expect(result.items[0].provenance).toBe("bvs");
    expect(result.evidence.bvsProfile).toMatchObject({ state: "unknown", code: "BVP_PROFILE_UNAVAILABLE" });
    expect(result.evidence.bvsIdentity.state).toBe("unknown");
    expect(result.trusted).toBe(false);
  });

  it("does not accept malformed success output from an injected HIRI verifier", async () => {
    const service = createAcquisitionService({
      runtimeConfig,
      resources: readyResources,
      sha256,
      hiriVerifier: { verifyManifest: async () => ({ result: "valid", authority: "issuer", manifestHash: "bad", chain: "valid" }) }
    });
    const result = await service.inspect(importFromPaste(JSON.stringify(await credentialPair()), NOW), {
      now: NOW,
      holderAuthority: AUTHORITY
    });
    expect(result.result).toBe("blocked");
    expect(result.evidence.signature).toMatchObject({ state: "invalid", code: "RHP_HIRI_VERIFIER_OUTPUT_INVALID" });
  });

  it("rejects duplicate JSON members and the prototype HIRICredential look-alike", async () => {
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256 });
    const duplicate = await service.inspect(importFromPaste('{"manifest":{},"manifest":{},"content":{}}', NOW), { now: NOW });
    expect(duplicate).toMatchObject({ result: "blocked", code: "RHP_ACQUISITION_INVALID" });
    const lookAlike = await service.inspect(importFromPaste('{"type":"HIRICredential"}', NOW), { now: NOW });
    expect(lookAlike).toMatchObject({ result: "blocked", code: "RHP_ACQUISITION_UNSUPPORTED" });
  });

  it("hash-checks referenced package artifacts but never treats the unsigned package as signed", async () => {
    const pair = await credentialPair();
    const manifestHash = await identifier(pair.manifest);
    const contentHash = await identifier(pair.content);
    const presentation = {
      protocol: "hiri-passport/2.0",
      type: "PassportPresentation",
      presentationId: randomId(1),
      holder: { authority: AUTHORITY, verificationMethod: METHOD },
      requestBinding: { requestId: randomId(2), nonce: nonce(3), verifierAuthority: AUTHORITY },
      credentialPresentations: [{
        presentationItemId: randomId(4),
        requestItemId: randomId(5),
        provenance: "direct-issuer",
        disclosureMode: "public",
        credentialRef: {
          uri: pair.manifest["@id"],
          manifestHash,
          contentHash
        }
      }],
      selfAssertions: [],
      createdAt: "2026-07-21T11:59:00Z",
      expiresAt: "2026-07-21T12:04:00Z",
      proof: {
        type: "Ed25519Signature2020",
        canonicalization: "JCS",
        created: "2026-07-21T11:59:00Z",
        verificationMethod: METHOD,
        proofPurpose: "authentication",
        proofValue: "z1"
      }
    };
    const packageValue = {
      protocol: "hiri-passport/2.0",
      type: "PassportPresentationPackage",
      presentation,
      artifacts: [
        { kind: "hiriManifest", manifestHash, value: pair.manifest },
        { kind: "jsonContent", contentHash, canonicalization: "JCS", value: pair.content }
      ]
    };
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256, hiriVerifier: verifier() });
    expect(() => validatePresentationPackage(packageValue)).not.toThrow();
    expect(() => validateMessageEnvelope(presentation, "PassportPresentation", NOW)).not.toThrow();
    const result = await service.inspect(importFromPaste(JSON.stringify(packageValue), NOW), { now: NOW, holderAuthority: AUTHORITY });

    expect(result).toMatchObject({ result: "inspection-only", kind: "presentation-package", canPersist: false });
    expect(result.evidence.contentHash.state).toBe("valid");
    expect(result.evidence.signature).toMatchObject({ state: "unknown", code: "RHP_PRESENTATION_SIGNATURE_NOT_VERIFIED" });
    expect(result.evidence.cryptography.state).toBe("unknown");
  });

  it("rejects sender-declared BVS provenance when the verified content is a direct credential", async () => {
    const pair = await credentialPair();
    const manifestHash = await identifier(pair.manifest);
    const contentHash = await identifier(pair.content);
    const packageValue = {
      protocol: "hiri-passport/2.0",
      type: "PassportPresentationPackage",
      presentation: {
        protocol: "hiri-passport/2.0",
        type: "PassportPresentation",
        presentationId: randomId(6),
        holder: { authority: AUTHORITY, verificationMethod: METHOD },
        requestBinding: { requestId: randomId(7), nonce: nonce(8), verifierAuthority: AUTHORITY },
        credentialPresentations: [{
          presentationItemId: randomId(9),
          requestItemId: randomId(10),
          provenance: "bvs",
          disclosureMode: "public",
          credentialRef: { uri: pair.manifest["@id"], manifestHash, contentHash }
        }],
        selfAssertions: [],
        createdAt: "2026-07-21T11:59:00Z",
        expiresAt: "2026-07-21T12:04:00Z",
        proof: {
          type: "Ed25519Signature2020",
          canonicalization: "JCS",
          created: "2026-07-21T11:59:00Z",
          verificationMethod: METHOD,
          proofPurpose: "authentication",
          proofValue: "z1"
        }
      },
      artifacts: [
        { kind: "hiriManifest", manifestHash, value: pair.manifest },
        { kind: "jsonContent", contentHash, canonicalization: "JCS", value: pair.content }
      ]
    };
    const service = createAcquisitionService({ runtimeConfig, resources: readyResources, sha256, hiriVerifier: verifier() });
    const result = await service.inspect(importFromPaste(JSON.stringify(packageValue), NOW), { now: NOW, holderAuthority: AUTHORITY });
    expect(result.result).toBe("blocked");
    expect(result.items[0].provenance).toBe("direct-issuer");
    expect(result.items[0].evidence.structure).toMatchObject({ state: "invalid", code: "PROVENANCE_MISMATCH" });
  });
});
