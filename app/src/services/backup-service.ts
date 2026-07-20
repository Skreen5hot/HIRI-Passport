const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const decode = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

export async function createProtectedBackup(payload: unknown, passphrase: string) {
  if (passphrase.length < 12) throw new Error("Use a backup passphrase of at least 12 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  return JSON.stringify({ version: 1, kdf: "PBKDF2-SHA256", iterations: 310_000, salt: encode(salt), iv: encode(iv), ciphertext: encode(ciphertext) });
}

export async function openProtectedBackup(serialized: string, passphrase: string) {
  const backup = JSON.parse(serialized) as { version: number; salt: string; iv: string; ciphertext: string; iterations: number };
  if (backup.version !== 1 || backup.iterations !== 310_000) throw new Error("Unsupported backup format.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: decode(backup.salt), iterations: backup.iterations }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(backup.iv) }, key, decode(backup.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}
