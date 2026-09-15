import { useState } from "react";
import { useAppState } from "../state/app-state";
import { DEMO_ADDED_CREDENTIAL } from "./demo-fixtures";

export function DemoAcquireRoute() {
  const { addCredential, credentials } = useAppState();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyPresent = credentials.some(
    credential => credential.recordId === DEMO_ADDED_CREDENTIAL.recordId
  );

  async function addSyntheticCredential(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await addCredential(DEMO_ADDED_CREDENTIAL);
      setAdded(true);
    } catch {
      setError("The synthetic sample could not be added. No data was changed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="stack">
    <header>
      <p className="eyebrow">Synthetic credential acquisition</p>
      <h1>Add a generated sample.</h1>
      <p className="lede">Exercise the portfolio workflow with a fixed, non-authoritative credential. This demo does not accept files, pasted credentials, personal information, or production data.</p>
    </header>

    <section className="panel stack" aria-labelledby="synthetic-add-heading">
      <div>
        <h2 id="synthetic-add-heading">Safety Training Completion</h2>
        <p className="muted">Issued by Example Training Provider (synthetic). Status and issuer identity remain unknown so the demo does not invent trust evidence.</p>
      </div>

      <p className="small">The record is held only in this tab's in-memory demo state. Reloading the page restores the original sample portfolio.</p>
      {error && <p role="alert" className="error-text">{error}</p>}
      {(added || alreadyPresent) && <p role="status">Synthetic sample added. Your Passport now contains {credentials.length} local records.</p>}

      <div className="actions">
        <button
          className="button"
          type="button"
          disabled={busy || alreadyPresent}
          onClick={() => void addSyntheticCredential()}
        >{busy ? "Adding…" : alreadyPresent ? "Synthetic sample added" : "Add synthetic sample credential"}</button>
        <a className="button secondary" href="#/home">View Passport</a>
      </div>
    </section>
  </section>;
}
