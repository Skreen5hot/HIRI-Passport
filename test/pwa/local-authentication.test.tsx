import { IDBFactory } from "fake-indexeddb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_AUTH_CREDENTIAL_ID,
  LocalAuthenticationError,
  createLocalAuthentication,
  createLocalAuthenticationTestAdapter,
  type LocalAuthentication,
  type LocalAuthenticationOperation,
  type LocalAuthenticatorAssertion,
  type LocalAuthenticatorAssertionRequest,
  type LocalAuthenticatorRegistrationRequest
} from "../../app/src/adapters/local-auth";
import { SensitiveSurface } from "../../app/src/components/sensitive-surface";
import { LocalAuthRoute } from "../../app/src/routes/onboarding/local-auth";
import { createKeyService } from "../../app/src/services/key-service";
import { createPassportDatabase } from "../../app/src/storage/database";
import { createRepository } from "../../app/src/storage/repositories";
import { createStorageCoordinator } from "../../app/src/storage/storage-coordinator";

const RP_ID = "hiri-protocol.org";
const ORIGIN = "https://hiri-protocol.org";
const STATE_A = `sha256:${"1".repeat(64)}`;
const STATE_B = `sha256:${"2".repeat(64)}`;
const START = Date.parse("2026-07-21T12:00:00Z");

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

function clientData(type: "webauthn.create" | "webauthn.get", challenge: Uint8Array): Uint8Array {
  const base64url = Buffer.from(challenge).toString("base64url");
  return new TextEncoder().encode(JSON.stringify({ type, challenge: base64url, origin: ORIGIN, crossOrigin: false }));
}

async function authData(counter: number, verified = true): Promise<Uint8Array> {
  const result = new Uint8Array(37);
  result.set(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(RP_ID))));
  result[32] = verified ? 0x05 : 0x01;
  new DataView(result.buffer).setUint32(33, counter, false);
  return result;
}

function derInteger(value: Uint8Array): Uint8Array {
  let first = 0;
  while (first < value.length - 1 && value[first] === 0) first += 1;
  let normalized = value.subarray(first);
  if ((normalized[0] & 0x80) !== 0) {
    const positive = new Uint8Array(normalized.length + 1);
    positive.set(normalized, 1);
    normalized = positive;
  }
  const encoded = new Uint8Array(2 + normalized.length);
  encoded[0] = 0x02;
  encoded[1] = normalized.length;
  encoded.set(normalized, 2);
  return encoded;
}

function ecdsaRawToDer(signature: Uint8Array): Uint8Array {
  const r = derInteger(signature.subarray(0, 32));
  const s = derInteger(signature.subarray(32, 64));
  const result = new Uint8Array(2 + r.length + s.length);
  result[0] = 0x30;
  result[1] = r.length + s.length;
  result.set(r, 2);
  result.set(s, 2 + r.length);
  return result;
}

type AuthenticatorMode = "valid" | "cancel" | "replay" | "missing-uv" | "tampered" | "navigate" | "state-change" | "expire";

async function fixture(options: Readonly<{ supported?: boolean }> = {}) {
  const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
  const coordinator = createStorageCoordinator({ database, ownerId: "local-auth-test-tab" });
  await coordinator.start();
  let now = START;
  let stateHash = STATE_A;
  let mode: AuthenticatorMode = "valid";
  let keyPair: CryptoKeyPair | undefined;
  let counter = 1;
  let lastAssertion: LocalAuthenticatorAssertion | undefined;
  let authenticateCalls = 0;
  const assertions: Array<Omit<LocalAuthenticatorAssertionRequest, "signal" | "challenge" | "credentialId"> & {
    challenge: Uint8Array;
    credentialId: Uint8Array;
  }> = [];
  const gates: Array<{ operation: LocalAuthenticationOperation; stateHash: string }> = [];
  let gateFailure: Error | undefined;
  const credentialId = Uint8Array.from({ length: 32 }, (_, index) => index + 1);

  async function signAssertion(request: LocalAuthenticatorAssertionRequest, verified = true): Promise<LocalAuthenticatorAssertion> {
    if (!keyPair) throw new Error("test authenticator is not registered");
    counter += 1;
    const data = await authData(counter, verified);
    const client = clientData("webauthn.get", request.challenge);
    const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", source(client)));
    const signed = new Uint8Array(data.length + clientHash.length);
    signed.set(data);
    signed.set(clientHash, data.length);
    const raw = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, source(signed)));
    const assertion: LocalAuthenticatorAssertion = Object.freeze({
      credentialId: new Uint8Array(credentialId),
      clientDataJSON: client,
      authenticatorData: data,
      signature: ecdsaRawToDer(raw)
    });
    return assertion;
  }

  const authenticator = createLocalAuthenticationTestAdapter({
    supportsUserVerification: () => options.supported !== false,
    async register(request: LocalAuthenticatorRegistrationRequest) {
      keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]) as CryptoKeyPair;
      const publicKeySpki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
      return Object.freeze({
        credentialId: new Uint8Array(credentialId),
        clientDataJSON: clientData("webauthn.create", request.challenge),
        authenticatorData: await authData(counter),
        publicKeySpki,
        publicKeyAlgorithm: -7 as const
      });
    },
    async authenticate(request: LocalAuthenticatorAssertionRequest) {
      authenticateCalls += 1;
      assertions.push({
        ...request,
        challenge: new Uint8Array(request.challenge),
        credentialId: new Uint8Array(request.credentialId),
        signal: undefined
      } as unknown as (typeof assertions)[number]);
      if (mode === "cancel") throw new DOMException("cancelled", "NotAllowedError");
      if (mode === "replay" && lastAssertion) return lastAssertion;
      if (mode === "navigate") window.dispatchEvent(new HashChangeEvent("hashchange"));
      if (mode === "state-change") stateHash = STATE_B;
      if (mode === "expire") now = request.expiresAt;
      const assertion = await signAssertion(request, mode !== "missing-uv");
      if (mode === "tampered") assertion.signature[assertion.signature.length - 1] ^= 1;
      lastAssertion = assertion;
      return assertion;
    }
  });

  const authentication = createLocalAuthentication({
    profile: "automated-test",
    database,
    coordinator,
    rpId: RP_ID,
    expectedOrigin: ORIGIN,
    currentStateHash: () => stateHash,
    currentArtifact: Object.freeze({
      async assertCurrent(input: Readonly<{ operation: LocalAuthenticationOperation; stateHash: string }>) {
        gates.push({ ...input });
        if (gateFailure) throw gateFailure;
      }
    }),
    clock: Object.freeze({ now: () => now }),
    authenticator
  });

  return {
    database,
    coordinator,
    authentication,
    assertions,
    gates,
    get authenticateCalls() { return authenticateCalls; },
    setMode(value: AuthenticatorMode) { mode = value; },
    setStateHash(value: string) { stateHash = value; },
    setGateFailure(value: Error | undefined) { gateFailure = value; },
    cleanup() { authentication.dispose(); coordinator.close(); }
  };
}

describe("local WebAuthn authorization", () => {
  it("enrolls a UV credential and authorizes one exact operation/state binding", async () => {
    const value = await fixture();
    await expect(value.authentication.inspect({ stateHash: STATE_A })).resolves.toEqual({ state: "not-enrolled" });
    await expect(value.authentication.enroll({ stateHash: STATE_A })).resolves.toEqual({
      state: "ready",
      createdAt: "2026-07-21T12:00:00Z"
    });

    const stored = await createRepository<Record<string, unknown> & { id: string }>(value.database, "settings")
      .get(LOCAL_AUTH_CREDENTIAL_ID);
    expect(stored).toMatchObject({
      id: LOCAL_AUTH_CREDENTIAL_ID,
      rpId: RP_ID,
      origin: ORIGIN,
      publicKeyAlgorithm: -7,
      signatureCounter: 1
    });
    expect(JSON.stringify(stored)).not.toMatch(/"(?:challenge|signature|authenticatorData|clientData|privateKey)"/iu);

    await expect(value.authentication.authorize({ operation: "presentation-signing", stateHash: STATE_A })).resolves.toBeUndefined();
    expect(value.assertions).toHaveLength(1);
    expect(value.assertions[0]).toMatchObject({
      operation: "presentation-signing",
      stateHash: STATE_A,
      rpId: RP_ID,
      expectedOrigin: ORIGIN
    });
    expect(value.assertions[0].expiresAt - value.assertions[0].issuedAt).toBe(300_000);
    expect(value.gates.at(-1)).toEqual({ operation: "presentation-signing", stateHash: STATE_A });
    await expect(createRepository<Record<string, unknown> & { id: string }>(value.database, "settings")
      .get(LOCAL_AUTH_CREDENTIAL_ID)).resolves.toMatchObject({ signatureCounter: 2 });
    value.cleanup();
  });

  it("rejects replay, missing UV, and altered signatures without consuming authorization", async () => {
    const value = await fixture();
    await value.authentication.enroll({ stateHash: STATE_A });
    await value.authentication.authorize({ operation: "authority-creation", stateHash: STATE_A });

    value.setMode("replay");
    await expect(value.authentication.authorize({ operation: "authority-creation", stateHash: STATE_A }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_BINDING_MISMATCH" });
    value.setMode("missing-uv");
    await expect(value.authentication.authorize({ operation: "same-device-rotation", stateHash: STATE_A }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_USER_VERIFICATION_REQUIRED" });
    value.setMode("tampered");
    await expect(value.authentication.authorize({ operation: "key-compromise", stateHash: STATE_A }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_SIGNATURE_INVALID" });
    await expect(createRepository<Record<string, unknown> & { id: string }>(value.database, "settings")
      .get(LOCAL_AUTH_CREDENTIAL_ID)).resolves.toMatchObject({ signatureCounter: 2 });
    value.cleanup();
  });

  it("fails closed on cancellation, expiry, navigation, and material state change", async () => {
    const value = await fixture();
    await value.authentication.enroll({ stateHash: STATE_A });

    for (const [mode, code] of [
      ["cancel", "RHP_LOCAL_AUTH_CANCELLED"],
      ["expire", "RHP_LOCAL_AUTH_EXPIRED"],
      ["navigate", "RHP_LOCAL_AUTH_INVALIDATED"],
      ["state-change", "RHP_LOCAL_AUTH_STATE_CHANGED"]
    ] as const) {
      value.setStateHash(STATE_A);
      value.setMode(mode);
      await expect(value.authentication.authorize({ operation: "destructive-key-deletion", stateHash: STATE_A }))
        .rejects.toMatchObject({ code });
    }
    await expect(createRepository<Record<string, unknown> & { id: string }>(value.database, "settings")
      .get(LOCAL_AUTH_CREDENTIAL_ID)).resolves.toMatchObject({ signatureCounter: 1 });
    value.cleanup();
  });

  it("checks current-artifact state before credential access and rejects unsupported platforms", async () => {
    const blocked = await fixture();
    const gateFailure = new Error("reviewed artifact unavailable");
    blocked.setGateFailure(gateFailure);
    await expect(blocked.authentication.inspect({ stateHash: STATE_A })).rejects.toBe(gateFailure);
    await expect(blocked.authentication.enroll({ stateHash: STATE_A })).rejects.toBe(gateFailure);
    expect(blocked.authenticateCalls).toBe(0);
    blocked.cleanup();

    const unsupported = await fixture({ supported: false });
    await expect(unsupported.authentication.inspect({ stateHash: STATE_A })).resolves.toEqual({ state: "unsupported" });
    await expect(unsupported.authentication.enroll({ stateHash: STATE_A }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_UNSUPPORTED" });
    expect(unsupported.gates).toEqual([]);
    unsupported.cleanup();
  });

  it("leaves protected key storage empty when WebAuthn is cancelled at the service boundary", async () => {
    const value = await fixture();
    await value.authentication.enroll({ stateHash: STATE_A });
    value.setMode("cancel");
    let id = 0;
    const keys = createKeyService({
      database: value.database,
      coordinator: value.coordinator,
      authorization: value.authentication,
      capabilityEvidence: Object.freeze({
        sha256: `sha256:${"a".repeat(64)}`,
        notAfter: "2026-10-20T00:00:00Z"
      }),
      clock: Object.freeze({ now: () => "2026-07-21T12:00:00Z" }),
      randomId: () => `local-auth-integration-${++id}`
    });

    await expect(keys.createHolderKeySet({ stateHash: STATE_A }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_CANCELLED" });
    expect(await createRepository<{ id: string }>(value.database, "keys").all()).toEqual([]);
    value.cleanup();
  });

  it("rejects lifetimes beyond five minutes and production test-adapter injection", async () => {
    const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
    const coordinator = createStorageCoordinator({ database, ownerId: "composition-test" });
    await coordinator.start();
    const testAdapter = createLocalAuthenticationTestAdapter({
      register: async () => { throw new Error(); },
      authenticate: async () => { throw new Error(); }
    });
    const base = {
      database,
      coordinator,
      rpId: RP_ID,
      expectedOrigin: ORIGIN,
      currentStateHash: () => STATE_A,
      currentArtifact: { assertCurrent: async () => undefined }
    } as const;
    expect(() => createLocalAuthentication({
      ...base,
      profile: "automated-test",
      authorizationLifetimeMs: 300_001,
      authenticator: testAdapter
    })).toThrow(/300 seconds/iu);
    expect(() => createLocalAuthentication({ ...base, profile: "production", authenticator: testAdapter }))
      .toThrow(/must use the browser/iu);
    coordinator.close();
  });
});

describe("local-authentication UI boundaries", () => {
  it("keeps onboarding on the current screen when enrollment is cancelled", async () => {
    const onReady = vi.fn();
    const enroll = vi.fn(async () => { throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CANCELLED"); });
    const authentication = Object.freeze({
      inspect: async () => Object.freeze({ state: "not-enrolled" as const }),
      enroll,
      authorize: async () => undefined,
      invalidate() {},
      dispose() {}
    }) satisfies LocalAuthentication;
    render(<LocalAuthRoute authentication={authentication} stateHash={STATE_A} onReady={onReady} />);
    const button = await screen.findByRole("button", { name: "Set up device verification" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent(/cancelled.*nothing was created/iu);
    expect(enroll).toHaveBeenCalledWith({ stateHash: STATE_A });
    expect(onReady).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Continue to authority setup" })).not.toBeInTheDocument();
  });

  it("blocks nested bypass controls and reveals failure without navigating to success", async () => {
    window.location.hash = "#/start";
    const complete = vi.fn();
    render(<SensitiveSurface
      label="Delete local authority"
      operation="destructive-key-deletion"
      actionLabel="Delete permanently"
      execute={async () => { throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CANCELLED"); }}
      onComplete={complete}
      cancelHref="#/settings"
    >
      <h1>Permanent deletion</h1>
      <a href="#/success">Unsafe nested success link</a>
    </SensitiveSurface>);
    fireEvent.click(screen.getByRole("link", { name: "Unsafe nested success link" }));
    expect(window.location.hash).toBe("#/start");
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cancelled.*did not run/iu);
    expect(complete).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/start");
  });
});
