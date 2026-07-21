# HIRI Bootstrap Verification Profile

## Compatibility-corrected BVS credential and evidence profile

**Version:** 3.0.0  
**Status:** Working Draft 1  
**Date:** 2026-07-20  
**Core dependency:** HIRI Digital Passport Extension v2.0.0 Working Draft 2  
**Replaces:** HIRI Bootstrap Verification Profile v2.0.0 as the active design draft

---

## Document Status

This document defines how a Bootstrap Verification Service (BVS) binds holder participation to an external verification procedure, records evidence, issues a Passport Credential Claim, and is evaluated by relying-party policy.

The v2.0.0 profile remains a historical design input. Version 3.0.0 is a breaking correction: BVS credentials are direct-issuer HIRI Resolution Manifests; source providers are evidence rather than HIRI issuers; holder-binding messages have exact independent schemas and signing targets; trust is tuple-scoped; status uses the credential version chain; and provider adapters are separately versioned evidence profiles.

This Working Draft is not a conformance target. Its placeholder URLs, hashes, authorities, and signatures are not deployable values or test vectors.

---

## 1. Conventions and Precedence

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative as described by BCP 14 when shown in uppercase.

Requirements have stable identifiers of the form `REQ-BVP-<AREA>-<NUMBER>`.

[REQ-BVP-DOC-001] If this profile conflicts with the HIRI Digital Passport Extension v2.0.0 or its pinned upstream HIRI specifications, the Core protocol **MUST** control protocol behavior and this profile **MUST** be corrected.

[REQ-BVP-DOC-002] A BVP implementation **MUST NOT** alter Core artifact, Credential Claim, signature, subject-binding, status, verification, or provenance semantics.

[REQ-BVP-DOC-003] BVP-specific signed messages **MUST** use the exact schemas and signing targets in this document and **MUST NOT** be inserted as unknown members into a closed Core message.

---

## 2. Scope and Central Invariant

### 2.1 Central invariant

A BVS says what the BVS did. It does not impersonate the provider, registry, employer, licensing board, identity provider, or other evidence source that it consulted.

[REQ-BVP-SCOPE-001] A BVS **MUST** be the direct issuer of every BVS Credential Claim it creates.

[REQ-BVP-SCOPE-002] The BVS credential manifest's URI authority and authorized signing method **MUST** identify the BVS authority.

[REQ-BVP-SCOPE-003] A source provider or registry **MUST** be represented as evidence and **MUST NOT** be represented as the HIRI credential issuer unless that source independently issues and signs its own conforming credential.

### 2.2 In scope

This profile defines:

- a signed BVS holder-binding challenge and signed holder response;
- exact authorization boundaries for verification intents;
- BVS evidence fields and adapter-profile binding;
- BVS Credential Claim issuance;
- BVS governance publication;
- tuple-scoped relying-party trust;
- privacy, security, errors, and intended conformance roles.

### 2.3 Out of scope

This profile does not define:

- OAuth, OpenID Connect, SAML, passkeys, phone, email, document scanning, registry, or provider-specific wire protocols;
- a universal meaning of “verified” or an aggregate assurance level;
- selective disclosure;
- authoritative discovery of the current credential head;
- legal identity or regulatory equivalence;
- source-provider endorsement of HIRI or the BVS.

[REQ-BVP-SCOPE-004] Provider-specific endpoints, scopes, claims, redirect rules, and assurance mappings **MUST** reside in separately versioned adapter profiles.

[REQ-BVP-SCOPE-005] A BVS **MUST NOT** issue a sensitive claim as a Passport-Core public Credential Claim unless the holder explicitly authorizes disclosure of the complete claim and applicable law and deployment policy permit that publication.

---

## 3. Roles and Evidence Boundaries

| Role | Responsibility |
|------|----------------|
| Holder | Controls the Passport authority and signs a response to a BVS challenge. |
| BVS | Performs the described procedure, validates holder binding, and directly issues the credential. |
| Source provider | Supplies source authentication, account, document, registry, or other evidence under an adapter profile. |
| Credential verifier | Verifies the Core credential and BVP evidence-profile binding. |
| Relying party | Applies a named, versioned trust policy to verified evidence. |
| Identity-anchor operator | Supplies separately authenticated evidence connecting a BVS authority to an organization. |

[REQ-BVP-ROLE-001] Holder control, source control, BVS signature validity, BVS organizational identity, credential status, evidence-profile validity, and relying-party acceptance **MUST** remain separate results.

[REQ-BVP-ROLE-002] Source authentication **MUST NOT** substitute for holder control of the Passport authority.

[REQ-BVP-ROLE-003] A holder signature **MUST NOT** be represented as proof that the source provider verified or endorsed a claim.

[REQ-BVP-ROLE-004] A BVS signature **MUST NOT** be represented as proof that the source provider signed the credential.

---

## 4. Common BVP Message Rules

### 4.1 Fixed values and scalar types

| Member | Required value |
|--------|----------------|
| `protocol` | `hiri-bvp/3.0` |
| Challenge `type` | `BvsHolderBindingChallenge` |
| Response `type` | `BvsHolderBindingResponse` |
| `proof.type` | `Ed25519Signature2020` |
| `proof.canonicalization` | `JCS` |
| `proof.proofPurpose` | `authentication` |

`RandomId` is canonical unpadded base64url encoding of exactly 16 independently generated random bytes. `Nonce` is the corresponding encoding of exactly 32 independently generated random bytes. Timestamps use exact UTC-seconds form `YYYY-MM-DDTHH:mm:ssZ` with no fractional seconds.

[REQ-BVP-MSG-001] A signed BVP message **MUST** be a JSON object without duplicate member names and **MUST** use every applicable fixed value in Section 4.1.

[REQ-BVP-MSG-002] A parser **MUST** reject an unknown member at every schema-defined level.

[REQ-BVP-MSG-003] Every `sessionId`, `challengeId`, and `intentId` **MUST** be an independently generated `RandomId`; every `nonce` **MUST** be an independently generated `Nonce`.

[REQ-BVP-MSG-004] Random bytes **MUST** come from a cryptographically secure random source supplied to the operation.

[REQ-BVP-MSG-005] A BVP message **MUST** satisfy `createdAt < expiresAt`, and its `proof.created` **MUST** equal `createdAt` byte-for-byte.

[REQ-BVP-MSG-005A] Every message timestamp **MUST** use the exact UTC-seconds form in Section 4.1 and **MUST** represent a valid calendar date.

[REQ-BVP-MSG-005B] A `proof` object **MUST** contain exactly `type`, `canonicalization`, `created`, `verificationMethod`, `proofPurpose`, and `proofValue`.

### 4.2 Proof construction

The unsigned form is the complete message with only `proof.proofValue` absent. The `proof` object and all proof metadata remain.

[REQ-BVP-MSG-006] A signer or verifier **MUST** remove only `proof.proofValue`, JCS-canonicalize the resulting object, encode it as UTF-8, prepend the message-specific domain and one zero byte, and sign or verify those bytes directly with Ed25519.

[REQ-BVP-MSG-007] `proof.proofValue` **MUST** be multibase base58btc encoding of exactly 64 Ed25519 signature bytes.

[REQ-BVP-MSG-008] A signer or verifier **MUST NOT** add an undocumented pre-hash, JSON transformation, or serialization wrapper.

[REQ-BVP-MSG-009] A challenge or response **MUST NOT** exceed 65,536 UTF-8 bytes in JCS form.

[REQ-BVP-MSG-010] An absolute URI **MUST NOT** exceed 2,048 Unicode scalar values; a non-URI identifier **MUST NOT** exceed 128 Unicode scalar values; and `jurisdiction`, when present, **MUST NOT** exceed 64 Unicode scalar values.

---

## 5. BVS Holder-Binding Challenge

### 5.1 Closed schema

The following is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "protocol": "hiri-bvp/3.0",
  "type": "BvsHolderBindingChallenge",
  "sessionId": "ABEiM0RVZneImaq7zN3u_w",
  "challengeId": "EBESExQVFhcYGRobHB0eHw",
  "bvs": {
    "authority": "key:ed25519:zBVS",
    "verificationMethod": "hiri://key:ed25519:zBVS/key/main#key-1"
  },
  "holderAuthority": "key:ed25519:zHOLDER",
  "intents": [
    {
      "intentId": "ISIjJCUmJygpKissLS4vMA",
      "schema": "https://registry.example/schemas/professional-license/v1",
      "schemaHash": "sha256:PLACEHOLDER",
      "credentialType": "ProfessionalLicenseCredential",
      "disclosureMode": "public",
      "purpose": "Issue a public credential for the active professional-license record",
      "sourceProvider": "example-professional-registry",
      "sourceVerificationMethod": "public-registry-record",
      "evidenceProfile": "https://hiri.example/profiles/bvp-holder-binding/v3",
      "evidenceProfileHash": "sha256:PLACEHOLDER",
      "adapterId": "example-professional-registry",
      "adapterVersion": "1.0.0",
      "adapterProfile": "https://registry.example/profiles/professional-license-adapter/v1",
      "adapterProfileHash": "sha256:PLACEHOLDER",
      "jurisdiction": "US-NY"
    }
  ],
  "nonce": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  "createdAt": "2026-07-20T12:00:00Z",
  "expiresAt": "2026-07-20T12:05:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "canonicalization": "JCS",
    "created": "2026-07-20T12:00:00Z",
    "verificationMethod": "hiri://key:ed25519:zBVS/key/main#key-1",
    "proofPurpose": "authentication",
    "proofValue": "zPLACEHOLDER"
  }
}
```

The root members are exactly `protocol`, `type`, `sessionId`, `challengeId`, `bvs`, `holderAuthority`, `intents`, `nonce`, `createdAt`, `expiresAt`, and `proof`.

[REQ-BVP-CHALLENGE-001] `bvs` **MUST** contain exactly `authority` and `verificationMethod`; the same verification method **MUST** appear in `proof.verificationMethod` and be authorized by the BVS authority at `createdAt`.

[REQ-BVP-CHALLENGE-002] `holderAuthority` **MUST** be the exact normative HIRI Ed25519 authority to which any resulting credential will bind.

[REQ-BVP-CHALLENGE-003] `intents` **MUST** contain 1 through 16 entries with unique `intentId` values.

[REQ-BVP-CHALLENGE-004] Each intent **MUST** contain exactly `intentId`, `schema`, `schemaHash`, `credentialType`, `disclosureMode`, `purpose`, `sourceProvider`, `sourceVerificationMethod`, `evidenceProfile`, `evidenceProfileHash`, `adapterId`, `adapterVersion`, `adapterProfile`, `adapterProfileHash`, and optional `jurisdiction`.

[REQ-BVP-CHALLENGE-005] `schema`, `evidenceProfile`, and `adapterProfile` **MUST** be absolute URIs without fragments. Their corresponding hashes **MUST** bind their canonical bytes, and `schemaHash` **MUST** bind the JCS-canonical JSON Schema as defined by Core. All string identifiers **MUST** be non-empty.

[REQ-BVP-CHALLENGE-005A] `disclosureMode` **MUST** equal `public`. `purpose` **MUST** contain 1 through 512 Unicode scalar values, contain no C0 control or DEL character, and be rendered as untrusted plain text.

[REQ-BVP-CHALLENGE-006] `expiresAt - createdAt` **MUST NOT** exceed five minutes.

### 5.2 Challenge signing target

```text
UTF8("HIRI-BVP-HOLDER-BINDING-CHALLENGE-V3")
|| 0x00
|| JCS(unsignedChallenge)
```

[REQ-BVP-CHALLENGE-007] BVS challenge signers and validators **MUST** use exactly the Section 5.2 byte construction.

### 5.3 Challenge validation

[REQ-BVP-CHALLENGE-008] Holder software **MUST** validate the closed schema, fixed values, IDs, nonce, lifetime, BVS authority derivation, method authorization, and signature before asking the holder to respond.

[REQ-BVP-CHALLENGE-009] Holder software **MUST** reject a challenge when `createdAt > now + messageClockSkew` or `expiresAt < now - messageClockSkew`; `messageClockSkew` **MUST** be an explicit non-negative input and **MUST NOT** exceed 120 seconds.

[REQ-BVP-CHALLENGE-010] The holder view **MUST** identify the BVS, every intent and purpose, source provider, procedure, credential type, jurisdiction when present, complete-public-disclosure consequence, and expiry before authorization.

[REQ-BVP-CHALLENGE-011] A signed BVS display hint or governance reference **MUST NOT** be presented as verified organizational identity without separate identity-anchor evidence.

---

## 6. Holder-Binding Response

### 6.1 Closed schema

The following is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "protocol": "hiri-bvp/3.0",
  "type": "BvsHolderBindingResponse",
  "sessionId": "ABEiM0RVZneImaq7zN3u_w",
  "challengeId": "EBESExQVFhcYGRobHB0eHw",
  "challengeHash": "sha256:PLACEHOLDER",
  "bvsAuthority": "key:ed25519:zBVS",
  "holder": {
    "authority": "key:ed25519:zHOLDER",
    "verificationMethod": "hiri://key:ed25519:zHOLDER/key/main#key-2"
  },
  "authorizedIntentIds": [
    "ISIjJCUmJygpKissLS4vMA"
  ],
  "nonce": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  "createdAt": "2026-07-20T12:01:00Z",
  "expiresAt": "2026-07-20T12:04:00Z",
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

The root members are exactly `protocol`, `type`, `sessionId`, `challengeId`, `challengeHash`, `bvsAuthority`, `holder`, `authorizedIntentIds`, `nonce`, `createdAt`, `expiresAt`, and `proof`.

[REQ-BVP-RESPONSE-001] `sessionId`, `challengeId`, `bvsAuthority`, and `nonce` **MUST** copy the validated challenge values byte-for-byte.

[REQ-BVP-RESPONSE-002] `challengeHash` **MUST** equal `sha256:` followed by the lowercase hexadecimal SHA-256 digest of the JCS bytes of the complete signed challenge, including `proof.proofValue`.

[REQ-BVP-RESPONSE-003] `holder` **MUST** contain exactly `authority` and `verificationMethod`; the authority **MUST** equal the challenge `holderAuthority`, and the same method **MUST** appear in `proof.verificationMethod` and be authorized by that holder authority at `createdAt`.

[REQ-BVP-RESPONSE-004] `authorizedIntentIds` **MUST** be a non-empty, duplicate-free subset of the challenge intent IDs.

[REQ-BVP-RESPONSE-005] The response expiry **MUST NOT** exceed the challenge expiry or five minutes after the response creation time.

[REQ-BVP-RESPONSE-005A] Response `createdAt` **MUST NOT** precede challenge `createdAt` by more than `messageClockSkew`, and the BVS **MUST** reject the response when either message is expired at validation time.

### 6.2 Response signing target

```text
UTF8("HIRI-BVP-HOLDER-BINDING-RESPONSE-V3")
|| 0x00
|| JCS(unsignedResponse)
```

[REQ-BVP-RESPONSE-006] Holder response signers and validators **MUST** use exactly the Section 6.2 byte construction.

### 6.3 Authorization boundary

[REQ-BVP-RESPONSE-007] The BVS **MUST** validate both complete signed messages, both authority lifecycles, exact challenge hash, exact copied fields, time bounds, and replay state before treating holder binding as valid.

[REQ-BVP-RESPONSE-008] One response **MUST** authorize only the intent IDs enumerated in that response and only within the exact signed challenge.

[REQ-BVP-RESPONSE-009] A BVS **MUST NOT** add a credential type, schema, source provider, source verification method, adapter, or jurisdiction after holder authorization. Any such addition **MUST** use a fresh challenge and response.

[REQ-BVP-RESPONSE-010] A BVS **MUST** consume a valid response at most once. A repeated `(holder authority, challengeId, nonce)` tuple **MUST** be rejected as replay.

[REQ-BVP-RESPONSE-011] A replay record **MUST** be retained until at least the later of response expiry and challenge expiry plus `messageClockSkew`.

[REQ-BVP-RESPONSE-012] A holder-binding signature proves control of the declared holder authority for this transcript; it **MUST NOT** be described as holder agreement with unshown claim values or future verification work.

[REQ-BVP-RESPONSE-013] Holder software and the BVS **MUST** record the exact `messageClockSkew` used for holder-binding validation.

---

## 7. Verification Session and Source Evidence

Holder binding and source verification are distinct parts of one BVS issuance decision.

```text
signed BVS challenge
        +
signed holder response
        +
adapter-profile source transcript
        +
BVS issuance policy
        |
        v
BVS-signed Credential Claim
```

[REQ-BVP-SESSION-001] The BVS **MUST** associate the source transcript, adapter profile, holder-binding transcript, and issuance decision with the same protected internal session.

[REQ-BVP-SESSION-002] A source transcript **MUST** identify the authorized intent it satisfies and **MUST NOT** satisfy a different intent by string similarity or operator inference.

[REQ-BVP-SESSION-003] Source evidence **MUST** be collected and validated under the exact adapter ID and version named by the intent.

[REQ-BVP-SESSION-004] The BVS **MUST** record when the source was observed, when checks completed, and which adapter implementation version performed them.

[REQ-BVP-SESSION-005] The BVS **MUST** fail closed when a source response is ambiguous, contradicts the adapter profile, cannot be authenticated as required, or does not bind to the intended source subject.

[REQ-BVP-SESSION-006] Source access tokens, passwords, document images, biometric templates, reusable cookies, private API responses, and equivalent raw secrets **MUST NOT** appear in public Credential Claim evidence.

[REQ-BVP-SESSION-007] Raw source evidence **MUST** be minimized, encrypted at rest, access-controlled, retention-limited, and deleted when its documented purpose expires unless law requires longer retention.

[REQ-BVP-SESSION-008] A BVS **MUST NOT** issue after the holder response expires, even when source verification began before expiry.

---

## 8. Adapter Evidence Profiles

An adapter profile is a hash-pinned specification for one provider and source verification method. The base BVP deliberately avoids copying mutable provider documentation.

### 8.1 Required profile content

[REQ-BVP-ADAPTER-001] An adapter profile **MUST** define its canonical identifier, semantic version, canonical bytes and SHA-256 hash, source provider, source verification method, supported jurisdictions, input and output schemas, and normative references.

[REQ-BVP-ADAPTER-002] It **MUST** define the exact authentication or registry procedure, source response validation, source-subject binding, freshness, replay handling, error mapping, data minimization, retention, and adversarial tests.

[REQ-BVP-ADAPTER-003] It **MUST** identify which claims the procedure supports and the limits of every derived statement; absence of evidence **MUST NOT** be converted into a negative claim unless the source procedure explicitly supports that inference.

[REQ-BVP-ADAPTER-004] A profile change that alters security, claim meaning, provider behavior, inputs, outputs, or validation **MUST** increment its version and produce a new profile hash.

[REQ-BVP-ADAPTER-005] Adapter implementations **MUST** record their own implementation version separately from the adapter profile version.

### 8.2 Lifecycle

[REQ-BVP-ADAPTER-006] BVS policy **MUST** support disabling a vulnerable or obsolete adapter version for new issuance without rewriting past signed evidence.

[REQ-BVP-ADAPTER-007] Verifier policy **MUST** be able to accept or reject evidence by adapter ID, profile version, implementation version, verification time, and jurisdiction.

[REQ-BVP-ADAPTER-008] A verifier that cannot obtain and hash-verify the named adapter profile **MUST** report evidence-profile validation as `unknown`; it **MUST NOT** invalidate an otherwise valid BVS signature solely for that reason.

---

## 9. BVS Credential Claim

### 9.1 Core artifact

A BVS credential uses the Core URI form:

```text
hiri://<bvs-authority>/data/credential-<opaque-id>
```

[REQ-BVP-CREDENTIAL-001] A BVS credential **MUST** be a BVS-signed `hiri:ResolutionManifest` satisfying every applicable Core direct-issuer Credential Claim requirement.

[REQ-BVP-CREDENTIAL-002] The opaque credential identifier **MUST** contain at least 128 bits of cryptographically secure randomness and **MUST NOT** encode holder identity, provider, credential type, or jurisdiction.

[REQ-BVP-CREDENTIAL-003] A normal BVS credential **MUST NOT** use `hiri:AttestationManifest`, Privacy Mode 5, or a custom `hiri:attestation` content member as its envelope.

### 9.2 Evidence object

The following complete Credential Claim content is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "@context": "https://hiri.example/contexts/passport/v2",
  "@type": "hiri:passport:CredentialClaim",
  "schema": "https://registry.example/schemas/professional-license/v1",
  "schemaHash": "sha256:PLACEHOLDER",
  "credentialType": "ProfessionalLicenseCredential",
  "subjectHolderAuthority": "key:ed25519:zHOLDER",
  "claims": {
    "licenseType": "Professional Engineer",
    "licenseNumber": "PE-123456",
    "jurisdiction": "US-NY"
  },
  "evidence": {
    "type": "hiri:passport:BvsEvidence",
    "evidenceProfile": "https://hiri.example/profiles/bvp-holder-binding/v3",
    "evidenceProfileHash": "sha256:PLACEHOLDER",
    "sourceProvider": "example-professional-registry",
    "sourceVerificationMethod": "public-registry-record",
    "sourceSubjectType": "professional-license-record",
    "sourceObservedAt": "2026-07-20T12:01:10Z",
    "verifiedAt": "2026-07-20T12:01:30Z",
    "adapterId": "example-professional-registry",
    "adapterVersion": "1.0.0",
    "adapterProfile": "https://registry.example/profiles/professional-license-adapter/v1",
    "adapterProfileHash": "sha256:PLACEHOLDER",
    "adapterImplementationVersion": "1.2.3",
    "jurisdiction": "US-NY",
    "holderBinding": {
      "challengeId": "EBESExQVFhcYGRobHB0eHw",
      "challengeHash": "sha256:PLACEHOLDER",
      "responseHash": "sha256:PLACEHOLDER",
      "intentId": "ISIjJCUmJygpKissLS4vMA",
      "result": "valid"
    },
    "checks": [
      {
        "id": "record-found",
        "result": "valid"
      },
      {
        "id": "record-active-at-source",
        "result": "valid"
      }
    ]
  },
  "issuanceDate": "2026-07-20T12:02:00Z",
  "validUntil": "2027-07-20T12:02:00Z",
  "statusId": "st-7X4mK9",
  "status": {
    "state": "active",
    "effectiveAt": "2026-07-20T12:02:00Z"
  }
}
```

[REQ-BVP-EVIDENCE-001] `evidence` **MUST** contain exactly the members required by its hash-pinned evidence schema; at minimum it **MUST** contain `type`, `evidenceProfile`, `evidenceProfileHash`, `sourceProvider`, `sourceVerificationMethod`, `sourceSubjectType`, `sourceObservedAt`, `verifiedAt`, `adapterId`, `adapterVersion`, `adapterProfile`, `adapterProfileHash`, `adapterImplementationVersion`, `holderBinding`, and `checks`, plus optional `jurisdiction`.

[REQ-BVP-EVIDENCE-002] `type` **MUST** equal `hiri:passport:BvsEvidence`; `evidenceProfile` **MUST** be an absolute URI without a fragment; and `evidenceProfileHash` **MUST** hash-pin the canonical profile bytes.

[REQ-BVP-EVIDENCE-003] `sourceObservedAt` **MUST** record when the source evidence was captured, while `verifiedAt` **MUST** record when the BVS completed the described checks. Neither value **MUST** be represented as source-provider signature time unless the source evidence proves that fact.

[REQ-BVP-EVIDENCE-004] `holderBinding` **MUST** contain the exact challenge ID, signed challenge hash, signed response hash, authorized intent ID, and `result: "valid"`.

[REQ-BVP-EVIDENCE-005] `responseHash` **MUST** equal `sha256:` followed by the lowercase hexadecimal SHA-256 digest of the JCS bytes of the complete signed holder response.

[REQ-BVP-EVIDENCE-006] Every `checks` entry **MUST** have a stable ID defined by the adapter profile and a result from `valid`, `invalid`, `unknown`, or `not-applicable`.

[REQ-BVP-EVIDENCE-006A] Each `checks` entry **MUST** contain exactly `id` and `result`; IDs **MUST** be unique in the evidence object, and the array **MUST NOT** contain more than 64 entries.

[REQ-BVP-EVIDENCE-007] The BVS **MUST NOT** issue when any check required by the adapter profile is `invalid` or `unknown`.

[REQ-BVP-EVIDENCE-008] Claims **MUST** be derivable from the authenticated source evidence under the named adapter profile and **MUST NOT** exceed that profile's documented semantics.

[REQ-BVP-EVIDENCE-009] The Credential Claim's subject, schema, schema hash, credential type, source, method, adapter, and jurisdiction **MUST** equal the authorized intent and completed procedure.

[REQ-BVP-EVIDENCE-010] The signed evidence's `evidenceProfile`, `evidenceProfileHash`, `adapterProfile`, and `adapterProfileHash` **MUST** equal the authorized intent byte-for-byte.

### 9.3 Issuance time and authorization

[REQ-BVP-ISSUE-001] `issuanceDate` and genesis `status.effectiveAt` **MUST** be equal and **MUST NOT** precede completion of holder binding or required source checks.

[REQ-BVP-ISSUE-002] Credential issuance **MUST** occur under a documented BVS issuance-policy ID and version retained in the private audit record.

[REQ-BVP-ISSUE-003] The public claim **MUST NOT** contain a source account token, login identifier not required by the credential schema, session cookie, raw challenge response beyond its hashes, IP address, device fingerprint, biometric, document image, or internal risk score.

[REQ-BVP-ISSUE-004] The BVS **MUST** record the holder's authorization for complete public publication before issuing a Passport-Core public credential.

[REQ-BVP-ISSUE-005] Immediately before that authorization, the issuance flow **MUST** show the complete final Credential Claim content, including claims and public evidence, and **MUST** make cancellation leave no signed credential.

---

## 10. Credential-Class Eligibility

The Core envelope is suitable only when complete public disclosure is acceptable.

| Example class | Core default | Reason |
|---------------|--------------|--------|
| Public professional-license registry record | Eligible with explicit holder authorization | The source record is intended for public inspection. |
| Public organizational office or public role | Conditionally eligible | Only the expressly public, current role may be included. |
| Email address or phone number | Not eligible by default | Complete public content creates sensitive correlation and contact exposure. |
| Private employment or workspace membership | Not eligible by default | Employment and membership are sensitive and often contextual. |
| Social account ownership | Not eligible by default | Cross-service correlation and account security risk. |
| Government identity attributes or document scan | Not eligible by default | High sensitivity and legal/security consequences. |
| Health, education, financial, or background-check data | Not eligible | Outside the practical Core public-credential envelope. |

[REQ-BVP-CLASS-001] A BVS **MUST** maintain a documented credential-class eligibility policy and **MUST** default a class to ineligible when complete public disclosure has not been affirmatively justified.

[REQ-BVP-CLASS-002] Ineligible classes **MUST NOT** be made “safe” by omitting fields from a public Credential Claim while still claiming issuer authentication of the omitted subset.

[REQ-BVP-CLASS-003] Selective BVS credentials **MUST NOT** be offered as Passport-Interoperable until `OPEN-SD-01`, `OPEN-CONTEXT-01`, and `OPEN-TRANSPORT-01` are resolved by a published profile with vectors.

---

## 11. Credential Status and Reverification

[REQ-BVP-STATUS-001] A BVS **MUST** change an issued credential's declared status only through a new valid version at the same stable credential URI.

[REQ-BVP-STATUS-002] Status **MUST** use the Core states `active`, `suspended`, `revoked`, or `superseded` and a signed `effectiveAt`.

[REQ-BVP-STATUS-003] A BVS **MUST NOT** claim that an unsigned internal flag, v2.0 custom revocation log, or third-party checkpoint is authenticated Core status.

[REQ-BVP-STATUS-004] Reverification that changes claim content or evidence **MUST** issue a new credential version or a new credential URI according to the BVS correction policy; the choice and supersession relation **MUST** be documented.

[REQ-BVP-STATUS-005] A verifier **MUST** report status as `active` only with a fresh current head from a configured issuer-authoritative source and otherwise follow the Core status algorithm, including `unknown` when authoritative evidence is unavailable.

[REQ-BVP-STATUS-006] Source-provider state and BVS credential status **MUST** be displayed separately unless the current signed credential version expressly declares a state derived from a fresh named source procedure.

---

## 12. BVS Governance Artifact

A BVS may publish governance information at:

```text
hiri://<bvs-authority>/data/bvs-governance
```

The artifact is an ordinary BVS-signed `hiri:ResolutionManifest`. Its JCS content has type `hiri:passport:BvsGovernance` and a hash-pinned schema. It does not contain a second ad hoc signature object.

The following content is a `NON-NORMATIVE PLACEHOLDER`:

```json
{
  "@context": "https://hiri.example/contexts/bvp/v3",
  "@type": "hiri:passport:BvsGovernance",
  "schema": "https://hiri.example/schemas/bvs-governance/v3",
  "schemaHash": "sha256:PLACEHOLDER",
  "bvsAuthority": "key:ed25519:zBVS",
  "operator": {
    "name": "Example Verification Service",
    "jurisdiction": "US-NY"
  },
  "supportedEvidenceProfiles": [
    {
      "id": "https://hiri.example/profiles/bvp-holder-binding/v3",
      "hash": "sha256:PLACEHOLDER"
    }
  ],
  "policyDisclosure": "https://bvs.example/policy/issuance-v1",
  "effectiveAt": "2026-07-20T00:00:00Z"
}
```

[REQ-BVP-GOV-001] The governance manifest publisher, URI authority, signing method authority, and content `bvsAuthority` **MUST** identify the same BVS authority.

[REQ-BVP-GOV-002] Governance content **MUST** identify its hash-pinned schema, operator claim, supported evidence-profile IDs and hashes, public policy disclosure, and effective time.

[REQ-BVP-GOV-003] Operator name, domain, policy URL, DNSSEC result, TLS session, or governance self-claim **MUST NOT** by itself establish organizational identity or cryptographic authority.

[REQ-BVP-GOV-004] A relying party **MUST** validate BVS organizational identity through a separately configured identity anchor and record the anchor source and capture time.

[REQ-BVP-GOV-005] Governance updates **MUST** use the HIRI version chain; a mutable response at `policyDisclosure` **MUST NOT** override signed governance content or a pinned evidence-profile hash.

---

## 13. Trust and Policy Evaluation

### 13.1 Trust tuple

The minimum BVS policy key is:

```text
(
  BVS authority,
  source provider,
  source verification method,
  credential schema,
  jurisdiction,
  adapter version
)
```

[REQ-BVP-TRUST-001] A relying-party policy **MUST** evaluate at least the complete Section 13.1 tuple and **MAY** further restrict credential type, adapter implementation version, evidence profile, verification time, claim values, or BVS identity anchor.

[REQ-BVP-TRUST-002] Trust configured for one tuple **MUST NOT** automatically extend to another provider, method, schema, jurisdiction, adapter version, or BVS authority.

[REQ-BVP-TRUST-003] Policy output **MUST** be `accepted`, `rejected`, or `not-evaluated` and **MUST** identify the policy ID, version, and evidence paths or predicates supporting each reason.

[REQ-BVP-TRUST-004] Policy **MUST NOT** overwrite cryptographic, status, issuer-identity, evidence-profile, or provenance results.

### 13.2 Unconfigured BVS

[REQ-BVP-TRUST-005] A cryptographically valid credential from an unconfigured BVS **MUST** remain in the verification report with `issuerTrust` set to `untrusted` or `unknown` according to local policy.

[REQ-BVP-TRUST-006] Such a credential **MUST NOT** be silently ignored, labeled cryptographically invalid, or promoted to trusted because its source provider is familiar.

### 13.3 Assurance statements

[REQ-BVP-TRUST-007] An assurance claim **MUST** identify the exact policy or evidence profile that defines it; generic numeric tiers **MUST NOT** be used across unrelated evidence procedures.

[REQ-BVP-TRUST-008] Audit or certification status **MUST** be represented with named attributes such as scheme, scope, auditor, report date, and expiry, not an unexplained Tier 1/2/3 label.

---

## 14. Verification Algorithm

For each BVS credential, a verifier performs these independent groups:

1. run Core request, holder, credential, issuer-identity, and policy phases;
2. verify provenance is `bvs` and the manifest issuer is the BVS;
3. hash-verify the evidence schema and evidence profile;
4. validate evidence fields and checks under that profile;
5. evaluate the BVS identity anchor;
6. evaluate the complete BVS trust tuple under an explicit policy.

[REQ-BVP-VERIFY-001] A verifier **MUST** report BVS credential cryptographic result, Core credential status, BVS issuer identity, evidence-profile validation, provenance, and policy separately.

[REQ-BVP-VERIFY-002] An evidence inconsistency authenticated by the BVS signature **MUST** make BVP evidence validation `invalid`; an unavailable profile or unsupported adapter semantics **MUST** make it `unknown`.

[REQ-BVP-VERIFY-003] Invalid or unknown BVP evidence **MUST NOT** be converted into a Core issuer-signature failure when that signature independently verifies.

[REQ-BVP-VERIFY-004] A verifier **MUST** compare the claim schema, source, method, adapter, jurisdiction, and holder authority to both the signed evidence and applicable policy byte-for-byte where the profile requires exact strings.

[REQ-BVP-VERIFY-005] A verifier **MUST NOT** infer that the source provider endorses the BVS, the holder, HIRI, or the relying party from successful source verification alone.

---

## 15. Error Registry

Errors have stable codes and exact evidence transitions. Independent completed checks remain available.

| Code | Condition | Exact transition | Raised by |
|------|-----------|------------------|-----------|
| `BVP_MESSAGE_MALFORMED` | JSON or closed-schema validation fails. | Affected challenge or response `result = invalid`. | `REQ-BVP-MSG-001` |
| `BVP_UNSUPPORTED_PROTOCOL` | Fixed protocol or message type is unsupported. | Affected message `result = invalid`. | `REQ-BVP-MSG-001` |
| `BVP_UNKNOWN_MEMBER` | Unknown member occurs at a schema-defined level. | Affected message `result = invalid`. | `REQ-BVP-MSG-002` |
| `BVP_ID_INVALID` | ID is non-canonical, wrong length, or duplicated. | Identifier check and affected message `result = invalid`. | `REQ-BVP-MSG-003`, `REQ-BVP-CHALLENGE-003` |
| `BVP_NONCE_INVALID` | Nonce is non-canonical or not 32 bytes. | Nonce check and challenge `result = invalid`. | `REQ-BVP-MSG-003` |
| `BVP_RESOURCE_LIMIT` | A message, intent list, string, or evidence check list exceeds a normative limit. | Affected message or evidence `result = invalid`. | `REQ-BVP-MSG-009`, `REQ-BVP-MSG-010`, `REQ-BVP-CHALLENGE-003`, `REQ-BVP-EVIDENCE-006A` |
| `BVP_MESSAGE_EXPIRED` | Challenge or response is expired. | Freshness and affected message `result = invalid`. | `REQ-BVP-CHALLENGE-009`, `REQ-BVP-RESPONSE-005A` |
| `BVP_MESSAGE_NOT_YET_VALID` | Creation time exceeds allowed future skew. | Freshness and affected message `result = invalid`. | `REQ-BVP-CHALLENGE-009`, `REQ-BVP-RESPONSE-005A` |
| `BVP_LIFETIME_EXCEEDED` | Signed lifetime exceeds five minutes or response exceeds challenge. | Freshness and affected message `result = invalid`. | `REQ-BVP-CHALLENGE-006`, `REQ-BVP-RESPONSE-005` |
| `BVP_SIGNATURE_INVALID` | Exact Ed25519 signature target does not verify. | Signature and affected message `result = invalid`. | `REQ-BVP-CHALLENGE-007`, `REQ-BVP-RESPONSE-006` |
| `BVP_METHOD_UNAUTHORIZED` | Signing method is not authorized for the declared authority. | Method authorization and affected message `result = invalid`. | `REQ-BVP-CHALLENGE-001`, `REQ-BVP-RESPONSE-003` |
| `BVP_CHALLENGE_MISMATCH` | Copied value or challenge hash differs. | Holder binding `result = invalid`. | `REQ-BVP-RESPONSE-001`, `REQ-BVP-RESPONSE-002` |
| `BVP_INTENT_UNAUTHORIZED` | Response or issuance uses an unapproved or altered intent. | Holder binding and issuance authorization `result = invalid`. | `REQ-BVP-RESPONSE-008`, `REQ-BVP-RESPONSE-009` |
| `BVP_REPLAY` | A consumed holder-binding tuple is reused. | Replay and holder binding `result = invalid`. | `REQ-BVP-RESPONSE-010` |
| `BVP_SOURCE_EVIDENCE_INVALID` | Authenticated source evidence contradicts its adapter profile. | Source evidence `result = invalid`; issuance prohibited. | `REQ-BVP-SESSION-005`, `REQ-BVP-EVIDENCE-007` |
| `BVP_SOURCE_EVIDENCE_UNKNOWN` | Required source evidence is unavailable or unauthenticated. | Source evidence `result = unknown`; issuance prohibited. | `REQ-BVP-SESSION-005`, `REQ-BVP-EVIDENCE-007` |
| `BVP_PROFILE_HASH_MISMATCH` | Evidence or adapter profile bytes do not match the signed hash. | Evidence profile `result = invalid`. | `REQ-BVP-CHALLENGE-005`, `REQ-BVP-EVIDENCE-002`, `REQ-BVP-EVIDENCE-010` |
| `BVP_PROFILE_UNAVAILABLE` | Named evidence or adapter profile cannot be obtained. | Evidence profile `result = unknown`. | `REQ-BVP-ADAPTER-008` |
| `BVP_EVIDENCE_INCONSISTENT` | Signed evidence fields contradict claim or intent. | BVP evidence `result = invalid`. | `REQ-BVP-EVIDENCE-008`, `REQ-BVP-EVIDENCE-009`, `REQ-BVP-EVIDENCE-010` |
| `BVP_UNTRUSTED_ISSUER` | BVS tuple is absent or rejected by policy. | `issuerTrust = untrusted`; cryptographic result unchanged. | `REQ-BVP-TRUST-005`, `REQ-BVP-TRUST-006` |
| `BVP_PUBLICATION_NOT_AUTHORIZED` | Complete public publication authorization or final preview is absent. | Issuance prohibited; no credential is signed. | `REQ-BVP-ISSUE-004`, `REQ-BVP-ISSUE-005` |

[REQ-BVP-ERROR-001] Implementations **MUST** use the most specific applicable code in Section 15 and **MUST** preserve the exact transition shown.

[REQ-BVP-ERROR-002] Protocol-facing descriptions **MUST NOT** echo source secrets, tokens, raw provider responses, attacker-controlled markup, or private diagnostic content.

[REQ-BVP-ERROR-003] Multiple independent errors **MAY** be returned, but one error **MUST NOT** erase an already completed independent result.

---

## 16. Security, Privacy, and Operations

### 16.1 Threat model

The BVS may face malicious holders, malicious or compromised source accounts, provider changes, replay, confused-deputy attacks, session swapping, source-data ambiguity, resolver rollback, insider abuse, and BVS-key compromise. A BVS itself may be malicious or mistaken; its signature proves what it asserted, not that the assertion is true.

[REQ-BVP-SEC-001] Challenge and source sessions **MUST** be bound server-side so that an attacker cannot swap holder authority, source subject, intent, provider, adapter, or credential schema between sessions.

[REQ-BVP-SEC-002] BVS authentication or decryption failures exposed remotely **MUST** use an indistinguishable external failure class where detailed differences would create an oracle.

[REQ-BVP-SEC-003] The BVS signing key **MUST** be isolated from provider adapters, web request handlers, analytics, and raw source-evidence stores by an explicit issuance boundary.

[REQ-BVP-SEC-004] A signing operation **MUST** receive a validated issuance record containing the exact claim and evidence hashes, holder-binding result, public-publication authorization, and issuance-policy decision.

### 16.2 Privacy

[REQ-BVP-PRIVACY-001] A BVS **MUST** document claim purpose, source-data use, credential publicity, retention, deletion, correction, suspension, and revocation behavior before the holder starts verification.

[REQ-BVP-PRIVACY-002] The BVS **MUST** collect only source evidence necessary for the authorized intent and **MUST NOT** use one session to silently verify or infer another credential type.

[REQ-BVP-PRIVACY-003] Holder-binding hashes **MUST NOT** be reused as analytics identifiers, and raw holder-binding messages **MUST NOT** be published with the credential.

[REQ-BVP-PRIVACY-004] Logs **MUST** redact source tokens, private claims, full challenges and responses, credential content, IP addresses unless operationally required, and other stable correlation identifiers.

### 16.3 Operational controls

[REQ-BVP-OPS-001] A BVS **MUST** maintain documented key lifecycle, incident response, adapter change control, access review, audit logging, retention, and credential status procedures.

[REQ-BVP-OPS-002] BVS key compromise **MUST** trigger the upstream HIRI compromise procedure and an impact assessment for credentials signed by affected methods.

[REQ-BVP-OPS-003] Adapter incidents **MUST** identify affected adapter and implementation versions, verification-time range, credential population, and status response without altering historical signed evidence.

[REQ-BVP-OPS-004] Operator audit claims **MUST** identify scheme, scope, period, auditor, exceptions, and expiry; a self-declared badge **MUST NOT** be represented as an independent audit.

---

## 17. Contexts, Schemas, and Conformance

### 17.1 Pinned resources

[REQ-BVP-RESOURCE-001] A BVP implementation **MUST** use locally pinned or hash-verified contexts, schemas, evidence profiles, and adapter profiles for normative processing.

[REQ-BVP-RESOURCE-002] First-use remote retrieval **MUST NOT** establish a trusted context or profile merely because TLS succeeded.

[REQ-BVP-RESOURCE-003] A mutable response at the same URL **MUST NOT** replace hash-pinned bytes for an already signed credential or transcript.

### 17.2 Intended roles

Intended BVP roles are Holder Binding Client, BVS Issuer, Adapter, Credential Verifier, and Relying-Party Policy Engine.

[REQ-BVP-CONF-001] A role claim **MUST** be scoped to implemented roles and **MUST** include the corresponding Core conformance role.

[REQ-BVP-CONF-002] An implementation **MUST NOT** claim BVP v3.0.0 conformance to this Working Draft before it advances to Candidate Specification.

[REQ-BVP-CONF-003] Candidate status **MUST** require published JSON Schemas, canonical context and profile bytes, SHA-256 pins, positive and adversarial signature vectors, replay vectors, adapter tests, requirement-to-test mapping, and security/privacy review.

[REQ-BVP-CONF-004] Placeholder examples containing `PLACEHOLDER`, `zBVS`, or `zHOLDER` **MUST NOT** be used as test vectors.

---

## 18. Migration from BVP v2.0.0

There is no wire-compatible migration.

| BVP v2.0.0 design | BVP v3.0.0 correction |
|-------------------|-----------------------|
| Credential Attestation Manifest | BVS-signed Resolution Manifest with Credential Claim content |
| `hiri:content` inside Mode 5 envelope | Removed; normal BVS credential uses Core public content |
| `/passport/main` subject or chain conventions | Stable BVS credential URI at `/data/credential-<opaque-id>` |
| Source provider treated like issuer | BVS is issuer; provider is evidence |
| One single-type challenge reused for multiple flows | Signed challenge enumerates every authorized intent |
| Unsigned BVS challenge | BVS-signed challenge and holder-signed response with exact targets |
| Provider endpoints embedded in base profile | Separate versioned, hash-pinned adapter profiles |
| First-use remote context fetch | Locally pinned or hash-verified resources |
| Custom revocation log | Core credential chain and authenticated current-head evidence |
| Unconfigured BVS silently ignored | Visible cryptographic evidence plus policy-untrusted or unknown result |
| Broad trust level | Tuple-scoped, named, versioned policy |
| Tier 1/2/3 audit labels | Named audit scheme, scope, auditor, dates, and exceptions |
| Standalone governance JSON signature | BVS-signed Resolution Manifest at `/data/bvs-governance` |

[REQ-BVP-MIGRATE-001] A v2.0.0 BVS artifact **MUST NOT** be relabeled as v3.0.0; the BVS **MUST** issue a new conforming credential after a valid v3 holder-binding and source-verification procedure.

[REQ-BVP-MIGRATE-002] A holder **MUST NOT** self-migrate a v2 BVS signature or source assertion into a v3 direct-issuer credential.

[REQ-BVP-MIGRATE-003] A relying party **MUST** keep legacy policy separate and **MUST NOT** infer v3 evidence-profile compliance from a v2 credential.

---

## Appendix A. Cryptographic Construction Summary

| Construction | Exact input |
|--------------|-------------|
| BVS challenge proof | `UTF8("HIRI-BVP-HOLDER-BINDING-CHALLENGE-V3") || 0x00 || JCS(unsignedChallenge)` |
| Holder response proof | `UTF8("HIRI-BVP-HOLDER-BINDING-RESPONSE-V3") || 0x00 || JCS(unsignedResponse)` |
| Signed challenge hash | `"sha256:" || lowercaseHex(SHA-256(JCS(completeSignedChallenge)))` |
| Signed response hash | `"sha256:" || lowercaseHex(SHA-256(JCS(completeSignedResponse)))` |
| BVS credential proof | Inherited unchanged from HIRI Protocol v3.1.1 and Passport Core |

---

## Appendix B. Open Core Issue Impact

| Core issue | BVP restriction |
|------------|-----------------|
| `OPEN-SD-01` | Sensitive and selective credential classes remain outside conformant scope. |
| `OPEN-HEAD-01` | Interoperable confirmed-current status remains blocked; configured sources may establish Core `active`. |
| `OPEN-CONTEXT-01` | Placeholder context, schema, and profile URLs block Candidate status. |
| `OPEN-RECOVERY-01` | BVS holder binding cannot recover a lost holder authority. |
| `OPEN-TRANSPORT-01` | No claim of selective-presentation transport security. |

---

## End of Working Draft
