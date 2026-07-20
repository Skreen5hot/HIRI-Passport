import test from "node:test";
import assert from "node:assert/strict";
import { requestSigningBytes, signDisclosureRequest, validateDisclosureRequest } from "../../src/core/disclosure-request.mjs";
import { authority, id, method, nonce, toyEd25519 } from "../helpers.mjs";

function fixture() {
  const verifier = authority(9); const verificationMethod = method(verifier);
  return { protocol: "hiri-passport/2.0", type: "DisclosureRequest", requestId: id(1), verifier: { authority: verifier, verificationMethod, display: { name: "Verifier", domain: "verifier.example" } }, credentialRequests: [{ requestItemId: id(2), schema: "https://example.test/license", schemaHash: `sha256:${"a".repeat(64)}`, credentialType: "License", acceptedDisclosureModes: ["public"], required: true, purpose: "Confirm license", fields: [{ path: "/claims/licenseNumber", required: true, purpose: "Match the registration" }] }], selfAssertionRequests: [], nonce: nonce(3), createdAt: "2026-07-20T12:00:00Z", expiresAt: "2026-07-20T12:10:00Z", proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T12:00:00Z", verificationMethod, proofPurpose: "authentication", proofValue: "z1" } };
}

test("Disclosure Request validates closed public-only semantics", async () => {
  const value = fixture();
  assert.equal(validateDisclosureRequest(value, "2026-07-20T12:01:00Z").result, "valid");
  const signed = await signDisclosureRequest(value, { ed25519: toyEd25519 });
  assert.ok(requestSigningBytes(signed).length > 100);
  value.credentialRequests[0].acceptedDisclosureModes = ["public", "selective"];
  assert.throws(() => validateDisclosureRequest(value, "2026-07-20T12:01:00Z"), /public/);
});

test("Disclosure Request rejects duplicate tuples and unsafe purpose text", () => {
  const value = fixture();
  value.credentialRequests[0].fields.push({ ...value.credentialRequests[0].fields[0] });
  assert.throws(() => validateDisclosureRequest(value, "2026-07-20T12:01:00Z"), /duplicate/);
  const unsafe = fixture(); unsafe.credentialRequests[0].purpose = "hello\nworld";
  assert.throws(() => validateDisclosureRequest(unsafe, "2026-07-20T12:01:00Z"), /plain-text/);
});
