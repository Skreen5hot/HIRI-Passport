import { useState } from "react";
import type {
  OnboardingReadiness,
  OnboardingService
} from "../../services/onboarding-service";

export function StorageReadinessRoute() {
  return <section className="panel stack">
    <p className="eyebrow">Synthetic Demo · device readiness</p>
    <h1>Preview local storage concepts.</h1>
    <p className="lede">This project-origin flow creates synthetic state only. It does not prove protected-key durability, storage persistence, or recovery.</p>
    <ul className="check-list"><li>Secure-context check preview</li><li>Local-storage concept preview</li><li>No real key or authority creation</li></ul>
    <a className="button" href="#/onboarding/authority">Continue synthetic demo</a>
  </section>;
}

export function RealStorageReadinessRoute({ service, stateHash, onReady, onUnsupported, onCancel }: Readonly<{
  service: OnboardingService;
  stateHash: string;
  onReady(): void;
  onUnsupported(readiness: OnboardingReadiness): void;
  onCancel(): void;
}>) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  const check = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await service.prepareStorage({ stateHash });
      if (result.disposition === "ready") {
        setReady(true);
        setMessage("Persistent browser storage was granted for this origin. The browser and operating system still do not guarantee against clearing, eviction, profile loss, or device loss.");
      } else {
        setReady(false);
        if (result.code !== "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED") onUnsupported(result.readiness);
        setMessage(result.code === "RHP_ONBOARDING_STORAGE_PERSISTENCE_DENIED"
          ? "Persistent storage was not granted. Real authority setup remains inspect-only."
          : "A required capability or exact platform approval is unavailable. Real authority setup remains inspect-only.");
      }
    } catch {
      setReady(false);
      setMessage("The approved origin, artifact, or storage checks did not complete. Nothing was created.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="panel stack" aria-labelledby="storage-readiness-title">
    <p className="eyebrow">Device and storage readiness</p>
    <h1 id="storage-readiness-title">Check every required browser capability.</h1>
    <p className="lede">The preview will execute its cryptographic capability probes and ask this browser to reduce automatic storage eviction risk.</p>
    <ul className="check-list">
      <li>Secure origin, Ed25519, X25519, AES-GCM, HKDF, IndexedDB, and service-worker support.</li>
      <li>A user-verifying platform authenticator and mandatory WebAuthn verification.</li>
      <li>Persistent-storage permission. A grant is not a backup or a durability guarantee.</li>
    </ul>
    {message ? <p role={ready ? "status" : "alert"} aria-live="polite">{message}</p> : null}
    <div className="actions">
      {ready
        ? <button className="button" type="button" onClick={onReady}>Continue to device verification</button>
        : <button className="button" type="button" disabled={busy} onClick={() => void check()}>{busy ? "Checking this device…" : "Check this device"}</button>}
      <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>Not now</button>
    </div>
  </section>;
}
