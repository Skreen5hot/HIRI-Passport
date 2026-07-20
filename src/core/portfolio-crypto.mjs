import { jcsBytes } from "./canonical.mjs";
import { sha256Identifier } from "./proof.mjs";
import {
  decodeBase58Btc,
  decodeBase64Url,
  encodeBase58Btc,
  encodeBase64Url,
  parseEd25519Authority,
  parseRandomId
} from "./scalars.mjs";
import { CORE_LIMITS } from "./constants.mjs";

const CEK_INFO = new TextEncoder().encode("hiri-cek-v1.1");

function concat(left, right) {
  const out = new Uint8Array(left.length + right.length);
  out.set(left);
  out.set(right, left.length);
  return out;
}

async function random(ports, size) {
  const bytes = await ports.randomBytes(size);
  if (!(bytes instanceof Uint8Array) || bytes.length !== size) throw new TypeError(`randomBytes must return ${size} bytes`);
  return bytes;
}

async function deriveWrapKey(ports, privateKey, publicKey, iv, recipientId) {
  const shared = await ports.x25519.derive(privateKey, publicKey);
  const info = concat(CEK_INFO, new TextEncoder().encode(recipientId));
  const key = await ports.hkdfSha256.derive(shared, { salt: iv, info, length: 32 });
  if (!(key instanceof Uint8Array) || key.length !== 32) throw new TypeError("HKDF must return a 32-byte key");
  return key;
}

export async function encryptPortfolio({ holderAuthority, plaintext, recipients }, ports) {
  parseEd25519Authority(holderAuthority);
  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > CORE_LIMITS.maxRecipients) {
    throw new RangeError("published Mode 2 portfolio requires 1 through 64 recipients");
  }
  const plaintextBytes = jcsBytes(plaintext);
  const cek = await random(ports, 32);
  const iv = await random(ports, 12);
  const ephemeral = await ports.x25519.generateKeyPair();
  if (ephemeral?.privateKey == null || !(ephemeral?.publicKey instanceof Uint8Array) || ephemeral.publicKey.length !== 32) {
    throw new TypeError("X25519 generateKeyPair returned invalid key material");
  }
  const ids = new Set();
  const wrapped = [];
  for (const recipient of recipients) {
    if (!(recipient?.publicKey instanceof Uint8Array) || recipient.publicKey.length !== 32) throw new TypeError("recipient public key must be 32 bytes");
    let id;
    do id = encodeBase64Url(await random(ports, 16)); while (ids.has(id));
    ids.add(id);
    const wrapKey = await deriveWrapKey(ports, ephemeral.privateKey, recipient.publicKey, iv, id);
    const encryptedKey = await ports.aesGcm.encrypt({ key: wrapKey, iv, plaintext: cek, tagLength: 128 });
    wrapped.push(Object.freeze({ id, encryptedKey: encodeBase64Url(encryptedKey) }));
  }
  const ciphertext = await ports.aesGcm.encrypt({ key: cek, iv, plaintext: plaintextBytes, tagLength: 128 });
  const plaintextHash = await sha256Identifier(plaintextBytes, ports.sha256);
  const contentHash = await sha256Identifier(ciphertext, ports.sha256);
  return Object.freeze({
    uri: `hiri://${holderAuthority}/data/passport-main`,
    publisher: holderAuthority,
    privacy: Object.freeze({
      mode: "encrypted",
      parameters: Object.freeze({
        algorithm: "AES-256-GCM",
        iv: encodeBase64Url(iv),
        tagLength: 128,
        plaintextHash,
        plaintextSize: plaintextBytes.length,
        plaintextFormat: "application/ld+json",
        ephemeralPublicKey: encodeBase58Btc(ephemeral.publicKey),
        keyAgreement: "X25519-HKDF-SHA256",
        recipients: Object.freeze(wrapped)
      })
    }),
    content: Object.freeze({ hash: contentHash, addressing: "raw-sha256", canonicalization: "JCS", format: "application/octet-stream", size: ciphertext.length }),
    ciphertext
  });
}

export async function decryptPortfolio({ manifest, ciphertext, recipientKey, recipientProcessingLimit = CORE_LIMITS.maxRecipients }, ports) {
  try {
    const parameters = manifest?.["hiri:privacy"]?.parameters ?? manifest?.privacy?.parameters;
    const entries = parameters?.recipients;
    if (manifest?.["hiri:privacy"]?.mode !== "encrypted" && manifest?.privacy?.mode !== "encrypted") throw new Error("mode");
    if (!Array.isArray(entries) || entries.length > CORE_LIMITS.maxRecipients || recipientProcessingLimit < 1) throw new Error("recipients");
    const iv = decodeBase64Url(parameters.iv, 12);
    const ephemeralPublicKey = decodeBase58Btc(parameters.ephemeralPublicKey, 32);
    const candidates = recipientKey.id ? entries.filter((entry) => entry.id === recipientKey.id) : entries.slice(0, recipientProcessingLimit);
    for (const entry of candidates) {
      parseRandomId(entry.id);
      try {
        const wrapKey = await deriveWrapKey(ports, recipientKey.privateKey, ephemeralPublicKey, iv, entry.id);
        const cek = await ports.aesGcm.decrypt({ key: wrapKey, iv, ciphertext: decodeBase64Url(entry.encryptedKey), tagLength: 128 });
        const plaintextBytes = await ports.aesGcm.decrypt({ key: cek, iv, ciphertext, tagLength: 128 });
        if (await sha256Identifier(plaintextBytes, ports.sha256) !== parameters.plaintextHash) continue;
        return { result: "valid", plaintext: JSON.parse(new TextDecoder().decode(plaintextBytes)) };
      } catch {
        // All recipient/decryption failures are deliberately collapsed.
      }
    }
  } catch {
    // External failure remains indistinguishable.
  }
  return { result: "invalid", error: "PORTFOLIO_DECRYPT_FAILED" };
}
