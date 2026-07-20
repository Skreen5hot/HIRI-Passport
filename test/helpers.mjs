import { encodeBase58Btc, encodeBase64Url } from "../src/core/scalars.mjs";

export const id = (seed = 1) => encodeBase64Url(Uint8Array.from({ length: 16 }, (_, index) => (seed + index) & 255));
export const nonce = (seed = 1) => encodeBase64Url(Uint8Array.from({ length: 32 }, (_, index) => (seed + index) & 255));
export const authority = (seed = 1) => `key:ed25519:${encodeBase58Btc(Uint8Array.from({ length: 32 }, (_, index) => (seed + index) & 255))}`;
export const method = (value, key = "key-1") => `hiri://${value}/key/main#${key}`;

function signature(bytes) {
  const out = new Uint8Array(64);
  for (let index = 0; index < bytes.length; index += 1) out[index % 64] ^= bytes[index];
  return out;
}

export const toyEd25519 = Object.freeze({
  async sign(_method, bytes) { return signature(bytes); },
  async verify(_method, bytes, candidate) {
    return candidate.length === 64 && candidate.every((byte, index) => byte === signature(bytes)[index]);
  }
});

export const lifecycle = (value, verificationMethod) => ({
  result: "valid",
  authority: value,
  methods: [{ id: verificationMethod, authorizedFrom: "2026-01-01T00:00:00Z" }]
});
