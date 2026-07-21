import { useEffect, useState } from "react";
import {
  LocalAuthenticationError,
  type LocalAuthentication,
  type LocalAuthenticationStatus
} from "../../adapters/local-auth";

export type LocalAuthRouteProps = Readonly<{
  authentication?: LocalAuthentication;
  stateHash?: string;
  onReady?(): void;
}>;

function safeError(error: unknown): string {
  if (error instanceof LocalAuthenticationError) {
    if (error.code === "RHP_LOCAL_AUTH_CANCELLED") return "Device verification was cancelled. Nothing was created.";
    if (error.code === "RHP_LOCAL_AUTH_UNSUPPORTED") return "This browser and device cannot provide the required verification. Real holder setup remains unavailable.";
    if (error.code === "RHP_LOCAL_AUTH_INVALIDATED" || error.code === "RHP_LOCAL_AUTH_STATE_CHANGED") {
      return "Setup changed or navigated before verification completed. Start again from the current screen.";
    }
  }
  return "Device verification did not complete. Nothing was created.";
}

export function LocalAuthRoute({ authentication, stateHash, onReady }: LocalAuthRouteProps) {
  const [status, setStatus] = useState<LocalAuthenticationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authentication || !stateHash) {
      setStatus(Object.freeze({ state: "unsupported" }));
      return;
    }
    let active = true;
    void authentication.inspect({ stateHash }).then(result => {
      if (active) setStatus(result);
    }, error => {
      if (active) {
        setStatus(Object.freeze({ state: "unsupported" }));
        setMessage(safeError(error));
      }
    });
    return () => { active = false; };
  }, [authentication, stateHash]);

  const enroll = async () => {
    if (!authentication || !stateHash || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await authentication.enroll({ stateHash });
      setStatus(result);
      setMessage("Device verification is ready. A fresh prompt is still required before creating the holder authority.");
    } catch (error) {
      setMessage(safeError(error));
    } finally {
      setBusy(false);
    }
  };

  const ready = status?.state === "ready";
  const unsupported = status?.state === "unsupported";
  return <section className="panel stack" aria-labelledby="local-auth-title">
    <p className="eyebrow">Local authentication</p>
    <h1 id="local-auth-title">Confirm sensitive actions on this device.</h1>
    <p className="lede">The Real Holder Preview requires a fresh browser-controlled WebAuthn user-verification prompt before key creation, signing, rotation, compromise action, authority abandonment, or destructive deletion.</p>
    <ul className="check-list">
      <li>The application does not accept a password, recovery phrase, or in-app PIN as a fallback.</li>
      <li>Device verification gates local key use only. It is not issuer identity, holder authority, credential status, or Passport evidence.</li>
      <li>Each prompt is bound to one exact action and current state, expires within five minutes, and cannot be reused.</li>
    </ul>
    {unsupported ? <p role="alert">Required device verification is unavailable in this build or browser. Holder setup cannot continue.</p> : null}
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
    <div className="actions">
      {ready
        ? <button className="button" type="button" onClick={onReady}>Continue to authority setup</button>
        : <button className="button" type="button" disabled={busy || unsupported || !status} onClick={() => void enroll()}>
          {busy ? "Waiting for device verification…" : "Set up device verification"}
        </button>}
      <a className="button secondary" href="#/">Not now</a>
    </div>
  </section>;
}
