import test from "node:test";
import assert from "node:assert/strict";
import { jcsBytes } from "../../src/core/canonical.mjs";
import { validatePresentationPackage, verifyReferencedArtifact } from "../../src/core/presentation-package.mjs";

const digest = async (bytes) => { const out = new Uint8Array(32); for (let i = 0; i < bytes.length; i++) out[i % 32] ^= bytes[i]; return out; };
const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

test("package limits and byte-distinct duplicates are enforced", () => {
  const value = { protocol: "hiri-passport/2.0", type: "PassportPresentationPackage", presentation: {}, artifacts: [] };
  assert.equal(validatePresentationPackage(value).result, "valid");
  assert.throws(() => validatePresentationPackage(value, { artifacts: 129 }), /exceeds/);
  value.artifacts = [{ kind: "jsonContent", contentHash: `sha256:${"a".repeat(64)}`, canonicalization: "JCS", value: { a: 1 } }, { kind: "jsonContent", contentHash: `sha256:${"a".repeat(64)}`, canonicalization: "JCS", value: { a: 2 } }];
  assert.throws(() => validatePresentationPackage(value), /byte-distinct/);
});

test("referenced artifacts are independently hash checked", async () => {
  const artifact = { kind: "jsonContent", contentHash: "", canonicalization: "JCS", value: { claim: true } };
  artifact.contentHash = `sha256:${hex(await digest(jcsBytes(artifact.value)))}`;
  assert.equal((await verifyReferencedArtifact({ hash: artifact.contentHash }, [{ artifact, provenance: { source: "cache" } }], { sha256: { digest } })).result, "valid");
  assert.equal((await verifyReferencedArtifact({ hash: `sha256:${"0".repeat(64)}` }, [], { sha256: { digest } })).result, "unknown");
});
