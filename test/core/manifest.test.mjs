import test from "node:test";
import assert from "node:assert/strict";
import { verifyPassportManifest } from "../../src/core/manifest.mjs";

// Core §6, Core §6.1
function manifest(version = "0") {
  return {
    "@type": "hiri:ResolutionManifest",
    "hiri:version": version,
    "hiri:content": { hash: "sha256:" + "0".repeat(64), addressing: "raw-sha256", canonicalization: "JCS" },
    "hiri:signature": { type: "Ed25519Signature2020", canonicalization: "JCS", created: "2026-07-20T00:00:00Z" }
  };
}

test("Passport manifest composes a pinned upstream verifier", async () => {
  const ports = { hiriVerifier: { verifyManifest: async () => ({ result: "valid", authority: "issuer", manifestHash: "sha256:" + "1".repeat(64), chain: "valid" }) } };
  assert.equal((await verifyPassportManifest({ manifest: manifest(), content: {}, evaluationTime: 0 }, ports)).result, "valid");
});

test("manifest profile symmetry and envelope type are enforced", async () => {
  const bad = manifest();
  bad["hiri:signature"].canonicalization = "URDNA2015";
  assert.equal((await verifyPassportManifest({ manifest: bad }, {})).error, "HIRI_MANIFEST_INVALID");
  assert.equal((await verifyPassportManifest({ manifest: { "@type": "hiri:AttestationManifest" } }, {})).result, "invalid");
});

test("non-genesis predecessor failure is distinct", async () => {
  const ports = { hiriVerifier: { verifyManifest: async () => ({ result: "valid", chain: "invalid" }) } };
  assert.equal((await verifyPassportManifest({ manifest: manifest("2") }, ports)).error, "HIRI_CHAIN_INVALID");
});
