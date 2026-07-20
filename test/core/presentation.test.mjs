import test from "node:test";
import assert from "node:assert/strict";
import { createPresentation, presentationSigningBytes, validatePresentation } from "../../src/core/presentation.mjs";
import { authority, id, method, nonce, toyEd25519 } from "../helpers.mjs";

const holder = authority(1); const holderMethod = method(holder);
function request() { const verifier = authority(2); return { requestId: id(1), nonce: nonce(1), expiresAt: "2026-07-20T12:10:00Z", verifier: { authority: verifier }, credentialRequests: [{ requestItemId: id(2), credentialType: "License", acceptedDisclosureModes: ["public"], required: true }], selfAssertionRequests: [] }; }
function presentation() { const r = request(); return { protocol: "hiri-passport/2.0", type: "PassportPresentation", presentationId: id(3), holder: { authority: holder, verificationMethod: holderMethod }, requestBinding: { requestId: r.requestId, nonce: r.nonce, verifierAuthority: r.verifier.authority }, credentialPresentations: [{ presentationItemId: id(4), requestItemId: id(2), provenance: "direct-issuer", disclosureMode: "public", credentialRef: { uri: "hiri://example.test/data/credential-x", manifestHash: `sha256:${"a".repeat(64)}`, contentHash: `sha256:${"b".repeat(64)}` } }], selfAssertions: [], createdAt: "2026-07-20T12:01:00Z", expiresAt: "2026-07-20T12:06:00Z", proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T12:01:00Z", verificationMethod: holderMethod, proofPurpose: "authentication", proofValue: "z1" } }; }

test("presentation binds the exact request and required items", () => {
  const value = presentation(); assert.equal(validatePresentation(value, request(), {}, { now: "2026-07-20T12:02:00Z" }).result, "valid"); assert.ok(presentationSigningBytes(value).length > 100);
  value.requestBinding.nonce = nonce(9); assert.throws(() => validatePresentation(value, request()), /binding/);
  const missing = presentation(); missing.credentialPresentations = []; assert.throws(() => validatePresentation(missing, request()), /required/);
});

test("creation uses fresh IDs and signs the complete presentation", async () => {
  let seed = 20; const ports = { randomBytes: async (length) => Uint8Array.from({ length }, () => seed++), ed25519: toyEd25519 };
  const r = request(); const authorization = { requestId: r.requestId, nonce: r.nonce, verifierAuthority: r.verifier.authority, expiresAt: r.expiresAt };
  const result = await createPresentation(authorization, { holderAuthority: holder, holderMethod, createdAt: "2026-07-20T12:01:00Z", credentialPresentations: [{ requestItemId: id(2), provenance: "direct-issuer", disclosureMode: "public", credentialRef: { uri: "hiri://example.test/data/credential-x", manifestHash: `sha256:${"a".repeat(64)}`, contentHash: `sha256:${"b".repeat(64)}` } }] }, ports);
  assert.notEqual(result.presentationId, result.credentialPresentations[0].presentationItemId); assert.notEqual(result.proof.proofValue, "z1");
});
