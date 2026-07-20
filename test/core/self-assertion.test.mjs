import test from "node:test";
import assert from "node:assert/strict";
import { deriveAuthority } from "../../src/core/authority.mjs";
import { createPersistentSelfAssertion, validatePersistentSelfAssertion, validateEphemeralSelfAssertion } from "../../src/core/self-assertion.mjs";

// Core §9, Core §9.1, Core §9.2
const holder = deriveAuthority(new Uint8Array(32));
const content = { "@type": "hiri:passport:SelfAssertion", subjectHolderAuthority: holder, schema: "https://example.test/self", schemaHash: "sha256:" + "0".repeat(64), claims: { name: "Alex" } };

test("persistent assertions are holder-bound and unpublished by default", async () => {
  const assertion = await createPersistentSelfAssertion({ holderAuthority: holder, content }, { randomBytes: async () => new Uint8Array(16) });
  assert.equal(assertion.published, false);
  assert.equal(validatePersistentSelfAssertion(assertion, holder).result, "valid");
});

test("ephemeral assertions require request and presentation binding", () => {
  const request = { requestItemId: "id", schema: "https://example.test/self", schemaHash: "sha256:" + "0".repeat(64) };
  const assertion = { provenance: "self-asserted-ephemeral", requestItemId: "id", schema: request.schema, schemaHash: request.schemaHash };
  assert.equal(validateEphemeralSelfAssertion(assertion, request, { proof: {} }).result, "valid");
  assert.equal(validateEphemeralSelfAssertion({ ...assertion, provenance: "direct-issuer" }, request, { proof: {} }).result, "invalid");
});
