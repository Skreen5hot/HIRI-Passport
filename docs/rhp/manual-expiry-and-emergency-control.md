# Real Holder Preview manual expiry and emergency control

Status: CONTROL DRAFT — RHP-DR-001 is effective; this procedure is not release-operative until all deployment gates close

## Control identity

- Decision record: `RHP-DR-001`
- Canonical origin: `https://hiri-protocol.org`
- Public notice channel: `https://hiri-protocol.org/notices/`
- Responsible owner: Aaron Damiano
- Backup release/incident operator: **UNASSIGNED — RELEASE BLOCKER**
- Authorization expiry: `2026-10-20T00:00:00Z`
- Emergency-notice publication target: within 10 hours of the owner's termination decision
- Connected-active-client convergence target: **15 minutes after the emergency replacement becomes publicly available**, for visible, active, network-connected clients only — owner instruction recorded 2026-07-20; authenticated binding pending RHP-DR-002

## Review-date procedure

Before the authorization expiry, the responsible owner MUST either make a successor decision record effective or execute the expiry procedure below. Absence of a decision means expiry; it is not approval to continue.

1. Keep the public GitHub Pages workflow in Synthetic Demo mode.
2. Disable or withhold approval from every separate Real Holder Preview deployment workflow and environment.
3. If real-data mode was deployed, publish a synthetic-only replacement artifact at the canonical origin.
4. Update the public notice channel with the expiry and the approved participant disposition.
5. Verify from a clean browser that the canonical origin cannot initialize real-data mode or create real keys.
6. Exercise the reviewed service-worker update path in open-tab, installed-PWA, multi-tab, offline/reconnect, and suspended/resumed cases.
7. Record the disabling commit, workflow run, artifact digest, deployment URL, verification time, notice URL, and connected-client convergence evidence in release evidence.

## Emergency procedure

On a key-handling defect, claim-accuracy failure, or invalidating upstream change, the responsible owner may terminate immediately.

1. Block further Real Holder Preview deployment approvals.
2. Deploy the synthetic-only artifact to the canonical origin as soon as operationally possible.
3. Publish an emergency notice within the approved 10-hour window.
4. Disable operator-controlled resolver, submission, and delivery endpoints used only by the preview.
5. Preserve redacted incident and deployment evidence without collecting credential contents, private keys, or unnecessary participant data.
6. Instruct participants to abandon and locally delete preview authorities and discard preview key material.

The 10-hour target ends when the operator has published the notice; it is not a claim that every participant received it. The synthetic-only replacement must use the reviewed update lifecycle: notify connected tabs, coordinate activation, prevent new sensitive operations, let an active sensitive operation cancel or reach its defined safe boundary, and reload after `controllerchange`. Visible, active, network-connected clients must converge within 15 minutes after the emergency replacement becomes publicly available, verified in release evidence.

## Operational independence

The responsible owner must not be the only person capable of executing this procedure. Before release, the owner must designate and rehearse with a backup operator who has:

1. an individual GitHub account and the minimum repository/environment authority required for emergency deployment;
2. an individual signing identity and separately controlled private key;
3. access to the approved runbook and public-notice process; and
4. evidence from a dry run that the backup can deploy, publish, verify, and roll back without receiving the owner's private key, password, recovery codes, or session.

Signing keys and account credentials are never shared between operators.

## Propagation evidence

The release evidence must distinguish:

- deployment completion time;
- notice publication time;
- update discovery, activation request, `controllerchange`, and controlled reload times for connected active clients;
- the approved convergence target and observed result; and
- offline, closed, suspended, or unreachable clients, for which no finite convergence claim is made.

On reconnection, a stale client must update before another sensitive operation. Test evidence must cover open browser tabs, multiple tabs, installed standalone mode, an interrupted sensitive operation, offline launch, reconnect, and a device/browser restart.

## Limitations

This manual control cannot remotely erase an installed PWA, local keys, previously delivered artifacts, recipient copies, or content cached outside the operator's control. It cannot guarantee when an offline, closed, suspended, or network-isolated client will receive an update. A user-controlled device clock is not a tamper-resistant revocation mechanism. The notice page requires a network connection and may be subject to the hosting platform's cache interval.
