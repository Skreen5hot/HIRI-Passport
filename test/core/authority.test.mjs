import test from "node:test";
import assert from "node:assert/strict";
import { deriveAuthority, validateAuthority, verifyMethodAuthorization, verifyRoutineRotation } from "../../src/core/authority.mjs";

// Core §5, Core §5.1, Core §5.2, Core §5.3
const key = new Uint8Array(32);
const authority = deriveAuthority(key);
const method = `hiri://${authority}/key/main#key-1`;

test("authority is derived from the immutable genesis key", () => {
  assert.equal(validateAuthority(authority).authority, authority);
  assert.equal(deriveAuthority(key), authority);
});

test("method authorization is temporal and missing evidence is unknown", () => {
  const lifecycleEvidence = {
    result: "valid",
    authority,
    genesisPublicKey: key,
    methods: [{ id: method, authorizedFrom: "2026-01-01T00:00:00Z", revokedAt: "2027-01-01T00:00:00Z" }]
  };
  assert.equal(verifyMethodAuthorization({ authority, method, at: "2026-07-20T00:00:00Z", lifecycleEvidence }).result, "valid");
  assert.equal(verifyMethodAuthorization({ authority, method, at: "2028-01-01T00:00:00Z", lifecycleEvidence }).result, "invalid");
  assert.equal(verifyMethodAuthorization({ authority, method, at: "2026-07-20T00:00:00Z" }).result, "unknown");
});

test("routine rotation requires dual signatures and preserves authority", () => {
  assert.equal(verifyRoutineRotation({ authority, successorAuthority: authority, previousSignatureValid: true, successorSignatureValid: true }).result, "valid");
  assert.equal(verifyRoutineRotation({ authority, successorAuthority: deriveAuthority(Uint8Array.from({ length: 32 }, () => 1)), previousSignatureValid: true, successorSignatureValid: true }).result, "invalid");
});
