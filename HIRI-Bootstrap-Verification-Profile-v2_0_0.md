# HIRI Bootstrap Verification Profile
## Addendum Specification

**Version:** 2.0.0
**Previous:** 1.0.0 (superseded — not implementation-ready; do not implement)
**Status:** Draft
**Date:** March 2026
**Depends on:**
- HIRI Digital Passport Extension v1.9.0
- HIRI Passport UX and Architecture Specification v1.5.0
**Maintainer:** Ontology of Freedom Initiative

---

## Document Status

This addendum defines the Bootstrap Verification Layer — the infrastructure that converts existing web identity signals (OAuth/OIDC, commercial ID scanning, public professional registries) into HIRI Credential Attestation Manifests. It is a companion to the HIRI Digital Passport Extension v1.9.0 and does not modify any normative protocol requirements.

### Breaking Changes from v1.0.0

v2.0.0 is a breaking revision. v1.0.0 MUST NOT be implemented. Key changes:

- **Holder-key binding is now required.** Sessions are cryptographically bound to the holder's passport key before any OAuth flow begins.
- **Full attestation envelope is now normative.** Each credential schema is the value of `hiri:attestation.claim` inside a complete `hiri:AttestationManifest`.
- **Privacy mode corrected.** `GovernmentIdScanVerification` is `selective-disclosure`, not `proof-of-possession`.
- **Timestamps expanded.** `attestedAt` (required by parent spec) distinguished from `verifiedAt` and `sourceObservedAt`.
- **Revocation log behavior corrected.** Issuance does NOT append to revocation log.
- **Provider identifiers withheld by default.** Stable cross-session identifiers (Google sub, GitHub ID, etc.) are selective and withheld from default presentations.
- **LinkedIn profile renamed** to `LinkedInAccountCredential`; identity verification claims removed.
- **Microsoft profile corrected.** `offline_access` removed; email reliability limitation documented; Entra credential renamed.
- **ID scan profile corrected.** NIST SP 800-76 replaced by SP 800-63A-4; numeric face score replaced by performance requirements.
- **Professional registry examples corrected.** NY example fixed; PACER removed; `goodStanding` semantics tightened.
- **Trust policy is now granular** by source, method, credential type, jurisdiction, and assurance profile.

---

## Table of Contents

1. [Introduction and Design Principles](#1-introduction-and-design-principles)
2. [Normative BVS Attestation Envelope](#2-normative-bvs-attestation-envelope)
3. [Common Evidence Model](#3-common-evidence-model)
4. [Holder-Key Binding Protocol](#4-holder-key-binding-protocol)
5. [Session and State Security](#5-session-and-state-security)
6. [Credential Claim Schemas](#6-credential-claim-schemas)
7. [Provider Adapter Profiles](#7-provider-adapter-profiles)
8. [Phone and SMS Verification Profile](#8-phone-and-sms-verification-profile)
9. [Commercial ID Scan Verification Profile](#9-commercial-id-scan-verification-profile)
10. [Professional Registry Verification Profile](#10-professional-registry-verification-profile)
11. [Verification Service Trust Model](#11-verification-service-trust-model)
12. [BVSGovernanceDocument Schema](#12-bvsgovernancedocument-schema)
13. [Verification Service Operator Requirements](#13-verification-service-operator-requirements)
14. [SDK Integration](#14-sdk-integration)

**Appendices**
- [A: Provider Adapter Reference Tables](#appendix-a-provider-adapter-reference-tables)
- [B: Professional Registry Reference](#appendix-b-professional-registry-reference)
- [C: Assurance Profile Registry](#appendix-c-assurance-profile-registry)
- [D: Error Code Registry](#appendix-d-error-code-registry)
- [E: Worked Examples](#appendix-e-worked-examples)
- [F: JSON-LD Context](#appendix-f-json-ld-context)

---

## 1. Introduction and Design Principles

### 1.1 The Bootstrap Problem

A holder who creates a HIRI passport on day one has a cryptographic identity but no verified claims about themselves. The credential types that matter most — government ID, employment, professional licenses, education — require their issuing institutions to have deployed HIRI natively. Most have not yet done so.

The bootstrap problem: how does a holder build a meaningful passport before their institutions have deployed HIRI, and how does a verifier assess credentials issued during that transitional period?

A **Bootstrap Verification Service (BVS)** addresses this by:
1. Performing verification using existing web infrastructure
2. Issuing HIRI credentials whose claims accurately reflect what was verified and how
3. Signing those credentials with its own HIRI authority — making the trust source explicit
4. Providing verifiers with auditable, machine-verifiable evidence of the verification procedure

### 1.2 The Central Invariant

**A BVS attests that it performed a particular verification procedure at a particular time. It does not impersonate the original institution.**

This invariant must be mechanically enforced through:
- Credential naming that identifies the BVS as issuer, not the underlying provider
- Assurance profiles that specify exactly what procedure was followed
- Evidence records that document what the BVS observed and verified
- Verifier policies that explicitly scope trust to specific (BVS, source, method, type) combinations

Verifiers must never treat a BVS-issued credential as equivalent to a credential from the primary source.

### 1.3 Design Principles

**Claim boundary enforcement.** A credential MUST only assert what the verification method can actually establish. A service verifying email control via OAuth MUST NOT assert the holder's name, even if the OAuth response includes a `name` field. Inference boundaries are mechanically enforced through assurance profiles and evidence records.

**Cryptographic subject binding.** Every verification session MUST be bound to the holder's HIRI keypair before any external verification occurs. The BVS MUST verify that the holder controls the private key corresponding to the submitted passport URI before the session can proceed.

**Honest labeling.** Credential type names reflect what was verified, not what the holder wishes were true. `LinkedInAccountCredential` attests to account authentication, not employment. `EntraTenantAccountCredential` attests to account membership in a tenant, not employment.

**Privacy-preserving defaults.** Stable provider identifiers that enable cross-verifier correlation (Google `sub`, GitHub numeric ID, Microsoft `oid+tid`) MUST be selective and withheld from default presentations.

**Evidence transparency.** Every credential carries an evidence block documenting the verification procedure, enabling verifiers to assess what was actually checked rather than trusting a credential label.

**Accurate timestamp semantics.** The specification distinguishes `sourceObservedAt` (when the external source was queried), `verifiedAt` (when the BVS procedure completed), and `attestedAt` (when the HIRI manifest was signed). These may differ by seconds or minutes and must not be conflated.

---

## 2. Normative BVS Attestation Envelope

### 2.1 Purpose

Every bootstrap credential produced by this specification is the value of `hiri:attestation.claim` inside a complete `hiri:AttestationManifest` (HIRI Protocol v3.1.1, §11). This section defines the normative envelope that all bootstrap credential types share.

Independent implementers MUST produce manifests conforming to this envelope. Deviation from any REQUIRED field is a conformance failure.

### 2.2 Complete Manifest Structure

```json
{
  "@context": [
    "https://hiri-protocol.org/spec/v3.1",
    "https://hiri-protocol.org/passport/v1",
    "https://hiri-protocol.org/bvp/v2"
  ],
  "@type": "hiri:AttestationManifest",

  "hiri:passport": {
    "manifestVersion": "2",
    "chain": {
      "previous": "sha256:<previous-manifest-hash>",
      "sequenceNumber": 2
    },
    "holder": {
      "passportURI": "hiri://key:ed25519:z<holder>/passport/main",
      "holderAuthority": "key:ed25519:z<holder>"
    }
  },

  "hiri:attestation": {
    "issuerAuthority": "key:ed25519:z<bvs-authority>",
    "subject": {
      "holderAuthority": "key:ed25519:z<holder>"
    },

    "claim": {
      "@type": "hiri:bvp:VerifiedEmailCredential",
      "credentialType": "VerifiedEmailCredential",
      "emailAddress": "sarah@example.com",
      "providerName": "google",
      "verifiedAt": "2026-03-15T10:30:00Z"
    },

    "evidence": {
      "@type": "hiri:bvp:VerificationEvidence",
      "method": "hiri:bvp:oauth-oidc",
      "sourceIssuer": "https://accounts.google.com",
      "sourceSubjectType": "provider-authoritative-email",
      "provider": "google",
      "adapterVersion": "hiri-bvp-google-v2.0",
      "assuranceProfile": "hiri:bvp:google-authoritative-email-v1",
      "sourceObservedAt": "2026-03-15T10:30:01Z",
      "checks": [
        {"type": "id-token-signature", "result": "pass"},
        {"type": "issuer", "result": "pass"},
        {"type": "audience", "result": "pass"},
        {"type": "nonce", "result": "pass"},
        {"type": "expiry", "result": "pass"},
        {"type": "email-verified-flag", "result": "pass"},
        {"type": "email-authority", "result": "provider-authoritative"},
        {"type": "holder-key-binding", "result": "pass", "challengeId": "chal_..."}
      ]
    },

    "privacy": {
      "mode": "selective-disclosure",
      "mandatoryStatements": ["credentialType", "attestedAt", "validUntil"],
      "selectiveStatements": ["emailAddress", "providerName", "providerAccountId"]
    },

    "attestedAt": "2026-03-15T10:30:05Z",
    "validUntil": "2027-03-15T10:30:05Z",

    "bvsBindingChallenge": {
      "challengeId": "chal_2026031510300001",
      "holderSignature": "z<Ed25519 signature by holder over canonical challenge>"
    }
  },

  "hiri:content": {
    "canonicalization": "URDNA2015",
    "hash": "sha256:<content-hash>"
  },

  "hiri:signature": {
    "type": "Ed25519Signature2020",
    "algorithm": "ed25519",
    "created": "2026-03-15T10:30:05Z",
    "verificationMethod": "hiri://key:ed25519:z<bvs-authority>/key/main#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z..."
  }
}
```

### 2.3 Envelope Field Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `@context` | REQUIRED | MUST include the BVP v2 context URI |
| `hiri:attestation.issuerAuthority` | REQUIRED | The BVS's HIRI authority — not the OAuth provider's authority |
| `hiri:attestation.subject.holderAuthority` | REQUIRED | The holder's HIRI authority — MUST match the signed binding challenge |
| `hiri:attestation.claim` | REQUIRED | The credential-type-specific claim object (§6) |
| `hiri:attestation.evidence` | REQUIRED | Verification evidence block (§3) |
| `hiri:attestation.privacy` | REQUIRED | Privacy mode and statement classification |
| `hiri:attestation.attestedAt` | REQUIRED | When the manifest was signed — distinct from `verifiedAt` |
| `hiri:attestation.validUntil` | REQUIRED | MUST be present and computed per credential type profile |
| `hiri:attestation.bvsBindingChallenge` | REQUIRED | The holder-signature proof from §4 |
| `hiri:content.canonicalization` | REQUIRED | MUST be `"URDNA2015"` |
| `hiri:signature` | REQUIRED | Ed25519 signature by the BVS authority |

### 2.4 Timestamp Ordering Invariant

The following ordering MUST hold for every bootstrap credential:

```
sourceObservedAt ≤ verifiedAt ≤ attestedAt < validUntil
```

Definitions:
- **`sourceObservedAt`** — when the BVS received the response from the external source (OAuth token exchange response timestamp, registry API response timestamp, ID scan result timestamp)
- **`verifiedAt`** — when the BVS's verification procedure completed (all checks passed)
- **`attestedAt`** — when the HIRI manifest was signed (`hiri:attestation.attestedAt` — required by protocol spec)
- **`validUntil`** — when the credential becomes stale and requires re-verification

Permitted clock skew between `sourceObservedAt` and `verifiedAt`: 60 seconds. Permitted clock skew between `verifiedAt` and `attestedAt`: 300 seconds. If either clock skew is exceeded, the manifest MUST NOT be issued.

The `verifiedAt` field appears in `hiri:attestation.claim` for holder and verifier consumption. The `sourceObservedAt` field appears in `hiri:attestation.evidence`. The `attestedAt` field appears in `hiri:attestation` as required by the protocol spec.

### 2.5 JSON-LD Context

The BVP v2 context is published at `https://hiri-protocol.org/bvp/v2/context.json`. It defines all terms introduced by this specification. Implementations MUST dereference and validate the context URI on first use and cache with the published TTL.

Every claim type in §6 has a corresponding `@type` IRI in the BVP context. The `credentialType` string value and the `@type` IRI MUST be consistent — the context maps each `credentialType` string to its corresponding IRI.

Conforming implementations MUST validate all credential payloads against the JSON Schema published alongside the BVP v2 context.

---

## 3. Common Evidence Model

### 3.1 VerificationEvidence Block

Every bootstrap credential MUST include a `hiri:bvp:VerificationEvidence` object in `hiri:attestation.evidence`. This block documents what the BVS observed and what checks it performed.

Verifiers who require more assurance than the credential label alone provides MUST evaluate the evidence block, not just the credential type.

### 3.2 Evidence Block Schema

```json
{
  "@type": "hiri:bvp:VerificationEvidence",
  "method": "<method-URI>",
  "sourceIssuer": "<URI of the authoritative source>",
  "sourceSubjectType": "<subject classification>",
  "provider": "<provider identifier>",
  "adapterVersion": "<BVP adapter version string>",
  "assuranceProfile": "<assurance profile IRI>",
  "sourceObservedAt": "<ISO 8601>",
  "checks": [
    {"type": "<check-type>", "result": "<pass|fail|not-applicable>", "note": "<optional>"}
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `method` | REQUIRED | Verification method URI from the Method Registry (§3.3) |
| `sourceIssuer` | REQUIRED | The authoritative URI of the source consulted |
| `sourceSubjectType` | REQUIRED | Classification of what kind of identity the source established (§3.4) |
| `provider` | REQUIRED | Short provider identifier matching adapter profile |
| `adapterVersion` | REQUIRED | Full version string of the BVP adapter used |
| `assuranceProfile` | REQUIRED | Assurance profile IRI from Appendix C |
| `sourceObservedAt` | REQUIRED | When the source response was received |
| `checks` | REQUIRED | Array of checks performed with results |

### 3.3 Method Registry

| Method URI | Description |
|-----------|-------------|
| `hiri:bvp:oauth-oidc` | OAuth 2.0 / OpenID Connect |
| `hiri:bvp:sms-otp` | SMS one-time password |
| `hiri:bvp:voice-otp` | Voice call one-time password |
| `hiri:bvp:commercial-id-scan` | Commercial identity document scan with biometric |
| `hiri:bvp:public-registry-query` | Query of a public professional registry |
| `hiri:bvp:mailbox-challenge` | SMTP-level mailbox challenge (distinct from OAuth email) |

### 3.4 Source Subject Type Classification

`sourceSubjectType` documents what the external source actually established about the subject:

| Value | Meaning |
|-------|---------|
| `provider-authoritative-email` | Email address is authoritative at the provider (e.g., Gmail) |
| `managed-domain-email` | Email at an organizational domain managed by the provider |
| `external-email-previously-verified` | External email address that was verified historically — weaker |
| `phone-sms-reachable` | Phone number that received an SMS at time of verification |
| `authenticated-oauth-account` | An OAuth account was authenticated — no further identity claims |
| `government-document-presented` | Government document was scanned and face-matched |
| `registry-license-status` | Professional license status as of registry query time |

---

## 4. Holder-Key Binding Protocol

### 4.1 Purpose

Section 2.3 of v1.0.0 recorded the submitted `holderAuthority` but did not verify that the person completing verification controls the corresponding private key. This allowed session injection: an attacker submits a victim's passport URI, completes OAuth with the attacker's account, and obtains a credential addressed to the victim's passport.

v2.0.0 requires a cryptographic challenge-response before any external verification begins. The BVS MUST verify that the session initiator controls the passport private key.

### 4.2 Binding Challenge

**Step 1 — Holder requests verification:**
```
POST https://bvs.example.com/api/v2/begin
{
  "holderPassportURI": "hiri://key:ed25519:z6Mk.../passport/main",
  "holderAuthority": "key:ed25519:z6Mk...",
  "verificationType": "VerifiedEmailCredential",
  "provider": "google"
}
```

**Step 2 — BVS issues binding challenge:**

The BVS MUST verify that the passport manifest exists and the holder key is active before issuing the challenge. If either check fails, the request is rejected before any challenge is issued.

```json
{
  "@type": "hiri:bvp:HIRIBVSHolderBindingChallenge",
  "bvsAuthority": "key:ed25519:z<bvs>",
  "holderAuthority": "key:ed25519:z<holder>",
  "sessionId": "sess_2026031510300001",
  "challengeId": "chal_2026031510300001",
  "verificationType": "VerifiedEmailCredential",
  "provider": "google",
  "nonce": "<base64url-32-bytes>",
  "issuedAt": "2026-03-15T10:30:00Z",
  "expiresAt": "2026-03-15T10:35:00Z"
}
```

The challenge is canonicalized using JCS (RFC 8785) and the canonical bytes are returned to the holder app.

**Step 3 — Holder signs the challenge:**

The holder's passport app signs `SHA-256(JCS(challenge))` with the holder's Ed25519 signing key. The signature and the challenge ID are returned to the BVS:

```
POST https://bvs.example.com/api/v2/bind
{
  "sessionId": "sess_2026031510300001",
  "challengeId": "chal_2026031510300001",
  "holderAuthority": "key:ed25519:z<holder>",
  "signature": "z<Ed25519 signature over SHA-256(JCS(challenge))>"
}
```

**Step 4 — BVS verifies the binding:**

The BVS MUST:
1. Retrieve the challenge from server-side session store by `challengeId`
2. Verify the challenge has not expired (`expiresAt` in the future)
3. Verify the challenge has not been used before (single-use enforcement)
4. Resolve the holder's passport authority to obtain the public key from their KeyDocument
5. Verify the Ed25519 signature over `SHA-256(JCS(challenge))`
6. Mark the challenge as consumed in the session store

If any check fails, the session is terminated. The BVS MUST NOT proceed to external verification.

**Step 5 — BVS records binding and begins external verification:**

On success, the BVS records the `challengeId` and `holderSignature` in the session. These are included in every credential issued from this session in `hiri:attestation.bvsBindingChallenge`.

**Challenge security properties:**
- 5-minute expiry (`expiresAt` — `issuedAt`)
- Single-use: each `challengeId` consumed after one successful binding
- Bound to specific `verificationType` and `provider` — a binding for email verification cannot be reused for ID scan
- Nonce: 32 random bytes preventing challenge prediction
- JCS canonicalization ensures deterministic signing across implementations

### 4.3 Multiple Credentials per Session

A single holder-key binding may cover multiple verification flows within a session window (e.g., email verification + phone verification in the same session). Each new verification type within the session window MUST reference the same `challengeId` unless the session has expired, in which case a new challenge is required.

---

## 5. Session and State Security

### 5.1 OAuth State Parameter

v1.0.0's HMAC-based state construction was insufficient (string concatenation ambiguity, no redirect URI binding, no replay protection, no expiry). v2.0.0 requires one of two approaches:

**Approach A — Opaque server-side session reference (RECOMMENDED):**

The `state` parameter is a cryptographically random, opaque, single-use token (minimum 256 bits). The BVS stores the full session context (holderAuthority, sessionId, challengeId, verificationType, provider, redirectURI, nonce, expiresAt) in server-side storage keyed to this token. The token is consumed on callback receipt and deleted regardless of verification outcome.

**Approach B — Signed structured token:**

A JWS-signed object with these claims:

```json
{
  "jti": "<uuid4 — unique state identifier>",
  "sub": "key:ed25519:z<holder>",
  "sid": "sess_...",
  "cid": "chal_...",
  "vt": "VerifiedEmailCredential",
  "pv": "google",
  "ruri": "<redirect-uri>",
  "iat": <unix timestamp>,
  "exp": <unix timestamp, max iat + 600>
}
```

Signed with the BVS's HIRI signing key. The `jti` is tracked in a consumed-token store to prevent replay.

### 5.2 PKCE and Nonce Requirements

For all OIDC providers, the BVS MUST:

1. Use PKCE with `code_challenge_method=S256`
2. Generate a fresh `nonce` parameter for every authorization request
3. Validate the `nonce` in the returned ID token matches the sent `nonce`

The `nonce` is distinct from the state parameter. State protects against CSRF; nonce binds the ID token to the specific authorization request.

### 5.3 ID Token Validation

For every OIDC provider, the BVS MUST validate the returned ID token per the OIDC specification:
1. Signature verification against the provider's JWKS endpoint (fetched or cached)
2. `iss` claim matches provider's issuer URI from discovery document
3. `aud` claim contains the BVS's registered client ID
4. `exp` claim is in the future
5. `iat` claim is within an acceptable clock skew window (maximum 300 seconds)
6. `nonce` claim matches the sent nonce
7. Any additional provider-specific required claims

Implementations MUST use a well-maintained OIDC library for ID token validation rather than manual JWT parsing.

### 5.4 Rate Limiting — Multiple Dimensions

Rate limits MUST be enforced across all dimensions:

| Dimension | Limit | Window |
|-----------|-------|--------|
| Per holder passport authority | 10 verifications | 24 hours |
| Per IP address | 50 verifications | 1 hour |
| Per session device fingerprint | 20 verifications | 24 hours |
| Per provider account (by `sub`/stable ID) | 5 verifications | 24 hours |
| Per phone number | 3 OTP requests | 24 hours |
| Global BVS rate | Operator-defined | Per SLA |

Per-number-only rate limiting (as in v1.0.0) allows denial-of-service against specific victims by exhausting their phone number's quota without authenticating. Multi-dimensional rate limits prevent this.

---

## 6. Credential Claim Schemas

This section defines the `hiri:attestation.claim` object for each credential type. Every schema is the inner claim only — the full manifest envelope is defined in §2.

### 6.1 VerifiedEmailCredential

**JSON-LD type:** `hiri:bvp:VerifiedEmailCredential`
**Assurance class:** Email control at time of verification

```json
{
  "@type": "hiri:bvp:VerifiedEmailCredential",
  "credentialType": "VerifiedEmailCredential",
  "emailAddress": "sarah@example.com",
  "providerName": "google",
  "emailAuthority": "provider-authoritative",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

| Field | Required | Default Privacy | Permitted Values |
|-------|----------|----------------|-----------------|
| `credentialType` | REQUIRED | Mandatory | `"VerifiedEmailCredential"` |
| `emailAddress` | REQUIRED | **Selective** | RFC 5321 address |
| `providerName` | REQUIRED | Selective | Provider registry value |
| `emailAuthority` | REQUIRED | Selective | See §6.1.1 |
| `hostedDomain` | OPTIONAL | Selective | Organizational domain, if applicable |
| `verifiedAt` | REQUIRED | Mandatory | ISO 8601 |

**Mandatory statements** (always disclosed): `credentialType`, `verifiedAt` (from manifest `attestedAt`), `validUntil`.

**Selective statements** (holder controls): `emailAddress`, `providerName`, `emailAuthority`, `hostedDomain`.

**Default presentation** (what verifiers see without explicit holder disclosure): `credentialType` and `attestedAt` only.

**`validUntil` computation:** 365 days from `attestedAt`.

**Note:** `emailAddress` is selective by default. Verifiers who need the email address must request it explicitly. Verifiers who only need "this person has a verified email at Google" receive `providerName: "google"` without the address.

#### 6.1.1 emailAuthority Classification

| Value | Meaning | Example |
|-------|---------|---------|
| `provider-authoritative` | Provider issues accounts at this domain — full authority | `sarah@gmail.com` |
| `managed-domain` | Organizational domain managed in provider's identity platform | `sarah@company.com` (Google Workspace) |
| `external-previously-verified` | External address, historically verified by provider — reduced assurance | External email used as Google account |

Verifiers requiring strong email assurance SHOULD require `emailAuthority: "provider-authoritative"` or `"managed-domain"`.

### 6.2 VerifiedPhoneCredential

**JSON-LD type:** `hiri:bvp:VerifiedPhoneCredential`

```json
{
  "@type": "hiri:bvp:VerifiedPhoneCredential",
  "credentialType": "VerifiedPhoneCredential",
  "phoneNumber": "+12025550123",
  "countryCode": "US",
  "numberType": "mobile",
  "verificationMethod": "sms-otp",
  "numberLookupProvider": "twilio",
  "numberLookupAt": "2026-03-15T10:29:58Z",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

| Field | Required | Default Privacy |
|-------|----------|----------------|
| `credentialType` | REQUIRED | Mandatory |
| `phoneNumber` | REQUIRED | **Selective** |
| `countryCode` | REQUIRED | Selective |
| `numberType` | REQUIRED | Selective |
| `verificationMethod` | REQUIRED | Selective |
| `numberLookupProvider` | OPTIONAL | Selective |
| `numberLookupAt` | OPTIONAL | Selective |
| `verifiedAt` | REQUIRED | Mandatory |

**`validUntil` computation:** 180 days from `attestedAt`.

**VoIP policy:** VoIP classification from number lookup MUST be recorded in the evidence block as a check result, not as a hard rejection without recourse. The BVS's `BVSGovernanceDocument` MUST declare its VoIP policy (reject, flag, accept). Default policy is to reject. If a BVS accepts VoIP numbers, the evidence `checks` array MUST include `{"type": "voip-check", "result": "voip-detected", "policy": "accepted"}` and the assurance profile MUST reflect reduced Sybil resistance.

### 6.3 LinkedInAccountCredential

**JSON-LD type:** `hiri:bvp:LinkedInAccountCredential`

**IMPORTANT LIMITATION:** This credential attests only that the holder authenticated to a LinkedIn account. LinkedIn's OIDC documentation explicitly states that Sign In with LinkedIn should not be marketed as identity verification. This credential MUST be labeled accordingly in all presentations.

```json
{
  "@type": "hiri:bvp:LinkedInAccountCredential",
  "credentialType": "LinkedInAccountCredential",
  "accountAuthenticated": true,
  "providerName": "linkedin",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

| Field | Required | Default Privacy |
|-------|----------|----------------|
| `credentialType` | REQUIRED | Mandatory |
| `accountAuthenticated` | REQUIRED | Selective |
| `providerName` | REQUIRED | Selective |
| `displayName` | OPTIONAL | **Selective** (self-reported) |
| `headline` | OPTIONAL | **Selective** (self-reported) |
| `currentPositionTitle` | OPTIONAL | **Selective** (self-reported; see §7.4) |
| `currentPositionCompany` | OPTIONAL | **Selective** (self-reported; see §7.4) |
| `verifiedAt` | REQUIRED | Mandatory |

**Default presentation:** `credentialType` and `attestedAt` only. No self-reported profile data in default presentation.

**Mandatory display note:** Any presentation of `LinkedInAccountCredential` MUST display: "Account authentication only — not identity or employment verification."

**`validUntil` computation:** 180 days from `attestedAt`.

**Provider account identifier:** NOT included in this credential. LinkedIn person identifiers may be application-context-specific. Cross-verifier correlation using LinkedIn identifiers is contrary to the parent specification's privacy goals.

### 6.4 GitHubAccountCredential

**JSON-LD type:** `hiri:bvp:GitHubAccountCredential`

```json
{
  "@type": "hiri:bvp:GitHubAccountCredential",
  "credentialType": "GitHubAccountCredential",
  "accountAuthenticated": true,
  "providerName": "github",
  "verifiedEmailAddress": "sarah@example.com",
  "accountAgeCategory": "established",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

| Field | Required | Default Privacy | Notes |
|-------|----------|----------------|-------|
| `credentialType` | REQUIRED | Mandatory | |
| `accountAuthenticated` | REQUIRED | Selective | |
| `providerName` | REQUIRED | Selective | |
| `verifiedEmailAddress` | OPTIONAL | **Selective** | Primary verified email from `/user/emails` |
| `accountAgeCategory` | REQUIRED | Selective | See §6.4.1 |
| `verifiedAt` | REQUIRED | Mandatory | |

**Informational evidence only (in evidence block, not claim):** `username` (mutable), `publicRepositoryCount` (snapshot), `providerAccountId` (not for cross-verifier correlation). These are evidence that the verification occurred, not identity claims.

**`validUntil` computation:** 365 days from `attestedAt`.

#### 6.4.1 accountAgeCategory

Rather than exposing the raw `created_at` timestamp, the credential uses a derived age category:

| Value | Meaning |
|-------|---------|
| `new` | Account created within 90 days |
| `recent` | Account created 90–365 days ago |
| `established` | Account created more than 1 year ago |

Verifiers who need the precise creation date may request it from the evidence block if available, but the category reduces linkability.

### 6.5 EntraTenantAccountCredential

**JSON-LD type:** `hiri:bvp:EntraTenantAccountCredential`

**IMPORTANT LIMITATION:** This credential attests that the holder authenticated to an account in the specified Microsoft Entra tenant. It does NOT establish employment at the tenant's organization. Entra tenants may contain guest accounts, partner accounts, and external collaborators.

```json
{
  "@type": "hiri:bvp:EntraTenantAccountCredential",
  "credentialType": "EntraTenantAccountCredential",
  "accountAuthenticated": true,
  "providerName": "microsoft-entra",
  "tenantDomain": "contoso.com",
  "accountType": "member",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

| Field | Required | Default Privacy | Notes |
|-------|----------|----------------|-------|
| `credentialType` | REQUIRED | Mandatory | |
| `accountAuthenticated` | REQUIRED | Selective | |
| `providerName` | REQUIRED | Selective | |
| `tenantDomain` | REQUIRED | Selective | The Entra tenant's verified domain |
| `accountType` | REQUIRED | Selective | `"member"` or `"guest"` |
| `verifiedAt` | REQUIRED | Mandatory | |

**`accountType`** is derived from the `userType` claim in the Entra ID token. `"guest"` accounts have been explicitly invited from outside the organization; `"member"` accounts are internal, but this still does not prove employment.

**`validUntil` computation:** 180 days from `attestedAt`.

**Tenant ID and object ID:** NOT included in this credential. `oid+tid` combination is a stable cross-verifier identifier — contrary to the parent specification's slot blinding privacy goals. The `tenantDomain` is sufficient for verifiers who need to assess organizational affiliation.

### 6.6 GovernmentIdScanVerification

**JSON-LD type:** `hiri:bvp:GovernmentIdScanVerification`
**Privacy mode:** `selective-disclosure`

**Default disclosure set** (not proof-of-possession; v1.0.0 was incorrect):

```json
{
  "@type": "hiri:bvp:GovernmentIdScanVerification",
  "credentialType": "GovernmentIdScanVerification",
  "documentPresented": true,
  "issuingCountry": "US",
  "documentNotExpiredAtVerification": true,
  "faceMatchPerformed": true,
  "livenessDetected": true,
  "scanProvider": "stripe-identity",
  "scanProviderVersion": "2026-Q1",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

**All claim fields:**

| Field | Required | Default Privacy | Notes |
|-------|----------|----------------|-------|
| `credentialType` | REQUIRED | Mandatory | |
| `documentPresented` | REQUIRED | Mandatory | Always true if credential exists |
| `issuingCountry` | REQUIRED | Default disclosed | ISO 3166-1 alpha-2 |
| `documentNotExpiredAtVerification` | REQUIRED | Default disclosed | |
| `faceMatchPerformed` | REQUIRED | Default disclosed | |
| `livenessDetected` | REQUIRED | Default disclosed | |
| `scanProvider` | REQUIRED | Default disclosed | |
| `scanProviderVersion` | REQUIRED | Default disclosed | Model/version for audit |
| `documentType` | OPTIONAL | **Selective** | `"passport"`, `"drivers_license"`, etc. |
| `issuingState` | OPTIONAL | **Selective** | ISO 3166-2 subdivision |
| `givenName` | OPTIONAL | **Selective** | |
| `familyName` | OPTIONAL | **Selective** | |
| `dateOfBirth` | OPTIONAL | **Selective** | YYYY-MM-DD |
| `ageOver18` | OPTIONAL | **Selective** | Boolean derived claim |
| `ageOver21` | OPTIONAL | **Selective** | Boolean derived claim |
| `nameMatchedToDocument` | OPTIONAL | **Selective** | Boolean — for employment verification |
| `verifiedAt` | REQUIRED | Mandatory | |

**NOT in credential:** `documentNumber`, `faceMatchScore` (raw vendor score), `livenessScore` (raw vendor score), `evidenceId` (BVS internal). These remain in sealed BVS evidence storage. Age-over claims are derived from date of birth — preferring derived claims over raw DOB minimizes unnecessary disclosure.

**Revocation classification:** `GovernmentIdScanVerification` MUST be treated as a sensitive credential type requiring hash-only revocation log entries per §16.8 of the protocol spec.

**`validUntil` computation:** Minimum of (365 days from `attestedAt`) and (the document's expiry date if available and stored in the BVS evidence record).

### 6.7 ProfessionalLicenseVerification

**JSON-LD type:** `hiri:bvp:ProfessionalLicenseVerification`

```json
{
  "@type": "hiri:bvp:ProfessionalLicenseVerification",
  "credentialType": "ProfessionalLicenseVerification",
  "licenseType": "bar-admission",
  "licenseNumber": "NY-1234567",
  "issuingJurisdiction": "US-NY",
  "licensingAuthority": "New York State Unified Court System — Office of Court Administration",
  "licenseStatus": "active",
  "admissionDate": "2015-11-20",
  "goodStanding": true,
  "registryQueryURI": "https://iapps.courts.state.ny.us/attorney/AttorneyDetails?id=1234567",
  "sourceObservedAt": "2026-03-15T11:00:00Z",
  "verifiedAt": "2026-03-15T11:00:00Z"
}
```

| Field | Required | Default Privacy | Notes |
|-------|----------|----------------|-------|
| `credentialType` | REQUIRED | Mandatory | |
| `licenseType` | REQUIRED | Selective | Controlled vocabulary |
| `licenseNumber` | REQUIRED | Selective | |
| `issuingJurisdiction` | REQUIRED | Selective | ISO 3166-2 |
| `licensingAuthority` | REQUIRED | Selective | Exact name of licensing body |
| `licenseStatus` | REQUIRED | Selective | MUST be `"active"` |
| `admissionDate` | OPTIONAL | Selective | |
| `goodStanding` | OPTIONAL | Selective | See §10.3 |
| `registryQueryURI` | REQUIRED | Selective | Public registry URL for independent verification |
| `sourceObservedAt` | REQUIRED | Selective | When registry was queried |
| `verifiedAt` | REQUIRED | Mandatory | |

**`validUntil` computation:** 90 days from `attestedAt`.

### 6.8 VerifiedWorkspaceDomainCredential

**JSON-LD type:** `hiri:bvp:VerifiedWorkspaceDomainCredential`

Distinct from `EntraTenantAccountCredential`. Requires stronger evidence that the email domain is organizationally controlled, not just that the account is in a tenant.

```json
{
  "@type": "hiri:bvp:VerifiedWorkspaceDomainCredential",
  "credentialType": "VerifiedWorkspaceDomainCredential",
  "organizationDomain": "company.com",
  "emailAddress": "sarah@company.com",
  "domainProvider": "google-workspace",
  "domainVerificationMethod": "provider-managed-dns",
  "verifiedAt": "2026-03-15T10:30:00Z"
}
```

**`validUntil` computation:** 180 days from `attestedAt`.

---

## 7. Provider Adapter Profiles

### 7.1 Versioning

Each provider adapter is a versioned document. Provider APIs change frequently; adapter profiles must track those changes. The `adapterVersion` field in evidence records (§3.2) records which adapter version was used, enabling verifiers to assess whether an older adapter may have had known limitations at the time of issuance.

Adapter versions are published alongside the BVP context at `https://hiri-protocol.org/bvp/v2/adapters/`.

### 7.2 Google OAuth Adapter (v2.0)

**Discovery document:** `https://accounts.google.com/.well-known/openid-configuration`
**Issuer:** `https://accounts.google.com`

**Required scopes by credential type:**

| Credential Type | Required Scopes |
|----------------|----------------|
| `VerifiedEmailCredential` | `openid email` |
| `VerifiedWorkspaceDomainCredential` | `openid email` (Workspace accounts only) |

**Token validation procedure (NORMATIVE — all steps required):**

1. Fetch JWKS from `https://www.googleapis.com/oauth2/v3/certs`
2. Verify ID token signature using appropriate key from JWKS
3. Verify `iss == "https://accounts.google.com"`
4. Verify `aud` contains the BVS's registered client ID
5. Verify `exp` is in the future (with ≤ 300s clock skew)
6. Verify `nonce` matches the sent nonce
7. For email credentials: verify `email_verified == true`
8. Classify email authority per §7.2.1

**Known limitations:**

Google may return `email_verified: true` for external (third-party) email addresses that were verified historically, not necessarily at this OAuth exchange. Steps 8 classify this case as `external-previously-verified` with reduced assurance.

**Step 8 — Email authority classification:**

| Condition | `emailAuthority` value |
|-----------|----------------------|
| `hd` field present in ID token | `managed-domain` |
| Email ends in `@gmail.com` or `@googlemail.com` | `provider-authoritative` |
| `email_verified: true`, no `hd`, not Gmail domain | `external-previously-verified` |

**Credentials produced:** `VerifiedEmailCredential`, optionally `VerifiedWorkspaceDomainCredential` if `hd` is present.

### 7.3 Microsoft OAuth Adapter (v2.0)

**Discovery document:** `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`

**Required scopes:** `openid email profile`

**DO NOT REQUEST:** `offline_access` — its purpose is to obtain refresh tokens for long-term access. Refresh tokens MUST NOT be obtained; all tokens are discarded after verification.

**Token validation procedure:** Same as §7.2, substituting Microsoft's discovery document and JWKS URI.

**Email claim reliability (CRITICAL):** Microsoft documentation warns that the `email` claim:
- Is not always present
- Is mutable
- Is not guaranteed to be correct
- Should not be used as a primary account identifier

Therefore, a `VerifiedEmailCredential` MUST NOT be issued from a Microsoft OAuth flow that returns only the `email` claim. If the BVS needs to issue a strong email credential for a Microsoft account, it MUST perform an additional mailbox challenge (method `hiri:bvp:mailbox-challenge`) — sending a code to the email address and having the holder confirm receipt.

Without the mailbox challenge, the Microsoft flow produces only `EntraTenantAccountCredential` (§6.5).

**Tenant classification:**

| Condition | Credential issued |
|-----------|-----------------|
| `tid == "9188040d-6c67-4c5b-b112-36a304b66dad"` (personal MSA) | No credential — personal MSA accounts have no organizational affiliation |
| Any other `tid` (Entra ID) | `EntraTenantAccountCredential` |
| Entra ID + mailbox challenge passes | `VerifiedEmailCredential` + `EntraTenantAccountCredential` |

### 7.4 LinkedIn OAuth Adapter (v2.0)

**Discovery document:** `https://www.linkedin.com/oauth/openid/discovery`

**Baseline scopes (available to all registered apps):** `openid email profile`

**Restricted scopes:** `r_basicprofile` — requires LinkedIn Partner Program approval. The baseline credential MUST NOT depend on restricted scopes.

**Token validation:** Standard OIDC token validation per §5.3.

**What is established:**
- The holder authenticated to a LinkedIn account
- The account's verified primary email address (if `email_verified: true` in userinfo)
- Self-reported profile data (headline, name) — NOT verified

**What is NOT established:**
- Employment at any organization
- Identity of the account holder in any legal sense
- That profile data is accurate

**Baseline credential:** `LinkedInAccountCredential` (§6.3)

**Self-reported profile fields** (if requested and available): `displayName`, `headline`, `currentPositionTitle`, `currentPositionCompany` — included only if BVS has r_basicprofile approval AND the credential includes an explicit self-reported disclaimer in the evidence block:

```json
{
  "checks": [
    ...,
    {"type": "profile-data-source", "result": "self-reported", "note": "Profile fields reflect holder-entered data, not third-party verification"}
  ]
}
```

**Cross-verifier identifiers:** LinkedIn person identifiers MUST NOT appear in the credential claim. They are recorded only in the sealed BVS evidence.

### 7.5 GitHub OAuth Adapter (v2.0)

**Scopes required:** `read:user user:email`
**User endpoint:** `https://api.github.com/user`
**Email endpoint:** `https://api.github.com/user/emails`

**Token validation:** GitHub uses its own OAuth 2.0 implementation, not full OIDC. Validate by fetching `/user` with the access token and confirming the response is non-empty with a numeric `id`.

**Email verification procedure:**
1. Fetch `/user/emails` with the access token
2. Select the email where `primary: true` AND `verified: true`
3. If no such email exists, do not include `verifiedEmailAddress` in the credential

**Credential produced:** `GitHubAccountCredential` (§6.4)

**Evidence block fields** (not in credential claim):
- `providerAccountId`: the numeric GitHub user ID (stable, but withheld from claim for privacy)
- `username`: the current login name (mutable, recorded for audit)

---

## 8. Phone and SMS Verification Profile

### 8.1 Verification Procedure

1. Holder submits phone number in any format
2. BVS normalizes to E.164 using `libphonenumber`
3. BVS validates the number is structurally valid under the applicable numbering plan
4. BVS queries SMS provider's number lookup API and records result in evidence
5. BVS applies configured VoIP policy
6. BVS sends OTP via selected channel
7. OTP delivery establishes present reachability at that number
8. Holder submits OTP within time window

**Correction from v1.0.0:** "Validate that the number is a valid dialable number" overstated what libphonenumber establishes. The correct statement is: libphonenumber validates structural compliance with the applicable numbering plan. Present reachability is established only by successful OTP delivery.

### 8.2 VoIP Policy (Updated)

VoIP classification is a risk signal, not an immutable property. Number portability limits the reliability of carrier and line-type metadata. The BVS's VoIP policy MUST be declared in its `BVSGovernanceDocument` and MUST be reflected in the credential's assurance profile.

The VoIP number lookup result MUST appear in the evidence `checks` array:

```json
{"type": "voip-check", "result": "not-voip", "provider": "twilio", "lookedUpAt": "..."}
```
or
```json
{"type": "voip-check", "result": "voip-detected", "provider": "twilio", "policy": "rejected", "lookedUpAt": "..."}
```

or, if the BVS's policy accepts VoIP:
```json
{"type": "voip-check", "result": "voip-detected", "provider": "twilio", "policy": "accepted-with-reduced-assurance", "lookedUpAt": "..."}
```

When `policy: "accepted-with-reduced-assurance"`, the assurance profile used MUST be a distinct reduced-assurance profile (Appendix C).

---

## 9. Commercial ID Scan Verification Profile

### 9.1 Standards Reference

**Correction from v1.0.0:** NIST SP 800-76 is a PIV biometric data specification (and some revisions have been superseded). It is not the appropriate standard for remote identity proofing.

The correct reference for remote identity proofing is:
- **NIST SP 800-63A-4** (Digital Identity Guidelines — Enrollment and Identity Proofing)
- IAL2 (Identity Assurance Level 2) requirements for remote identity proofing with document verification and biometric binding

The BVS MUST declare in its `BVSGovernanceDocument` which assurance level its ID scan integration achieves.

### 9.2 Face Matching Performance Requirements

**Correction from v1.0.0:** A face-match score of 0.80 from one vendor is not equivalent to 0.80 from another. Raw scores are vendor-specific and not interoperable.

The BVS's ID scan integration MUST be evaluated and declared on measurable performance characteristics:

| Metric | Required Declaration | Notes |
|--------|---------------------|-------|
| False Match Rate (FMR) | REQUIRED | At the operating threshold |
| False Non-Match Rate (FNMR) | REQUIRED | At the operating threshold |
| Presentation Attack Detection | REQUIRED | Method and performance metrics |
| Test population | REQUIRED | Size, demographic composition |
| Provider/model/version | REQUIRED | Specific model evaluated |
| Evaluation date | REQUIRED | When performance was measured |
| Threshold profile identifier | REQUIRED | Named threshold, not raw score |

These declarations appear in the `BVSGovernanceDocument.idScanIntegration` field. The credential's evidence block records the `thresholdProfileId` and `scanProviderVersion` used for this specific scan.

Raw vendor scores (faceMatchScore, livenessScore) MUST NOT appear in the holder-facing credential. They remain in sealed BVS evidence storage.

### 9.3 Preferred Claim Structure

Rather than exposing raw document fields, `GovernmentIdScanVerification` prefers derived claims:

| Instead of | Use |
|-----------|-----|
| `dateOfBirth: "1988-04-15"` | `ageOver18: true`, `ageOver21: true` |
| `givenName + familyName` | `nameMatchedToDocument: true` (for employment verification) |
| `documentNumber` | Nothing — never include in credential |

Include `dateOfBirth` or name fields only when the verifier has explicitly requested them and the holder has consented via the P-1.6 secondary consent screen (sensitive fields per §4.9.7 of the UX spec).

### 9.4 Evidence Retention Policy

**Correction from v1.0.0:** "7 years under standard AML/KYC requirements" is not universally correct. Retention requirements vary significantly by:
- Jurisdiction (GDPR requires storage limitation; some EU national implementations are explicit)
- Use context (some financial regulations specify 5 years; some do not require raw document copies at all)
- Data type (biometric templates have stricter rules than document metadata in many jurisdictions)

The BVS MUST declare a retention profile in its `BVSGovernanceDocument`:

```json
{
  "evidenceRetentionProfiles": [
    {
      "credentialType": "GovernmentIdScanVerification",
      "jurisdiction": "US",
      "retentionBasis": "legal-obligation",
      "legalBasisReference": "31 CFR 1020.220 (Bank Secrecy Act CIP)",
      "rawDocumentImagesRetained": false,
      "documentMetadataRetained": true,
      "biometricTemplatesRetained": false,
      "providerEvidenceRetained": true,
      "retentionPeriod": "P5Y",
      "deletionPolicyURI": "https://bvs.example.com/retention"
    },
    {
      "credentialType": "GovernmentIdScanVerification",
      "jurisdiction": "EU",
      "retentionBasis": "legitimate-interest",
      "rawDocumentImagesRetained": false,
      "documentMetadataRetained": true,
      "biometricTemplatesRetained": false,
      "retentionPeriod": "P3Y",
      "deletionPolicyURI": "https://bvs.example.com/retention-eu"
    }
  ]
}
```

The default MUST be data minimization. Raw biometric images and document images SHOULD be deleted after successful extraction. Raw templates SHOULD be deleted after face matching. What remains in the evidence store is the extracted structured data, the match result, and the evidence reference ID.

---

## 10. Professional Registry Verification Profile

### 10.1 Licensing Authority Accuracy

**Correction from v1.0.0:** The New York attorney example incorrectly named the "New York State Bar Association" as the licensing body. The NYSBA is a professional membership organization, not the authority that licenses attorneys.

New York attorneys are registered through the **New York State Unified Court System, Office of Court Administration**. The four Appellate Divisions are the admitting courts. The worked example in Appendix E has been corrected.

**PACER removed:** v1.0.0 listed PACER under "All 50 state bars" with the query method for federal court admissions. PACER provides access to federal court records, not state bar licensing data. It is a distinct context. See Appendix B for the corrected registry reference.

### 10.2 Registry Query Procedure

1. Holder provides: `licenseNumber`, `licenseType`, `issuingJurisdiction`, `holderName`
2. BVS queries the authoritative registry API
3. BVS records the raw registry response in sealed evidence
4. BVS applies fuzzy name matching (§10.4) to confirm identity
5. BVS maps registry status to the normalized `licenseStatus` vocabulary
6. BVS issues credential only if `licenseStatus` is `"active"`

### 10.3 goodStanding Semantics

**Correction from v1.0.0:** "Active," "registered," "no public discipline found," and "good standing" are not always interchangeable. Formal certificates of good standing may involve a distinct process.

`goodStanding: true` MUST only be issued when the authoritative registry source explicitly returns a "good standing" status — not inferred from the absence of discipline records. When the registry does not explicitly support good standing semantics, the field MUST be absent from the credential (not `false`, not `null` — absent).

The evidence block MUST record the exact field name and value returned by the registry that was mapped to `goodStanding: true`.

### 10.4 Normative Fuzzy Name Matching

Independent implementations MUST produce consistent match decisions for the same inputs. The following normative matching procedure MUST be used:

**Normalization (applied to both registry name and holder-provided name):**
1. Apply Unicode NFC normalization (Unicode Standard Annex #15)
2. Convert diacritics to ASCII equivalents (NFD → strip combining marks → NFC)
3. Convert to uppercase
4. Remove punctuation (commas, periods, hyphens, apostrophes)
5. Collapse consecutive whitespace to single space
6. Trim leading and trailing whitespace

**Matching rules (applied in order):**
1. If normalized strings are identical: **automatic accept**
2. If Levenshtein distance ≤ 2 (allowing for common typos, middle initials added/dropped): **automatic accept**
3. If the registry name is a reordering of the holder-provided name (e.g., "Thompson, Sarah L." vs "Sarah L. Thompson"): normalize order, then apply rules 1–2
4. If one name contains all words from the other (superset/subset, e.g., "Sarah Thompson" vs "Sarah Louise Thompson"): **automatic accept**
5. All other cases: **MANDATORY HUMAN REVIEW** — MUST NOT auto-accept

**Audit requirement:** Every name match decision MUST be logged with: the normalized forms of both names, the rule applied, the automated decision, whether human review was performed, and the reviewer's decision if applicable.

---

## 11. Verification Service Trust Model

### 11.1 Granular Trust Policy

v1.0.0's tier-based trust model was insufficient — it conflated organizational identity, audit status, verification-method assurance, and operational security into a single tier. v2.0.0 requires granular trust policies.

**NORMATIVE:** A verifier's trust policy MUST scope trust to a specific combination of:
- BVS authority
- Source provider
- Verification method
- Credential type
- Jurisdiction (where applicable)

Trusting a BVS to verify Google email addresses does NOT imply trusting the same BVS to verify medical licenses or Microsoft tenant membership. Each (authority, source, method, type) combination requires explicit configuration.

### 11.2 Trust Policy Schema

```json
{
  "bvsTrustPolicies": [
    {
      "policyId": "policy-001",
      "bvsAuthority": "key:ed25519:z<bvs>",
      "bvsDomain": "verify.example.com",
      "credentialType": "VerifiedEmailCredential",
      "sourceProvider": "google",
      "verificationMethod": "hiri:bvp:oauth-oidc",
      "assuranceProfilesAccepted": ["hiri:bvp:google-authoritative-email-v1"],
      "emailAuthorityRequired": "provider-authoritative",
      "auditScopeHash": "sha256:<hash of BVS audit report>",
      "jurisdictions": [],
      "adapterVersionsAccepted": ["hiri-bvp-google-v2.0"],
      "freshnessPolicyDays": 365,
      "validUntil": "2027-03-15T00:00:00Z",
      "effectiveTrustLevel": "full"
    },
    {
      "policyId": "policy-002",
      "bvsAuthority": "key:ed25519:z<bvs>",
      "credentialType": "GovernmentIdScanVerification",
      "sourceProvider": "stripe-identity",
      "verificationMethod": "hiri:bvp:commercial-id-scan",
      "assuranceProfilesAccepted": ["hiri:bvp:id-scan-ial2-v1"],
      "auditScopeHash": "sha256:<hash covering ID scan audit>",
      "jurisdictions": ["US"],
      "adapterVersionsAccepted": ["hiri-bvp-stripe-identity-v2.0"],
      "freshnessPolicyDays": 365,
      "validUntil": "2027-03-15T00:00:00Z",
      "effectiveTrustLevel": "full"
    }
  ]
}
```

### 11.3 Default Trust for Unconfigured BVS

**Correction from v1.0.0:** A credential from an unconfigured BVS MUST be treated as `trustLevel: "untrusted"` — not `"partial"`. `"Partial"` implies weak acceptance; the correct behavior is no acceptance until explicit configuration.

Verifier software MUST require explicit trust policy configuration before accepting any bootstrap credential. An unconfigured BVS MUST result in the credential being silently ignored (not surfaced as a failed verification — the credential type may still be satisfied by other means).

### 11.4 Tier Model (Audit Status Only)

The tier model is retained but scoped narrowly to audit status — one of several dimensions in the full trust policy:

**Tier 1 — Self-Declared:** BVS publishes a conforming `BVSGovernanceDocument` with DNSSEC-bound authority. No independent audit.

**Tier 2 — Community-Audited:** Technical review of specific provider adapter implementations by at least two independent HIRI ecosystem participants. Audit is public and version-specific. Tier 2 is per-adapter, not per-BVS — a BVS may be Tier 2 for Google email and Tier 1 for LinkedIn.

**Tier 3 — Formally Audited:** Third-party security audit covering named controls, named providers, named software versions, and named verification methods. The audit report identifies exactly which adapters and flows were in scope. A SOC 2 report alone is not sufficient for Tier 3 unless it explicitly covers the HIRI BVP adapter implementations.

`trustTier` in the `BVSGovernanceDocument` is a claim made by the BVS about its own audit status. Verifiers MUST independently verify the claimed tier by reviewing the linked audit report. A verifier MUST NOT trust the declared string alone.

---

## 12. BVSGovernanceDocument Schema

### 12.1 Complete Schema

```json
{
  "@context": [
    "https://hiri-protocol.org/spec/v3.1",
    "https://hiri-protocol.org/bvp/v2"
  ],
  "@type": "hiri:bvp:BVSGovernanceDocument",

  "bvsAuthority": "key:ed25519:z<BVS-authority>",
  "bvsDomain": "verify.example.com",
  "bvsDisplayName": "Example Verification Service",

  "operatorIdentity": {
    "legalName": "Example Verification Services LLC",
    "jurisdiction": "US-DE",
    "registrationNumber": "6789012"
  },

  "supportedVerificationTypes": [
    {
      "credentialType": "VerifiedEmailCredential",
      "sourceProvider": "google",
      "adapterVersion": "hiri-bvp-google-v2.0",
      "assuranceProfile": "hiri:bvp:google-authoritative-email-v1",
      "providerDocumentationVersion": "Google OIDC 2026-Q1",
      "effectiveFrom": "2026-03-01T00:00:00Z",
      "effectiveUntil": "2027-03-01T00:00:00Z",
      "providerTermsCompliant": true
    }
  ],

  "holderKeyBindingImplemented": true,
  "pkceImplemented": true,
  "oauthStateMethod": "opaque-server-side-session",

  "trustTier": "tier-2",
  "auditReports": [
    {
      "scope": "VerifiedEmailCredential (google, microsoft), VerifiedPhoneCredential",
      "auditFirm": "CryptoAudit AG",
      "auditCompletedAt": "2026-01-15T00:00:00Z",
      "auditExpiry": "2027-01-15T00:00:00Z",
      "auditReportURI": "https://verify.example.com/audit/2026-email-phone",
      "auditScopeHash": "sha256:<hash of report>",
      "auditFramework": "HIRI BVP Adapter Audit Profile v1.0",
      "materialFindings": "none",
      "excludedFromScope": "GovernmentIdScanVerification, ProfessionalLicenseVerification"
    }
  ],

  "idScanIntegration": {
    "provider": "stripe-identity",
    "providerVersion": "2026-Q1",
    "assuranceLevel": "NIST-SP-800-63A-IAL2",
    "faceMatchThresholdProfileId": "stripe-identity-v3-ial2-threshold",
    "falseMatchRate": "0.001",
    "falseNonMatchRate": "0.05",
    "padMethod": "active-liveness-v2",
    "evaluationDate": "2025-09-01",
    "evaluationPopulationSize": 50000,
    "rawImagesDeletedAfterExtraction": true,
    "biometricTemplatesDeletedAfterMatch": true
  },

  "voipPolicy": "reject",
  "voipClassificationProvider": "twilio",

  "evidenceRetentionProfiles": [
    {
      "credentialType": "GovernmentIdScanVerification",
      "jurisdiction": "US",
      "retentionBasis": "legitimate-interest",
      "rawDocumentImagesRetained": false,
      "documentMetadataRetained": true,
      "biometricTemplatesRetained": false,
      "retentionPeriod": "P5Y",
      "deletionPolicyURI": "https://verify.example.com/retention"
    }
  ],

  "keyManagement": {
    "signingKeyHSMBacked": true,
    "keyRotationPeriod": "P365D",
    "emergencyRevocationKeyRegistered": true
  },

  "revocationLogURI": "https://verify.example.com/hiri/v1/revocation",
  "sensitiveCredentialHashOnlyRevocation": ["GovernmentIdScanVerification"],

  "subprocessors": [
    {"name": "Stripe Inc.", "role": "ID scan provider", "jurisdiction": "US"},
    {"name": "Twilio Inc.", "role": "SMS delivery and number lookup", "jurisdiction": "US"}
  ],

  "incidentHistoryURI": "https://verify.example.com/security/incidents",
  "incidentContact": "security@verify.example.com",
  "maxIncidentResponseTime": "PT1H",

  "conformanceTestReportHash": "sha256:<hash of conformance test run>",
  "conformanceTestRunAt": "2026-03-01T00:00:00Z",

  "governanceVersion": "1.0.0",
  "validFrom": "2026-03-15T00:00:00Z",
  "validUntil": "2027-03-15T00:00:00Z",

  "signature": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "hiri://key:ed25519:z<BVS-authority>/key/main#key-1",
    "proofValue": "z..."
  }
}
```

---

## 13. Verification Service Operator Requirements

### 13.1 DNSSEC Requirement

**Clarification from v1.0.0:** The parent specification recommends DNSSEC but does not universally require it for all organizational authority bootstraps. This addendum requires DNSSEC for all BVS domains as a stronger requirement appropriate to the trust relationship.

BVS domains MUST have DNSSEC enabled with a complete validated chain to a DNSSEC-signed root. The BVS MUST declare `dnssecEnabled: true` in its `BVSGovernanceDocument`. Verifiers MUST perform DNSSEC validation when resolving the BVS domain.

### 13.2 Revocation Log for Sensitive Types

`GovernmentIdScanVerification` MUST use hash-only revocation log entries per §16.8 of the protocol spec. The `sensitiveCredentialHashOnlyRevocation` field in the `BVSGovernanceDocument` declares which credential types receive this treatment.

**Correction from v1.0.0:** Issuance does NOT append to the revocation log. The revocation log receives entries only when revoking a credential — not when issuing one. The v1.0.0 issuance flow incorrectly included "Append to revocation log" as an issuance step.

---

## 14. SDK Integration

### 14.1 BVS Client SDK

```bash
npm install @hiri-protocol/bvs-client-sdk@^2.0.0
```

```typescript
import { BVSClient, BVSHolderBinding } from '@hiri-protocol/bvs-client-sdk';

const bvs = new BVSClient({
  bvsURI: 'https://verify.example.com',
  holderPassportURI: 'hiri://key:ed25519:z<holder>/passport/main',
  holderSigningKey: holderPrivateKey,  // v2.0 REQUIRED for binding
});

// Step 1: Get holder binding challenge and sign it
const { challenge, boundSession } = await bvs.beginWithBinding({
  verificationType: 'VerifiedEmailCredential',
  provider: 'google',
});
// SDK automatically signs the challenge with holderSigningKey

// Step 2: Redirect holder to OAuth
window.location.href = boundSession.oauthRedirectURI;

// After OAuth callback...
const result = await bvs.checkVerificationStatus(boundSession.sessionId);
if (result.status === 'complete') {
  // result.manifestRef — reference for the issued credential
}
```

### 14.2 Verifier-Side BVS Trust Evaluation

```typescript
import { BVSTrustEvaluator } from '@hiri-protocol/bvs-client-sdk';

const evaluator = new BVSTrustEvaluator({
  policies: [
    {
      policyId: 'email-google-policy',
      bvsAuthority: 'key:ed25519:z<bvs>',
      credentialType: 'VerifiedEmailCredential',
      sourceProvider: 'google',
      verificationMethod: 'hiri:bvp:oauth-oidc',
      assuranceProfilesAccepted: ['hiri:bvp:google-authoritative-email-v1'],
      emailAuthorityRequired: 'provider-authoritative',
      freshnessPolicyDays: 365,
    }
  ],
  // NO default trust — unconfigured BVS = untrusted
  unconfiguredBvsBehavior: 'reject',
});

const assessment = evaluator.assess(credential);
// assessment.trusted: boolean
// assessment.policyId: string | null
// assessment.reason: string
// assessment.credentialType: string
// assessment.assuranceProfile: string
// assessment.evidenceChecks: Check[]
```

### 14.3 Evidence Block Inspection

Verifiers requiring detailed evidence inspection:

```typescript
const manifest = await client.resolveManifest(credentialRef);
const evidence = manifest.hiri.attestation.evidence;

// Check what was verified
const holderBinding = evidence.checks.find(c => c.type === 'holder-key-binding');
const emailVerified = evidence.checks.find(c => c.type === 'email-verified-flag');

console.log(holderBinding.result);  // "pass"
console.log(evidence.sourceSubjectType);  // "provider-authoritative-email"
console.log(evidence.assuranceProfile);   // "hiri:bvp:google-authoritative-email-v1"
```

---

## Appendix A: Provider Adapter Reference Tables

### A.1 Google

| Property | Value |
|----------|-------|
| Discovery | `https://accounts.google.com/.well-known/openid-configuration` |
| Issuer | `https://accounts.google.com` |
| JWKS | `https://www.googleapis.com/oauth2/v3/certs` |
| Scopes for email | `openid email` |
| PKCE required | Yes (S256) |
| `email_verified` | Present in ID token; MUST be `true` |
| Personal MSA tenant | N/A (no Entra equivalent) |
| Workspace indicator | `hd` claim in ID token |

### A.2 Microsoft

| Property | Value |
|----------|-------|
| Discovery | `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration` |
| Scopes | `openid email profile` (no `offline_access`) |
| Personal MSA tenant | `9188040d-6c67-4c5b-b112-36a304b66dad` |
| `email` claim reliability | Not guaranteed present or correct — see §7.3 |
| Guest account indicator | `userType: "Guest"` in Graph API |

### A.3 LinkedIn

| Property | Value |
|----------|-------|
| Discovery | `https://www.linkedin.com/oauth/openid/discovery` |
| Baseline scopes | `openid email profile` |
| Restricted scopes | `r_basicprofile` (Partner Program only) |
| Identity verification | LinkedIn explicitly says OIDC is NOT identity verification |
| Stable identifier | Person URNs may be application-context-specific |

### A.4 GitHub

| Property | Value |
|----------|-------|
| Auth endpoint | `https://github.com/login/oauth/authorize` |
| Token endpoint | `https://github.com/login/oauth/access_token` |
| User endpoint | `https://api.github.com/user` |
| Email endpoint | `https://api.github.com/user/emails` |
| Scopes | `read:user user:email` |
| Stable ID | Numeric `id` field (not `login`) |

---

## Appendix B: Professional Registry Reference

| License Type | Authoritative Registry | Notes |
|-------------|----------------------|-------|
| NY Attorney | NY State Unified Court System — OCA | NOT the NYSBA |
| US Attorney (federal) | Specific federal court where admitted | Not PACER; court-by-court |
| US Physician | FSMB DocInfo (`https://www.docinfo.org`) | All US state licenses |
| US Registered Nurse | NURSYS (`https://www.nursys.com`) | |
| US Engineer (PE) | NCEES (`https://account.ncees.org`) | |
| US Financial Advisor | FINRA BrokerCheck (`https://brokercheck.finra.org`) | |
| US Investment Advisor | SEC IAPD (`https://adviserinfo.sec.gov`) | |

---

## Appendix C: Assurance Profile Registry

| Profile IRI | Credential Type | Method | Description |
|------------|----------------|--------|-------------|
| `hiri:bvp:google-authoritative-email-v1` | `VerifiedEmailCredential` | `oauth-oidc` | Google Gmail or Workspace, `email_verified: true`, provider-authoritative classification |
| `hiri:bvp:google-managed-domain-email-v1` | `VerifiedEmailCredential` | `oauth-oidc` | Google Workspace, `hd` present, managed domain |
| `hiri:bvp:google-external-email-v1` | `VerifiedEmailCredential` | `oauth-oidc` | External email used as Google account — reduced assurance |
| `hiri:bvp:sms-otp-mobile-v1` | `VerifiedPhoneCredential` | `sms-otp` | Mobile, non-VoIP, OTP confirmed |
| `hiri:bvp:sms-otp-voip-accepted-v1` | `VerifiedPhoneCredential` | `sms-otp` | VoIP accepted with reduced Sybil resistance |
| `hiri:bvp:id-scan-ial2-v1` | `GovernmentIdScanVerification` | `commercial-id-scan` | NIST SP 800-63A IAL2-equivalent |
| `hiri:bvp:registry-active-v1` | `ProfessionalLicenseVerification` | `public-registry-query` | Active license from authoritative registry |

---

## Appendix D: Error Code Registry

| Error Code | User-Facing Message |
|------------|-------------------|
| `BVS_HOLDER_BINDING_CHALLENGE_EXPIRED` | "The verification window expired. Please start over." |
| `BVS_HOLDER_BINDING_SIGNATURE_INVALID` | "Could not verify your passport key. Ensure you are using your current passport." |
| `BVS_HOLDER_BINDING_CHALLENGE_CONSUMED` | "This verification link has already been used. Please start over." |
| `OAUTH_EMAIL_NOT_VERIFIED` | "Your email address has not been verified by [provider]. Please verify it there first." |
| `OAUTH_NONCE_MISMATCH` | "Security check failed. Please start over." |
| `OAUTH_STATE_INVALID` | "Security check failed — session may have expired. Please start over." |
| `OAUTH_SCOPE_DENIED` | "You did not grant the required permissions. Please try again and approve all requested permissions." |
| `MICROSOFT_EMAIL_UNRELIABLE` | "Your Microsoft email address could not be confirmed. A mailbox challenge is required." |
| `LINKEDIN_IDENTITY_VERIFICATION_UNAVAILABLE` | "LinkedIn account authentication confirmed. Employment verification requires a separate process." |
| `PHONE_OTP_EXPIRED` | "The verification code expired. Request a new one." |
| `PHONE_OTP_MAX_ATTEMPTS` | "Too many incorrect attempts. Request a new code." |
| `PHONE_RATE_LIMITED` | "Too many verification requests. Please try again later." |
| `ID_SCAN_FACE_MATCH_BELOW_THRESHOLD` | "Identity could not be confirmed. Please try again in good lighting with a clear view of your face." |
| `ID_SCAN_LIVENESS_FAILED` | "Liveness check failed. Please try again — do not hold up a photo." |
| `ID_SCAN_DOCUMENT_EXPIRED` | "Your identity document has expired. Please use a valid, current document." |
| `REGISTRY_LICENSE_NOT_ACTIVE` | "This license is not currently active. Only active licenses can be verified." |
| `REGISTRY_NAME_MISMATCH_HUMAN_REVIEW` | "The name on your license could not be automatically matched. A manual review is required." |
| `REGISTRY_GOODSTANDING_NOT_SUPPORTED` | "Good standing status is not available from this registry. License status only." |
| `BVS_TIMESTAMP_ORDERING_VIOLATION` | (Internal — manifest not issued) |

---

## Appendix E: Worked Examples

### E.1 Complete Google Email Verification with Holder Binding

```
Step 1 — Holder requests verification
POST /api/v2/begin
{
  "holderPassportURI": "hiri://key:ed25519:z6Mk.../passport/main",
  "holderAuthority": "key:ed25519:z6Mk...",
  "verificationType": "VerifiedEmailCredential",
  "provider": "google"
}

BVS checks: passport exists? key active?
→ Both pass

Step 2 — BVS issues binding challenge
Response:
{
  "challenge": {
    "@type": "hiri:bvp:HIRIBVSHolderBindingChallenge",
    "bvsAuthority": "key:ed25519:z<bvs>",
    "holderAuthority": "key:ed25519:z6Mk...",
    "sessionId": "sess_001",
    "challengeId": "chal_001",
    "verificationType": "VerifiedEmailCredential",
    "provider": "google",
    "nonce": "YWJj...",
    "issuedAt": "2026-03-15T10:30:00Z",
    "expiresAt": "2026-03-15T10:35:00Z"
  },
  "canonicalBytes": "<JCS(challenge) as base64url>"
}

Step 3 — Holder app signs challenge
Holder's Ed25519 key signs SHA-256(JCS(challenge))

POST /api/v2/bind
{
  "sessionId": "sess_001",
  "challengeId": "chal_001",
  "holderAuthority": "key:ed25519:z6Mk...",
  "signature": "z<signature>"
}

BVS verifies: signature valid? challenge not expired? not consumed?
→ All pass. Challenge marked consumed. Session bound.

Step 4 — BVS generates OAuth URL
Response: { "oauthRedirectURI": "https://accounts.google.com/..." }

Step 5 — Holder authenticates at Google
OAuth callback received:
code=..., state=<opaque-session-token>

BVS exchanges code for tokens. Validates ID token:
✓ Signature (vs Google JWKS)
✓ iss == "https://accounts.google.com"
✓ aud == BVS client_id
✓ exp valid
✓ nonce matches
✓ email_verified == true
✓ email authority: "provider-authoritative" (gmail.com domain)

Tokens DELETED after claim extraction.

Step 6 — BVS issues manifest
attestedAt: 2026-03-15T10:30:08Z
sourceObservedAt: 2026-03-15T10:30:06Z
verifiedAt: 2026-03-15T10:30:07Z
validUntil: 2027-03-15T10:30:08Z

Ordering check: 10:30:06 ≤ 10:30:07 ≤ 10:30:08 < 2027-... ✓

Manifest signed by BVS key.
Holder receives push notification.
```

### E.2 NY Attorney License Verification (Corrected)

```
Holder submits:
{
  "verificationType": "ProfessionalLicenseVerification",
  "licenseType": "bar-admission",
  "licenseNumber": "1234567",
  "issuingJurisdiction": "US-NY",
  "holderName": "Sarah Thompson"
}

BVS queries OCA Attorney Registration:
GET https://iapps.courts.state.ny.us/attorney/AttorneySearch?
  registrationNumber=1234567

Registry returns:
{
  "name": "Thompson, Sarah L.",
  "status": "Active",
  "admissionDate": "2015-11-20",
  "county": "New York"
}

Note: Registry does NOT return an explicit "good standing" field.
→ goodStanding OMITTED from credential (not true, not false — absent)

Fuzzy name matching:
"Thompson, Sarah L." normalized: "THOMPSON SARAH L"
"Sarah Thompson" normalized: "SARAH THOMPSON"
Apply rule 3 (reordering): "SARAH L THOMPSON"
Apply rule 4 (superset): "SARAH THOMPSON" ⊆ "SARAH L THOMPSON" ✓
Result: automatic accept

Credential issued:
{
  "credentialType": "ProfessionalLicenseVerification",
  "licenseType": "bar-admission",
  "licenseNumber": "NY-1234567",
  "issuingJurisdiction": "US-NY",
  "licensingAuthority": "New York State Unified Court System — Office of Court Administration",
  "licenseStatus": "active",
  "admissionDate": "2015-11-20",
  "registryQueryURI": "https://iapps.courts.state.ny.us/attorney/AttorneyDetails?id=1234567",
  "sourceObservedAt": "2026-03-15T11:00:00Z",
  "verifiedAt": "2026-03-15T11:00:01Z"
}
```

---

## Appendix F: JSON-LD Context (Summary)

The full BVP v2 JSON-LD context is published at `https://hiri-protocol.org/bvp/v2/context.json`. The following summarizes the key term definitions:

```json
{
  "@context": {
    "hiri": "https://hiri-protocol.org/spec/v3.1#",
    "bvp": "https://hiri-protocol.org/bvp/v2#",
    "VerifiedEmailCredential": "bvp:VerifiedEmailCredential",
    "VerifiedPhoneCredential": "bvp:VerifiedPhoneCredential",
    "LinkedInAccountCredential": "bvp:LinkedInAccountCredential",
    "GitHubAccountCredential": "bvp:GitHubAccountCredential",
    "EntraTenantAccountCredential": "bvp:EntraTenantAccountCredential",
    "GovernmentIdScanVerification": "bvp:GovernmentIdScanVerification",
    "ProfessionalLicenseVerification": "bvp:ProfessionalLicenseVerification",
    "VerifiedWorkspaceDomainCredential": "bvp:VerifiedWorkspaceDomainCredential",
    "VerificationEvidence": "bvp:VerificationEvidence",
    "BVSGovernanceDocument": "bvp:BVSGovernanceDocument",
    "HIRIBVSHolderBindingChallenge": "bvp:HIRIBVSHolderBindingChallenge",
    "emailAuthority": { "@id": "bvp:emailAuthority" },
    "assuranceProfile": { "@id": "bvp:assuranceProfile" },
    "adapterVersion": { "@id": "bvp:adapterVersion" },
    "sourceObservedAt": { "@id": "bvp:sourceObservedAt", "@type": "xsd:dateTime" },
    "verifiedAt": { "@id": "bvp:verifiedAt", "@type": "xsd:dateTime" },
    "challengeId": { "@id": "bvp:challengeId" },
    "bvsBindingChallenge": { "@id": "bvp:bvsBindingChallenge" }
  }
}
```

JSON Schema files for each credential type in §6 are published alongside the context at `https://hiri-protocol.org/bvp/v2/schemas/`.

---

## Document History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-03 | Superseded | Initial draft — do not implement |
| **2.0.0** | **2026-03** | **Draft** | Breaking revision. Holder-key binding required (§4). Full attestation envelope normative (§2). Privacy mode corrected (selective-disclosure, not proof-of-possession). Three-timestamp model (sourceObservedAt / verifiedAt / attestedAt). Revocation log behavior corrected. Provider identifiers withheld by default. LinkedIn → LinkedInAccountCredential (account auth only). Microsoft offline_access removed; email reliability documented; Entra → EntraTenantAccountCredential. ID scan: NIST SP 800-63A-4, FMR/FNMR replacing 80% score. Professional registry: NY OCA corrected, PACER removed, goodStanding semantics tightened, normative fuzzy name matching. Granular trust policy by (authority, source, method, type, jurisdiction). VoIP as configurable risk signal. Evidence retention: jurisdiction-specific profiles. BVSGovernanceDocument expanded. |

---

## License

**Specification:** CC0 1.0 Universal (Public Domain)
**Reference Implementations:** Apache 2.0

---

*The central invariant of this specification: a BVS attests that it performed a particular verification procedure at a particular time. It does not impersonate the original institution. The inference boundary between "the provider returned this value" and "this real-world fact was verified" must be mechanically enforced — through credential naming, assurance profiles, evidence records, and verifier policy — not asserted by label alone.*
