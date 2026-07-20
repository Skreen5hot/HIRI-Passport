export type CryptoCapabilities = {
  secureContext: boolean;
  random: boolean;
  sha256: boolean;
  aesGcm: boolean;
  hkdf: boolean;
  ed25519: boolean;
  x25519: boolean;
  indexedDb: boolean;
  serviceWorker: boolean;
  protocolReady: boolean;
};

async function supported(operation: () => Promise<unknown>): Promise<boolean> {
  try { await operation(); return true; } catch { return false; }
}

export async function probeCryptoCapabilities(): Promise<CryptoCapabilities> {
  const subtle = globalThis.crypto?.subtle;
  const secureContext = globalThis.isSecureContext === true || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const random = typeof globalThis.crypto?.getRandomValues === "function";
  const sha256 = !!subtle && await supported(() => subtle.digest("SHA-256", new Uint8Array()));
  const aesGcm = !!subtle && await supported(() => subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]));
  const hkdf = !!subtle && await supported(async () => subtle.importKey("raw", new Uint8Array(32), "HKDF", false, ["deriveBits"]));
  const ed25519 = !!subtle && await supported(() => subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]));
  const x25519 = !!subtle && await supported(() => subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]));
  const indexedDb = typeof globalThis.indexedDB?.open === "function";
  const serviceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  return { secureContext, random, sha256, aesGcm, hkdf, ed25519, x25519, indexedDb, serviceWorker, protocolReady: secureContext && random && sha256 && aesGcm && hkdf && ed25519 && x25519 && indexedDb };
}
