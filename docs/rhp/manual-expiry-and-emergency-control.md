# Real Holder Preview manual expiry and emergency control

Status: DRAFT — operative only after RHP-DR-001 becomes effective and all deployment gates close.

## Control identity

- Decision record: `RHP-DR-001`
- Canonical origin: `https://hiri-protocol.org`
- Public notice channel: `https://hiri-protocol.org/notices/`
- Responsible owner: Aaron Damiano
- Authorization expiry: `2026-10-20T00:00:00Z`
- Emergency-notice target: within 10 hours of the owner's termination decision

## Review-date procedure

Before the authorization expiry, the responsible owner MUST either make a successor decision record effective or execute the expiry procedure below. Absence of a decision means expiry; it is not approval to continue.

1. Keep the public GitHub Pages workflow in Synthetic Demo mode.
2. Disable or withhold approval from every separate Real Holder Preview deployment workflow and environment.
3. If real-data mode was deployed, publish a synthetic-only replacement artifact at the canonical origin.
4. Update the public notice channel with the expiry and the approved participant disposition.
5. Verify from a clean browser that the canonical origin cannot initialize real-data mode or create real keys.
6. Record the disabling commit, workflow run, artifact digest, deployment URL, verification time, and notice URL in release evidence.

## Emergency procedure

On a key-handling defect, claim-accuracy failure, or invalidating upstream change, the responsible owner may terminate immediately.

1. Block further Real Holder Preview deployment approvals.
2. Deploy the synthetic-only artifact to the canonical origin as soon as operationally possible.
3. Publish an emergency notice within the approved 10-hour window.
4. Disable operator-controlled resolver, submission, and delivery endpoints used only by the preview.
5. Preserve redacted incident and deployment evidence without collecting credential contents, private keys, or unnecessary participant data.
6. Instruct participants to abandon and locally delete preview authorities and discard preview key material.

## Limitations

This manual control cannot remotely erase an installed PWA, local keys, previously delivered artifacts, recipient copies, or content cached outside the operator's control. A user-controlled device clock is not a tamper-resistant revocation mechanism. The notice page requires a network connection and may be subject to the hosting platform's cache interval.
