import { repository } from "../storage/repositories";
type StoredKey = { id: string; privateKey: CryptoKey; publicKey: CryptoKey; publicKeyBytes: Uint8Array; algorithm: "Ed25519" | "X25519" };
const keys = repository<StoredKey>("keys");

export async function generateProtectedKey(id: string, algorithm: StoredKey["algorithm"], usages: KeyUsage[]): Promise<StoredKey> {
  const pair = await crypto.subtle.generateKey({ name: algorithm }, true, usages) as CryptoKeyPair;
  const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const encodedPrivate = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const privateKey = await crypto.subtle.importKey("pkcs8", encodedPrivate, { name: algorithm }, false, usages.filter(usage => usage === "sign" || usage === "deriveBits"));
  const stored = { id, privateKey, publicKey: pair.publicKey, publicKeyBytes, algorithm };
  await keys.put(stored); return stored;
}

export function protectedKeyStore() { return Object.freeze({ get: keys.get, put: (value: StoredKey) => keys.put(value), delete: keys.delete }); }
