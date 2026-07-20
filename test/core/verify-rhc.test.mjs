import test from "node:test";
import assert from "node:assert/strict";
import { verifyCredentialPhase, verifyHolderPhase, verifyRequestPhase } from "../../src/core/verify-rhc.mjs";

test("Phase R exposes exact binding and required-item results", () => {
  const request = { requestId: "r", nonce: "n", verifier: { authority: "v" }, credentialRequests: [{ requestItemId: "i", required: true }], selfAssertionRequests: [] };
  const presentation = { requestBinding: { requestId: "r", nonce: "wrong", verifierAuthority: "v" }, credentialPresentations: [{ requestItemId: "i" }], selfAssertions: [] };
  const result = verifyRequestPhase({ request, presentation, syntax: "valid", signature: "valid", freshness: "valid", replay: "valid" });
  assert.equal(result.result, "invalid"); assert.equal(result.presentationBinding, "invalid"); assert.equal(result.requiredItems, "valid");
});
test("Phase H preserves missing lifecycle as unknown", () => {
  const result = verifyHolderPhase({ presentation: { holder: { authority: "a" } }, derivedAuthority: "a", schema: "valid", freshness: "valid", methodAuthorization: "unknown", keyState: "unknown", signature: "valid" });
  assert.equal(result.result, "unknown"); assert.equal(result.signature, "valid");
});
test("Phase C is independent per credential", () => {
  const base = { artifactIntegrity: "valid", issuerSignature: "valid", issuerAuthority: "valid", schema: "valid", disclosure: "valid", provenanceCheck: "valid", chain: "valid", requiredPathsSatisfied: true, requestMatch: { schema: "s", schemaHash: "h", credentialType: "T" } };
  const results = verifyCredentialPhase({ holderAuthority: "holder", items: [{ ...base, presentationItemId: "one", content: { subjectHolderAuthority: "wrong", schema: "s", schemaHash: "h", credentialType: "T" } }, { ...base, presentationItemId: "two", content: { subjectHolderAuthority: "holder", schema: "s", schemaHash: "h", credentialType: "T" } }] });
  assert.equal(results[0].result, "invalid"); assert.equal(results[1].result, "valid");
});
