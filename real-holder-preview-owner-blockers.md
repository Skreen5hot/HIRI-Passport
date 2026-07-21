# Real Holder Preview — Owner-Only Blocker Register

Status: OPEN owner-input register
Applies to: `real-holder-preview-plan.js`
Release target: Real Holder Preview; no Passport conformance claim

## Purpose

This register contains decisions, ownership actions, external relationships, credentials, approvals, and risk acceptances that Codex cannot supply on the project owner's behalf. Codex can prepare options, draft documents, implement the selected design, validate public configuration, and automate evidence collection. It cannot own a domain, accept legal or security risk, designate real-world trust anchors, enter third-party agreements, disclose account credentials, commission an independent review, or authorize a public release.

An unresolved item never authorizes Codex to invent a value. Dependent implementation must remain disabled or fail closed. Secrets, private keys, OAuth tokens, provider credentials, personal data, and confidential contracts must not be entered in this file or committed to the repository. Record only public identifiers, decisions, evidence references, and the secret-manager location or credential owner—not the secret itself.

## Status vocabulary

- `OPEN`: no owner decision or acceptable evidence has been recorded.
- `DECIDED`: the owner supplied the decision; implementation or verification remains.
- `EVIDENCED`: the required external evidence exists and is linked or identified.
- `ACCEPTED-LIMITATION`: the owner explicitly accepts a documented preview limitation that the specifications permit to remain unsupported.
- `BLOCKED-EXTERNAL`: the owner has acted, but an independent organization or standards dependency remains unresolved.
- `OUT-OF-SCOPE`: the signed release scope explicitly excludes the capability; adding it requires a successor decision.
- `CLOSED`: the decision, implementation, evidence, and release-gate checks are complete.

## Summary

Checkpoint: 2026-07-20. `OWNER-RHP-01` is closed by decision commit `6808692b655770a7ee26a72cd50d5d54226b576f`, exact-record SHA-256 `5fb10c01aa080a47f4d0ddfd58683babd1c5745e4f5fa3617839f55bf1d024f3`, and verified signed tag `RHP-DR-001-approved-2026-07-20` using public GPG fingerprint `07171B3AF6042998D1ADDEE0DE640D2A3317B186`. RHP-DR-002 Final 1 authenticates the target policies for `OWNER-RHP-03`, `OWNER-RHP-04`, `OWNER-RHP-06`, `OWNER-RHP-07`, and `OWNER-RHP-08` through decision commit `03b24529f999165c2b2ea23520c43ad6e00f9e6f`, exact-record SHA-256 `17e4f3d7ee47b823020a7595d72422f1f99376a03d848a7d6b917d92be25a36f`, signed tag `RHP-DR-002-approved-2026-07-20`, and fingerprint `2B7BA5C378749418B1D051D9C01347EA45970647`. Public verification keys are mapped in `docs/rhp/keys/README.md`. `OWNER-RHP-02` has public HTTPS origin evidence at `https://hiri-protocol.org/`. Production implementation, evidence, independent review, operations, and final release gates still default closed.

| ID | Owner-only blocker | Needed before | Current status |
|---|---|---|---|
| `OWNER-RHP-01` | Release identity, audience, and permitted claims | Production-mode implementation | CLOSED — signed evidence verified |
| `OWNER-RHP-02` | Dedicated verified origin and DNS control | Real-data deployment | EVIDENCED — implementation controls pending |
| `OWNER-RHP-03` | Normative resource publication authority | Resource-dependent real processing | DECIDED — D1-A governance; reviewer and exact manifest approval pending |
| `OWNER-RHP-04` | Trusted issuers, identity anchors, and authoritative resolvers | Real request/credential trust decisions | DECIDED — D2-A empty trust/warned consent; implementation and evidence pending |
| `OWNER-RHP-05` | Pilot issuer and verifier relationships | External partner pilot | OUT-OF-SCOPE — no partner pilot authorized |
| `OWNER-RHP-06` | Supported-browser and device policy | Real authority creation/release candidate | DECIDED — D3-A evidence strategy; no platform approved pending physical evidence |
| `OWNER-RHP-07` | Holder key-protection and local-authentication policy | Real authority creation | DECIDED — D4-A non-extractable keys and mandatory WebAuthn UV; implementation/evidence pending |
| `OWNER-RHP-08` | Backup, loss, compromise, and recovery policy | Real authority creation | DECIDED — D5-A disposable single-device authority; exclusion controls/evidence pending |
| `OWNER-RHP-09` | Privacy, legal, jurisdiction, and age policy | Collection of real data | OPEN |
| `OWNER-RHP-10` | Retention, telemetry, support, and deletion policy | Pilot operations | OPEN |
| `OWNER-RHP-11` | Independent security, privacy, and accessibility review | Public real-data release | OPEN |
| `OWNER-RHP-12` | Production hosting, repository, and deployment controls | Real-data deployment | DECIDED — Pages/custom domain; controls pending |
| `OWNER-RHP-13` | Incident response and vulnerability-disclosure ownership | Pilot operations | OPEN |
| `OWNER-RHP-14` | BVS inclusion and provider agreements | Any BVS-backed pilot | OUT-OF-SCOPE — excluded by RHP-D6-A |
| `OWNER-RHP-15` | Public conformance language and standards coordination | Future conformance communications | ACCEPTED-LIMITATION — preview language fixed |
| `OWNER-RHP-16` | Final pilot go/no-go and residual-risk acceptance | Release | OPEN |

## Detailed blockers

### OWNER-RHP-01 — Release identity, audience, and permitted claims

**Resolution:** Closed on 2026-07-20 by `RHP-DR-001-approved-2026-07-20`, a verified GPG-signed tag over decision commit `6808692b655770a7ee26a72cd50d5d54226b576f`. The bound decision-record SHA-256 is `5fb10c01aa080a47f4d0ddfd58683babd1c5745e4f5fa3617839f55bf1d024f3`; signer fingerprint `07171B3AF6042998D1ADDEE0DE640D2A3317B186`.

**Why Codex cannot close it:** Naming a release and deciding who may use real identity material are product-owner risk decisions. Codex cannot authorize a public claim or determine the organization's risk tolerance.

**Owner must provide:**

1. Confirm the release name `Real Holder Preview` or provide the approved replacement.
2. Define whether access is public, invite-only, organization-only, or limited to named pilot participants.
3. Confirm holder-only scope or explicitly add the verifier workspace.
4. Approve the unsupported-capability language for selective disclosure, confirmed-current status, total-loss recovery, and proximity transport.
5. Approve the exact statements the site may and may not make about security, identity, verification, and conformance.

**Acceptable evidence:** A dated owner decision record naming the approver, audience, scope, prohibited claims, and review date.

**Unlocks:** `record-rhp-release-contract`, `implement-runtime-mode-boundary`, `implement-production-bootstrap`, `implement-rhp-deployment`, and `record-rhp-exit-review`.

**Safe default:** Synthetic Demo only; no real keys or credentials.

### OWNER-RHP-02 — Dedicated verified origin and DNS control

**Why Codex cannot close it:** Codex cannot purchase or own a domain, change DNS without authorized account access, prove organizational control, or accept origin-migration consequences. Browser storage and service workers are origin-scoped, so this is a security boundary rather than a branding choice.

**Owner must provide:**

1. The dedicated production-preview hostname.
2. Confirmation of domain ownership and the authorized DNS administrator.
3. Whether GitHub Pages remains the host or a header-controllable static host/CDN will be used.
4. The approved canonical origin, allowed navigation origins, resolver origins, presentation endpoints, and redirect policy.
5. A migration decision if any existing real data could reside under another origin. The synthetic project origin must never be migrated as trusted real state.

**Acceptable evidence:** Public DNS verification, enforced HTTPS, a recorded origin inventory, and a deployment test showing that the application refuses real-data mode on every non-approved origin.

**Unlocks:** `implement-origin-isolation`, `harden-production-security-boundaries`, `implement-rhp-deployment`, and `generate-rhp-release-evidence`.

**Safe default:** Real-data mode refuses to start; the GitHub project Pages origin remains synthetic-only.

### OWNER-RHP-03 — Normative resource publication authority

**Prepared build artifact:** `docs/rhp/resource-governance.md` defines an empty fail-closed registry and the exact manifest/review/signing process. It does not close this owner gate or make preview bytes normative.

**Authenticated owner decision:** RHP-DR-002 D1-A approves the project-preview governance model after independent technical review. It does not approve any resource bytes.

**Current owner input:** The owner will identify a trusted technical person. No reviewer is designated yet; D1-A records the target governance but does not approve a resource manifest or close this gate.

**Why Codex cannot close it:** Codex can draft contexts, schemas, profiles, hashes, and vectors, but cannot unilaterally make a Working Draft normative or designate itself as the publishing authority. Final bytes and identifiers require project or upstream standards governance.

**Owner must provide or obtain:**

1. The authority that approves the Passport Core, UX, and BVP resource bytes.
2. Final public URIs for contexts, schemas, evidence profiles, and adapter profiles used by the preview.
3. The immutable approved bytes and SHA-256 identifiers.
4. Versioning, correction, deprecation, and compromise procedures.
5. Confirmation that every approved resource remains labeled project-preview and `candidateReady:false` under D1-A.
6. Official positive and adversarial vectors, or approval to label preview vectors as project-specific and non-conformance evidence.
7. A named technical reviewer who did not author the resource bytes and can independently review the exact manifest package. Repository administration is not required.

**Acceptable evidence:** A signed or otherwise authenticated publication record, immutable hosted bytes below the explicit Real Holder Preview namespace, matching repository pins, reproducible hashes, a named independent-review record, and an owner-approved resource manifest.

**Unlocks:** `record-rhp-resource-governance`, `implement-production-resource-registry`, `implement-real-credential-acquisition`, `implement-live-request-acceptance`, and `generate-rhp-release-evidence`.

**Safe default:** `OPEN-CONTEXT-01` remains active and all real credential/request success paths stay disabled.

### OWNER-RHP-04 — Trusted issuers, identity anchors, and authoritative resolvers

**Prepared build artifact:** `docs/rhp/trust-configuration-policy.md` defines the approved empty issuer, BVS, identity-anchor, resolver, current-head, remote-resource, delivery, credential-schema, and relying-party-policy sets. Real request consent and signing remain disabled pending implementation and evidence.

**Authenticated owner decision:** RHP-DR-002 D2-A permits only cryptographically valid, lifecycle-valid requests from identity-unknown verifier authorities to reach warned consent after all specified controls pass. Ingress is file/paste only; egress is file/clipboard only; policy remains `not-evaluated`.

**Why the gate is not closed:** The empty policy is authenticated, but its fail-closed implementation, request/consent controls, triggered threat-model re-review, and release evidence are incomplete. Codex also cannot add a non-empty authority, identity anchor, resolver, or relying-party policy without a successor owner decision and supporting governance evidence.

**Remaining conditions for this release:**

1. Keep every trust, issuer, resolver, current-head, remote-resource, HTTPS-delivery, credential-schema, and relying-party-policy set empty.
2. Implement the complete structural, cryptographic, lifecycle, resource-pin, replay, hostile-text, consent, mandatory WebAuthn UV, and local-delivery controls.
3. Keep issuer/BVS artifacts unsupported or inspection-only and never promote identity/status/policy unknown to success.
4. Complete the triggered threat-model re-review and applicable independent review before activation.
5. Use a successor signed decision before adding any trust entry or network request/delivery origin.

**Acceptable evidence:** A versioned public empty trust configuration bound to the release, change-control record, and tests proving identity-unknown warning persistence, `not-evaluated` policy, inspection-only issuer artifacts, absent network endpoints, and refusal to promote unknown organizations or unapproved origins. A future non-empty configuration additionally requires organizational/source evidence and a successor signed decision.

**Unlocks:** `implement-resolver-and-head-adapters`, `implement-identity-and-policy-configuration`, `implement-real-credential-acquisition`, and `implement-live-request-acceptance`.

**Safe default:** Empty anchors and endpoints; issuer identity and current status remain `unknown`.

### OWNER-RHP-05 — Pilot issuer and verifier relationships

**Current scope:** OUT-OF-SCOPE. RHP-DR-001 D3-A is holder-only and D6-A enables no issuers. No external partner pilot is authorized. Adding an official issuer/verifier interoperability pilot requires a successor owner decision and reopens this gate.

**Why Codex cannot close it:** Codex cannot enter agreements, obtain consent from external operators, bind production authorities, or commit another organization to an interoperability pilot.

**Owner must provide:**

1. At least one authorized issuer able to produce preview credentials under the pinned resource set.
2. At least one verifier able to issue signed disclosure requests and receive exact presentation bytes.
3. Named technical and incident contacts for each party.
4. Test-versus-production authority separation and credential-lifecycle procedures.
5. Agreed pilot data, purpose, retention, support, revocation, and termination rules.

**Acceptable evidence:** Executed pilot authorization or equivalent written approval, public authority identifiers, endpoint ownership proof, and a jointly approved end-to-end test record.

**Unlocks:** `implement-real-credential-acquisition`, `implement-presentation-delivery-and-receipts`, `record-rhp-pilot-runbook`, and `record-rhp-exit-review`.

**Safe default:** Locally generated non-authoritative test fixtures only; no real identity claims.

### OWNER-RHP-06 — Supported-browser and device policy

**Prepared build artifact:** `docs/rhp/browser-capability-matrix.md` records current CI evidence and approves no platform for real authority creation. Exact-version physical evidence and owner approval are still required.

**Authenticated owner decision:** RHP-DR-002 D3-A selects an evidence-first Windows Chromium and Android Chromium strategy without pre-approving any browser/version.

**Why Codex cannot close it:** Automated capability results can be collected, but the owner must decide which browsers/devices are supported and accept the user impact of excluding or degrading platforms.

**Owner must provide:**

1. Exact physical Windows Chromium and Android Chromium test records after automated readiness passes.
2. The exact OS/browser/device version ranges approved from passing evidence.
3. Failure-mode screenshots and confirmation that every other platform remains inspect-only.
4. The review cadence and emergency de-support record for the approved ranges.

**Acceptable evidence:** An approved capability matrix with physical-device results, failure-mode screenshots, and a dated owner acceptance.

**Unlocks:** `record-rhp-browser-capability-matrix`, `implement-local-authentication`, `implement-holder-onboarding`, `implement-rhp-browser-acceptance`, and `generate-rhp-release-evidence`.

**Safe default:** Inspection-only synthetic mode on unapproved platforms; no authority creation.

### OWNER-RHP-07 — Holder key-protection and local-authentication policy

**Authenticated owner decision:** RHP-DR-002 D4-A requires non-extractable browser keys plus fresh mandatory WebAuthn user verification for authority creation and sensitive key actions, with no weaker production fallback.

**Why the gate is not closed:** The security/usability choice is authenticated, but implementation, physical-browser evidence, independent review, and exact public limitation wording remain incomplete. Codex cannot claim hardware protection or platform assurance without separate evidence.

**Remaining implementation and evidence:**

1. Prove final private keys are generated non-extractably and durably structured-cloned on each approved platform.
2. Require fresh WebAuthn UV for authority creation, presentation signing, same-device rotation, compromise action, authority abandonment, and destructive local deletion.
3. Bind each authorization to one exact operation/state for at most 300 seconds with replay, cancellation, navigation, and material-state invalidation.
4. Fail closed on cancellation, unsupported authenticators, missing UV, retry exhaustion, or expired capability evidence.
5. Prohibit platform-, passkey-, or hardware-backed claims unless independently attested.

**Acceptable evidence:** An approved key-protection profile, threat-model mapping, browser evidence, and explicit wording for limitations.

**Unlocks:** `harden-protected-key-storage`, `implement-local-authentication`, `implement-holder-onboarding`, `implement-signed-presentations`, and `implement-disposable-authority-lifecycle`.

**Safe default:** No real key generation or signing.

### OWNER-RHP-08 — Backup, loss, compromise, and recovery policy

**Authenticated owner decision:** RHP-DR-002 D5-A selects a disposable single-device authority with no private-key backup/export, same-authority restore, device addition/removal, recipient continuity, browser-sync recovery, or vendor-account recovery.

**Why the gate is not closed:** The no-backup/no-device-add policy is authenticated, but the exclusion boundary, irreversible-loss UX, safe same-device lifecycle behavior, abandonment/deletion path, physical evidence, and independent review remain incomplete. `OPEN-RECOVERY-01` still prohibits any total-loss continuity claim.

**Remaining implementation and evidence:**

1. Remove or production-disable every private-key backup, restore, device-add/remove, and recovery success path.
2. Require irreversible-loss acknowledgement before authority creation and destructive deletion.
3. Permit same-device rotation or one-method compromise only when another authorized local method already exists and the Core transition is atomic; otherwise treat loss as terminal.
4. Implement authenticated authority abandonment and complete local deletion with post-delete verification.
5. Test that browser sync, OS backup, biometrics, old ciphertext, or a vendor account never appears as same-authority recovery.

**Acceptable evidence:** Negative tests proving private-key backup/export, restore, device addition/removal, and account/browser-sync recovery are absent; approved irreversible-loss and destructive-action text; safe same-device rotation/compromise evidence where applicable; and an authenticated authority-abandonment/local-deletion rehearsal.

**Unlocks:** `implement-disposable-authority-lifecycle` and `generate-rhp-release-evidence`.

**Safe default:** No production authority creation until the user acknowledges irreversible total loss; backup features remain disabled.

### OWNER-RHP-09 — Privacy, legal, jurisdiction, and age policy

**Why Codex cannot close it:** Codex is not the project's legal representative and cannot determine regulatory role, lawful basis, jurisdictional obligations, contractual terms, or whether minors may participate.

**Owner must obtain and approve:**

1. Operating entity and contact identity.
2. Pilot jurisdictions and excluded jurisdictions.
3. Controller/processor/independent-local-tool characterization for each data flow.
4. Lawful basis, consent language where applicable, age eligibility, and accessibility commitments.
5. Privacy notice, terms, third-party disclosures, cross-border transfer position, and data-subject request process.
6. A legal decision on the treatment of credentials, identifiers, device data, and verifier receipts.

**Acceptable evidence:** Counsel- or owner-approved documents with version, effective date, contact, and deployment location.

**Unlocks:** `record-rhp-threat-and-privacy-model`, `harden-production-security-boundaries`, `record-rhp-pilot-runbook`, and `record-rhp-exit-review`.

**Safe default:** No collection or processing of real participant data.

### OWNER-RHP-10 — Retention, telemetry, support, and deletion policy

**Why Codex cannot close it:** These are organizational commitments. Codex cannot promise response times, staff a support channel, decide retention periods, or authorize collection of operational data.

**Owner must provide:**

1. Whether any telemetry is permitted. Default should remain none beyond privacy-preserving availability signals.
2. Exact fields, purposes, destinations, retention, access, and deletion for permitted operational records.
3. Local privacy-history behavior and user-controlled deletion rules.
4. Support channel, service expectations, escalation path, and account-free identity verification procedure.
5. Data deletion and pilot-exit process.

**Acceptable evidence:** Approved data inventory and retention schedule, support runbook, and tests showing secrets and claim contents cannot enter logs or telemetry.

**Unlocks:** `implement-local-privacy-history`, `harden-production-security-boundaries`, and `record-rhp-pilot-runbook`.

**Safe default:** No analytics or claim telemetry; local history only and user-controlled.

### OWNER-RHP-11 — Independent security, privacy, and accessibility review

**Why Codex cannot close it:** A review performed by the same implementation agent is not independent. Codex cannot contract an assessor, determine assessor qualifications, or accept findings on the owner's behalf.

**Owner must commission:**

1. Security architecture and threat-model review.
2. Web/PWA penetration test covering supply chain, service worker, storage, resolver content, crypto usage, and malicious imports.
3. Privacy review or DPIA-equivalent appropriate to the pilot.
4. Accessibility review with physical mobile devices and assistive technology.
5. Remediation ownership, severity policy, and release-blocking thresholds.

**Acceptable evidence:** Final reports or attestations, scoped exceptions, remediation commits, retest evidence, and signed residual-risk acceptance. Confidential reports may remain outside the repository; record only controlled evidence references.

**Unlocks:** `generate-rhp-release-evidence` and `record-rhp-exit-review`.

**Safe default:** No public real-data release.

### OWNER-RHP-12 — Production hosting, repository, and deployment controls

**Current decision:** GitHub Pages, GitHub Actions, custom origin `https://hiri-protocol.org`, and HTTPS are selected and operating. RHP-DR-002 authenticates the 15-minute emergency-replacement convergence target for visible, active, network-connected clients; implementation and measured evidence remain pending. Branch/reviewer policy, real-data environment approval, rollback, header limitations, monitoring, artifact/SBOM retention, and release evidence remain open.

**Why Codex cannot close it:** Codex can author workflows but cannot own billing, configure organization-wide policy without authority, act as the sole release approver, or safely invent production credentials.

**Owner must provide or authorize:**

1. Hosting account and production environment ownership.
2. Repository branch protection, required checks, reviewer rules, and emergency access policy.
3. Production environment approvers and deployment rollback authority.
4. Secret-manager ownership and credential-rotation process; no production secret belongs in the PWA bundle.
5. Artifact retention, provenance/SBOM expectations, availability monitoring, and backup of operational configuration.
6. Whether the hosting platform can enforce the approved HTTP response headers. If not, approve migration or a fronting CDN.
7. A primary and backup release operator using separate GitHub accounts, separate signing identities, and separately controlled private keys. Passwords, private keys, recovery codes, and sessions must not be shared.
8. Implement and measure the approved 15-minute target from emergency-replacement public availability through controlled reload for visible, active, network-connected clients. The target does not apply to offline, closed, suspended, or isolated devices; those clients must update before a sensitive operation after reconnect.

**Acceptable evidence:** Screenshots or exported policy, successful protected-environment dry run by both operators, separate signature verification, rollback rehearsal, measured connected-client update evidence, and public-origin header verification.

**Unlocks:** `implement-rhp-ci`, `implement-rhp-deployment`, and `generate-rhp-release-evidence`.

**Safe default:** CI may build artifacts but cannot deploy real-data mode.

### OWNER-RHP-13 — Incident response and vulnerability-disclosure ownership

**Why Codex cannot close it:** An incident process requires accountable people, communication authority, legal escalation, and operational availability.

**Owner must designate:**

1. Primary security contact and a named backup operator with separate account and signing identity.
2. Private vulnerability-reporting channel and acknowledgement targets.
3. Severity definitions, credential/authority compromise procedures, release revocation, and emergency shutdown authority.
4. Issuer, BVS, verifier, hosting, and participant notification paths.
5. Evidence-preservation rules that do not collect unnecessary identity data.
6. A rehearsal proving the backup can publish a notice, deploy the synthetic-only artifact, verify `controllerchange`-based convergence, and roll back without receiving the primary operator's credentials or private key.

**Acceptable evidence:** Published `SECURITY.md` or equivalent, private contact test, tabletop exercise, and dated incident-response approval.

**Unlocks:** `record-rhp-pilot-runbook`, `generate-rhp-release-evidence`, and `record-rhp-exit-review`.

**Safe default:** No external pilot.

### OWNER-RHP-14 — BVS inclusion and provider agreements

**Current scope:** OUT-OF-SCOPE. RHP-DR-001 D6-A authorizes no issuers and self-assertions only. No BVS/provider code path, credential, endpoint, profile, secret, or agreement belongs in the Real Holder Preview production configuration. A successor decision is required to add one.

**Why Codex cannot close it:** A BVS handles external source accounts and potentially regulated evidence. Codex cannot obtain provider authorization, OAuth credentials, contractual rights, or approve evidence retention.

**Owner must decide:**

1. Whether BVS-backed credentials are excluded from the Real Holder Preview or included.
2. If included, which BVS operators, source providers, methods, jurisdictions, adapter profiles, and credential types are approved.
3. Provider terms, OAuth/client registration, source-data minimization, retention, deletion, audit, and incident obligations.
4. Separation of provider secrets and raw evidence from public BVS credentials and the static PWA.

**Acceptable evidence:** Explicit scope decision. Inclusion additionally requires executed agreements, approved profiles, secured service credentials, operator governance evidence, and an independently deployed BVS service.

**Unlocks:** BVS-backed paths in `implement-real-credential-acquisition`, `implement-credential-evidence-surfaces`, and `record-rhp-exit-review`.

**Safe default:** BVS issuance and live provider integrations are excluded; the holder may only display correctly verified BVS credentials supplied by an independently approved operator.

### OWNER-RHP-15 — Public conformance language and standards coordination

**Current preview disposition:** ACCEPTED-LIMITATION. RHP-DR-001 §§4–5 approves the Real Holder Preview's unsupported-capability and non-conformance language. Standards advancement, official vectors, Candidate status, and future Passport-Interoperable/Passport-Hardened claims remain outside this approval and cannot be inferred from the preview.

**Why Codex cannot close it:** Codex cannot advance the Working Drafts, speak for upstream HIRI governance, designate official vectors, or authorize certification language.

**Owner must provide or coordinate:**

1. Specification publication status and the authority responsible for advancing it.
2. Approved wording distinguishing implementation evidence, preview interoperability, Candidate evaluation, and conformance.
3. Disposition of `OPEN-SD-01`, `OPEN-HEAD-01`, `OPEN-CONTEXT-01`, `OPEN-RECOVERY-01`, and `OPEN-TRANSPORT-01`.
4. Official test vectors, compatibility evidence, independent review expectations, and any certification process.

**Acceptable evidence:** Published standards decision and owner-approved public-claims matrix.

**Unlocks:** Any future Passport-Interoperable, Passport-Hardened, Candidate, or production-conformance claim. It is not required to ship a clearly labeled non-conformant Real Holder Preview if all preview gates are met.

**Safe default:** Working Draft implementation preview; `candidateReady: false`; no conformance claim.

### OWNER-RHP-16 — Final pilot go/no-go and residual-risk acceptance

**Why Codex cannot close it:** Only the accountable owner can authorize real participants and accept the aggregate residual risk after reviewing all evidence.

**Owner must review:**

1. Every blocker above and its evidence.
2. CI, production artifact, browser/device, migration, backup/restore/device-add exclusion, authority-abandonment, resolver, and end-to-end preview results.
3. Independent findings and unresolved exceptions.
4. Rollback, incident, support, privacy, and participant-exit readiness.
5. The exact release version, commit, artifact digest, origin, date, audience, and expiration/review date.
6. The named independent resource reviewer, primary and backup operators, their separation-of-control evidence, and the connected-client convergence target/results.

**Acceptable evidence:** A signed or authenticated go/no-go record naming the release artifact and every accepted limitation. Approval must not be inferred from a merge, successful deployment, or absence of objection.

**Unlocks:** `record-rhp-exit-review` and real participant enrollment.

**Safe default:** No-go; keep the synthetic deployment available.

## Owner response template

Copy this section into a dated decision record. Do not include secrets.

```text
Decision date:
Approver and role:
Release name and audience:
Holder-only or holder + verifier:
Dedicated hostname:
Hosting platform and production environment owner:
Normative resource authority and manifest reference:
Approved issuer authorities and identity-anchor reference:
Approved resolver/current-head origins:
Pilot issuer and verifier contacts/reference:
Supported browser/device matrix reference:
Key-protection and local-auth profile reference:
Backup/recovery decision reference:
Privacy/legal approval reference:
Retention/telemetry/support policy reference:
Independent review evidence references:
Incident-response owner and policy reference:
BVS scope: excluded | display-only | included
Approved public claims and prohibited claims:
Accepted limitations and expiry/review date:
Final go/no-go: GO | NO-GO
Release commit and artifact digest:
```

## Non-owner work Codex can perform now

While these blockers remain open, Codex can implement fail-closed production/demo separation, configuration schemas, origin enforcement, secure storage composition, non-extractable-key experiments, resolver provenance, verification wiring, backup and migration test harnesses, cross-browser automation, production artifact audits, deployment workflows that stop before release, decision templates, and evidence-generation tooling. It must not fill owner fields with invented values or turn a passing technical test into release authorization.
