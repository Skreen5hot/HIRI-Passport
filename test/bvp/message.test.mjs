import test from "node:test";
import assert from "node:assert/strict";
import { signBvpMessage, validateBvpEnvelope, verifyBvpMessage } from "../../src/bvp/message.mjs";
import { authority, id, lifecycle, method, nonce, toyEd25519 } from "../helpers.mjs";

function fixture() { const a = authority(1); const m = method(a); return { protocol: "hiri-bvp/3.0", type: "BvsHolderBindingChallenge", sessionId: id(1), challengeId: id(2), nonce: nonce(1), createdAt: "2026-07-20T12:00:00Z", expiresAt: "2026-07-20T12:05:00Z", proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T12:00:00Z", verificationMethod: m, proofPurpose: "authentication", proofValue: "z1" } }; }
test("BVP envelope fixes suite, size, time, and explicit skew", () => { assert.equal(validateBvpEnvelope(fixture(), "BvsHolderBindingChallenge", "2026-07-20T12:05:30Z", 30).result, "valid"); assert.throws(() => validateBvpEnvelope(fixture(), "BvsHolderBindingChallenge", "2026-07-20T12:00:00Z", 121), /120/); });
test("BVP signatures are domain separated", async () => { const value = fixture(); const signed = await signBvpMessage("D", value, { ed25519: toyEd25519 }); const a = signed.proof.verificationMethod.slice(7, signed.proof.verificationMethod.indexOf("/key/")); const evidence = { authority: a, lifecycleEvidence: lifecycle(a, signed.proof.verificationMethod) }; assert.equal((await verifyBvpMessage("D", signed, evidence, { ed25519: toyEd25519 })).result, "valid"); assert.equal((await verifyBvpMessage("X", signed, evidence, { ed25519: toyEd25519 })).result, "invalid"); });
