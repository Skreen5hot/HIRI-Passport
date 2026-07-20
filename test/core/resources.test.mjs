import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { jcsBytes } from "../../src/core/canonical.mjs";
import { createPinnedResourceRegistry, loadPinnedSchema, validateWithPinnedSchema } from "../../src/core/resources.mjs";

// Core §6.2, Core §6.3
const sha256 = { digest: async (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest()) };
const uri = "https://example.test/schema";
const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: uri, type: "object" };
const hash = `sha256:${createHash("sha256").update(jcsBytes(schema)).digest("hex")}`;

test("resources are selected and checked by URI and hash", async () => {
  const registry = createPinnedResourceRegistry([{ id: uri, hash, kind: "schema", value: schema }], { sha256, schemaValidator: (value) => typeof value === "object" });
  assert.equal((await loadPinnedSchema(registry, uri, hash)).result, "valid");
  assert.equal((await validateWithPinnedSchema({}, uri, hash, {}, registry)).result, "valid");
  assert.equal((await loadPinnedSchema(registry, uri, "sha256:" + "0".repeat(64))).result, "unknown");
});

test("unpinned remote refs are rejected", async () => {
  const badSchema = { ...schema, $ref: "https://untrusted.test/other" };
  const badHash = `sha256:${createHash("sha256").update(jcsBytes(badSchema)).digest("hex")}`;
  const registry = createPinnedResourceRegistry([{ id: uri, hash: badHash, kind: "schema", value: badSchema }], { sha256, schemaValidator: () => true });
  assert.equal((await validateWithPinnedSchema({}, uri, badHash, {}, registry)).result, "invalid");
});
