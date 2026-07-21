import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { jcsBytes } from "../../src/core/canonical.mjs";
import { parseStrictJson } from "../../src/sdk/strict-json.mjs";

export const KIT_VERSION = "rhp-resource-kit-1";
export const RESOURCE_ROOT = "resources/preview/rhp-2026-07";
export const DESCRIPTOR_PATH = `${RESOURCE_ROOT}/resource-set.json`;
export const MANIFEST_PATH = `${RESOURCE_ROOT}/resource-manifest.json`;
export const METADATA_PATH = `${RESOURCE_ROOT}/candidate-metadata.json`;
export const VECTOR_PATH = `${RESOURCE_ROOT}/vectors/project-vectors-v1.json`;
export const TRACEABILITY_PATH = "docs/rhp/independent-resource-review/REQUIREMENT-TRACEABILITY.md";
export const APPROVAL_RECORD = "RHP-RESOURCE-APPROVAL-RHP-2026-07-1";
export const NAMESPACE = "https://hiri-protocol.org/resources/preview/rhp-2026-07/";
export const RELEASE = "real-holder-preview";

const EXACT_DESCRIPTOR_KEYS = ["approvalRecord", "generationScriptVersion", "manifestVersion", "namespace", "releaseId", "resources", "schema"];
const EXACT_ENTRY_KEYS = ["bytesPath", "canonicalization", "id", "kind", "mediaType", "specification", "version"];
const RESOURCE_KINDS = new Set(["configuration", "context", "policy", "profile", "schema"]);
const MEDIA_TYPES = new Set(["application/json", "application/schema+json", "text/plain"]);
const VERSION = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const PROHIBITED = /(?:\b(?:placeholder|replace[-_ ]?me|synthetic|tbd|todo)\b|hiri\.example|(?:^|\.)example\.(?:com|net|org)(?:\/|$)|\.(?:invalid|test)(?:\/|$)|localhost)/iu;

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) {
    throw new Error(`${label} does not have the required closed member set`);
  }
}

export function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function parseCanonicalJson(bytes, label, maximumBytes = 2 * 1024 * 1024) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const value = parseStrictJson(text, { maximumBytes, maximumDepth: 64, maximumStringLength: 1024 * 1024 });
  if (!Buffer.from(bytes).equals(Buffer.from(jcsBytes(value)))) throw new Error(`${label} is not exact RFC 8785 JCS bytes`);
  return value;
}

export function validateDescriptor(value) {
  exactKeys(value, EXACT_DESCRIPTOR_KEYS, "resource-set descriptor");
  if (value.schema !== "hiri:rhp-resource-source-set:v1" || value.releaseId !== RELEASE || value.namespace !== NAMESPACE ||
    value.generationScriptVersion !== KIT_VERSION || value.approvalRecord !== APPROVAL_RECORD ||
    !VERSION.test(value.manifestVersion) || !Array.isArray(value.resources) || value.resources.length < 1 || value.resources.length > 128) {
    throw new Error("resource-set descriptor has an invalid fixed value or limit");
  }
  const ids = new Set();
  const paths = new Set();
  for (const entry of value.resources) {
    exactKeys(entry, EXACT_ENTRY_KEYS, "resource-set entry");
    if (typeof entry.id !== "string" || !entry.id.startsWith(NAMESPACE) || new URL(entry.id).href !== entry.id ||
      !RESOURCE_KINDS.has(entry.kind) || !VERSION.test(entry.version) || entry.canonicalization !== "JCS" ||
      !MEDIA_TYPES.has(entry.mediaType) || typeof entry.bytesPath !== "string" || !entry.bytesPath.startsWith(`${RESOURCE_ROOT}/`) ||
      typeof entry.specification !== "string" || entry.specification.length < 1 || entry.specification.length > 512 ||
      PROHIBITED.test(JSON.stringify(entry))) throw new Error(`invalid resource-set entry: ${String(entry.id)}`);
    if (entry.kind === "schema" && entry.mediaType !== "application/schema+json") throw new Error(`schema media type is invalid: ${entry.id}`);
    if (ids.has(entry.id) || paths.has(entry.bytesPath)) throw new Error(`duplicate resource id or path: ${entry.id}`);
    ids.add(entry.id);
    paths.add(entry.bytesPath);
  }
  const sorted = [...value.resources].sort((left, right) => left.id.localeCompare(right.id));
  if (sorted.some((entry, index) => entry.id !== value.resources[index].id)) throw new Error("resource-set entries are not in deterministic identifier order");
  return value;
}

export function inspectSchema(schema, expectedId) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema) ||
    schema.$schema !== "https://json-schema.org/draft/2020-12/schema" || schema.$id !== expectedId) {
    throw new Error(`schema root does not match its manifest identifier: ${expectedId}`);
  }
  let nodes = 0;
  const visit = (value, root = false, depth = 0) => {
    nodes += 1;
    if (nodes > 100000 || depth > 64) throw new Error(`schema exceeds inspection limits: ${expectedId}`);
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, false, depth + 1);
      return;
    }
    if (!root && (Object.hasOwn(value, "$id") || Object.hasOwn(value, "$schema"))) throw new Error(`nested schema identity is prohibited: ${expectedId}`);
    for (const keyword of ["$ref", "$dynamicRef", "$recursiveRef"]) {
      if (Object.hasOwn(value, keyword) && (typeof value[keyword] !== "string" || !value[keyword].startsWith("#"))) {
        throw new Error(`external schema reference is prohibited: ${expectedId}`);
      }
    }
    if (Object.hasOwn(value, "format")) throw new Error(`unreviewed format assertion is prohibited: ${expectedId}`);
    const objectShape = value.type === "object" || Object.hasOwn(value, "properties") || Object.hasOwn(value, "patternProperties") || Object.hasOwn(value, "required");
    if (objectShape && value.additionalProperties !== false && value.unevaluatedProperties !== false) {
      throw new Error(`schema contains an open object shape: ${expectedId}`);
    }
    for (const keyword of ["additionalProperties", "contains", "contentSchema", "else", "if", "items", "not", "propertyNames", "then", "unevaluatedItems", "unevaluatedProperties"]) {
      const child = value[keyword];
      if (child && typeof child === "object") visit(child, false, depth + 1);
    }
    for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
      const children = value[keyword];
      if (Array.isArray(children)) for (const child of children) visit(child, false, depth + 1);
    }
    for (const keyword of ["$defs", "definitions", "dependentSchemas", "patternProperties", "properties"]) {
      const children = value[keyword];
      if (children && typeof children === "object" && !Array.isArray(children)) {
        for (const child of Object.values(children)) visit(child, false, depth + 1);
      }
    }
  };
  visit(schema, true, 0);
}

function scanResource(value, label, depth = 0) {
  if (depth > 64) throw new Error(`resource exceeds depth limit: ${label}`);
  if (typeof value === "string") {
    if (PROHIBITED.test(value)) throw new Error(`resource contains prohibited draft/demo material: ${label}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PROHIBITED.test(key)) throw new Error(`resource contains a prohibited member: ${label}`);
    if (["$ref", "$dynamicRef", "$recursiveRef"].includes(key) && (typeof child !== "string" || !child.startsWith("#"))) {
      throw new Error(`resource contains an external reference: ${label}`);
    }
    if (key === "@import" || (key === "@context" && typeof child === "string")) {
      throw new Error(`resource contains a remote JSON-LD dependency: ${label}`);
    }
    scanResource(child, label, depth + 1);
  }
}

export function loadSourceSet(readBytes = path => readFileSync(path)) {
  const descriptorBytes = readBytes(DESCRIPTOR_PATH);
  const descriptor = validateDescriptor(parseStrictJson(descriptorBytes.toString("utf8"), {
    maximumBytes: 256 * 1024,
    maximumDepth: 16,
    maximumStringLength: 4096
  }));
  const resources = descriptor.resources.map(entry => {
    const bytes = new Uint8Array(readBytes(entry.bytesPath));
    if (bytes.length < 1 || bytes.length > 2 * 1024 * 1024) throw new Error(`resource byte limit failed: ${entry.id}`);
    const value = parseCanonicalJson(bytes, entry.bytesPath);
    scanResource(value, entry.id);
    if (entry.kind === "schema") inspectSchema(value, entry.id);
    return Object.freeze({ ...entry, bytes, value, sha256: sha256(bytes) });
  });
  return Object.freeze({ descriptor, descriptorBytes: new Uint8Array(descriptorBytes), resources: Object.freeze(resources) });
}

export function buildManifest(sourceSet, { sourceCommit, createdAt }) {
  if (!COMMIT.test(sourceCommit) || /^(.)\1+$/u.test(sourceCommit)) throw new Error("sourceCommit must be a full non-repeating Git commit identifier");
  if (!UTC_SECONDS.test(createdAt) || new Date(createdAt).toISOString().replace(".000Z", "Z") !== createdAt) {
    throw new Error("createdAt must be an explicit valid UTC timestamp using YYYY-MM-DDTHH:mm:ssZ");
  }
  const manifest = {
    approvalRecord: APPROVAL_RECORD,
    candidateReady: false,
    classification: "project preview resource",
    createdAt,
    generationScriptVersion: KIT_VERSION,
    manifestVersion: sourceSet.descriptor.manifestVersion,
    releaseId: RELEASE,
    resourceCount: sourceSet.resources.length,
    resources: sourceSet.resources.map(entry => ({
      approvalRecord: APPROVAL_RECORD,
      bytesPath: entry.bytesPath,
      canonicalization: entry.canonicalization,
      id: entry.id,
      kind: entry.kind,
      mediaType: entry.mediaType,
      sha256: entry.sha256,
      specification: entry.specification,
      version: entry.version
    })),
    schema: "hiri-passport/project-preview-resource-manifest/1",
    sourceCommit
  };
  const bytes = jcsBytes(manifest);
  return Object.freeze({ manifest, bytes, sha256: sha256(bytes) });
}

export function validateHash(value, label = "SHA-256") {
  if (!SHA256.test(value) || /^sha256:(.)\1{63}$/u.test(value)) throw new Error(`${label} is not a valid non-repeating SHA-256 identifier`);
  return value;
}
