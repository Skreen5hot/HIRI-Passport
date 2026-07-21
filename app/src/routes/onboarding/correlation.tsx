export function CorrelationRoute() {
  return <section className="panel stack">
    <p className="eyebrow">Synthetic Demo · before you begin</p>
    <h1>Your authority is stable.</h1>
    <p className="lede">Public credentials and presentations can be correlated through the same holder authority. Routine key rotation preserves that authority; it does not make prior presentations anonymous.</p>
    <div className="actions"><a className="button" href="#/onboarding/storage">I understand</a><a className="button secondary" href="#/">Not now</a></div>
  </section>;
}

export function RealCorrelationRoute({ onContinue, onCancel }: Readonly<{
  onContinue(): void;
  onCancel(): void;
}>) {
  return <section className="panel stack" aria-labelledby="correlation-title">
    <p className="eyebrow">Correlation notice</p>
    <h1 id="correlation-title">Your holder authority is a stable public identifier.</h1>
    <p className="lede">Credentials and presentations using this authority can be correlated with each other. Routine same-device key rotation preserves the authority and does not make earlier activity anonymous.</p>
    <ul className="check-list">
      <li>The authority is public, not a secret or an account name.</li>
      <li>Local authentication protects an action on this device; it does not hide correlation.</li>
      <li>Abandoning this authority later creates a different authority and cannot rewrite earlier disclosures.</li>
    </ul>
    <div className="actions">
      <button className="button" type="button" onClick={onContinue}>Continue to device checks</button>
      <button className="button secondary" type="button" onClick={onCancel}>Not now</button>
    </div>
  </section>;
}
