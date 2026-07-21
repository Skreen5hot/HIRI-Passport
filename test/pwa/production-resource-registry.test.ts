// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hex, jcsBytes } from "../../src/core/canonical.mjs";
import {
  inspectVerifiedResourcePackage
} from "../../app/src/adapters/pinned-resources";
import {
  SchemaInspectionError,
  createDraft202012SchemaValidator,
  inspectDraft202012Schema,
  type CompiledDraft202012Validator
} from "../../app/src/adapters/schema-validator";
import {
  RESOURCE_MANIFEST_CLASSIFICATION,
  RESOURCE_MANIFEST_RELEASE,
  RESOURCE_MANIFEST_SCHEMA,
  RESOURCE_PREVIEW_NAMESPACE,
  ResourcePackageError,
  verifyResourcePackage,
  type PackagedResourceBytes,
  type ResourceManifestEntry,
  type ResourceSha256
} from "../../app/src/resources/resource-manifest";

const APPROVAL = "RHP-RESOURCE-APPROVAL-2026-07-A";
const CREATED_AT = "2026-07-21T12:00:00Z";
const sha256: ResourceSha256 = Object.freeze({
  digest: async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)))
});

async function hash(bytes: Uint8Array): Promise<string> {
  return `sha256:${hex(await sha256.digest(bytes))}`;
}

function id(kind: string, name: string): string {
  return `${RESOURCE_PREVIEW_NAMESPACE}${kind}/${name}/v1`;
}

function closedSchema(schemaId = id("schema", "holder-statement")) {
  return Object.freeze({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: schemaId,
    type: "object",
    properties: Object.freeze({
      statement: Object.freeze({ type: "string", minLength: 1, maxLength: 128 })
    }),
    required: Object.freeze(["statement"]),
    additionalProperties: false
  });
}

type PackageOverride = Readonly<{
  schema?: unknown;
  context?: unknown;
  configuration?: unknown;
  mutateEntries?: (entries: ResourceManifestEntry[]) => ResourceManifestEntry[];
  manifestTransform?: (manifest: Record<string, unknown>) => Record<string, unknown>;
}>;

async function packageFixture(override: PackageOverride = {}) {
  const resources = [
    {
      id: id("configuration", "runtime-shape"),
      kind: "configuration" as const,
      path: "resources/configuration/runtime-shape-v1.json",
      mediaType: "application/json" as const,
      value: override.configuration ?? Object.freeze({ classification: "project preview resource", enabled: false })
    },
    {
      id: id("context", "passport"),
      kind: "context" as const,
      path: "resources/context/passport-v1.json",
      mediaType: "application/json" as const,
      value: override.context ?? Object.freeze({
        "@context": Object.freeze({ statement: "https://hiri-protocol.org/vocab/statement" })
      })
    },
    {
      id: id("schema", "holder-statement"),
      kind: "schema" as const,
      path: "resources/schema/holder-statement-v1.json",
      mediaType: "application/schema+json" as const,
      value: override.schema ?? closedSchema()
    }
  ];
  const packaged: PackagedResourceBytes[] = [];
  let entries: ResourceManifestEntry[] = [];
  for (const resource of resources) {
    const bytes = jcsBytes(resource.value);
    packaged.push(Object.freeze({ path: resource.path, bytes }));
    entries.push(Object.freeze({
      id: resource.id,
      kind: resource.kind,
      version: "v1",
      sha256: await hash(bytes),
      canonicalization: "JCS",
      mediaType: resource.mediaType,
      bytesPath: resource.path,
      specification: resource.kind === "schema" ? "Core section 6.3" : "Resource governance section 4",
      approvalRecord: APPROVAL
    }));
  }
  entries = override.mutateEntries?.(entries) ?? entries;
  entries.sort((left, right) => left.id.localeCompare(right.id) || left.sha256.localeCompare(right.sha256));
  let manifest: Record<string, unknown> = {
    schema: RESOURCE_MANIFEST_SCHEMA,
    classification: RESOURCE_MANIFEST_CLASSIFICATION,
    candidateReady: false,
    releaseId: RESOURCE_MANIFEST_RELEASE,
    manifestVersion: "rhp-2026-07.1",
    generationScriptVersion: "resource-manifest-generator-1.0.0",
    sourceCommit: "1234567890abcdef1234567890abcdef12345678",
    approvalRecord: APPROVAL,
    createdAt: CREATED_AT,
    resourceCount: entries.length,
    resources: entries
  };
  manifest = override.manifestTransform?.(manifest) ?? manifest;
  const manifestBytes = jcsBytes(manifest);
  return { manifest, manifestBytes, manifestHash: await hash(manifestBytes), resources: packaged, entries };
}

function compile(schema: unknown, schemaHash: string): CompiledDraft202012Validator {
  return Object.freeze({
    id: (schema as { $id: string }).$id,
    sha256: schemaHash,
    schemaBytes: jcsBytes(schema),
    // This fixture stands in for reviewed build-generated standalone code. The
    // production table is empty until exact generated validators are approved.
    validate: value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      return Object.keys(record).length === 1 && typeof record.statement === "string" &&
        record.statement.length >= 1 && record.statement.length <= 128;
    }
  });
}

describe("production resource package verification", () => {
  it("verifies exact canonical bytes before preparing an offline-only, non-authorized registry", async () => {
    const fixture = await packageFixture();
    const verified = await verifyResourcePackage({
      expectedManifestHash: fixture.manifestHash,
      manifestBytes: fixture.manifestBytes,
      resources: fixture.resources,
      sha256
    });
    const schemaEntry = verified.entries.find(entry => entry.kind === "schema")!;
    const prepared = inspectVerifiedResourcePackage(verified, sha256, [compile(schemaEntry.value, schemaEntry.sha256)]);

    expect(verified).toMatchObject({
      manifestHash: fixture.manifestHash,
      candidateReady: false,
      classification: "project preview resource",
      manifest: { resourceCount: 3, approvalRecord: APPROVAL }
    });
    expect(verified.entries.every(entry => entry.source === "packaged-project-preview-resource")).toBe(true);
    expect(prepared).toMatchObject({
      disposition: "prepared-for-review",
      productionAuthorized: false,
      registry: {
        disposition: "ready",
        candidateReady: false,
        resourceCount: 3,
        networkRetrieval: "disabled"
      }
    });
    await expect(prepared.registry.load(schemaEntry.id, schemaEntry.sha256, "schema"))
      .resolves.toMatchObject({ result: "valid", source: "packaged-project-preview-resource" });
    await expect(prepared.registry.load(schemaEntry.id, schemaEntry.sha256, "context"))
      .resolves.toEqual({ result: "invalid", error: "ARTIFACT_HASH_MISMATCH" });
    await expect(prepared.registry.validateSchema({ statement: "holder statement" }, schemaEntry.id, schemaEntry.sha256))
      .resolves.toEqual({ result: "valid" });
    await expect(prepared.registry.validateSchema({ statement: "holder statement", extra: true }, schemaEntry.id, schemaEntry.sha256))
      .resolves.toMatchObject({ result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" });
    await expect(prepared.registry.load(schemaEntry.id, `sha256:${"abcdef01".repeat(8)}`, "schema"))
      .resolves.toEqual({ result: "unknown", error: "ARTIFACT_MISSING" });

    const substitutedSchema = { ...(schemaEntry.value as object), maxProperties: 1 };
    const substitutedValidator = compile(substitutedSchema, schemaEntry.sha256);
    expect(inspectVerifiedResourcePackage(verified, sha256, [substitutedValidator]).registry)
      .toMatchObject({ disposition: "unavailable", code: "RHP_RESOURCE_VALIDATOR_MISSING" });
  });

  it("hashes the manifest and every resource before parsing or registry construction", async () => {
    const fixture = await packageFixture();
    const changedManifest = new Uint8Array(fixture.manifestBytes);
    changedManifest[0] ^= 1;
    await expect(verifyResourcePackage({
      expectedManifestHash: fixture.manifestHash,
      manifestBytes: changedManifest,
      resources: fixture.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_MANIFEST_HASH_MISMATCH" });

    const changedResources = fixture.resources.map(resource => ({ ...resource, bytes: new Uint8Array(resource.bytes) }));
    changedResources[0].bytes[0] ^= 1;
    await expect(verifyResourcePackage({
      expectedManifestHash: fixture.manifestHash,
      manifestBytes: fixture.manifestBytes,
      resources: changedResources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_HASH_MISMATCH" });
  });

  it("rejects noncanonical manifests, unknown members, duplicates, missing bytes, and placeholder identifiers", async () => {
    const base = await packageFixture();
    const spaced = new TextEncoder().encode(JSON.stringify(base.manifest, null, 2));
    await expect(verifyResourcePackage({
      expectedManifestHash: await hash(spaced), manifestBytes: spaced, resources: base.resources, sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_MANIFEST_INVALID" });

    const unknown = await packageFixture({ manifestTransform: manifest => ({ ...manifest, surprise: true }) });
    await expect(verifyResourcePackage({
      expectedManifestHash: unknown.manifestHash, manifestBytes: unknown.manifestBytes, resources: unknown.resources, sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_MANIFEST_INVALID" });

    const duplicate = await packageFixture({
      mutateEntries: entries => [entries[0], entries[0], ...entries.slice(1)],
      manifestTransform: manifest => ({ ...manifest, resourceCount: 4 })
    });
    await expect(verifyResourcePackage({
      expectedManifestHash: duplicate.manifestHash,
      manifestBytes: duplicate.manifestBytes,
      resources: [...duplicate.resources, duplicate.resources[0]],
      sha256
    })).rejects.toBeInstanceOf(ResourcePackageError);

    await expect(verifyResourcePackage({
      expectedManifestHash: base.manifestHash,
      manifestBytes: base.manifestBytes,
      resources: base.resources.slice(1),
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_MISSING" });

    const placeholder = await packageFixture({
      mutateEntries: entries => entries.map((entry, index) => index === 0
        ? { ...entry, id: `${RESOURCE_PREVIEW_NAMESPACE}configuration/todo/v1` }
        : entry)
    });
    await expect(verifyResourcePackage({
      expectedManifestHash: placeholder.manifestHash,
      manifestBytes: placeholder.manifestBytes,
      resources: placeholder.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_MANIFEST_INVALID" });
  });

  it("rejects absolute schema references, remote context imports, and placeholder resource content", async () => {
    const remoteSchema = await packageFixture({
      schema: { ...closedSchema(), $ref: "https://unapproved.example/schema" }
    });
    await expect(verifyResourcePackage({
      expectedManifestHash: remoteSchema.manifestHash,
      manifestBytes: remoteSchema.manifestBytes,
      resources: remoteSchema.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_REFERENCE_PROHIBITED" });

    const remoteContext = await packageFixture({ context: { "@context": "https://unapproved.example/context" } });
    await expect(verifyResourcePackage({
      expectedManifestHash: remoteContext.manifestHash,
      manifestBytes: remoteContext.manifestBytes,
      resources: remoteContext.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_REFERENCE_PROHIBITED" });

    const remoteContextInArray = await packageFixture({
      context: { "@context": [{ statement: "https://hiri-protocol.org/vocab/statement" }, "https://remote.invalid/context"] }
    });
    await expect(verifyResourcePackage({
      expectedManifestHash: remoteContextInArray.manifestHash,
      manifestBytes: remoteContextInArray.manifestBytes,
      resources: remoteContextInArray.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_REFERENCE_PROHIBITED" });

    const placeholder = await packageFixture({ configuration: { value: "replace-me" } });
    await expect(verifyResourcePackage({
      expectedManifestHash: placeholder.manifestHash,
      manifestBytes: placeholder.manifestBytes,
      resources: placeholder.resources,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_PLACEHOLDER_PROHIBITED" });
  });

  it("enforces package limits before resource parsing", async () => {
    const fixture = await packageFixture();
    const oversized = fixture.resources.map((resource, index) => index === 0
      ? { ...resource, bytes: new Uint8Array(2 * 1024 * 1024 + 1) }
      : resource);
    await expect(verifyResourcePackage({
      expectedManifestHash: fixture.manifestHash,
      manifestBytes: fixture.manifestBytes,
      resources: oversized,
      sha256
    })).rejects.toMatchObject({ code: "RHP_RESOURCE_LIMIT_EXCEEDED" });
  });
});

describe("Draft 2020-12 standalone schema boundary", () => {
  it("accepts only the exact closed schema bytes paired with a compiled validator", async () => {
    const schema = closedSchema();
    const schemaBytes = jcsBytes(schema);
    const schemaHash = await hash(schemaBytes);
    const validator = createDraft202012SchemaValidator([compile(schema, schemaHash)]);
    expect(validator.has(schema.$id, schemaHash)).toBe(true);
    expect(validator.validate({ statement: "valid" }, schema)).toBe(true);
    expect(validator.validate({ statement: "valid", additional: true }, schema)).toBe(false);
    expect(validator.validate({ statement: "valid" }, { ...schema, maxProperties: 2 })).toBe(false);
  });

  it("rejects open shapes, non-2020-12 dialects, external references, and unreviewed formats", () => {
    expect(() => inspectDraft202012Schema({ ...closedSchema(), additionalProperties: true }))
      .toThrow(SchemaInspectionError);
    expect(() => inspectDraft202012Schema({ ...closedSchema(), $schema: "http://json-schema.org/draft-07/schema#" }))
      .toThrow(/invalid/iu);
    expect(() => inspectDraft202012Schema({ ...closedSchema(), $ref: "other.json" }))
      .toThrow(/external reference/iu);
    expect(() => inspectDraft202012Schema({
      ...closedSchema(),
      properties: { statement: { type: "string", format: "email" } }
    })).toThrow(/format/iu);
  });

  it("traverses schema locations without treating a property named required as a schema keyword", () => {
    expect(() => inspectDraft202012Schema({
      ...closedSchema(),
      properties: { required: { type: "boolean" } },
      required: ["required"]
    })).not.toThrow();
  });

  it("fails closed when no standalone validator is packaged", () => {
    const schema = closedSchema();
    const validator = createDraft202012SchemaValidator([]);
    expect(validator.validate({ statement: "structurally plausible" }, schema)).toBe(false);
  });

  it("contains no runtime Ajv compilation, Function constructor, or eval path", () => {
    const implementation = readFileSync(
      new URL("../../app/src/adapters/schema-validator.ts", import.meta.url),
      "utf8"
    );
    expect(implementation).not.toMatch(/from\s+["']ajv|new\s+Function|\beval\s*\(/u);
  });
});
