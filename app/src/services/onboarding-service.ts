import type { LocalAuthentication } from "../adapters/local-auth";
import {
  missingHolderOnboardingCapabilities,
  probeCryptoCapabilities,
  type CryptoCapabilities
} from "../adapters/crypto-capabilities";
import type { CurrentArtifactGate } from "../adapters/local-auth";
import {
  requireOriginEligibility,
  type OriginPolicyInput
} from "../security/origin-policy";
import type { PassportDatabase } from "../storage/database";
import {
  APP_VIEW_STATE_ID,
  createAppViewStateRecord,
  validateAppViewState
} from "../state/state-hydration";
import type { HolderAuthorityView } from "../types";
import type { HolderKeySet, KeyService } from "./key-service";

export const ONBOARDING_COMPLETION_ID = "app:holder-onboarding-completion" as const;
export const ONBOARDING_COMPLETION_SCHEMA = "hiri-passport/holder-onboarding-completion/1" as const;
export const ONBOARDING_POLICY = "RHP-DR-002-D3-A-D4-A-D5-A" as const;

export const ONBOARDING_ACKNOWLEDGEMENT_NAMES = [
  "stableAuthorityCorrelation",
  "singleDeviceScope",
  "irreversibleTotalLoss",
  "noPrivateKeyBackup",
  "noSameAuthorityRestore",
  "noDeviceAddition",
  "noBrowserSyncRecovery",
  "noAccountRecovery"
] as const;

export type OnboardingAcknowledgementName = (typeof ONBOARDING_ACKNOWLEDGEMENT_NAMES)[number];
export type OnboardingAcknowledgements = Readonly<Record<OnboardingAcknowledgementName, true>>;

export type OnboardingReadiness =
  | Readonly<{
      disposition: "eligible";
      code: "RHP_ONBOARDING_CAPABILITIES_READY";
      capabilities: CryptoCapabilities;
      missing: readonly [];
      approvalBasis: "packaged-hash-bound-capability-evidence";
      platformEvidenceRecordId: string;
      durabilityGuaranteed: false;
    }>
  | Readonly<{
      disposition: "inspect-only";
      code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE" | "RHP_ONBOARDING_PLATFORM_NOT_APPROVED";
      capabilities: CryptoCapabilities;
      missing: ReturnType<typeof missingHolderOnboardingCapabilities>;
      approvalBasis: "packaged-hash-bound-capability-evidence";
      durabilityGuaranteed: false;
    }>;

export type OnboardingStorageReadiness =
  | Readonly<{
      disposition: "ready";
      code: "RHP_ONBOARDING_STORAGE_PERSISTENT";
      persistent: true;
      durabilityGuaranteed: false;
    }>
  | Readonly<{
      disposition: "inspect-only";
      code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE" | "RHP_ONBOARDING_PLATFORM_NOT_APPROVED" | "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED";
      persistent: false;
      durabilityGuaranteed: false;
      readiness: OnboardingReadiness;
    }>;

export type HolderOnboardingCompletion = Readonly<{
  holder: HolderKeySet;
  authority: HolderAuthorityView;
  policy: typeof ONBOARDING_POLICY;
  acknowledgedAt: string;
}>;

export type OnboardingService = Readonly<{
  inspect(input: Readonly<{ stateHash: string }>): Promise<OnboardingReadiness>;
  prepareStorage(input: Readonly<{ stateHash: string }>): Promise<OnboardingStorageReadiness>;
  complete(input: Readonly<{
    stateHash: string;
    acknowledgements: OnboardingAcknowledgements;
  }>): Promise<HolderOnboardingCompletion>;
}>;

export type StoragePersistencePort = Readonly<{
  persisted(): Promise<boolean>;
  persist(): Promise<boolean>;
}>;

export type PlatformEvidencePort = Readonly<{
  assess(input: Readonly<{ capabilityEvidenceSha256: string }>): Promise<
    | Readonly<{
        disposition: "approved";
        capabilityEvidenceSha256: string;
        evidenceRecordId: string;
      }>
    | Readonly<{
        disposition: "inspect-only";
        code: "RHP_ONBOARDING_PLATFORM_NOT_APPROVED";
      }>
  >;
}>;

export type OnboardingServiceErrorCode =
  | "RHP_ONBOARDING_INPUT_INVALID"
  | "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE"
  | "RHP_ONBOARDING_PLATFORM_NOT_APPROVED"
  | "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED"
  | "RHP_ONBOARDING_LOCAL_AUTH_REQUIRED"
  | "RHP_ONBOARDING_AUTHORITY_EXISTS"
  | "RHP_ONBOARDING_PARTIAL_STATE"
  | "RHP_ONBOARDING_BUSY";

const SAFE_MESSAGES = Object.freeze<Record<OnboardingServiceErrorCode, string>>({
  RHP_ONBOARDING_INPUT_INVALID: "Every holder onboarding acknowledgement is required.",
  RHP_ONBOARDING_CAPABILITY_UNAVAILABLE: "This browser cannot create a Real Holder Preview authority.",
  RHP_ONBOARDING_PLATFORM_NOT_APPROVED: "This exact browser and device range is not approved for authority creation.",
  RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED: "Persistent browser storage was not granted.",
  RHP_ONBOARDING_LOCAL_AUTH_REQUIRED: "Device user verification must be set up before authority creation.",
  RHP_ONBOARDING_AUTHORITY_EXISTS: "A local holder authority already exists.",
  RHP_ONBOARDING_PARTIAL_STATE: "Local onboarding state is incomplete or inconsistent.",
  RHP_ONBOARDING_BUSY: "Holder onboarding is already in progress."
});

export class OnboardingServiceError extends Error {
  readonly code: OnboardingServiceErrorCode;

  constructor(code: OnboardingServiceErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "OnboardingServiceError";
    this.code = code;
  }
}

type StoredOnboardingCompletion = Readonly<{
  id: typeof ONBOARDING_COMPLETION_ID;
  schema: typeof ONBOARDING_COMPLETION_SCHEMA;
  policy: typeof ONBOARDING_POLICY;
  authority: string;
  activeMethodId: string;
  acknowledgedAt: string;
  acknowledgements: OnboardingAcknowledgements;
}>;

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const PROTOCOL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function requireStateHash(value: string): void {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new OnboardingServiceError("RHP_ONBOARDING_INPUT_INVALID");
  }
}

function requireAcknowledgements(value: unknown): asserts value is OnboardingAcknowledgements {
  if (!record(value) || !exactKeys(value, ONBOARDING_ACKNOWLEDGEMENT_NAMES) ||
    ONBOARDING_ACKNOWLEDGEMENT_NAMES.some(name => value[name] !== true)) {
    throw new OnboardingServiceError("RHP_ONBOARDING_INPUT_INVALID");
  }
}

function validProtocolTime(value: unknown): value is string {
  return typeof value === "string" && PROTOCOL_TIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString().replace(".000Z", "Z") === value;
}

function validateStoredCompletion(value: unknown): StoredOnboardingCompletion | undefined {
  if (value === undefined) return undefined;
  if (!record(value) || !exactKeys(value, [
    "id", "schema", "policy", "authority", "activeMethodId", "acknowledgedAt", "acknowledgements"
  ]) || value.id !== ONBOARDING_COMPLETION_ID || value.schema !== ONBOARDING_COMPLETION_SCHEMA ||
    value.policy !== ONBOARDING_POLICY || typeof value.authority !== "string" || value.authority.length < 1 ||
    typeof value.activeMethodId !== "string" || value.activeMethodId.length < 1 ||
    !validProtocolTime(value.acknowledgedAt)) {
    throw new OnboardingServiceError("RHP_ONBOARDING_PARTIAL_STATE");
  }
  requireAcknowledgements(value.acknowledgements);
  return value as StoredOnboardingCompletion;
}

function browserStoragePersistence(): StoragePersistencePort {
  return Object.freeze({
    persisted: async () => {
      if (typeof navigator === "undefined" || typeof navigator.storage?.persisted !== "function") return false;
      return navigator.storage.persisted();
    },
    persist: async () => {
      if (typeof navigator === "undefined" || typeof navigator.storage?.persist !== "function") return false;
      return navigator.storage.persist();
    }
  });
}

function completionRecord(
  holder: HolderKeySet,
  acknowledgements: OnboardingAcknowledgements
): StoredOnboardingCompletion {
  return Object.freeze({
    id: ONBOARDING_COMPLETION_ID,
    schema: ONBOARDING_COMPLETION_SCHEMA,
    policy: ONBOARDING_POLICY,
    authority: holder.authority,
    activeMethodId: holder.signing.methodId,
    acknowledgedAt: holder.createdAt,
    acknowledgements: Object.freeze({ ...acknowledgements })
  });
}

function authorityView(holder: HolderKeySet): HolderAuthorityView {
  return Object.freeze({
    authority: holder.authority,
    activeMethodId: holder.signing.methodId,
    createdAt: holder.createdAt,
    lifecycle: "active"
  });
}

export function createOnboardingService(options: Readonly<{
  database: PassportDatabase;
  keyService: KeyService;
  authentication: LocalAuthentication;
  currentArtifact: CurrentArtifactGate;
  platformEvidence: PlatformEvidencePort;
  originPolicyInput(): OriginPolicyInput;
  capabilityProbe?: () => Promise<CryptoCapabilities>;
  storagePersistence?: StoragePersistencePort;
}>): OnboardingService {
  if (options.database.profile !== "real-holder-preview") {
    throw new TypeError("holder onboarding requires the real-holder-preview storage profile");
  }
  if (options.keyService.database !== options.database) {
    throw new TypeError("holder onboarding and protected keys must share one database boundary");
  }
  if (options.keyService.authorization !== options.authentication) {
    throw new TypeError("holder onboarding requires the same mandatory local-authentication boundary as protected keys");
  }
  const capabilityProbe = options.capabilityProbe ?? probeCryptoCapabilities;
  const persistence = options.storagePersistence ?? browserStoragePersistence();
  let busy = false;

  const assertPreconditions = async (stateHash: string) => {
    requireStateHash(stateHash);
    const policyInput = options.originPolicyInput();
    const runtimeConfig = requireOriginEligibility({
      ...policyInput,
      capability: "disposable-holder-authority"
    }, "key-creation");
    await options.currentArtifact.assertCurrent({ operation: "authority-creation", stateHash });
    return runtimeConfig;
  };

  const inspect = async (input: Readonly<{ stateHash: string }>): Promise<OnboardingReadiness> => {
    const runtimeConfig = await assertPreconditions(input.stateHash);
    const capabilities = await capabilityProbe();
    const missing = missingHolderOnboardingCapabilities(capabilities);
    const shared = {
      capabilities,
      approvalBasis: "packaged-hash-bound-capability-evidence" as const,
      durabilityGuaranteed: false as const
    };
    if (missing.length !== 0 || !capabilities.holderOnboardingReady) {
      return Object.freeze({
        disposition: "inspect-only" as const,
        code: "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE" as const,
        missing,
        ...shared
      });
    }
    const platform = await options.platformEvidence.assess({
      capabilityEvidenceSha256: runtimeConfig.capabilityEvidence.sha256
    });
    if (platform.disposition !== "approved" ||
      platform.capabilityEvidenceSha256 !== runtimeConfig.capabilityEvidence.sha256 ||
      typeof platform.evidenceRecordId !== "string" || platform.evidenceRecordId.length < 1 ||
      platform.evidenceRecordId.length > 256) {
      return Object.freeze({
        disposition: "inspect-only" as const,
        code: "RHP_ONBOARDING_PLATFORM_NOT_APPROVED" as const,
        missing: Object.freeze([]),
        ...shared
      });
    }
    return Object.freeze({
          disposition: "eligible" as const,
          code: "RHP_ONBOARDING_CAPABILITIES_READY" as const,
          missing: Object.freeze([]) as readonly [],
          platformEvidenceRecordId: platform.evidenceRecordId,
          ...shared
        });
  };

  const prepareStorage = async (input: Readonly<{ stateHash: string }>): Promise<OnboardingStorageReadiness> => {
    const readiness = await inspect(input);
    if (readiness.disposition !== "eligible") {
      return Object.freeze({
        disposition: "inspect-only",
        code: readiness.code,
        persistent: false,
        durabilityGuaranteed: false,
        readiness
      });
    }
    let persistent = false;
    try {
      persistent = await persistence.persisted() || await persistence.persist();
    } catch {
      persistent = false;
    }
    return persistent
      ? Object.freeze({
          disposition: "ready",
          code: "RHP_ONBOARDING_STORAGE_PERSISTENT",
          persistent: true,
          durabilityGuaranteed: false
        })
      : Object.freeze({
          disposition: "inspect-only",
          code: "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED",
          persistent: false,
          durabilityGuaranteed: false,
          readiness
        });
  };

  const readExistingState = async (): Promise<Readonly<{
    view: ReturnType<typeof validateAppViewState>;
    completion: StoredOnboardingCompletion | undefined;
  }>> => {
    const values = await options.database.runTransaction(["settings"], "readonly", async stores => ({
      view: await stores.request<unknown>(stores.store("settings").get(APP_VIEW_STATE_ID)),
      completion: await stores.request<unknown>(stores.store("settings").get(ONBOARDING_COMPLETION_ID))
    }));
    return Object.freeze({
      view: validateAppViewState(values.view),
      completion: validateStoredCompletion(values.completion)
    });
  };

  const complete = async (input: Readonly<{
    stateHash: string;
    acknowledgements: OnboardingAcknowledgements;
  }>): Promise<HolderOnboardingCompletion> => {
    if (busy) throw new OnboardingServiceError("RHP_ONBOARDING_BUSY");
    busy = true;
    try {
      requireAcknowledgements(input.acknowledgements);
      const readiness = await inspect({ stateHash: input.stateHash });
      if (readiness.disposition !== "eligible") {
        throw new OnboardingServiceError(readiness.code);
      }
      let persistent = false;
      try { persistent = await persistence.persisted(); } catch { persistent = false; }
      if (!persistent) throw new OnboardingServiceError("RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED");

      const authStatus = await options.authentication.inspect({ stateHash: input.stateHash });
      if (authStatus.state !== "ready") throw new OnboardingServiceError("RHP_ONBOARDING_LOCAL_AUTH_REQUIRED");

      const existing = await readExistingState();
      if (existing.view?.authority || existing.completion) {
        if (existing.view?.authority && existing.completion &&
          existing.view.authority.authority === existing.completion.authority &&
          existing.view.authority.activeMethodId === existing.completion.activeMethodId) {
          throw new OnboardingServiceError("RHP_ONBOARDING_AUTHORITY_EXISTS");
        }
        throw new OnboardingServiceError("RHP_ONBOARDING_PARTIAL_STATE");
      }

      const holder = await options.keyService.createHolderKeySet({
        stateHash: input.stateHash,
        commitPublicState: async ({ holder: pendingHolder, settings }) => {
          const rawView = await settings.get(APP_VIEW_STATE_ID);
          const rawCompletion = await settings.get(ONBOARDING_COMPLETION_ID);
          const view = validateAppViewState(rawView);
          const completion = validateStoredCompletion(rawCompletion);
          if (view?.authority || completion) throw new OnboardingServiceError("RHP_ONBOARDING_PARTIAL_STATE");
          const pendingAuthority = authorityView(pendingHolder);
          await settings.put(createAppViewStateRecord(pendingAuthority));
          await settings.put(completionRecord(pendingHolder, input.acknowledgements));
        }
      });
      const committed = await readExistingState();
      const authority = committed.view?.authority ?? null;
      if (!authority || !committed.completion || authority.authority !== holder.authority ||
        authority.activeMethodId !== holder.signing.methodId ||
        committed.completion.authority !== holder.authority ||
        committed.completion.activeMethodId !== holder.signing.methodId) {
        throw new OnboardingServiceError("RHP_ONBOARDING_PARTIAL_STATE");
      }
      return Object.freeze({
        holder,
        authority,
        policy: ONBOARDING_POLICY,
        acknowledgedAt: holder.createdAt
      });
    } finally {
      busy = false;
    }
  };

  return Object.freeze({ inspect, prepareStorage, complete });
}
