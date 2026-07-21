import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  missingHolderOnboardingCapabilities,
  probeCryptoCapabilities
} from "../../app/src/adapters/crypto-capabilities";

describe("capability probe", () => {
  it("executes required algorithms instead of sniffing the user agent", async () => {
    const value = await probeCryptoCapabilities();
    expect(value.random).toBe(true);
    expect(value.sha256).toBe(true);
    expect(value.ed25519).toBe(true);
    expect(value.x25519).toBe(true);
    expect(typeof value.protocolReady).toBe("boolean");
  });

  it("requires service workers, storage persistence, and user-verifying WebAuthn for holder onboarding", async () => {
    const persisted = vi.fn(async () => false);
    const persist = vi.fn(async () => true);
    const capabilities = await probeCryptoCapabilities({
      crypto,
      indexedDb: new IDBFactory(),
      secureContext: true,
      hostname: "hiri-protocol.org",
      navigator: {
        serviceWorker: Object.freeze({}),
        storage: { persisted, persist }
      } as unknown as Navigator,
      publicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: async () => true
      }
    });
    expect(capabilities).toMatchObject({
      protocolReady: true,
      serviceWorker: true,
      storagePersistence: true,
      webAuthnUserVerification: true,
      holderOnboardingReady: true
    });
    expect(missingHolderOnboardingCapabilities(capabilities)).toEqual([]);
    expect(persisted).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports missing user verification without falling back", async () => {
    const capabilities = await probeCryptoCapabilities({
      crypto,
      indexedDb: new IDBFactory(),
      secureContext: true,
      navigator: {
        serviceWorker: Object.freeze({}),
        storage: { persisted: async () => true, persist: async () => true }
      } as unknown as Navigator,
      publicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: async () => false
      }
    });
    expect(capabilities.webAuthnUserVerification).toBe(false);
    expect(capabilities.holderOnboardingReady).toBe(false);
    expect(missingHolderOnboardingCapabilities(capabilities)).toContain("webAuthnUserVerification");
  });
});
