# Real Holder Preview — Technical Policy Decision Record

## Build-policy choices for OWNER-RHP-03, 04, 06, 07, and 08

**Record ID:** RHP-DR-002

**Revision:** Final 1

**Status:** FINAL FOR SIGNATURE — NOT EFFECTIVE until exact committed bytes are authenticated and independently verified

**Approved:** 2026-07-20, authentication pending

**Approver:** Aaron A Damiano, Project Owner

**Parent authority:** RHP-DR-001 signed tag `RHP-DR-001-approved-2026-07-20`

## 0. Purpose

RHP-DR-001 authorizes the release identity and risk boundary. This record selects the remaining technical-policy choices that materially affect the production architecture. It does not authorize real-data deployment, collect participant data, close independent review, or constitute the final go/no-go.

Until this record becomes effective, the safe state defined in `docs/rhp/release-contract.md` remains:

- empty production resource and trust registries;
- inspect-only behavior on all browsers/devices;
- no real authority creation or signing;
- no backup, restore, or device lifecycle;
- synthetic public deployment only.

Selecting an option records the approved target architecture; it does not attest that the option's implementation, staffing, review, or evidence conditions are already satisfied. “Recommended” identifies the preparer's preferred policy, not a completed control. Every stated condition remains a fail-closed activation or release gate, and an owner signature cannot substitute for the required implementation and evidence.

## 1. Decision inputs

The approver reviewed or directed revision against:

- `docs/rhp/resource-governance.md`;
- `docs/rhp/trust-configuration-policy.md`;
- `docs/rhp/browser-capability-matrix.md`;
- `docs/rhp/threat-and-privacy-model.md`;
- `docs/rhp/data-flow-inventory.md`;
- RHP-DR-001 D2–D6 and approved limitation language.

## 2. RHP-P2-D1 — Preview resource authority (`OWNER-RHP-03`)

Selected option:

- [x] **A. Project-preview resource set after independent technical review.** The project owner may approve one exact versioned manifest after a reviewer other than the byte author verifies specification correspondence, hashes, schemas, vectors, and placeholder exclusion. Resources remain project-preview resources and do not imply Candidate or normative standards status.
- [ ] **B. Wait for published Candidate resources.** All resource-dependent real workflows remain disabled until the responsible specification governance publishes Candidate schemas, contexts, hashes, and vectors.
- [ ] **C. External publication authority.** Name a separate governance body and provide its authenticated publication/approval process before any project resource is used.

**Rationale:** A permits a reproducible preview without misrepresenting project bytes as ecosystem-normative. B would prevent a functional real-key preview for an indeterminate period. No separate external publication body currently exists.

**Required conditions:**

1. immutable versioned URIs below `https://hiri-protocol.org/resources/preview/rhp-2026-07/` so preview status is visible in every initial resource identifier;
2. exact bytes and SHA-256 manifest;
3. Draft 2020-12 closed schemas and pinned-reference enforcement;
4. positive, negative, boundary, and adversarial project vectors;
5. two-person technical preparation/review separation;
6. signed owner approval of the exact manifest hash;
7. explicit `project preview resource` and `candidateReady:false` language.

No independent resource reviewer is designated as of this record. Selecting A therefore does not approve any resource manifest or close `OWNER-RHP-03`. The production registry remains empty and resource-dependent real workflows remain disabled until the owner names a reviewer other than the byte author and the exact manifest package receives the required review and signed approval. A cooling-off period or later self-review is not a substitute for that independent review.

**Selected:** A

## 3. RHP-P2-D2 — Initial trust baseline (`OWNER-RHP-04`)

Selected option:

- [x] **A. Empty trust sets with warned identity-unknown requests.** Approve empty issuer, BVS, identity-anchor, resolver, current-head, remote-resource, HTTPS-delivery, credential-schema, and relying-party-policy sets. Disclosure Requests enter only through explicit local file selection or paste; the preview exposes no live verifier request endpoint. A request whose cryptography and lifecycle evidence validate may reach consent with a prominent `verifier identity unknown` warning. Output is limited to explicit file or clipboard delivery; policy remains `not-evaluated`.
- [ ] **B. Empty trust sets and block all real requests.** Real authority/local self-assertion work may proceed, but real request consent and presentation signing remain disabled.
- [ ] **C. Non-empty trust configuration.** Provide an appendix naming exact authorities, anchors, schemas, origins, paths, evidence, freshness, expiry, policy, and incident owners. This requires expanded review and testing before implementation.

**Rationale:** A exercises the holder consent/signing boundary while preserving honest evidence separation and avoiding invented organizational trust or server endpoints. Validation, inert rendering, complete-public preview, decline, and local authentication are mandatory.

**Required UI facts:**

- request signature/method validity is separate from verifier identity;
- display name/domain is a signed hint only;
- no issuer credential is trusted or preview-issued;
- self-assertions are holder statements, not third-party evidence;
- file/clipboard recipients can persistently copy delivered bytes;
- policy is not evaluated and no status/identity assurance is implied;
- attacker-controlled purpose, display name, and request text are rendered only inside a fixed application-owned request frame that cannot supply style, markup, icons, or layout resembling browser, operating-system, or Passport system messages; and
- the `verifier identity unknown` warning remains visibly associated with the request content throughout review and is repeated at final authorization, so attacker-controlled text cannot remain visible while its identity warning is displaced or separately dismissed.

**Selected:** A

## 4. RHP-P2-D3 — Browser/device approval strategy (`OWNER-RHP-06`)

Selected option:

- [x] **A. Evidence-first mobile/desktop Chromium pilot.** Build against capability contracts, then physically test one Windows desktop Chromium pair and one Android Chromium pair. Approve only the exact tested version ranges that pass the complete matrix. Every other platform remains inspect-only until separately tested and approved.
- [ ] **B. Evidence-first desktop-only pilot.** Physically test and approve one Windows desktop Chromium pair; all mobile and other desktop platforms remain inspect-only.
- [ ] **C. Broad support before any real preview.** Keep all real authority paths disabled until Chromium, Safari/WebKit, and Firefox pass separate physical desktop/mobile evidence and accessibility review.

**Rationale:** A preserves the mobile-first product intent without pretending viewport emulation is device evidence. It limits initial assurance to two evidence packages and avoids assuming that browser engines share key/storage behavior.

**Required conditions:**

1. no browser is approved by selecting this strategy alone;
2. final Ed25519/X25519 private keys must be non-extractable from creation;
3. IndexedDB `CryptoKey` durability must survive tab/browser/device restarts;
4. storage eviction, migration, multi-tab, update, privacy, and accessibility tests must pass;
5. exact browser/OS/device versions and artifact/config hashes must be recorded;
6. approved capability evidence is packaged in an immutable, hash-bound public configuration with an explicit `notAfter`; the application checks that value at startup and immediately before authority creation or any sensitive operation, and missing, invalid, or expired evidence produces inspect-only behavior before key/state access;
7. public entry surfaces state that public eligibility and mobile-first layout do not imply universal platform support;
8. service-worker evidence covers waiting-worker prompts, multi-tab coordination, safe sensitive-operation boundaries, reload after `controllerchange`, and convergence within 15 minutes after an emergency replacement becomes publicly available for visible, active, network-connected clients;
9. offline, closed, suspended, and isolated clients have no finite convergence claim and must update before a sensitive operation after reconnect.

The capability-evidence expiry check is a packaged build/runtime correctness control, not a server-pushed revocation or tamper-resistant clock. It uses the browser's protocol time, records that limitation, performs no unapproved network check, and cannot be represented as protection against a deliberately manipulated device clock.

Condition 9 must be enforced in the common sensitive-operation path—not only in UI text. Before authority creation, presentation signing, rotation, destructive deletion, or any later approved backup/device operation, the application must check capability-evidence freshness and current-artifact state. A waiting or stale worker blocks the operation until reviewed activation and `controllerchange` complete. This is tracked as implementation hazard `RHP-BUILD-05`; selecting D3 does not claim that gate is already implemented.

**Selected:** A

## 5. RHP-P2-D4 — Key protection and local authentication (`OWNER-RHP-07`)

Selected option:

- [x] **A. Non-extractable browser keys plus mandatory WebAuthn user verification.** Real authority creation is available only where Ed25519/X25519 private keys are generated non-extractably and durably stored. A fresh WebAuthn user-verification ceremony gates authority creation, presentation signing, rotation, device changes, approved backup/restore, and destructive key deletion. Cancellation/failure has no sensitive side effect. There is no weaker fallback.
- [ ] **B. Non-extractable browser keys without WebAuthn.** Sensitive operations use explicit in-app confirmation but rely on the unlocked browser/OS session; the UI states that no fresh local authentication occurred.
- [ ] **C. External hardware/companion signing.** Revise the plan for a separately authenticated signing service or device and provide its protocol, transport, recovery, privacy, and assurance evidence.

**Rationale:** A adds a fresh local user-presence/verification gate without mislabeling WebAuthn as Passport evidence or hardware protection. It narrows supported platforms and does not protect against all same-origin script or device compromise.

**Required conditions:**

- replace the current PKCS#8 export/re-import prototype before real use;
- never serialize private key bytes into application state, logs, telemetry, backup, or diagnostics;
- bind local authorization to one exact operation and state hash; issue it for at most 300 seconds; consume it once; and invalidate it on cancellation, completion, replay, page reload/navigation, or any material operation-state change;
- document browser/OS and same-origin limitations;
- keep `Passport-Hardened`, hardware-backed, passkey-held, and attested-key claims prohibited.

**Selected:** A

## 6. RHP-P2-D5 — Backup, recovery, and device scope (`OWNER-RHP-08`)

Selected option:

- [x] **A. Disposable single-device authority; no key backup/restore or device addition.** The preview stores one local non-extractable authority. Clearing site data, losing the device, or losing every key ends access. No private-key export, same-authority restore, device addition/removal, or recovery claim is enabled. Enrollment requires explicit acknowledgement; exit abandons/deletes the authority.
- [ ] **B. Encrypted private-key backup.** Define an exportable key architecture, passphrase/derivation policy, authenticated package, retention, restore, compromise, and rehearsal process. This materially changes the key-protection model and requires independent review before implementation.
- [ ] **C. Authorized second-device continuity.** Add a protocol-correct device authorization and Mode 2 recipient workflow while at least one authorized device remains available. This does not recover the authority after all authorized keys are lost and requires authenticated device transfer, rotation/removal, rollback, and rehearsal.

**Rationale:** A is aligned with RHP-DR-001 D5-A's non-durable, disposable authority and minimizes the highest-risk key-export/recovery code in the first preview. It produces the clearest loss consequence and the smallest mobile-first implementation.

**Required conditions:**

- remove or disable backup/restore/device-add success controls in real mode;
- keep research/demo screens visibly synthetic where retained;
- state the loss consequence before authority creation and before destructive deletion;
- never suggest that browser sync, OS backup, biometrics, old ciphertext, or a vendor account restores the same authority;
- retain routine rotation/one-method compromise only if another authorized local method safely exists; otherwise treat loss as terminal for the preview.

**Selected:** A

## 7. Approved combination and limits

```text
D1 A — project-preview pinned resources
D2 A — empty trust with warned identity-unknown requests
D3 A — evidence-first Windows Chromium + Android Chromium
D4 A — non-extractable keys + mandatory WebAuthn UV
D5 A — disposable single-device authority; no key backup/recovery
```

This combination is internally compatible: it supports a meaningful holder self-assertion and signed-presentation preview while eliminating issuers, BVS, public resolvers, remote delivery, private-key export, and false recovery claims. It still requires physical evidence, resource review, privacy/legal/operational approvals, independent review, and a final signed go/no-go.

This record does not close `OWNER-RHP-09`, `OWNER-RHP-10`, `OWNER-RHP-11`, `OWNER-RHP-12`, `OWNER-RHP-13`, or `OWNER-RHP-16`; each remains a separate required gate before public real-data deployment.

## 8. Approval metadata

| Field | Value |
|---|---|
| Approver | Aaron A Damiano |
| Role | Project Owner |
| Approval date | 2026-07-20 |
| Review/expiry date | 2026-10-20 at 00:00:00 UTC |
| Selected option summary | D1-A / D2-A / D3-A / D4-A / D5-A |
| Parent decision | RHP-DR-001 |
| Approval evidence | External signed tag message binds the decision commit and exact file SHA-256 |
| Signature mechanism | GPG-signed Git tag |
| Signer fingerprint | `2B7BA5C378749418B1D051D9C01347EA45970647` |
| Threat-model re-review required before deployment | Yes — authentication of this policy triggers re-review under `docs/rhp/threat-and-privacy-model.md` |

This record becomes effective only after mechanical completeness checks, an exact committed-byte SHA-256, and external verification of an authenticated signature over that commit. Until then, all safe defaults in Section 0 remain in force. Authentication of this record approves the selected target architecture; it does not close any implementation, independent-review, physical-device, operational, or final-release gate identified above.
