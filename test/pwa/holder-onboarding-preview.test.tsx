import { IDBFactory } from "fake-indexeddb";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocalAuthenticationError,
  type LocalAuthentication
} from "../../app/src/adapters/local-auth";
import type { CryptoCapabilities } from "../../app/src/adapters/crypto-capabilities";
import { RealAuthoritySetupRoute } from "../../app/src/routes/onboarding/authority-setup";
import { RealHolderOnboardingFlow } from "../../app/src/routes/onboarding/holder-onboarding";
import { RealHolderWelcomeRoute } from "../../app/src/routes/onboarding/welcome";
import { UnsupportedBrowserRoute } from "../../app/src/routes/unsupported-browser";
import {
  ONBOARDING_ACKNOWLEDGEMENT_NAMES,
  ONBOARDING_COMPLETION_ID,
  ONBOARDING_COMPLETION_SCHEMA,
  ONBOARDING_POLICY,
  OnboardingServiceError,
  createOnboardingService,
  type OnboardingAcknowledgements,
  type OnboardingReadiness,
  type OnboardingService
} from "../../app/src/services/onboarding-service";
import {
  createKeyService,
  type KeyService
} from "../../app/src/services/key-service";
import { createPassportDatabase } from "../../app/src/storage/database";
import { createRepository } from "../../app/src/storage/repositories";
import { createStorageCoordinator } from "../../app/src/storage/storage-coordinator";
import {
  APP_VIEW_STATE_ID,
  createIndexedDbAppStateService
} from "../../app/src/state/state-hydration";

const NOW = "2026-07-21T12:00:00Z";
const STATE_HASH = `sha256:${"4".repeat(64)}`;
const EVIDENCE_HASH = `sha256:${"13579bdf02468ace".repeat(4)}`;
const RESOURCE_HASH = `sha256:${"eca86420fdb97531".repeat(4)}`;

afterEach(cleanup);

const CAPABILITIES: CryptoCapabilities = Object.freeze({
  secureContext: true,
  random: true,
  sha256: true,
  aesGcm: true,
  hkdf: true,
  ed25519: true,
  x25519: true,
  indexedDb: true,
  serviceWorker: true,
  storagePersistence: true,
  webAuthnUserVerification: true,
  protocolReady: true,
  holderOnboardingReady: true
});

const ACKNOWLEDGEMENTS: OnboardingAcknowledgements = Object.freeze({
  stableAuthorityCorrelation: true,
  singleDeviceScope: true,
  irreversibleTotalLoss: true,
  noPrivateKeyBackup: true,
  noSameAuthorityRestore: true,
  noDeviceAddition: true,
  noBrowserSyncRecovery: true,
  noAccountRecovery: true
});

function originPolicyInput() {
  return {
    runtimeConfig: {
      schema: "hiri:real-holder-preview-runtime-config:v1",
      releaseId: "real-holder-preview",
      canonicalOrigin: "https://hiri-protocol.org",
      artifactResolverOrigins: [],
      issuerAuthoritativeCurrentHeadOrigins: [],
      remoteResourceOrigins: [],
      presentationDeliveryOrigins: [],
      resourceManifestSha256: RESOURCE_HASH,
      identityAnchorSetVersion: "rhp-d2-a-empty-v1",
      policyVersion: "rhp-d2-a-empty-v1",
      supportedCapabilities: ["disposable-holder-authority"],
      capabilityEvidence: { sha256: EVIDENCE_HASH, notAfter: "2026-10-20T00:00:00Z" }
    },
    now: NOW,
    context: {
      url: "https://hiri-protocol.org/#/onboarding",
      basePath: "/",
      isTopLevel: true,
      redirectCount: 0
    },
    profile: "production" as const
  };
}

async function fixture(options: Readonly<{
  capabilities?: CryptoCapabilities;
  persistent?: boolean;
  authState?: "ready" | "not-enrolled" | "unsupported";
  cancelAuthorization?: boolean;
  platformApproved?: boolean;
  wrapKeyService?(service: KeyService): KeyService;
}> = {}) {
  const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
  const coordinator = createStorageCoordinator({ database, ownerId: "holder-onboarding-test" });
  await coordinator.start();
  let persisted = options.persistent ?? false;
  let id = 0;
  const authorization = vi.fn(async () => {
    if (options.cancelAuthorization) throw new LocalAuthenticationError("RHP_LOCAL_AUTH_CANCELLED");
  });
  const authentication = Object.freeze({
    inspect: vi.fn(async () => options.authState === "not-enrolled"
      ? Object.freeze({ state: "not-enrolled" as const })
      : options.authState === "unsupported"
        ? Object.freeze({ state: "unsupported" as const })
        : Object.freeze({ state: "ready" as const, createdAt: NOW })),
    enroll: vi.fn(async () => Object.freeze({ state: "ready" as const, createdAt: NOW })),
    authorize: authorization,
    invalidate: vi.fn(),
    dispose: vi.fn()
  }) satisfies LocalAuthentication;
  const baseKeyService = createKeyService({
    database,
    coordinator,
    authorization: authentication,
    capabilityEvidence: { sha256: EVIDENCE_HASH, notAfter: "2026-10-20T00:00:00Z" },
    clock: Object.freeze({ now: () => NOW }),
    randomId: () => `onboarding-${++id}`
  });
  const keyService = options.wrapKeyService?.(baseKeyService) ?? baseKeyService;
  const artifactChecks: Array<{ operation: string; stateHash: string }> = [];
  const service = createOnboardingService({
    database,
    keyService,
    authentication,
    currentArtifact: Object.freeze({
      async assertCurrent(input) { artifactChecks.push({ ...input }); }
    }),
    platformEvidence: Object.freeze({
      assess: async ({ capabilityEvidenceSha256 }: Readonly<{ capabilityEvidenceSha256: string }>) =>
        options.platformApproved === false
          ? Object.freeze({
              disposition: "inspect-only" as const,
              code: "RHP_ONBOARDING_PLATFORM_NOT_APPROVED" as const
            })
          : Object.freeze({
              disposition: "approved" as const,
              capabilityEvidenceSha256,
              evidenceRecordId: "physical-evidence-windows-chromium-1"
            })
    }),
    originPolicyInput,
    capabilityProbe: async () => options.capabilities ?? CAPABILITIES,
    storagePersistence: Object.freeze({
      persisted: async () => persisted,
      persist: async () => {
        persisted = options.persistent !== false;
        return persisted;
      }
    })
  });
  return {
    database,
    coordinator,
    service,
    keyService,
    authentication,
    authorization,
    artifactChecks,
    setPersisted(value: boolean) { persisted = value; },
    cleanup() { coordinator.close(); }
  };
}

async function storedRecords(value: Awaited<ReturnType<typeof fixture>>) {
  return {
    keys: await createRepository<{ id: string }>(value.database, "keys").all(),
    settings: await createRepository<Record<string, unknown> & { id: string }>(value.database, "settings").all()
  };
}

describe("Real Holder Preview onboarding service", () => {
  it("rejects composition that could bypass the key service's local-authentication boundary", async () => {
    const value = await fixture();
    const differentAuthentication = Object.freeze({ ...value.authentication });
    expect(() => createOnboardingService({
      database: value.database,
      keyService: value.keyService,
      authentication: differentAuthentication,
      currentArtifact: { assertCurrent: async () => undefined },
      platformEvidence: {
        assess: async ({ capabilityEvidenceSha256 }) => ({
          disposition: "approved",
          capabilityEvidenceSha256,
          evidenceRecordId: "must-not-be-used"
        })
      },
      originPolicyInput
    })).toThrow(/same mandatory local-authentication boundary/iu);
    value.cleanup();
  });

  it("keeps a missing executable capability inspect-only before holder-state access", async () => {
    const capabilities = Object.freeze({ ...CAPABILITIES, x25519: false, holderOnboardingReady: false });
    const value = await fixture({ capabilities });
    const transaction = vi.spyOn(value.database, "runTransaction");

    await expect(value.service.inspect({ stateHash: STATE_HASH })).resolves.toMatchObject({
      disposition: "inspect-only",
      code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE",
      missing: ["x25519"]
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(value.artifactChecks).toEqual([{ operation: "authority-creation", stateHash: STATE_HASH }]);
    value.cleanup();
  });

  it("requires a persistent-storage grant without representing it as guaranteed durability", async () => {
    const value = await fixture({ persistent: false });
    await expect(value.service.prepareStorage({ stateHash: STATE_HASH })).resolves.toMatchObject({
      disposition: "inspect-only",
      code: "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED",
      persistent: false,
      durabilityGuaranteed: false
    });
    expect((await storedRecords(value)).keys).toEqual([]);
    value.cleanup();
  });

  it("does not infer physical-device approval from a fully capable browser", async () => {
    const value = await fixture({ platformApproved: false });
    await expect(value.service.inspect({ stateHash: STATE_HASH })).resolves.toMatchObject({
      disposition: "inspect-only",
      code: "RHP_ONBOARDING_PLATFORM_NOT_APPROVED",
      missing: []
    });
    expect((await storedRecords(value)).keys).toEqual([]);
    value.cleanup();
  });

  it("rejects missing or non-exact acknowledgements before authentication or key creation", async () => {
    const value = await fixture({ persistent: true });
    const missing = { ...ACKNOWLEDGEMENTS, noAccountRecovery: false } as unknown as OnboardingAcknowledgements;
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: missing }))
      .rejects.toMatchObject({ code: "RHP_ONBOARDING_INPUT_INVALID" });
    expect(value.authentication.inspect).not.toHaveBeenCalled();
    expect((await storedRecords(value)).keys).toEqual([]);
    value.cleanup();
  });

  it("requires prior WebAuthn enrollment and leaves no partial authority", async () => {
    const value = await fixture({ persistent: true, authState: "not-enrolled" });
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS }))
      .rejects.toMatchObject({ code: "RHP_ONBOARDING_LOCAL_AUTH_REQUIRED" });
    const records = await storedRecords(value);
    expect(records.keys).toEqual([]);
    expect(records.settings.some(record => [APP_VIEW_STATE_ID, ONBOARDING_COMPLETION_ID].includes(record.id))).toBe(false);
    value.cleanup();
  });

  it("leaves no protected key, metadata, holder view, or completion marker when fresh authentication is cancelled", async () => {
    const value = await fixture({ persistent: true, cancelAuthorization: true });
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS }))
      .rejects.toMatchObject({ code: "RHP_LOCAL_AUTH_CANCELLED" });
    const records = await storedRecords(value);
    expect(records.keys).toEqual([]);
    expect(records.settings.filter(record => record.id.startsWith("rhp:key:") ||
      record.id === APP_VIEW_STATE_ID || record.id === ONBOARDING_COMPLETION_ID)).toEqual([]);
    value.cleanup();
  });

  it("aborts protected keys and both public records when the final atomic commit fails", async () => {
    const value = await fixture({
      persistent: true,
      wrapKeyService: service => Object.freeze({
        ...service,
        createHolderKeySet: input => service.createHolderKeySet({
          ...input,
          commitPublicState: async context => {
            await input.commitPublicState?.(context);
            throw new Error("simulated final commit failure");
          }
        })
      })
    });
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS }))
      .rejects.toMatchObject({ code: "RHP_STORAGE_TRANSACTION_ABORTED" });
    const records = await storedRecords(value);
    expect(records.keys).toEqual([]);
    expect(records.settings.filter(record => record.id.startsWith("rhp:key:") ||
      record.id === APP_VIEW_STATE_ID || record.id === ONBOARDING_COMPLETION_ID)).toEqual([]);
    value.cleanup();
  });

  it("atomically creates the holder key set, genesis authority view, acknowledgement evidence, and reload state", async () => {
    const value = await fixture({ persistent: true });
    const result = await value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS });
    expect(result.holder.authority).toMatch(/^key:ed25519:z/u);
    expect(result.authority).toEqual({
      authority: result.holder.authority,
      activeMethodId: result.holder.signing.methodId,
      createdAt: NOW,
      lifecycle: "active"
    });
    expect(result.policy).toBe(ONBOARDING_POLICY);
    expect(value.authorization).toHaveBeenCalledWith({ operation: "authority-creation", stateHash: STATE_HASH });

    const records = await storedRecords(value);
    expect(records.keys).toHaveLength(2);
    expect(records.settings.filter(record => record.id.startsWith("rhp:key:metadata:"))).toHaveLength(2);
    expect(records.settings.find(record => record.id === ONBOARDING_COMPLETION_ID)).toEqual({
      id: ONBOARDING_COMPLETION_ID,
      schema: ONBOARDING_COMPLETION_SCHEMA,
      policy: ONBOARDING_POLICY,
      authority: result.holder.authority,
      activeMethodId: result.holder.signing.methodId,
      acknowledgedAt: NOW,
      acknowledgements: ACKNOWLEDGEMENTS
    });
    expect(JSON.stringify(records.settings)).not.toMatch(/"(?:privateKey|privateBytes|secretKey)":/iu);

    const reloaded = createIndexedDbAppStateService({
      database: value.database,
      coordinator: value.coordinator,
      access: Object.freeze({ inspect: async () => "unlocked" as const })
    });
    const signal = new AbortController().signal;
    await expect(reloaded.prepare(signal)).resolves.toEqual({ state: "ready" });
    await expect(reloaded.load(signal)).resolves.toMatchObject({
      authority: result.authority,
      authorityReady: true,
      backupVerified: false
    });
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS }))
      .rejects.toBeInstanceOf(OnboardingServiceError);
    value.cleanup();
  });

  it("blocks corrupt or orphaned completion state instead of overwriting it", async () => {
    const value = await fixture({ persistent: true });
    await createRepository<{ id: string }>(value.database, "settings").put({ id: ONBOARDING_COMPLETION_ID });
    await expect(value.service.complete({ stateHash: STATE_HASH, acknowledgements: ACKNOWLEDGEMENTS }))
      .rejects.toMatchObject({ code: "RHP_ONBOARDING_PARTIAL_STATE" });
    expect((await storedRecords(value)).keys).toEqual([]);
    value.cleanup();
  });
});

describe("Real Holder Preview onboarding UI", () => {
  it("states single-device loss and prohibited recovery paths before setup", () => {
    render(<RealHolderWelcomeRoute onContinue={() => {}} />);
    expect(screen.getByText(/disposable authority/iu)).toBeInTheDocument();
    expect(screen.getByText(/No private-key backup, restore, device addition, or account recovery/iu)).toBeInTheDocument();
    expect(screen.getByText(/permanently ends access/iu)).toBeInTheDocument();
  });

  it("requires all eight explicit acknowledgements before calling the service", async () => {
    const complete = vi.fn(async () => { throw new Error("stop after boundary inspection"); });
    const service = Object.freeze({
      inspect: vi.fn(),
      prepareStorage: vi.fn(),
      complete
    }) as unknown as OnboardingService;
    render(<RealAuthoritySetupRoute service={service} stateHash={STATE_HASH} onComplete={() => {}} onCancel={() => {}} />);
    const create = screen.getByRole("button", { name: "Create disposable authority" });
    expect(create).toBeDisabled();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(ONBOARDING_ACKNOWLEDGEMENT_NAMES.length);
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(complete).toHaveBeenCalledWith({
      stateHash: STATE_HASH,
      acknowledgements: ACKNOWLEDGEMENTS
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No partial authority/iu);
  });

  it("routes unsupported capability results to inspect-only without reaching WebAuthn or authority setup", async () => {
    const unsupportedCapabilities = Object.freeze({ ...CAPABILITIES, webAuthnUserVerification: false, holderOnboardingReady: false });
    const readiness: OnboardingReadiness = Object.freeze({
      disposition: "inspect-only",
      code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE",
      capabilities: unsupportedCapabilities,
      missing: Object.freeze(["webAuthnUserVerification"] as const),
      approvalBasis: "packaged-hash-bound-capability-evidence",
      durabilityGuaranteed: false
    });
    const service = Object.freeze({
      inspect: vi.fn(async () => readiness),
      prepareStorage: vi.fn(async () => Object.freeze({
        disposition: "inspect-only" as const,
        code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE" as const,
        persistent: false as const,
        durabilityGuaranteed: false as const,
        readiness
      })),
      complete: vi.fn()
    }) as unknown as OnboardingService;
    const authentication = Object.freeze({
      inspect: vi.fn(), enroll: vi.fn(), authorize: vi.fn(), invalidate: vi.fn(), dispose: vi.fn()
    }) as unknown as LocalAuthentication;
    render(<RealHolderOnboardingFlow service={service} authentication={authentication} stateHash={STATE_HASH} onComplete={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Review the consequences" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to device checks" }));
    fireEvent.click(screen.getByRole("button", { name: "Check this device" }));
    expect(await screen.findByRole("heading", { name: /cannot create a real preview authority/iu })).toBeInTheDocument();
    expect(screen.getByText(/user-verifying platform WebAuthn/iu)).toBeInTheDocument();
    expect(authentication.inspect).not.toHaveBeenCalled();
    expect(service.complete).not.toHaveBeenCalled();
  });

  it("does not suggest fallback recovery or weaker algorithms on the unsupported screen", () => {
    render(<UnsupportedBrowserRoute capabilities={{ ...CAPABILITIES, ed25519: false, holderOnboardingReady: false }} />);
    expect(screen.getByText(/does not silently substitute a weaker algorithm/iu)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/continue anyway|password fallback|restore account/iu);
  });
});
