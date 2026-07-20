import { concatBytes, hex, jcsBytes } from "./canonical.mjs";
import { decodeBase58Btc } from "./scalars.mjs";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("signature must be Uint8Array");
  if (!bytes.length) return "";
  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) leadingZeroes += 1;
  if (leadingZeroes === bytes.length) return "1".repeat(leadingZeroes);
  const digits = [0];
  for (const byte of bytes.slice(leadingZeroes)) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const next = digits[index] * 256 + carry;
      digits[index] = next % 58;
      carry = Math.floor(next / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let output = "1".repeat(leadingZeroes);
  for (let index = digits.length - 1; index >= 0; index -= 1) output += BASE58[digits[index]];
  return output;
}

export function unsignedProofObject(message) {
  if (!message || typeof message !== "object" || Array.isArray(message) || !message.proof || typeof message.proof !== "object") {
    throw new TypeError("message must contain a proof object");
  }
  const copy = structuredClone(message);
  delete copy.proof.proofValue;
  return copy;
}

export function domainSeparatedBytes(domain, message) {
  if (typeof domain !== "string" || !domain.length) throw new TypeError("signature domain is required");
  return concatBytes(new TextEncoder().encode(domain), Uint8Array.of(0), jcsBytes(unsignedProofObject(message)));
}

export async function sha256Identifier(bytes, crypto) {
  if (!crypto || typeof crypto.digest !== "function") throw new TypeError("SHA-256 digest port is required");
  const digest = await crypto.digest(bytes);
  if (!(digest instanceof Uint8Array) || digest.length !== 32) throw new TypeError("SHA-256 port must return 32 bytes");
  return `sha256:${hex(digest)}`;
}

export async function signDomainSeparated(domain, message, method, crypto) {
  if (!crypto || typeof crypto.sign !== "function") throw new TypeError("Ed25519 sign port is required");
  const signature = await crypto.sign(method, domainSeparatedBytes(domain, message));
  if (!(signature instanceof Uint8Array) || signature.length !== 64) throw new TypeError("Ed25519 signature must be 64 bytes");
  return `z${encodeBase58(signature)}`;
}

export async function verifyDomainSeparated(domain, message, proof, crypto) {
  if (!proof || typeof proof.proofValue !== "string") return false;
  if (!crypto || typeof crypto.verify !== "function") throw new TypeError("Ed25519 verify port is required");
  let signature;
  try {
    signature = decodeBase58Btc(proof.proofValue, 64);
  } catch {
    return false;
  }
  return await crypto.verify(proof.verificationMethod, domainSeparatedBytes(domain, message), signature) === true;
}
