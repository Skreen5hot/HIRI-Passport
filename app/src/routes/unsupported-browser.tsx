import {
  missingHolderOnboardingCapabilities,
  type CryptoCapabilities,
  type HolderOnboardingCapability
} from "../adapters/crypto-capabilities";
import type { OnboardingReadiness } from "../services/onboarding-service";

const LABELS: Readonly<Record<HolderOnboardingCapability, string>> = Object.freeze({
  secureContext: "secure browsing context",
  random: "cryptographic randomness",
  sha256: "SHA-256",
  aesGcm: "AES-256-GCM",
  hkdf: "HKDF-SHA256",
  ed25519: "non-extractable Ed25519 operations",
  x25519: "non-extractable X25519 operations",
  indexedDb: "IndexedDB",
  serviceWorker: "service-worker support",
  storagePersistence: "persistent-storage API",
  webAuthnUserVerification: "user-verifying platform WebAuthn"
});

export function UnsupportedBrowserRoute({ capabilities, readiness }: Readonly<{
  capabilities?: CryptoCapabilities;
  readiness?: OnboardingReadiness;
}>) {
  const value = readiness?.capabilities ?? capabilities;
  const missing = readiness?.missing ?? (value ? missingHolderOnboardingCapabilities(value) : []);
  return <section className="panel stack" role="alert" aria-labelledby="unsupported-title">
    <p className="eyebrow">Inspect-only capability result</p>
    <h1 id="unsupported-title">This browser and device cannot create a real preview authority.</h1>
    <p className="lede">One or more required operations are unavailable, or this exact platform has not passed the packaged evidence policy. HIRI does not silently substitute a weaker algorithm or authentication method.</p>
    {missing.length > 0 ? <div><p><strong>Unavailable:</strong></p><ul className="check-list">{missing.map(name => <li key={name}>{LABELS[name]}</li>)}</ul></div> : null}
    <p>Mobile-first layout and public site availability do not mean universal platform approval. Only exact tested and owner-approved browser, operating-system, and device ranges may create a real authority.</p>
    <p className="muted">Public information remains available. Any Synthetic Demo is separately labeled and creates no real authority.</p>
    <a className="button secondary" href="/preview/">Read preview limitations</a>
  </section>;
}
