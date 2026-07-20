import test from "node:test";
import assert from "node:assert/strict";
import { jcsString, jcsBytes } from "../../src/core/canonical.mjs";
import { unsignedProofObject, domainSeparatedBytes, signDomainSeparated, verifyDomainSeparated } from "../../src/core/proof.mjs";

// Core §10.2, Core Appendix B, BVP Appendix A
test("JCS sorts keys and rejects invalid data", () => {
  assert.equal(jcsString({ z: 1, a: [true, null] }), '{"a":[true,null],"z":1}');
  assert.throws(() => jcsString({ n: Number.NaN }), /finite/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => jcsString(cyclic), /cyclic/);
});

test("unsigned form removes only proofValue", () => {
  const message = { a: 1, proof: { type: "Ed25519Signature2020", proofValue: "zbad" } };
  assert.deepEqual(unsignedProofObject(message), { a: 1, proof: { type: "Ed25519Signature2020" } });
  assert.equal(domainSeparatedBytes("DOMAIN", message)[6], 0);
});

test("domain-separated signing uses exact bytes", async () => {
  let captured;
  const crypto = {
    async sign(method, bytes) {
      assert.equal(method, "key-1");
      captured = bytes;
      return new Uint8Array(64);
    },
    async verify(method, bytes, signature) {
      return method === "key-1" && Buffer.from(bytes).equals(Buffer.from(captured)) && signature.length === 64;
    }
  };
  const message = { a: 1, proof: { verificationMethod: "key-1" } };
  message.proof.proofValue = await signDomainSeparated("DOMAIN", message, "key-1", crypto);
  assert.equal(await verifyDomainSeparated("DOMAIN", message, message.proof, crypto), true);
  assert.notDeepEqual([...domainSeparatedBytes("OTHER", message)], [...captured]);
  assert.deepEqual([...jcsBytes({ b: 2, a: 1 })], [...new TextEncoder().encode('{"a":1,"b":2}')]);
});
