const SECRET_NAMES = /(?:private|secret|signingKey|x25519Key|contentKey|plaintext|sourceToken|password)/iu;

export function createReplayStore(storage = new Map(), now) {
  if (typeof now !== "function") throw new TypeError("an injected clock is required");
  return Object.freeze({
    has(key) { const expiry = storage.get(key); if (expiry == null) return false; if (expiry < now()) { storage.delete(key); return false; } return true; },
    put(key, expiry) { if (storage.has(key) && storage.get(key) >= now()) throw new Error("replay detected"); storage.set(key, expiry); },
    consumePresentation(holderAuthority, presentationId, expiry, skewSeconds = 0) { const key = `${holderAuthority}\u0000${presentationId}`; this.put(key, expiry + skewSeconds * 1000); return key; }
  });
}

export function createAuthenticatedHeadCache(storage = new Map()) {
  return Object.freeze({
    get(uri) { return storage.get(uri); },
    put(uri, entry) {
      if (entry?.authenticated !== true || !Number.isSafeInteger(entry.version) || entry.version < 0) throw new TypeError("authenticated versioned head required");
      const previous = storage.get(uri);
      if (previous && entry.version < previous.version && entry.rollbackExplanationVerified !== true) throw new Error("authenticated head rollback rejected");
      storage.set(uri, structuredClone(entry)); return entry;
    }
  });
}

export function createProtectedKeyStore(adapter) {
  if (!adapter || !["get", "put", "delete"].every((name) => typeof adapter[name] === "function")) throw new TypeError("protected storage adapter required");
  return Object.freeze({ get: (id) => adapter.get(id), put: (id, key) => adapter.put(id, key), delete: (id) => adapter.delete(id) });
}

export function redactForLog(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, SECRET_NAMES.test(key) ? "[REDACTED]" : redactForLog(child)]));
}

export function createPortfolioBackup({ manifest, ciphertext, recipients, chainEvidence, warningAccepted }) {
  if (warningAccepted !== true) throw new Error("backup limitations must be acknowledged");
  if (!manifest || !(ciphertext instanceof Uint8Array) || !Array.isArray(recipients)) throw new TypeError("complete encrypted backup inputs required");
  return { format: "hiri-passport-mode2-backup-v1", manifest: structuredClone(manifest), ciphertext: new Uint8Array(ciphertext), recipients: structuredClone(recipients), chainEvidence: structuredClone(chainEvidence ?? []), warning: "Removing a recipient cannot retract ciphertext already copied." };
}
