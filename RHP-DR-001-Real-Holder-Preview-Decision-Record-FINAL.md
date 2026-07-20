# Real Holder Preview — Owner Decision Record

## Risk-authority record for closing OWNER-RHP-01

**Record ID:** RHP-DR-001
**Revision:** Final Signing Copy 1
**Status:** FINAL SIGNING COPY — NOT EFFECTIVE until every required selection and field is completed and the external approval evidence in §8 verifies.
**Prepared:** 2026-07-20
**Approver:** Aaron A Damiano
**Approval date:** 2026-07-20
**Mandatory review date:** 2026-10-20
**Closes when effective under §8:** `OWNER-RHP-01`

**Supplies required inputs to:** `record-rhp-release-contract`, `implement-runtime-mode-boundary`, `implement-production-runtime-config`, `implement-holder-onboarding`, `implement-real-credential-acquisition`, `implement-rhp-deployment`, `record-rhp-exit-review`

> Effective approval of this record does not by itself authorize deployment or exit. Other owner blockers — including `OWNER-RHP-04`, `OWNER-RHP-05`, `OWNER-RHP-08`, `OWNER-RHP-09`, `OWNER-RHP-10`, and `OWNER-RHP-14` — continue to gate the tasks above independently.

**Governing design control:** `HIRI-Passport-v2_0_0-Compatibility-and-Normative-Decisions.md`

**Specification state at approval:**

| Document | Version at approval |
|----------|--------------------|
| HIRI Digital Passport Extension | v2.0.0 **Working Draft 2** |
| HIRI Passport UX and Architecture Specification | v2.0.0 Working Draft 1 |
| HIRI Bootstrap Verification Profile | v3.0.0 Working Draft 1 |

**Upstream pin:** HIRI Protocol v3.1.1 + Privacy & Confidentiality Extension v1.4.1 at commit `009c145c9740188fc7a03b19c8ac2079bfe61cdb`

### Finalization note — Draft 2 → Final Signing Copy 1

Draft 1 and Draft 2 are preserved as historical review artifacts and are non-authoritative. This file is the canonical decision text to complete and approve. Final consistency corrections identify the option combination supported by the current static GitHub Pages plan; require a revised hosting and admission design for restricted audiences; bind durable authorities to a migration plan; align emergency notice with the selected audience; defer the preview-page path to `OWNER-RHP-02`; and define non-self-referential external approval evidence over the exact committed bytes.

---

## 0. How to use this record

Select exactly one option per decision unless the decision states otherwise. Strike or delete unselected options before approval — an ambiguous record is not evidence.

Options marked **⚠ REQUIRES PLAN REVISION** are not selectable within the current Real Holder Preview plan, which is holder-first and contains no live verifier, publication, issuer, or BVS service. Selecting one obliges a plan revision; the affected feature and real-data deployment remain blocked until the revised plan identifies every additional owner gate and those gates close. Unaffected fail-closed foundation work may continue.

The statements approved in §4 and §5 are the **verbatim authoritative source** for all **security, privacy, identity, protocol, and capability** claims — on the owner-approved preview information site, in the application, and in any preview communication. Ordinary functional, navigational, accessibility, support, and operational text is not governed by this record. Any security, privacy, identity, protocol, or capability claim not traceable to §4 or §5 is unapproved claim surface and must be removed. Translations or accessibility adaptations require a separately approved mapping back to the unchanged meaning of the source statement.

Until this record becomes effective under §8, the safe default remains in force: **Synthetic Demo only, no real keys, no real credentials.**

---

## 1. Scope of authority

This record exercises product-owner risk authority over release identity, participant exposure, and permitted public claims. It does not modify the specification, resolve any open blocking issue, grant conformance status, or substitute for any other owner gate.

Making this record effective accepts responsibility for exposing participants admitted under RHP-D2 to an implementation of an unfinished protocol whose blocking issues remain open.

---

## 2. Specification state acknowledgement

The approver confirms having read this table before approval. Each row states a property a Real Holder participant is exposed to, and distinguishes protocol limitations from deployment decisions.

| Item | Accurate consequence for a real holder |
|------|----------------------------------------|
| `OPEN-RECOVERY-01`, `DEF-14` | **If every authorized signing and recovery method is lost or unusable, Passport-Core cannot establish continuity for the same holder authority.** The specification permits independently usable backup or recovery keys; the unresolved case is loss of all of them. Whether this preview offers any backup method is decided separately under `OWNER-RHP-08`. |
| `OPEN-SD-01` | **No selective disclosure.** The only available credential profile discloses complete claim content. Field-level requests express what was asked and consented to; they do not reduce what a verifier receives (`REQ-PRESENT-010`). |
| `OPEN-HEAD-01` | **Passport-Core does not define interoperable discovery of an issuer-authoritative current head.** A deployment may report a status only when a source explicitly configured as issuer-authoritative is fresh and every required signature, chain, lifecycle, freshness, and relationship check succeeds. Otherwise status is `unknown` (`REQ-STATUS-004`). Signed current-head evidence can establish `revoked`, `suspended`, `expired`, `superseded`, or `active`. Whether this preview configures any authoritative source is a deployment decision under `OWNER-RHP-04`. |
| `OPEN-TRANSPORT-01` | **No transport is prescribed and no transport confidentiality is provided.** Passport-Core does define signed verifier authentication, request nonce and replay binding, presentation binding, verifier replay records, and Presentation Packages as transport containers. What remains open is an authenticated, replay-resistant, potentially confidential transport for future selective-disclosure material. |
| `OPEN-CONTEXT-01` | Context payloads and hash pins are unpublished. Placeholder identifiers are not deployable. |
| `BASE-03`, `REQ-AUTH-002` | The holder authority is **immutable**, derived from the genesis key, and permanent for the life of the authority. Routine rotation changes the active key, never the authority. |
| `REQ-CREDENTIAL-008` | Public credential content is **permanently linkable** to the holder authority and is persistently copyable by any recipient. |
| `REQ-PRESENT-016` | Presentations are **linkable** across colluding verifiers. Fresh message identifiers do not make the holder anonymous. |

**Approver initials confirming §2 has been read:** AD

---

## 3. Decisions

### RHP-D1 — Release name

- [X] **A.** `Real Holder Preview` *(as proposed)*

**Constraint:** The name MUST NOT contain `beta`, `stable`, `production`, `GA`, `1.0`, `secure`, or `certified`. The name MUST convey both that real cryptographic key material is in use and that the release is incomplete.

**Selected:** A  **Rationale:** simple

---

### RHP-D2 — Audience

Governs who may generate **real holder authority and key material**.

- [X] **A.** Public — anyone may generate a real holder authority *(consistent with the current static GitHub Pages plan)*

**Guidance:** Because there is no continuity after total key loss and no retraction of delivered credential content, the operator should retain the ability to contact every participant later — including to instruct them to abandon an authority. Options A and B do not reliably provide this.

**Selected:** A
**Participant cap (required for B, C, D):** not applicable (audience A)
**Individual contact method retained for every participant (required for C and D; enter `not applicable` otherwise):** not applicable
**Emergency public-notice channel (required for A or B; enter `not applicable` otherwise):** https://hiri-protocol.org/notices/

> **Dependency:** Collecting and retaining participant contact information requires separate privacy, retention, and deletion approval under `OWNER-RHP-09` and `OWNER-RHP-10`. This record does not authorize that collection.

**Rationale:** Public is the whole point of the project
---

### RHP-D3 — Workspace scope

- [X] **A.** Holder-only *(as proposed; consistent with the current plan)*

**Selected:** A  **Rationale:** consistent with plan

---

### RHP-D4 — Publication constraint

Governs whether preview artifacts reach a public resolver or storage network.

- [X] **A.** **No publication to a public resolver.** Portfolios remain local (`REQ-PORTFOLIO-018`). Complete credential artifacts may be delivered directly in Presentation Packages (`§13.1`) and remain persistently copyable by recipients.

**Note applicable to all options:** no option prevents a recipient from retaining a copy of a credential artifact delivered to them. Option A limits resolver-side persistence, not recipient-side persistence.

**Selected:** A  **Rationale:** We are still in preview

---

### RHP-D5 — Authority durability

- [X] **A.** **Non-durable.** Preview authorities are declared disposable at enrollment. Participants are instructed not to accumulate anything of value. All preview authorities are abandoned and locally deleted at exit.

**Selected:** A  **Rationale:** Still in preview

---

### RHP-D6 — Real credential issuance

- [X] **A.** No issuers. Self-assertions only. *(Consistent with the current plan.)*

**Constraint applicable to all options:** no credential issued during the preview may carry employment, health, financial, legal, governmental, or biometric claims.

**Selected:** A  **Rationale:** Still in preview simple

---

### 3.1 Current-plan compatibility

The current `real-holder-preview-plan.js` and static GitHub Pages deployment can implement only the following combination without revision: RHP-D2 option A, RHP-D3 option A, RHP-D4 option A, RHP-D5 option A with §6.2 option A, and RHP-D6 option A. This statement identifies build compatibility; it does not recommend or approve that risk posture.

Selecting any option marked **⚠ REQUIRES PLAN REVISION** keeps the safe default in force for the affected capability and for real-data deployment until the plan contains the required service or workflow, its additional owner gates are closed, and release evidence covers the revised design. A label, invitation secret, participant list, or membership rule embedded in a publicly delivered static bundle is not an access-control mechanism.

---

## 4. Approved unsupported-capability statements

Approved verbatim for participant-facing use. Edit before approval if the wording is unacceptable; do not paraphrase after the record becomes effective.

### 4.1 Selective disclosure — NOT SUPPORTED

> When you share a credential, the verifier receives its complete contents. Choosing individual fields in a request affects what the verifier asked for and what you agreed to share — it does not reduce what they receive. Selective disclosure is not available in this preview.

### 4.2 Confirmed-current status — NOT AVAILABLE IN THIS PREVIEW

> This preview does not check whether a credential is currently valid. Credential status will show as "unknown." The protocol can report a real status — active, suspended, revoked, expired, or superseded — but only when a verifier is configured with a source it trusts as authoritative for that credential, and every required check succeeds. This preview configures no such source. Do not rely on it to determine whether a credential has been revoked.

*(This is the fail-closed default and does not close `OWNER-RHP-04`. If a later decision under `OWNER-RHP-04` configures an authoritative source, this statement MUST be re-approved before that configuration is deployed.)*

### 4.3 Recovery after total key loss — NOT SUPPORTED

> If every authorized signing and recovery method for your passport is lost or unusable, there is no way to restore control of the same passport identity. The operator provides no account reset. A backup you control preserves your access only if it contains or can reach an independently usable key, under whatever backup policy is separately approved for this preview.

### 4.4 Proximity transport — NOT SUPPORTED

> Tap-to-share and nearby-device sharing are not available. Requests and presentations carry signed replay-binding values, and Passport-Core requires holders and verifiers to retain and reject defined replay tuples. That protection depends on each implementation maintaining the required state. The protocol does not prescribe how messages travel between devices and provides no transport confidentiality. No NFC, Bluetooth, or other proximity transport profile is implemented or security reviewed.

**Placement (all four required):** enrollment flow before key generation · owner-approved preview information page at https://hiri-protocol.org/preview/ · in-application limitations screen reachable from primary navigation.

**Approver initials for §4:** AD

---

## 5. Claims register

Applies to security, privacy, identity, protocol, and capability claims on the website, application copy, documentation, README files, social posts, conference material, and grant or investor material. A permitted evidence claim may be made only about a specific artifact or operation after every required check succeeds. This register does not authorize claiming that the current implementation already provides a capability before its implementation and release evidence pass.

### 5.1 Permitted claims

| May claim | Basis |
|-----------|-------|
| Cryptographic **integrity** of a specific artifact after all applicable integrity checks succeed | `REQ-BOUNDARY-001` |
| **Provenance** — which declared authority produced a successfully verified signature | `REQ-BOUNDARY-001` |
| **Content binding** between a verified manifest and its exact content | `REQ-BOUNDARY-001` |
| **Key state** when authenticated lifecycle evidence is available; otherwise `unknown` | `REQ-AUTH-004` |
| **Authorized-method control** — a presentation proves control of a method authorized for the declared holder authority, subject to key-state evidence | `REQ-PRESENT-002` |
| **Signed verifier-authority authentication** and protocol **replay controls**, conditional on implementations retaining the required replay state | `REQ-REQUEST-013`–`015`, `REQ-SEC-005`–`006` |
| **Evidence separation** — cryptography, identity, status, and policy reported separately | `REQ-VERIFY-P-003` |
| That the **application requires an explicit holder action** before presenting | Application behavior. A signature proves key control, not that a human consent ceremony occurred. |
| Publicly readable Working Draft | *(A licence or open-standard claim may be added only after an applicable licence and governance basis exist.)* |

### 5.2 Prohibited claims

| MUST NOT claim | Basis |
|----------------|-------|
| That a valid signature makes a claim **true**, **legally effective**, or **authoritative** | `DEC-BOUNDARY-01`, `REQ-BOUNDARY-001` |
| That a signature proves a **human consented** | Signature proves key control only |
| **"Verified identity"**, **"identity-proofed"**, **"KYC"** | `REQ-BOUNDARY-001` |
| **"Secure"** as an unqualified product property | Open blockers; no completed security review |
| **Conformance** to Passport-Interoperable | `REQ-CONF-004` |
| **Conformance** to Passport-Hardened | `REQ-CONF-005` |
| Verifier coverage, if RHP-D3 selected holder-only | `REQ-CONF-003` |
| **"Anonymous"**, **"unlinkable"**, **"private by default"** for presentations | `REQ-PRESENT-016` |
| **"Selective disclosure"**, **"share only what you choose"**, **"minimal disclosure"** for credential fields | `REQ-PRESENT-010`, `OPEN-SD-01` |
| **"Revocation checking"**, **"real-time status"**, **"instant verification"** as product properties of this preview | `OPEN-HEAD-01`; permitted only for a deployment with a configured issuer-authoritative source and re-approved §4.2 wording |
| **"Recoverable"**, **"never lose access"**, **"account reset"** | `OPEN-RECOVERY-01`, `DEF-14`; backup policy pending `OWNER-RHP-08` |
| That a verifier's displayed name or domain is **verified organizational identity** | `REQ-REQUEST-002`, `REQ-SEC-015` |
| That domain or DNSSEC control proves **authorization to issue** a credential type | `DEC-TRUST-01`, `REQ-VERIFY-I-001` |
| Any **guardian**, **social**, or **biometric recovery** capability | `DEF-07`, `DEF-14` |
| **Proximity**, **NFC**, or **Bluetooth** presentation capability | `OPEN-TRANSPORT-01` |
| Any **transparency log** or **non-revocation proof** | `DEF-03`, `REQ-STATUS-015` |
| **Post-quantum**, **P-256**, **BBS+**, **OID4VP**, or **DIDComm** support | `DEF-01`, `DEF-02`, `DEF-11`, `DEF-12`, `DEF-13` |
| A **licence** for the specification or implementation | No licence present in the repository at approval |

### 5.3 Required disclosure on any page describing the preview

> This is a preview of unfinished software built on an unfinished protocol specification. Blocking design issues remain open. Real cryptographic key material is generated and held by you. If every authorized signing and recovery method is lost or unusable, Passport-Core cannot restore control of the same holder authority.

**Approver initials for §5:** AD

---

## 6. Exit criteria and participant disposition

### 6.1 Exit trigger — select at least one

- [X] Mandatory review date reached without successor record *(see §7)*

### 6.2 Participant disposition at exit

- [X] **A.** All preview authorities **abandoned and locally deleted**. Participants instructed to discard key material. No migration path offered. *(Consistent with RHP-D5 option A.)*

> "Abandoned and locally deleted" is used deliberately. Neither option records an authenticated lifecycle transition for the authority. Nothing in this record represents preview authorities as retired, revoked, or compromised in any KeyDocument unless such a transition is actually published.

**Consistency rule:** RHP-D5 option A requires §6.2 option A. RHP-D5 option B requires §6.2 option B and a concrete migration-plan reference before deployment.

### 6.3 Emergency termination

The owner may terminate the preview immediately on discovery of a key-handling defect, a claim-accuracy failure, or an upstream specification change invalidating the pinned baseline. Within 10 hours, termination notice reaches participants through the individual contact method recorded in RHP-D2 for option C or D, or through the recorded emergency public-notice channel for option A or B.

---

## 7. Review, expiry, and enforcement

This record expires at **00:00:00 UTC at the start of the mandatory review date** in the header. On expiry the authorization lapses and **the operator is obligated to disable real-data mode**, reverting to Synthetic Demo, until a successor record becomes effective under its approval rules.

Expiry is not self-executing. Select exactly one of the following before deployment:

- [X] No machine enforcement exists. The review date is therefore recorded as an exit trigger in §6.1, and the operator's obligation to disable real-data mode stands as a manual control with a named responsible person: Aaron Damiano

**Manual control procedure:** `docs/rhp/manual-expiry-and-emergency-control.md`

No expiry mechanism can remotely erase an installed offline PWA, locally held keys, previously delivered artifacts, or recipient copies. Expiry controls stop authorization, new deployment, and any network-dependent preview operations within the operator's control. Participant instructions and emergency notices remain required. A build-time date checked against a user-controlled device clock MUST NOT be represented as tamper-resistant revocation.

An effective record is superseded, not amended. Any change to audience, scope, publication constraint, durability, issuance, or claims register requires a new record with a new ID.

---

## 8. Approval metadata and external evidence binding

By approving this record through the external evidence process below, the approver confirms: they hold authority to accept this risk on behalf of the organization; they have read §2 in full; the statements in §4 and §5 are approved as the authoritative source for the claim classes named in §0; and no required decision or metadata field in this record remains blank.

| Field | Value |
|-------|-------|
| Approver name | Aaron A Damiano |
| Role | Project Owner |
| Approved option summary | D1: A · D2: A · D3: A · D4: A · D5: A · D6: A |
| No required field remains blank *(initials)* | AD |
| Approval date | 2026-07-20 |
| Review date | 2026-10-20 |
| Review-date enforcement recorded in §7 *(initials)* | AD |
| Specification state and upstream pin re-verified at approval *(initials)* | AD |

**External binding procedure:**

1. The approval date in this table MUST equal the approval date in the header.
2. The review date in this table MUST equal the mandatory review date in the header.
3. The review date MUST be later than the approval date, and the specification versions and upstream pin recorded above MUST be re-verified on the approval date.
4. Complete this file, remove or clearly strike every unselected option, and commit the completed final copy without embedding its own digest, containing-commit SHA, or signature value.
5. After that commit exists, compute the SHA-256 digest of the exact committed file bytes (for example, the bytes emitted by `git show <decision-commit>:<canonical-path>`) and create separate approval evidence containing the record ID, revision, canonical path, full decision commit SHA, file digest, approver, role, option summary, approval date, review date, signature mechanism, and signer identity or public-key fingerprint. Do not require that signed payload to contain its own signature artifact identifier.
6. Bind the approval evidence using one of these verifiable forms: a signed annotated Git tag on the decision commit whose annotation contains the approval fields; a detached GPG or S/MIME signature over a canonical approval-evidence file; or a controlled e-signature envelope that contains or cryptographically identifies the exact decision file and commit. The signer identity MUST trace to the named approver or to a documented delegated signing authority.
7. Record the resulting tag name, detached-signature path, or e-signature envelope ID separately as verification metadata. That external reference is not part of the signed payload and therefore is not self-referential. Approval evidence MAY be stored as `RHP-DR-001-Approval-Evidence.json`; secrets and private signing material MUST NOT be committed.
8. Approval applies only to the exact file bytes at the referenced decision commit and becomes effective only when the external evidence verifies. A modified or mismatched copy, an unverified or missing signature artifact, or an expired review date provides no effective authorization and returns the safe default to force; the immutable approved commit remains the record of what was authorized before expiry.

---

## Appendix A — Traceability

| Block requirement | Satisfied by |
|-------------------|--------------|
| 1. Release name confirmed or replaced | RHP-D1 |
| 2. Audience defined | RHP-D2 |
| 3. Holder-only scope confirmed or verifier added | RHP-D3 |
| 4. Unsupported-capability language approved | §4.1–4.4 |
| 5. Permitted and prohibited claims approved | §5.1–5.3 |
| Dated record naming approver | §8 |
| Audience recorded | RHP-D2 |
| Scope recorded | RHP-D3, RHP-D6 |
| Prohibited claims recorded | §5.2 |
| Review date recorded | Header, §7, §8 |

Recorded beyond the block's minimum: RHP-D4 (publication constraint), RHP-D5 (authority durability), RHP-D6 (credential issuance), §6 (exit criteria and disposition), §7 (expiry enforcement), §8 (evidence binding).

## Appendix B — Where approved statements must appear

| Statement | Enrollment | Owner-approved preview page | In-app | Docs |
|-----------|:----------:|:---------------:|:------:|:----:|
| §4.1 selective disclosure | required | required | required | required |
| §4.2 confirmed status | required | required | required | required |
| §4.3 total-loss recovery | required, before key generation | required | required | required |
| §4.4 proximity transport | — | required | required | required |
| §5.3 preview disclosure | required | required | required | required |

## Appendix C — Downstream task notes

| Task | Inputs from this record | Other gates still applying |
|------|------------------------|----------------------------|
| `record-rhp-release-contract` | RHP-D1, D2, D3, §6 | — |
| `implement-runtime-mode-boundary` | Safe default and release identity from RHP-D1 | — |
| `implement-production-runtime-config` | RHP-D4 and the no-authoritative-status-source default in §4.2 | `OWNER-RHP-03`, `OWNER-RHP-04` |
| `implement-holder-onboarding` | RHP-D2, RHP-D5, §4, and §5.3 | `OWNER-RHP-06`, `OWNER-RHP-07`, `OWNER-RHP-08`, `OWNER-RHP-09`, `OWNER-RHP-10` |
| `implement-real-credential-acquisition` | RHP-D6 | `OWNER-RHP-03`, `OWNER-RHP-04`, `OWNER-RHP-05`, and `OWNER-RHP-14` where applicable |
| `implement-rhp-deployment` | §4, §5, Appendix B, and §7 enforcement | `OWNER-RHP-02`, `OWNER-RHP-09`, `OWNER-RHP-10`, `OWNER-RHP-11`, `OWNER-RHP-12`, `OWNER-RHP-13` |
| `record-rhp-exit-review` | §6.1, §6.2, §7, and verified external approval evidence | All release-required owner gates, including `OWNER-RHP-16` |
