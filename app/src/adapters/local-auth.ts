import { decodeBase64Url, encodeBase64Url } from "../../../src/core/scalars.mjs";
import { parseStrictJson } from "../../../src/sdk/strict-json.mjs";
import type { KeyOperation, KeyOperationAuthorizer } from "../services/key-service";
import type { PassportDatabase } from "../storage/database";
import type { StorageCoordinator } from "../storage/storage-coordinator";

export const LOCAL_AUTH_CREDENTIAL_ID = "rhp:local-auth:credential" as const;
export const LOCAL_AUTH_CREDENTIAL_SCHEMA = "hiri-passport/local-auth-credential/1" as const;
export const LOCAL_AUTH_MAX_AGE_MS = 300_000 as const;

export type LocalAuthenticationOperation = KeyOperation;

export type LocalAuthenticationStatus =
  | Readonly<{ state: "unsupported" }>
  | Readonly<{ state: "not-enrolled" }>
  | Readonly<{ state: "ready"; createdAt: string }>;

export type LocalAuthenticationErrorCode =
  | "RHP_LOCAL_AUTH_UNSUPPORTED"
  | "RHP_LOCAL_AUTH_NOT_ENROLLED"
  | "RHP_LOCAL_AUTH_CANCELLED"
  | "RHP_LOCAL_AUTH_INVALIDATED"
  | "RHP_LOCAL_AUTH_EXPIRED"
  | "RHP_LOCAL_AUTH_BINDING_MISMATCH"
  | "RHP_LOCAL_AUTH_USER_VERIFICATION_REQUIRED"
  | "RHP_LOCAL_AUTH_SIGNATURE_INVALID"
  | "RHP_LOCAL_AUTH_REPLAYED"
  | "RHP_LOCAL_AUTH_STATE_CHANGED"
  | "RHP_LOCAL_AUTH_BUSY"
  | "RHP_LOCAL_AUTH_CORRUPT"
  | "RHP_LOCAL_AUTH_FAILED"
  | "RHP_LOCAL_AUTH_TEST_ADAPTER_FORBIDDEN";

const SAFE_MESSAGES = Object.freeze<Record<LocalAuthenticationErrorCode, string>>({
  RHP_LOCAL_AUTH_UNSUPPORTED: "Required device user verification is unavailable.",
  RHP_LOCAL_AUTH_NOT_ENROLLED: "Device user verification has not been set up.",
  RHP_LOCAL_AUTH_CANCELLED: "Device user verification was cancelled.",
  RHP_LOCAL_AUTH_INVALIDATED: "Device user verification was invalidated.",
  RHP_LOCAL_AUTH_EXPIRED: "Device user verification expired.",
  RHP_LOCAL_AUTH_BINDING_MISMATCH: "Device user verification did not match this operation.",
  RHP_LOCAL_AUTH_USER_VERIFICATION_REQUIRED: "The authenticator did not perform required user verification.",
  RHP_LOCAL_AUTH_SIGNATURE_INVALID: "Device user verification could not be authenticated.",
  RHP_LOCAL_AUTH_REPLAYED: "Device user verification was already used.",
  RHP_LOCAL_AUTH_STATE_CHANGED: "The protected operation changed during device verification.",
  RHP_LOCAL_AUTH_BUSY: "Another device-verification ceremony is already active.",
  RHP_LOCAL_AUTH_CORRUPT: "Stored device-verification state did not pass integrity checks.",
  RHP_LOCAL_AUTH_FAILED: "Device user verification failed.",
  RHP_LOCAL_AUTH_TEST_ADAPTER_FORBIDDEN: "The local-authentication test adapter is unavailable in this build."
});

export class LocalAuthenticationError extends Error {
  readonly code: LocalAuthenticationErrorCode;

  constructor(code: LocalAuthenticationErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "LocalAuthenticationError";
    this.code = code;
  }
}

export type LocalAuthenticatorRegistrationRequest = Readonly<{
  challenge: Uint8Array;
  rpId: string;
  rpName: string;
  userId: Uint8Array;
  userName: string;
  userDisplayName: string;
  timeoutMs: number;
  expectedOrigin: string;
  operation: "authority-creation";
  stateHash: string;
  issuedAt: number;
  expiresAt: number;
  signal: AbortSignal;
}>;

export type LocalAuthenticatorAssertionRequest = Readonly<{
  challenge: Uint8Array;
  credentialId: Uint8Array;
  rpId: string;
  timeoutMs: number;
  expectedOrigin: string;
  operation: LocalAuthenticationOperation;
  stateHash: string;
  issuedAt: number;
  expiresAt: number;
  signal: AbortSignal;
}>;

export type LocalAuthenticatorRegistration = Readonly<{
  credentialId: Uint8Array;
  clientDataJSON: Uint8Array;
  authenticatorData: Uint8Array;
  publicKeySpki: Uint8Array;
  publicKeyAlgorithm: -7 | -257;
}>;

export type LocalAuthenticatorAssertion = Readonly<{
  credentialId: Uint8Array;
  clientDataJSON: Uint8Array;
  authenticatorData: Uint8Array;
  signature: Uint8Array;
}>;

export type LocalAuthenticatorPort = Readonly<{
  assurance: "browser-webauthn" | "automated-test-only";
  supportsUserVerification(): Promise<boolean>;
  register(request: LocalAuthenticatorRegistrationRequest): Promise<LocalAuthenticatorRegistration>;
  authenticate(request: LocalAuthenticatorAssertionRequest): Promise<LocalAuthenticatorAssertion>;
}>;

export type CurrentArtifactGate = Readonly<{
  assertCurrent(input: Readonly<{
    operation: LocalAuthenticationOperation;
    stateHash: string;
  }>): Promise<void>;
}>;

export type LocalAuthentication = KeyOperationAuthorizer & Readonly<{
  inspect(input: Readonly<{ stateHash: string }>): Promise<LocalAuthenticationStatus>;
  enroll(input: Readonly<{ stateHash: string }>): Promise<Extract<LocalAuthenticationStatus, { state: "ready" }>>;
  invalidate(): void;
  dispose(): void;
}>;

export type LocalAuthenticationTestScript = Readonly<{
  supportsUserVerification?(): boolean | Promise<boolean>;
  register(request: LocalAuthenticatorRegistrationRequest): Promise<LocalAuthenticatorRegistration>;
  authenticate(request: LocalAuthenticatorAssertionRequest): Promise<LocalAuthenticatorAssertion>;
}>;

type StoredLocalAuthCredential = Readonly<{
  id: typeof LOCAL_AUTH_CREDENTIAL_ID;
  schema: typeof LOCAL_AUTH_CREDENTIAL_SCHEMA;
  credentialId: string;
  rpId: string;
  origin: string;
  publicKeySpki: Uint8Array;
  publicKeyAlgorithm: -7 | -257;
  signatureCounter: number;
  createdAt: string;
}>;

type NavigationInvalidationPort = Readonly<{
  subscribe(listener: () => void): () => void;
}>;

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const RP_ID_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/u;
const PROTOCOL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const AUTH_DATA_MINIMUM_BYTES = 37;
const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const SUPPORTED_ALGORITHMS = Object.freeze([-7, -257] as const);
const OPERATIONS = Object.freeze([
  "authority-creation",
  "presentation-signing",
  "same-device-rotation",
  "key-compromise",
  "authority-abandonment",
  "destructive-key-deletion"
] as const satisfies readonly LocalAuthenticationOperation[]);

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

function bytes(value: ArrayBuffer): Uint8Array {
  return new Uint8Array(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function uint8(value: unknown): value is Uint8Array {
  return !!value && typeof value === "object" &&
    Object.prototype.toString.call(value) === "[object Uint8Array]" &&
    typeof (value as Uint8Array).byteLength === "number";
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function protocolTimestamp(value: string): boolean {
  if (!PROTOCOL_TIME_PATTERN.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().replace(".000Z", "Z") === value;
}

function requireStateHash(value: string): void {
  if (!HASH_PATTERN.test(value)) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
}

function requireOperation(value: LocalAuthenticationOperation): void {
  if (!(OPERATIONS as readonly string[]).includes(value)) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function randomBytes(length: number): Uint8Array {
  const value = new Uint8Array(length);
  globalThis.crypto.getRandomValues(value);
  return value;
}

function timestamp(milliseconds: number): string {
  return new Date(milliseconds).toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function validateCredential(value: unknown, expected: Readonly<{ rpId: string; origin: string }>): StoredLocalAuthCredential {
  const keys = [
    "createdAt", "credentialId", "id", "origin", "publicKeyAlgorithm", "publicKeySpki", "rpId", "schema", "signatureCounter"
  ] as const;
  if (!record(value) || !exactKeys(value, keys) || value.id !== LOCAL_AUTH_CREDENTIAL_ID ||
    value.schema !== LOCAL_AUTH_CREDENTIAL_SCHEMA || typeof value.credentialId !== "string" ||
    value.rpId !== expected.rpId || value.origin !== expected.origin ||
    !uint8(value.publicKeySpki) || value.publicKeySpki.byteLength < 32 || value.publicKeySpki.byteLength > 4096 ||
    !SUPPORTED_ALGORITHMS.includes(value.publicKeyAlgorithm as -7 | -257) ||
    !Number.isInteger(value.signatureCounter) || Number(value.signatureCounter) < 0 || Number(value.signatureCounter) > 0xffffffff ||
    typeof value.createdAt !== "string" || !protocolTimestamp(value.createdAt)) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CORRUPT");
  }
  try {
    const credentialId = decodeBase64Url(value.credentialId);
    if (credentialId.byteLength < 16 || credentialId.byteLength > 1024) throw new TypeError();
  } catch {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CORRUPT");
  }
  return value as StoredLocalAuthCredential;
}

function clientData(
  input: Uint8Array,
  expected: Readonly<{ type: "webauthn.create" | "webauthn.get"; challenge: Uint8Array; origin: string }>
): void {
  if (!uint8(input) || input.byteLength < 2 || input.byteLength > 8192) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
  let parsed: unknown;
  try {
    parsed = parseStrictJson(new TextDecoder("utf-8", { fatal: true }).decode(input), {
      maximumBytes: 8192,
      maximumDepth: 4,
      maximumStringLength: 4096
    });
  } catch {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
  if (!record(parsed) || parsed.type !== expected.type ||
    parsed.challenge !== encodeBase64Url(expected.challenge) || parsed.origin !== expected.origin ||
    parsed.crossOrigin === true || (parsed.crossOrigin !== undefined && parsed.crossOrigin !== false)) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
}

async function authenticatorData(
  input: Uint8Array,
  rpId: string,
  requireVerification = true
): Promise<number> {
  if (!uint8(input) || input.byteLength < AUTH_DATA_MINIMUM_BYTES || input.byteLength > 8192) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
  const expectedRpIdHash = bytes(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
  if (!sameBytes(input.subarray(0, 32), expectedRpIdHash)) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
  }
  const flags = input[32];
  if ((flags & FLAG_USER_PRESENT) === 0 || (requireVerification && (flags & FLAG_USER_VERIFIED) === 0)) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_USER_VERIFICATION_REQUIRED");
  }
  return new DataView(input.buffer, input.byteOffset + 33, 4).getUint32(0, false);
}

function derLength(bytes: Uint8Array, offset: number): Readonly<{ length: number; next: number }> {
  const first = bytes[offset];
  if (first === undefined) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  if ((first & 0x80) === 0) return { length: first, next: offset + 1 };
  const octets = first & 0x7f;
  if (octets < 1 || octets > 2 || offset + octets >= bytes.length) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  }
  let length = 0;
  for (let index = 0; index < octets; index += 1) length = (length << 8) | bytes[offset + 1 + index];
  if (length < 128) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  return { length, next: offset + 1 + octets };
}

function derInteger(bytes: Uint8Array, offset: number): Readonly<{ value: Uint8Array; next: number }> {
  if (bytes[offset] !== 0x02) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  const size = derLength(bytes, offset + 1);
  const end = size.next + size.length;
  if (size.length < 1 || end > bytes.length) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  let value = bytes.subarray(size.next, end);
  if ((value[0] & 0x80) !== 0) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  if (value.byteLength > 1 && value[0] === 0) {
    if ((value[1] & 0x80) === 0) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
    value = value.subarray(1);
  }
  if (value.byteLength > 32) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  return { value, next: end };
}

function ecdsaDerToRaw(signature: Uint8Array): Uint8Array {
  if (signature[0] !== 0x30) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  const sequence = derLength(signature, 1);
  if (sequence.next + sequence.length !== signature.length) {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  }
  const r = derInteger(signature, sequence.next);
  const s = derInteger(signature, r.next);
  if (s.next !== signature.length) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
  const raw = new Uint8Array(64);
  raw.set(r.value, 32 - r.value.byteLength);
  raw.set(s.value, 64 - s.value.byteLength);
  return raw;
}

async function verifyAssertionSignature(
  credential: StoredLocalAuthCredential,
  assertion: LocalAuthenticatorAssertion
): Promise<boolean> {
  const clientHash = bytes(await crypto.subtle.digest("SHA-256", source(assertion.clientDataJSON)));
  const signed = new Uint8Array(assertion.authenticatorData.byteLength + clientHash.byteLength);
  signed.set(assertion.authenticatorData);
  signed.set(clientHash, assertion.authenticatorData.byteLength);
  try {
    if (credential.publicKeyAlgorithm === -7) {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        source(credential.publicKeySpki),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
      return crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        source(ecdsaDerToRaw(assertion.signature)),
        source(signed)
      );
    }
    const publicKey = await crypto.subtle.importKey(
      "spki",
      source(credential.publicKeySpki),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, source(assertion.signature), source(signed));
  } catch {
    return false;
  }
}

function challengeBinding(input: Readonly<{
  ceremony: "registration" | "authentication";
  operation: LocalAuthenticationOperation;
  stateHash: string;
  issuedAt: number;
  expiresAt: number;
  nonce: Uint8Array;
}>): Uint8Array {
  const binding = new TextEncoder().encode([
    "HIRI-RHP-LOCAL-AUTH-V1",
    input.ceremony,
    input.operation,
    input.stateHash,
    String(input.issuedAt),
    String(input.expiresAt),
    encodeBase64Url(input.nonce)
  ].join("\0"));
  return binding;
}

async function digestChallenge(input: Parameters<typeof challengeBinding>[0]): Promise<Uint8Array> {
  return bytes(await crypto.subtle.digest("SHA-256", source(challengeBinding(input))));
}

function browserNavigationInvalidation(): NavigationInvalidationPort {
  return Object.freeze({
    subscribe(listener: () => void) {
      const events = ["beforeunload", "hashchange", "pagehide", "popstate"] as const;
      for (const event of events) window.addEventListener(event, listener);
      return () => {
        for (const event of events) window.removeEventListener(event, listener);
      };
    }
  });
}

function browserAuthenticator(): LocalAuthenticatorPort {
  function publicKeyCredentialConstructor(): typeof PublicKeyCredential | undefined {
    return globalThis.PublicKeyCredential;
  }

  return Object.freeze({
    assurance: "browser-webauthn" as const,
    async supportsUserVerification(): Promise<boolean> {
      const constructor = publicKeyCredentialConstructor();
      if (!globalThis.isSecureContext || !constructor || !navigator.credentials?.create || !navigator.credentials?.get ||
        typeof constructor.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
      try {
        return await constructor.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    },
    async register(request): Promise<LocalAuthenticatorRegistration> {
      const credential = await navigator.credentials.create({
        signal: request.signal,
        publicKey: {
          challenge: source(request.challenge),
          rp: { id: request.rpId, name: request.rpName },
          user: {
            id: source(request.userId),
            name: request.userName,
            displayName: request.userDisplayName
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          timeout: request.timeoutMs,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "required",
            requireResidentKey: true,
            userVerification: "required"
          }
        }
      });
      if (!credential || credential.type !== "public-key" || !("rawId" in credential) || !("response" in credential)) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
      }
      const publicCredential = credential as PublicKeyCredential;
      const response = publicCredential.response as AuthenticatorAttestationResponse;
      if (typeof response.getAuthenticatorData !== "function" || typeof response.getPublicKey !== "function" ||
        typeof response.getPublicKeyAlgorithm !== "function") throw new LocalAuthenticationError("RHP_LOCAL_AUTH_UNSUPPORTED");
      const publicKey = response.getPublicKey();
      const algorithm = response.getPublicKeyAlgorithm();
      if (!publicKey || !SUPPORTED_ALGORITHMS.includes(algorithm as -7 | -257)) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_UNSUPPORTED");
      }
      return Object.freeze({
        credentialId: bytes(publicCredential.rawId),
        clientDataJSON: bytes(response.clientDataJSON),
        authenticatorData: bytes(response.getAuthenticatorData()),
        publicKeySpki: bytes(publicKey),
        publicKeyAlgorithm: algorithm as -7 | -257
      });
    },
    async authenticate(request): Promise<LocalAuthenticatorAssertion> {
      const credential = await navigator.credentials.get({
        signal: request.signal,
        publicKey: {
          challenge: source(request.challenge),
          rpId: request.rpId,
          allowCredentials: [{ id: source(request.credentialId), type: "public-key", transports: ["internal"] }],
          userVerification: "required",
          timeout: request.timeoutMs
        }
      });
      if (!credential || credential.type !== "public-key" || !("rawId" in credential) || !("response" in credential)) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
      }
      const publicCredential = credential as PublicKeyCredential;
      const response = publicCredential.response as AuthenticatorAssertionResponse;
      if (!(response.clientDataJSON instanceof ArrayBuffer) || !(response.authenticatorData instanceof ArrayBuffer) ||
        !(response.signature instanceof ArrayBuffer)) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
      return Object.freeze({
        credentialId: bytes(publicCredential.rawId),
        clientDataJSON: bytes(response.clientDataJSON),
        authenticatorData: bytes(response.authenticatorData),
        signature: bytes(response.signature)
      });
    }
  });
}

function mapCeremonyError(error: unknown, invalidated: boolean, expired: boolean): LocalAuthenticationError {
  if (error instanceof LocalAuthenticationError) return error;
  if (expired) return new LocalAuthenticationError("RHP_LOCAL_AUTH_EXPIRED");
  if (invalidated) return new LocalAuthenticationError("RHP_LOCAL_AUTH_INVALIDATED");
  const name = error instanceof DOMException ? error.name :
    record(error) && typeof error.name === "string" ? error.name : "";
  if (name === "AbortError" || name === "NotAllowedError") {
    return new LocalAuthenticationError("RHP_LOCAL_AUTH_CANCELLED");
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return new LocalAuthenticationError("RHP_LOCAL_AUTH_UNSUPPORTED");
  }
  return new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
}

export function createLocalAuthenticationTestAdapter(script: LocalAuthenticationTestScript): LocalAuthenticatorPort {
  if (import.meta.env.MODE !== "test") {
    throw new LocalAuthenticationError("RHP_LOCAL_AUTH_TEST_ADAPTER_FORBIDDEN");
  }
  if (!script || typeof script.register !== "function" || typeof script.authenticate !== "function") {
    throw new TypeError("local-authentication test script is incomplete");
  }
  return Object.freeze({
    assurance: "automated-test-only" as const,
    supportsUserVerification: async () => script.supportsUserVerification ? await script.supportsUserVerification() : true,
    register: request => script.register(request),
    authenticate: request => script.authenticate(request)
  });
}

export function createLocalAuthentication(options: Readonly<{
  profile: "production" | "automated-test";
  database: PassportDatabase;
  coordinator: StorageCoordinator;
  rpId: string;
  expectedOrigin: string;
  currentStateHash(): string;
  currentArtifact: CurrentArtifactGate;
  clock?: Readonly<{ now(): number }>;
  authorizationLifetimeMs?: number;
  authenticator?: LocalAuthenticatorPort;
  navigation?: NavigationInvalidationPort;
}>): LocalAuthentication {
  if (options.database.profile !== "real-holder-preview" || options.coordinator.database !== options.database) {
    throw new TypeError("local authentication requires one real-holder-preview storage boundary");
  }
  if (!RP_ID_PATTERN.test(options.rpId) || options.rpId !== options.rpId.toLowerCase()) {
    throw new TypeError("local-authentication RP ID is invalid");
  }
  let origin: URL;
  try { origin = new URL(options.expectedOrigin); } catch { throw new TypeError("local-authentication origin is invalid"); }
  if (origin.origin !== options.expectedOrigin || origin.protocol !== "https:" || origin.hostname !== options.rpId ||
    origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new TypeError("local-authentication origin and RP ID do not match");
  }
  if (typeof options.currentStateHash !== "function" || !options.currentArtifact ||
    typeof options.currentArtifact.assertCurrent !== "function") {
    throw new TypeError("local-authentication operation gates are required");
  }
  const lifetime = options.authorizationLifetimeMs ?? LOCAL_AUTH_MAX_AGE_MS;
  if (!Number.isSafeInteger(lifetime) || lifetime < 1 || lifetime > LOCAL_AUTH_MAX_AGE_MS) {
    throw new TypeError("local-authentication lifetime must not exceed 300 seconds");
  }
  if (options.profile === "production" && options.authenticator !== undefined) {
    throw new TypeError("production local authentication must use the browser WebAuthn adapter");
  }
  if (options.profile === "automated-test" && options.authenticator?.assurance !== "automated-test-only") {
    throw new TypeError("automated local authentication requires the test-only adapter");
  }
  const authenticator = options.profile === "production" ? browserAuthenticator() : options.authenticator!;
  const clock = options.clock ?? Object.freeze({ now: Date.now });
  const navigation = options.navigation ?? browserNavigationInvalidation();
  const consumed = new Set<string>();
  let generation = 0;
  let active: AbortController | null = null;
  let disposed = false;
  const unsubscribe = navigation.subscribe(() => invalidate());

  function invalidate(): void {
    generation += 1;
    active?.abort();
    active = null;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    invalidate();
    unsubscribe();
  }

  function requireCurrentState(expected: string): void {
    requireStateHash(expected);
    let actual: string;
    try { actual = options.currentStateHash(); } catch { throw new LocalAuthenticationError("RHP_LOCAL_AUTH_STATE_CHANGED"); }
    if (actual !== expected) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_STATE_CHANGED");
  }

  async function assertCurrent(operation: LocalAuthenticationOperation, stateHash: string): Promise<void> {
    requireOperation(operation);
    requireCurrentState(stateHash);
    await options.currentArtifact.assertCurrent(Object.freeze({ operation, stateHash }));
    requireCurrentState(stateHash);
  }

  async function readCredential(): Promise<StoredLocalAuthCredential | undefined> {
    const value = await options.database.runTransaction(["settings"], "readonly", stores => {
      return stores.request<unknown>(stores.store("settings").get(LOCAL_AUTH_CREDENTIAL_ID));
    });
    return value === undefined ? undefined : validateCredential(value, { rpId: options.rpId, origin: options.expectedOrigin });
  }

  async function supported(): Promise<boolean> {
    if (disposed) return false;
    try { return await authenticator.supportsUserVerification(); } catch { return false; }
  }

  async function inspect(input: Readonly<{ stateHash: string }>): Promise<LocalAuthenticationStatus> {
    requireStateHash(input.stateHash);
    if (!await supported()) return Object.freeze({ state: "unsupported" });
    await assertCurrent("authority-creation", input.stateHash);
    const credential = await readCredential();
    return credential
      ? Object.freeze({ state: "ready", createdAt: credential.createdAt })
      : Object.freeze({ state: "not-enrolled" });
  }

  async function ceremony<Result>(perform: (context: Readonly<{
    controller: AbortController;
    ceremonyGeneration: number;
    issuedAt: number;
    expiresAt: number;
    assertLive(): void;
  }>) => Promise<Result>): Promise<Result> {
    if (disposed) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_INVALIDATED");
    if (active) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BUSY");
    const controller = new AbortController();
    active = controller;
    const ceremonyGeneration = generation;
    const issuedAt = clock.now();
    if (!Number.isSafeInteger(issuedAt) || issuedAt < 0) {
      active = null;
      throw new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
    }
    const expiresAt = issuedAt + lifetime;
    let timedOut = false;
    const timeout = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, lifetime);
    const assertLive = (): void => {
      if (timedOut || clock.now() >= expiresAt) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_EXPIRED");
      if (ceremonyGeneration !== generation || controller.signal.aborted) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_INVALIDATED");
      }
    };
    try {
      const result = await perform(Object.freeze({ controller, ceremonyGeneration, issuedAt, expiresAt, assertLive }));
      assertLive();
      return result;
    } catch (error) {
      throw mapCeremonyError(error, ceremonyGeneration !== generation, timedOut);
    } finally {
      globalThis.clearTimeout(timeout);
      if (active === controller) active = null;
      controller.abort();
    }
  }

  async function enroll(input: Readonly<{ stateHash: string }>): Promise<Extract<LocalAuthenticationStatus, { state: "ready" }>> {
    requireStateHash(input.stateHash);
    if (!await supported()) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_UNSUPPORTED");
    await assertCurrent("authority-creation", input.stateHash);
    const leaseTime = clock.now();
    const leaseToken = `local-auth-enroll-${encodeBase64Url(randomBytes(16))}`;
    return options.coordinator.runSensitiveOperation({
      scope: "local-authentication:enrollment",
      token: leaseToken,
      now: leaseTime,
      ttlMs: LOCAL_AUTH_MAX_AGE_MS
    }, async () => {
      const existing = await readCredential();
      if (existing) return Object.freeze({ state: "ready" as const, createdAt: existing.createdAt });
      return ceremony(async context => {
        const nonce = randomBytes(32);
        const challenge = await digestChallenge({
          ceremony: "registration",
          operation: "authority-creation",
          stateHash: input.stateHash,
          issuedAt: context.issuedAt,
          expiresAt: context.expiresAt,
          nonce
        });
        context.controller.signal.addEventListener("abort", () => challenge.fill(0), { once: true });
        nonce.fill(0);
        const userId = randomBytes(32);
        let registration: LocalAuthenticatorRegistration;
        try {
          registration = await authenticator.register(Object.freeze({
            challenge,
            rpId: options.rpId,
            rpName: "HIRI Real Holder Preview",
            userId,
            userName: "hiri-preview-holder",
            userDisplayName: "HIRI Preview holder",
            timeoutMs: lifetime,
            expectedOrigin: options.expectedOrigin,
            operation: "authority-creation",
            stateHash: input.stateHash,
            issuedAt: context.issuedAt,
            expiresAt: context.expiresAt,
            signal: context.controller.signal
          }));
        } finally {
          userId.fill(0);
        }
        context.assertLive();
        requireCurrentState(input.stateHash);
        clientData(registration.clientDataJSON, {
          type: "webauthn.create",
          challenge,
          origin: options.expectedOrigin
        });
        const signatureCounter = await authenticatorData(registration.authenticatorData, options.rpId);
        if (!uint8(registration.credentialId) || registration.credentialId.byteLength < 16 ||
          registration.credentialId.byteLength > 1024 || !uint8(registration.publicKeySpki) ||
          registration.publicKeySpki.byteLength < 32 || registration.publicKeySpki.byteLength > 4096 ||
          !SUPPORTED_ALGORITHMS.includes(registration.publicKeyAlgorithm)) {
          throw new LocalAuthenticationError("RHP_LOCAL_AUTH_FAILED");
        }
        await assertCurrent("authority-creation", input.stateHash);
        context.assertLive();
        const createdAt = timestamp(clock.now());
        const stored: StoredLocalAuthCredential = Object.freeze({
          id: LOCAL_AUTH_CREDENTIAL_ID,
          schema: LOCAL_AUTH_CREDENTIAL_SCHEMA,
          credentialId: encodeBase64Url(registration.credentialId),
          rpId: options.rpId,
          origin: options.expectedOrigin,
          publicKeySpki: new Uint8Array(registration.publicKeySpki),
          publicKeyAlgorithm: registration.publicKeyAlgorithm,
          signatureCounter,
          createdAt
        });
        const outcome = await options.database.runTransaction(["settings"], "readwrite", async stores => {
          const settings = stores.store("settings");
          if (await stores.request(settings.get(LOCAL_AUTH_CREDENTIAL_ID)) !== undefined) return "exists" as const;
          await stores.request(settings.put(stored));
          return "stored" as const;
        });
        if (outcome === "exists") throw new LocalAuthenticationError("RHP_LOCAL_AUTH_STATE_CHANGED");
        challenge.fill(0);
        return Object.freeze({ state: "ready" as const, createdAt });
      });
    });
  }

  async function authorize(input: Readonly<{ operation: LocalAuthenticationOperation; stateHash: string }>): Promise<void> {
    requireOperation(input.operation);
    requireStateHash(input.stateHash);
    if (!await supported()) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_UNSUPPORTED");
    await assertCurrent(input.operation, input.stateHash);
    const credential = await readCredential();
    if (!credential) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_NOT_ENROLLED");
    await ceremony(async context => {
      const nonce = randomBytes(32);
      const challenge = await digestChallenge({
        ceremony: "authentication",
        operation: input.operation,
        stateHash: input.stateHash,
        issuedAt: context.issuedAt,
        expiresAt: context.expiresAt,
        nonce
      });
      context.controller.signal.addEventListener("abort", () => challenge.fill(0), { once: true });
      nonce.fill(0);
      const challengeId = encodeBase64Url(challenge);
      if (consumed.has(challengeId)) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_REPLAYED");
      const assertion = await authenticator.authenticate(Object.freeze({
        challenge,
        credentialId: decodeBase64Url(credential.credentialId),
        rpId: options.rpId,
        timeoutMs: lifetime,
        expectedOrigin: options.expectedOrigin,
        operation: input.operation,
        stateHash: input.stateHash,
        issuedAt: context.issuedAt,
        expiresAt: context.expiresAt,
        signal: context.controller.signal
      }));
      context.assertLive();
      requireCurrentState(input.stateHash);
      if (!sameBytes(assertion.credentialId, decodeBase64Url(credential.credentialId))) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_BINDING_MISMATCH");
      }
      clientData(assertion.clientDataJSON, {
        type: "webauthn.get",
        challenge,
        origin: options.expectedOrigin
      });
      const signatureCounter = await authenticatorData(assertion.authenticatorData, options.rpId);
      if (!await verifyAssertionSignature(credential, assertion)) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_SIGNATURE_INVALID");
      }
      if (credential.signatureCounter > 0 && signatureCounter <= credential.signatureCounter) {
        throw new LocalAuthenticationError("RHP_LOCAL_AUTH_REPLAYED");
      }
      await assertCurrent(input.operation, input.stateHash);
      context.assertLive();
      const outcome = await options.database.runTransaction(["settings"], "readwrite", async stores => {
        const settings = stores.store("settings");
        const raw = await stores.request<unknown>(settings.get(LOCAL_AUTH_CREDENTIAL_ID));
        let current: StoredLocalAuthCredential;
        try { current = validateCredential(raw, { rpId: options.rpId, origin: options.expectedOrigin }); }
        catch { return "corrupt" as const; }
        if (current.credentialId !== credential.credentialId || current.signatureCounter !== credential.signatureCounter) {
          return "changed" as const;
        }
        await stores.request(settings.put(Object.freeze({ ...current, signatureCounter })));
        return "consumed" as const;
      });
      if (outcome === "corrupt") throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CORRUPT");
      if (outcome === "changed") throw new LocalAuthenticationError("RHP_LOCAL_AUTH_REPLAYED");
      consumed.add(challengeId);
      if (consumed.size > 256) consumed.delete(consumed.values().next().value!);
      challenge.fill(0);
    });
  }

  return Object.freeze({ inspect, enroll, authorize, invalidate, dispose });
}
