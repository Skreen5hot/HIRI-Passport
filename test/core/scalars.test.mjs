import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeBase64Url,
  parseRandomId,
  parseNonce,
  parseUtcSeconds,
  parseAbsoluteUri,
  parseClaimPointer,
  assertClosedObject,
  unicodeScalarLength
} from "../../src/core/scalars.mjs";
import { EVIDENCE_RESULTS, PROVENANCE, CORE_LIMITS } from "../../src/core/constants.mjs";

// Core §3, Core §10.1, Core Appendix A
test("random identifiers and nonces enforce canonical lengths", () => {
  assert.equal(parseRandomId(encodeBase64Url(new Uint8Array(16))), "AAAAAAAAAAAAAAAAAAAAAA");
  assert.equal(parseNonce(encodeBase64Url(new Uint8Array(32))), "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  assert.throws(() => parseRandomId("AA"), /exactly 16/);
  assert.throws(() => parseNonce("AA=="), /canonical/);
});

test("timestamps, URIs, and claim pointers are strict", () => {
  assert.equal(parseUtcSeconds("2026-07-20T12:00:00Z"), Date.UTC(2026, 6, 20, 12));
  assert.throws(() => parseUtcSeconds("2026-02-30T00:00:00Z"), /calendar/);
  assert.equal(parseAbsoluteUri("https://example.test/schema"), "https://example.test/schema");
  assert.throws(() => parseAbsoluteUri("https://example.test/schema#x"), /fragment/);
  assert.equal(parseClaimPointer("/claims/licenseNumber"), "/claims/licenseNumber");
  assert.throws(() => parseClaimPointer("/claims/0"), /array/);
});

test("closed shapes and frozen vocabularies are stable", () => {
  assertClosedObject({ a: 1 }, ["a"]);
  assert.throws(() => assertClosedObject({ a: 1, b: 2 }, ["a"]), /unknown member/);
  assert.deepEqual(EVIDENCE_RESULTS, ["valid", "invalid", "unknown", "not-applicable"]);
  assert.equal(PROVENANCE.length, 4);
  assert.equal(CORE_LIMITS.maxRecipients, 64);
  assert.equal(unicodeScalarLength("A😀"), 2);
});
