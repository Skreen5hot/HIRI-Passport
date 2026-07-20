import { generateProtectedKey, protectedKeyStore } from "../adapters/protected-key-store";
export async function createHolderKeySet(prefix: string) {
  const signing = await generateProtectedKey(`${prefix}:signing`, "Ed25519", ["sign", "verify"]);
  const agreement = await generateProtectedKey(`${prefix}:agreement`, "X25519", ["deriveBits"]);
  return { signing, agreement };
}
export function keyAccess() { const store = protectedKeyStore(); return { async signingPrivate(method: string) { const value = await store.get(method); if (!value) throw new Error("signing key unavailable"); return value.privateKey; }, async signingPublic(method: string) { const value = await store.get(method); if (!value) throw new Error("verification key unavailable"); return value.publicKey; } }; }
