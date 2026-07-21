import { useState } from "react";
import { LocalAuthenticationError } from "../../adapters/local-auth";
import {
  ONBOARDING_ACKNOWLEDGEMENT_NAMES,
  OnboardingServiceError,
  type HolderOnboardingCompletion,
  type OnboardingAcknowledgementName,
  type OnboardingAcknowledgements,
  type OnboardingService
} from "../../services/onboarding-service";
import { useAppState } from "../../state/app-state";

const INITIAL_ACKNOWLEDGEMENTS: Readonly<Record<OnboardingAcknowledgementName, boolean>> = Object.freeze({
  stableAuthorityCorrelation: false,
  singleDeviceScope: false,
  irreversibleTotalLoss: false,
  noPrivateKeyBackup: false,
  noSameAuthorityRestore: false,
  noDeviceAddition: false,
  noBrowserSyncRecovery: false,
  noAccountRecovery: false
});

const ACKNOWLEDGEMENT_LABELS: Readonly<Record<OnboardingAcknowledgementName, string>> = Object.freeze({
  stableAuthorityCorrelation: "I understand that this stable public authority can correlate credentials and presentations.",
  singleDeviceScope: "I understand that this preview authority exists in this browser profile on this device only.",
  irreversibleTotalLoss: "I understand that clearing site data, losing this device, or losing every key permanently ends access.",
  noPrivateKeyBackup: "I understand that there is no private-key backup or export.",
  noSameAuthorityRestore: "I understand that the same authority cannot be restored after total key loss.",
  noDeviceAddition: "I understand that another device cannot be added to this preview authority.",
  noBrowserSyncRecovery: "I understand that browser sync or operating-system backup does not recover this authority.",
  noAccountRecovery: "I understand that no vendor, email, biometric, or Passport account can recover this authority."
});

function safeFailure(error: unknown): string {
  if (error instanceof LocalAuthenticationError && error.code === "RHP_LOCAL_AUTH_CANCELLED") {
    return "Device verification was cancelled. No holder authority or protected key was committed.";
  }
  if (error instanceof OnboardingServiceError) {
    if (error.code === "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED") return "Persistent storage is no longer ready. Run the device checks again.";
    if (error.code === "RHP_ONBOARDING_LOCAL_AUTH_REQUIRED") return "Device verification has not been set up. Return to the verification step.";
    if (error.code === "RHP_ONBOARDING_AUTHORITY_EXISTS") return "A holder authority already exists in this browser profile.";
    if (error.code === "RHP_ONBOARDING_CAPABILITY_UNAVAILABLE") return "A required capability is no longer available. Nothing was created.";
    if (error.code === "RHP_ONBOARDING_PLATFORM_NOT_APPROVED") return "This exact browser and device range is not approved. Nothing was created.";
  }
  return "Authority creation did not complete. No partial authority is exposed as ready.";
}

export function AuthoritySetupRoute() {
  const { setAuthorityReady } = useAppState();
  const [created, setCreated] = useState(false);
  const create = () => { setAuthorityReady(true); setCreated(true); };
  return <section className="panel stack">
    <p className="eyebrow">Synthetic Demo · authority setup</p>
    <h1>{created ? "Synthetic authority ready." : "Create synthetic local state."}</h1>
    <p className="lede">This project-origin flow creates synthetic demo state only. It does not generate, persist, authenticate, or authorize a real holder key.</p>
    {created
      ? <a className="button" href="#/home">Open synthetic passport</a>
      : <button className="button" type="button" onClick={create}>Create synthetic authority</button>}
  </section>;
}

export function RealAuthoritySetupRoute({ service, stateHash, onComplete, onCancel }: Readonly<{
  service: OnboardingService;
  stateHash: string;
  onComplete(result: HolderOnboardingCompletion): void;
  onCancel(): void;
}>) {
  const [acknowledgements, setAcknowledgements] = useState(INITIAL_ACKNOWLEDGEMENTS);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HolderOnboardingCompletion | null>(null);
  const [message, setMessage] = useState("");
  const accepted = ONBOARDING_ACKNOWLEDGEMENT_NAMES.every(name => acknowledgements[name]);

  const create = async () => {
    if (!accepted || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const completion = await service.complete({
        stateHash,
        acknowledgements: Object.freeze({ ...acknowledgements }) as OnboardingAcknowledgements
      });
      setResult(completion);
      onComplete(completion);
    } catch (error) {
      setMessage(safeFailure(error));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <section className="panel stack" aria-labelledby="authority-created-title">
    <p className="eyebrow">Real Holder Preview</p>
    <h1 id="authority-created-title">Your disposable authority is ready.</h1>
    <p className="lede">The protected keys and holder view committed together on this device.</p>
    <p className="technical">Authority: {result.authority.authority}</p>
    <p role="alert">There is still no backup, restore, device-add, browser-sync, or account-recovery path.</p>
  </section>;

  return <section className="panel stack" aria-labelledby="authority-setup-title">
    <p className="eyebrow">Final authority setup</p>
    <h1 id="authority-setup-title">Accept the permanent loss boundary.</h1>
    <p className="lede">Creating this authority triggers a fresh WebAuthn user-verification prompt, then atomically commits non-extractable Ed25519 and X25519 key handles with the public holder view.</p>
    <fieldset disabled={busy}>
      <legend>Every statement is required</legend>
      {ONBOARDING_ACKNOWLEDGEMENT_NAMES.map(name => <label className="choice" key={name}>
        <input type="checkbox" checked={acknowledgements[name]} onChange={event => setAcknowledgements(current => ({
          ...current,
          [name]: event.target.checked
        }))} />
        <span>{ACKNOWLEDGEMENT_LABELS[name]}</span>
      </label>)}
    </fieldset>
    {message ? <p role="alert" className="error-text" aria-live="assertive">{message}</p> : null}
    <div className="actions">
      <button className="button" type="button" disabled={!accepted || busy} onClick={() => void create()}>
        {busy ? "Waiting for protected setup…" : "Create disposable authority"}
      </button>
      <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>Not now</button>
    </div>
  </section>;
}
