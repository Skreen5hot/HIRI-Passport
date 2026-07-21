import { bytesEqual, hex, jcsBytes } from "../../../src/core/canonical.mjs";
import { parseAbsoluteUri, parseSha256Identifier, parseUtcSeconds } from "../../../src/core/scalars.mjs";
import { parseStrictJson } from "../../../src/sdk/strict-json.mjs";

export const RESOURCE_MANIFEST_SCHEMA = "hiri-passport/project-preview-resource-manifest/1" as const;
export const RESOURCE_MANIFEST_CLASSIFICATION = "project preview resource" as const;
export const RESOURCE_MANIFEST_RELEASE = "real-holder-preview" as const;
export const RESOURCE_PREVIEW_NAMESPACE = "https://hiri-protocol.org/resources/preview/rhp-2026-07/" as const;
export const RESOURCE_MANIFEST_MAX_BYTES = 256 * 1024;
export const RESOURCE_MAX_BYTES = 2 * 1024 * 1024;
export const RESOURCE_PACKAGE_MAX_BYTES = 10 * 1024 * 1024;
export const RESOURCE_MANIFEST_MAX_ENTRIES = 128;

export const RESOURCE_KINDS = ["configuration", "context", "policy", "profile", "schema"] as const;
export const RESOURCE_CANONICALIZATIONS = ["JCS", "raw-bytes"] as const;
export const RESOURCE_MEDIA_TYPES = ["application/json", "application/schema+json", "text/plain"] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type ResourceCanonicalization = (typeof RESOURCE_CANONICALIZATIONS)[number];
export type ResourceMediaType = (typeof RESOURCE_MEDIA_TYPES)[number];

export type ResourceManifestEntry = Readonly<{
  id: string;
  kind: ResourceKind;
  version: string;
  sha256: string;
  canonicalization: ResourceCanonicalization;
  mediaType: ResourceMediaType;
  bytesPath: string;
  specification: string;
  approvalRecord: string;
}>;

export type ResourceManifest = Readonly<{
  schema: typeof RESOURCE_MANIFEST_SCHEMA;
  classification: typeof RESOURCE_MANIFEST_CLASSIFICATION;
  candidateReady: false;
  releaseId: typeof RESOURCE_MANIFEST_RELEASE;
  manifestVersion: string;
  generationScriptVersion: string;
  sourceCommit: string;
  approvalRecord: string;
  createdAt: string;
  resourceCount: number;
  resources: readonly ResourceManifestEntry[];
}>;

export type PackagedResourceBytes = Readonly<{
  path: string;
  bytes: Uint8Array;
}>;

export type VerifiedResourceEntry = ResourceManifestEntry & Readonly<{
  bytes: Uint8Array;
  value: unknown;
  source: "packaged-project-preview-resource";
}>;

export type VerifiedResourcePackage = Readonly<{
  manifest: ResourceManifest;
  manifestHash: string;
  manifestBytes: Uint8Array;
  entries: readonly VerifiedResourceEntry[];
  totalBytes: number;
  candidateReady: false;
  classification: typeof RESOURCE_MANIFEST_CLASSIFICATION;
}>;

export type ResourceSha256 = Readonly<{
  digest(bytes: Uint8Array): Promise<Uint8Array>;
}>;

export type ResourcePackageErrorCode =
  | "RHP_RESOURCE_MANIFEST_INVALID"
  | "RHP_RESOURCE_MANIFEST_HASH_MISMATCH"
  | "RHP_RESOURCE_MISSING"
  | "RHP_RESOURCE_HASH_MISMATCH"
  | "RHP_RESOURCE_LIMIT_EXCEEDED"
  | "RHP_RESOURCE_REFERENCE_PROHIBITED"
  | "RHP_RESOURCE_PLACEHOLDER_PROHIBITED";

const SAFE_MESSAGES = Object.freeze<Record<ResourcePackageErrorCode, string>>({
  RHP_RESOURCE_MANIFEST_INVALID: "The project preview resource manifest is invalid.",
  RHP_RESOURCE_MANIFEST_HASH_MISMATCH: "The project preview resource manifest hash did not match.",
  RHP_RESOURCE_MISSING: "A manifest resource is not packaged.",
  RHP_RESOURCE_HASH_MISMATCH: "A packaged resource hash did not match its manifest entry.",
  RHP_RESOURCE_LIMIT_EXCEEDED: "The project preview resource package exceeds a processing limit.",
  RHP_RESOURCE_REFERENCE_PROHIBITED: "A project preview resource contains a prohibited external reference.",
  RHP_RESOURCE_PLACEHOLDER_PROHIBITED: "A project preview resource contains placeholder material."
});

export class ResourcePackageError extends Error {
  readonly code: ResourcePackageErrorCode;

  constructor(code: ResourcePackageErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "ResourcePackageError";
    this.code = code;
  }
}

const MANIFEST_KEYS = Object.freeze([
  "approvalRecord", "candidateReady", "classification", "createdAt", "generationScriptVersion", "manifestVersion",
  "releaseId", "resourceCount", "resources", "schema", "sourceCommit"
] as const);
const ENTRY_KEYS = Object.freeze([
  "approvalRecord", "bytesPath", "canonicalization", "id", "kind", "mediaType", "sha256", "specification", "version"
] as const);
const VERSION_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,127})$/u;
const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const APPROVAL_PATTERN = /^RHP-RESOURCE-APPROVAL-[A-Z0-9][A-Z0-9._-]{0,127}$/u;
const PATH_PATTERN = /^resources\/[a-z0-9][a-z0-9._/-]{0,511}$/u;
const PLACEHOLDER_TEXT = /(?:\b(?:placeholder|replace[-_ ]?me|synthetic|tbd|todo)\b|hiri\.example|(?:^|\.)example\.(?:com|net|org)(?:\/|$)|\.(?:invalid|test)(?:\/|$)|localhost)/iu;
const JSON_MEDIA_TYPES = new Set<ResourceMediaType>(["application/json", "application/schema+json"]);

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function manifestInvalid(cause?: unknown): never {
  throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID", cause === undefined ? undefined : { cause });
}

function boundedText(value: unknown, maximum: number): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) {
    manifestInvalid();
  }
  return value;
}

function version(value: unknown): string {
  const text = boundedText(value, 128);
  if (!VERSION_PATTERN.test(text) || PLACEHOLDER_TEXT.test(text)) manifestInvalid();
  return text;
}

function approval(value: unknown): string {
  const text = boundedText(value, 160);
  if (!APPROVAL_PATTERN.test(text) || PLACEHOLDER_TEXT.test(text)) manifestInvalid();
  return text;
}

function resourceId(value: unknown): string {
  const text = boundedText(value, 1024);
  try {
    parseAbsoluteUri(text, { allowFragment: false });
    const parsed = new URL(text);
    if (!text.startsWith(RESOURCE_PREVIEW_NAMESPACE) || parsed.protocol !== "https:" || parsed.origin !== "https://hiri-protocol.org" ||
      parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.href !== text ||
      PLACEHOLDER_TEXT.test(text)) manifestInvalid();
  } catch (error) {
    if (error instanceof ResourcePackageError) throw error;
    manifestInvalid(error);
  }
  return text;
}

function bytesPath(value: unknown): string {
  const text = boundedText(value, 512);
  if (!PATH_PATTERN.test(text) || text.includes("//") || text.split("/").some(part => part === "." || part === "..") ||
    PLACEHOLDER_TEXT.test(text)) manifestInvalid();
  return text;
}

function parseEntry(value: unknown, manifestApproval: string): ResourceManifestEntry {
  if (!object(value) || !exactKeys(value, ENTRY_KEYS)) manifestInvalid();
  if (!(RESOURCE_KINDS as readonly unknown[]).includes(value.kind) ||
    !(RESOURCE_CANONICALIZATIONS as readonly unknown[]).includes(value.canonicalization) ||
    !(RESOURCE_MEDIA_TYPES as readonly unknown[]).includes(value.mediaType)) manifestInvalid();
  const kind = value.kind as ResourceKind;
  const canonicalization = value.canonicalization as ResourceCanonicalization;
  const mediaType = value.mediaType as ResourceMediaType;
  const entryApproval = approval(value.approvalRecord);
  if (entryApproval !== manifestApproval || (kind === "schema" && (mediaType !== "application/schema+json" || canonicalization !== "JCS")) ||
    (canonicalization === "JCS" && !JSON_MEDIA_TYPES.has(mediaType))) manifestInvalid();
  try {
    parseSha256Identifier(value.sha256);
  } catch (error) {
    manifestInvalid(error);
  }
  if (/^sha256:(.)\1{63}$/u.test(value.sha256 as string)) manifestInvalid();
  const specification = boundedText(value.specification, 512);
  if (PLACEHOLDER_TEXT.test(specification)) manifestInvalid();
  return Object.freeze({
    id: resourceId(value.id),
    kind,
    version: version(value.version),
    sha256: value.sha256 as string,
    canonicalization,
    mediaType,
    bytesPath: bytesPath(value.bytesPath),
    specification,
    approvalRecord: entryApproval
  });
}

export function parseResourceManifest(value: unknown): ResourceManifest {
  if (!object(value) || !exactKeys(value, MANIFEST_KEYS) || value.schema !== RESOURCE_MANIFEST_SCHEMA ||
    value.classification !== RESOURCE_MANIFEST_CLASSIFICATION || value.candidateReady !== false ||
    value.releaseId !== RESOURCE_MANIFEST_RELEASE || !Number.isSafeInteger(value.resourceCount) ||
    (value.resourceCount as number) < 1 || (value.resourceCount as number) > RESOURCE_MANIFEST_MAX_ENTRIES ||
    !Array.isArray(value.resources) || value.resources.length !== value.resourceCount) manifestInvalid();
  const manifestApproval = approval(value.approvalRecord);
  const entries = value.resources.map(entry => parseEntry(entry, manifestApproval));
  const ids = new Set(entries.map(entry => entry.id));
  const pins = new Set(entries.map(entry => `${entry.id}\0${entry.sha256}`));
  const paths = new Set(entries.map(entry => entry.bytesPath));
  if (ids.size !== entries.length || pins.size !== entries.length || paths.size !== entries.length) manifestInvalid();
  const sorted = [...entries].sort((left, right) => left.id.localeCompare(right.id) || left.sha256.localeCompare(right.sha256));
  if (sorted.some((entry, index) => entry !== entries[index])) manifestInvalid();
  try {
    parseUtcSeconds(value.createdAt);
  } catch (error) {
    manifestInvalid(error);
  }
  if (typeof value.sourceCommit !== "string" || !COMMIT_PATTERN.test(value.sourceCommit) ||
    /^(.)\1+$/u.test(value.sourceCommit)) manifestInvalid();
  return Object.freeze({
    schema: RESOURCE_MANIFEST_SCHEMA,
    classification: RESOURCE_MANIFEST_CLASSIFICATION,
    candidateReady: false,
    releaseId: RESOURCE_MANIFEST_RELEASE,
    manifestVersion: version(value.manifestVersion),
    generationScriptVersion: version(value.generationScriptVersion),
    sourceCommit: value.sourceCommit,
    approvalRecord: manifestApproval,
    createdAt: value.createdAt as string,
    resourceCount: value.resourceCount as number,
    resources: Object.freeze(entries)
  });
}

async function sha256Identifier(bytes: Uint8Array, sha256: ResourceSha256): Promise<string> {
  let digest: Uint8Array;
  try {
    digest = await sha256.digest(bytes);
  } catch (error) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID", { cause: error });
  }
  if (!(digest instanceof Uint8Array) || digest.length !== 32) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
  }
  return `sha256:${hex(digest)}`;
}

function decodeJson(bytes: Uint8Array, maximumBytes: number): unknown {
  if (bytes.length > maximumBytes) throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseStrictJson(text, { maximumBytes, maximumDepth: 64, maximumStringLength: 1024 * 1024 });
  } catch (error) {
    if (error instanceof ResourcePackageError) throw error;
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID", { cause: error });
  }
}

function scanResource(value: unknown, kind: ResourceKind, root = true, depth = 0): void {
  if (depth > 64) throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
  if (typeof value === "string") {
    if (value.length > 1024 * 1024) throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
    if (PLACEHOLDER_TEXT.test(value)) throw new ResourcePackageError("RHP_RESOURCE_PLACEHOLDER_PROHIBITED");
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const child of value) scanResource(child, kind, false, depth + 1);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (PLACEHOLDER_TEXT.test(key)) throw new ResourcePackageError("RHP_RESOURCE_PLACEHOLDER_PROHIBITED");
    if (["$ref", "$dynamicRef", "$recursiveRef"].includes(key) &&
      (typeof child !== "string" || !child.startsWith("#"))) {
      throw new ResourcePackageError("RHP_RESOURCE_REFERENCE_PROHIBITED");
    }
    if (key === "$id" && !root) throw new ResourcePackageError("RHP_RESOURCE_REFERENCE_PROHIBITED");
    if (key === "@import") {
      throw new ResourcePackageError("RHP_RESOURCE_REFERENCE_PROHIBITED");
    }
    if (key === "@context") scanContextDefinition(child, depth + 1);
    scanResource(child, kind, false, depth + 1);
  }
}

function scanContextDefinition(value: unknown, depth: number): void {
  if (depth > 64) throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
  if (typeof value === "string") throw new ResourcePackageError("RHP_RESOURCE_REFERENCE_PROHIBITED");
  if (value === null) return;
  if (Array.isArray(value)) {
    for (const child of value) scanContextDefinition(child, depth + 1);
    return;
  }
  if (!object(value)) throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
  if (Object.hasOwn(value, "@import")) throw new ResourcePackageError("RHP_RESOURCE_REFERENCE_PROHIBITED");
  for (const child of Object.values(value)) {
    if (object(child) && Object.hasOwn(child, "@context")) {
      scanContextDefinition(child["@context"], depth + 1);
    }
  }
}

function validateSchemaResource(value: unknown, entry: ResourceManifestEntry): void {
  if (!object(value) || value.$schema !== "https://json-schema.org/draft/2020-12/schema" || value.$id !== entry.id) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
  }
}

export async function verifyResourcePackage(input: Readonly<{
  expectedManifestHash: string;
  manifestBytes: Uint8Array;
  resources: readonly PackagedResourceBytes[];
  sha256: ResourceSha256;
}>): Promise<VerifiedResourcePackage> {
  try {
    parseSha256Identifier(input.expectedManifestHash);
  } catch (error) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID", { cause: error });
  }
  if (/^sha256:(.)\1{63}$/u.test(input.expectedManifestHash)) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
  }
  if (!(input.manifestBytes instanceof Uint8Array) || input.manifestBytes.length < 1 ||
    input.manifestBytes.length > RESOURCE_MANIFEST_MAX_BYTES) {
    throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
  }
  const actualManifestHash = await sha256Identifier(input.manifestBytes, input.sha256);
  if (actualManifestHash !== input.expectedManifestHash) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_HASH_MISMATCH");
  }
  const manifestValue = decodeJson(input.manifestBytes, RESOURCE_MANIFEST_MAX_BYTES);
  if (!bytesEqual(input.manifestBytes, jcsBytes(manifestValue))) {
    throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
  }
  const manifest = parseResourceManifest(manifestValue);
  const packaged = new Map<string, Uint8Array>();
  let totalBytes = input.manifestBytes.length;
  for (const resource of input.resources) {
    if (!resource || typeof resource.path !== "string" || !(resource.bytes instanceof Uint8Array) ||
      packaged.has(resource.path)) throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID");
    packaged.set(resource.path, new Uint8Array(resource.bytes));
    totalBytes += resource.bytes.length;
    if (resource.bytes.length > RESOURCE_MAX_BYTES || totalBytes > RESOURCE_PACKAGE_MAX_BYTES) {
      throw new ResourcePackageError("RHP_RESOURCE_LIMIT_EXCEEDED");
    }
  }
  if (packaged.size !== manifest.resources.length) throw new ResourcePackageError("RHP_RESOURCE_MISSING");

  const entries: VerifiedResourceEntry[] = [];
  for (const entry of manifest.resources) {
    const bytes = packaged.get(entry.bytesPath);
    if (!bytes) throw new ResourcePackageError("RHP_RESOURCE_MISSING");
    if (await sha256Identifier(bytes, input.sha256) !== entry.sha256) {
      throw new ResourcePackageError("RHP_RESOURCE_HASH_MISMATCH");
    }
    let value: unknown = bytes;
    if (JSON_MEDIA_TYPES.has(entry.mediaType)) {
      value = decodeJson(bytes, RESOURCE_MAX_BYTES);
      if (entry.canonicalization === "JCS" && !bytesEqual(bytes, jcsBytes(value))) {
        throw new ResourcePackageError("RHP_RESOURCE_HASH_MISMATCH");
      }
      scanResource(value, entry.kind);
      if (entry.kind === "schema") validateSchemaResource(value, entry);
    } else {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (error) {
        throw new ResourcePackageError("RHP_RESOURCE_MANIFEST_INVALID", { cause: error });
      }
      scanResource(text, entry.kind);
      value = text;
    }
    entries.push(Object.freeze({
      ...entry,
      bytes: new Uint8Array(bytes),
      value: structuredClone(value),
      source: "packaged-project-preview-resource" as const
    }));
  }
  return Object.freeze({
    manifest,
    manifestHash: actualManifestHash,
    manifestBytes: new Uint8Array(input.manifestBytes),
    entries: Object.freeze(entries),
    totalBytes,
    candidateReady: false,
    classification: RESOURCE_MANIFEST_CLASSIFICATION
  });
}
