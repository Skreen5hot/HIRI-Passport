import test from "node:test";
import assert from "node:assert/strict";
import { signPassportMessage, validateMessageEnvelope, verifyPassportMessage } from "../../src/core/message.mjs";
import { authority, id, lifecycle, method, nonce, toyEd25519 } from "../helpers.mjs";

function request() {
  const verifier = authority(1);
  const verificationMethod = method(verifier);
  return { protocol: "hiri-passport/2.0", type: "DisclosureRequest", requestId: id(1), verifier: { authority: verifier }, credentialRequests: [{}], selfAssertionRequests: [], nonce: nonce(1), createdAt: "2026-07-20T12:00:00Z", expiresAt: "2026-07-20T12:10:00Z", proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T12:00:00Z", verificationMethod, proofPurpose: "authentication", proofValue: "z1" } };
}

test("common envelope enforces protocol time and exact proof creation", () => {
  const value = request();
  assert.equal(validateMessageEnvelope(value, "DisclosureRequest", "2026-07-20T12:10:30Z", { messageClockSkewSeconds: 30 }).parameters.messageClockSkewSeconds, 30);
  value.proof.created = "2026-07-20T12:00:01Z";
  assert.throws(() => validateMessageEnvelope(value, "DisclosureRequest", "2026-07-20T12:01:00Z"), /equal/);
  assert.throws(() => validateMessageEnvelope(request(), "DisclosureRequest", "2026-07-20T12:01:00Z", { messageClockSkewSeconds: 121 }), /120/);
});

test("Passport messages use domain-separated direct signatures", async () => {
  const unsigned = request();
  const signed = await signPassportMessage("TEST-DOMAIN", unsigned, { ed25519: toyEd25519 });
  const evidence = { authority: signed.verifier.authority, lifecycleEvidence: lifecycle(signed.verifier.authority, signed.proof.verificationMethod) };
  assert.equal((await verifyPassportMessage("TEST-DOMAIN", signed, evidence, { ed25519: toyEd25519 })).result, "valid");
  assert.equal((await verifyPassportMessage("OTHER-DOMAIN", signed, evidence, { ed25519: toyEd25519 })).result, "invalid");
});
