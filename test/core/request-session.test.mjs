import test from "node:test";
import assert from "node:assert/strict";
import { acceptRequest, declineRequest, evaluateRequestForConsent } from "../../src/core/request-session.mjs";
import { authority, id, method, nonce } from "../helpers.mjs";

function request(required = true) { const a = authority(4); const m = method(a); return { protocol: "hiri-passport/2.0", type: "DisclosureRequest", requestId: id(1), verifier: { authority: a, verificationMethod: m }, credentialRequests: [{ requestItemId: id(2), schema: "https://e.test/s", schemaHash: `sha256:${"a".repeat(64)}`, credentialType: "T", acceptedDisclosureModes: ["public"], required, purpose: "Use", fields: [{ path: "/claims/name", required, purpose: "Match" }] }], selfAssertionRequests: [], nonce: nonce(1), createdAt: "2026-07-20T12:00:00Z", expiresAt: "2026-07-20T12:10:00Z", proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T12:00:00Z", verificationMethod: m, proofPurpose: "authentication", proofValue: "z1" } }; }

test("consent follows complete validation and exposes evidence dimensions", () => {
  const result = evaluateRequestForConsent(request(), { signature: "valid", methodAuthorization: "valid" }, "2026-07-20T12:01:00Z");
  assert.equal(result.eligible, true); assert.equal(result.fields[0].purpose, "Match"); assert.equal(result.verifier.identityEvidence.result, "unknown");
});

test("acceptance is one-shot and replay retained", () => {
  const values = new Map(); const replay = { has: (key) => values.has(key), put: (key, expiry) => values.set(key, expiry) };
  const value = request(); const authorization = acceptRequest({ request: value }, replay);
  assert.deepEqual(authorization.acceptedItemIds, [id(2)]);
  assert.throws(() => acceptRequest({ request: value }, replay), /replayed/);
  assert.equal(declineRequest(value.requestId).authorization, null);
});
