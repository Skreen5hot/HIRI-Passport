import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { encryptPortfolio, decryptPortfolio } from "../../src/core/portfolio-crypto.mjs";
import { deriveAuthority } from "../../src/core/authority.mjs";

// Core §7, Core §7.1, Core §7.2, Core §7.3
function xor(input, key, iv) {
  const body = Uint8Array.from(input, (byte, index) => byte ^ key[index % key.length] ^ iv[index % iv.length]);
  const out = new Uint8Array(body.length + 16);
  out.set(body);
  out.fill(0xa5, body.length);
  return out;
}

function ports() {
  let counter = 0;
  return {
    randomBytes: async (size) => Uint8Array.from({ length: size }, () => (counter++ % 251) + 1),
    sha256: { digest: async (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest()) },
    x25519: {
      generateKeyPair: async () => ({ privateKey: new Uint8Array(32).fill(7), publicKey: new Uint8Array(32).fill(7) }),
      derive: async (privateKey, publicKey) => Uint8Array.from(privateKey, (byte, index) => byte ^ publicKey[index])
    },
    hkdfSha256: { derive: async (shared, { salt, info, length }) => Uint8Array.from({ length }, (_, index) => shared[index % shared.length] ^ salt[index % salt.length] ^ info[index % info.length]) },
    aesGcm: {
      encrypt: async ({ key, iv, plaintext }) => xor(plaintext, key, iv),
      decrypt: async ({ key, iv, ciphertext }) => {
        if (ciphertext.length < 16 || !ciphertext.slice(-16).every((byte) => byte === 0xa5)) throw new Error("tag");
        return xor(ciphertext.slice(0, -16), key, iv).slice(0, -16);
      }
    }
  };
}

test("portfolio encryption hides records and uses fresh recipient identifiers", async () => {
  const authority = deriveAuthority(new Uint8Array(32));
  const recipientKey = new Uint8Array(32).fill(9);
  const encrypted = await encryptPortfolio({ holderAuthority: authority, plaintext: { secret: "credential" }, recipients: [{ publicKey: recipientKey }] }, ports());
  assert.equal(encrypted.uri, `hiri://${authority}/data/passport-main`);
  assert.equal(encrypted.privacy.mode, "encrypted");
  assert.equal(encrypted.privacy.parameters.recipients.length, 1);
  assert.equal(JSON.stringify(encrypted).includes("credential"), false);
});

test("portfolio decrypts through the matching recipient and collapses failures", async () => {
  const authority = deriveAuthority(new Uint8Array(32));
  const crypto = ports();
  const recipientKey = new Uint8Array(32).fill(7);
  const encrypted = await encryptPortfolio({ holderAuthority: authority, plaintext: { value: 1 }, recipients: [{ publicKey: recipientKey }] }, crypto);
  const manifest = { privacy: encrypted.privacy };
  const result = await decryptPortfolio({ manifest, ciphertext: encrypted.ciphertext, recipientKey: { privateKey: recipientKey } }, crypto);
  assert.equal(result.result, "valid");
  assert.deepEqual(result.plaintext, { value: 1 });
  const failed = await decryptPortfolio({ manifest, ciphertext: encrypted.ciphertext, recipientKey: { privateKey: new Uint8Array(32).fill(1) } }, crypto);
  assert.equal(failed.error, "PORTFOLIO_DECRYPT_FAILED");
});
