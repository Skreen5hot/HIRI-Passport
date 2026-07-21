# HIRI Passport v2.0.0 Compatibility and Normative Decisions

## Design-control baseline for the specification rewrite

**Document version:** 1.2.0  
**Status:** Accepted design-control baseline  
**Target specification:** HIRI Digital Passport Extension v2.0.0 Draft  
**Date:** July 2026  
**Supersedes:** No published specification; governs the rewrite of the v1.9.0 design draft

---

## 1. Purpose and Authority

This document records the compatibility baseline and architectural decisions that govern the HIRI Digital Passport Extension v2.0.0 rewrite.

Revision 1.2.0 records completion of the compatibility-corrected UX v2.0.0 and Bootstrap Verification Profile v3.0.0 Working Drafts. Revision 1.1.0 recorded the reviewed upstream Mode 5 inconsistencies and corrected OPEN-SD-01: the current Mode 3 HMAC key is not safely delegable to an adversarial verifier, so a corrected holder-derived suite is required.

The following existing documents are design inputs, not implementation contracts:

- [HIRI Digital Passport Extension v1.9.0](../historical/HIRI-Digital-Passport-Extension-v1_9_0.md)
- [HIRI Passport UX Architecture v1.5.0](../historical/HIRI-Passport-UX-Architecture-Spec-v1_5_0.md)
- [HIRI Bootstrap Verification Profile v2.0.0](../historical/HIRI-Bootstrap-Verification-Profile-v2_0_0.md)

The active companion Working Drafts governed by this baseline are:

- [HIRI Digital Passport Extension v2.0.0 Draft](HIRI-Digital-Passport-Extension-v2_0_0-DRAFT.md)
- [HIRI Passport UX Architecture v2.0.0 Draft](HIRI-Passport-UX-Architecture-Spec-v2_0_0-DRAFT.md)
- [HIRI Bootstrap Verification Profile v3.0.0 Draft](HIRI-Bootstrap-Verification-Profile-v3_0_0-DRAFT.md)

The v1.9.0 Passport specification remains unchanged as a historical design draft. Requirements from that document do not carry into v2.0.0 unless this document accepts them or the v2.0.0 specification restates them.

For the v2.0.0 rewrite, decisions marked **ACCEPTED** are binding. Decisions marked **DEFERRED** are excluded from the v2.0.0 normative core. Decisions marked **OPEN — BLOCKING** must be resolved before the affected portion of the v2.0.0 specification can be considered stable.

When this document conflicts with the three local design inputs, this document governs the rewrite. It does not modify the upstream HIRI Protocol or Privacy Extension.

---

## 2. Pinned Upstream Baseline

Compatibility review is pinned to the following upstream state:

- Repository: `https://github.com/Skreen5hot/HIRI`
- Reviewed commit: `009c145c9740188fc7a03b19c8ac2079bfe61cdb`
- HIRI Protocol Specification: v3.1.1
- HIRI Privacy & Confidentiality Extension: v1.4.1
- Upstream implementation package: `hiri-protocol` v0.1.0

The v2.0.0 Passport specification MUST identify a specific upstream version or commit. It MUST NOT rely on an unversioned description such as "latest HIRI."

### 2.1 Base-protocol contracts that Passport inherits

| ID | Upstream contract | Consequence for Passport v2.0.0 |
|----|-------------------|----------------------------------|
| BASE-01 | A normal HIRI content artifact is a `hiri:ResolutionManifest`. | Passport portfolio and issuer credential artifacts retain this exact envelope type. |
| BASE-02 | The normative HIRI v3.1.1 authority is derived from an Ed25519 genesis public key. | Ed25519 is the only normative Passport v2.0.0 signing algorithm. |
| BASE-03 | The authority is immutable after key rotation and remains pinned to the genesis key. | Routine key rotation changes the active key, not the holder authority or passport URI. |
| BASE-04 | A Resolution Manifest contains `hiri:content` and obeys profile symmetry. | Content and manifest signatures use the same declared canonicalization profile. |
| BASE-05 | JCS is required at HIRI Core; URDNA2015 is additionally required at Interoperable. | Passport conformance profiles cannot require URDNA2015 while claiming JCS-only compatibility. |
| BASE-06 | URDNA2015 uses an embedded or hash-pinned context loader and forbids arbitrary remote context fetching. | Passport and Bootstrap contexts are pinned; runtime dereferencing is prohibited. |
| BASE-07 | `hiri:AttestationManifest` is Privacy Mode 5, uses `mode: "attestation"`, has no `hiri:content`, and fully verifies an attestor plus a referenced subject manifest. | A normal issuer credential or BVS credential is not represented as an Attestation Manifest. Passport treats a missing or unverified subject manifest as incomplete evidence, not full verification. |
| BASE-08 | Privacy Mode 3 is a Resolution Manifest with URDNA2015 content, statement index, index root, proof-suite material, and recipient key distribution. | Selective credentials must use the complete Mode 3 structure, not a partial look-alike. |
| BASE-09 | Key lifecycle verification is temporal and reports `active`, rotation, revocation, and `unknown` states. | Passport does not invent a conflicting rotation or blanket post-rotation invalidation rule. |
| BASE-10 | The kernel reports cryptographic state; application policy decides whether a degraded state is acceptable. | Verification output separates evidence from relying-party acceptance. |
| BASE-11 | Kernel computation is pure and receives crypto, time, storage, resolution, and networking through injected interfaces. | Passport protocol computation may extend the kernel layer but may not introduce I/O into it. |

### 2.2 Reviewed upstream inconsistencies

The pinned upstream documents contain two relevant internal inconsistencies:

1. Privacy Extension §10.5 says attestation verification requires both the attestor signature and the referenced subject-manifest signature, while its later guidance permits a `partial` result when the subject manifest is unavailable. Passport uses the stricter rule for verified Mode 5 evidence: both sides of the binding must verify. An attestor-only result is incomplete evidence.
2. Privacy Extension §10.2 and §17 use `/attestation/<id>`, but the HIRI v3.1.1 URI grammar permits only `data`, `key`, `compact`, `proof`, and `vocab` resource types. Until upstream defines a grammar extension, Passport Mode 5 artifacts use `/data/attestation-<opaque-id>`.

These corrections do not redefine the upstream cryptographic structures. They select behavior that remains valid under the base URI grammar and avoids overstating incomplete attestation evidence.

### 2.3 Compatibility claim rule

**ACCEPTED — DEC-COMPAT-01:** Passport v2.0.0 may claim that an artifact is directly verifiable by an unmodified HIRI v3.1.1 verifier only when that artifact is a structurally valid upstream artifact using an upstream-supported authority, URI grammar, canonicalization profile, privacy mode, and signature suite.

Passport-specific standalone messages, including Disclosure Requests and Passport Presentations, MUST be described as Passport protocol messages. They MUST NOT be described as Resolution Manifests unless they satisfy the complete Resolution Manifest contract.

---

## 3. Architectural Boundary

### 3.1 HIRI responsibility

HIRI remains responsible for:

- content hashing and content addressing;
- canonicalization;
- manifest signing and verification;
- immutable version-chain verification;
- authority derivation and key lifecycle;
- the privacy-mode algorithms defined by Privacy Extension v1.4.1.

### 3.2 Passport responsibility

Passport v2.0.0 is responsible for:

- the encrypted holder portfolio content schema;
- credential claim schemas and holder-subject binding rules;
- Disclosure Request and Passport Presentation messages;
- presentation consent and request binding;
- composition of issuer credential verification results;
- provenance and assurance classification;
- Passport-specific conformance requirements.

### 3.3 Application responsibility

Applications and relying parties remain responsible for:

- authorization decisions;
- issuer and BVS trust policies;
- legal recognition;
- transport selection;
- acceptable freshness and degraded-state policy, within any maximum security bounds defined by a profile.

**ACCEPTED — DEC-BOUNDARY-01:** Passport v2.0.0 MUST NOT claim that a valid signature establishes the truth, legal force, or authority of a credential claim. It establishes integrity and provenance. Trust in the issuer and acceptance of the claim remain explicit policy inputs.

---

## 4. Canonical Artifact Model

### 4.1 Holder portfolio

**ACCEPTED — DEC-ARTIFACT-01:** The holder portfolio is an ordinary `hiri:ResolutionManifest` whose content is protected with Privacy Extension Mode 2 encrypted distribution.

The canonical portfolio URI is:

```text
hiri://<holder-authority>/data/passport-main
```

The v1.9.0 `/passport/main` resource path is not used in v2.0.0 because it is not part of the HIRI v3.1.1 URI resource-type baseline.

The public Resolution Manifest envelope MAY expose only fields required by HIRI and the Mode 2 privacy declaration. It MUST NOT expose:

- credential slots;
- credential types;
- display labels;
- issuer authorities;
- credential references;
- true or padded credential counts;
- slot identifiers.

The decrypted portfolio content contains holder-managed credential records. It may be synchronized to the holder's other devices by including those devices as Mode 2 recipients. It may remain local when the holder chooses not to publish it.

The public envelope necessarily reveals the Mode 2 recipient-array length. That length is not an exact device count because dummy entries, non-device recipients, and multiple entries per recipient may exist. Each recipient identifier is a fresh random value for one manifest version and is not reused across versions; this prevents direct entry correlation but does not hide array length or changes in length.

### 4.2 Portfolio membership is not verifier evidence

**ACCEPTED — DEC-ARTIFACT-02:** A verifier does not need proof that a disclosed credential was previously listed in a public passport slot. The issuer's credential signature, its holder-subject binding, and the holder's presentation signature are the relevant evidence.

Adding a credential to the holder's portfolio is a wallet-management action. It does not increase the credential's cryptographic trust. Removing a credential from the portfolio does not revoke the issuer's claim.

Consequences:

- Passport Presentations do not reveal a portfolio manifest hash.
- Passport Presentations do not provide a slot-membership proof.
- A holder may present a valid credential received moments earlier without first publishing a new portfolio version.
- A verifier cannot enumerate undisclosed credentials by resolving the holder portfolio.

### 4.3 Direct issuer credential

**ACCEPTED — DEC-ARTIFACT-03:** A direct issuer credential is an issuer-signed `hiri:ResolutionManifest`, not an `hiri:AttestationManifest`.

The credential URI uses the upstream `data` resource type and an opaque identifier:

```text
hiri://<issuer-authority>/data/credential-<opaque-id>
```

The credential content is a JSON-LD document whose top-level application type is `hiri:passport:CredentialClaim`. The content contains, at minimum:

- credential schema identifier;
- credential type identifier;
- subject holder authority;
- claim data;
- issuance timestamp;
- optional validity boundary;
- optional evidence data;
- optional issuer-specific status identifier.

The `subjectHolderAuthority` field is part of the signed content. A verifier accepts a credential for a presentation only when the disclosed and verified subject authority equals the presentation holder authority.

### 4.4 Credential privacy profiles

**ACCEPTED — DEC-PRIVACY-01:** Passport v2.0.0 defines two credential publication profiles:

1. **Public credential:** ordinary public Resolution Manifest content. The issuer and holder knowingly accept that the claim content, including subject binding, is public.
2. **Selective credential:** Privacy Extension Mode 3 Resolution Manifest using the complete v1.4.1 statement-index and proof-suite structure.

The v1.9.0 `proof-of-possession` slot profile is removed. Mode 1 proves custody by the publishing authority; it does not by itself prove that a third-party issuer issued a credential to the presenting holder.

For a selective credential:

- the issuer is the Mode 3 publisher;
- the holder is an authorized Mode 3 recipient;
- the full claim plaintext is delivered privately to the holder at issuance;
- holder-subject binding is a selectively disclosable signed statement;
- the verifier receives only the statements required by the request plus statements required by the credential schema;
- the disclosure package MUST validate under the complete selected Mode 3 disclosure suite;
- a suite not implemented by Privacy Extension v1.4.1 MUST carry a new suite identifier and MUST NOT claim validation by an unmodified v1.4.1 verifier.

### 4.5 Mode 5 use

**ACCEPTED — DEC-ARTIFACT-04:** `hiri:AttestationManifest` remains available only for the upstream Mode 5 use case: a third party attests to a property of a specific subject manifest/content version and the verifier evaluates both sides of that binding.

Passport reports Mode 5 evidence as verified only when both the attestor manifest and referenced subject manifest verify. Its identifier uses the base-compatible form:

```text
hiri://<attestor-authority>/data/attestation-<opaque-id>
```

Mode 5 is not used for:

- normal employer, education, license, or membership credentials;
- BVS-issued verification credentials;
- holder self-assertions;
- Passport Presentations.

### 4.6 Bootstrap Verification Service credentials

**ACCEPTED — DEC-ARTIFACT-05:** A BVS is a direct issuer whose signed Credential Claim accurately states the verification procedure it performed. A BVS credential uses the direct issuer credential model in Section 4.3.

The BVS MUST identify itself as issuer. The upstream provider or registry it consulted is evidence, not the issuer. Trust policy remains scoped to the tuple:

```text
(BVS authority, source provider, verification method, credential schema, jurisdiction, adapter version)
```

### 4.7 Self-asserted data

**ACCEPTED — DEC-ARTIFACT-06:** Self-asserted data has two representations:

- **Persistent:** a holder-signed Resolution Manifest stored in the encrypted portfolio and presented with provenance `self-asserted-persistent`.
- **Ephemeral:** fields embedded directly in one Passport Presentation and covered by the presentation signature, with provenance `self-asserted-ephemeral`.

Neither representation is called an Attestation Manifest. Neither may be displayed as issuer-verified.

A persistent self-assertion remains unpublished by default. It may be delivered as a complete manifest-and-content pair in a Presentation Package without public resolver publication. Public publication requires the same complete-content and stable-authority consequence disclosure as a public issuer credential. Mode 2 distribution is storage/synchronization for configured recipients and is not generally verifier-readable Core evidence.

---

## 5. Authority, Keys, and Algorithms

### 5.1 Holder authority

**ACCEPTED — DEC-KEY-01:** The holder authority is derived from the Ed25519 genesis public key and remains immutable for the life of the authority.

The canonical portfolio URI therefore remains stable through routine key rotation:

```text
hiri://<immutable-holder-authority>/data/passport-main
```

### 5.2 Routine rotation

**ACCEPTED — DEC-KEY-02:** Routine rotation follows HIRI v3.1.1 dual-signature rotation. The KeyDocument retains the genesis authority, moves the former key into the rotated-key history, and activates the new key.

Consequences:

- previously issued credentials remain bound to the same holder authority;
- routine rotation does not require credential re-issuance;
- wallet UX MUST NOT tell the holder that the passport address changes;
- verifiers evaluate the signing key at the presentation verification time using the KeyDocument lifecycle record.

### 5.3 Compromise and recovery

**ACCEPTED — DEC-KEY-03:** A compromise event follows the upstream `manifestsInvalidAfter` and key-revocation semantics. A verifier MUST NOT invalidate every presentation merely because a rotation event occurred after presentation creation.

**Open dependency:** See OPEN-RECOVERY-01. Recovery when the holder has lost all authorized signing and recovery keys requires a separate recovery specification. Biometric continuity, social recovery, guardian recovery, and institutional recovery are candidate mechanisms but are not part of the Passport v2.0.0 core until one receives a complete threat model and protocol definition.

### 5.4 Algorithm registry

**DEFERRED — DEC-ALGORITHM-01:** P-256 and ML-DSA are excluded from the Passport v2.0.0 normative core. HIRI v3.1.1 does not provide an algorithm-agile normative authority and signing model that an unmodified verifier can validate.

Future algorithm support requires an upstream HIRI revision or a separately versioned Passport cryptographic profile with explicit compatibility limits and complete test vectors.

---

## 6. Disclosure Request

### 6.1 Message class

**ACCEPTED — DEC-PRESENTATION-01:** A Disclosure Request is a standalone, verifier-signed Passport protocol message. It is not a Resolution Manifest and is not published in a HIRI version chain.

The v2.0.0 request schema must include:

- protocol version;
- request ID with at least 128 bits of randomness;
- verifier authority;
- verifier signing verification method;
- requested credential schemas and fields;
- purpose for every requested credential or field;
- whether each item is required or optional;
- exactly 32 random nonce bytes encoded as base64url without padding;
- issuance and expiry timestamps;
- optional verifier key-agreement material for confidential disclosure packages;
- signature block.

### 6.2 Signature target

**ACCEPTED — DEC-PRESENTATION-02:** Request signing uses Ed25519 over the following bytes:

```text
UTF8("HIRI-PASSPORT-DISCLOSURE-REQUEST-V2") || 0x00 || JCS(unsignedRequest)
```

The unsigned request excludes the signature value but includes the signature metadata needed to select the verification method. Implementations MUST sign these bytes directly. They MUST NOT add an undocumented pre-hash.

### 6.3 Request validation

A holder MUST reject a request when any of the following is true:

- signature invalid;
- verifier authority does not control the declared verification method;
- nonce does not decode to exactly 32 bytes;
- request ID or nonce was previously accepted within the replay-retention window;
- request expired;
- issuance timestamp is after expiry;
- credential or field request lacks a purpose;
- requested schema or field syntax is unsupported or malformed.

Holder software MAY decline any otherwise valid request.

---

## 7. Passport Presentation

### 7.1 Message class

**ACCEPTED — DEC-PRESENTATION-03:** A Passport Presentation is an ephemeral, holder-signed Passport protocol message. It is not a Resolution Manifest, is not content-addressed for publication, and is not a portfolio version.

The presentation includes:

- protocol version;
- presentation ID with at least 128 bits of randomness;
- holder authority;
- holder verification method;
- originating request ID and exact request nonce;
- verifier authority;
- creation and expiry timestamps;
- disclosed credential packages;
- optional self-asserted fields;
- holder signature.

### 7.2 Signature target

**ACCEPTED — DEC-PRESENTATION-04:** Presentation signing uses Ed25519 over:

```text
UTF8("HIRI-PASSPORT-PRESENTATION-V2") || 0x00 || JCS(unsignedPresentation)
```

### 7.3 Presentation item identifiers

**ACCEPTED — DEC-PRESENTATION-05:** Stable portfolio slot IDs never leave the encrypted portfolio. Each disclosed item receives a fresh random `presentationItemId` generated for that presentation.

`presentationItemId` is a message-local correlation handle. It is not represented as an HMAC proof and makes no membership claim. The v1.9.0 Slot Blinding Key and `presentationSlotToken` construction are removed from the v2.0.0 core.

### 7.4 Minimum disclosure

**ACCEPTED — DEC-PRIVACY-02:** A presentation discloses only requested and schema-mandatory information. It contains no credential count, omitted-slot count, withheld-slot summary, portfolio hash, or completeness audit.

This removes the need for phantom slots, count padding, issuer obfuscation, and timestamp alteration.

The holder UI may display the holder's local credential count. That count is not transmitted to the verifier.

### 7.5 Timestamp integrity

**ACCEPTED — DEC-PRIVACY-03:** Values proven as statements from an issuer credential are transmitted byte-for-byte as signed or indexed. Passport software MUST NOT smear, round, truncate, or otherwise modify an issuer-signed timestamp and then claim it is the same proven statement.

Transport metadata minimization may be addressed separately, but it cannot alter signed credential values.

### 7.6 Selective-disclosure key delegation

**Open dependency:** See OPEN-SD-01. The current Privacy Mode 3 HMAC suite cannot safely be delegated to a potentially adversarial Passport verifier. A verifier that receives the shared HMAC key can verify every statement it can guess, and the published document-level `indexSalt` does not prevent practical guessing of low-entropy statements.

The current upstream BBS+ description also does not close this gap: it assigns proof generation to the publisher using the signer key instead of defining holder-derived proofs from the issued signature.

OPEN-SD-01 therefore requires selection and complete specification of a corrected disclosure suite, not merely an envelope for delegating the existing HMAC key. Leading alternatives are:

1. a corrected holder-derived BBS+ suite aligned with the selected BBS standard; or
2. a new per-statement-secret-salt suite in which a fresh secret salt is included in both `statementHash[i]` and `tag[i]`, all salts are delivered privately to the holder, and the holder releases only the salts for disclosed statements.

The per-statement alternative is SD-JWT-like, but it is not the HIRI Privacy v1.4.1 HMAC suite. Either alternative requires an upstream revision or a separately versioned Passport suite with an explicit statement that unmodified v1.4.1 verifiers cannot validate it.

Any selected solution must:

- support holder-derived, request-specific disclosure without the issuer signing key;
- bind the presentation to the request nonce, verifier authority, credential manifest hash, disclosed statement set, and presentation expiry;
- authenticate all signed commitment, index, tag, salt, and proof inputs;
- protect any verifier-specific secret material in transit;
- address low-entropy statements, colluding verifiers, proof replay, and cross-presentation correlation;
- include positive, boundary, and adversarial test vectors.

Until OPEN-SD-01 is resolved, public credentials may be specified completely, but Passport-Interoperable selective disclosure is not stable.

---

## 8. Credential Status and Revocation

### 8.1 Core status determination

**ACCEPTED — DEC-STATUS-01:** Passport v2.0.0 core determines credential status from the issuer's current credential chain head and the issuer KeyDocument.

For every presented credential, an online verifier attempts to:

1. resolve the stable credential URI through an issuer-authoritative resolver;
2. obtain the current chain head;
3. verify that the presented version is in the current chain history;
4. verify every relevant manifest signature and chain link;
5. evaluate the current issuer-declared status and validity boundary;
6. evaluate the issuer signing-key lifecycle.

Status is one of:

```text
active | suspended | revoked | expired | superseded | unknown
```

An issuer-declared restrictive state overrides an older active credential version. A holder cannot make an issuer-revoked credential active by presenting an old hash.

### 8.2 Offline behavior

**ACCEPTED — DEC-STATUS-02:** Offline evidence is explicitly bounded. A verifier using a cached chain head reports the cache capture time and reports status as `unknown` after the profile's freshness limit. Absence of a reachable current head is never equivalent to confirmed active status.

The verification engine reports the evidence and status. Relying-party policy decides whether `unknown` is acceptable for the transaction.

### 8.3 Transparency log

**DEFERRED — DEC-STATUS-03:** The v1.9.0 Revocation Transparency Log is removed from the v2.0.0 normative core.

Any future transparency profile must correct at least the following:

- the issuer cannot sign a sequence number that the server has not assigned;
- a log receipt and an issuer revocation statement require distinct signatures and roles;
- absence requires a cryptographic non-inclusion mechanism, not an unsigned database answer;
- append-only behavior requires consistency proofs, not only a chain of operator-signed roots;
- privacy-preserving lookup must not depend on an issuer silently answering whether its own revocation exists;
- leaf and interior hashes require domain separation;
- all proof encodings require complete fixed vectors.

A future profile should evaluate a verifiable map or sparse Merkle map keyed by credential status identifier, rather than assuming a Certificate-Transparency-style append log can prove non-membership.

---

## 9. Verification State Machine

**ACCEPTED — DEC-VERIFY-01:** Passport verification is divided into evidence-producing phases. A later trust policy may consume the output but may not rewrite the evidence.

### Phase R — Request

- verify request syntax, signature, authority binding, nonce, expiry, and replay state;
- confirm the presentation binds the same request ID, nonce, and verifier authority.

### Phase H — Holder

- verify presentation signature;
- resolve the holder KeyDocument;
- verify the signing method is controlled by the immutable holder authority;
- evaluate key lifecycle at the verification time and any applicable timestamp proof.

### Phase C — Credential

For every disclosed credential:

- validate the Resolution Manifest envelope;
- verify issuer signature and profile symmetry;
- verify content or selective-disclosure proof;
- verify the disclosed subject authority equals the presentation holder authority;
- verify issuer chain integrity;
- determine credential status and freshness.

### Phase I — Issuer identity

- resolve available issuer identity anchors;
- report each anchor and its verification result separately;
- do not infer claim authority merely from domain control.

### Phase P — Policy

- look up issuer or BVS trust policy;
- apply schema, method, jurisdiction, freshness, and transaction requirements;
- produce an application acceptance result distinct from protocol verification.

### 9.1 Result separation

The result model MUST separate at least:

- `cryptographicVerification`;
- `holderKeyStatus`;
- `credentialStatus`;
- `disclosureVerification`;
- `issuerIdentityEvidence`;
- `policyEvaluation`;
- `warnings` and machine-readable error codes.

The specification MUST NOT collapse these into a single ambiguous `overallTrustLevel`.

---

## 10. Identity Anchors and Trust

### 10.1 Organizational identity

**ACCEPTED — DEC-TRUST-01:** Domain/DNSSEC verification proves control of a domain-to-authority binding. It does not prove that the organization is authorized to issue a particular credential type.

Verification output reports domain evidence separately from issuer authorization policy.

### 10.2 BVS trust

**ACCEPTED — DEC-TRUST-02:** An unconfigured BVS is `untrusted` for policy acceptance. Its credential remains visible in technical verification output with valid or invalid cryptographic evidence; it is not silently ignored.

This preserves auditability and prevents a valid but untrusted credential from being confused with an absent credential.

### 10.3 Provenance vocabulary

**ACCEPTED — DEC-TRUST-03:** The UX and protocol use provenance categories rather than numbered trust tiers:

```text
direct-issuer
bootstrap-verification-service
self-asserted-persistent
self-asserted-ephemeral
```

Numbered "Tier 1 / Tier 2 / Tier 3" labels are removed because v1.9.0 uses tiers for artifact ownership while the UX and Bootstrap specifications use them for unrelated assurance concepts.

---

## 11. Context and Schema Governance

### 11.1 Context resolution

**ACCEPTED — DEC-CONTEXT-01:** Passport JSON-LD contexts MUST be resolved from an embedded registry or a hash-pinned `hiri:contextCatalog` supported by the upstream secure loader.

Implementations MUST NOT dereference context URLs during canonicalization. First-use network fetching with an HTTP TTL is prohibited for signed content.

### 11.2 Context publication

Context URLs may be published for human and ecosystem discovery, but the canonical payload bytes and SHA-256 hashes are versioned specification artifacts. A context URL must never serve mutable content under an unchanged versioned URL.

### 11.3 Schemas

The v2.0.0 specification deliverables MUST include machine-readable schemas for:

- encrypted portfolio plaintext;
- credential claim content;
- Disclosure Request;
- Passport Presentation;
- public credential disclosure package;
- selective credential disclosure package after OPEN-SD-01 is resolved;
- verification result;
- issuer/BVS trust policy;
- KeyDocument extensions, if any.

Every normative JSON example MUST validate against the corresponding schema.

---

## 12. Conformance Profiles

### 12.1 Passport-Core

Passport-Core requires:

- upstream HIRI Core behavior;
- Ed25519 authorities and signatures;
- JCS and raw-sha256;
- immutable authority plus KeyDocument lifecycle verification;
- Mode 2 encrypted holder portfolio;
- public direct-issuer credentials;
- signed Disclosure Requests and Passport Presentations;
- holder-subject binding;
- persistent and ephemeral self-assertions with explicit provenance;
- tri-state/degraded status reporting;
- minimum disclosure with no portfolio credential-count metadata.

Passport-Core does not claim selective credential disclosure.

Passport-Core's practical credential envelope is complete public content linked to the holder's stable authority. It is suitable for claims already intended for public inspection and is not a confidentiality-preserving profile for employment, health, government identity, or other sensitive records. Status may be confirmed `active` when a deployment supplies a fresh source configured as issuer-authoritative; without that configuration, it is reported `unknown` pending OPEN-HEAD-01.

The public Mode 2 portfolio envelope still reveals ciphertext size, publication and chain timing, stable portfolio URI, recipient-array length, and changes in that length. Recipient identifiers are fresh per manifest version, so individual entries are not intentionally linkable across versions.

### 12.2 Passport-Interoperable

Passport-Interoperable includes Passport-Core plus:

- upstream HIRI Interoperable behavior;
- URDNA2015 and cidv1-dag-cbor support;
- secure pinned context loader;
- complete Privacy Extension Mode 3 support;
- the corrected holder-derived selective-disclosure suite resolved by OPEN-SD-01;
- cross-runtime deterministic vectors.

### 12.3 Reserved high-assurance profile

**DEFERRED — DEC-CONFORMANCE-01:** `Passport-Full`, `Passport-Hardened`, and any high-assurance designation are not claimable in v2.0.0 until the relevant status, privacy, and operational profiles are independently specified and reviewed.

Removing count metadata makes the v1.9.0 count-padding profile unnecessary. High-assurance work should focus on credential status, transport confidentiality, key protection, recovery, and policy governance rather than transmitting a deliberately inaccurate credential count.

---

## 13. Deferred Features

The following are excluded from the v2.0.0 normative core:

| ID | Feature | Reason for deferral |
|----|---------|---------------------|
| DEF-01 | P-256 Passport authorities | Not compatible with the normative HIRI v3.1.1 authority/signature model. |
| DEF-02 | ML-DSA | No stable HIRI, JOSE, COSE, proof encoding, or interoperability contract in the reviewed baseline. |
| DEF-03 | Revocation Transparency Log | Current construction cannot provide sound signing, non-inclusion, consistency, and privacy guarantees. |
| DEF-04 | Completeness audits | Conflict with minimum disclosure, invite coercion, and provide no necessary credential evidence. |
| DEF-05 | Slot HMAC blinding | Token is not verifier-checkable membership evidence and becomes unnecessary when slot IDs never leave encrypted storage. |
| DEF-06 | Timestamp smearing | Mutating issuer-proven statements invalidates exact disclosure proofs. |
| DEF-07 | Biometric uniqueness and recovery | Fuzzy extraction, liveness, circuit, enrollment, nullifier, and recovery governance are underspecified. |
| DEF-08 | Oracle governance | Depends on the deferred biometric and transparency profiles. |
| DEF-09 | `proofArtifactRef` | Depends on a selected, fully specified proof system and circuit contract. |
| DEF-10 | VC signature reuse | A signature over a HIRI manifest cannot be reused as a signature over different VC bytes. |
| DEF-11 | OID4VP custom format | Requires a current, testable mapping and registration/interoperability strategy. |
| DEF-12 | DIDComm bridge | Transport profile is separated from core and will be reviewed after the native messages stabilize. |
| DEF-13 | BBS+ Passport profile | Candidate resolution for OPEN-SD-01; requires corrected holder-derivation semantics, library selection, canonical vectors, and explicit upstream compatibility limits. |
| DEF-14 | Guardian/biometric/social recovery | Requires a dedicated recovery threat model and authority-continuity specification. |

Deferred material may be retained as non-normative research notes, but it must not use normative language or appear in a conformance checklist.

---

## 14. Cross-Specification Impact

### 14.1 Passport Extension v1.9.0

| Area | v2.0.0 action |
|------|---------------|
| Passport Manifest | Replace custom public slot manifest with encrypted Mode 2 Resolution Manifest. |
| Credential Slot | Retain only as encrypted local portfolio record. |
| Credential Attestation | Replace normal Attestation Manifest with direct issuer Resolution Manifest. |
| Presentation | Replace slot-based presentation with credential disclosure packages and self-asserted fields. |
| Slot blinding | Remove. Use fresh presentation-local item IDs. |
| Omitted counts / completeness | Remove from transmitted protocol. |
| Algorithm registry | Restrict v2.0.0 core to Ed25519. |
| Key rotation | Inherit immutable authority and upstream dual-signature rotation. |
| Revocation log | Move to a future status-transparency profile. |
| Oracle / biometric | Move to research addenda. |
| Interoperability bridges | Move to separately versioned transport/compatibility profiles. |

### 14.2 UX and Architecture Specification v2.0.0 Working Draft 1

`HIRI-Passport-UX-Architecture-Spec-v2_0_0-DRAFT.md` completes the required breaking rewrite of v1.5.0. It:

- preserves the immutable holder authority and portfolio URI through routine rotation;
- replaces public slots, phantom slots, counts, and membership proofs with protected local portfolio records;
- replaces numbered trust tiers with explicit provenance and separate cryptographic, status, identity, and policy results;
- represents persistent self-assertions as unpublished-by-default holder-signed Resolution Manifests;
- treats complete public content and stable-authority correlation as mandatory consent consequences;
- rejects expired requests rather than offering a grace override;
- keeps the protocol kernel pure and restricts Core signing to Ed25519;
- defers proximity transport and total-loss recovery UX to the corresponding open profiles;
- retains explicit purpose, accessible consent, honest degraded states, and holder-local privacy history.

### 14.3 Bootstrap Verification Profile v3.0.0 Working Draft 1

`HIRI-Bootstrap-Verification-Profile-v3_0_0-DRAFT.md` completes the required breaking rewrite of v2.0.0. It:

- uses a BVS-signed Resolution Manifest with Credential Claim content at `/data/credential-<opaque-id>`;
- makes the BVS the direct issuer and represents each provider or registry as evidence;
- defines a BVS-signed challenge and holder-signed response with exact JCS/Ed25519 targets;
- binds one response to an explicit subset of closed, signed verification intents;
- places volatile provider behavior in separately versioned, hash-pinned adapter profiles;
- keeps sensitive credential classes outside the practical public Core envelope by default;
- publishes governance as a BVS-signed Resolution Manifest at `/data/bvs-governance`;
- evaluates trust using the complete scoped tuple and keeps unconfigured BVS evidence visible;
- uses pinned contexts and the Core credential chain rather than remote first-use contexts or the deferred custom revocation log.

---

## 15. Open Blocking Decisions

The following decisions block completion of specific v2.0.0 sections:

**OPEN — BLOCKING — OPEN-SD-01:** Select and fully specify a holder-derived selective-disclosure suite. Direct delegation of the current Mode 3 HMAC key is not acceptable for adversarial verifiers. The selected suite must be either an upstream correction or a separately versioned Passport suite with explicit compatibility limits. This blocks Passport-Interoperable credential presentation.

**OPEN — BLOCKING — OPEN-HEAD-01:** Define authoritative current-head discovery for issuer credential URIs, including anti-rollback behavior, resolver authentication, and offline cache provenance. This blocks credential status verification.

**OPEN — BLOCKING — OPEN-CONTEXT-01:** Produce the final Passport and BVP JSON-LD context payloads, versioned URLs, canonical bytes, and pinned hashes. This blocks URDNA2015 schemas, examples, and vectors.

**OPEN — BLOCKING — OPEN-RECOVERY-01:** Select a recovery model for the case where all holder-authorized signing and recovery keys are unavailable. This blocks recovery UX and any authority-continuity claim.

**OPEN — BLOCKING — OPEN-TRANSPORT-01:** Define verifier authentication and replay requirements for selective presentations. If the suite selected by OPEN-SD-01 transfers verifier-specific secret material, also define mandatory confidentiality and exact failure behavior. This blocks selective-presentation transport security.

An open decision must be resolved through a written decision record containing alternatives, security analysis, selected behavior, schemas, and tests.

---

## 16. Specification Quality Gate

No product implementation phase begins until the governing specification satisfies every applicable gate below.

### 16.1 Structural quality

- One unambiguous document status.
- Complete section numbering and table of contents.
- No broken internal references.
- No undefined normative terms.
- No duplicate or conflicting requirements.
- No mojibake or malformed property names in normative examples.

### 16.2 Normative traceability

- Every normative requirement has a stable requirement ID.
- Every `MUST` and `MUST NOT` maps to at least one conformance test or review assertion.
- Every error code maps to one exact state-machine transition.
- Informative guidance is visibly separated from normative behavior.

### 16.3 Schema and example validity

- Every normative JSON object validates against a versioned schema.
- Every JSON-LD context is locally resolvable and hash-pinned.
- Every URI validates against the selected HIRI grammar.
- Every example uses real encodings of the declared byte lengths.

### 16.4 Cryptographic vectors

- No placeholder output is permitted.
- Vector inputs include exact bytes and encodings.
- Vector outputs include complete bytes, not abbreviated hashes.
- Positive, boundary, and adversarial cases are included.
- Expected outputs are independently reproduced by at least two implementations or libraries before publication.

### 16.5 Compatibility

- Every artifact has an explicit compatibility classification: upstream-native, Passport-specific, or deferred profile.
- Upstream-native examples pass the upstream structural and cryptographic verifier.
- Passport-specific messages do not claim upstream-native verification.
- Cross-specification terms and schemas agree.

### 16.6 Security and privacy

- Threat model covers malicious holder, issuer, verifier, resolver, storage provider, and network observer.
- Metadata disclosure is enumerated field by field.
- Offline and unavailable states are explicit.
- Replay, rollback, substitution, correlation, and confused-deputy cases have tests.
- Recovery and revocation claims do not exceed the evidence available to a verifier.

### 16.7 Status progression

The v2.0.0 document status progresses as follows:

```text
Design Draft -> Specification Draft -> Implementation Candidate -> Release Candidate -> Final
```

- **Specification Draft:** all blocking decisions resolved; schemas and vectors complete.
- **Implementation Candidate:** specification quality gate passes and independent security review findings are addressed.
- **Release Candidate:** at least two implementations pass the conformance vectors and interoperate.
- **Final:** operational and security sign-off is complete; no known normative contradiction remains.

The specification MUST NOT call itself a Release Candidate while its required vectors, repositories, or interoperability evidence are pending.

---

## 17. Ordered Rewrite Deliverables

1. This compatibility and normative-decisions baseline.
2. Passport v2.0.0 core protocol specification.
3. Passport v2.0.0 JSON Schemas and pinned JSON-LD context.
4. Disclosure Request and Passport Presentation state-machine specification.
5. Credential publication and selective-disclosure profile resolving OPEN-SD-01.
6. Credential status profile resolving OPEN-HEAD-01.
7. Normative vector source files and expected-output artifacts.
8. UX and Architecture Specification v2.0.0 aligned to the protocol.
9. Bootstrap Verification Profile v3.0.0 aligned to the credential model.
10. Specification exit review and implementation authorization record.

Deferred transparency, recovery, biometric, ZK, oracle, and external transport profiles follow only after the core specification reaches Implementation Candidate status.

---

## 18. Decision Summary

The core v2.0.0 model is:

```text
Immutable holder authority + evolving KeyDocument
                     |
                     +-- encrypted Mode 2 portfolio (holder storage/sync)
                     |
                     +-- ephemeral signed Passport Presentation
                              |
                              +-- issuer Credential Claim Resolution Manifest(s)
                              |      +-- public content, or
                              |      +-- complete Mode 3 disclosure package
                              |
                              +-- optional self-asserted fields

Verifier:
  request binding -> holder key -> credential integrity -> subject binding
  -> credential status -> issuer identity evidence -> local trust policy
```

The portfolio is private state. Credentials carry issuer provenance. Presentations carry holder consent. Verification reports evidence before policy. No public slot list or credential count is required.
