export type CryptoCapabilities = Readonly<{
  secureContext: boolean;
  random: boolean;
  sha256: boolean;
  aesGcm: boolean;
  hkdf: boolean;
  ed25519: boolean;
  x25519: boolean;
  indexedDb: boolean;
  serviceWorker: boolean;
  storagePersistence: boolean;
  webAuthnUserVerification: boolean;
  protocolReady: boolean;
  holderOnboardingReady: boolean;
}>;

export type CryptoCapabilityPorts = Readonly<{
  crypto?: Crypto;
  indexedDb?: Pick<IDBFactory, "open">;
  navigator?: Navigator;
  secureContext?: boolean;
  hostname?: string;
  publicKeyCredential?: Pick<typeof PublicKeyCredential, "isUserVerifyingPlatformAuthenticatorAvailable">;
}>;

export const HOLDER_ONBOARDING_CAPABILITIES = [
  "secureContext",
  "random",
  "sha256",
  "aesGcm",
  "hkdf",
  "ed25519",
  "x25519",
  "indexedDb",
  "serviceWorker",
  "storagePersistence",
  "webAuthnUserVerification"
] as const satisfies readonly (keyof CryptoCapabilities)[];

export type HolderOnboardingCapability = (typeof HOLDER_ONBOARDING_CAPABILITIES)[number];

async function supported(operation: () => Promise<unknown>): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch {
    return false;
  }
}

function keyPair(value: CryptoKeyPair | CryptoKey): CryptoKeyPair {
  if (!("privateKey" in value) || !("publicKey" in value)) throw new TypeError("key pair unavailable");
  return value;
}

function bytes(value: ArrayBuffer): Uint8Array {
  return new Uint8Array(value);
}

function equal(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

async function proveAesGcm(subtle: SubtleCrypto, cryptoPort: Crypto): Promise<void> {
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = cryptoPort.getRandomValues(new Uint8Array(12));
  const plaintext = new Uint8Array([72, 73, 82, 73]);
  const additionalData = new Uint8Array([1, 9, 0]);
  const encrypted = await subtle.encrypt({ name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, plaintext);
  const decrypted = await subtle.decrypt({ name: "AES-GCM", iv, additionalData, tagLength: 128 }, key, encrypted);
  if (!equal(bytes(decrypted), plaintext)) throw new TypeError("AES-GCM proof failed");
}

async function proveHkdf(subtle: SubtleCrypto): Promise<void> {
  const key = await subtle.importKey("raw", new Uint8Array(32), "HKDF", false, ["deriveBits"]);
  const result = await subtle.deriveBits({
    name: "HKDF",
    hash: "SHA-256",
    salt: new Uint8Array([1]),
    info: new Uint8Array([2])
  }, key, 256);
  if (result.byteLength !== 32) throw new TypeError("HKDF proof failed");
}

async function proveEd25519(subtle: SubtleCrypto): Promise<void> {
  const pair = keyPair(await subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]));
  if (pair.privateKey.extractable) throw new TypeError("Ed25519 private key is extractable");
  const message = new Uint8Array([72, 73, 82, 73]);
  const signature = await subtle.sign("Ed25519", pair.privateKey, message);
  if (!await subtle.verify("Ed25519", pair.publicKey, signature, message)) {
    throw new TypeError("Ed25519 proof failed");
  }
}

async function proveX25519(subtle: SubtleCrypto): Promise<void> {
  const left = keyPair(await subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]));
  const right = keyPair(await subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]));
  if (left.privateKey.extractable || right.privateKey.extractable) throw new TypeError("X25519 private key is extractable");
  const leftBits = bytes(await subtle.deriveBits({ name: "X25519", public: right.publicKey }, left.privateKey, 256));
  const rightBits = bytes(await subtle.deriveBits({ name: "X25519", public: left.publicKey }, right.privateKey, 256));
  if (!equal(leftBits, rightBits)) throw new TypeError("X25519 proof failed");
}

function browserDefaults(): Required<Pick<CryptoCapabilityPorts, "secureContext" | "hostname">> {
  const hostname = typeof location === "undefined" ? "" : location.hostname;
  return {
    secureContext: globalThis.isSecureContext === true,
    hostname
  };
}

/**
 * An executable capability probe, not platform approval. Durable CryptoKey
 * restart behavior, current-artifact state, and owner-approved exact browser
 * evidence remain separate mandatory gates.
 */
export async function probeCryptoCapabilities(ports: CryptoCapabilityPorts = {}): Promise<CryptoCapabilities> {
  const defaults = browserDefaults();
  const cryptoPort = ports.crypto ?? globalThis.crypto;
  const subtle = cryptoPort?.subtle;
  const navigatorPort = ports.navigator ?? (typeof navigator === "undefined" ? undefined : navigator);
  const secureContext = (ports.secureContext ?? defaults.secureContext) ||
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(ports.hostname ?? defaults.hostname);
  const random = !!cryptoPort?.getRandomValues && await supported(async () => {
    const first = cryptoPort.getRandomValues(new Uint8Array(32));
    const second = cryptoPort.getRandomValues(new Uint8Array(32));
    if (first.every(value => value === 0) || equal(first, second)) throw new TypeError("randomness proof failed");
  });
  const sha256 = !!subtle && await supported(async () => {
    const result = await subtle.digest("SHA-256", new Uint8Array());
    if (result.byteLength !== 32) throw new TypeError("SHA-256 proof failed");
  });
  const aesGcm = !!subtle && !!cryptoPort && await supported(() => proveAesGcm(subtle, cryptoPort));
  const hkdf = !!subtle && await supported(() => proveHkdf(subtle));
  const ed25519 = !!subtle && await supported(() => proveEd25519(subtle));
  const x25519 = !!subtle && await supported(() => proveX25519(subtle));
  const indexedDb = typeof (ports.indexedDb ?? globalThis.indexedDB)?.open === "function";
  const serviceWorker = !!navigatorPort && "serviceWorker" in navigatorPort;
  const storagePersistence = !!navigatorPort?.storage &&
    typeof navigatorPort.storage.persisted === "function" &&
    typeof navigatorPort.storage.persist === "function";
  const publicKeyCredential = ports.publicKeyCredential ??
    (typeof PublicKeyCredential === "undefined" ? undefined : PublicKeyCredential);
  const webAuthnUserVerification = !!publicKeyCredential &&
    typeof publicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function" &&
    await supported(async () => {
      if (!await publicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
        throw new TypeError("user-verifying platform authenticator unavailable");
      }
    });
  const protocolReady = secureContext && random && sha256 && aesGcm && hkdf && ed25519 && x25519 && indexedDb;
  const holderOnboardingReady = protocolReady && serviceWorker && storagePersistence && webAuthnUserVerification;
  return Object.freeze({
    secureContext,
    random,
    sha256,
    aesGcm,
    hkdf,
    ed25519,
    x25519,
    indexedDb,
    serviceWorker,
    storagePersistence,
    webAuthnUserVerification,
    protocolReady,
    holderOnboardingReady
  });
}

export function missingHolderOnboardingCapabilities(
  capabilities: CryptoCapabilities
): readonly HolderOnboardingCapability[] {
  return Object.freeze(HOLDER_ONBOARDING_CAPABILITIES.filter(name => !capabilities[name]));
}
