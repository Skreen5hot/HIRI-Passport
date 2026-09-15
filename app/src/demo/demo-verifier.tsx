import { useState } from "react";
import { EvidenceDimension } from "../components/evidence/evidence-dimension";

export function DemoVerifierRoute() {
  const [inspected, setInspected] = useState(false);

  return <section className="stack">
    <header>
      <p className="eyebrow">Synthetic verifier workspace</p>
      <h1>Verify without flattening the evidence.</h1>
      <p className="lede">Inspect a fixed synthetic presentation and see why a verifier must keep cryptography, current status, organizational identity, holder binding, and policy decisions separate.</p>
    </header>

    {!inspected ? <section className="panel stack" aria-labelledby="synthetic-verify-heading">
      <div>
        <h2 id="synthetic-verify-heading">Generated presentation</h2>
        <p className="muted">This demonstration does not read the holder portfolio, accept uploads, contact external services, or perform production verification.</p>
      </div>
      <div className="actions">
        <button className="button" type="button" onClick={() => setInspected(true)}>Inspect synthetic presentation</button>
      </div>
    </section> : <section className="panel stack" aria-labelledby="synthetic-results-heading">
      <div>
        <p className="eyebrow">Evidence review</p>
        <h2 id="synthetic-results-heading">Synthetic presentation results</h2>
        <p className="muted">A valid signature does not establish current credential status, the issuer's organizational identity, holder binding, or acceptance under a relying party's policy.</p>
      </div>
      <div className="evidence-grid" aria-label="Synthetic verification evidence">
        <EvidenceDimension label="Presentation format" value="valid" detail="The fixed sample has the expected demonstration structure." />
        <EvidenceDimension label="Cryptography" value="valid" detail="The sample represents a valid signature result; no live signature was checked." />
        <EvidenceDimension label="Current status" value="unknown" detail="No approved live status resource was queried." />
        <EvidenceDimension label="Issuer identity" value="unknown" detail="No approved organizational identity anchor was evaluated." />
        <EvidenceDimension label="Holder binding" value="unknown" detail="The demonstration does not authenticate a real holder." />
        <EvidenceDimension label="Relying-party policy" value="not-evaluated" detail="No production acceptance policy was applied." />
      </div>
      <div className="actions">
        <button className="button secondary" type="button" onClick={() => setInspected(false)}>Inspect again</button>
      </div>
    </section>}
  </section>;
}
