import { hex, jcsBytes } from "./canonical.mjs";
import { parseAbsoluteUri, parseSha256Identifier } from "./scalars.mjs";

function key(id, hash) {
  return `${id}\u0000${hash}`;
}

async function computedHash(bytes, sha256) {
  if (typeof sha256?.digest !== "function") throw new TypeError("SHA-256 digest port is required");
  const digest = await sha256.digest(bytes);
  if (!(digest instanceof Uint8Array) || digest.length !== 32) throw new TypeError("SHA-256 port must return 32 bytes");
  return `sha256:${hex(digest)}`;
}

export function createPinnedResourceRegistry(entries = [], options = {}) {
  const values = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string" || typeof entry.hash !== "string") throw new TypeError("resource entry requires id and hash");
    parseSha256Identifier(entry.hash);
    const mapKey = key(entry.id, entry.hash);
    if (values.has(mapKey)) throw new TypeError("duplicate pinned resource");
    values.set(mapKey, Object.freeze({ ...entry }));
  }
  return Object.freeze({ values, sha256: options.sha256, schemaValidator: options.schemaValidator });
}

export async function loadPinnedResource(registry, id, hash, kind) {
  parseSha256Identifier(hash);
  const entry = registry?.values?.get(key(id, hash));
  if (!entry) return { result: "unknown", error: "ARTIFACT_MISSING" };
  const bytes = entry.bytes instanceof Uint8Array ? entry.bytes : jcsBytes(entry.value);
  const actual = await computedHash(bytes, registry.sha256);
  if (actual !== hash) return { result: "invalid", error: "ARTIFACT_HASH_MISMATCH" };
  if (kind && entry.kind && entry.kind !== kind) return { result: "invalid", error: "ARTIFACT_HASH_MISMATCH" };
  return { result: "valid", value: entry.value, bytes, source: entry.source ?? "pinned" };
}

export function loadPinnedContext(registry, id, hash) {
  return loadPinnedResource(registry, id, hash, "context");
}

export function loadPinnedSchema(registry, uri, hash) {
  parseAbsoluteUri(uri);
  return loadPinnedResource(registry, uri, hash, "schema");
}

function scanSchema(value, depth, limits) {
  if (depth > limits.maxDepth) throw new RangeError("schema depth limit exceeded");
  if (typeof value === "string" && value.length > limits.maxStringLength) throw new RangeError("schema string limit exceeded");
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value) && typeof value.$ref === "string" && /^[a-z][a-z0-9+.-]*:/iu.test(value.$ref)) {
    throw new TypeError("unpinned remote $ref is prohibited");
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) scanSchema(child, depth + 1, limits);
}

export async function validateWithPinnedSchema(value, uri, hash, limits, registry) {
  const loaded = await loadPinnedSchema(registry, uri, hash);
  if (loaded.result !== "valid") return loaded;
  const schema = loaded.value;
  if (schema?.$schema !== "https://json-schema.org/draft/2020-12/schema" || schema.$id !== uri) {
    return { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
  }
  try {
    scanSchema(schema, 0, { maxDepth: limits?.maxDepth ?? 64, maxStringLength: limits?.maxStringLength ?? 1024 * 1024 });
  } catch (error) {
    return { result: error instanceof RangeError ? "unknown" : "invalid", error: error instanceof RangeError ? "RESOURCE_LIMIT_EXCEEDED" : "CREDENTIAL_SCHEMA_INVALID" };
  }
  if (typeof registry.schemaValidator !== "function") return { result: "unknown", error: "ARTIFACT_MISSING" };
  return registry.schemaValidator(value, schema) === true ? { result: "valid" } : { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
}
