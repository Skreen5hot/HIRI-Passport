# HIRI Passport UX and Application Architecture

## Compatibility-corrected companion specification

**Version:** 2.0.0  
**Status:** Working Draft 1  
**Date:** 2026-07-20  
**Core dependency:** HIRI Digital Passport Extension v2.0.0 Working Draft 2  
**Replaces:** HIRI Passport UX & Architecture Specification v1.5.0 as the active design draft

---

## Document Status

This document defines the user-experience and application-architecture contract for HIRI Passport v2.0.0. It is a companion to the Core protocol and does not redefine HIRI artifacts, cryptographic constructions, message schemas, verification transitions, or conformance profiles.

The v1.5.0 document remains a historical design input. This revision retains its strongest product principles: explicit consent, plain-language purpose, honest uncertainty, visible provenance, accessible degraded states, local privacy history, and technically inspectable evidence. It replaces the incompatible slot, tier, rotation, attestation, revocation-log, and algorithm assumptions described in Section 18.

This Working Draft is not a conformance target. Placeholder names and examples are not production identifiers or test vectors.

---

## 1. Conventions and Precedence

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative as described by BCP 14 when shown in uppercase.

Requirements have stable identifiers of the form `REQ-UX-<AREA>-<NUMBER>`.

[REQ-UX-DOC-001] If this document conflicts with the HIRI Digital Passport Extension v2.0.0 or its pinned upstream HIRI specifications, the protocol specification **MUST** control protocol behavior and this document **MUST** be corrected.

[REQ-UX-DOC-002] An application **MUST NOT** claim that an interface convention changes the signed meaning, canonical bytes, authority, status, provenance, or verification result of a Passport artifact or message.

[REQ-UX-DOC-003] Product copy **MUST** distinguish normative protocol behavior from deployment policy and from advisory user guidance.

---

## 2. Scope

### 2.1 In scope

This document covers:

- holder, verifier, issuer, and BVS-facing application behavior;
- consent, acquisition, presentation, verification, rotation, backup, and export flows;
- application boundaries around the pure protocol kernel;
- display of cryptographic, status, identity, provenance, and policy evidence;
- accessibility, privacy, logging, and failure-state requirements;
- conceptual CLI and SDK contracts.

### 2.2 Out of scope

This document does not define:

- HIRI artifact or signature formats;
- selective-disclosure cryptography;
- proximity transports such as NFC or Bluetooth;
- authoritative current-head discovery;
- recovery after loss of every authorized key;
- a credential marketplace or universal issuer directory;
- legal identity, regulatory acceptance, or relying-party policy.

[REQ-UX-SCOPE-001] An application **MUST NOT** present an out-of-scope or open Core capability as available merely because a screen, mock adapter, or transport can simulate it.

### 2.3 Practical Core envelope

Passport-Core presents complete public Credential Claim content. It does not provide claim-level confidentiality. Public credentials are linkable to the holder's stable authority. Sensitive employment, health, government identity, private education, and similar claims are outside the practical Core envelope unless the holder knowingly authorizes disclosure of the complete claim.

[REQ-UX-SCOPE-002] Before public credential issuance or presentation, holder software **MUST** explain that the complete Credential Claim becomes available to the recipient and that the stable holder authority permits correlation.

[REQ-UX-SCOPE-003] An interface **MUST NOT** label public-mode presentation as selective disclosure, minimum disclosure, anonymous, or unlinkable.

---

## 3. Product Principles

### 3.1 No account illusion

A Passport authority is not a vendor account, and a portfolio is not a server-side account record.

[REQ-UX-PRINCIPLE-001] Holder onboarding **MUST NOT** require a Passport service account unless the deployment separately needs one and clearly explains that it is not the Passport authority.

[REQ-UX-PRINCIPLE-002] A vendor account identifier **MUST NOT** replace the holder authority in signed protocol operations.

### 3.2 Honest evidence

[REQ-UX-PRINCIPLE-003] The primary result view **MUST** expose cryptographic validity, credential status, issuer identity, provenance, and relying-party policy as separate dimensions.

[REQ-UX-PRINCIPLE-004] An application **MUST NOT** compress those dimensions into a numbered tier, score, color, badge, or label that can be read as an overall trust result.

[REQ-UX-PRINCIPLE-005] `unknown` **MUST** be presented as missing, stale, unsupported, or unauthenticated evidence; it **MUST NOT** be presented as valid, invalid, or merely a warning that silently passes.

### 3.3 Consent with purpose

[REQ-UX-PRINCIPLE-006] A consent decision **MUST** show the requesting verifier, available identity evidence, every requested item and field, each purpose, required or optional status, provenance when known, and the disclosure mode.

[REQ-UX-PRINCIPLE-007] Consent text supplied by another party **MUST** be rendered as untrusted plain text and **MUST NOT** execute markup, links, scripts, or bidirectional-text control effects.

[REQ-UX-PRINCIPLE-008] Declining an entire request **MUST** be at least as prominent and reachable as accepting it.

### 3.4 Technical inspectability

[REQ-UX-PRINCIPLE-009] A result view **MUST** offer an accessible evidence detail view containing relevant authorities, verification methods, manifest and content hashes, schema and schema hash, timestamps, status evidence provenance, policy identifier and version, and structured errors.

[REQ-UX-PRINCIPLE-010] A detail view **MUST NOT** claim a portfolio-membership proof, Merkle inclusion proof, public slot proof, or revocation-log proof unless a later normative profile actually defines and verifies that evidence.

---

## 4. Shared Mental Model and Vocabulary

### 4.1 User-facing objects

| Product term | Protocol meaning |
|--------------|------------------|
| Passport | The holder-controlled experience around a stable HIRI authority and private portfolio. |
| Portfolio | Holder-private records stored as Mode 2 encrypted content or equivalent protected local state. |
| Credential | A complete issuer-signed Credential Claim and its HIRI Resolution Manifest. |
| Request | A verifier-signed Disclosure Request. |
| Presentation | A holder-signed Passport Presentation, normally delivered in a Presentation Package. |
| Self-provided information | A persistent or ephemeral self-assertion, never independent issuer evidence. |
| Verification result | A structured report containing distinct evidence and policy results. |

[REQ-UX-VOCAB-001] Product terminology **MUST NOT** describe a portfolio record as public evidence of credential ownership or completeness.

[REQ-UX-VOCAB-002] A UI **MAY** call the experience a “passport,” but technical details **MUST** expose the stable holder authority separately from the portfolio URI.

### 4.2 Provenance vocabulary

Applications use the Core vocabulary:

- `direct-issuer`;
- `bvs`;
- `self-asserted-persistent`;
- `self-asserted-ephemeral`.

[REQ-UX-VOCAB-003] Every displayed claim **MUST** show its verified provenance category or state that provenance is unknown.

[REQ-UX-VOCAB-004] The `bvs` label **MUST** identify the BVS as the issuer and the upstream provider or registry as evidence consulted by that BVS.

[REQ-UX-VOCAB-005] Persistent and ephemeral self-assertions **MUST** remain visually and semantically distinct from issuer-signed evidence.

### 4.3 Evidence dimensions

| Dimension | Typical values | Question answered |
|-----------|----------------|-------------------|
| Protocol/cryptography | `valid`, `invalid`, `unknown`, `not-applicable` | Did the signed structures and bindings verify? |
| Credential status | `active`, `suspended`, `revoked`, `superseded`, `unknown` | What authenticated current-state evidence is available? |
| Issuer identity | `valid`, `invalid`, `unknown`, `not-applicable` | What real-world identity anchor supports the issuer authority? |
| Provenance | Core provenance vocabulary | Who asserted the claim and how? |
| Policy | `accepted`, `rejected`, `not-evaluated` | What did this relying party decide under a named policy? |

[REQ-UX-VOCAB-006] Color and iconography **MUST NOT** be the only means of distinguishing these dimensions or their states.

---

## 5. Application Architecture

### 5.1 Layer boundary

```text
UI and workflow orchestration
          |
          v
Application services: consent, local records, policy, adapters, transport
          |
          v
Pure Passport/HIRI kernel: parse, canonicalize, sign, verify, report
          ^
          |
Injected inputs: keys, time, randomness, artifacts, resolver provenance
```

[REQ-UX-ARCH-001] The protocol kernel **MUST** be deterministic for identical explicit inputs and **MUST NOT** perform network, filesystem, UI, clock, random-number, biometric, analytics, or policy-discovery operations internally.

[REQ-UX-ARCH-002] Time, cryptographic randomness, keys, resolver candidates, trust configuration, schemas, contexts, and policy **MUST** enter the kernel as explicit inputs or adapter results with provenance.

[REQ-UX-ARCH-003] The kernel **MUST** return structured evidence and errors; it **MUST NOT** return only a Boolean or an aggregate trust level.

[REQ-UX-ARCH-004] Passport-Core signing **MUST** use Ed25519 and the exact Core signature targets. A P-256, RSA, ML-DSA, platform attestation, or passkey adapter **MUST NOT** be labeled a Passport-Core signing implementation.

### 5.2 Ports and adapters

Applications may provide adapters for:

- protected Ed25519 and X25519 key operations;
- Mode 2 encryption/decryption;
- protected local storage and backup;
- artifact and schema resolution;
- configured issuer-authoritative current-head sources;
- identity anchors and relying-party policy;
- presentation transport;
- user authentication and device integrity signals.

[REQ-UX-ARCH-005] Each resolver result **MUST** preserve source, retrieval time, transport-authentication state, and any deployment assertion that the source is issuer-authoritative.

[REQ-UX-ARCH-006] Device biometrics, passcodes, or platform attestation **MAY** gate local key use, but **MUST NOT** be reported as issuer signature, holder authority, organizational identity, or credential status evidence.

[REQ-UX-ARCH-007] Adapters **MUST NOT** rewrite signed timestamps, normalize signed strings, replace hashes, or convert an unsupported result to success.

### 5.3 Local records

[REQ-UX-ARCH-008] Stable local record identifiers **MUST NOT** appear in Disclosure Requests, Passport Presentations, Presentation Packages, verifier logs, telemetry, or issuer-visible artifacts.

[REQ-UX-ARCH-009] Local tags, notes, sorting, favorites, and credential counts **MAY** exist in protected holder state, but **MUST NOT** be represented as signed issuer data.

[REQ-UX-ARCH-010] Presentation history **MUST** default to holder-controlled local storage and **MUST NOT** cause publication of a new public portfolio version solely to record the event.

---

## 6. Holder Onboarding

### 6.1 Authority creation

Recommended sequence:

1. explain holder control and the stable-authority consequence;
2. create the Ed25519 genesis authority using injected secure randomness;
3. configure protected local key storage;
4. create a private portfolio and optional backup recipients;
5. verify a recovery-capable backup that the selected deployment actually supports;
6. show the home state.

[REQ-UX-ONBOARD-001] Onboarding **MUST** explain that the holder authority is stable and that routine key rotation does not change it.

[REQ-UX-ONBOARD-002] Onboarding **MUST** explain that disclosure of the holder authority can correlate public credentials and presentations.

[REQ-UX-ONBOARD-003] The application **MUST NOT** encourage routine public sharing of the holder authority or portfolio URI as if it were a profile address.

[REQ-UX-ONBOARD-004] The application **MUST NOT** promise recovery from loss of all authorized signing and recovery keys while `OPEN-RECOVERY-01` remains unresolved.

[REQ-UX-ONBOARD-005] If no independently usable backup or recovery key is configured, the application **MUST** communicate the risk before presenting setup as complete.

### 6.2 Backup language

[REQ-UX-ONBOARD-006] Backup UX **MUST** identify which key classes or recipient devices can decrypt the backup and that removing a recipient from a later Mode 2 version cannot retract earlier ciphertext already obtained.

[REQ-UX-ONBOARD-007] Recipient-array length **MUST NOT** be described as an exact device count, and per-version fresh recipient identifiers **MUST NOT** be described as hiding array length or traffic timing.

---

## 7. Portfolio and Home Experience

[REQ-UX-HOME-001] The home experience **SHOULD** organize records by user intent and provenance rather than numeric assurance tiers.

[REQ-UX-HOME-002] Credential cards **MUST** distinguish the signed credential's own status statement from a status result based on a fresh configured issuer-authoritative current head.

[REQ-UX-HOME-003] When current-head evidence is unavailable or stale, the card **MUST** show status as unknown and **MAY** explain the missing evidence.

[REQ-UX-HOME-004] An expired `validUntil`, an issuer-declared revocation, an invalid signature, and unknown status **MUST** have distinguishable language and accessible semantics.

[REQ-UX-HOME-005] Local record counts **MAY** be shown to the holder, but a presentation preview **MUST NOT** imply that those counts or undisclosed records are transmitted.

[REQ-UX-HOME-006] A credential detail view **MUST** identify whether content is public and whether presenting it necessarily transfers the complete Credential Claim.

---

## 8. Credential Acquisition

### 8.1 Direct issuer credential

[REQ-UX-ACQUIRE-001] Before adding a direct issuer credential, holder software **MUST** validate the HIRI manifest, content hash and canonicalization, issuer authority and method, Credential Claim schema and schema hash, subject-holder binding, issuance time, and available status evidence.

[REQ-UX-ACQUIRE-002] “Add to Passport” **MUST** mean creating or updating a private local portfolio record; it **MUST NOT** imply rewriting the issuer credential or publishing proof of portfolio membership.

[REQ-UX-ACQUIRE-003] If the credential subject does not equal the holder authority, the application **MUST** reject acquisition as a holder-bound credential.

[REQ-UX-ACQUIRE-004] Public-credential issuance **MUST** obtain explicit authorization after showing the complete content and stable-authority correlation consequence.

### 8.2 BVS credential

[REQ-UX-ACQUIRE-005] A BVS acquisition flow **MUST** identify the BVS as the credential issuer, the source provider or registry as evidence, the verification method performed, and the evidence-profile and adapter versions.

[REQ-UX-ACQUIRE-006] Successful provider authentication **MUST NOT** be displayed as proof that the provider itself issued the resulting HIRI credential.

[REQ-UX-ACQUIRE-007] A BVS credential from an unconfigured BVS **MUST** remain visible when cryptographically valid and **MUST** be labeled policy-untrusted or unknown; it **MUST NOT** be silently discarded.

### 8.3 Self-provided information

[REQ-UX-ACQUIRE-008] A request-to-fill flow **SHOULD** default to an ephemeral self-assertion used only in the current presentation.

[REQ-UX-ACQUIRE-009] Saving a persistent self-assertion **MUST** require a separate action and explain that it is holder-signed, stored privately by default, and not independently issuer-verified.

[REQ-UX-ACQUIRE-010] A persistent self-assertion **MUST** use a holder-signed Resolution Manifest, not an Attestation Manifest.

---

## 9. Disclosure and Consent Flow

### 9.1 Validation before consent

[REQ-UX-CONSENT-001] Holder software **MUST** complete Core request parsing, fixed-value, identity-method, signature, freshness, replay, and structural checks before enabling acceptance.

[REQ-UX-CONSENT-002] An expired or not-yet-valid request **MUST** be blocked. The application **MUST NOT** permit a grace-period override and **SHOULD** offer to obtain a new request.

[REQ-UX-CONSENT-003] A verifier display name or domain from the signed request **MUST** be labeled as a signed hint unless separate identity-anchor evidence validates it.

### 9.2 Decision view

[REQ-UX-CONSENT-004] The decision view **MUST** group fields by request item and show the purpose and required flag for each field without hiding field-level differences behind a summary.

[REQ-UX-CONSENT-005] Optional items **MUST** be independently omittable when the application supports optional-item selection; required items **MUST NOT** be presented as optional.

[REQ-UX-CONSENT-006] When public mode exposes additional claim fields beyond the specifically requested paths, the decision view **MUST** enumerate or offer an immediately accessible preview of the complete content before signing.

[REQ-UX-CONSENT-007] The application **MUST NOT** display phantom records, padded counts, portfolio size, omitted item descriptions, or any suggestion that undisclosed records will be represented in the presentation.

### 9.3 Authorization and signing

[REQ-UX-CONSENT-008] The final authorization step **MUST** be bound to the exact validated request ID, nonce, verifier authority, selected items, disclosure modes, and presentation expiry.

[REQ-UX-CONSENT-009] Local user authentication **SHOULD** immediately precede holder signing when platform policy requires it; failure or cancellation **MUST** leave no signed presentation.

[REQ-UX-CONSENT-010] One acceptance **MUST** produce at most one presentation object. Delivery retry **MAY** retransmit the byte-identical signed object but **MUST NOT** create a changed object for the same accepted request tuple.

---

## 10. Verifier Experience

### 10.1 Progressive evidence

Verifier software may update the screen as independent evidence becomes available, but it cannot erase prior failures or replace uncertainty with policy.

[REQ-UX-VERIFY-001] The verifier view **MUST** preserve the Core Phase R, H, C, I, and P separation or an equally explicit mapping.

[REQ-UX-VERIFY-002] If a dependent check cannot run, the view **MUST** show it as unknown or not applicable and retain completed independent results.

[REQ-UX-VERIFY-003] A policy acceptance **MUST NOT** recolor or relabel an invalid cryptographic result as valid.

[REQ-UX-VERIFY-004] A valid issuer signature with unknown organizational identity **MUST** be displayed as those two facts, not as an invalid signature or a verified organization.

### 10.2 Status display

[REQ-UX-VERIFY-005] `active` **MUST** be shown only when the verification report used a fresh current head from a source configured as issuer-authoritative and the Core status checks succeeded.

[REQ-UX-VERIFY-006] Cached or offline evidence **MUST** show source and capture time and **MUST** follow the deployment freshness policy.

[REQ-UX-VERIFY-007] The application **MUST NOT** claim that the v1.5 custom revocation log or checkpoint establishes status.

### 10.3 Decision and export

[REQ-UX-VERIFY-008] A relying-party action **MUST** identify the policy ID and version and preserve the evidence report separately from the policy decision.

[REQ-UX-VERIFY-009] Exported reports **MUST** preserve result dimensions, artifact hashes, evidence provenance, verification parameters, and errors without adding undisclosed portfolio information.

[REQ-UX-VERIFY-010] A verifier **MUST NOT** retain claim values beyond the disclosed purpose or configured retention rule, and the product **MUST** expose that rule to the operator.

---

## 11. Key Lifecycle and Recovery UX

### 11.1 Routine rotation

[REQ-UX-KEY-001] Routine signing-key rotation **MUST** preserve the holder authority and portfolio URI.

[REQ-UX-KEY-002] Rotation UX **MUST NOT** instruct the holder to notify issuers of a new Passport address or reissue credentials solely because an authorized signing key changed.

[REQ-UX-KEY-003] Before completing rotation, the application **MUST** verify that the successor method is authorized by a valid lifecycle transition and that local protected storage contains the needed key material.

### 11.2 Compromise

[REQ-UX-KEY-004] Compromise UX **MUST** distinguish revoking one method, rotating to an already authorized method, and loss of all authorized signing and recovery methods.

[REQ-UX-KEY-005] The application **MUST NOT** claim that biometric similarity, possession of old ciphertext, social familiarity, or a vendor account alone preserves the same HIRI authority.

### 11.3 Unresolved total-loss recovery

[REQ-UX-KEY-006] Until `OPEN-RECOVERY-01` is resolved, total-loss recovery screens **MUST** state that authority continuity cannot be established by Passport-Core.

[REQ-UX-KEY-007] Guardian, social, institutional, or biometric recovery concepts **MAY** appear only as clearly non-normative research and **MUST NOT** be enabled as Passport-Core recovery.

---

## 12. Backup, Device Addition, and Removal

[REQ-UX-DEVICE-001] Adding a device **MUST** use the upstream Mode 2 recipient procedure and create fresh recipient identifiers for the new manifest version.

[REQ-UX-DEVICE-002] A device-add flow **MUST** authenticate the intended recipient through a deployment mechanism and **MUST NOT** treat a displayed device name as cryptographic recipient identity.

[REQ-UX-DEVICE-003] Removing a device **MUST** rotate the relevant content-encryption state for future versions and warn that previously obtained ciphertext cannot be retracted.

[REQ-UX-DEVICE-004] Backup restoration **MUST** authenticate manifest and chain evidence and detect rollback according to the Core inputs available to the deployment.

[REQ-UX-DEVICE-005] Export **MUST** require explicit holder action, identify whether private keys or decrypted claims are included, and protect confidential exports at least as strongly as the live local store.

---

## 13. Transport-Neutral Interaction

[REQ-UX-TRANSPORT-001] QR, deep-link, web, file, and proximity transports **MUST** carry the same signed Core request and presentation semantics; transport metadata **MUST NOT** silently alter the signed request.

[REQ-UX-TRANSPORT-002] Transport authentication **MUST NOT** replace request signature, artifact hash, holder signature, issuer signature, or authority verification.

[REQ-UX-TRANSPORT-003] NFC, Bluetooth, and other proximity features **MUST NOT** claim Passport conformance until a versioned transport profile defines framing, peer authentication, replay, size limits, and failure behavior.

[REQ-UX-TRANSPORT-004] A proprietary `noncePolicy`, session field, or transport callback **MUST NOT** be inserted into a closed Core message.

---

## 14. Issuer and BVS Operator Surfaces

### 14.1 Issuer

[REQ-UX-ISSUER-001] Issuer tools **MUST** create ordinary issuer-signed Resolution Manifests containing `hiri:passport:CredentialClaim` content at `/data/credential-<opaque-id>`.

[REQ-UX-ISSUER-002] Issuer tools **MUST NOT** issue normal credentials as Attestation Manifests or represent a mutable unsigned database flag as authenticated credential status.

[REQ-UX-ISSUER-003] Status updates **MUST** produce a valid new version in the stable credential chain and show the operator the state and exact effective time before signing.

[REQ-UX-ISSUER-004] Public issuance tools **MUST** record the holder's explicit public-publication authorization using deployment audit controls without embedding unnecessary consent metadata in the public claim.

### 14.2 BVS

[REQ-UX-BVS-001] A BVS console **MUST** show the exact BVS authority, evidence profile and hash, source provider, source verification method, adapter ID and version, and holder-binding result before issuance.

[REQ-UX-BVS-002] Operator copy **MUST NOT** say the BVS is relaying a provider-issued HIRI credential when the BVS is the direct issuer.

[REQ-UX-BVS-003] A failed or expired holder-binding session **MUST NOT** permit credential issuance and **SHOULD** offer a fresh challenge.

---

## 15. CLI and SDK Contract

The examples below describe behavior, not package names or a frozen programming-language API.

### 15.1 CLI responsibilities

Suggested command families are `authority`, `portfolio`, `credential`, `request`, `present`, `verify`, `key`, and `evidence`.

[REQ-UX-CLI-001] Machine output **MUST** use structured Core values and error codes rather than terminal color or prose as the only result.

[REQ-UX-CLI-002] Verification commands **MUST** accept explicit verification time, clock-skew, credential-issuance tolerance, evidence sources, and policy inputs and **MUST** report the values used.

[REQ-UX-CLI-003] Secret key, decrypted portfolio, source token, and raw authentication-secret output **MUST** be disabled by default and **MUST NOT** enter routine logs.

### 15.2 SDK responsibilities

[REQ-UX-SDK-001] SDK verification **MUST** return the structured Verification Report or a lossless typed representation of it.

[REQ-UX-SDK-002] SDK APIs **MUST** separate parsing from validation, cryptographic verification, identity-anchor evaluation, and relying-party policy.

[REQ-UX-SDK-003] API types **MUST NOT** expose removed `slots`, `overallTrustLevel`, custom revocation-log, or core P-256 paths as v2.0.0 protocol members.

[REQ-UX-SDK-004] A network convenience layer **MUST** preserve retrieval provenance and **MUST NOT** be part of the pure verification kernel.

---

## 16. Accessibility, Privacy, and Safety

### 16.1 Accessibility

[REQ-UX-ACCESS-001] Every supported workflow **MUST** be operable by keyboard and assistive technology without requiring drag, hover, color discrimination, or time-critical precision.

[REQ-UX-ACCESS-002] Status and consent changes **MUST** be announced through accessible semantics without repeatedly interrupting the user during progressive verification.

[REQ-UX-ACCESS-003] Technical values **MUST** support copying and character-by-character inspection without forcing a screen reader to read long hashes in the primary flow.

[REQ-UX-ACCESS-004] Security-critical confirmation **MUST NOT** depend only on animation, spatial position, icon shape, or biometric availability.

### 16.2 Privacy

[REQ-UX-PRIVACY-001] Screenshots, screen recording, clipboard retention, notification previews, and application switching **SHOULD** be restricted on screens containing private keys, backup material, decrypted claims, or presentation previews where the platform permits.

[REQ-UX-PRIVACY-002] Clipboard operations for sensitive values **MUST** be explicit and **SHOULD** offer bounded automatic clearing without claiming guaranteed deletion from third-party clipboard history.

[REQ-UX-PRIVACY-003] Analytics **MUST NOT** contain holder authorities, portfolio URIs, credential URIs, claim values, request nonces, presentation IDs, stable local record IDs, hashes usable as cross-event identifiers, or raw error input.

[REQ-UX-PRIVACY-004] Local privacy history **MUST** state what was disclosed, to which verifier authority, for what signed purpose, and when, while avoiding undisclosed portfolio data.

### 16.3 Safe failure

[REQ-UX-SAFETY-001] Error messages **MUST** provide a safe summary and stable code without reflecting attacker-controlled markup or secrets.

[REQ-UX-SAFETY-002] Authentication or decryption failures exposed to a remote peer **MUST** use the Core indistinguishable external failure class; local diagnostics **MUST** remain protected.

[REQ-UX-SAFETY-003] Destructive actions involving keys, local records, backups, or disclosure history **MUST** identify scope and recovery consequence before confirmation.

---

## 17. Intended Conformance and Quality Gate

This draft defines intended UX roles: Holder Application, Verifier Application, Issuer Console, BVS Console, CLI, and SDK. Role claims are scoped; implementing one role does not imply another.

[REQ-UX-CONF-001] A role claiming UX v2.0.0 conformance **MUST** satisfy every requirement applicable to that role and the corresponding Core conformance role.

[REQ-UX-CONF-002] An implementation **MUST NOT** claim conformance to this Working Draft before it advances to Candidate Specification and publishes testable acceptance criteria.

[REQ-UX-CONF-003] Candidate status **MUST** require, at minimum, mapped interaction tests; accessibility tests; adversarial request and display-text tests; offline and stale-evidence tests; rotation and backup tests; and traceability from every requirement ID.

[REQ-UX-CONF-004] Mockups and prototypes **MUST** use visibly synthetic identities, placeholder hashes, and non-production endpoints when they do not contain valid vectors.

---

## 18. Migration from UX v1.5.0

There is no promise that v1.5.0 screens or application APIs are compatible with v2.0.0.

| v1.5.0 design | v2.0.0 correction |
|---------------|-------------------|
| Public Passport slots and slot counts | Private local portfolio records; no portfolio topology in a presentation |
| Tier 1/2/3 trust labels | Explicit provenance plus separate cryptography, status, identity, and policy results |
| Credential Attestation Manifest | Direct issuer Resolution Manifest with Credential Claim content |
| Persistent self-attestation artifact | Holder-signed Resolution Manifest, unpublished by default |
| Proof-of-possession slots and HMAC tokens | Removed from Core |
| Phantom slots and padded transmitted counts | Removed; omitted items are absent |
| Merkle portfolio inclusion proof | Removed; portfolio membership is not verifier evidence |
| Address changes on routine rotation | Stable genesis-derived authority and stable portfolio URI |
| Custom revocation log/checkpoint | Current credential chain and authenticated current-head evidence |
| P-256 core signing | Ed25519 Core only |
| Selective field sharing | Complete public Credential Claim disclosure until `OPEN-SD-01` is resolved |
| Expired-request grace override | Reject and obtain a fresh signed request |
| Normative guardian recovery | Deferred pending `OPEN-RECOVERY-01` |
| Built-in NFC/Bluetooth flow | Deferred to a transport profile |

[REQ-UX-MIGRATE-001] A v1.5.0 implementation **MUST NOT** claim v2.0.0 compatibility by renaming old fields, screens, tiers, or artifacts.

[REQ-UX-MIGRATE-002] Migration **MUST** preserve user-controlled local data where safe, but issuer credentials **MUST** be reissued by the direct issuer when the old artifact is not a valid v2.0.0 Credential Claim.

---

## Appendix A. Required State Examples

Every relevant flow must be designed and tested for:

- loading without premature success;
- valid evidence;
- invalid authenticated evidence;
- unknown evidence;
- offline or stale evidence;
- unsupported schema, context, algorithm, or profile;
- expired or replayed request;
- user decline and local-authentication cancellation;
- partial independent results;
- policy not evaluated, accepted, and rejected.

---

## Appendix B. Core Open-Issue Impact

| Core issue | UX restriction |
|------------|----------------|
| `OPEN-SD-01` | Do not offer selective credential disclosure as conformant. |
| `OPEN-HEAD-01` | Explain conditional status and authenticated source freshness. |
| `OPEN-CONTEXT-01` | Treat placeholder contexts and schemas as non-production. |
| `OPEN-RECOVERY-01` | Do not promise total-loss authority continuity. |
| `OPEN-TRANSPORT-01` | Keep transport-specific security claims out of Core UX. |

---

## End of Working Draft
