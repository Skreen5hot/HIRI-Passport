# Real Holder Preview release contract

Status: EFFECTIVE BUILD CONTRACT — not a production or conformance declaration

Release: Real Holder Preview

Contract date: 2026-07-20

Mandatory review: 2026-10-20 at 00:00:00 UTC

## 1. Authority and precedence

This contract translates the authenticated owner decisions in `RHP-DR-001-Real-Holder-Preview-Decision-Record-FINAL.md` into build constraints. The approved record is bound to:

- decision commit `6808692b655770a7ee26a72cd50d5d54226b576f`;
- exact-file SHA-256 `5fb10c01aa080a47f4d0ddfd58683babd1c5745e4f5fa3617839f55bf1d024f3`;
- signed tag `RHP-DR-001-approved-2026-07-20`;
- signer fingerprint `07171B3AF6042998D1ADDEE0DE640D2A3317B186`.

If this contract conflicts with the signed decision, the signed decision controls. For protocol behavior, the pinned upstream HIRI specifications control first, followed by the Core v2.0.0 Working Draft, BVP v3.0.0 Working Draft where applicable, and UX v2.0.0 Working Draft. This contract may narrow behavior but may not weaken a protocol or safety requirement.

## 2. Release definition

The Real Holder Preview is a holder-only, public-audience, incomplete real-key preview. It is distinct from:

- the Synthetic Demo, which creates no real authority or protocol signature;
- a verifier, issuer, BVS, resolver, or policy-administration product;
- Passport-Core, Passport-Interoperable, Passport-Hardened, Candidate, production, stable, certified, or generally available conformance claims.

The preview may demonstrate real holder key creation, protected local state, holder self-assertions, signed request inspection, explicit consent, signed presentations, local delivery, local privacy history, routine key lifecycle, and supported backup/device operations only after the applicable gates in this contract are satisfied.

## 3. Approved owner selections

| Decision | Approved selection | Build consequence |
|---|---|---|
| D1 | Real Holder Preview | Use this exact release name and incomplete-preview framing. |
| D2 | Public audience | No invitation or participant-list access-control claim. The emergency notice channel is public. Public eligibility does not imply universal browser or device support. |
| D3 | Holder-only | Do not claim verifier workspace coverage. |
| D4 | No public resolver publication | Portfolios and persistent self-assertions remain local; recipients may retain delivered presentation bytes. |
| D5 | Non-durable authority | Enrollment describes the authority as disposable; exit abandons and locally deletes preview state. |
| D6 | No issuers; self-assertions only | Disable direct issuance, BVS issuance, provider integration, and issuer/BVS pilot paths. |
| Exit | Review-date trigger; disposition A | On 2026-10-20, absence of a successor record requires exit and local deletion instructions. |
| Enforcement | Manual | Follow `docs/rhp/manual-expiry-and-emergency-control.md`; do not imply automated expiry. |

## 4. Origin and deployment boundary

The only approved public origin is `https://hiri-protocol.org` with root-path hosting. The mutable public notice channel is `https://hiri-protocol.org/notices/` and the approved limitation page is `https://hiri-protocol.org/preview/`.

The following are not real-data origins:

- `https://skreen5hot.github.io/HIRI-Passport/`;
- localhost or loopback except automated tests using generated non-authoritative state;
- preview deployments, pull-request artifacts, forks, mirrors, alternate ports, subdomains, or lookalike domains.

Origin equality includes scheme, hostname, port, and expected base path. A failed or ambiguous origin check must occur before database access, key creation, import, signing, backup, restore, resolver use, or delivery. Path prefixes are not storage or service-worker isolation.

## 5. Runtime separation

Synthetic Demo and Real Holder Preview are separate build/runtime compositions.

| Property | Synthetic Demo | Real Holder Preview |
|---|---|---|
| Data | Generated synthetic fixtures | Empty real holder state at first start |
| Key material | Non-authoritative test material only | Protected holder keys after capability and policy gates |
| Demo fixtures/reset | Required and visible | Excluded from module graph and artifact |
| Origin | Project Pages, root test origin | Exact approved custom origin only |
| Resource registry | Synthetic/non-normative | Owner-approved immutable pins only |
| Failure | May demonstrate labeled states | Fails closed or reports unknown |

Changing `HIRI_DEMO_MODE` alone is not an adequate security boundary. A production artifact must also pass module-graph, fixture, endpoint, origin, resource, source-map, and claim audits.

## 6. Permitted preview workflows

A workflow is permitted only when its dependencies are complete and its required owner gate is closed:

1. inspect the public limitation and emergency-notice pages;
2. perform capability checks without creating keys or state;
3. create one local holder authority using an approved protected-key path;
4. maintain an encrypted local portfolio with no resolver publication;
5. create clearly labeled persistent or ephemeral self-assertions under pinned schemas;
6. inspect a bounded signed request only after exact structural, signature, method, time, resource, and replay checks;
7. consent to and sign one exact presentation with complete-public consequences shown;
8. deliver identical signed bytes by an explicitly selected local transport or owner-allowlisted HTTPS destination;
9. retain and delete holder-controlled local history;
10. perform only the backup and device operations approved under `OWNER-RHP-08`.

No workflow may infer truth, legal effect, organizational identity, status freshness, or policy acceptance from a valid signature alone.

Disclosure Requests enter only through an explicit local file selection or an explicit paste action. The Real Holder Preview exposes no live verifier request endpoint, URL-ingress scheme, inbox, polling service, or background request receiver. Adding any network request ingress requires a successor authenticated decision, an updated data-flow and threat review, an exact-origin allowlist, and new release evidence.

## 7. Excluded and disabled capabilities

The preview must not enable or claim:

- issuer or BVS credential issuance;
- provider OAuth, registry, document, identity-provider, or account integrations;
- public portfolio, credential, or self-assertion resolver publication;
- selective disclosure or field-confidential public credentials;
- confirmed-current status without an owner-configured issuer-authoritative source;
- recovery of the same authority after loss of every authorized key;
- proximity, NFC, or Bluetooth security/conformance;
- verifier workspace coverage;
- a hardware-backed, hardware-wallet, passkey, or attested-key assurance unless separately evidenced;
- Working Draft conformance, certification, production readiness, or aggregate trust scoring.

## 8. Public claims

Every page describing the preview must reproduce the disclosure required by RHP-DR-001 §5.3. The approved statements in §4 of that record must appear at the interaction points identified by its Appendix B.

Every public entry surface must also disclose, before authority creation is offered, that real-data support is limited to exact browser/OS/device ranges with current physical evidence and owner approval. An untested, expired, or unsupported platform remains inspect-only. “Public audience” describes who may be eligible; it is not a claim of universal device compatibility. Mobile-first layout is not mobile-platform approval.

The product may state only that it:

- creates real cryptographic holder key material after required gates close;
- stores preview information locally on the device;
- supports holder-created self-assertions labeled as self-asserted;
- separates cryptographic evidence, status, identity, provenance, and policy;
- is an incomplete Working Draft implementation preview.

It must not imply that a self-assertion is issuer evidence, that a credential is currently active without authoritative evidence, or that deletion retracts bytes already delivered to another party.

## 9. Owner and technical gates

| Gate | Required before | Safe state while open |
|---|---|---|
| OWNER-RHP-03 | Enabling a production resource manifest | Empty registry; production success paths unavailable |
| OWNER-RHP-04 | Trusting issuer, verifier identity, resolver, or current-head evidence | Empty allowlists; identity/status unknown |
| OWNER-RHP-06 | Approving real-authority browsers/devices | Inspect-only on every unapproved platform |
| OWNER-RHP-07 | Real key creation or sensitive signing | No real authority creation |
| OWNER-RHP-08 | Backup, restore, or device lifecycle | Features disabled; non-durable limitation shown |
| OWNER-RHP-09/10 | Collecting real participant or operational data | No contact collection, analytics, or server-side participant data |
| OWNER-RHP-11/12/13/16 | Public real-data release | Synthetic deployment only; release evidence reports no-go |

An open owner gate does not prevent fail-closed scaffolding, adapters, tests, or synthetic acceptance work. It prevents the affected real-data success state.

## 10. Exit and emergency behavior

At the mandatory review time, or after an owner emergency termination decision:

1. publish the approved notice at `/notices/`;
2. stop authorizing real-data deployment;
3. provide local export only if already approved and safe;
4. instruct participants to abandon preview authorities and locally delete preview state;
5. do not migrate preview authorities into a successor release without a new signed decision;
6. preserve only non-sensitive release and incident evidence required by approved policy.

The notice page is deliberately excluded from service-worker precaching so an emergency update is not replaced by a stale offline response.

The emergency-notice target measures publication by the operator; it does not prove that every holder saw the notice or that every installed PWA stopped. Before real-data release, the PWA lifecycle must:

1. surface a waiting reviewed worker in every connected active tab;
2. coordinate activation across tabs without placing holder data in lifecycle messages;
3. stop new sensitive operations once an emergency replacement is known;
4. allow an already-running sensitive operation to cancel safely or reach a defined safe boundary;
5. reload only after `controllerchange` confirms that the replacement worker controls the client; and
6. prove convergence within 15 minutes after an emergency replacement becomes publicly available for visible, active, network-connected clients.

No finite propagation bound applies to an offline, closed, suspended, or network-isolated device. After reconnection, the application must obtain and activate the current reviewed artifact before allowing another sensitive operation. These controls improve connected-client convergence; they are not remote erasure, cryptographic revocation, or the machine-enforced expiry that RHP-DR-001 declined.

## 11. Completion rule

The Real Holder Preview is not release-ready merely because it builds, passes CI, or deploys. Release readiness requires an exact artifact, all applicable technical tests, closed required owner gates, independent review evidence, and a signed go/no-go record under `OWNER-RHP-16`. Until then, production-mode capabilities remain disabled and `candidateReady` remains `false`.
