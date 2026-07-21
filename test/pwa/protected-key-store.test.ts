// @vitest-environment node
import { readFileSync } from "node:fs";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { deriveAuthority } from "../../src/core/authority.mjs";
import {
  PROTECTED_KEY_HANDLE_PREFIX,
  PROTECTED_KEY_METADATA_PREFIX,
  ProtectedKeyError,
  createProtectedKeyStore,
  type KeyCapabilityEvidence,
  type ProtectedKeyCrypto,
  type ProtectedKeyDefinition,
  type ProtectedKeyStore
} from "../../app/src/adapters/protected-key-store";
import { createPassportDatabase, type PassportDatabase } from "../../app/src/storage/database";
import { createRepository } from "../../app/src/storage/repositories";

const NOW = "2026-07-21T12:00:00Z";
const EVIDENCE: KeyCapabilityEvidence = Object.freeze({
  sha256: `sha256:${"a".repeat(64)}`,
  notAfter: "2026-10-20T00:00:00Z"
});

function nativeCryptoPort(): ProtectedKeyCrypto {
  const subtle = crypto.subtle;
  return Object.freeze({
    deriveBits: subtle.deriveBits.bind(subtle),
    exportKey: subtle.exportKey.bind(subtle),
    generateKey: subtle.generateKey.bind(subtle),
    importKey: subtle.importKey.bind(subtle),
    sign: subtle.sign.bind(subtle),
    verify: subtle.verify.bind(subtle)
  }) as ProtectedKeyCrypto;
}

function previewDatabase(factory = new IDBFactory()): PassportDatabase {
  return createPassportDatabase({ profile: "real-holder-preview", factory });
}

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

const DEFINITIONS = Object.freeze([
  Object.freeze({ keyId: "signing-test-1", algorithm: "Ed25519", purpose: "signing" }),
  Object.freeze({ keyId: "agreement-test-1", algorithm: "X25519", purpose: "agreement" })
] satisfies readonly ProtectedKeyDefinition[]);

async function createPair(store: ProtectedKeyStore) {
  let authority = "";
  const keys = await store.createKeys({
    definitions: DEFINITIONS,
    createdAt: NOW,
    capabilityEvidence: EVIDENCE,
    identify(publicKeys) {
      authority = deriveAuthority(publicKeys["signing-test-1"]);
      return Object.freeze([
        Object.freeze({ keyId: "signing-test-1", authority, methodId: `hiri://${authority}/key/main#key-1` }),
        Object.freeze({ keyId: "agreement-test-1", authority, methodId: `hiri://${authority}/key/main#key-agreement-1` })
      ]);
    }
  });
  return { authority, signing: keys[0], agreement: keys[1] };
}

describe("protected key store", () => {
  it("generates final private keys non-extractably, separates handles from public metadata, and survives reload", async () => {
    const database = previewDatabase();
    const calls: Array<{ format: KeyFormat; type: KeyType; extractable: boolean }> = [];
    const native = nativeCryptoPort();
    const exportKey = native.exportKey;
    const cryptoPort = Object.freeze({
      ...native,
      exportKey: ((format: KeyFormat, key: CryptoKey) => {
        calls.push({ format, type: key.type, extractable: key.extractable });
        return exportKey(format, key);
      }) as ProtectedKeyCrypto["exportKey"]
    }) as ProtectedKeyCrypto;
    const store = createProtectedKeyStore({ database, crypto: cryptoPort });
    const log = vi.spyOn(console, "log");
    const info = vi.spyOn(console, "info");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");

    await store.verifyDurableSupport(["Ed25519", "X25519"]);
    const keySet = await createPair(store);

    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(calls).toEqual(calls.map(() => expect.objectContaining({ format: "raw", type: "public" })));
    expect(calls.every(call => call.extractable)).toBe(true);
    expect([log, info, warn, error].every(spy => spy.mock.calls.length === 0)).toBe(true);
    expect(JSON.stringify(keySet)).not.toMatch(/privateKey|secretKey|privateBytes/iu);

    const handles = createRepository<{ id: string; schema: string; keyId: string; privateKey: CryptoKey }>(database, "keys");
    const settings = createRepository<Record<string, unknown> & { id: string }>(database, "settings");
    const signingHandle = await handles.get(`${PROTECTED_KEY_HANDLE_PREFIX}${keySet.signing.keyId}`);
    const signingMetadata = await settings.get(`${PROTECTED_KEY_METADATA_PREFIX}${keySet.signing.keyId}`);
    expect(signingHandle).toBeDefined();
    expect(signingHandle?.privateKey).toBeInstanceOf(CryptoKey);
    expect(signingHandle?.privateKey.extractable).toBe(false);
    expect(Object.keys(signingHandle ?? {}).sort()).toEqual(["id", "keyId", "privateKey", "schema"]);
    expect(signingMetadata).toMatchObject({
      keyId: keySet.signing.keyId,
      methodId: keySet.signing.methodId,
      lifecycle: "active",
      capabilityEvidence: EVIDENCE
    });
    expect(signingMetadata).not.toHaveProperty("privateKey");
    await expect(crypto.subtle.exportKey("jwk", signingHandle!.privateKey)).rejects.toThrow();

    database.close();
    // A PassportDatabase intentionally hides its IDBFactory. Reuse the same
    // database object after close to exercise the same close/reopen path used by
    // the runtime durability probe.
    const reopenedStore = createProtectedKeyStore({ database, crypto: native });
    const message = new TextEncoder().encode("durable protected signing");
    const signature = await reopenedStore.sign(keySet.signing.methodId, message);
    const publicKey = await crypto.subtle.importKey("raw", source(keySet.signing.publicKeyBytes), { name: "Ed25519" }, false, ["verify"]);
    await expect(crypto.subtle.verify("Ed25519", publicKey, source(signature), source(message))).resolves.toBe(true);

    const peer = await crypto.subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]) as CryptoKeyPair;
    const peerPublic = new Uint8Array(await crypto.subtle.exportKey("raw", peer.publicKey));
    const holderShared = await reopenedStore.derive(keySet.agreement.methodId, peerPublic);
    const holderPublic = await crypto.subtle.importKey("raw", source(keySet.agreement.publicKeyBytes), { name: "X25519" }, false, []);
    const peerShared = new Uint8Array(await crypto.subtle.deriveBits({ name: "X25519", public: holderPublic }, peer.privateKey, 256));
    expect(holderShared).toEqual(peerShared);

    const remainingHandles = await handles.all();
    expect(remainingHandles.some(value => value.keyId.startsWith("rhp-probe-"))).toBe(false);
    database.close();
  });

  it("commits no handle or metadata when final key-set generation fails", async () => {
    const database = previewDatabase();
    const native = nativeCryptoPort();
    let generations = 0;
    const generateKey = native.generateKey;
    const failing = Object.freeze({
      ...native,
      generateKey: ((...args: Parameters<ProtectedKeyCrypto["generateKey"]>) => {
        generations += 1;
        if (generations === 2) return Promise.reject(new DOMException("unsupported", "NotSupportedError"));
        return generateKey(...args);
      }) as ProtectedKeyCrypto["generateKey"]
    }) as ProtectedKeyCrypto;
    const store = createProtectedKeyStore({ database, crypto: failing });

    await expect(createPair(store)).rejects.toMatchObject({
      code: "RHP_KEY_CAPABILITY_UNAVAILABLE"
    });
    expect(await createRepository<{ id: string }>(database, "keys").all()).toEqual([]);
    expect((await createRepository<{ id: string }>(database, "settings").all())
      .filter(value => value.id.startsWith(PROTECTED_KEY_METADATA_PREFIX))).toEqual([]);
    database.close();
  });

  it("fails the capability gate when a crypto provider ignores non-extractable generation", async () => {
    const database = previewDatabase();
    const native = nativeCryptoPort();
    const insecure = Object.freeze({
      ...native,
      generateKey: ((_algorithm: AlgorithmIdentifier, _extractable: boolean, usages: KeyUsage[]) => {
        return crypto.subtle.generateKey({ name: "Ed25519" }, true, usages);
      }) as ProtectedKeyCrypto["generateKey"]
    }) as ProtectedKeyCrypto;
    const store = createProtectedKeyStore({ database, crypto: insecure });

    await expect(store.verifyDurableSupport(["Ed25519"])).rejects.toMatchObject({
      code: "RHP_KEY_CAPABILITY_UNAVAILABLE"
    });
    expect(await createRepository<{ id: string }>(database, "keys").all()).toEqual([]);
    database.close();
  });

  it("contains no private-key encoding path in the protected adapter or service", () => {
    const implementation = [
      readFileSync(new URL("../../app/src/adapters/protected-key-store.ts", import.meta.url), "utf8"),
      readFileSync(new URL("../../app/src/services/key-service.ts", import.meta.url), "utf8")
    ].join("\n");
    expect(implementation).not.toMatch(/exportKey\s*\(\s*["'](?:pkcs8|jwk)["']/iu);
    expect(implementation).not.toMatch(/privateKeyBytes|encodedPrivate|privatePkcs/iu);
  });

  it("refuses to compose protected preview keys with the synthetic database", () => {
    const database = createPassportDatabase({ profile: "synthetic-demo", factory: new IDBFactory() });
    expect(() => createProtectedKeyStore({ database })).toThrow(/real-holder-preview/u);
    database.close();
  });
});
