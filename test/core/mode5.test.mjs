import test from "node:test";
import assert from "node:assert/strict";
import { verifyMode5Attestation } from "../../src/core/mode5.mjs";

// Core §8.6
const attestation = { "@id": "hiri://key:ed25519:zA/data/attestation-opaque", "@type": "hiri:AttestationManifest", "hiri:privacy": { mode: "attestation" } };

test("Mode 5 requires both attestor and exact subject", async () => {
  const ports = { hiriVerifier: { verifyAttestation: async () => ({ result: "valid", subjectManifestHash: "sha256:" + "1".repeat(64) }) } };
  assert.equal((await verifyMode5Attestation({ attestorManifest: attestation }, ports)).result, "unknown");
});

test("Mode 5 rejects content and wrong paths", async () => {
  assert.equal((await verifyMode5Attestation({ attestorManifest: { ...attestation, "hiri:content": {} } }, {})).result, "invalid");
  assert.equal((await verifyMode5Attestation({ attestorManifest: { ...attestation, "@id": "hiri://x/attestation/y" } }, {})).result, "invalid");
});
