# HIRI Digital Passport Extension

## Compatibility-corrected core protocol

**Version:** 2.0.0 Working Draft 2  
**Date:** July 2026  
**Status:** Working Draft — not a conformance target  
**Supersedes:** No published specification  
**Design input:** `HIRI-Digital-Passport-Extension-v1_9_0.md`  
**Design control:** `HIRI-Passport-v2_0_0-Compatibility-and-Normative-Decisions.md`  
**Companion drafts:** `HIRI-Passport-UX-Architecture-Spec-v2_0_0-DRAFT.md`; `HIRI-Bootstrap-Verification-Profile-v3_0_0-DRAFT.md`

---

## Document Status

This document is the compatibility-corrected successor to the HIRI Digital Passport Extension v1.9.0 design draft. It deliberately changes the v1.9.0 artifact model where that model conflicts with HIRI Protocol v3.1.1 or HIRI Privacy & Confidentiality Extension v1.4.1.

This Working Draft defines an implementable Passport-Core surface for:

- a private, encrypted holder portfolio;
- public issuer credentials and persistent self-assertions;
- verifier-signed Disclosure Requests;
- holder-signed Passport Presentations;
- deterministic verification evidence and policy separation.

Selective credential disclosure is reserved for Passport-Interoperable and is not stable in this draft. The unresolved issues in Section 19 are normative blockers for Candidate Specification status. Examples marked `NON-NORMATIVE PLACEHOLDER` contain syntactically recognizable but cryptographically invalid hashes, keys, and signatures. They are not test vectors.

The companion UX v2.0.0 and BVP v3.0.0 Working Drafts apply this Core model to application behavior and BVS evidence. They do not expand Core conformance or resolve the Section 19 blockers.

### Compatibility baseline

This draft is pinned to:

| Dependency | Version or revision |
|------------|---------------------|
| HIRI repository | [`Skreen5hot/HIRI`](https://github.com/Skreen5hot/HIRI) |
| Reviewed commit | `009c145c9740188fc7a03b19c8ac2079bfe61cdb` |
| HIRI Protocol Specification | [3.1.1 at the reviewed commit](https://github.com/Skreen5hot/HIRI/blob/009c145c9740188fc7a03b19c8ac2079bfe61cdb/project/HIRI-Protocol-Spec-v3.1.1.md) |
| HIRI Privacy & Confidentiality Extension | [1.4.1 at the reviewed commit](https://github.com/Skreen5hot/HIRI/blob/009c145c9740188fc7a03b19c8ac2079bfe61cdb/project/HIRI-Privacy-Confidentiality-Extension-v1.4.1-FINAL.md) |
| JSON Canonicalization Scheme | [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) |
| Ed25519 | [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) |

An implementation claiming conformance to this draft is making a version-pinned claim. Compatibility with a later or differently revised HIRI specification requires a new compatibility review.

---

## 1. Conventions and Normative Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as described by BCP 14 when, and only when, they appear in uppercase.

Every normative statement introduced by this specification has a stable requirement identifier in square brackets. Requirements inherited from HIRI retain the semantics of the pinned upstream specification even when they are summarized here.

JSON object member names are case-sensitive. Unless a section says otherwise:

- timestamps are RFC 3339 UTC date-time strings with a trailing `Z`;
- byte strings are base64url without `=` padding;
- multibase values retain their multibase prefix;
- JSON messages are encoded as UTF-8;
- array order is significant;
- unknown members are rejected in cryptographically signed Passport messages.

The term **reject** means that the input does not produce successful verification. A verifier still returns a structured error when safe to do so.

---

## 2. Scope

### 2.1 In scope

Passport v2.0.0 defines:

- the encrypted portfolio plaintext schema;
- issuer Credential Claim content;
- persistent and ephemeral holder self-assertions;
- Disclosure Request and Passport Presentation schemas;
- request consent and replay binding;
- packaging of content-addressed artifacts for online or offline verification;
- holder-subject binding;
- provenance classification;
- credential-status evidence;
- a verification state machine;
- Passport conformance profiles.

### 2.2 Out of scope

Passport v2.0.0 does not define:

- a universal legal identity;
- whether a claim is true or legally effective;
- relying-party authorization policy;
- issuer accreditation or governance;
- network discovery, storage, or transport;
- key recovery after every authorized key is lost;
- biometric matching;
- unlinkable holder authorities;
- a revocation transparency log;
- OID4VP, DIDComm, BBS+, P-256, or post-quantum profiles.

### 2.3 Architectural boundary

[REQ-BOUNDARY-001] A Passport verifier **MUST** treat HIRI verification as evidence of artifact integrity, provenance, content binding, and key state; it **MUST NOT** interpret a valid signature alone as proof that a claim is true, legally effective, or issued by an organization acceptable to the relying party.

[REQ-BOUNDARY-002] Pure protocol computation **MUST** receive time, randomness, cryptography, storage, resolution, networking, and policy through injected inputs or interfaces. It **MUST NOT** perform implicit I/O.

[REQ-BOUNDARY-003] Policy evaluation **MUST** consume verification evidence without changing the recorded cryptographic result.

### 2.4 Passport-Core practical envelope

Passport-Core is deliberately narrow. Its issuer credential profile discloses the complete public Credential Claim and binds it to the holder's stable authority. It is appropriate for claims already intended for public inspection, such as professional licenses, public registrations, and public organizational roles.

Passport-Core does not provide claim-level confidentiality. Employment records, health information, government identity attributes, private education records, and similar sensitive claims are outside the practical public-credential envelope unless the holder knowingly authorizes disclosure of the complete claim. Passport-Interoperable selective disclosure remains blocked by OPEN-SD-01.

Credential status is not inherently always `unknown`. A verifier can report `active` when it has a fresh current head from a source configured as issuer-authoritative and all Section 14 checks succeed. Without that deployment-specific authority configuration, status is `unknown` until OPEN-HEAD-01 defines interoperable discovery and anti-rollback behavior.

[REQ-SCOPE-001] Product documentation and consent UI **MUST** state that a Passport-Core public credential is completely observable, persistently copyable, and linkable through `subjectHolderAuthority`.

[REQ-SCOPE-002] A Passport-Core implementation **MUST NOT** describe public Credential Claim presentation as field-level selective disclosure, even when the request names only a subset of fields.

[REQ-SCOPE-003] An application **MUST NOT** use the Core public profile for a claim whose acceptance policy requires undisclosed fields to remain confidential.

---

## 3. Terminology

| Term | Definition |
|------|------------|
| Holder | The HIRI authority that controls a portfolio and signs a presentation. |
| Portfolio | Holder-private wallet state stored as Mode 2 encrypted HIRI content. |
| Credential | An issuer-signed HIRI Resolution Manifest and its Credential Claim content. |
| Direct issuer | The authority that signs a Credential Claim. |
| BVS | A Bootstrap Verification Service acting as a direct issuer and recording how it obtained evidence. |
| Self-assertion | A claim signed by the holder rather than a third-party issuer. |
| Disclosure Request | A verifier-signed Passport message describing requested information and purposes. |
| Passport Presentation | A holder-signed Passport message responding to one Disclosure Request. |
| Presentation Package | A transport container carrying a presentation and zero or more content-addressed artifacts. |
| Provenance | The cryptographic origin class of a disclosed item. |
| Evidence | Facts produced by protocol verification before relying-party policy. |
| Acceptance | A relying party's decision after applying its policy to evidence. |
| Current head | The latest issuer-authoritative manifest version known for a stable credential URI. |
| Pinned context | A JSON-LD context whose exact payload is embedded or verified against a configured hash. |

The v1.9.0 terms *passport slot*, *phantom slot*, *presentation slot token*, and *Slot Blinding Key* have no wire representation in v2.0.0.

---

## 4. Protocol Architecture

The data flow is:

```text
Issuer or BVS                       Holder                         Verifier
     |                                 |                              |
     |-- signed Credential Claim ----->|                              |
     |                                 |-- encrypted local portfolio  |
     |                                 |                              |
     |                                 |<-- signed Disclosure Request-|
     |                                 |                              |
     |                                 |-- signed Presentation ------>|
     |                                 |   + referenced artifacts     |
     |                                 |                              |
     |<---------------- optional resolver fetches --------------------|
```

The portfolio helps the holder organize credentials. It is not a credential registry and does not add issuer trust. A presentation proves holder control and consent for that transaction. Each issuer credential independently supplies its issuer provenance and subject binding.

[REQ-ARCH-001] A verifier **MUST NOT** require proof that a disclosed credential was previously a member of the holder portfolio.

[REQ-ARCH-002] A presentation **MUST NOT** expose a portfolio manifest hash, portfolio URI, stable local slot identifier, total credential count, omitted-item count, withheld-item summary, or completeness proof.

[REQ-ARCH-003] Adding or removing a portfolio record **MUST NOT** change the cryptographic status of its referenced credential.

---

## 5. Authority and Key Lifecycle

### 5.1 Authority

Passport v2.0.0 inherits the normative HIRI v3.1.1 key authority:

```text
authority = "key:ed25519:" + base58btc(rawEd25519PublicKey)
```

The base58btc value includes its `z` multibase prefix. A valid raw public key is exactly 32 bytes.

[REQ-AUTH-001] Every normative Passport v2.0.0 holder, issuer, BVS, and verifier authority **MUST** be a HIRI v3.1.1 `key:ed25519:z...` authority.

[REQ-AUTH-002] An authority **MUST** remain pinned to its genesis public key through routine key rotation.

[REQ-AUTH-003] A Passport implementation **MUST NOT** derive a replacement holder authority or portfolio URI merely because the holder rotates an active key.

### 5.2 Verification methods

A verification method is a HIRI key URI controlled by the declared authority, for example:

```text
hiri://key:ed25519:z<authority-key>/key/main#key-2
```

[REQ-AUTH-004] A verifier **MUST** establish that the signing verification method was authorized for the declared authority at the relevant verification time, using the HIRI KeyDocument lifecycle rules.

[REQ-AUTH-005] When the genesis key itself is the signing key, a verifier **MUST** also confirm that its decoded public key derives the declared authority.

### 5.3 Rotation, revocation, and compromise

[REQ-KEY-001] Routine rotation **MUST** use the HIRI dual-signature rotation procedure and preserve the authority.

[REQ-KEY-002] A verifier **MUST** evaluate key activity temporally. It **MUST NOT** invalidate an earlier signature solely because a later routine rotation exists.

[REQ-KEY-003] A verifier **MUST** apply verified `manifestsInvalidAfter`, key-revocation, and compromise semantics from the issuer or holder KeyDocument.

[REQ-KEY-004] If required lifecycle evidence is unavailable or cannot be authenticated, the key state **MUST** be `unknown`; it **MUST NOT** be reported as `active` by default.

P-256, ML-DSA, biometric continuity, guardian recovery, and institutional recovery are not part of this core.

---

## 6. HIRI Artifact Requirements

### 6.1 Resolution Manifest inheritance

Portfolios, public credentials, and persistent self-assertions are ordinary HIRI Resolution Manifests. Passport does not redefine their base envelope.

[REQ-HIRI-001] Such an artifact **MUST** use `@type: "hiri:ResolutionManifest"` and satisfy the complete HIRI v3.1.1 manifest, content-addressing, signature, version-chain, and key-lifecycle rules.

[REQ-HIRI-002] `hiri:version` **MUST** be a JSON string containing a base-10 unsigned integer.

[REQ-HIRI-003] `hiri:content.canonicalization` and `hiri:signature.canonicalization` **MUST** be identical.

[REQ-HIRI-004] Passport-Core artifacts **MUST** use JCS canonicalization, `raw-sha256` content addressing, and `Ed25519Signature2020`.

[REQ-HIRI-005] A non-genesis version **MUST** contain the HIRI chain fields required by the upstream specification, and its predecessor relationship **MUST** verify.

[REQ-HIRI-006] `hiri:AttestationManifest` **MUST NOT** be used as the envelope for a portfolio, Credential Claim, BVS credential, persistent self-assertion, Disclosure Request, or Passport Presentation.

### 6.2 Context handling

[REQ-CONTEXT-001] A JSON-LD processor **MUST NOT** fetch an unknown remote context at verification time.

[REQ-CONTEXT-002] Every context used for URDNA2015 **MUST** be embedded or verified against a configured hash-pinned registry.

[REQ-CONTEXT-003] Until OPEN-CONTEXT-01 is resolved, Passport-Core **MUST** use JCS for Passport-defined content and messages; an implementation **MUST NOT** claim Passport-Interoperable conformance.

JCS treats `@context` as ordinary JSON data. Context closure remains necessary before URDNA2015 and cross-authority RDF processing can be a normative profile.

### 6.3 Schema handling

[REQ-SCHEMA-001] Passport v2.0.0 JSON Schemas **MUST** use JSON Schema Draft 2020-12 and **MUST** declare that dialect in `$schema`.

[REQ-SCHEMA-002] A schema document's `$id` **MUST** equal the absolute `schema` URI carried by the claim or request, and that URI **MUST NOT** contain a fragment.

[REQ-SCHEMA-003] A verifier **MUST** select a schema by the pair `(schema, schemaHash)`, not by URI alone.

[REQ-SCHEMA-004] Schema retrieval **MUST** use embedded, packaged, or hash-verified content. Runtime network retrieval **MUST NOT** be trusted until the retrieved JCS bytes match `schemaHash`.

[REQ-SCHEMA-005] Schema evaluation **MUST** enforce resource limits and **MUST NOT** resolve an unpinned remote `$ref`.

---

## 7. Encrypted Holder Portfolio

### 7.1 Stable identifier

The canonical portfolio URI is:

```text
hiri://<holder-authority>/data/passport-main
```

[REQ-PORTFOLIO-001] A canonical holder portfolio **MUST** use the holder authority as URI authority, `data` as the resource type, and `passport-main` as the identifier.

[REQ-PORTFOLIO-002] The portfolio publisher **MUST** equal the holder authority.

### 7.2 Privacy Mode 2 envelope

[REQ-PORTFOLIO-003] Portfolio content **MUST** use Privacy Extension v1.4.1 Mode 2 encrypted distribution with `hiri:privacy.mode: "encrypted"`.

[REQ-PORTFOLIO-004] A published portfolio envelope **MUST NOT** expose credential records, schemas, types, labels, issuers, credential references, record identifiers, or real or padded counts outside the ciphertext.

[REQ-PORTFOLIO-005] Portfolio encryption **MUST** use a fresh random 256-bit content-encryption key and fresh random 96-bit IV for every published version.

[REQ-PORTFOLIO-006] Portfolio ciphertext **MUST** be produced with AES-256-GCM and a 128-bit authentication tag appended in the upstream-defined form.

[REQ-PORTFOLIO-007] `plaintextHash` **MUST** bind the canonical plaintext, and `hiri:content.hash` **MUST** bind the complete ciphertext bytes.

[REQ-PORTFOLIO-008] Recipient key wrapping **MUST** follow Privacy Extension v1.4.1: X25519 shared secret, HKDF-SHA256 with the portfolio IV as salt and `UTF8("hiri-cek-v1.1") || UTF8(recipientId)` as info, followed by AES-GCM encryption of the content-encryption key under the derived key.

[REQ-PORTFOLIO-009] Every recipient `id` **MUST** be the canonical unpadded base64url encoding of exactly 16 fresh random bytes, **MUST** be unique within its manifest version, and **MUST NOT** be reused in another portfolio version.

[REQ-PORTFOLIO-009A] Recipient identifiers **MUST NOT** reveal device names, user-facing labels, account identifiers, or recipient roles.

[REQ-PORTFOLIO-009B] When a recipient does not receive its fresh ID out of band, it **MAY** attempt bounded key derivation and authenticated decryption against each recipient entry. An implementation **MUST** stop at its configured recipient-processing limit and **MUST NOT** expose decryption-attempt details as a remote oracle.

[REQ-PORTFOLIO-009C] A Passport-Core implementation **MUST** reject a portfolio manifest containing more than 64 recipient entries, including dummy entries.

The full Mode 2 algorithm remains defined by the upstream Privacy Extension; the summary above does not replace it.

### 7.3 Portfolio manifest shape

The following is a `NON-NORMATIVE PLACEHOLDER`. Omitted HIRI fields are permitted only when the upstream specification makes them optional.

```json
{
  "@context": [
    "https://hiri-protocol.org/spec/v3.1",
    "https://w3id.org/security/v2"
  ],
  "@id": "hiri://key:ed25519:zHOLDER/data/passport-main",
  "@type": "hiri:ResolutionManifest",
  "hiri:version": "1",
  "hiri:branch": "main",
  "hiri:timing": {
    "created": "2026-07-20T12:00:00Z"
  },
  "hiri:privacy": {
    "mode": "encrypted",
    "parameters": {
      "algorithm": "AES-256-GCM",
      "iv": "AAAAAAAAAAAAAAAA",
      "tagLength": 128,
      "plaintextHash": "sha256:PLACEHOLDER",
      "plaintextSize": 742,
      "plaintextFormat": "application/ld+json",
      "ephemeralPublicKey": "zPLACEHOLDER",
      "keyAgreement": "X25519-HKDF-SHA256",
      "recipients": [
        {
          "id": "EBESExQVFhcYGRobHB0eHw",
          "encryptedKey": "PLACEHOLDER"
        }
      ]
    }
  },
  "hiri:content": {
    "hash": "sha256:PLACEHOLDER",
    "addressing": "raw-sha256",
    "canonicalization": "JCS",
    "format": "application/octet-stream",
    "size": 758
  },
  "hiri:semantics": {
    "entailmentMode": "none"
  },
  "hiri:signature": {
    "type": "Ed25519Signature2020",
    "canonicalization": "JCS",
    "created": "2026-07-20T12:00:00Z",
    "verificationMethod": "hiri://key:ed25519:zHOLDER/key/main#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zPLACEHOLDER"
  }
}
```

### 7.4 Decrypted plaintext

The canonical JCS plaintext shape is:

```json
{
  "@context": "https://hiri.example/contexts/passport/v2",
  "@type": "hiri:passport:EncryptedPortfolio",
  "schemaVersion": "2.0",
  "holderAuthority": "key:ed25519:zHOLDER",
  "records": [
    {
      "recordId": "QUJDREVGR0hJSktMTU5PUA",
      "kind": "issuerCredential",
      "credential": {
        "uri": "hiri://key:ed25519:zISSUER/data/credential-ABEiM0RVZneImaq7zN3u_w",
        "manifestHash": "sha256:PLACEHOLDER"
      },
      "provenance": "direct-issuer",
      "addedAt": "2026-07-20T12:00:00Z",
      "local": {
        "label": "Professional license",
        "archived": false
      }
    }
  ]
}
```

[REQ-PORTFOLIO-010] The decrypted root object **MUST** have type `hiri:passport:EncryptedPortfolio`, `schemaVersion: "2.0"`, a `holderAuthority` equal to the portfolio authority, and a `records` array.

[REQ-PORTFOLIO-011] Each `recordId` **MUST** contain at least 128 bits generated by a cryptographically secure random source and **MUST** remain private to the encrypted portfolio.

[REQ-PORTFOLIO-012] Each issuer credential record **MUST** contain a stable credential URI and the specific manifest hash last accepted by the holder.

[REQ-PORTFOLIO-013] Local labels, archive flags, notes, and display metadata **MUST NOT** be treated as issuer-signed claim data.

[REQ-PORTFOLIO-014] Implementations **MUST** preserve unknown, well-formed record kinds when rewriting a portfolio unless the holder explicitly removes them.

### 7.5 Device membership and updates

[REQ-PORTFOLIO-015] Adding or removing a recipient **MUST** create a new portfolio manifest version, a new content-encryption key, a new IV, and new ciphertext.

[REQ-PORTFOLIO-016] Removing a recipient **MUST NOT** be represented as revoking that recipient's ability to read ciphertext it previously received; applications **MUST** communicate this limitation accurately.

[REQ-PORTFOLIO-017] Concurrent portfolio updates **MUST** be resolved before publication into one valid HIRI chain head. A Passport implementation **MUST NOT** silently discard a divergent record set.

[REQ-PORTFOLIO-018] A holder **MAY** keep the portfolio entirely local. Publication is not required before a credential can be presented.

---

## 8. Credential Claims

### 8.1 Direct issuer artifact

A direct issuer credential uses the stable URI:

```text
hiri://<issuer-authority>/data/credential-<opaque-id>
```

[REQ-CREDENTIAL-001] A direct issuer credential **MUST** be an issuer-signed `hiri:ResolutionManifest` whose URI authority and authorized signing verification method identify the same issuer authority.

[REQ-CREDENTIAL-002] The credential identifier **MUST** be opaque, **MUST** contain at least 128 bits of cryptographically secure randomness, and **MUST NOT** encode subject identity or credential type.

[REQ-CREDENTIAL-003] The credential content **MUST** have top-level type `hiri:passport:CredentialClaim`.

[REQ-CREDENTIAL-004] The content **MUST** include `schema`, `schemaHash`, `credentialType`, `subjectHolderAuthority`, `claims`, `issuanceDate`, and `status`.

[REQ-CREDENTIAL-005] `subjectHolderAuthority` **MUST** be a normative HIRI Ed25519 authority and **MUST** be part of the content bound by the issuer manifest.

[REQ-CREDENTIAL-006] An optional `validUntil` value **MUST** be later than `issuanceDate`.

[REQ-CREDENTIAL-006A] If `issuanceDate > evaluationTime + credentialIssuanceTolerance`, credential temporal validity **MUST** be `invalid` and protocol status **MUST** be `unknown`.

[REQ-CREDENTIAL-007] An optional `statusId` **MUST** be an issuer-scoped, opaque identifier and **MUST NOT** be assumed globally unique without the issuer authority.

[REQ-CREDENTIAL-007A] `schemaHash` **MUST** equal `sha256:` followed by the lowercase hexadecimal SHA-256 digest of the RFC 8785 JCS bytes of the identified JSON Schema document.

### 8.2 Public credential content

The following `NON-NORMATIVE PLACEHOLDER` demonstrates the required Resolution Manifest envelope. It is not a test vector:

```json
{
  "@context": [
    "https://hiri-protocol.org/spec/v3.1",
    "https://w3id.org/security/v2"
  ],
  "@id": "hiri://key:ed25519:zISSUER/data/credential-ABEiM0RVZneImaq7zN3u_w",
  "@type": "hiri:ResolutionManifest",
  "hiri:version": "1",
  "hiri:branch": "main",
  "hiri:timing": {
    "created": "2026-07-20T12:00:00Z"
  },
  "hiri:content": {
    "hash": "sha256:PLACEHOLDER",
    "addressing": "raw-sha256",
    "canonicalization": "JCS",
    "format": "application/ld+json",
    "size": 534
  },
  "hiri:semantics": {
    "entailmentMode": "none"
  },
  "hiri:signature": {
    "type": "Ed25519Signature2020",
    "canonicalization": "JCS",
    "created": "2026-07-20T12:00:00Z",
    "verificationMethod": "hiri://key:ed25519:zISSUER/key/main#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zPLACEHOLDER"
  }
}
```

Its public Credential Claim content is:

```json
{
  "@context": "https://hiri.example/contexts/passport/v2",
  "@type": "hiri:passport:CredentialClaim",
  "schema": "https://issuer.example/schemas/professional-license/v1",
  "schemaHash": "sha256:PLACEHOLDER",
  "credentialType": "ProfessionalLicenseCredential",
  "subjectHolderAuthority": "key:ed25519:zHOLDER",
  "claims": {
    "licenseType": "Professional Engineer",
    "licenseNumber": "PE-123456",
    "jurisdiction": "US-NY"
  },
  "issuanceDate": "2026-07-20T12:00:00Z",
  "validUntil": "2027-07-20T12:00:00Z",
  "statusId": "st-7X4mK9",
  "status": {
    "state": "active",
    "effectiveAt": "2026-07-20T12:00:00Z"
  }
}
```

[REQ-CREDENTIAL-008] Public credential content **MUST** be treated as publicly observable and linkable to `subjectHolderAuthority`. An issuer **MUST NOT** publish it until the issuance flow records the holder's explicit authorization for public publication; holder software **MUST** present that consequence without implying selective disclosure.

[REQ-CREDENTIAL-009] Passport-Core **MUST** verify public Credential Claims using the complete referenced manifest and content. A detached copy of `claims` without its manifest is insufficient.

[REQ-CREDENTIAL-009A] A verifier **MUST** validate the complete Credential Claim against the exact hash-pinned JSON Schema identified by `schema` and `schemaHash`. If that schema is unavailable, schema validation **MUST** be `unknown`, not `valid`.

### 8.3 Credential versioning and status content

An issuer changes the complete Credential Claim content at the same stable URI to update status or correct a claim. The following is only a status excerpt; it is not standalone Credential Claim content:

```json
{
  "status": {
    "state": "suspended",
    "effectiveAt": "2026-08-01T00:00:00Z",
    "reasonCode": "issuer-review"
  }
}
```

[REQ-CREDENTIAL-010] `status.state` **MUST** be one of `active`, `suspended`, `revoked`, or `superseded`.

[REQ-CREDENTIAL-011] `status.effectiveAt` **MUST** be part of the issuer-signed content. `reasonCode` **MAY** be omitted to avoid unnecessary disclosure.

[REQ-CREDENTIAL-011A] When `status` is present, `effectiveAt` **MUST** be a valid timestamp. Before that time, the new state **MUST NOT** take effect.

[REQ-CREDENTIAL-011B] The genesis credential's `status.effectiveAt` **MUST** equal `issuanceDate`. Every later status effective time **MUST NOT** precede `issuanceDate`.

[REQ-CREDENTIAL-012] An issuer **MUST** publish a new valid chain version to change its declared credential status; a mutable database flag outside the signed chain is not issuer-authenticated status evidence.

[REQ-CREDENTIAL-013] A verifier evaluating an older presented version **MUST** apply a verified restrictive state from the issuer-authoritative current head.

### 8.4 Bootstrap Verification Service

A BVS is a direct issuer. It asserts that it performed a described verification procedure; it does not impersonate the evidence source.

The concrete holder-binding transcript, evidence fields, adapter-profile boundary, and trust evaluation are defined by the companion `HIRI-Bootstrap-Verification-Profile-v3_0_0-DRAFT.md`. That Working Draft does not expand Passport-Core conformance.

[REQ-BVS-001] A BVS Credential Claim **MUST** identify the BVS authority as the direct issuer through the credential manifest.

[REQ-BVS-002] A BVS claim **MUST** include an `evidence` object with type `hiri:passport:BvsEvidence` containing, at minimum, `evidenceProfile`, `evidenceProfileHash`, `sourceProvider`, `sourceVerificationMethod`, `verifiedAt`, `adapterId`, and `adapterVersion`.

[REQ-BVS-003] If holder participation was proven with a challenge, `evidenceProfile` **MUST** identify a versioned profile that defines the exact challenge transcript, signature targets, authority binding, nonce, expiry, and proof validation algorithm; `evidenceProfileHash` **MUST** hash-pin that profile.

[REQ-BVS-004] One holder challenge **MUST NOT** authorize a different verification type unless the signed challenge explicitly enumerates that type.

[REQ-BVS-005] A verifier **MUST** evaluate BVS trust using the configured tuple `(BVS authority, source provider, source verification method, credential schema, jurisdiction, adapter version)`.

[REQ-BVS-006] A cryptographically valid BVS credential from an unconfigured BVS **MUST** be reported as `issuerTrust: "untrusted"` or `"unknown"`; it **MUST NOT** be silently discarded or mislabeled as cryptographically invalid.

[REQ-BVS-007] A verifier **MUST NOT** report the BVS verification procedure as validated when it does not implement or cannot hash-verify the identified evidence profile; issuer signature validity remains a separate result.

### 8.5 Selective credential profile

Passport-Interoperable selective credentials use the complete HIRI Privacy Mode 3 structure: issuer-published Resolution Manifest, URDNA2015 content, statement index, index root, disclosure proof suite, and recipient key distribution.

[REQ-SD-001] An implementation **MUST NOT** label a partial or proprietary statement list as HIRI Privacy Mode 3.

[REQ-SD-001A] A holder **MUST NOT** delegate the current `hiri-hmac-sd-2026` HMAC key to a Passport verifier. Possession of that key permits verification of any guessed statement and does not cryptographically enforce the requested subset.

[REQ-SD-002] Until OPEN-SD-01, OPEN-CONTEXT-01, and OPEN-TRANSPORT-01 are resolved, the selective credential profile **MUST NOT** be claimed as stable or conformant.

### 8.6 Privacy Mode 5

[REQ-ATTEST-001] Privacy Mode 5 **MAY** be used only when a third party attests to a property of a specific subject manifest/content version and both the attestor artifact and referenced subject artifact are verified according to the upstream extension.

[REQ-ATTEST-002] A Mode 5 `hiri:AttestationManifest` **MUST NOT** contain `hiri:content` and **MUST NOT** declare any privacy mode other than `attestation`.

[REQ-ATTEST-003] A Passport Mode 5 identifier **MUST** use `hiri://<attestor-authority>/data/attestation-<opaque-id>` and **MUST NOT** use the upstream example's `/attestation/<id>` path, which is absent from the pinned HIRI v3.1.1 URI grammar.

[REQ-ATTEST-004] Passport **MUST** report Mode 5 evidence as verified only when both the attestor manifest and the exact referenced subject manifest verify. An attestor-only result **MUST** be `unknown` or incomplete, not fully verified.

---

## 9. Self-Assertions

### 9.1 Persistent self-assertion

A persistent self-assertion is a holder-signed Resolution Manifest stored in the encrypted portfolio but not published by default. Its content uses type `hiri:passport:SelfAssertion`. The holder can deliver the complete manifest and content in a Presentation Package without first publishing either to a public resolver.

```json
{
  "@context": "https://hiri.example/contexts/passport/v2",
  "@type": "hiri:passport:SelfAssertion",
  "subjectHolderAuthority": "key:ed25519:zHOLDER",
  "schema": "https://hiri.example/schemas/contact/v1",
  "schemaHash": "sha256:PLACEHOLDER",
  "claims": {
    "preferredName": "Alex"
  },
  "assertedAt": "2026-07-20T12:00:00Z"
}
```

[REQ-SELF-001] A persistent self-assertion's manifest publisher and `subjectHolderAuthority` **MUST** equal the presentation holder authority.

[REQ-SELF-001A] Holder software **MUST** keep a persistent self-assertion unpublished by default and **MUST** store it within the encrypted portfolio or equivalent holder-controlled protected storage.

[REQ-SELF-001B] When disclosed, an unpublished persistent self-assertion **MAY** be delivered as a complete manifest-and-content pair in the Presentation Package. Package delivery **MUST NOT** be represented as publication into a HIRI resolver.

[REQ-SELF-001C] Before public publication, holder software **MUST** apply the same complete-content and stable-authority consequence disclosure required by REQ-CREDENTIAL-008.

[REQ-SELF-001D] A persistent self-assertion distributed with Privacy Mode 2 is readable only by configured Mode 2 recipients. It **MUST NOT** be presented as generally verifier-readable Core evidence unless the verifier is an authorized recipient or a separately specified disclosure profile applies.

[REQ-SELF-002] Its URI **MUST** use the holder authority, the `data` resource type, and an opaque identifier containing at least 128 random bits.

[REQ-SELF-003] A verifier **MUST** classify it as `self-asserted-persistent`; it **MUST NOT** classify it as direct-issuer or BVS evidence.

[REQ-SELF-003A] A persistent self-assertion's `schemaHash` **MUST** bind its JSON Schema as defined by REQ-CREDENTIAL-007A.

### 9.2 Ephemeral self-assertion

[REQ-SELF-004] An ephemeral self-assertion **MUST** appear only inside a Passport Presentation, **MUST** be covered by the holder presentation signature, and **MUST** be classified as `self-asserted-ephemeral`.

[REQ-SELF-005] A self-assertion **MUST NOT** be displayed as independently issuer-verified.

---

## 10. Common Passport Message Rules

Disclosure Requests and Passport Presentations are standalone Passport messages. They are not HIRI manifests and are not published into HIRI version chains.

### 10.1 Fixed protocol values

| Member | Required value |
|--------|----------------|
| `protocol` | `hiri-passport/2.0` |
| Request `type` | `DisclosureRequest` |
| Presentation `type` | `PassportPresentation` |
| `proof.type` | `Ed25519Signature2020` |
| `proof.canonicalization` | `JCS` |
| `proof.proofPurpose` | `authentication` |

[REQ-MSG-001] A signed Passport message **MUST** use the fixed values in this table and **MUST** be a JSON object without duplicate member names.

[REQ-MSG-002] A parser **MUST** reject a signed Passport message containing an unknown member at any schema-defined level. A future extension therefore requires a versioned schema or a member explicitly reserved by this specification.

[REQ-MSG-003] Every identifier described as a random ID **MUST** be the canonical base64url-without-padding encoding of exactly 16 independently generated random bytes. A verifier **MUST** decode and re-encode the value to enforce canonical encoding.

[REQ-MSG-004] Every nonce **MUST** be the canonical base64url-without-padding encoding of exactly 32 independently generated random bytes.

[REQ-MSG-005] Random bytes **MUST** come from a cryptographically secure random source supplied to the protocol operation.

### 10.2 Proof construction

The unsigned form of a Passport message is the complete message with only `proof.proofValue` absent. The `proof` object and every other member remain present.

[REQ-MSG-006] Before signing or verifying, an implementation **MUST** construct the unsigned form by removing only `proof.proofValue`; it **MUST NOT** remove the entire `proof` object or any proof metadata.

[REQ-MSG-007] The unsigned form **MUST** be canonicalized with RFC 8785 JCS and encoded as UTF-8.

[REQ-MSG-008] Ed25519 **MUST** sign the domain-separated bytes defined for that message directly, without an undocumented pre-hash or serialization wrapper.

[REQ-MSG-009] `proof.proofValue` **MUST** be the multibase base58btc encoding of exactly 64 Ed25519 signature bytes.

[REQ-MSG-010] `proof.created` **MUST** equal the message `createdAt` byte-for-byte.

[REQ-MSG-010A] Passport message `createdAt`, `expiresAt`, and `proof.created` values **MUST** use the exact UTC-seconds form `YYYY-MM-DDTHH:mm:ssZ` with a valid calendar date and no fractional seconds.

### 10.3 Time bounds

Protocol time is an injected verification input. `messageClockSkew` applies only to the live request/presentation exchange. `credentialIssuanceTolerance` applies only to an issuer credential's genesis `issuanceDate` and matching genesis `status.effectiveAt`; it does not move later suspension, revocation, supersession, or reactivation effective times.

[REQ-MSG-011] A Passport-Core verifier **MUST** reject a `messageClockSkew` greater than 120 seconds.

[REQ-MSG-011A] `credentialIssuanceTolerance` **MUST** be an explicit non-negative verifier-policy input, **MUST** default to zero, and **MUST NOT** exceed 300 seconds in Passport-Core.

[REQ-MSG-011B] A verifier **MUST** report the exact `messageClockSkew` and `credentialIssuanceTolerance` values used for verification.

[REQ-MSG-012] A message **MUST** satisfy `createdAt < expiresAt` and **MUST** be rejected when `createdAt > now + messageClockSkew` or `expiresAt < now - messageClockSkew`.

[REQ-MSG-013] Signed issuer claim timestamps **MUST** be evaluated byte-for-byte as encoded. An implementation **MUST NOT** round, smear, truncate, or rewrite one and then represent the changed value as the issuer-proven statement.

---

## 11. Disclosure Request

### 11.1 Schema

The following request is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "protocol": "hiri-passport/2.0",
  "type": "DisclosureRequest",
  "requestId": "ABEiM0RVZneImaq7zN3u_w",
  "verifier": {
    "authority": "key:ed25519:zVERIFIER",
    "verificationMethod": "hiri://key:ed25519:zVERIFIER/key/main#key-1",
    "display": {
      "name": "Example Verifier",
      "domain": "verifier.example"
    }
  },
  "credentialRequests": [
    {
      "requestItemId": "EBESExQVFhcYGRobHB0eHw",
      "schema": "https://issuer.example/schemas/professional-license/v1",
      "schemaHash": "sha256:PLACEHOLDER",
      "credentialType": "ProfessionalLicenseCredential",
      "acceptedDisclosureModes": ["public"],
      "required": true,
      "purpose": "Confirm an active professional license",
      "fields": [
        {
          "path": "/claims/licenseNumber",
          "required": true,
          "purpose": "Match the public license registration"
        }
      ]
    }
  ],
  "selfAssertionRequests": [],
  "nonce": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  "createdAt": "2026-07-20T12:00:00Z",
  "expiresAt": "2026-07-20T12:10:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "canonicalization": "JCS",
    "created": "2026-07-20T12:00:00Z",
    "verificationMethod": "hiri://key:ed25519:zVERIFIER/key/main#key-1",
    "proofPurpose": "authentication",
    "proofValue": "zPLACEHOLDER"
  }
}
```

The root members are closed and have these meanings:

| Member | Cardinality | Meaning |
|--------|-------------|---------|
| `protocol` | 1 | Fixed protocol identifier. |
| `type` | 1 | Fixed message type. |
| `requestId` | 1 | Random transaction identifier. |
| `verifier` | 1 | Verifier authority, method, and optional signed display hints. |
| `credentialRequests` | 1 | Array of zero or more credential requests. |
| `selfAssertionRequests` | 1 | Array of zero or more ephemeral self-assertion requests. |
| `nonce` | 1 | 32-byte replay and presentation-binding nonce. |
| `createdAt` | 1 | Request creation time. |
| `expiresAt` | 1 | Request expiry. |
| `keyAgreement` | 0..1 | Verifier transport key hint; no core confidentiality protocol is implied. |
| `proof` | 1 | Verifier authentication proof. |

[REQ-REQUEST-001] `verifier.authority` **MUST** be a normative HIRI Ed25519 authority, and both `verifier.verificationMethod` and `proof.verificationMethod` **MUST** be identical methods authorized by that authority.

[REQ-REQUEST-002] `verifier.display`, when present, **MUST** contain only `name` and optional `domain`. These values are signed display hints, not independent proof of organizational identity or domain control.

[REQ-REQUEST-003] A request **MUST** contain at least one entry across `credentialRequests` and `selfAssertionRequests`.

[REQ-REQUEST-004] `requestItemId` values **MUST** be random IDs and **MUST** be unique within the request.

[REQ-REQUEST-005] `schema` **MUST** be an absolute URI without a fragment, `schemaHash` **MUST** identify its JCS-canonical JSON Schema bytes as defined by REQ-CREDENTIAL-007A, `credentialType` **MUST** be a non-empty string, and each requested credential **MUST** contain a `required` Boolean, non-empty `purpose`, and at least one field request.

[REQ-REQUEST-005A] `acceptedDisclosureModes` **MUST** be a non-empty set with no duplicates. Passport-Core permits only `public`; a later conformant profile may add `selective`.

[REQ-REQUEST-006] A requested credential field `path` **MUST** be a valid RFC 6901 JSON Pointer rooted at `/claims`; array indexes and the `-` token are not permitted.

[REQ-REQUEST-007] Each credential field request **MUST** include its own non-empty `purpose` and `required` Boolean.

[REQ-REQUEST-008] A self-assertion request **MUST** contain `requestItemId`, absolute `schema`, `schemaHash`, `path`, non-empty `purpose`, and `required` Boolean. Its schema identifier and hash **MUST** satisfy REQ-REQUEST-005, and its `path` **MUST** be rooted at `/claims` and satisfy REQ-REQUEST-006.

[REQ-REQUEST-009] A request **MUST NOT** contain duplicate `(schema, schemaHash, credentialType, path)` credential requests or duplicate `(schema, schemaHash, path)` self-assertion requests.

[REQ-REQUEST-009A] When a credential request has `required: true`, one matching credential presentation **MUST** be present. When it is false, the credential presentation may be absent; if present, every field marked `required: true` within that item **MUST** still be satisfied.

[REQ-REQUEST-010] `expiresAt - createdAt` **MUST NOT** exceed 15 minutes.

[REQ-REQUEST-011] A `keyAgreement` hint, when present, **MUST** contain only `id`, `type: "X25519KeyAgreementKey2020"`, and an X25519 `publicKeyMultibase` that decodes to exactly 32 bytes. Its security use is transport-profile specific.

[REQ-REQUEST-011A] A request **MUST NOT** contain more than 64 total request items or more than 64 fields in one credential request.

[REQ-REQUEST-011B] A `purpose` **MUST** contain 1 through 512 Unicode scalar values and no C0 control or DEL character. Holder software **MUST** render it as untrusted plain text.

[REQ-REQUEST-011C] `verifier.display.name` **MUST** contain 1 through 128 Unicode scalar values. An optional `domain` **MUST** be a lowercase ASCII DNS name no longer than 253 characters; these limits do not turn either value into identity evidence.

### 11.2 Request signing target

The request signature input is:

```text
UTF8("HIRI-PASSPORT-DISCLOSURE-REQUEST-V2")
|| 0x00
|| JCS(unsignedRequest)
```

[REQ-REQUEST-012] Request signers and verifiers **MUST** use exactly this byte construction.

### 11.3 Holder validation and consent

[REQ-REQUEST-013] Before showing a consent decision, holder software **MUST** validate syntax, fixed values, identifier and nonce encoding, time bounds, proof construction, signature, and verifier control of the verification method.

[REQ-REQUEST-014] Holder software **MUST** reject a `(verifier.authority, requestId, nonce)` tuple already accepted within the replay-retention window.

[REQ-REQUEST-015] The replay tuple **MUST** be retained until at least `expiresAt + messageClockSkew`. A higher-assurance application **MAY** retain a non-reversible hash longer.

[REQ-REQUEST-016] Consent UI **MUST** present each requested field, its purpose, whether it is required, its provenance category when known, and the verifier identity evidence available to the application.

[REQ-REQUEST-017] Holder software **MUST** allow the holder to decline the entire request. It **MAY** permit omission of optional fields.

[REQ-REQUEST-018] Accepting a request authorizes only one presentation object bound to that exact request ID, nonce, and verifier authority. It **MUST NOT** authorize a later request or data not covered by an accepted disclosure mode.

---

## 12. Passport Presentation

### 12.1 Schema

The following presentation is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "protocol": "hiri-passport/2.0",
  "type": "PassportPresentation",
  "presentationId": "ISIjJCUmJygpKissLS4vMA",
  "holder": {
    "authority": "key:ed25519:zHOLDER",
    "verificationMethod": "hiri://key:ed25519:zHOLDER/key/main#key-2"
  },
  "requestBinding": {
    "requestId": "ABEiM0RVZneImaq7zN3u_w",
    "nonce": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
    "verifierAuthority": "key:ed25519:zVERIFIER"
  },
  "credentialPresentations": [
    {
      "presentationItemId": "MTIzNDU2Nzg5Ojs8PT4_QA",
      "requestItemId": "EBESExQVFhcYGRobHB0eHw",
      "provenance": "direct-issuer",
      "disclosureMode": "public",
      "credentialRef": {
        "uri": "hiri://key:ed25519:zISSUER/data/credential-ABEiM0RVZneImaq7zN3u_w",
        "manifestHash": "sha256:PLACEHOLDER",
        "contentHash": "sha256:PLACEHOLDER"
      }
    }
  ],
  "selfAssertions": [],
  "createdAt": "2026-07-20T12:01:00Z",
  "expiresAt": "2026-07-20T12:06:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "canonicalization": "JCS",
    "created": "2026-07-20T12:01:00Z",
    "verificationMethod": "hiri://key:ed25519:zHOLDER/key/main#key-2",
    "proofPurpose": "authentication",
    "proofValue": "zPLACEHOLDER"
  }
}
```

[REQ-PRESENT-001] `presentationId` and every `presentationItemId` **MUST** be independently generated random IDs.

[REQ-PRESENT-001A] `presentationItemId` values **MUST** be unique across both `credentialPresentations` and `selfAssertions`.

[REQ-PRESENT-002] `holder.authority` **MUST** be a normative HIRI Ed25519 authority, and both `holder.verificationMethod` and `proof.verificationMethod` **MUST** be identical methods authorized by that authority.

[REQ-PRESENT-003] `requestBinding` **MUST** copy the accepted request's `requestId`, `nonce`, and `verifier.authority` byte-for-byte.

[REQ-PRESENT-004] `expiresAt` **MUST NOT** be later than either the request expiry or five minutes after presentation creation.

[REQ-PRESENT-005] A `requestItemId` **MUST** identify an item in the bound request, and it **MUST NOT** occur more than once in the presentation.

[REQ-PRESENT-006] A presentation **MUST** satisfy every required request item. It **MUST NOT** contain an unrequested credential or self-assertion, or data beyond what the request's accepted disclosure mode necessarily exposes.

[REQ-PRESENT-007] Omitted optional items **MUST** be represented by absence. A presentation **MUST NOT** include a count or description of omitted holder data.

### 12.2 Public credential presentation

[REQ-PRESENT-008] A public `credentialRef` **MUST** contain the stable credential URI, the exact HIRI manifest hash presented, and the content hash declared by that manifest.

[REQ-PRESENT-009] `provenance` **MUST** be one of `direct-issuer`, `bvs`, or `self-asserted-persistent` and **MUST** agree with the verified artifact class. Sender-supplied provenance is a claim to check, not authoritative evidence.

[REQ-PRESENT-010] `disclosureMode: "public"` **MUST** disclose the complete Credential Claim content referenced by `contentHash`. Field-level omission from a public JCS credential is not selective disclosure.

[REQ-PRESENT-010A] `disclosureMode` **MUST** be a member of the corresponding request item's `acceptedDisclosureModes`.

[REQ-PRESENT-010B] The verified Credential Claim's `schema`, `schemaHash`, and `credentialType` **MUST** equal the corresponding request item values byte-for-byte.

[REQ-PRESENT-011] A verifier **MUST NOT** accept an extracted subset of a public credential as issuer-signed unless it also receives and verifies a separately issuer-signed artifact that binds that subset.

### 12.3 Ephemeral self-assertion shape

An ephemeral assertion has this closed shape:

```json
{
  "presentationItemId": "QUJDREVGR0hJSktMTU5PUA",
  "requestItemId": "UVJTVFVWV1hZWltcXV5fYA",
  "provenance": "self-asserted-ephemeral",
  "schema": "https://hiri.example/schemas/contact/v1",
  "schemaHash": "sha256:PLACEHOLDER",
  "claims": {
    "preferredName": "Alex"
  }
}
```

[REQ-PRESENT-012] An ephemeral assertion's `schema`, `schemaHash`, and disclosed claim path **MUST** match its request item, and its `provenance` **MUST** equal `self-asserted-ephemeral`.

[REQ-PRESENT-013] The holder signature **MUST** cover the complete ephemeral assertion value.

### 12.4 Presentation signing target

The presentation signature input is:

```text
UTF8("HIRI-PASSPORT-PRESENTATION-V2")
|| 0x00
|| JCS(unsignedPresentation)
```

[REQ-PRESENT-014] Presentation signers and verifiers **MUST** use exactly this byte construction.

[REQ-PRESENT-015] A holder **MUST** create at most one presentation object for one accepted request tuple unless the verifier issues a new request and nonce. It **MAY** retransmit the byte-identical signed presentation when delivery acknowledgement is unavailable; it **MUST NOT** create a different response under the same accepted tuple.

### 12.5 Linkability

A stable holder authority makes presentations linkable when disclosed to the same or colluding verifiers. Fresh presentation IDs prevent message reuse from becoming an additional stable handle, but do not make the holder anonymous.

[REQ-PRESENT-016] Implementations **MUST NOT** describe a presentation as unlinkable or anonymous merely because it uses fresh `presentationId` and `presentationItemId` values.

[REQ-PRESENT-017] Stable portfolio `recordId` values **MUST NOT** appear in a request, presentation, presentation package, verifier log, or analytics event.

---

## 13. Presentation Package and Artifact Resolution

### 13.1 Transport container

A Presentation Package is an unsigned transport container. Its `presentation` is signed; its artifacts are independently content-addressed and referenced by the signed presentation.

```json
{
  "protocol": "hiri-passport/2.0",
  "type": "PassportPresentationPackage",
  "presentation": {},
  "artifacts": [
    {
      "kind": "hiriManifest",
      "manifestHash": "sha256:PLACEHOLDER",
      "value": {}
    },
    {
      "kind": "jsonContent",
      "contentHash": "sha256:PLACEHOLDER",
      "canonicalization": "JCS",
      "value": {}
    },
    {
      "kind": "jsonSchema",
      "schema": "https://issuer.example/schemas/professional-license/v1",
      "schemaHash": "sha256:PLACEHOLDER",
      "canonicalization": "JCS",
      "value": {}
    }
  ]
}
```

[REQ-PACKAGE-001] A package **MUST** contain exactly one Passport Presentation and an `artifacts` array, which may be empty when every artifact will be resolved externally.

[REQ-PACKAGE-002] A package **MUST NOT** be treated as signed merely because its contained presentation is signed.

[REQ-PACKAGE-003] Before using an artifact, a verifier **MUST** recompute its declared HIRI manifest or content hash and match that hash to a reference covered by the presentation or a verified manifest.

[REQ-PACKAGE-004] Duplicate artifact hashes with byte-distinct values **MUST** cause rejection.

[REQ-PACKAGE-005] An unreferenced artifact **MUST** be ignored for verification and **MUST NOT** affect policy results.

[REQ-PACKAGE-005A] A JSON Schema artifact **MUST** be canonicalized with JCS and match the signed or requested `schemaHash` before it is used for validation. A mutable response fetched only by schema URL **MUST NOT** override a hash-pinned schema.

### 13.2 Resolution inputs

An application may supply artifacts from the package, an authenticated cache, local storage, or a resolver. The verification kernel receives all candidates with provenance metadata.

[REQ-PACKAGE-006] Artifact retrieval provenance **MUST** record at least `source`, `retrievedAt`, and whether transport authentication was established.

[REQ-PACKAGE-007] Transport authentication **MUST NOT** replace artifact signature, hash, chain, or authority verification.

[REQ-PACKAGE-008] When the package lacks a required artifact and no resolver supplies it, the affected phase **MUST** return `unknown` with a specific missing-evidence error; it **MUST NOT** synthesize an active or valid result.

### 13.3 Resource limits

[REQ-PACKAGE-009] Before recursive verification, an implementation **MUST** enforce configured limits on package bytes, artifact count, JSON depth, string length, and chain depth.

[REQ-PACKAGE-010] Passport-Core default acceptance limits **MUST NOT** exceed 10 MiB package bytes, 128 artifacts, JSON depth 64, individual string length 1 MiB, or chain depth 1,024.

[REQ-PACKAGE-011] A resource-limit failure **MUST** be distinguishable from an invalid signature or hash.

---

## 14. Credential Status

### 14.1 Evidence inputs

Status is derived from authenticated issuer evidence, not from holder portfolio state. The verifier attempts to obtain:

1. the exact presented manifest and content;
2. the issuer-authoritative current head for the stable credential URI;
3. the chain path connecting the presented version to the current head;
4. the issuer KeyDocument and relevant lifecycle history;
5. an injected evaluation time.

[REQ-STATUS-001] A resolver result **MUST** state whether the source is configured as issuer-authoritative for the credential URI and **MUST** include retrieval time and cache provenance.

[REQ-STATUS-002] A value from a non-authoritative resolver or holder-supplied package **MUST NOT** by itself establish that a manifest is the current head.

[REQ-STATUS-003] A verifier **MUST** verify every manifest signature, content hash, and required predecessor link used to establish status.

### 14.2 Status algorithm

The protocol status enum is:

```text
active | suspended | revoked | expired | superseded | unknown
```

For the algorithm below, `issuerState` is selected from the verified chain path ending at the current head. The genesis `active` status may be treated as effective when `status.effectiveAt <= evaluationTime + credentialIssuanceTolerance`. Every non-genesis status transition uses its exact signed effective time without this tolerance. Among effective versions, select the status with the greatest `effectiveAt`; when effective times are equal, select the status from the greatest manifest version. If no status is yet effective, the credential is not yet valid.

[REQ-STATUS-004] If no issuer-authoritative current head is available, or if its signature, chain, content, key lifecycle, freshness, or relationship to the presented version cannot be established, status **MUST** be `unknown`.

[REQ-STATUS-005] If the presented version is not the current head and is not a verified ancestor of it, status **MUST** be `unknown`, and the verifier **MUST** report `CREDENTIAL_NOT_IN_CURRENT_CHAIN`.

[REQ-STATUS-005A] If no status in the verified current chain is effective under the rule above, credential temporal validity **MUST** be `invalid`, status **MUST** be `unknown`, and the verifier **MUST** report `CREDENTIAL_NOT_YET_VALID`.

[REQ-STATUS-006] If the verified `issuerState` is `revoked`, status **MUST** be `revoked`.

[REQ-STATUS-006A] Once a `revoked` or `superseded` state becomes effective in a credential chain, a descendant version **MUST NOT** restore that stable credential URI to `active` or `suspended`. A replacement claim requires a new credential URI; a violating chain produces `unknown` status and `STATUS_TRANSITION_INVALID`.

[REQ-STATUS-007] Otherwise, if the verified `issuerState` is `suspended`, status **MUST** be `suspended`.

[REQ-STATUS-008] Otherwise, if the current head's signed `validUntil` is equal to or earlier than the evaluation time, status **MUST** be `expired`.

[REQ-STATUS-009] Otherwise, if the verified `issuerState` is `superseded`, or the presented version is a verified ancestor rather than the current head, status **MUST** be `superseded`.

[REQ-STATUS-010] Status **MUST** be `active` only when the presented version is the issuer-authoritative current head, `issuerState` is `active`, its validity interval includes the evaluation time, and issuer key state is valid for the relevant signatures.

The precedence is therefore:

```text
unknown evidence
  > revoked
  > suspended
  > expired
  > superseded
  > active
```

“Unknown evidence” has first precedence because unauthenticated or incomplete evidence cannot safely establish any issuer state.

### 14.3 Cached and offline evidence

[REQ-STATUS-011] A status result based on a cached head **MUST** include `headRetrievedAt`, `headManifestHash`, `source`, and `freshnessSeconds`.

[REQ-STATUS-012] An application profile **MUST** configure a maximum status age per credential risk class. Once that age is exceeded, the protocol status **MUST** be `unknown`.

[REQ-STATUS-013] Network or resolver failure **MUST NOT** be interpreted as proof of `active` status.

[REQ-STATUS-014] Relying-party policy **MAY** accept `unknown` for a low-risk transaction, but the recorded protocol status **MUST** remain `unknown`.

### 14.4 Transparency services

[REQ-STATUS-015] Passport-Core **MUST NOT** claim cryptographic non-revocation from the v1.9.0 transparency-log construction.

A future profile needs separate issuer statements and log receipts, append-only consistency proofs, cryptographic non-inclusion, domain-separated tree hashing, privacy analysis, and complete fixed vectors.

---

## 15. Verification State Machine

Verification is a pure transformation:

```text
verifyPassport(inputPackage, acceptedRequest, evidenceInputs, policy, verificationParameters, now)
  -> VerificationReport
```

The engine runs five evidence phases. A failure may prevent dependent checks, but it does not erase completed evidence.

### 15.1 Common result values

Evidence checks use:

```text
valid | invalid | unknown | not-applicable
```

[REQ-VERIFY-001] `invalid` **MUST** mean that available authenticated input contradicts a protocol requirement. `unknown` **MUST** mean that required evidence is absent, stale, unsupported, or could not be authenticated.

[REQ-VERIFY-002] A verification engine **MUST NOT** convert `unknown` to `valid` because policy permits proceeding.

### 15.2 Phase R — Request

Phase R verifies:

- closed-schema parsing and fixed values;
- request ID and nonce encoding;
- request time bounds;
- verifier authority and verification-method binding;
- request signature;
- replay state;
- presentation request ID, nonce, and verifier binding;
- requested and required item correspondence.

[REQ-VERIFY-R-001] Phase R **MUST** be `invalid` if either message does not bind the exact same request ID, nonce, or verifier authority.

[REQ-VERIFY-R-002] Phase R **MUST** expose separate results for request signature, request freshness, replay, and presentation binding.

### 15.3 Phase H — Holder

Phase H verifies:

- presentation schema and proof construction;
- presentation time bounds;
- holder authority derivation;
- holder verification-method authorization;
- holder signature and temporal key state.

[REQ-VERIFY-H-001] Phase H **MUST** be `invalid` if the holder signature is invalid or the signing key was not authorized for the declared holder at presentation time.

[REQ-VERIFY-H-002] If the necessary holder lifecycle document cannot be authenticated, the holder key-state result **MUST** be `unknown`.

### 15.4 Phase C — Credential

Phase C runs independently for each credential presentation and verifies:

- referenced manifest hash;
- complete HIRI manifest structure and signature;
- content hash and canonicalization;
- issuer URI-authority binding;
- Credential Claim schema;
- holder-subject equality;
- disclosure-mode rules;
- current chain and status evidence;
- provenance classification.

[REQ-VERIFY-C-001] The verified `subjectHolderAuthority` **MUST** equal `presentation.holder.authority` byte-for-byte.

[REQ-VERIFY-C-002] A mismatch in holder-subject binding **MUST** produce `invalid`, not `unknown`.

[REQ-VERIFY-C-003] Each credential result **MUST** identify the exact manifest hash and content hash that were verified.

[REQ-VERIFY-C-004] One invalid credential **MUST NOT** cause evidence for other credentials to be omitted from the report.

[REQ-VERIFY-C-005] Required requested fields **MUST** be matched to verified claim paths and values; display metadata or unsigned package members **MUST NOT** satisfy a request.

[REQ-VERIFY-C-006] A credential result's `result` **MUST** summarize required cryptographic and schema checks only. Issuer identity, current status, and policy **MUST** remain separately reportable even when `result` is `valid`.

### 15.5 Phase I — Issuer identity

Phase I evaluates identity anchors separately from signatures. Candidate anchors include configured authority allowlists, a pinned registry, authenticated domain control, contractual enrollment, or a separately verified Mode 5 attestation.

[REQ-VERIFY-I-001] A valid credential signature **MUST** establish only control by the cryptographic issuer authority; organizational identity **MUST** be a separate evidence field.

[REQ-VERIFY-I-002] Issuer identity evidence **MUST** include its anchor type, source, capture time, and verification result.

[REQ-VERIFY-I-003] Absence of an identity anchor **MUST** produce `issuerIdentity: "unknown"`; it **MUST NOT** make the issuer signature invalid.

### 15.6 Phase P — Policy

Phase P consumes Phases R, H, C, and I plus an explicit relying-party policy.

[REQ-VERIFY-P-001] Policy output **MUST** be one of `accepted`, `rejected`, or `not-evaluated` and **MUST** identify the policy ID and version when evaluated.

[REQ-VERIFY-P-002] Every policy reason **MUST** reference one or more evidence paths or explicit policy predicates.

[REQ-VERIFY-P-003] The report **MUST NOT** contain an ambiguous aggregate such as `overallTrustLevel` that hides whether failure arose from cryptography, status, identity, or policy.

### 15.7 Verification report

The following is an abbreviated shape. Machine-readable schemas are a Candidate Specification deliverable.

```json
{
  "protocol": "hiri-passport/2.0",
  "type": "PassportVerificationReport",
  "verifiedAt": "2026-07-20T12:02:00Z",
  "verificationParameters": {
    "messageClockSkewSeconds": 120,
    "credentialIssuanceToleranceSeconds": 0
  },
  "request": {
    "result": "valid",
    "signature": "valid",
    "freshness": "valid",
    "replay": "valid",
    "presentationBinding": "valid"
  },
  "holder": {
    "result": "valid",
    "authority": "key:ed25519:zHOLDER",
    "signature": "valid",
    "keyState": "valid"
  },
  "credentials": [
    {
      "presentationItemId": "MTIzNDU2Nzg5Ojs8PT4_QA",
      "result": "valid",
      "artifactIntegrity": "valid",
      "issuerSignature": "valid",
      "subjectBinding": "valid",
      "status": "active",
      "provenance": "direct-issuer",
      "issuerIdentity": "unknown",
      "manifestHash": "sha256:PLACEHOLDER",
      "contentHash": "sha256:PLACEHOLDER",
      "errors": []
    }
  ],
  "selfAssertions": [],
  "policy": {
    "result": "not-evaluated"
  },
  "errors": []
}
```

This example assumes that a configured issuer-authoritative resolver supplied the fresh current head, making `status: "active"` reachable. `issuerIdentity: "unknown"` separately means that no accepted real-world organizational identity anchor was available; it does not contradict current-head authoritativeness.

[REQ-REPORT-001] A report **MUST** include the injected verification time, Phase R evidence, Phase H evidence, one evidence result per disclosed credential or self-assertion, Phase P output, and structured errors.

[REQ-REPORT-002] Credential results **MUST** use the verified provenance vocabulary: `direct-issuer`, `bvs`, `self-asserted-persistent`, or `self-asserted-ephemeral`.

[REQ-REPORT-003] The overall cryptographic disposition, if an API exposes one, **MUST** be `invalid` when any required cryptographic check is invalid, `unknown` when none is invalid but a required check is unknown, and `valid` only when all required checks are valid.

[REQ-REPORT-004] Policy acceptance **MUST NOT** overwrite or rename that cryptographic disposition.

---

## 16. Error Registry

Errors have a stable code, phase, JSON Pointer or artifact reference where applicable, and a safe human-readable description. Implementations may attach private diagnostics, but protocol-facing descriptions do not echo secrets or attacker-controlled content.

The following table is normative. “Transition” names the exact evidence-state change caused by the condition. Completed independent checks remain in the report and are not overwritten by the transition.

| Code | Phase | Condition | Exact transition | Raised by |
|------|-------|-----------|------------------|-----------|
| `MESSAGE_MALFORMED` | R/H | JSON parsing fails, or structural type/cardinality validation fails without a more specific registry condition. | Affected phase `result = invalid`. | `REQ-MSG-001` |
| `UNSUPPORTED_PROTOCOL` | R/H | `protocol` or root `type` is not a supported fixed value. | Affected phase `result = invalid`. | `REQ-MSG-001` |
| `UNKNOWN_MEMBER` | R/H | A signed Passport message contains an unrecognized member. | Affected phase `result = invalid`. | `REQ-MSG-002` |
| `IDENTIFIER_INVALID` | R/H | A required random ID is non-canonical, wrong length, reused where uniqueness is required, or duplicated. | Identifier check and affected phase `result = invalid`. | `REQ-MSG-003`, `REQ-REQUEST-004`, `REQ-PRESENT-001`, `REQ-PRESENT-001A` |
| `NONCE_INVALID` | R | Request nonce is non-canonical or not 32 bytes. | Request nonce check and Phase R `result = invalid`. | `REQ-MSG-004` |
| `MESSAGE_NOT_YET_VALID` | R/H | `createdAt > now + messageClockSkew`. | `freshness = invalid`; affected phase `result = invalid`. | `REQ-MSG-012` |
| `MESSAGE_EXPIRED` | R/H | `expiresAt < now - messageClockSkew`. | `freshness = invalid`; affected phase `result = invalid`. | `REQ-MSG-012` |
| `LIFETIME_EXCEEDED` | R/H | Request or presentation signed lifetime exceeds its maximum. | `freshness = invalid`; affected phase `result = invalid`. | `REQ-REQUEST-010`, `REQ-PRESENT-004` |
| `SIGNATURE_INVALID` | R/H/C | An applicable Ed25519 signature does not verify over its exact target. | `signature = invalid`; affected request, holder, or credential `result = invalid`. | `REQ-REQUEST-012`, `REQ-REQUEST-013`, `REQ-PRESENT-014`, `REQ-VERIFY-H-001`, `REQ-HIRI-001` |
| `SIGNATURE_METHOD_UNAUTHORIZED` | R/H/C | Signing method is not authorized for the declared authority at the required time. | `methodAuthorization = invalid`; affected request, holder, or credential `result = invalid`. | `REQ-AUTH-004`, `REQ-REQUEST-001`, `REQ-PRESENT-002`, `REQ-CREDENTIAL-001` |
| `KEY_STATE_UNKNOWN` | R/H/C | Required authenticated lifecycle evidence is unavailable. | `keyState = unknown`; dependent result becomes `unknown` unless another check is already `invalid`. | `REQ-KEY-004`, `REQ-VERIFY-H-002` |
| `REQUEST_REPLAYED` | R | Accepted request tuple already exists in replay state. | `replay = invalid`; Phase R `result = invalid`. | `REQ-REQUEST-014` |
| `REQUEST_BINDING_MISMATCH` | R | Presentation differs from the accepted request ID, nonce, or verifier authority. | `presentationBinding = invalid`; Phase R `result = invalid`. | `REQ-PRESENT-003`, `REQ-VERIFY-R-001` |
| `REQUIRED_ITEM_MISSING` | R | A required request item lacks a matching valid response. | `requiredItems = invalid`; Phase R `result = invalid`. | `REQ-REQUEST-009A`, `REQ-PRESENT-006` |
| `UNREQUESTED_DISCLOSURE` | R | Presentation contains data not covered by the accepted request and disclosure mode. | `requestedItems = invalid`; Phase R `result = invalid`. | `REQ-PRESENT-006` |
| `ARTIFACT_MISSING` | C | Referenced credential manifest, content, or hash-pinned schema is unavailable. | Affected artifact check and credential `result = unknown`. | `REQ-PACKAGE-008`, `REQ-CREDENTIAL-009A` |
| `ARTIFACT_HASH_MISMATCH` | C | Artifact bytes do not match their declared or signed hash. | `artifactIntegrity = invalid`; credential `result = invalid`. | `REQ-PACKAGE-003`, `REQ-PACKAGE-005A` |
| `HIRI_MANIFEST_INVALID` | C | Upstream manifest structure, profile symmetry, signature construction, or content declaration fails. | `artifactIntegrity = invalid`; credential `result = invalid`. | `REQ-HIRI-001`, `REQ-HIRI-002`, `REQ-HIRI-003`, `REQ-HIRI-004` |
| `HIRI_CHAIN_INVALID` | C | A required predecessor relationship or chain link fails. | `chain = invalid`; credential `result = invalid` and status `unknown`. | `REQ-HIRI-005`, `REQ-STATUS-003` |
| `CREDENTIAL_SCHEMA_INVALID` | C | Available hash-pinned schema rejects the complete Credential Claim. | `schemaValidation = invalid`; credential `result = invalid`. | `REQ-CREDENTIAL-009A` |
| `CREDENTIAL_NOT_YET_VALID` | C | Issuance or genesis active time exceeds the permitted evaluation boundary. | `temporalValidity = invalid`; status `unknown`. | `REQ-CREDENTIAL-006A`, `REQ-STATUS-005A` |
| `SUBJECT_BINDING_MISMATCH` | C | Verified subject authority differs from presentation holder authority. | `subjectBinding = invalid`; credential `result = invalid`. | `REQ-VERIFY-C-001`, `REQ-VERIFY-C-002` |
| `CREDENTIAL_NOT_IN_CURRENT_CHAIN` | C | Presented version is neither current head nor its verified ancestor. | Status `unknown`; completed artifact checks remain unchanged. | `REQ-STATUS-005` |
| `STATUS_TRANSITION_INVALID` | C | A descendant restores a terminal revoked or superseded URI. | Status `unknown`; status-chain check `invalid`. | `REQ-STATUS-006A` |
| `CURRENT_HEAD_UNKNOWN` | C | No fresh issuer-authoritative current head can be authenticated. | Status `unknown`; credential cryptographic result remains independently computed. | `REQ-STATUS-004`, `REQ-STATUS-013` |
| `DISCLOSURE_MODE_UNSUPPORTED` | R/C | Requested or presented disclosure suite is recognized but not implemented or stable. | `disclosureCheck = unknown`; the containing request or credential `result = unknown`. | `REQ-REQUEST-005A`, `REQ-SD-002` |
| `PROVENANCE_MISMATCH` | C/I | Sender-supplied provenance differs from verified artifact class. | `provenance = invalid`; affected credential result `invalid`. | `REQ-PRESENT-009` |
| `ISSUER_IDENTITY_UNKNOWN` | I | No accepted organizational identity anchor is available. | `issuerIdentity = unknown`; issuer signature result remains unchanged. | `REQ-VERIFY-I-003` |
| `BVS_POLICY_UNTRUSTED` | I/P | Verified BVS tuple is absent from or rejected by relying-party trust policy. | `issuerTrust = untrusted`; policy evaluates that evidence explicitly. | `REQ-BVS-005`, `REQ-BVS-006` |
| `RESOURCE_LIMIT_EXCEEDED` | Any | A configured recipient, package, artifact, schema, canonicalization, or chain bound is exceeded. | Affected branch stops with `result = unknown`; completed independent evidence remains. | `REQ-PORTFOLIO-009C`, `REQ-SCHEMA-005`, `REQ-PACKAGE-009`, `REQ-PACKAGE-010`, `REQ-PACKAGE-011` |
| `POLICY_REJECTED` | P | Verified evidence fails an explicit policy predicate. | `policy.result = rejected`; evidence phases remain unchanged. | `REQ-VERIFY-P-001`, `REQ-VERIFY-P-002` |

[REQ-ERROR-001] Implementations **MUST** use these codes for the corresponding conditions and **MAY** define namespaced extension codes that cannot collide with this registry.

[REQ-ERROR-002] An error caused by absent evidence **MUST NOT** use a code that asserts cryptographic invalidity.

[REQ-ERROR-003] Public error text and telemetry **MUST NOT** include decrypted portfolio records, undisclosed claims, private keys, content-encryption keys, nonces beyond operational necessity, or delegated selective-disclosure material.

[REQ-ERROR-004] The normative test suite **MUST** contain at least one vector that triggers each registry row's condition and asserts its exact transition without erasing independent evidence.

[REQ-ERROR-005] When a specific registry condition applies, an implementation **MUST** emit that specific code and **MUST NOT** also emit `MESSAGE_MALFORMED` for the same underlying condition. `MESSAGE_MALFORMED` is the structural fallback code.

---

## 17. Security and Privacy Considerations

### 17.1 Threat model

Passport-Core assumes Ed25519, SHA-256, AES-256-GCM, X25519, HKDF-SHA256, RFC 8785 JCS, and the platform cryptographic random source behave as specified. Attackers may control transports, resolvers not explicitly trusted as authoritative, malformed packages, stale artifacts, and verifier display strings. Issuers, holders, BVS operators, and relying parties may be malicious or compromised.

### 17.2 Data minimization

[REQ-SEC-001] A holder **MUST** disclose only data authorized by the bound request and its accepted disclosure mode. For `public`, authorization covers the complete Credential Claim; holder software **MUST** obtain explicit consent after showing that consequence.

[REQ-SEC-002] A verifier **MUST NOT** infer portfolio completeness from presentation contents or treat absent optional information as false.

[REQ-SEC-003] Holder software **MUST** clearly distinguish public credentials, which disclose complete signed content in Passport-Core, from future selective credentials.

### 17.3 Replay and substitution

[REQ-SEC-004] Request nonce, request ID, verifier authority, presentation ID, holder authority, disclosed references, and expiry **MUST** be covered by their respective signatures as specified.

[REQ-SEC-005] A verifier **MUST** reject a presentation previously accepted under the same `(holder authority, presentationId)` within the verifier's replay-retention period.

[REQ-SEC-006] The verifier replay record **MUST** be retained for at least the presentation expiry plus allowed clock skew.

### 17.4 Rollback

[REQ-SEC-007] Holder-supplied status material **MUST NOT** establish current-head freshness.

[REQ-SEC-008] A cached current head **MUST** carry source and capture time, and an older cache entry **MUST NOT** replace a newer authenticated entry for the same URI absent a verified chain explanation.

Definitive cross-resolver current-head discovery remains OPEN-HEAD-01.

### 17.5 Key protection

[REQ-SEC-009] Private signing keys, X25519 private keys, content-encryption keys, and decrypted portfolio plaintext **MUST** be stored using platform protections appropriate to the declared assurance profile and **MUST NOT** be written to routine logs.

[REQ-SEC-010] Decryption or authentication failure **MUST** produce one indistinguishable external failure class; detailed cryptographic failure causes **MUST NOT** become a remote oracle.

### 17.6 Correlation and traffic analysis

[REQ-SEC-011] Public portfolio envelopes **MUST** avoid recipient labels and stable device descriptions, but applications **MUST** document that ciphertext size, publication timing, version-chain activity, stable portfolio URI, `recipients[]` length, and changes in that length remain observable.

[REQ-SEC-011A] Applications **MUST NOT** describe `recipients[]` length as the exact device or backup-key count because dummy entries, non-device recipients, or multiple entries per recipient may exist.

[REQ-SEC-011B] Fresh recipient IDs prevent direct entry-level correlation across versions but **MUST NOT** be represented as hiding the public recipient-array length.

[REQ-SEC-012] Holder applications **SHOULD** avoid publishing portfolio versions solely to record presentation history.

[REQ-SEC-013] Local presentation history **MUST** default to holder-controlled storage and **MUST NOT** be synchronized or exported without explicit configuration.

### 17.7 Malicious requests

[REQ-SEC-014] Holder software **MUST** display the verifier's purpose per field before consent and **MUST** warn when public Credential Claim verification necessarily reveals fields beyond the minimal request.

[REQ-SEC-015] A display name or domain string from the signed request **MUST NOT** be rendered as verified organizational identity unless separate identity-anchor evidence supports it.

### 17.8 BVS evidence

[REQ-SEC-016] A BVS **MUST NOT** include source-account credentials, reusable source tokens, or raw authentication secrets in Credential Claim evidence.

[REQ-SEC-017] BVS policy **MUST** account for adapter version and verification time so that an obsolete or compromised adapter can be rejected without rewriting past cryptographic evidence.

### 17.9 Backups and recipient removal

[REQ-SEC-018] Portfolio backup UX **MUST** state which recipient keys can decrypt the backup and that recipient removal cannot retract old ciphertext already obtained.

[REQ-SEC-019] A backup **MUST** preserve the manifest, ciphertext, recipient metadata necessary for authorized decryption, and chain evidence needed to detect rollback.

---

## 18. Conformance

This Working Draft is not yet a conformance target. The profiles below define the intended Candidate Specification boundary.

### 18.1 Passport-Core

Passport-Core includes:

- Ed25519 HIRI authorities and lifecycle verification;
- JCS and raw SHA-256 HIRI artifacts;
- Mode 2 encrypted portfolios;
- public direct-issuer and BVS Credential Claims;
- persistent and ephemeral self-assertions;
- Disclosure Requests and Passport Presentations;
- artifact packages and resolver inputs;
- subject binding, status reporting, provenance, and policy separation.

[REQ-CONF-001] A Passport-Core implementation **MUST** satisfy every applicable requirement in Sections 1 through 18 except requirements explicitly scoped to selective credentials, Mode 5, or a future profile.

[REQ-CONF-002] A conforming verifier **MUST** pass all applicable positive, negative, and adversarial normative vectors released with the Candidate Specification.

[REQ-CONF-003] A holder-only implementation **MUST** identify that role and **MUST NOT** claim verifier coverage. The same rule applies to verifier-only, issuer-only, BVS-only, and resolver-only roles.

### 18.2 Passport-Interoperable

Passport-Interoperable is intended to add complete HIRI Interoperable support and Privacy Mode 3 selective credentials.

[REQ-CONF-004] An implementation **MUST NOT** claim Passport-Interoperable conformance until OPEN-SD-01, OPEN-CONTEXT-01, and OPEN-TRANSPORT-01 are resolved in a published revision with normative vectors.

### 18.3 Reserved high-assurance profile

`Passport-Hardened` is reserved. It may eventually define recovery, hardware key protection, high-assurance current-head discovery, privacy-preserving status, and stronger operational policy.

[REQ-CONF-005] An implementation **MUST NOT** claim `Passport-Hardened` based on this Working Draft.

### 18.4 Candidate Specification gate

[REQ-CONF-006] This draft **MUST NOT** advance to Candidate Specification until all of the following are complete:

1. the five Section 19 blocking issues have accepted resolutions or are explicitly removed from the Candidate scope;
2. versioned JSON Schemas exist for every Passport message and Passport content type;
3. context payloads and SHA-256 pins are published;
4. fixed positive and adversarial vectors cover every cryptographic construction;
5. all examples validate against schemas and all non-placeholder hashes and signatures verify;
6. requirement IDs are unique and mapped to tests;
7. upstream HIRI compatibility tests pass at the pinned revision;
8. a security and privacy review closes all critical and high findings.

---

## 19. Open Blocking Issues

### OPEN-SD-01 — Holder-derived selective-disclosure suite

The current HIRI Privacy Mode 3 HMAC suite is not safely delegable to a potentially adversarial verifier: possession of the shared HMAC key permits verification of any guessed statement, and the public document-level salt does not protect low-entropy fields. The upstream BBS+ description also assigns proof generation to the publisher with the signer key rather than defining holder-derived proof generation.

The resolution must select either a corrected holder-derived BBS+ suite or another complete suite. The leading symmetric alternative is a new per-statement-secret-salt construction in which both `statementHash[i]` and `tag[i]` commit to a fresh secret salt, all salts are delivered privately to the holder, and only salts for disclosed statements reach the verifier. That alternative is not the v1.4.1 HMAC suite and requires an upstream revision or separately versioned Passport profile.

Every alternative must bind the derived proof to verifier authority, request nonce, credential manifest hash, exact disclosed statement set, and presentation expiry; define transport and replay behavior; analyze low-entropy fields and colluding verifiers; and include fixed adversarial vectors.

**Affected scope:** Passport-Interoperable only.

### OPEN-HEAD-01 — Authoritative current-head discovery

The protocol needs a concrete way to establish which resolver or signed statement is issuer-authoritative for the latest credential head, including anti-rollback behavior, cache provenance, equivocation handling, and offline freshness.

**Affected scope:** interoperable discovery of confirmed `active` status. Passport-Core can report `active` with a deployment-configured issuer-authoritative source and otherwise returns `unknown` safely.

### OPEN-CONTEXT-01 — Passport context registry

Final context URLs, exact context payloads, canonical bytes, and SHA-256 pins have not been published. Placeholder `hiri.example` URLs in this draft are not deployable identifiers.

**Affected scope:** machine-readable schemas, URDNA2015, and Candidate status.

### OPEN-RECOVERY-01 — Loss of all authorized keys

HIRI routine rotation does not solve loss of every active and recovery key. A recovery profile needs authority continuity rules, adversary and coercion models, recovery delay and cancellation, credential impact, user communication, and vectors.

**Affected scope:** recovery and high-assurance lifecycle; not routine Core rotation.

### OPEN-TRANSPORT-01 — Confidential delegated material

The core intentionally does not define transport. The selected selective-disclosure suite needs authenticated and replay-resistant delivery. If it transfers verifier-specific secret material, the transport must additionally provide confidentiality and exact failure behavior.

**Affected scope:** Passport-Interoperable selective disclosure.

---

## 20. Migration from the v1.9.0 Design Draft

There is no wire-compatible migration. v1.9.0 is a design source, not a published protocol contract.

| v1.9.0 design | v2.0.0 rule |
|---------------|-------------|
| `/passport/main` URI | `/data/passport-main` |
| Public slot registry | Encrypted Mode 2 portfolio content |
| Attestation Manifest credential envelope | Direct issuer Resolution Manifest |
| `selective-disclosure` Attestation mode | Complete Privacy Mode 3 profile, currently blocked |
| Mode 5 `/attestation/<id>` example | Base-compatible `/data/attestation-<opaque-id>` |
| Proof-of-possession issuer slot | Removed |
| Slot HMAC token | Fresh presentation-local random ID |
| Phantom slots and padded counts | Removed; no count transmitted |
| Portfolio membership proof | Removed; credential and holder evidence are independent |
| Holder authority changes on rotation | Authority and portfolio URI remain stable |
| Timestamp smearing | Prohibited for signed claim values |
| Reused VC proof as HIRI proof | Prohibited unless independently valid for the exact HIRI signature target |
| BVS impersonates source issuer | BVS is direct issuer; source is evidence |
| Custom revocation log | Deferred pending a sound transparency profile |
| Ambiguous overall trust tier | Separate cryptography, status, identity, provenance, and policy results |
| P-256 and ML-DSA in core | Deferred |

[REQ-MIGRATE-001] An implementation **MUST NOT** relabel a v1.9.0 artifact or message as v2.0.0 without reconstructing and re-signing it under the v2.0.0 rules.

[REQ-MIGRATE-002] Migration software **MUST** treat all v1.9.0 signature and hash examples as non-authoritative unless independently verified against a published vector.

[REQ-MIGRATE-003] A migrated issuer credential **MUST** be newly issued by the direct issuer as a valid v2.0.0 Credential Claim; a holder cannot self-migrate an issuer signature.

---

## Appendix A. Core Data-Type Summary

This appendix is informative until generated JSON Schemas are published.

### A.1 Scalar constraints

| Type | Constraint |
|------|------------|
| `RandomId` | Canonical unpadded base64url of exactly 16 random bytes. |
| `Nonce` | Canonical unpadded base64url of exactly 32 random bytes. |
| `Authority` | `key:ed25519:z` plus a valid multibase raw 32-byte Ed25519 key. |
| `VerificationMethod` | HIRI key URI controlled by the corresponding authority. |
| `Timestamp` | RFC 3339 UTC date-time with trailing `Z`. |
| `Hash` | HIRI hash syntax for the declared addressing mode. |
| `JsonPointer` | RFC 6901 pointer rooted at `/claims`, without array indexes or `-`. |
| `AbsoluteUri` | Absolute URI without a fragment where a schema is expected. |

### A.2 Closed Passport message types

```text
DisclosureRequest
  protocol, type, requestId, verifier,
  credentialRequests[], selfAssertionRequests[],
  nonce, createdAt, expiresAt, keyAgreement?, proof

PassportPresentation
  protocol, type, presentationId, holder, requestBinding,
  credentialPresentations[], selfAssertions[],
  createdAt, expiresAt, proof

PassportPresentationPackage
  protocol, type, presentation, artifacts[]
```

### A.3 Content types

```text
hiri:passport:EncryptedPortfolio
hiri:passport:CredentialClaim
hiri:passport:SelfAssertion
```

---

## Appendix B. Cryptographic Construction Summary

| Construction | Exact input |
|--------------|-------------|
| Request proof | `UTF8("HIRI-PASSPORT-DISCLOSURE-REQUEST-V2") || 0x00 || JCS(unsignedRequest)` |
| Presentation proof | `UTF8("HIRI-PASSPORT-PRESENTATION-V2") || 0x00 || JCS(unsignedPresentation)` |
| HIRI artifact proof | Inherited unchanged from HIRI Protocol v3.1.1 |
| Portfolio encryption | Inherited unchanged from HIRI Privacy Extension Mode 2 v1.4.1 |
| Selective disclosure | Reserved pending OPEN-SD-01 |

No value containing `PLACEHOLDER`, `zHOLDER`, `zISSUER`, or `zVERIFIER` is a test vector.

---

## Appendix C. Revision Notes

### Working Draft 2

- Made Passport-Core's complete-public-content and conditional-status envelope explicit.
- Reframed OPEN-SD-01 as selection of a corrected holder-derived disclosure suite; prohibited direct delegation of the current Mode 3 HMAC key.
- Required fresh per-version recipient IDs and documented public recipient-array metadata.
- Made persistent self-assertions unpublished by default and defined package-delivery behavior.
- Corrected Mode 5 identifiers to the pinned HIRI base URI grammar and required strict two-sided verification.
- Split live-message clock skew from bounded credential-issuance tolerance.
- Bound every error code to requirement sources and an exact evidence transition.

### Working Draft 1

- Replaced public slot topology with a private Mode 2 portfolio.
- Replaced invalid Attestation Manifest credentials with direct issuer Resolution Manifests.
- Preserved HIRI's immutable genesis-derived authority through key rotation.
- Restricted the normative core to Ed25519, JCS, and raw SHA-256.
- Defined exact request and presentation signature targets.
- Removed slot tokens, phantom slots, transmitted counts, and timestamp smearing.
- Separated verification evidence from issuer identity and relying-party policy.
- Deferred selective disclosure, transparency logging, recovery, and algorithm agility until their security contracts are complete.

---

## Appendix D. Design-Decision Traceability

This table maps every accepted or deferred decision in the design-control baseline to its primary specification location.

| Decision | Disposition in this draft |
|----------|---------------------------|
| `DEC-COMPAT-01` | Sections 6 and 10 distinguish upstream artifacts from Passport messages. |
| `DEC-BOUNDARY-01` | Sections 2.3 and 15 separate cryptography, identity, and policy. |
| `DEC-ARTIFACT-01` | Section 7 defines a Mode 2 Resolution Manifest portfolio. |
| `DEC-ARTIFACT-02` | Sections 4 and 12 remove portfolio-membership evidence. |
| `DEC-ARTIFACT-03` | Section 8 defines direct issuer Resolution Manifest credentials. |
| `DEC-PRIVACY-01` | Sections 8.2 and 8.5 define public and reserved selective profiles. |
| `DEC-ARTIFACT-04` | Section 8.6 restricts Mode 5 to upstream attestation semantics. |
| `DEC-ARTIFACT-05` | Section 8.4 makes a BVS the direct issuer. |
| `DEC-ARTIFACT-06` | Sections 9 and 12.3 define persistent and ephemeral self-assertions. |
| `DEC-KEY-01` | Section 5.1 preserves the genesis-derived authority. |
| `DEC-KEY-02` | Section 5.3 preserves authority and URI through routine rotation. |
| `DEC-KEY-03` | Sections 5.3 and 19 retain compromise rules and isolate recovery. |
| `DEC-ALGORITHM-01` | Sections 5 and 18 restrict Core to Ed25519. |
| `DEC-PRESENTATION-01` | Section 11 defines a standalone Disclosure Request. |
| `DEC-PRESENTATION-02` | Section 11.2 defines the exact request signature input. |
| `DEC-PRESENTATION-03` | Section 12 defines an ephemeral standalone Passport Presentation. |
| `DEC-PRESENTATION-04` | Section 12.4 defines the exact presentation signature input. |
| `DEC-PRESENTATION-05` | Sections 12.1 and 12.5 use fresh message-local item identifiers. |
| `DEC-PRIVACY-02` | Sections 4, 12, and 17 prohibit counts and completeness disclosures. |
| `DEC-PRIVACY-03` | Sections 10.3 and 17 prohibit alteration of issuer-signed values. |
| `DEC-STATUS-01` | Section 14.2 defines current-chain status states and precedence. |
| `DEC-STATUS-02` | Section 14.3 defines bounded cached and offline evidence. |
| `DEC-STATUS-03` | Section 14.4 excludes the unsound v1.9.0 log. |
| `DEC-VERIFY-01` | Section 15 defines the five evidence-producing phases. |
| `DEC-TRUST-01` | Section 15.5 separates cryptographic authority from organization identity. |
| `DEC-TRUST-02` | Sections 8.4 and 15 define scoped BVS trust policy. |
| `DEC-TRUST-03` | Sections 15.7 and 18 use one provenance vocabulary. |
| `DEC-CONTEXT-01` | Sections 6.2 and 19 require a pinned context registry. |
| `DEC-CONFORMANCE-01` | Section 18 defines Core and blocked future profiles. |

---

## End of Working Draft
