function OverviewCard() {
  return <aside className="panel passport-card" aria-label="Passport overview">
    <p className="eyebrow">Local by design</p>
    <h2>No profile page.<br />No trust score.</h2>
    <div className="metric"><strong>5</strong><span>separate evidence dimensions, never one badge</span></div>
  </aside>;
}

export function WelcomeRoute() {
  return <section className="hero">
    <div>
      <p className="eyebrow">Synthetic Demo</p>
      <h1>A passport that stays in your hands.</h1>
      <p className="lede">Explore signed-evidence concepts locally without creating a real authority or Passport service account.</p>
      <div className="actions">
        <a className="button" href="#/onboarding/correlation">Set up synthetic demo</a>
        <a className="button secondary" href="#/home">Explore synthetic data</a>
      </div>
    </div>
    <OverviewCard />
  </section>;
}

export function RealHolderWelcomeRoute({ onContinue }: Readonly<{ onContinue(): void }>) {
  return <section className="hero">
    <div>
      <p className="eyebrow">Real Holder Preview · Working Draft</p>
      <h1>Create a disposable authority on this device.</h1>
      <p className="lede">No Passport service account is created. Exact approved browser and device evidence is required before this preview can create real holder keys.</p>
      <ul className="check-list">
        <li>One browser profile on one device holds the only authority keys.</li>
        <li>No private-key backup, restore, device addition, or account recovery exists.</li>
        <li>Clearing site data or losing the device permanently ends access to this authority.</li>
      </ul>
      <div className="actions">
        <button className="button" type="button" onClick={onContinue}>Review the consequences</button>
        <a className="button secondary" href="/preview/">Read preview limitations</a>
      </div>
    </div>
    <OverviewCard />
  </section>;
}
