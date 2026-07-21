import { browserRandomBytes } from "./browser-random";

export type KeyAccess = {
  signingPrivate(method: string): Promise<CryptoKey>;
  signingPublic(method: string): Promise<CryptoKey>;
};

function bytes(value: ArrayBuffer): Uint8Array { return new Uint8Array(value); }
function source(value: Uint8Array): Uint8Array<ArrayBuffer> { return new Uint8Array(value); }

export function createBrowserCryptoPorts(keys: KeyAccess) {
  const subtle = globalThis.crypto.subtle;
  return Object.freeze({
    randomBytes: async (length: number) => browserRandomBytes(length),
    sha256: Object.freeze({ digest: async (input: Uint8Array) => bytes(await subtle.digest("SHA-256", source(input))) }),
    ed25519: Object.freeze({
      sign: async (method: string, input: Uint8Array) => bytes(await subtle.sign("Ed25519", await keys.signingPrivate(method), source(input))),
      verify: async (method: string, input: Uint8Array, signature: Uint8Array) => subtle.verify("Ed25519", await keys.signingPublic(method), source(signature), source(input))
    }),
    aesGcm: Object.freeze({
      encrypt: async ({ key, iv, plaintext, additionalData }: { key: Uint8Array | CryptoKey; iv: Uint8Array; plaintext: Uint8Array; additionalData?: Uint8Array }) => {
        const cryptoKey = key instanceof Uint8Array ? await subtle.importKey("raw", source(key), { name: "AES-GCM", length: 256 }, false, ["encrypt"]) : key;
        return bytes(await subtle.encrypt({ name: "AES-GCM", iv: source(iv), additionalData: additionalData ? source(additionalData) : undefined, tagLength: 128 }, cryptoKey, source(plaintext)));
      },
      decrypt: async ({ key, iv, ciphertext, additionalData }: { key: Uint8Array | CryptoKey; iv: Uint8Array; ciphertext: Uint8Array; additionalData?: Uint8Array }) => {
        const cryptoKey = key instanceof Uint8Array ? await subtle.importKey("raw", source(key), { name: "AES-GCM", length: 256 }, false, ["decrypt"]) : key;
        return bytes(await subtle.decrypt({ name: "AES-GCM", iv: source(iv), additionalData: additionalData ? source(additionalData) : undefined, tagLength: 128 }, cryptoKey, source(ciphertext)));
      }
    }),
    hkdfSha256: Object.freeze({ derive: async (secret: Uint8Array, { salt, info, length }: { salt: Uint8Array; info: Uint8Array; length: number }) => {
      const material = await subtle.importKey("raw", source(secret), "HKDF", false, ["deriveBits"]);
      return bytes(await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: source(salt), info: source(info) }, material, length * 8));
    } }),
    x25519: Object.freeze({
      generateKeyPair: async () => {
        const generated = await subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]) as CryptoKeyPair;
        const publicKey = bytes(await subtle.exportKey("raw", generated.publicKey));
        return { privateKey: generated.privateKey, publicKey };
      },
      derive: async (privateKey: CryptoKey, publicKey: Uint8Array) => {
        const imported = await subtle.importKey("raw", source(publicKey), { name: "X25519" }, false, []);
        return bytes(await subtle.deriveBits({ name: "X25519", public: imported }, privateKey, 256));
      }
    })
  });
}
