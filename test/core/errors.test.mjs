import test from "node:test";
import assert from "node:assert/strict";
import { CORE_ERROR_REGISTRY, protocolError, applyErrorTransition, selectProtocolError } from "../../src/core/errors.mjs";

// Core §16
test("Core registry has every normative row", () => {
  assert.equal(Object.keys(CORE_ERROR_REGISTRY).length, 31);
  for (const [code, entry] of Object.entries(CORE_ERROR_REGISTRY)) {
    assert.equal(entry.code, code);
    assert.ok(entry.phase);
    assert.ok(entry.transition);
  }
});

test("specific errors suppress structural fallback", () => {
  assert.deepEqual(selectProtocolError(["MESSAGE_MALFORMED", "NONCE_INVALID"]), ["NONCE_INVALID"]);
  assert.throws(() => protocolError("UNREGISTERED"), /unknown/);
  assert.equal(protocolError("vendor.example:CUSTOM").code, "vendor.example:CUSTOM");
});

test("unknown evidence stays distinct from invalid", () => {
  const missing = applyErrorTransition({ credentials: [{ result: "valid", status: "active" }] }, protocolError("ARTIFACT_MISSING", "/artifacts/0"));
  assert.equal(missing.credentials[0].result, "unknown");
  const invalid = applyErrorTransition({ credentials: [{ result: "valid", status: "active" }] }, protocolError("ARTIFACT_HASH_MISMATCH"));
  assert.equal(invalid.credentials[0].result, "invalid");
});
