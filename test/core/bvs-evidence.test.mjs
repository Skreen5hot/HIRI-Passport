import test from "node:test";
import assert from "node:assert/strict";
import { validateCoreBvsEvidence, classifyBvsTrust } from "../../src/core/bvs-evidence.mjs";

// Core §8.4
const hash = "sha256:" + "0".repeat(64);
const evidence = { type: "hiri:passport:BvsEvidence", evidenceProfile: "https://example.test/profile", evidenceProfileHash: hash, sourceProvider: "registry", sourceVerificationMethod: "record", verifiedAt: "2026-07-20T00:00:00Z", adapterId: "registry", adapterVersion: "1.0.0" };

test("BVS evidence profile is hash-bound", () => {
  const registry = { get: () => ({ hash, definesHolderBinding: true }) };
  assert.equal(validateCoreBvsEvidence({ evidence }, registry).result, "valid");
  assert.equal(validateCoreBvsEvidence({ evidence }, { get: () => null }).result, "unknown");
});

test("unconfigured BVS remains visible and untrusted", () => {
  const result = classifyBvsTrust({ bvsAuthority: "bvs", evidence, credential: { schema: "s" } }, { evaluate: () => false });
  assert.equal(result.issuerTrust, "untrusted");
  assert.equal(result.key.length, 6);
});
