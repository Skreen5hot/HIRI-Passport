# HIRI Digital Passport
## UX and Architecture Specification

**Version:** 1.5.0
**Previous:** 1.4.0
**Status:** Draft — Final
**Date:** March 2026
**Depends on:** HIRI Digital Passport Extension v1.9.0
**Maintainer:** Ontology of Freedom Initiative

---

## Document Status

This specification defines the user experience design requirements and technical architecture for all HIRI Digital Passport client applications, including the mobile app, desktop app, web viewer, issuer portal, and developer SDK. It is a companion specification to the HIRI Digital Passport Extension v1.9.0 and does not modify any normative protocol requirements.

All MUST/SHOULD/MAY language in this specification applies to implementations of the described applications. The normative cryptographic and protocol requirements remain in the HIRI Digital Passport Extension v1.9.0.

### Changelog: v1.4.0 → v1.5.0

| Change | Section | Description |
|--------|---------|-------------|
| **Guardian passphrase entropy requirements** | Appendix E.4, E.9 | Normative minimum entropy (zxcvbn score ≥ 3, ~45 bits). Entropy meter blocks progress below threshold. Common password lists checked client-side. |
| **Guardian revocation record normative** | Appendix E.7.1 | `guardianRevocation` format is now normative. Recovery flow MUST verify no active revocation for the presenting `guardianPublicKeyFingerprint` before accepting any share. |
| **Guardian passphrase upgrade path** | Appendix E.9 | New section. 180-day reminder for passphrase-mode guardians to upgrade to key-based enrollment. Full upgrade UX flow (GU-1, GU-2). |
| **Guardian coercion response guidance** | Appendix E.10 | New section. Holder coercion response checklist: rotate shares, emergency rekey, contact authority. "What not to do" explainer. |
| **NFC verifier-declared nonce policy** | §4.10.3, §4.10.7 | New `noncePolicy.maxNonceLifetimeSeconds` in DisclosureRequest. Verifiers may request shorter lifetime than transactionClass ceiling — never longer. |
| **Background NFC confirmation toast** | §4.10.3 | NORMATIVE: background NFC presentations MUST show a non-dismissible-for-2s toast: verifier name, timestamp, credential type shared. |
| **PX-2 pre-compute timestamp display** | §4.10.6 | Verification result shows "pre-computed X min ago." Helps holders detect stale bundles. |
| **BLE failure mode table** | §4.10.4 | Explicit failure-type → user-facing remediation → required app behavior mapping. |
| **Request-to-Fill client-side rate limiting** | §4.9.9 | Same verifier requesting new `requestedFields` within 30 days triggers warning badge on P-1. Configurable threshold. |
| **Self-attested scope labels** | §4.9.9, §9.4 | Optional `scopeLabel` on `SelfAttestedCredential` slots. SDK refuses cross-scope re-use without explicit re-consent. |
| **Privacy audit view (normative)** | §4.14 | New normative section. Settings → Privacy: per-verifier form-fill history, "revoke saved field" button, cross-verifier field usage summary. |
| **WASM alternate signing keys** | §3.2.1 | `trustedAlternateSigningKeys` array for enterprise builds. Non-reference kernel triggers persistent non-suppressible disclosure banner. |
| **Appendix F PR moderation checklist** | Appendix F.7 | Concrete six-step automated + two-step human review process with explicit pass/fail criteria. |
| **New screens** | Appendix A | PA-1 (Privacy Audit), GU-1/GU-2 (Guardian Upgrade), GC-1 (Coercion Response) added. |
| **New error codes** | Appendix B | Passphrase entropy, revocation conflict, rate limit, scope violation, non-reference kernel. |
| **§C.7 Scope Label Pattern** | Appendix C | New interaction pattern for scope-constrained self-attested field re-use. |

---

### Changelog: v1.3.0 → v1.4.0

| Change | Section | Description |
|--------|---------|-------------|
| **Guardian enrollment — cryptographic binding** | Appendix E.4, E.7 | NORMATIVE: Guardian enrollment now requires a signed challenge-response ceremony. Holder records guardian's public key fingerprint. Guardian signs a nonce; holder verifies. Recovery requests from unregistered keys are rejected. Guardian expiry (365 days default), rotation, and revocation flows added. |
| **Guardian storage warnings normative** | Appendix E.4 | Mandatory storage-risk warnings during enrollment: prohibits cloud photo storage, requires encrypted container recommendation, adds optional guardian passphrase as second factor. |
| **Guardian churn UX** | Appendix E.8 | New flows: guardian loss handling (GE-5), partial recovery guidance (GR-3), share rotation (GE-6). |
| **Proximity High-Value hardening** | §4.10.3, §4.10.4 | High-Value transactionClass: nonce lifetime ≤ 30s, biometric REQUIRED before NFC/BLE transmission, no background-launch NFC. BLE: mutual ECDH attestation — both sides sign each other's ephemeral public key before any credential transfer, preventing relay attacks. |
| **Sensitive field policy for Request-to-Fill** | §4.9.5, §4.9.7 | New `sensitivity` field on `requestedFields`: `"standard"` (default), `"high"` (secondary consent screen required), `"prohibited"` (silently dropped with warning). Default prohibited types: `ssn`, `biometric-template`, `tax-id`, `passport-number`. Default high-sensitivity types: `full-dob`, `full-address`, `national-id`. |
| **Secondary consent modal** | §4.9.7 | New Screen P-1.6: explicit secondary consent for high-sensitivity fields, displayed between P-1.5 and P-2. Verifier must declare `purpose` for each high-sensitivity field. |
| **WASM reproducible build guidance** | §3.2.1 | New subsection: canonical build instructions, deterministic compiler flags, WASM signing authority requirement, supply-chain CI checklist. |
| **Per-issuer checkpoint age display** | §4.7.3 | When cached checkpoints span multiple issuers with different ages, verifier shows per-issuer age breakdown rather than a single age. |
| **Phantom slot randomized padding** | §4.6, §10.1 | Optional randomized padding mode (within configured bounds, still rounded to Q=5 minimum) to reduce predictable leakage patterns. |
| **BLE MTU negotiation normative** | §4.10.4 | Explicit MTU negotiation and maximum presentation size guidance. CBOR compression requirement for presentations exceeding single-MTU size. |
| **Issuer directory governance appendix** | Appendix F | New INFORMATIVE appendix: directory entry signing requirements, community moderation process, dispute resolution, Sybil controls. |
| **Color-blind accessibility for trust tiers** | §10.1, §11 | Trust tier indicators now use shape + icon + label as primary differentiators (not just color). Color is additive, never sole indicator. |
| **Verifier purpose field normative** | §4.9.5 | `purpose` field in DisclosureRequest is now REQUIRED for any `requestedFields` entry. Holder sees declared purpose before filling any field. |
| **Appendix A, B, C updated** | Appendices | New screens (P-1.6, GE-5, GE-6, GR-3) added. New error codes. §C.6 Guardian Enrollment Pattern added. |

---

### Changelog: v1.2.0 → v1.3.0

| Change | Section | Description |
|--------|---------|-------------|
| **Guardian Recovery** | Appendix E | New normative appendix. Shamir Secret Sharing M-of-N threshold recovery. Guardian enrollment produces encrypted shares — no guardian holds a usable key alone. Reconstitution is fully local on the new device. Replaces the social-engineering-vulnerable "signature from guardians" pattern. |
| **Proximity Presentation Transport** | §4.10 | New section. NFC and Bluetooth Low Energy handshake specification for in-person gate checks. Integrates with Fast-Pass verification profile. Deferred revocation with explicit staleness disclosure. |
| **Issuer Discovery** | §4.11 | New section. Curated Issuer Directory with location and professional-category filtering. Browser extension / mobile handoff detection pattern for HIRI-accepting websites. Open, community-maintained directory schema. |
| **Wallet Portability Export** | §4.12 | New section. Standard export flow in Settings for moving passport to a conforming third-party wallet. Tied to existing OID4VP and DIDComm bridges (Appendix K of protocol spec). |
| **Security Health Score** | §4.13 | New section. Internal-only Bronze/Silver/Gold holder security posture indicator. Never exposed to verifiers. Strictly scoped to security hygiene practices, not identity quality. |
| **TOC updated** | TOC | §4.10–4.13 and Appendix E added. |
| **Appendix A screen inventory** | Appendix A | New screens: Issuer Directory, Proximity Presentation, Wallet Export, Guardian Enrollment, Guardian Recovery. |
| **Appendix B error messages** | Appendix B | Guardian recovery and proximity transport errors added. |
| **Appendix C §C.5** | Appendix C | The Proximity Handshake Pattern added. |
| **Appendix D §D.3** | Appendix D | Guardian Recovery Flow diagram added. |
| **Document history** | Document History | v1.3.0 entry added. |

---

### Changelog: v1.1.0 → v1.2.0

| Change | Section | Description |
|--------|---------|-------------|
| **Self-Attestation architecture** | §3.6 | New architectural section. Passport Kernel supports slots where `issuerAuthority == holderAuthority`. Three-tier trust vocabulary defined: Verified, Self-Attested, Ephemeral. |
| **Credential Trust Tiers** | §3.7 | New section defining how trust tiers are represented, displayed, and communicated across all surfaces. |
| **SelfAttestedCredential type** | §7.5 | New credential type added to registry. Holder is both issuer and subject. Fields are holder-defined. No third-party trust. |
| **Request-to-Fill pattern** | §4.9 | New UX pattern section. DisclosureRequest with `requestedFields` triggers collection state between P-1 and P-2. |
| **Screen P-1.5: Data Entry (Form-Fill)** | §4.9.2 | New screen. Renders input interface for fields requested but not present in the passport. |
| **Screen P-2 updated** | §4.6 | P-2 now shows verified and self-attested data in visually distinct sections before confirmation. |
| **Ephemeral vs. Persistent Slots** | §4.9.3 | Default is ephemeral (not saved to passport). Persistent is opt-in with explicit future-visibility warning. |
| **Passport Home — Self-Attested display** | §4.3 | Self-attested credentials display with distinct visual treatment (pencil icon, "Self-attested" badge). |
| **Security §12.8: Selective Persistence** | §12.8 | Normative requirement: default MUST be ephemeral. "Save to passport" MUST be deliberate opt-in. |
| **Security §12.9: Self-Attestation Trust Communication** | §12.9 | Normative requirement: self-attested data MUST be visually distinguished from issuer-verified data at every verification surface. |
| **SDK: DisclosureRequest fields** | §9.2 | `requestedFields` array added to DisclosureRequest schema. `essential`, `prompt`, `saveDefault` fields defined. |
| **SDK: createPresentation with self-attestation** | §9.3 | New SDK pattern for handling form-fill state in presentation creation. |
| **Appendix A screen inventory** | Appendix A | P-1.5 and updated P-2 added. |
| **Appendix B error messages** | Appendix B | Self-attestation validation errors added. |
| **Appendix C interaction patterns** | Appendix C | Form-Fill Pattern (§C.4) added. |

---

### Changelog: v1.0.0 → v1.1.0

| Change | Section | Description |
|--------|---------|-------------|
| **Peer-to-Peer Passport Migration** | §4.2.5, §4.2.6 | New flows: QR-paired same-network device transfer and Sovereign Cloud encrypted backup retrieval. Closes the new-device import gap. |
| **Key Rotation UX Flow** | §4.8 | New section. Three-screen key rotation flow covering compromise, routine rotation, and issuer re-stamping guidance. |
| **Verification Profiles** | §4.7.1, §4.7.2 | Fast-Pass (<500ms, 4h cache), Standard (live, 48h), and High-Value (live, 15min) profiles added to the verify flow. Profile selector on V-1. |
| **Padding UX — Phantom Slots** | §4.6, P-2 screen | P-2 now explicitly explains privacy slot padding to the holder using plain-language "phantom slots" terminology. |
| **Recovery Kit / Digital Will** | §4.2.4 | Print-to-PDF Recovery Kit flow added after recovery phrase confirmation. Physical storage guidance. |
| **CLI exit code 7** | §8.3 | New exit code for "Warning: credential expiring within 60 days." |
| **Web Viewer IP Privacy** | §6.4 | New section on IP address leakage to revocation log operators during URI resolution. Proxy/VPN recommendation normative. |
| **Terminology additions** | §1 | Fast-Pass Profile, Standard Profile, High-Value Profile, Phantom Slots, Recovery Kit, Peer-to-Peer Migration defined. |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [System Architecture](#3-system-architecture)
4. [Mobile Application](#4-mobile-application)
   - 4.8 [Key Rotation Flow](#48-key-rotation-flow)
   - 4.9 [The Request-to-Fill Pattern](#49-the-request-to-fill-pattern-self-attestation-in-presentation-flows)
   - 4.10 [Proximity Presentation Transport](#410-proximity-presentation-transport) *(new)*
   - 4.11 [Issuer Discovery](#411-issuer-discovery) *(new)*
   - 4.12 [Wallet Portability Export](#412-wallet-portability-export) *(new)*
   - 4.13 [Security Health Score](#413-security-health-score) *(new)*
5. [Desktop Application](#5-desktop-application)
6. [Web Viewer](#6-web-viewer)
7. [Issuer Portal](#7-issuer-portal)
8. [CLI Tool](#8-cli-tool)
9. [SDK](#9-sdk)
10. [Cross-Platform Component Library](#10-cross-platform-component-library)
11. [Accessibility](#11-accessibility)
12. [Security Considerations for the UX Layer](#12-security-considerations-for-the-ux-layer)
13. [Conformance Levels](#13-conformance-levels)

**Appendices**

- [A: Screen Inventory](#appendix-a-screen-inventory)
- [B: Error Message Registry](#appendix-b-error-message-registry)
- [C: Interaction Patterns](#appendix-c-interaction-patterns)
- [D: Architecture Diagrams](#appendix-d-architecture-diagrams)
- [E: Guardian Recovery Specification](#appendix-e-guardian-recovery-specification)

---

## 1. Introduction

### 1.1 Purpose

This specification defines how the HIRI Digital Passport protocol is presented to and experienced by three distinct user populations:

- **Holders** — individuals and synthetic moral persons who own and manage a HIRI passport
- **Issuers** — organizations that create and publish Credential Attestation Manifests
- **Verifiers** — entities that request and verify credential presentations

Each population has a distinct mental model, a distinct set of actions, and a distinct set of privacy and security expectations. This specification ensures those models are honored consistently across every surface.

### 1.2 The Central Design Constraint

The HIRI protocol's most important architectural property — holder sovereignty — creates a UX constraint that does not exist in most identity applications: **the application cannot recover the user's identity for them if they lose it.** There is no "forgot your key" flow backed by an email address stored on a server. The passport IS the keypair. The UX must make this legible without making it frightening, and must make backup genuinely easy without making it optional-feeling.

Every design decision in this specification ultimately derives from this constraint.

### 1.3 Mental Model

The canonical mental model presented to holders across all surfaces is:

> **A briefcase with a combination lock that you own.**

It travels with you. You decide what's inside. You decide who opens which compartment. Every document inside has a tamper-evident seal from whoever issued it. Anyone can verify those seals instantly without calling the issuer.

Unlike a briefcase: the seals cannot be forged, the documents cannot be altered, and no one can copy the contents you haven't shown them.

This model is communicated through onboarding, microcopy, and interaction patterns — never through explicit explanation.

### 1.4 Normative Interpretation Rule

Any interface behavior, screen flow, error message, or component pattern described with MUST is a conformance requirement. SHOULD indicates strong recommendation. MAY indicates a permitted option.

---

## 2. Design Principles

### 2.1 Sovereignty Is Felt, Not Explained

The user MUST NOT encounter a sign-up form, an email field, a password prompt, or a username during passport creation. The absence of these elements IS the communication of sovereignty. Explanatory text about sovereignty is secondary — the interaction itself teaches.

### 2.2 Privacy Defaults Are Protective, Never Limiting

Every credential defaults to minimum disclosure. Sharing more is always a deliberate act with a preview. The application MUST NEVER ask "are you sure you want to keep this private?" It MUST only ask "are you sure you want to share this?" The default state protects. The exceptional state requires confirmation.

### 2.3 Uncertainty Is Surfaced Honestly

When verification is degraded — offline, stale checkpoint, unavailable key document — the application MUST surface this clearly. Degraded states are not hidden behind a generic spinner or a generic error. The user sees what was checked, what was inconclusive, and what that means for their decision. Honest uncertainty is more trustworthy than false certainty.

### 2.4 The Technical Layer Is Accessible But Not Required

Every view that displays a credential, a presentation, or a verification result MUST provide a "View Technical Details" path that shows the underlying manifest JSON, signature algorithm, proof values, and Merkle inclusion proofs. This path is always available but never the default. Most users never see it. Developers and auditors always can.

### 2.5 The Passport Has No Social Dimension

The application MUST NOT include follower counts, endorsement feeds, public profile pages, or engagement metrics by default. A passport is identity infrastructure. Its value comes from cryptographic verifiability, not from social visibility. Features that add social dimensions without explicit holder configuration are prohibited in conforming implementations.

### 2.6 Backup Is Urgent, Never Optional-Feeling

The application MUST present backup options immediately after passport creation and MUST maintain a persistent, visible warning until at least one backup method is confirmed. Backup prompts MUST NOT be dismissible without a deliberate user action that acknowledges the risk of non-backup.

### 2.7 Presentation Is Consent, Not Submission

Every presentation flow MUST show the holder exactly what will be shared and exactly what will not be shared before any data leaves the device. The holder makes an informed consent decision on every presentation. The application MUST NOT auto-present without holder confirmation.

---

## 3. System Architecture

### 3.1 Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                                                                     │
│   Mobile App      Desktop App      Web Viewer      Issuer Portal   │
│   (iOS/Android)   (macOS/Win/Lin)  (Browser/WASM)  (Browser)       │
└──────────────┬──────────────────────────────────────────┬──────────┘
               │                                          │
               ▼                                          ▼
┌─────────────────────────────┐         ┌────────────────────────────┐
│    PASSPORT KERNEL (WASM)   │         │    ISSUER BACKEND          │
│                             │         │                            │
│  • Key generation           │         │  • Attestation signing     │
│  • Manifest signing         │         │  • Revocation log          │
│  • Presentation creation    │         │  • Org KeyDocument         │
│  • Slot token derivation    │         │  • Credential schemas      │
│  • Verification engine      │         │                            │
│  • Chain integrity walker   │         └────────────────────────────┘
│  • URDNA2015 canonicalization│
│  • JCS canonicalization     │
└─────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ADAPTER LAYER                                  │
│                                                                     │
│  Secure Storage    Network Adapter    Crypto Provider    Transport  │
│  (platform HSE)    (HTTP/IPFS)        (WebCrypto/HSM)   (NFC/BLE)  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                               │
│                                                                     │
│  Passport Store    Credential Cache    Verification Log    Keys     │
│  (local IPFS/FS)   (manifest bundles)  (audit records)    (HSE)    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 The Passport Kernel

The Passport Kernel is a pure-computation WASM module implementing the HIRI Protocol v3.1.1 kernel (Layer 0). It has no I/O, no network access, no filesystem access, and no non-deterministic API calls. All external capabilities are injected as interface implementations.

**Kernel responsibilities:**
- Ed25519 and P-256 key generation and signing (via injected CryptoProvider)
- JCS canonicalization (RFC 8785)
- URDNA2015 canonicalization (via injected RDF engine)
- Manifest construction and signing
- Chain integrity verification
- Presentation slot token derivation (HMAC-SHA256)
- Slot blinding key derivation (HKDF-SHA256)
- Verification result construction

**Kernel is NOT responsible for:**
- Storage
- Network requests
- Key persistence
- UI rendering
- Session management

The kernel MUST be identical across mobile, desktop, and web implementations. A single compiled WASM artifact MUST be used across all platforms to eliminate canonicalization divergence. The SHOULD in the previous version is elevated to MUST in v1.4.0.

#### 3.2.1 Reproducible Build Requirements

The WASM kernel artifact is a cryptographic dependency — a compromised or tampered kernel could silently miscompute signatures, slot tokens, or verification results. Supply-chain integrity requires a reproducible, auditable build process.

**Build requirements (NORMATIVE):**

The kernel build MUST be reproducible: given the same source commit and build toolchain version, independent builds MUST produce byte-identical WASM output. This requires:

- All compiler flags set to deterministic mode (no timestamps, no build-machine paths in output)
- Source dependencies pinned to exact content hashes (not version ranges)
- Toolchain version locked in the build manifest (e.g., `rust-toolchain.toml`, `emscripten` version pin)

**Signing authority:**

The WASM artifact MUST be signed by the HIRI Reference Implementation signing key, published at `https://github.com/hiri-protocol/passport-reference/releases`. Client applications MUST verify this signature before loading the kernel. The signing key's public key MUST be embedded in client application packages at compile time — not fetched at runtime.

**CI checklist (NORMATIVE — all items required before publishing a new kernel version):**

| # | Check | Verification |
|---|-------|-------------|
| 1 | Byte-identical build from clean environment | Two independent CI runners produce same SHA-256 of WASM output |
| 2 | Source dependency hash verification | All deps match pinned hashes in lockfile |
| 3 | Toolchain version matches declared version | `rustc --version` / `emcc --version` match manifest |
| 4 | Kernel signing | WASM artifact signed with release key; signature published |
| 5 | All Appendix H protocol test vectors pass | Full conformance suite green |
| 6 | Cross-platform parity test | Node.js, mobile WASM, and browser produce identical outputs for all H vectors |

Applications shipping a self-compiled or modified kernel MUST clearly disclose this to users and MUST NOT claim HIRI reference conformance. Users who receive a kernel verification failure MUST be warned before any signing operation proceeds.

**Alternate signing keys for enterprise builds (v1.5.0):**

Organizations operating HIRI wallet deployments in enterprise environments MAY configure a set of `trustedAlternateSigningKeys` — additional public keys beyond the HIRI reference implementation key that are trusted for kernel verification. This enables enterprise builds compiled from audited source to be deployed without depending on the reference implementation release cadence.

```json
{
  "kernelTrustPolicy": {
    "referenceSigningKeyHash": "sha256:<embedded-at-compile-time>",
    "trustedAlternateSigningKeys": [
      {
        "keyId": "enterprise-kernel-2026",
        "publicKey": "key:ed25519:z<enterprise-key>",
        "publishedAt": "https://security.corp.example.com/hiri-kernel-key.json",
        "validUntil": "2027-03-01T00:00:00Z"
      }
    ]
  }
}
```

**Non-reference kernel disclosure banner (NORMATIVE):**

When the loaded kernel artifact is signed by any key other than the HIRI reference implementation signing key, the application MUST display a persistent, non-suppressible disclosure banner in the header of every screen:

```
┌──────────────────────────────────────────┐
│  ⚠ Enterprise kernel — signed by        │
│  [enterprise-kernel-2026]               │
│  Not the HIRI reference implementation  │
│  [Learn more]                           │
└──────────────────────────────────────────┘
```

This banner:
- MUST NOT be hidden, collapsed, or styled to minimize its visual prominence
- MUST appear on every screen, not just a one-time acknowledgment dialog
- MUST include the `keyId` of the signing key that was used
- MUST link to the organization's published kernel key document

The requirement exists because holders deserve to know that the cryptographic core of their identity tool is not the reference implementation. An enterprise may have excellent reasons for a custom kernel; the holder still has the right to know.

### 3.3 Adapter Layer

The Adapter Layer bridges the kernel to platform capabilities. Each adapter implements a defined interface.

**CryptoProvider interface:**
```typescript
interface CryptoProvider {
  generateKeyPair(algorithm: "ed25519" | "p256"): Promise<CryptoKeyPair>;
  sign(key: CryptoKey, data: Uint8Array): Promise<Uint8Array>;
  verify(key: CryptoKey, sig: Uint8Array, data: Uint8Array): Promise<boolean>;
  hash(data: Uint8Array): Promise<Uint8Array>;
  hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array>;
  hkdf(ikm: Uint8Array, salt: string, info: string, len: number): Promise<Uint8Array>;
}
```

Platform implementations:
- **iOS:** CryptoKit + Secure Enclave for key storage
- **Android:** AndroidKeyStore + StrongBox where available
- **Desktop:** OS keychain (Keychain/Credential Manager/libsecret)
- **Browser:** WebCrypto API (non-extractable keys in IndexedDB)

**NetworkAdapter interface:**
```typescript
interface NetworkAdapter {
  fetchManifest(uri: string): Promise<ManifestBundle>;
  fetchKeyDocument(authority: string): Promise<KeyDocument>;
  fetchRevocationLogEntry(logURI: string, manifestHash: string): Promise<LogEntry | null>;
  fetchCheckpoint(logURI: string): Promise<Checkpoint>;
  publishManifest(manifest: SignedManifest): Promise<void>;
}
```

**SecureStorage interface:**
```typescript
interface SecureStorage {
  storeKey(id: string, key: CryptoKey): Promise<void>;
  retrieveKey(id: string): Promise<CryptoKey>;
  storeBlindingKey(passportId: string, key: Uint8Array): Promise<void>;
  retrieveBlindingKey(passportId: string): Promise<Uint8Array>;
  deleteKey(id: string): Promise<void>;
}
```

Keys stored via SecureStorage MUST be hardware-backed where the platform supports it. The application SHOULD surface to the user whether their key is hardware-backed or software-only.

### 3.4 Persistence Layer

**Passport Store:** Local content-addressed storage for manifest bundles. On mobile and desktop, this is a local directory following HIRI-IPFS filesystem layout (§D.2 of the protocol spec). On web, this is IndexedDB. The store is replicated to any configured backup destinations.

**Credential Cache:** Cached manifest bundles for credential attestations. Cache entries expire per the KeyDocument TTL rules (§6.4 of the passport extension). Cache misses trigger network resolution.

**Verification Log:** An append-only local log of verification events — when the holder presented credentials, to whom, which slots, and the result. This is the holder's own audit record. It is never transmitted to verifiers.

**Key Store:** Platform secure storage. Keys are never written to the Passport Store or the Credential Cache. The Key Store and Persistence Layer are strictly separated.

### 3.5 Communication Flows

**Holder ↔ Issuer (credential acquisition):**
```
Holder App                    Issuer Portal / System
    │                                    │
    │── Passport URI (QR / paste) ──────▶│
    │                                    │ (generate attestation)
    │◀── Push notification or deep link ─│
    │                                    │
    │── Verify attestation locally       │
    │                                    │
    │── Add to passport (new version) ───▶ IPFS / content store
```

**Holder ↔ Verifier (credential presentation):**
```
Verifier App / Portal         Holder App
    │                              │
    │── DisclosureRequest ─────────▶│  (QR / NFC / deep link)
    │     (nonce, requestedSlots)   │
    │                              │ (holder reviews and approves)
    │◀── PassportPresentation ──────│  (signed, blinded tokens)
    │                              │
    │── Verify locally             │
    │── Check revocation log       │
    │── Check org bootstrap        │
    │                              │
    │── Verification result        │
```

**All verification happens locally in the verifier's kernel.** Presentations are never sent to a central server for verification. The verifier fetches manifest bundles from content-addressed storage and verifies using its local kernel.

### 3.6 Self-Attestation

The Passport Kernel MUST support signing Credential Attestation Manifests where the `issuerAuthority` matches the `holderAuthority`. These are **Self-Attested Slots**. They carry no third-party trust but provide cryptographic proof that the data was asserted by the passport owner at a specific time.

**Architecture of a Self-Attested Slot:**

```
Tier 2: Self-Attested Credential Manifest
  ├── issuerAuthority = holderAuthority  ← same keypair
  ├── hiri:attestation.subject.holderAuthority = holderAuthority
  ├── hiri:attestation.claim = { holder-provided fields }
  └── hiri:signature (holder's Ed25519 key — same key as passport)
```

**What self-attestation proves:**
- The data was asserted by the entity who controls this passport
- The data has not been modified since it was asserted
- The assertion was made at the timestamp in `attestedAt`

**What self-attestation does NOT prove:**
- That the data is true (no third party has verified it)
- That the data matches any external record
- That the holder's claim about themselves is accurate

This distinction MUST be preserved throughout the UX. Self-attested data is never presented equivalently to issuer-verified data.

**Kernel behavior:** The kernel's `issue()` function accepts `issuerAuthority == holderAuthority` and signs the manifest with the holder's key. No additional signing path or ceremony is required. From the kernel's perspective, the holder is acting as their own issuer. The trust tier is determined by the calling application, not the kernel.

**Ephemeral self-attestation:** Self-asserted data MAY be signed into a presentation without ever being persisted as a passport slot. In this case, the kernel signs a presentation-scoped assertion — a `SelfAttestedField` object embedded directly in the `disclosedSlots` block rather than as a reference to a stored manifest. See §4.9.3.

### 3.7 Credential Trust Tiers

All credentials in the HIRI ecosystem fall into one of three trust tiers. The trust tier determines visual treatment, disclosure behavior, and how verifiers MUST communicate the credential's provenance.

#### Tier 1: Verified

A credential signed by a third-party issuer whose authority is distinct from the holder's authority and whose organizational identity has been bootstrapped via §10. The issuer has independently confirmed the claim about the holder.

```
Trust signal: ✓ Verified by [Issuer Name]
Visual: Green check, filled
Revocation: Checked against issuer's revocation log
```

#### Tier 2: Self-Attested

A credential signed by the holder using their own passport key. The holder is asserting something about themselves. No third party has confirmed it.

```
Trust signal: ✏ Self-attested by [Holder]
Visual: Pencil icon, neutral grey
Revocation: N/A (holder controls the credential; they can remove it)
```

#### Tier 3: Ephemeral

A self-asserted value provided during a presentation flow and signed into the presentation only. Not stored in the passport. Cannot be re-used in future presentations without re-entry.

```
Trust signal: ⏱ Provided for this session only
Visual: Dashed border, amber tint
Revocation: N/A (not persisted; expires with the presentation)
```

**Trust tier display rule (NORMATIVE):** Every surface that displays a credential — the Passport Home, the Credential Detail view, the P-2 review screen, the Verification Result, and the web viewer — MUST visually distinguish Tier 1 from Tier 2 from Tier 3. Commingling them without visual distinction is a conformance failure. The trust tier is not a minor label — it is the primary semantic fact about a credential.

---

## 4. Mobile Application

The mobile application is the primary holder experience. It is the surface where passports are created, credentials are collected, and presentations are made.

### 4.1 Navigation Architecture

The application uses a tab-based navigation with four primary tabs:

```
┌──────────────────────────────────────┐
│              [STATUS BAR]            │
│                                      │
│           [CONTENT AREA]            │
│                                      │
│                                      │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  🪪 Passport │ 🔒 Present   │   │
│  │  ✓ Verify   │ ⚙ Settings   │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

- **Passport** — view and manage the holder's passport and credentials
- **Present** — initiate a presentation from a DisclosureRequest (QR scan or notification)
- **Verify** — verify someone else's passport or a received presentation
- **Settings** — backup, key management, trusted issuers, privacy preferences

### 4.2 Onboarding Flow

#### Screen O-1: Landing

Displayed on first launch. No header. Full-screen.

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│         [PASSPORT ICON / MARK]      │
│                                      │
│      Your passport starts here.     │
│                                      │
│   It belongs to you.                │
│   No account required.              │
│   No company holds your identity.   │
│                                      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Create my passport        │  │
│  └────────────────────────────────┘  │
│                                      │
│       Already have one? Import       │
│                                      │
└──────────────────────────────────────┘
```

**Create my passport** triggers key generation. During the ~200ms generation process, display a brief animation — a seal being pressed, something that communicates cryptographic finalization. Do NOT use a loading spinner; the visual language should communicate permanence, not waiting.

**Import** opens the passport import modal, which presents three paths:

```
┌──────────────────────────────────────┐
│  Import existing passport            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📱 Transfer from my old       │  │
│  │     device (same Wi-Fi)        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ☁ Restore from cloud backup  │  │
│  │     (iCloud / Google Drive)    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📝 Enter recovery phrase      │  │
│  │     + backup file              │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

See §4.2.5 (Peer-to-Peer Device Transfer) and §4.2.6 (Sovereign Cloud Restore) for the full flows of the first two paths. The third path (recovery phrase) is described in §4.2.4.

#### Screen O-2: Backup — Immediate and Mandatory

Immediately after key generation, before any other screen:

```
┌──────────────────────────────────────┐
│  ← Back                              │
│                                      │
│  Back up your passport key           │
│                                      │
│  ⚠ Your key cannot be recovered     │
│  if you lose this device without    │
│  a backup. Do this now.             │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📱 Save encrypted backup      │  │
│  │     (iCloud / Google Drive)    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📝 Write recovery phrase      │  │
│  │     24 words you memorize      │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  💾 Export to files / USB      │  │
│  └────────────────────────────────┘  │
│                                      │
│  I understand the risk — skip now   │
│  (persistent warning will remain)   │
│                                      │
└──────────────────────────────────────┘
```

**Skip** is present but requires acknowledging the risk in explicit text. After skip, a persistent amber warning badge appears on the Settings tab and a dismissible banner appears at the top of the Passport tab until backup is completed.

Completing any backup method:
- Removes the warning badge and banner
- Records a local backup completion event in the Verification Log
- Proceeds to Screen O-3

#### Screen O-3: Passport Created

```
┌──────────────────────────────────────┐
│                                      │
│         ✓ Passport created           │
│                                      │
│   Your cryptographic identity       │
│   is ready. Add credentials from   │
│   organizations you work with.      │
│                                      │
│   Your passport address:            │
│   hiri://key:ed25519:z6Mk...        │
│   [Copy]  [Show QR]                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Go to my passport         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The passport address is visible immediately. This normalizes it as a real, shareable identifier — not a secret. Tapping **Copy** puts it on the clipboard. **Show QR** displays the QR code for issuers who need to scan it.

#### Screen O-4: Backup — Recovery Phrase

If the user selects "Write recovery phrase":

```
┌──────────────────────────────────────┐
│  ← Back           Recovery Phrase   │
│                                      │
│  Write these 24 words in order.     │
│  Store them somewhere safe.         │
│  They are the only way to recover   │
│  your passport if you lose your     │
│  device and your other backups.     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  1. abandon   2. ability       │  │
│  │  3. able      4. about         │  │
│  │  5. above     6. absent        │  │
│  │  ...         ...               │  │
│  │  23. zero    24. zone          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ⚠ Screenshot blocked for security │
│                                      │
│  [I've written these down →]        │
│                                      │
└──────────────────────────────────────┘
```

Screenshots MUST be blocked on this screen on both iOS (via `UIScreen.isCaptured` and overlay) and Android (via `FLAG_SECURE`). The phrase is never stored in plaintext on device — it is derived from the key at display time and never persisted.

After confirming, the app presents a 3-word spot-check: "Enter words 7, 15, and 22" to confirm the user has actually written them down.

After passing the spot-check, the app presents the **Recovery Kit** option:

```
┌──────────────────────────────────────┐
│  One more step (recommended)         │
│                                      │
│  Create a Recovery Kit for your     │
│  physical safe.                     │
│                                      │
│  The Recovery Kit is a printable    │
│  document containing:               │
│  • Your recovery phrase             │
│  • A QR code of your encrypted key  │
│  • Step-by-step restore instructions│
│                                      │
│  Store it in a physical safe,       │
│  safety deposit box, or sealed      │
│  envelope with trusted contacts.    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📄 Create Recovery Kit PDF    │  │
│  └────────────────────────────────┘  │
│                                      │
│  Skip — I'll store it another way   │
│                                      │
└──────────────────────────────────────┘
```

**Recovery Kit PDF contents:**

```
┌─────────────────────────────────────────────┐
│  HIRI PASSPORT RECOVERY KIT                 │
│  Created: March 15, 2026                    │
│                                             │
│  RECOVERY PHRASE (keep secret)             │
│  ┌─────────────────────────────────────┐   │
│  │  1. abandon    2. ability           │   │
│  │  3. able       4. about             │   │
│  │  ...          ...                   │   │
│  │  23. zero     24. zone              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ENCRYPTED KEY QR CODE                     │
│  (requires recovery phrase to decrypt)     │
│  ┌────────┐                               │
│  │ [QR]   │  Scan this + enter your       │
│  └────────┘  phrase to restore            │
│                                             │
│  RESTORE INSTRUCTIONS                      │
│  1. Install the HIRI Passport app          │
│  2. Tap "Import → Recovery phrase"         │
│  3. Scan the QR code above                 │
│  4. Enter your recovery phrase             │
│  5. Your passport will be restored         │
│                                             │
│  Passport address (not secret):            │
│  hiri://key:ed25519:z6Mk...               │
│                                             │
└─────────────────────────────────────────────┘
```

The PDF is generated entirely on-device. It is never uploaded to any server. The app MUST offer "Print" and "Save to Files" as export options and MUST NOT offer "Share" (to prevent accidental cloud sync of the plaintext phrase).

The encrypted key QR code encodes the passphrase-encrypted keypair bundle. The encryption passphrase IS the recovery phrase — entering the phrase in the restore flow decrypts the QR payload. The QR code alone is useless without the phrase.

#### 4.2.5 Peer-to-Peer Device Transfer

This flow moves a passport from an old device to a new device using a local encrypted channel. No server relay. No cloud intermediary. The devices must be on the same Wi-Fi network or within Bluetooth range.

**New device (Screen T-1):**

```
┌──────────────────────────────────────┐
│  ←  Transfer from old device         │
│                                      │
│  Step 1: On your OLD device,        │
│  open HIRI Passport and tap:        │
│  Settings → Export to new device    │
│                                      │
│  Then scan the code below with      │
│  your old device.                   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [QR CODE — pairing token]     │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Waiting for old device...          │
│  ●●○                                │
│                                      │
└──────────────────────────────────────┘
```

**Old device (Screen T-2 — triggered from Settings):**

```
┌──────────────────────────────────────┐
│  ←  Export to New Device             │
│                                      │
│  Scan the QR code shown on          │
│  your new device.                   │
│                                      │
│  [Camera viewfinder — scan QR]      │
│                                      │
│  Your passport key will be          │
│  transferred directly to the new    │
│  device over your local network.   │
│  Nothing is sent to any server.    │
│                                      │
└──────────────────────────────────────┘
```

**Technical flow:**

1. New device generates an ephemeral X25519 keypair. The QR code encodes the public key + a random 32-byte session ID.
2. Old device scans the QR, extracts the new device's public key and session ID.
3. Old device performs X25519 key agreement and derives a session encryption key via HKDF.
4. Old device locates the new device on the local network by broadcasting the session ID via mDNS/Bonjour.
5. Devices establish a direct local TLS connection (self-signed, session-key verified).
6. Old device encrypts the passport bundle (manifest chain + encrypted keypair) with the session key.
7. Encrypted bundle is transferred directly, device to device.
8. New device decrypts with the derived session key, imports the passport.
9. Both devices confirm transfer complete. The session key is discarded.

**Biometric authentication MUST be required on the old device** before the export proceeds. The transfer cannot be initiated by malware without the user's biometric confirmation.

**Screen T-3 — Transfer Complete (new device):**

```
┌──────────────────────────────────────┐
│                                      │
│              ✓                       │
│                                      │
│       Passport transferred          │
│                                      │
│  Your passport and all credentials │
│  are now on this device.            │
│                                      │
│  Your old device still has a copy.  │
│  You may choose to delete it from  │
│  the old device in Settings.        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Set up new device         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The old device copy is not automatically deleted. The holder chooses when to remove it. Both devices hold valid copies of the passport — key rotation is not triggered by a device transfer.

#### 4.2.6 Sovereign Cloud Restore

This flow retrieves an encrypted backup from iCloud or Google Drive. The decryption key is derived entirely from the recovery phrase on the holder's new device. The cloud provider holds only ciphertext and cannot decrypt it.

**Screen C-1 — Cloud Restore Entry:**

```
┌──────────────────────────────────────┐
│  ←  Restore from Cloud Backup        │
│                                      │
│  Your encrypted passport backup     │
│  is stored in your cloud drive.     │
│  Your recovery phrase is the only  │
│  key to open it.                    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ☁  Sign in to iCloud          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ☁  Sign in to Google Drive    │  │
│  └────────────────────────────────┘  │
│                                      │
│  The app will look for your backup  │
│  file. Your cloud credentials are  │
│  handled by your device's OS —     │
│  not by this app.                  │
│                                      │
└──────────────────────────────────────┘
```

**Screen C-2 — Backup Found:**

```
┌──────────────────────────────────────┐
│  ←  Restore from Cloud Backup        │
│                                      │
│  ✓ Backup found                     │
│                                      │
│  Passport: hiri://key:ed25519:z6Mk  │
│  Backed up: March 10, 2026          │
│  Credentials: 3                     │
│                                      │
│  Enter your recovery phrase to      │
│  decrypt and restore:               │
│                                      │
│  Word 1:  [          ]              │
│  Word 2:  [          ]              │
│  ...                                │
│  Word 24: [          ]              │
│                                      │
│  [Paste all words]                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       Decrypt & Restore        │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The recovery phrase is used to derive the decryption key via HKDF (same derivation as key backup encryption). The derived key decrypts the cloud backup bundle. The recovery phrase itself is never transmitted — derivation happens entirely on device.

**Screen C-3 — Restore Complete:**

Identical to Screen T-3 (Transfer Complete). The holder is on their new device with their passport restored.

**Technical note — what the cloud file contains:**

```
hiri-passport-backup-<authority-fingerprint>.enc:
  {
    "version": "1.0",
    "algorithm": "AES-256-GCM",
    "kdf": "HKDF-SHA256",
    "kdfSalt": "<base64url-random-salt>",
    "kdfInfo": "hiri-passport-cloud-backup-v1",
    "iv": "<base64url-12-bytes>",
    "ciphertext": "<base64url-encrypted-passport-bundle>"
  }
```

The file is named using a non-reversible fingerprint of the passport authority so that an observer of the cloud drive cannot determine which HIRI authority the backup belongs to without already knowing the authority string. The filename is `HMAC-SHA256(authority, "backup-filename-v1")` encoded as base64url.

### 4.3 Passport Home Screen

```
┌──────────────────────────────────────┐
│  [Avatar]  Sarah Thompson            │
│            hiri://...z6Mk   [Copy]  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  CREDENTIALS               4  │  │
│  └────────────────────────────────┘  │
│                                      │
│  💼 Environmental Scientist          │
│  ┌────────────────────────────────┐  │
│  │  EcoImpact Consulting          │  │
│  │  ✓ Verified · Active           │  │
│  └────────────────────────────────┘  │
│                                      │
│  📜 Wetland Specialist Cert          │
│  ┌────────────────────────────────┐  │
│  │  National Environmental Assoc  │  │
│  │  ✓ Verified · Valid to 2028   │  │
│  └────────────────────────────────┘  │
│                                      │
│  🪪 Government ID Verified           │
│  ┌────────────────────────────────┐  │
│  │  State Identity Authority      │  │
│  │  ✓ Verified · Content private  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────── SELF-ATTESTED ──────────   │
│                                      │
│  ✏ Shipping Address                  │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │  Self-attested by you          │  │
│  │  ✏ Self-attested · Mar 2026   │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │        + Add Credential        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Credential cards display:
- **Tier 1 (Verified):** Solid border, credential type icon, "✓ Verified" status in green
- **Tier 2 (Self-Attested):** Dashed border, pencil icon (✏), "✏ Self-attested" in grey
- **Tier 3 (Ephemeral):** Never shown on the Passport Home

Tier 1 and Tier 2 credentials are visually separated by a divider labelled "SELF-ATTESTED." Tier 1 credentials always appear above the divider. Tier 2 credentials always appear below it. The credential count shown in the header includes both tiers.

Status indicators by tier:
- **Tier 1:** Green check (active), Amber clock (expiring), Red X (revoked), Grey circle (stale)
- **Tier 2:** Grey pencil (always; no external validation state applies)

### 4.4 Credential Detail View

```
┌──────────────────────────────────────┐
│  ←  Environmental Scientist          │
│                                      │
│  💼  Employment Credential           │
│      EcoImpact Consulting            │
│      Issued: March 1, 2026          │
│      Valid until: March 1, 2027     │
│                                      │
│  STATUS                             │
│  ✓ Active  •  Revocation confirmed  │
│  Checked 4 minutes ago              │
│                                      │
│  ISSUER                             │
│  EcoImpact Consulting               │
│  ecoimpact.com                      │
│  ✓ DNSSEC verified                 │
│  Trust level: Full                  │
│                                      │
│  WHAT'S IN THIS CREDENTIAL         │
│  ┌────────────────────────────────┐  │
│  │ Always visible to verifiers:   │  │
│  │  • Credential type             │  │
│  │  • Issue date                  │  │
│  │  • Issuer name                 │  │
│  ├────────────────────────────────┤  │
│  │ You decide what to share:      │  │
│  │  • Position title              │  │
│  │  • Organization                │  │
│  ├────────────────────────────────┤  │
│  │ Never shared:                  │  │
│  │  • Salary                      │  │
│  │  • Performance notes           │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Share This]  [Check Status]        │
│  [Remove from Passport]              │
│  [View Technical Details]            │
└──────────────────────────────────────┘
```

**Check Status** triggers a live revocation log query and updates the status indicator in real time.

**View Technical Details** opens a bottom sheet showing the full JSON manifest, verification result, Merkle inclusion proof, and cryptographic signature details.

**Remove from Passport** presents a confirmation dialog explaining that the issuer's attestation is not deleted — it simply no longer appears in this passport version. The previous version of the passport (which included this slot) remains on the chain and is still verifiable.

### 4.5 Adding a Credential

#### Screen C-1: Add Credential — Entry

```
┌──────────────────────────────────────┐
│  ←  Add Credential                   │
│                                      │
│  What kind of credential?            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🎓  Education                 │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  💼  Employment                │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  📜  Professional Certification│  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  🪪  Government Identity       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  🔬  Other / Custom            │  │
│  └────────────────────────────────┘  │
│                                      │
│  Or: [Scan issuer QR code]           │
│      [Paste attestation link]        │
│                                      │
└──────────────────────────────────────┘
```

#### Screen C-2: Review Incoming Credential

When an issuer sends a credential (push notification or deep link):

```
┌──────────────────────────────────────┐
│  New Credential                      │
│                                      │
│  💼 Employment Credential            │
│                                      │
│  From:                              │
│  EcoImpact Consulting               │
│  ecoimpact.com  ✓ DNSSEC verified   │
│                                      │
│  Contains:                          │
│  ┌────────────────────────────────┐  │
│  │  Position: Environmental Sci.  │  │
│  │  Since: June 2022              │  │
│  │  Status: Active                │  │
│  │                                │  │
│  │  You control: title, org       │  │
│  │  Always private: salary        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Valid until: March 2027            │
│                                      │
│  ┌──────────────┐ ┌───────────────┐  │
│  │    Decline   │ │  Add Passport │  │
│  └──────────────┘ └───────────────┘  │
│                                      │
│  [View Full Technical Details]       │
└──────────────────────────────────────┘
```

The user reviews the full credential content before adding it. They are never automatically enrolled in credentials — every add is a deliberate action.

### 4.6 Presentation Flow

#### Screen P-1: Incoming Request

Triggered by QR scan, NFC tap, or push notification:

```
┌──────────────────────────────────────┐
│  Credential Request                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Environmental Regulatory      │  │
│  │  Agency                        │  │
│  │  env-regulatory.gov            │  │
│  │  ✓ DNSSEC verified             │  │
│  └────────────────────────────────┘  │
│                                      │
│  Requesting:                        │
│                                      │
│  ✓  Employment Credential           │
│     Summary view                    │
│                                      │
│  ✓  Professional Certification      │
│     Full details                    │
│                                      │
│  ────────────────────────────────   │
│  Your passport has 3 credentials.   │
│  They will not see your             │
│  other credentials.                 │
│  ────────────────────────────────   │
│                                      │
│  Expires in 8 min                   │
│                                      │
│  ┌──────────────┐ ┌───────────────┐  │
│  │   Decline    │ │ Review & Share│  │
│  └──────────────┘ └───────────────┘  │
└──────────────────────────────────────┘
```

The "other credentials" count follows §J.2 padding if the Passport-Hardened profile is active.

#### Screen P-2: Review What Will Be Shared

P-2 shows both Tier 1 (verified) and Tier 2/3 (self-attested / ephemeral) data in visually distinct sections. When a form-fill (§4.9) has been completed, the self-attested data appears below the verified data with clear tier labelling.

```
┌──────────────────────────────────────┐
│  ←  Review Presentation              │
│                                      │
│  Sharing with:                      │
│  New Service                        │
│                                      │
│  ── VERIFIED BY ISSUERS ──────────  │
│                                      │
│  EMPLOYMENT CREDENTIAL ✓            │
│  ┌────────────────────────────────┐  │
│  │  ✓  EcoImpact Consulting       │  │
│  │  ✓  Environmental Scientist    │  │
│  │  —  Salary: not shared         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── YOU ARE ASSERTING ─────────────  │
│     (not verified by anyone else)   │
│                                      │
│  PROFILE ✏                          │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │  ✏  Username: @sarah_t         │  │
│  │  ✏  Address: 123 Maple St...   │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                      │
│  ════════════════════════════════   │
│  🔒 PRIVACY PROTECTION ACTIVE       │
│                                      │
│  We're adding phantom slots to      │
│  protect your credential count.     │
│  [What's a phantom slot?]           │
│  ════════════════════════════════   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Confirm & Share        │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The section headers "VERIFIED BY ISSUERS" and "YOU ARE ASSERTING" are the normative trust tier labels for this surface. The "not verified by anyone else" sub-label under the self-attested section is REQUIRED — it MUST NOT be hidden, collapsed, or styled to minimize its prominence relative to the verified section.

**"What's a phantom slot?"** opens an in-context explanation:

> To protect your privacy, we add empty placeholder slots to your presentation. This makes it impossible for the verifier — or anyone watching the transaction — to count how many credentials you actually have. It's like adding blank pages to a sealed briefcase so no one can guess how many documents are inside by the thickness.
>
> This feature is part of the Passport-Hardened privacy profile.

The phantom slot count displayed to the user is `Q × ceil(trueOmittedCount / Q) - trueOmittedCount` where Q=5 — i.e., how many phantom slots are being added to reach the next multiple of 5. The verifier sees the padded total; the holder sees their real count plus the explicit phantom count. Neither is deceived.

#### Screen P-3: Share Confirmation

```
┌──────────────────────────────────────┐
│                                      │
│              ✓                       │
│                                      │
│       Credentials shared            │
│                                      │
│  Environmental Regulatory Agency    │
│  received your credentials at       │
│  10:47 AM today                     │
│                                      │
│  Saved to your presentation log     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │             Done               │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The presentation is recorded in the holder's local Verification Log: timestamp, verifier authority, which slots were shared, which were withheld.

### 4.7 Verify Flow

#### 4.7.1 Verification Profiles

Verification involves network calls — manifest resolution, revocation log queries, DNSSEC checks. In constrained real-world environments (airport gate, building entry, retail checkout), network latency is a usability failure.

This specification defines three verification profiles that map to the `transactionClass` parameter in the passport extension:

| Profile | Max Checkpoint Age | Expected Latency | Use Case |
|---------|-------------------|-----------------|----------|
| **Fast-Pass** | 4 hours | < 500ms | Gate check, building entry, transit |
| **Standard** | 48 hours | 1–3s | Employment, routine credential check |
| **High-Value** | 15 minutes | 2–5s | Financial, legal, government access |

**Fast-Pass** uses cached manifest bundles and revocation log checkpoints. All cryptographic verification (signatures, chain integrity) is performed locally against cached data. No network calls are made during verification. The result is available in under 500ms.

Fast-Pass is appropriate when: the verifier controls the physical environment, the risk of a stale credential is low, and throughput matters. It is NOT appropriate for financial access, government identity checks, or any high-assurance context.

**Standard** makes a live revocation log query but accepts cached checkpoints up to 48 hours old if the log is unreachable.

**High-Value** forces live revocation log queries with a 15-minute freshness requirement. This corresponds to `transactionClass: "high-value"` in the passport extension (§16.9.1).

The active profile is selected on Screen V-1 and displayed throughout the verification flow. Verifier applications SHOULD pre-configure the appropriate profile rather than requiring the verifier operator to select it per-verification.

#### 4.7.2 Pre-warming for Fast-Pass

For environments where Fast-Pass is the primary mode (gate control systems, kiosk verifiers), the application SHOULD pre-warm the manifest cache:

1. At session start, the verifier app fetches and caches the latest revocation log checkpoint for all issuers it expects to encounter.
2. At verification time, all resolution is local.
3. The cache refresh runs in the background, not blocking verification.

Pre-warming interval MUST NOT exceed the Fast-Pass checkpoint age maximum (4 hours).

#### 4.7.3 Per-Issuer Checkpoint Age Display

When a verification result includes credentials from multiple issuers whose revocation log checkpoints have different ages, the verifier MUST display per-issuer staleness rather than a single aggregate age. A single "Status as of 2h ago" is misleading when one issuer's checkpoint is 30 minutes old and another's is 3 hours old.

**Multi-issuer staleness display (normative):**

```
┌──────────────────────────────────────┐
│  ✓ VERIFIED WITH LIMITATIONS         │
│                                      │
│  💼 EcoImpact Consulting            │
│     ✓ Not revoked  ·  ⚡ 22min ago  │
│                                      │
│  📜 NEA Certification               │
│     ✓ Not revoked  ·  ⚠ 3h 12m ago │
│                                      │
│  🪪 State Identity Authority         │
│     ✓ Not revoked  ·  ✓ 8min ago   │
│                                      │
│  Oldest checkpoint: 3h 12m          │
│  High-Value check: ✗ Not eligible   │
│  (requires all < 15 minutes)        │
└──────────────────────────────────────┘
```

The **oldest checkpoint** determines whether a High-Value `transactionClass` check can be accepted: ALL issuers must meet the freshness requirement, not just a majority. A presentation where one issuer's checkpoint is 3 hours old cannot qualify as High-Value even if all other issuers are current.

**Color coding for per-issuer age (following §10.3 color system):**
- Green tick (✓): < 15 minutes (High-Value eligible)
- Amber warning (⚠): 15 minutes – 4 hours (Standard eligible)
- Red warning (✗): > 4 hours (Fast-Pass limit exceeded; credential revocation status unknown)

#### Screen V-1: Verify Entry

```
┌──────────────────────────────────────┐
│  Verify Passport                     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [Camera viewfinder for QR]    │  │
│  │                                │  │
│  │       Scan QR code             │  │
│  └────────────────────────────────┘  │
│                                      │
│  Or: [Paste passport URI]            │
│      [Tap NFC device]               │
│      [Open shared link]             │
│                                      │
│  ────────────────────────────────   │
│  Verification profile: Standard ▾  │
│  ┌────────────────────────────────┐  │
│  │  ⚡ Fast-Pass  (< 500ms)       │  │
│  │  ✓ Standard   (live check)    │  │
│  │  🔒 High-Value (15min fresh)   │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

The active profile persists across sessions. Verifier applications deployed in specific contexts (gate control, HR workflow) SHOULD lock the profile via configuration so operators cannot accidentally downgrade it.
```

#### Screen V-2: Verification Progress

```
┌──────────────────────────────────────┐
│  ←  Verifying...  [Standard profile] │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ✓ Passport manifest found     │  │
│  │  ✓ Signature valid             │  │
│  │  ✓ Chain integrity confirmed   │  │
│  │  ✓ Key status: active          │  │
│  │                                │  │
│  │  Verifying credentials...      │  │
│  │  ✓ Employment — EcoImpact      │  │
│  │    ✓ Issuer verified (DNSSEC)  │  │
│  │    ✓ Not revoked               │  │
│  │  ✓ Certification — NEA         │  │
│  │    ✓ Issuer verified (HTTPS)   │  │
│  │    ✓ Not revoked               │  │
│  │  ○ Government ID               │  │
│  │    Existence confirmed         │  │
│  │    Content: private            │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

For **Fast-Pass** mode, the progress feed shows "(cached)" next to each revocation check and displays the cache age: "Not revoked (cached 2h ago)."

#### Screen V-3: Verification Result

```
┌──────────────────────────────────────┐
│  ←                                   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │          ✓ VERIFIED            │  │
│  │                                │  │
│  │  Sarah Thompson                │  │
│  │  Verified: March 15 · 10:48 AM │  │
│  └────────────────────────────────┘  │
│                                      │
│  CREDENTIALS                        │
│                                      │
│  💼 Environmental Scientist          │
│  EcoImpact Consulting               │
│  ✓ DNSSEC  ·  ✓ Not revoked        │
│                                      │
│  📜 Wetland Specialist Cert         │
│  National Environmental Assoc       │
│  ✓ HTTPS  ·  ✓ Valid to 2028       │
│                                      │
│  🪪 Government ID Verified          │
│  State Identity Authority           │
│  ✓ Existence confirmed (private)    │
│                                      │
│  TRUST LEVEL: FULL                  │
│                                      │
│  [Save Record]  [Technical Details] │
│                                      │
└──────────────────────────────────────┘
```

Trust level: **Full** (DNSSEC on all issuers), **Partial** (HTTPS only), **Key-only** (no domain verification), **Degraded** (offline, stale checkpoint).

**Degraded mode** shows:
```
┌────────────────────────────────────┐
│  ⚠ VERIFIED WITH LIMITATIONS      │
│                                    │
│  Signature: ✓ Valid               │
│  Revocation: ⚠ Unconfirmed        │
│  (offline — last checked 6h ago)  │
│                                    │
│  Trust level: Partial             │
└────────────────────────────────────┘
```

### 4.8 Key Rotation Flow

Key rotation is triggered from Settings → Key Management. It replaces the holder's signing keypair while preserving identity continuity through the HIRI chain.

#### 4.8.1 Rotation Triggers

The app surfaces two distinct rotation paths depending on why the holder is rotating:

**Path A — Suspected Compromise:**
The holder believes their device is lost, stolen, or compromised. This is urgent.

**Path B — Routine Rotation:**
The holder is rotating as a security practice, not in response to a threat. This is planned.

The distinction matters for the UX because the urgency, the user communications, and the guidance about existing credentials differ significantly.

#### Screen KR-1: Rotation Entry

```
┌──────────────────────────────────────┐
│  ←  Rotate Signing Key               │
│                                      │
│  Why are you rotating?              │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ⚠ My device was lost or      │  │
│  │    stolen — rotate now         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ✓ Routine security rotation  │  │
│  │    (planned, no threat)        │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen KR-2A: Compromise Rotation — What Changes

```
┌──────────────────────────────────────┐
│  ←  Emergency Key Rotation           │
│                                      │
│  ⚠ IMPORTANT — read before          │
│  continuing.                        │
│                                      │
│  WHAT CHANGES IMMEDIATELY:         │
│  • Your old key is marked revoked   │
│  • No one can impersonate you using │
│    your old device                  │
│  • New presentations require        │
│    this new device                  │
│                                      │
│  WHAT STAYS THE SAME:              │
│  • Your credentials are still valid │
│  • Your passport address changes    │
│    (you get a new identity URI)    │
│  • Old presentations from your old  │
│    device are now invalid           │
│                                      │
│  WHAT YOU MAY NEED TO DO:          │
│  • Tell verifiers your address      │
│    has changed                      │
│  • Request updated credentials from │
│    issuers who want to formally     │
│    attest to your new key           │
│    (they don't have to — your old   │
│    credentials still verify)        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  I understand — Rotate Now     │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen KR-2B: Routine Rotation — What Changes

```
┌──────────────────────────────────────┐
│  ←  Key Rotation                     │
│                                      │
│  WHAT CHANGES:                      │
│  • New presentations will use your  │
│    new key                          │
│  • Your passport address changes    │
│                                      │
│  WHAT STAYS THE SAME:              │
│  • All your credentials are intact  │
│  • Verifiers can still verify them  │
│    via the chain history            │
│                                      │
│  GOOD TIME TO:                     │
│  • Request re-issuance from issuers │
│    you interact with frequently     │
│  • Update your passport address     │
│    with regular contacts            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       Rotate Key               │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen KR-3: Rotation Complete

```
┌──────────────────────────────────────┐
│                                      │
│              ✓                       │
│                                      │
│       Key rotation complete         │
│                                      │
│  New passport address:              │
│  hiri://key:ed25519:zNEW...         │
│  [Copy]  [Show QR]                  │
│                                      │
│  Your old key is now revoked.       │
│                                      │
│  REQUEST RE-STAMPING                │
│  (optional but recommended)         │
│                                      │
│  3 issuers can be notified to       │
│  re-issue credentials with your    │
│  new key. This is optional — your  │
│  existing credentials still work.  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Notify issuers (3)            │  │
│  └────────────────────────────────┘  │
│                                      │
│  Do this later                      │
│                                      │
└──────────────────────────────────────┘
```

#### 4.8.2 Re-Stamping Guidance

**Re-stamping** is the informal term for an issuer re-issuing a credential with the holder's new passport authority in the `holderAuthority` field of the Attestation Manifest. It is never required — existing credentials remain verifiable through the chain. But issuers who wish to formally bind their credentials to the holder's new identity may choose to do so.

The app generates a pre-formatted re-stamping request for each issuer:

```
Re-stamping request to EcoImpact Consulting:

I have rotated my HIRI passport signing key.
My new passport address is:
hiri://key:ed25519:zNEW...

My previous address was:
hiri://key:ed25519:zOLD...

I am requesting a re-issuance of my
Employment Credential with my new address.

[Signed: new key]
```

This request can be sent by email, through the issuer portal, or via any out-of-band channel. The app formats it but does not transmit it — the holder chooses how to deliver it.

#### 4.8.3 New Device Key Generation vs. Rotation

Key rotation (§4.8) is distinct from device transfer (§4.2.5). Key rotation produces a new identity URI. Device transfer moves the same identity to a new device. Holders SHOULD use device transfer when getting a new phone and key rotation when their security has been compromised.

### 4.9 The Request-to-Fill Pattern (Self-Attestation in Presentation Flows)

#### 4.9.1 Overview

The Request-to-Fill pattern handles a class of interaction that pure credential verification cannot: **a verifier needs information the holder has not yet attested to.** Registration flows are the canonical case — "Sign up with your HIRI passport" may need a username and shipping address that no third-party issuer would ever certify.

Without this pattern, the holder hits a dead end: the presentation flow finds no matching slots for the requested fields and offers only "Decline." With the Request-to-Fill pattern, the flow transitions from Review state to Collection state, gathers the missing data, signs it, and completes the presentation — all in a single coherent interaction.

**The state machine:**

```
P-1: Incoming Request
  │
  ├── All requested fields present in passport
  │         └── → P-2: Review → P-3: Confirm
  │
  └── Some fields missing from passport
            └── → P-1.5: Form-Fill → P-2: Review (tiered) → P-3: Confirm
```

The holder always sees the full P-2 review before confirming, regardless of path. The form-fill never auto-confirms.

#### 4.9.2 Screen P-1.5: Data Entry (Form-Fill)

Displayed when the DisclosureRequest contains `requestedFields` for which no matching passport slot exists.

```
┌──────────────────────────────────────┐
│  ←  Complete Registration            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [Verifier icon]  New Service   │  │
│  └────────────────────────────────┘  │
│                                      │
│  New Service is asking for           │
│  information to create your          │
│  account.                           │
│                                      │
│  FROM YOUR PASSPORT (verified):     │
│  ┌────────────────────────────────┐  │
│  │  ✓ Environmental Scientist     │  │
│  │    EcoImpact Consulting        │  │
│  └────────────────────────────────┘  │
│                                      │
│  PLEASE PROVIDE:                    │
│  ┌────────────────────────────────┐  │
│  │  Preferred Username            │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  @sarah_t                │  │  │
│  │  └──────────────────────────┘  │  │
│  │                                │  │
│  │  Shipping Address              │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  123 Maple St, Buffalo..  │  │  │
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────  │
│  [ ] Save this to my passport so    │
│      future services can use it.   │
│                                      │
│  If saved, verifiers you share     │
│  with in the future can request    │
│  this data.                        │
│  ─────────────────────────────────  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │     Review before sharing →    │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Design requirements for P-1.5:**

- The verifier name and icon MUST appear at the top so the holder always knows who is receiving the data they are entering.
- The "FROM YOUR PASSPORT" section shows verified credentials being included in the same presentation — this creates context for why the holder is filling in a form rather than just answering a verification request.
- The "PLEASE PROVIDE" section renders inputs only for fields not found in the passport. Fields that ARE in the passport MUST NOT be re-requested here.
- The "Save to my passport" checkbox MUST default to **unchecked** (ephemeral is the default per §12.8). The explanatory text under the checkbox — "If saved, verifiers you share with in the future can request this data" — is REQUIRED. It cannot be removed or abbreviated.
- The button MUST say "Review before sharing" — not "Submit," not "Continue," not "Next." The holder is always going to P-2 for a full review before anything is transmitted.

**Input validation:**
- Required fields (marked `"essential": true` in the DisclosureRequest) MUST prevent advancing to P-2 if empty
- Optional fields MAY be left blank; the presentation includes only the fields the holder provides
- No field value is transmitted until the holder confirms on P-2

#### 4.9.3 Ephemeral vs. Persistent: The Save Decision

When the holder taps "Review before sharing," the app evaluates the checkbox state:

**If unchecked (Ephemeral — default):**
- The self-asserted fields are signed into the presentation as `SelfAttestedField` objects embedded directly in the presentation body
- No new passport slot is created
- The data exists only in this one presentation
- The next time a verifier asks for the same fields, the holder must fill them in again

**If checked (Persistent):**
- Before creating the presentation, the kernel creates a `SelfAttestedCredential` slot with the holder as issuer and the entered fields as the claim payload
- A new passport version is published with this slot added
- The presentation references the new slot's `attestationRef` like any other credential
- Future DisclosureRequests for these fields will find the slot in the passport and present it without re-entry

```
Ephemeral path:
  formFields → SelfAttestedField (inline in presentation body)
  → No passport update → Presentation sent → Done

Persistent path:
  formFields → SelfAttestedCredential manifest
  → PassportKernel.sign(manifest, holderKey)
  → PassportStore.addSlot(newSlot)
  → New passport version published
  → attestationRef created
  → Presentation references attestationRef → Done
```

The ephemeral path produces a presentation where the self-attested data appears as inline signed fields. The verifier can verify the holder's signature over these fields but cannot later retrieve them from a stored credential — they exist only in this presentation. This is appropriate for one-time registration data, usernames the holder doesn't want to carry permanently, or addresses that may change.

#### 4.9.4 The SelfAttestedCredential Type

When the holder saves a form-fill as a persistent passport slot, it is stored as a `SelfAttestedCredential`. This type is defined in the credential type registry (§7.5 of the passport extension) and has the following structure:

```json
{
  "@type": "hiri:passport:SelfAttestedCredential",
  "credentialType": "SelfAttestedCredential",
  "label": "Profile — New Service",
  "fields": {
    "username": "@sarah_t",
    "shippingAddress": "123 Maple St, Buffalo, NY 14201"
  },
  "assertedAt": "2026-03-15T10:30:00Z"
}
```

The `issuerAuthority` in the containing `hiri:AttestationManifest` MUST equal the `holderAuthority`. The kernel's signing path is identical to issuer-signed credentials — the holder is acting as their own issuer.

The `label` field is holder-set and appears as the display label in the Passport Home. It SHOULD include context about where the data originated ("Profile — New Service") to help the holder understand which service prompted the self-attestation.

**Multiple registrations:** If a holder has registered with multiple services and saved profiles for each, they accumulate multiple `SelfAttestedCredential` slots with different labels. Each slot is independent. The holder can delete individual slots without affecting others.

#### 4.9.5 Verifier-Side DisclosureRequest Schema

To trigger the Request-to-Fill flow, verifiers add a `requestedFields` array alongside `requestedSlots` in the DisclosureRequest. In v1.4.0, `purpose` is REQUIRED on every `requestedFields` entry, and a `sensitivity` classification governs how the application handles each field.

```json
{
  "@context": ["https://hiri-protocol.org/passport/v1"],
  "@type": "hiri:DisclosureRequest",
  "requestId": "req:2026-03-15-newservice-001",
  "verifier": {
    "authority": "key:ed25519:z<verifier-authority>",
    "displayName": "New Service"
  },
  "requestedSlots": [
    {
      "credentialType": "EmploymentCredential",
      "minimumDisclosure": "summary",
      "essential": false
    }
  ],
  "requestedFields": [
    {
      "fieldId": "username",
      "label": "Preferred Username",
      "type": "string",
      "pattern": "^@[a-zA-Z0-9_]{3,20}$",
      "essential": true,
      "purpose": "To create your account identifier on New Service",
      "sensitivity": "standard",
      "saveDefault": false
    },
    {
      "fieldId": "shippingAddress",
      "label": "Shipping Address",
      "type": "string",
      "essential": false,
      "purpose": "For physical order delivery",
      "sensitivity": "high",
      "saveDefault": false
    }
  ],
  "nonce": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo...",
  "expiresAt": "2026-03-15T11:00:00Z",
  "signature": { "...": "..." }
}
```

**`requestedFields` field definitions:**

| Field | Required | Description |
|-------|----------|-------------|
| `fieldId` | REQUIRED | Machine-readable identifier for this field in the returned data |
| `label` | REQUIRED | Human-readable label shown on the form |
| `type` | REQUIRED | One of: `"string"`, `"email"`, `"phone"`, `"date"`, `"url"`, `"text"` |
| `pattern` | OPTIONAL | Regex validation pattern |
| `essential` | REQUIRED | If `true`, the field must be filled to proceed |
| `purpose` | **REQUIRED (v1.4.0)** | Plain-language statement of why the verifier needs this specific field. Shown to the holder before any input. MUST NOT be generic ("for our records"). |
| `sensitivity` | REQUIRED | One of: `"standard"`, `"high"`, `"prohibited"`. See §4.9.6. |
| `saveDefault` | OPTIONAL | MUST NOT be `true`. |

**`saveDefault: true` is explicitly prohibited.** A verifier cannot pre-opt the holder into saving data to their passport. The save decision belongs to the holder alone.

#### 4.9.6 Sensitivity Classification and Enforcement

The `sensitivity` field governs how the application treats each requested field. It is a normative classification, not an advisory hint.

**`"standard"` (default):**
- Rendered normally on P-1.5
- No additional consent required
- Holder may fill or decline

**`"high"` — Requires secondary consent (Screen P-1.6):**
The application MUST display a secondary consent modal (§4.9.7) before rendering the input for this field. High-sensitivity fields MUST NOT appear in the main P-1.5 form — they are always presented on a dedicated consent screen after the holder has reviewed the purpose.

Default high-sensitivity field types (application MUST treat these as `"high"` even if the verifier declares `"standard"`):

| Field Type / Pattern | Reason |
|---------------------|--------|
| `full-dob` (complete date of birth) | Age + birthplace = strong unique identifier |
| `full-address` (street + city + postal) | Combined address is linkable across services |
| `national-id` (any national ID number) | Direct government identifier |
| `phone` (mobile number) | Phone numbers are quasi-unique persistent identifiers |
| `biometric-hash` | Biometric-adjacent data |

**`"prohibited"` — Never accepted:**
The application MUST silently drop `prohibited` fields from the request and MUST NOT render them, request them, or include them in the presentation. The holder sees a warning: "New Service requested some information that this app doesn't share. The request was adjusted." The presentation proceeds with the non-prohibited fields only.

Default prohibited field types (application MUST treat as `"prohibited"` regardless of verifier declaration):

| Prohibited Type | Rationale |
|----------------|-----------|
| `ssn` | Social Security Number — never appropriate for a web registration |
| `tax-id` | Tax identification number |
| `passport-number` | Physical passport number |
| `biometric-template` | Raw biometric data |
| `credit-card` | Payment data outside HIRI's scope |
| `bank-account` | Financial account data outside scope |

**Application override rule (NORMATIVE):** The application's sensitivity classification overrides the verifier's declared `sensitivity` value when the default classification is stricter. A verifier who declares `"standard"` for a `phone` field receives `"high"` treatment. A verifier who declares `"high"` for an `ssn` field receives `"prohibited"` treatment. Verifiers cannot downgrade sensitivity below the application's defaults.

#### 4.9.7 Screen P-1.6: Secondary Consent for High-Sensitivity Fields

Displayed after P-1.5 when at least one `"high"` sensitivity field was requested. P-1.5 collects standard fields only; P-1.6 handles high-sensitivity fields in a dedicated consent context.

```
┌──────────────────────────────────────┐
│  ←  Sensitive Information Request    │
│                                      │
│  New Service is asking for          │
│  sensitive information.             │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📍 Shipping Address           │  │
│  │                                │  │
│  │  Why they want it:             │  │
│  │  "For physical order delivery" │  │
│  │                                │  │
│  │  ⚠ This is detailed location  │  │
│  │  data that can identify you.   │  │
│  │  Only share if you intend to  │  │
│  │  place orders here.           │  │
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ 123 Maple St, Buffalo... │  │  │
│  │  └──────────────────────────┘  │  │
│  │                                │  │
│  │  [ ] Save to passport          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌──────────────┐ ┌───────────────┐  │
│  │ Skip (decline│ │   Share this  │  │
│  │  this field) │ │   field →     │  │
│  └──────────────┘ └───────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**P-1.6 requirements (NORMATIVE):**

- Each high-sensitivity field is presented on its own screen — never grouped together. One field per consent step.
- The verifier's declared `purpose` MUST appear verbatim and visibly. It cannot be truncated or hidden behind a "more info" link.
- The application MUST add its own contextual privacy warning explaining why this field type is sensitive. This is the application's voice, not the verifier's — it should not be overrideable by verifier configuration.
- The **default action is "Skip"** (decline), not "Share." The primary button is "Share this field →" and the secondary is "Skip (decline this field)." This is inverted from the standard P-2 flow to emphasize that sharing is the deliberate act, not declining.
- If the holder skips a non-essential high-sensitivity field, the flow continues to P-2 with that field absent from the presentation.
- If the holder skips an `essential: true` high-sensitivity field, the flow returns to P-1 with a message: "New Service requires this field to proceed. You may decline the entire request."

#### 4.9.8 Verification Result for Self-Attested Data

When a verifier receives a presentation containing self-attested data, the verification result MUST distinguish it from issuer-verified data:

```json
{
  "disclosedData": {
    "verified": [
      {
        "credentialType": "EmploymentCredential",
        "trustLevel": "full",
        "issuer": "EcoImpact Consulting",
        "fields": { "position": "Environmental Scientist" }
      }
    ],
    "selfAttested": [
      {
        "credentialType": "SelfAttestedCredential",
        "trustLevel": "self-asserted",
        "signedByHolder": true,
        "fields": {
          "username": "@sarah_t",
          "shippingAddress": "123 Maple St, Buffalo, NY 14201"
        }
      }
    ]
  }
}
```

The `"trustLevel": "self-asserted"` value is distinct from all issuer-verified trust levels. It means: the holder signed this data with their passport key, asserting it about themselves. No third party has confirmed it.

**NORMATIVE:** Verifier software MUST NOT display self-attested data with a trust indicator that could be confused with issuer-verified data. Displaying a green checkmark next to a self-attested field is a conformance failure. The visual treatment MUST follow the Tier 2 pattern from §3.7 (pencil icon, neutral grey).

### 4.9.9 Rate Limiting and Scope Labels

#### 4.9.9.1 Client-Side Rate Limiting

Verifiers can use repeated `requestedFields` to construct a longitudinal profile of the holder across multiple interactions — even without the holder saving data persistently, the act of being asked the same questions repeatedly reveals behavioral patterns. The client enforces a rate limit to surface this risk.

**Rate limit policy (NORMATIVE):**

The application tracks, per verifier authority, the number of distinct `requestedFields` `fieldId` values requested within a 30-day rolling window. When the same verifier authority requests new `fieldId` values (fields not previously requested by that verifier) and the total distinct field count for that verifier exceeds 5 in 30 days, the application MUST display a warning badge on Screen P-1:

```
┌──────────────────────────────────────┐
│  Credential Request                  │
│                                      │
│  ⚠ New Service has requested new    │
│  personal information 4 times in   │
│  the past 30 days.                  │
│                                      │
│  [Why is this a concern?]           │
│                                      │
│  [Continue]  [Decline]              │
│                                      │
└──────────────────────────────────────┘
```

"Why is this a concern?" expands:

> Services that repeatedly ask for new personal information over short periods may be building a profile of you across multiple interactions. You are not required to provide this information. Each piece of information you share may be combined with other data points to identify or track you.

The rate limit counter is per-verifier, per-device, and resets on a 30-day rolling basis. It counts distinct field IDs, not requests — a verifier who asks for the same fields repeatedly does not trigger the counter. Only genuinely new field requests count.

**The rate limit is advisory, not blocking.** The holder may continue after seeing the warning. The warning exists to surface a pattern the holder may not have noticed.

#### 4.9.9.2 Scope Labels for Saved Fields

When a holder saves a self-attested field to their passport (the persistent path from §4.9.3), they MAY attach a `scopeLabel` to the saved `SelfAttestedCredential` slot. The scope label declares the intended use context for the data and enables the SDK to refuse cross-scope re-use without re-consent.

**Scope labels during save (P-1.5 checkbox expanded):**

```
┌──────────────────────────────────────┐
│  [ ] Save this to my passport        │
│                                      │
│  If saving, what is this for?       │
│  ( ) General use (any service)      │
│  ( ) Work only                      │
│  ( ) Shopping only                  │
│  ( ) This service only              │
│  ( ) Custom: [              ]       │
│                                      │
│  Scope protects you from being      │
│  asked to reuse this data in        │
│  unrelated contexts.                │
└──────────────────────────────────────┘
```

The scope label is stored in the `SelfAttestedCredential` manifest:

```json
{
  "@type": "hiri:passport:SelfAttestedCredential",
  "label": "Shipping Address — New Service",
  "fields": { "shippingAddress": "123 Maple St..." },
  "scopeLabel": "shopping",
  "assertedAt": "2026-03-15T10:30:00Z"
}
```

**SDK cross-scope enforcement:** When a DisclosureRequest from a verifier whose declared `categories` (from the Issuer Directory, §4.11.2) do not match the saved field's `scopeLabel`, the SDK MUST treat the field as not present in the passport. The form-fill flow (§4.9.2) will trigger as if the field doesn't exist, requiring the holder to provide it fresh. The holder sees no error — they simply see an empty input field rather than a pre-populated one.

If the holder wishes to reuse the field cross-scope, they fill it in on P-1.5. At the save decision, the app shows: "You're sharing this in a different context than where you originally saved it. Update the scope?" The holder may update to `"general"` or leave it as-is (which would mean the new presentation uses an ephemeral copy).

### 4.10 Proximity Presentation Transport

#### 4.10.1 Overview

In-person identity verification — gate checks, building access, event entry — requires a presentation flow that works when the network is degraded or absent, completes in under three seconds, and requires no typing or app navigation beyond a single confirmation. This section defines the proximity presentation transport layer that makes this possible.

The holder's device and the verifier's device exchange a presentation using one of three proximity transports, in order of preference:

| Transport | Range | Speed | Typical Use |
|-----------|-------|-------|-------------|
| NFC (ISO 14443 / ISO 18092) | <5cm | <1s | Tap-to-verify, transit gates |
| Bluetooth Low Energy (BLE) | <10m | 1–2s | Larger venues, retail, events |
| QR Code (camera scan) | Line of sight | 1–3s | Fallback; verifier displays QR |

The underlying presentation format is identical to the standard `hiri:PassportPresentation` (§11 of the passport extension). The proximity transport is only the delivery mechanism — the kernel's signing, blinding, and verification operations are unchanged.

#### 4.10.2 Fast-Pass Integration

Proximity presentations use the Fast-Pass verification profile (§4.7.1) by default. The verifier caches manifest bundles and revocation log checkpoints in advance. At tap/scan time, all verification is local — no network calls during the interaction.

**Deferred revocation disclosure:** When a proximity verification completes using a cached checkpoint, the verifier's result display MUST show:

```
┌──────────────────────────────────────┐
│  ✓ ACCESS GRANTED                    │
│                                      │
│  Sarah Thompson                      │
│  Environmental Scientist             │
│                                      │
│  ⚠ Status as of 2h ago             │
│  (offline — live check not performed)│
└──────────────────────────────────────┘
```

The staleness disclosure is not optional. Verifier operators who configure Fast-Pass for gate checks are accepting the 4-hour cache tolerance; their users must see that tolerance reflected in the result. The timestamp shown is the age of the most recent checkpoint, not the age of the credential.

#### 4.10.3 NFC Handshake Flow

The NFC flow differs by `transactionClass`. Applications MUST enforce the per-class policy — this is not configurable by the holder or verifier operator beyond selecting the class.

**Policy table by transactionClass:**

| Policy | Fast-Pass | Standard | High-Value |
|--------|-----------|----------|------------|
| Nonce lifetime | 5 minutes | 5 minutes | **30 seconds** |
| Background NFC launch (lock screen) | Allowed | Allowed | **Prohibited** |
| Biometric required before transmission | No | No | **Yes** |
| Verifier challenge nonce required | No | No | **Yes** |

**Holder device (initiator) — Fast-Pass / Standard:**

1. Holder navigates to the Present tab and taps "Ready to Verify" — or this activates automatically from lock screen via NFC intent filter.
2. The app pre-computes a presentation bundle signed against the most recently received DisclosureRequest nonce. If no recent request exists, the app generates a self-prompted proximity nonce: `H("proximity-nonce" || timestamp || holderAuthority)`.
3. The NFC tag presents an NDEF record containing the `PassportPresentation` as CBOR-encoded bytes (dag-cbor format).
4. On successful tap, the holder's device shows a brief confirmation animation and logs the proximity presentation to the Verification Log.

**Holder device (initiator) — High-Value:**

1. Background NFC launch is NOT permitted. The holder MUST open the app and navigate to the Present tab manually.
2. The app displays a biometric prompt: "Authenticate to share credentials with [Verifier Name]." The holder MUST authenticate before any presentation bundle is prepared.
3. After biometric authentication, the app requests a verifier challenge nonce from the verifier's NFC reader (a short NDEF read-before-write exchange). The challenge is a 32-byte random nonce signed by the verifier's HIRI authority.
4. The app computes the presentation signed against the verifier's challenge nonce (nonce lifetime ≤ 30 seconds from verifier signing timestamp).
5. The NFC NDEF write delivers the presentation.

**Verifier device (reader):**

1. The NFC reader receives the NDEF record and passes the CBOR bytes to the Passport Kernel.
2. The kernel verifies the presentation against cached manifest bundles (per active transactionClass profile).
3. For High-Value: kernel also verifies that the presentation nonce matches the challenge issued within the last 30 seconds.
4. The result renders on the verifier's display within 500ms of the tap completing.

**Proximity nonce freshness:** Fast-Pass and Standard presentations pre-computed more than 5 minutes before the tap MUST be rejected (unless a shorter `maxNonceLifetimeSeconds` is declared by the verifier). High-Value presentations must be pre-computed within 30 seconds of the verifier challenge timestamp.

**Verifier-declared nonce policy (v1.5.0):**

Verifiers may declare a shorter nonce lifetime than the transactionClass ceiling by including a `noncePolicy` field in their DisclosureRequest:

```json
{
  "noncePolicy": {
    "maxNonceLifetimeSeconds": 60,
    "requireVerifierChallenge": true
  }
}
```

`maxNonceLifetimeSeconds` MUST be ≤ the transactionClass ceiling (300s for Standard, 30s for High-Value). Verifiers MUST NOT specify a value exceeding the ceiling — applications MUST clamp to the ceiling if a larger value is given. This allows verifiers operating in higher-security Standard environments (e.g., financial services kiosks) to enforce sub-minute nonces without requiring full High-Value biometric gating.

**Background NFC confirmation toast (NORMATIVE — v1.5.0):**

When a presentation is transmitted via a background NFC event (lock-screen or background-app launch), the application MUST immediately display a non-dismissible notification for a minimum of 2 seconds:

```
┌──────────────────────────────────────┐
│  🪪 Credentials shared               │
│                                      │
│  Environmental Regulatory Agency    │
│  Received: Employment Credential    │
│  Just now (10:47 AM)               │
│                                      │
│  [View details]                     │
└──────────────────────────────────────┘
```

This notification:
- MUST appear even if the app is in the background or the screen is locked
- MUST NOT be dismissible for the first 2 seconds (prevents a physical tap-and-dismiss attack)
- MUST include the verifier's display name (not just their authority string)
- MUST include which credential type was shared
- MUST be logged to the holder's Verification Log

For Standard and High-Value transactionClass, the notification persists until the holder actively dismisses it.

#### 4.10.4 BLE Handshake Flow

BLE is used when the holder and verifier devices cannot tap (wearables, building readers, retail POS). BLE flows are susceptible to relay attacks because the range is larger — an adversary can relay BLE packets between a legitimate reader and a distant holder device. The mutual ECDH attestation step defeats relay attacks by cryptographically binding both sides to the physical session.

**Mutual ECDH Attestation (NORMATIVE for all BLE transactionClass levels):**

Before any credential data is transferred, both sides MUST complete a mutual attestation handshake:

```
Verifier Device                    Holder Device
    │                                    │
    │── BLE Advertisement ──────────────▶│
    │   (service UUID: hiri-verify,      │
    │    verifierEphemeralPubKey,        │
    │    verifierAuthorityFingerprint)   │
    │                                    │
    │   Holder app shows                 │
    │   "Verify with [verifier]?"        │
    │   (verified against KeyDocument)  │
    │                                    │
    │◀── BLE Connect ────────────────────│
    │◀── GATT Write: holderEphemeralPubKey│
    │    + sig_holder(verifierEphemKey)  │
    │                                    │
    │  Verifier verifies holder sig.     │
    │  Computes ECDH shared secret.      │
    │                                    │
    │── GATT Notify: verifierEphemKey   ▶│
    │   + sig_verifier(holderEphemKey)   │
    │                                    │
    │  Holder verifies verifier sig      │
    │  against verifier authority key.   │
    │  Computes same ECDH shared secret. │
    │                                    │
    │◀── GATT Write: Encrypted           │
    │    PassportPresentation            │
    │    (enc with ECDH shared secret)   │
    │                                    │
    │── GATT Notify: result ACK ────────▶│
```

**Why this prevents relay attacks:** The verifier signs the holder's ephemeral public key; the holder signs the verifier's ephemeral public key. A relay would need to forge one of these signatures, which requires the respective party's HIRI signing key. Even if a relay intercepts the BLE packets, it cannot produce a valid mutual attestation binding both parties to the same physical BLE session.

The ECDH shared secret is derived via: `HKDF-SHA256(ECDH(holderEphemKey, verifierEphemKey), "hiri-ble-session-v1", sessionId)`. It is used only for this one BLE session and is discarded after the transfer completes.

**MTU negotiation and presentation size (NORMATIVE):**

The BLE characteristic UUID for passport presentations MUST be `hiri-presentation-v1` (registered UUID to be allocated).

At connection time, both devices MUST negotiate MTU via BLE MTU exchange (ATT_EXCHANGE_MTU_REQ/RSP). Implementations SHOULD request a maximum MTU of 512 bytes. If the negotiated MTU is smaller, the presentation MUST be chunked using the HIRI BLE chunking protocol:

```json
{
  "chunkIndex": 0,
  "totalChunks": 3,
  "sessionId": "<base64url-16-bytes>",
  "data": "<base64url-chunk>"
}
```

Presentations exceeding 2048 bytes MUST use CBOR compression (zstd level 3) before chunking. Presentations exceeding 8192 bytes after compression SHOULD be rejected by the verifier with a human-readable error: "Presentation too large for proximity transfer — use QR code or the app."

**High-Value BLE:** The same biometric + short nonce requirements from §4.10.3 High-Value apply. Additionally, the verifier's BLE advertisement MUST include a challenge nonce signed by the verifier's HIRI authority, and the holder's presentation MUST reference this challenge. Background BLE connect is prohibited for High-Value.

**BLE failure mode table (NORMATIVE — v1.5.0):**

| Failure Type | User-Facing Message | Required App Behavior |
|-------------|--------------------|-----------------------|
| MTU negotiation failed | "Move closer to the reader and try again." | Retry with minimum 23-byte MTU; after 3 retries, suggest QR fallback |
| Mutual attestation failed — holder sig rejected | "The verification device could not be authenticated. This tap was blocked." | Block presentation. Log `PROXIMITY_BLE_ATTESTATION_FAILED`. Suggest QR. |
| Mutual attestation failed — verifier sig rejected | "Could not verify the reader's identity. Tap blocked for safety." | Block presentation. Do not retry. Prompt holder to check verifier. |
| GATT write timeout (> 5s) | "Connection timed out. Move closer or use QR code." | Retry once; fall back to QR guidance |
| Presentation too large (> 8192 bytes after compression) | "Your credential set is too large for this reader. Use the app instead." | Suggest deep-link or QR transfer |
| Challenge nonce expired (High-Value) | "The reader's challenge expired. Please try again." | Re-initiate BLE handshake; auto-request new challenge |
| Background BLE blocked (High-Value) | (Not shown — event is silently dropped) | Log attempt. Require holder to open app before next BLE attempt. |
| ECDH key agreement failure | "Secure connection failed. Try again or use QR." | Retry ECDH once from scratch; if still failing, suggest QR |

All BLE failures that block a presentation MUST be logged to the holder's Verification Log with the failure code, verifier authority, and timestamp. The holder can review this log in Settings → Privacy (§4.14).

#### 4.10.5 Screen PX-1: Proximity Presentation Ready

Displayed when the holder activates proximity presentation mode:

```
┌──────────────────────────────────────┐
│  ←  Ready to Verify                  │
│                                      │
│         [NFC/BLE ICON]               │
│                                      │
│      Tap or hold near reader        │
│                                      │
│  Sharing:                           │
│  💼 Environmental Scientist          │
│     EcoImpact Consulting            │
│                                      │
│  Not sharing: your other            │
│  credentials                        │
│                                      │
│  Profile: ⚡ Fast-Pass              │
│  Valid for: 4m 32s                  │
│                                      │
│  [Change what I share]              │
│                                      │
└──────────────────────────────────────┘
```

The countdown shows how long the pre-computed presentation bundle remains valid (5 minutes from generation). After expiry, the bundle is regenerated automatically with a new nonce.

"Change what I share" navigates to a slot selection view where the holder can add or remove credential slots from the proximity bundle before the next tap.

#### 4.10.6 Screen PX-2: Proximity Verification Complete (Verifier)

```
┌──────────────────────────────────────┐
│                                      │
│         ✓ VERIFIED                  │
│                                      │
│  Sarah Thompson                      │
│  Environmental Scientist             │
│  EcoImpact Consulting               │
│                                      │
│  ⚡ Fast-Pass  ·  ⚠ Status: 2h ago  │
│  Bundle prepared: 3 min ago         │
│                                      │
│  [Details]                          │
└──────────────────────────────────────┘
```

This screen is designed for verifier operators — security staff, gate readers, retail cashiers. It renders immediately after the tap/scan and is optimized for fast human reading: large name, large result, clear staleness indicator.

**"Bundle prepared: X min ago"** shows the elapsed time since the presentation bundle was pre-computed on the holder's device. For Fast-Pass with a 5-minute maximum nonce lifetime, this will always be ≤ 5 minutes. For Standard with a verifier-declared shorter lifetime, it will reflect that shorter window. This field gives verifier operators a signal when to be suspicious of unusually "fresh" bundles that arrive suspiciously quickly (potential replay from a captured bundle), and flags bundles that are surprisingly old (potential stale-bundle substitution).

The "Bundle prepared" timestamp is embedded in the `PassportPresentation` by the holder's kernel at signing time and is covered by the presentation signature — it cannot be forged.

#### 4.10.7 DisclosureRequest noncePolicy Extension

The `noncePolicy` extension to DisclosureRequest (introduced in v1.5.0) allows verifiers to declare transport security requirements inline with their credential request:

```json
{
  "@type": "hiri:DisclosureRequest",
  "requestedSlots": [ ... ],
  "noncePolicy": {
    "maxNonceLifetimeSeconds": 60,
    "requireVerifierChallenge": true,
    "minTransactionClass": "standard"
  }
}
```

| Field | Description |
|-------|-------------|
| `maxNonceLifetimeSeconds` | Maximum age of a proximity presentation bundle (in seconds). MUST be ≤ transactionClass ceiling. Application clamps if exceeded. |
| `requireVerifierChallenge` | If `true`, the presentation MUST be signed against a verifier-issued challenge nonce. For Standard transactionClass this enables challenge-based binding without requiring the full High-Value biometric flow. |
| `minTransactionClass` | Minimum transactionClass the verifier will accept. If the holder's app is configured to a lower class, it MUST upgrade for this request or decline. |

`noncePolicy` is OPTIONAL. When absent, transactionClass defaults apply.

---

### 4.11 Issuer Discovery

#### 4.11.1 The Empty Wallet Problem

A newly created HIRI passport is empty. The holder knows the passport exists but has no immediate path to filling it. Without guidance, they face a blank screen with an "Add Credential" button that leads to a list of credential types — but no indication of where to actually get those credentials.

The Issuer Directory solves this by surfacing relevant issuers to the holder based on context: their location, their professional category, and their existing credentials.

#### 4.11.2 Directory Schema

The Issuer Directory is an open, community-maintained list. It is NOT a gatekept registry controlled by a single operator. Any HIRI Organizational Authority can submit an entry by publishing a `hiri:IssuerDirectoryEntry` document at their `.well-known` URI and submitting a pull request to the community directory repository.

```json
{
  "@type": "hiri:IssuerDirectoryEntry",
  "issuerAuthority": "key:ed25519:z<issuer-authority>",
  "displayName": "New York State DMV",
  "domain": "dmv.ny.gov",
  "credentialTypes": ["GovernmentIdVerification", "DriversLicenseCredential"],
  "regions": ["US-NY"],
  "categories": ["government", "identity"],
  "onboardingURI": "https://dmv.ny.gov/digital-id/hiri",
  "logoURI": "https://dmv.ny.gov/.well-known/hiri-logo.svg",
  "description": "Issue your New York State digital driver's license to your HIRI passport.",
  "proxyIssuer": false,
  "verifiedAt": "2026-03-01T00:00:00Z"
}
```

**`regions`** — ISO 3166-2 region codes. Used for location-based filtering.
**`categories`** — Free-form tags for professional-category filtering.
**`proxyIssuer`** — Whether this issuer uses the proxy pattern (Appendix F of protocol spec) rather than being the authoritative source itself. Displayed to the holder.
**`onboardingURI`** — The URL the holder visits to initiate credential issuance from this issuer.

#### 4.11.3 Screen ID-1: Issuer Directory

```
┌──────────────────────────────────────┐
│  ←  Find Issuers                     │
│                                      │
│  [Search issuers...]                 │
│                                      │
│  NEAR YOU                           │
│  (Buffalo, NY)                      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🏛  New York State DMV        │  │
│  │  Driver's License · Gov't ID   │  │
│  │  Official issuer               │  │
│  │  [Add Credential →]            │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🎓  SUNY Buffalo              │  │
│  │  Education Credentials         │  │
│  │  Official issuer               │  │
│  │  [Add Credential →]            │  │
│  └────────────────────────────────┘  │
│                                      │
│  FOR YOUR PROFESSION                │
│  (Environmental Scientist)          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📜  National Env. Association │  │
│  │  Professional Certifications   │  │
│  │  Official issuer               │  │
│  │  [Add Credential →]            │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Browse all issuers]               │
│  [Suggest an issuer]                │
└──────────────────────────────────────┘
```

**Professional context** is derived from the holder's existing Tier 1 credentials — if they have an `EmploymentCredential` listing "Environmental Scientist," the directory surfaces relevant professional issuers. This derivation happens locally; no credential content is sent to the directory server.

**"Add Credential →"** opens the issuer's `onboardingURI` in an in-app browser, passing the holder's passport address as a query parameter so the issuer can pre-populate the credential issuance flow.

**"Suggest an issuer"** opens a GitHub link to the community directory repository. The directory is a pull-request-based open list, not a form submission to a central admin.

#### 4.11.4 Browser Extension / Mobile Handoff

When the holder visits a website that declares HIRI support via a `<meta>` tag or `Link` header, the browser extension (or mobile handoff mechanism) surfaces a proactive prompt.

**Website declaration:**
```html
<meta name="hiri-passport"
      content="accept"
      data-verifier-authority="key:ed25519:z<verifier>"
      data-display-name="New Service"
      data-credential-types="EmploymentCredential" />
```

Or as an HTTP header:
```
Link: <https://newservice.com/.well-known/hiri-disclosure-request.json>; rel="hiri-passport"
```

**Browser extension behavior:**

When the holder visits a page with this declaration, the extension shows a non-intrusive badge on the address bar:

```
[HIRI icon] This site accepts your passport
```

Clicking the badge shows:

```
┌──────────────────────────────────────┐
│  🪪 New Service accepts HIRI        │
│                                      │
│  You can sign in or register using  │
│  your passport instead of creating  │
│  a new account.                     │
│                                      │
│  They want to see:                  │
│  • Employment Credential (optional) │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Open HIRI Passport app        │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Not now]  [Never for this site]   │
└──────────────────────────────────────┘
```

**"Open HIRI Passport app"** triggers a deep link that passes the DisclosureRequest JSON to the mobile app via the OS sharing mechanism (iOS Universal Links / Android App Links). The mobile app opens the P-1 screen (Incoming Request) with the request pre-loaded.

This completes the "Web2 to Web3 bridge" — the user sees a familiar website, the browser extension notices HIRI support, and the handoff to the passport app is one tap.

**Privacy note:** The browser extension MUST NOT transmit which sites the holder visits to any central server. Site detection is purely local — the extension inspects the page's meta tags in the browser's content script context. The extension does not phone home.

---

### 4.12 Wallet Portability Export

#### 4.12.1 Principle

The holder MUST NOT be locked into the HIRI reference application. Any conforming HIRI wallet should be able to import a passport created in this application, and any passport created in a third-party wallet should be importable here. Portability is holder sovereignty applied at the application layer.

#### 4.12.2 Export Flow

Accessed from Settings → Passport → Export to another wallet.

**Screen WP-1: Export Entry**

```
┌──────────────────────────────────────┐
│  ←  Export Passport                  │
│                                      │
│  Move your passport to another      │
│  HIRI-compatible wallet.            │
│                                      │
│  What gets exported:                │
│  ✓ Your passport manifest chain     │
│  ✓ All credential slots             │
│  ✓ Your signing key (encrypted)     │
│  ✓ Slot blinding key (encrypted)    │
│                                      │
│  Export format:                     │
│  ( ) HIRI Portable Wallet Bundle    │
│      (.hpw — any conforming wallet) │
│  ( ) OID4VP Wallet Transfer         │
│      (for EU eIDAS wallets)         │
│  ( ) DIDComm Wallet Migration       │
│      (for DIDComm-native wallets)   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Generate Export File      │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Screen WP-2: Passphrase Protection**

```
┌──────────────────────────────────────┐
│  ←  Protect Export File              │
│                                      │
│  Set a passphrase for this export.  │
│  The receiving wallet will ask for  │
│  it when importing.                 │
│                                      │
│  This is separate from your         │
│  recovery phrase.                   │
│                                      │
│  Export passphrase:                 │
│  ┌────────────────────────────────┐  │
│  │  ••••••••••••••••              │  │
│  └────────────────────────────────┘  │
│                                      │
│  Confirm passphrase:                │
│  ┌────────────────────────────────┐  │
│  │  ••••••••••••••••              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Create Export File        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**The HIRI Portable Wallet Bundle (.hpw) format:**

```json
{
  "version": "1.0",
  "format": "hiri-portable-wallet",
  "algorithm": "AES-256-GCM",
  "kdf": "HKDF-SHA256",
  "kdfSalt": "<base64url>",
  "kdfInfo": "hiri-wallet-export-v1",
  "iv": "<base64url>",
  "ciphertext": "<base64url — encrypts the full passport bundle>",
  "passportAddressHint": "<non-reversible fingerprint of authority>"
}
```

The ciphertext decrypts to a JSON object containing: the complete manifest chain, all referenced attestation manifests the holder controls, the encrypted signing keypair, and the slot blinding key. The receiving wallet decrypts with the export passphrase, imports the chain, and confirms the new wallet installation with the holder.

**After export:** The app reminds the holder that their passport now exists in two wallets, and that key rotation will invalidate the export if performed after the export date.

#### 4.12.3 Import Flow

Settings → Passport → Import from another wallet. Accepts `.hpw` files, OID4VP wallet migration payloads, and DIDComm wallet migration messages. The import process mirrors the export in reverse: decrypt with passphrase, verify the manifest chain integrity, install keys into secure storage, publish a new passport version if the holder wishes to signal the wallet change.

---

### 4.13 Security Health Score

#### 4.13.1 Purpose and Scope

The Security Health Score gives holders a clear, actionable picture of their security posture. It is:

- **Internal only** — never transmitted to verifiers, never visible outside the holder's own app
- **Security-scoped** — measures security hygiene practices, not identity quality or credential count
- **Actionable** — every tier below Gold has a clear next step

**NORMATIVE:** Implementations MUST NOT expose the Security Health Score to verifiers through any mechanism — not in presentations, not in manifest metadata, not in any protocol extension. The score is holder-facing only. A verifier who could see a holder's Security Health Score would gain information about the holder's security practices that is none of their business.

#### 4.13.2 The Three Tiers

**Bronze — Passport created**

```
┌──────────────────────────────────────┐
│  🥉 BRONZE                           │
│  Your passport exists.              │
│                                      │
│  ✓ Passport created                 │
│                                      │
│  Next: Back up your key             │
│  → [Set up backup]                  │
└──────────────────────────────────────┘
```

Criteria: passport genesis manifest exists.

**Silver — Key backed up**

```
┌──────────────────────────────────────┐
│  🥈 SILVER                           │
│  Your key is protected.             │
│                                      │
│  ✓ Passport created                 │
│  ✓ Key backed up (Recovery Kit)     │
│                                      │
│  Next: Set up Guardian Recovery     │
│  → [Add guardians]                  │
└──────────────────────────────────────┘
```

Criteria: at least one backup method confirmed (Recovery Kit PDF, Sovereign Cloud backup, or P2P device transfer completed).

**Gold — Guardian Recovery configured**

```
┌──────────────────────────────────────┐
│  🥇 GOLD                             │
│  Maximum security posture.          │
│                                      │
│  ✓ Passport created                 │
│  ✓ Key backed up (Recovery Kit)     │
│  ✓ Guardian Recovery: 3 of 5        │
│                                      │
│  Your passport is protected against │
│  device loss, key compromise, and  │
│  memory failure.                    │
└──────────────────────────────────────┘
```

Criteria: at least one Shamir recovery threshold configured with confirmed guardian enrollment (see Appendix E).

#### 4.13.3 Score Display Locations

The Security Health Score appears in:
- **Settings → Security** — full detail view with next steps
- **Home screen** — a small badge on the Settings tab (Bronze: amber dot, Silver: grey dot, Gold: no dot / resolved)
- **Backup reminder banner** — shown until Silver is reached

The score MUST NOT appear on:
- Any shared presentation
- The verification result shown to verifiers
- Any public-facing profile view
- Any API endpoint accessible to third parties

#### 4.13.4 Ecosystem Perks (Informative)

Partner issuers MAY offer expedited onboarding or "fast track" services to holders who have achieved Gold tier. This is an application-layer policy relationship between issuers and holders — the spec does not define or require it. Any such perk MUST be based on the holder self-reporting their tier status (which is self-attested data) rather than on cryptographic proof of tier, to prevent the tier score from becoming a credential that leaks security practice information to unrelated verifiers.

---

### 4.14 Privacy Audit View

#### 4.14.1 Purpose

The Privacy Audit View gives holders a clear, current picture of what personal data is saved in their passport, which verifiers have received form-fill data from them, and what the revocation options are for each piece of saved data. It is the primary mechanism for holders to exercise ongoing control over their self-attested data portfolio.

**NORMATIVE:** All conforming implementations MUST provide a Privacy Audit View accessible from Settings → Privacy. It is not optional.

#### 4.14.2 Screen PA-1: Privacy Audit

```
┌──────────────────────────────────────┐
│  ←  Privacy Audit                    │
│                                      │
│  SAVED PERSONAL DATA                │
│                                      │
│  ✏ Shipping Address                 │
│  Scope: Shopping only               │
│  Shared with: 2 services            │
│  Last used: 3 days ago             │
│  [Revoke & delete]                  │
│                                      │
│  ✏ Username Preferences             │
│  Scope: General                     │
│  Shared with: 4 services            │
│  Last used: Today                   │
│  [Revoke & delete]                  │
│                                      │
│  ─────────────────────────────────  │
│  FORM-FILL HISTORY (ephemeral)      │
│                                      │
│  New Service  ·  3 fields  ·  Today │
│  Old App      ·  1 field   ·  Mar 10│
│                                      │
│  Ephemeral form-fills are not       │
│  saved and cannot be revoked.      │
│                                      │
│  ─────────────────────────────────  │
│  [Export privacy report]            │
└──────────────────────────────────────┘
```

#### 4.14.3 Per-Verifier Detail

Tapping a service in the form-fill history shows:

```
┌──────────────────────────────────────┐
│  ←  New Service                      │
│                                      │
│  newservice.com  ✓ Verified          │
│                                      │
│  FIELDS THEY RECEIVED                │
│                                      │
│  Today (current session):           │
│  • Username: @sarah_t  (saved)      │
│  • Shipping address (ephemeral)     │
│                                      │
│  March 10:                          │
│  • Email: sarah@example.com         │
│    (ephemeral)                      │
│                                      │
│  CREDENTIAL PRESENTATIONS           │
│  Employment Credential  ·  Today    │
│  Employment Credential  ·  Mar 10   │
│                                      │
│  ⚠ New Service has requested new   │
│  data 3 times in 30 days           │
│                                      │
│  [Block New Service]                │
│  [Export this record]               │
└──────────────────────────────────────┘
```

**"Block New Service"** adds the verifier authority to a local blocklist. Future DisclosureRequests from this verifier are silently declined before reaching P-1, and the holder sees: "A request from this service was declined because you blocked them. [Unblock]"

#### 4.14.4 Privacy Report Export

The privacy report is a JSON file the holder can download containing their complete local privacy history: all saved self-attested fields with scope labels, all form-fill interactions (verifier, fields provided, timestamps), all credential presentations (verifier, credential types, timestamps), and the rate-limit counters for each verifier. This report is for the holder's own records and is never automatically transmitted.

---

## 5. Desktop Application

The desktop application serves power users, developers, and organizational users managing multiple credentials. It provides the same core flows as the mobile app with additional capabilities for bulk operations, detailed inspection, and developer tooling.

### 5.1 Layout Architecture

Three-pane layout on screens ≥ 1200px:

```
┌──────────────┬─────────────────────────┬────────────────────┐
│   SIDEBAR    │   CONTENT               │   DETAILS          │
│              │                         │                    │
│  My Passport │   Credentials (list)   │   Selected item   │
│  Verify      │                         │   Full details     │
│  History     │                         │   Technical view   │
│  Settings    │                         │                    │
│              │                         │                    │
│              │                         │                    │
└──────────────┴─────────────────────────┴────────────────────┘
```

On smaller screens, the three-pane collapses to two-pane and then single-pane with back navigation.

### 5.2 Desktop-Specific Features

**Batch verification:** Drop multiple passport URIs or a CSV of URIs into the verification panel. The desktop app verifies each concurrently, displays a summary table, and exports results as JSON or CSV. This is the compliance officer and HR use case.

**Manifest inspector:** Any manifest JSON can be pasted or dragged into the inspector. The app parses it, verifies the signature, walks the chain, and displays a structured view with annotation — which fields are normative, which are optional, what the privacy mode means, what the trust level is. For developers and auditors.

**Key management panel:** Visible in Settings, shows the full key lifecycle history — when the keypair was generated, whether hardware-backed, rotation history, backup status of each key. The same information as the mobile Settings but with more detail accessible without a "View Technical Details" drill-down.

**Offline mode indicator:** A persistent status bar shows the network state and the freshness of all cached checkpoints. "Revocation logs: all current (47 minutes ago)" vs "Revocation logs: 3 stale (offline since 14:22)."

---

## 6. Web Viewer

The web viewer is a read-only verification surface. It runs entirely in the browser — no server receives presentation data, no passport contents are transmitted.

### 6.1 Architecture

```
Browser
  ├── WASM (Passport Kernel — identical to native)
  ├── IndexedDB (manifest bundle cache)
  ├── WebCrypto (signature verification)
  └── Fetch API (manifest and revocation log resolution)
```

**Privacy notice (persistent, small):**
> Verification runs in your browser. No data is sent to any server.

This notice appears in the bottom right corner of every verification result page. It is not a cookie banner. It is a single sentence and it stays.

### 6.2 URL Schemes

**Passport resolution:**
```
https://passport.hiri.id/view?uri=hiri://key:ed25519:z<authority>/passport/main
```

**Presentation viewing:**
```
https://passport.hiri.id/presentation/<base64url-encoded-presentation-hash>
```

**Issuer credential:**
```
https://passport.hiri.id/credential?issuer=key:ed25519:z<issuer>&manifest=sha256:<hash>
```

All three URL schemes resolve to a verification result page with no login required.

### 6.3 Embed Mode

A minimal embed mode allows verifiers to embed passport verification in their own web applications:

```html
<iframe
  src="https://passport.hiri.id/embed?uri=hiri://...&theme=light"
  width="400"
  height="300"
  allow="clipboard-read; clipboard-write"
></iframe>
```

Embed mode renders a compact verification result card with no navigation chrome.

**postMessage API for iframe communication:**
```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://passport.hiri.id') return;
  const { type, result } = event.data;
  if (type === 'verification-complete') {
    // result: PassportVerificationResult
  }
});
```

### 6.4 IP Address Privacy

When the web viewer resolves a passport URI or queries a revocation log, it makes outbound network requests. These requests originate from the verifier's IP address and are visible to:

- The IPFS node or HTTPS server hosting the passport manifest bundle
- The issuer's revocation log server (when checking revocation status)
- Any DNS resolver in the resolution path (for DNSSEC checks)

This is a metadata leakage channel: the revocation log operator learns that an IP address at a specific timestamp queried for a specific `manifestHash`. In aggregate, this reveals which verifiers are checking which credentials at what frequency.

**NORMATIVE:** Conforming web viewer implementations SHOULD route all manifest resolution and revocation log queries through a privacy-preserving proxy layer. Options in order of preference:

1. **Oblivious HTTP (OHTTP, RFC 9458):** The verifier's queries are relayed through an OHTTP relay that hides the verifier's IP from the target server. The relay knows the verifier's IP but not the query content; the target knows the query but not the verifier's IP.

2. **Tor routing:** All resolution requests routed through the Tor network. Higher latency but stronger anonymity than OHTTP.

3. **User-configured proxy or VPN:** The web viewer SHOULD detect and display whether a VPN or proxy is active and inform the user that their IP is visible to log operators if none is configured.

**Persistent notice (updated):** The privacy notice shown in the web viewer SHOULD be updated from:

> "Verification runs in your browser. No data is sent to any server."

To:

> "Verification runs in your browser. Credential resolution contacts the issuer's servers — your IP address may be visible to them. [Learn more]"

The "Learn more" link explains the OHTTP and proxy options. Implementations with OHTTP integrated MAY replace this with:

> "✓ Verification runs in your browser. IP-private routing active."

---

## 7. Issuer Portal

The issuer portal is a web application for organizations issuing Credential Attestation Manifests. It provides credential issuance, revocation management, and revocation log monitoring.

### 7.1 Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  EcoImpact Consulting                         [Settings]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  OVERVIEW                                                    │
│                                                              │
│  Active credentials:      247    Revoked this month:   3    │
│  Pending requests:          4    Log status:      Current   │
│  Issuer key status:   Active    Last checkpoint:   41m ago  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  RECENT ACTIVITY                                             │
│                                                              │
│  ✓ Issued: Employment · Sarah Thompson  ·  2h ago           │
│  ✓ Issued: Employment · James Okafor    ·  1d ago           │
│  ✗ Revoked: Employment · [redacted]     ·  3d ago           │
│  📋 Request: Employment · A. Davies     ·  pending          │
└──────────────────────────────────────────────────────────────┘
```

Revoked credential holder names are redacted in the activity log by default. An authorized operator can reveal them through a separate audit log view with access controls.

### 7.2 Issue Credential Flow

#### Step 1: Holder Identity

```
Issue New Credential

Step 1 of 3: Holder Identity

Holder's passport address:
┌────────────────────────────────────────────────────┐
│ hiri://key:ed25519:z...                            │
└────────────────────────────────────────────────────┘
   [Paste]  [Scan QR]

Or: holder has submitted a credential request
   [Upload request file]

                                    [Next →]
```

When the holder's passport URI is entered, the portal resolves it and displays:
- Passport manifest exists: ✓
- Holder key status: Active
- Last active: March 2026

#### Step 2: Credential Content

```
Issue New Credential

Step 2 of 3: Credential Content

Credential type: Employment Credential ▾

┌─ Fields ──────────────────────────────────────────┐
│ Position title:  [Environmental Scientist      ]   │
│ Department:      [Science & Research           ]   │
│ Start date:      [2022-06-01                   ]   │
│ Employment type: [Full-time                  ▾ ]   │
│ Status:          [Active                     ▾ ]   │
└───────────────────────────────────────────────────┘

Valid from:  [2026-03-01]
Valid until: [2027-03-01]

                         [← Back]  [Preview →]
```

#### Step 3: Preview and Sign

```
Issue New Credential

Step 3 of 3: Preview and Sign

WHAT VERIFIERS WILL ALWAYS SEE:
  • Credential type: Employment Credential
  • Issue date: March 1, 2026
  • Issuer: EcoImpact Consulting

WHAT THE HOLDER CONTROLS:
  • Position: Environmental Scientist
  • Start date: June 2022
  • Employment status: Active

ALWAYS PRIVATE (never leaves holder's device):
  [No private fields in this credential type]

Privacy mode: Selective Disclosure
Holder: hiri://key:ed25519:z6Mk...

This credential will be signed with your
organization's HIRI authority and published.

┌──────────────────────────────────────────────────┐
│              Sign and Issue Credential            │
└──────────────────────────────────────────────────┘
```

The preview makes the privacy model explicit to the issuer. They see exactly what the holder will be able to share and what verifiers will always see. This prevents issuers from inadvertently encoding sensitive information in mandatory-disclosure fields.

### 7.3 Revocation

```
Revoke Credential

Sarah Thompson — Environmental Scientist
Issued: March 1, 2026

Revocation reason:
( ) Holder requested
( ) Employment ended
( ) Credential expired
( ) Issuer policy change
( ) Fraud detected
( ) Other: [                    ]

⚠ This action:
  • Updates the attestation chain
  • Appends an entry to the revocation log
  • Cannot be undone

┌──────────────┐  ┌────────────────────────────┐
│    Cancel    │  │   Confirm Revocation        │
└──────────────┘  └────────────────────────────┘
```

After confirmation, the portal automatically:
1. Publishes a new Attestation Manifest version with the revocation claim
2. Appends a `RevocationLogEntry` to the revocation log
3. Records the revocation in the issuer's audit log
4. Sends a notification to the holder if the holder has registered a notification endpoint

The issuer operator sees a confirmation with the log sequence number and inclusion proof, confirming the revocation is recorded in the transparency log.

### 7.4 Revocation Log Monitor

```
Revocation Log Status

Log endpoint: https://ecoimpact.com/hiri/v1/revocation
Log authority: key:ed25519:z<log-authority>

┌─────────────────────────────────────────────────────┐
│  ✓ OPERATIONAL                                      │
│                                                     │
│  Last checkpoint:    41 minutes ago                 │
│  Tree size:          247 entries                    │
│  Checkpoint hash:    sha256:f2a4c8e1...             │
│  Chain integrity:    ✓ Valid                        │
│                                                     │
│  [View checkpoint]  [Fetch latest]                  │
└─────────────────────────────────────────────────────┘

Recent entries: [showing last 10]

  1248  sha256:e08da327  holder-request     2026-04-01
  1247  sha256:b2c9d4e1  employment-ended   2026-03-28
  ...
```

The monitor shows checkpoint age with visual urgency:
- Green: < 45 minutes (normal)
- Amber: 45–90 minutes (approaching limit)
- Red: > 90 minutes (log operator must investigate)

---

## 8. CLI Tool

The CLI tool provides all passport operations as command-line invocations, suitable for automation, CI/CD pipelines, scripting, and developer workflows.

### 8.1 Installation

```bash
npm install -g hiri-passport
# or
brew install hiri-passport
# or
cargo install hiri-passport
```

### 8.2 Core Commands

**Create a passport:**
```bash
hiri-passport create \
  --output ./my-passport \
  --algorithm ed25519 \
  --display-name "Sarah Thompson"

# Output:
# ✓ Passport created
# Authority: key:ed25519:z6Mk...
# Manifest:  ./my-passport/manifest.json
# Key:       ./my-passport/key.enc (encrypted, prompt for passphrase)
```

**Verify a passport:**
```bash
hiri-passport verify \
  --uri "hiri://key:ed25519:z6Mk.../passport/main" \
  --conformance interoperable \
  --transaction-class standard \
  --output json

# Output (JSON):
# {
#   "verified": true,
#   "holderAuthority": "key:ed25519:z6Mk...",
#   "overallTrustLevel": "full",
#   "slots": [...],
#   "verifiedAt": "2026-03-15T10:48:00Z"
# }
```

**Verify a batch:**
```bash
hiri-passport verify-batch \
  --input ./passport-uris.csv \
  --conformance interoperable \
  --output ./results.json \
  --concurrency 10
```

**Issue a credential (issuer use):**
```bash
hiri-passport issue \
  --issuer-key ./issuer-key.enc \
  --holder "hiri://key:ed25519:z6Mk.../passport/main" \
  --type EmploymentCredential \
  --claim '{"position":"Environmental Scientist","organization":"EcoImpact Consulting"}' \
  --valid-until "2027-03-01" \
  --privacy-mode selective-disclosure \
  --output ./attestation.json
```

**Check revocation log:**
```bash
hiri-passport revocation-check \
  --log-uri "https://ecoimpact.com/hiri/v1/revocation" \
  --manifest-hash "sha256:e08da327..." \
  --transaction-class high-value
```

**Generate a presentation:**
```bash
hiri-passport present \
  --passport ./my-passport \
  --key ./my-passport/key.enc \
  --request ./disclosure-request.json \
  --output ./presentation.json
```

### 8.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Verification failed |
| 2 | Network error |
| 3 | Invalid input |
| 4 | Key error |
| 5 | Revocation log error |
| 6 | Partial verification (degraded) |
| 7 | Warning: one or more credentials expiring within 60 days |

Exit code 7 (expiring soon) is distinct from code 0 (success) so that automated HR and compliance systems can trigger credential renewal reminders without polling for `validUntil` dates themselves. Code 7 is non-fatal — the verification succeeded — but signals that action is required soon. Code 7 MAY be combined with code 6 (degraded + expiring) by returning the higher code (6 takes precedence). When exit code 7 is returned, the standard output MUST include a `"warnings"` array in the JSON result identifying which credentials are expiring and their `validUntil` dates.

---

## 9. SDK

The SDK provides the Passport Kernel and Adapter Layer as importable libraries for embedding in third-party applications.

### 9.1 JavaScript / TypeScript

```bash
npm install @hiri-protocol/passport-sdk
```

```typescript
import { PassportClient, VerificationConfig } from '@hiri-protocol/passport-sdk';

const client = new PassportClient({
  cryptoProvider: 'webcrypto',      // or 'node-crypto', 'noble'
  storage: 'indexeddb',             // or 'filesystem', 'memory'
  network: 'fetch',                 // or custom NetworkAdapter
});

// Verify a passport
const result = await client.verify({
  uri: 'hiri://key:ed25519:z6Mk.../passport/main',
  conformanceLevel: 'interoperable',
  transactionClass: 'standard',
});

if (result.verified && result.overallTrustLevel === 'full') {
  // Accept the passport
}

// Create a presentation from a disclosure request
const presentation = await client.createPresentation({
  passport: myPassport,
  signingKey: myKey,
  disclosureRequest: request,
});
```

### 9.2 Verifier-Side Integration Pattern

The most common SDK integration is server-side verification in a web application:

```typescript
// Express.js middleware example
import { PassportVerifier } from '@hiri-protocol/passport-sdk/server';

const verifier = new PassportVerifier({
  conformanceLevel: 'interoperable',
  transactionClass: 'standard',
  trustedIssuers: ['key:ed25519:z<ecoimpact-authority>'],
  revocationCheckEnabled: true,
});

app.post('/login', async (req, res) => {
  const { passportURI, challenge, signature } = req.body;

  // Step 1: Verify the challenge signature
  const authResult = await verifier.verifyChallenge({
    passportURI,
    challenge: req.session.challenge,
    signature,
  });

  if (!authResult.valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Step 2: Verify the passport and required credentials
  const passportResult = await verifier.verifyPassport({
    uri: passportURI,
    requiredCredentialTypes: ['EmploymentCredential'],
  });

  if (!passportResult.verified) {
    return res.status(403).json({ error: 'Passport verification failed' });
  }

  // Create session
  req.session.holderAuthority = passportURI;
  res.json({ success: true });
});
```

### 9.3 Issuer Integration Pattern

```typescript
import { PassportIssuer } from '@hiri-protocol/passport-sdk/issuer';

const issuer = new PassportIssuer({
  authority: 'key:ed25519:z<issuer-authority>',
  signingKey: issuerPrivateKey,
  revocationLogURI: 'https://ecoimpact.com/hiri/v1/revocation',
  revocationLogAuthKey: logSigningKey,
});

// Issue a credential
const attestation = await issuer.issue({
  holderURI: 'hiri://key:ed25519:z<holder>/passport/main',
  credentialType: 'EmploymentCredential',
  claim: {
    position: 'Environmental Scientist',
    organization: 'EcoImpact Consulting',
    startDate: '2022-06-01',
    status: 'active',
  },
  privacyMode: 'selective-disclosure',
  mandatoryFields: ['credentialType', 'attestedAt'],
  validUntil: '2027-03-01T00:00:00Z',
});

// Revoke a credential
await issuer.revoke({
  manifestHash: 'sha256:e08da327...',
  reason: 'employment-ended',
});
```

### 9.4 Self-Attestation Pattern (Holder-Side SDK)

The holder-side SDK supports creating self-attested credentials both as persistent passport slots and as ephemeral presentation-scoped fields.

```typescript
import { PassportClient } from '@hiri-protocol/passport-sdk';

const client = new PassportClient({ /* config */ });

// Create a persistent self-attested credential
// (holder is both issuer and subject)
const selfAttestedSlot = await client.selfAttest({
  label: 'Profile — New Service',
  fields: {
    username: '@sarah_t',
    shippingAddress: '123 Maple St, Buffalo, NY 14201',
  },
  // No issuerKey needed — uses the holder's own signing key
});

// selfAttestedSlot is added to the passport as a new version
// issuerAuthority === holderAuthority in the resulting manifest

// Create a presentation with both verified and self-attested data
const presentation = await client.createPresentation({
  passport: myPassport,
  signingKey: myKey,
  disclosureRequest: request,
  // Form-fill results from P-1.5 — may be ephemeral or persistent
  selfAttestedFields: [
    {
      fieldId: 'username',
      value: '@sarah_t',
      persist: false,  // Ephemeral — not saved to passport
    },
    {
      fieldId: 'shippingAddress',
      value: '123 Maple St, Buffalo, NY 14201',
      persist: true,   // Persistent — saved as SelfAttestedCredential slot
    },
  ],
});

// presentation.disclosedData.selfAttested contains the self-asserted fields
// presentation.disclosedData.verified contains the issuer-signed credentials
```

### 9.5 Verifier DisclosureRequest with requestedFields

```typescript
import { PassportVerifier, DisclosureRequest } from '@hiri-protocol/passport-sdk/server';

const verifier = new PassportVerifier({ /* config */ });

// Build a request that includes form-fill fields
const request: DisclosureRequest = {
  requestedSlots: [
    {
      credentialType: 'EmploymentCredential',
      minimumDisclosure: 'summary',
      essential: false,
    },
  ],
  requestedFields: [
    {
      fieldId: 'username',
      label: 'Preferred Username',
      type: 'string',
      pattern: '^@[a-zA-Z0-9_]{3,20}$',
      essential: true,
      prompt: 'Choose a username for New Service',
      saveDefault: false,  // MUST be false — cannot pre-check save
    },
    {
      fieldId: 'shippingAddress',
      label: 'Shipping Address',
      type: 'string',
      essential: false,
      prompt: 'For order delivery',
    },
  ],
  nonce: crypto.randomBytes(32).toString('base64url'),
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
};

// After receiving the presentation, access tiered data separately
app.post('/register', async (req, res) => {
  const presentation = req.body.presentation;
  const result = await verifier.verifyPresentation({ presentation, request });

  if (!result.verified) {
    return res.status(401).json({ error: 'Presentation invalid' });
  }

  // Tier 1: Issuer-verified data
  const employment = result.disclosedData.verified
    .find(v => v.credentialType === 'EmploymentCredential');

  // Tier 2/3: Self-attested data — handle differently from verified
  const username = result.disclosedData.selfAttested
    .find(s => s.fields.username)?.fields.username;

  const address = result.disclosedData.selfAttested
    .find(s => s.fields.shippingAddress)?.fields.shippingAddress;

  // IMPORTANT: Do not display self-attested data with verified trust
  // indicators in your application UI
  await createAccount({
    verifiedEmployer: employment?.fields.organization, // Third-party verified
    username,    // Self-asserted — treat accordingly
    address,     // Self-asserted — treat accordingly
  });

  res.json({ success: true });
});
```

---

## 10. Cross-Platform Component Library

### 10.1 Core Components

These components MUST be consistent across mobile, desktop, and web surfaces.

**CredentialCard**
```
Props:
  credentialType: CredentialType
  displayLabel: string
  issuerName: string
  status: 'active' | 'expiring' | 'revoked' | 'unverified'
  privacyMode: 'proof-of-possession' | 'selective-disclosure' | 'public'
  onTap: () => void

Visual states:
  Active:    Green status dot, normal opacity
  Expiring:  Amber status dot, amber border
  Revoked:   Red status dot, reduced opacity, strike-through label
  Unverified: Grey status dot, dashed border
```

**VerificationResultBadge**
```
Props:
  trustLevel: 'full' | 'partial' | 'key-only' | 'degraded' | 'failed'

full:      ✓ VERIFIED — deep green, filled checkmark
partial:   ✓ VERIFIED — amber, filled checkmark, "(partial)" label
key-only:  ✓ VERIFIED — grey, filled checkmark, "(key only)" label
degraded:  ⚠ VERIFIED — amber, warning icon, "(offline)" label
failed:    ✗ FAILED — red, X icon
```

**PrivacyModeIndicator**
```
proof-of-possession:  🔒 Existence only
selective-disclosure: 🔓 You control
public:               🌐 Public record
```

**RevocationStatusIndicator**
```
confirmed-valid:      ✓ Not revoked (timestamp)
cached-checkpoint:    ⚠ Unconfirmed (cached N hours ago)
unknown:              ○ Status unknown (offline)
revoked:              ✗ Revoked (date)
```

**TrustTierBadge** *(updated in v1.4.0 — color-blind safe)*
```
Props:
  tier: 'verified' | 'self-attested' | 'ephemeral'

VERIFIED:
  Shape:    Filled circle
  Icon:     ✓ checkmark
  Color:    Green (#1A7A4A light / #4CAF81 dark)
  Label:    "Verified by [issuer]"
  Border:   Solid, 2px

SELF-ATTESTED:
  Shape:    Rounded rectangle (distinguished from circle)
  Icon:     ✏ pencil
  Color:    Grey (#6B7280 light / #9CA3AF dark)
  Label:    "Self-attested by you"
  Border:   Dashed, 2px

EPHEMERAL:
  Shape:    Diamond / rotated square (distinguished from both above)
  Icon:     ⏱ clock
  Color:    Amber (#B45309 light / #F59E0B dark)
  Label:    "This session only"
  Border:   Dotted, 2px
```

**Color-blind accessibility rule (NORMATIVE):** Trust tier indicators MUST be distinguishable by shape and icon alone, without relying on color. The three tiers use three distinct shapes (circle, rounded rectangle, diamond), three distinct icons (checkmark, pencil, clock), and three distinct label texts. Color is additive — it reinforces the distinction but is never the sole differentiator.

This applies to all surfaces: credential cards, credential detail views, P-2 section headers, verification result screens, and the web viewer. Implementations MUST pass WCAG 2.1 AA color contrast requirements for each tier badge in both light and dark modes.

The TrustTierBadge MUST appear on every credential card, every credential detail view, and in every P-2 section header. It is never optional.

**SelfAttestedFieldInput** *(new in v1.2.0)*
```
Props:
  fieldId: string
  label: string
  type: 'string' | 'email' | 'phone' | 'date' | 'url' | 'text'
  pattern?: string
  essential: boolean
  prompt?: string
  value: string
  onChange: (value: string) => void
  error?: string

Behavior:
  Renders a labelled input appropriate for the field type.
  essential=true: shows required indicator (*), blocks advance if empty.
  prompt: renders as a help text beneath the input.
  error: renders inline below the input with aria-live="assertive".
  On blur: validates against pattern if provided; sets error if mismatch.
```

**ProgressFeed**

Used in the verification flow. Items appear sequentially with a brief animation:
```
Props:
  steps: Array<{ label: string, status: 'pending' | 'pass' | 'fail' | 'warning' }>

Behavior:
  Each step renders in order as it resolves.
  Passing steps show green checkmark.
  Failing steps show red X and halt the feed.
  Warning steps show amber warning icon and continue.
  Pending steps show animated dot.
```

### 10.2 Typography

- **Primary typeface:** System default (SF Pro on iOS/macOS, Roboto on Android, system-ui on web)
- **Monospace:** For passport URIs, authority strings, hash values, and manifest JSON
- **Size scale:** 12 / 14 / 16 / 20 / 24 / 32px
- **Passport URIs** are always rendered in monospace and never truncated in detail views. In list views, they MAY be truncated with ellipsis at the middle: `hiri://key:ed25519:z6Mk...doK`

### 10.3 Color System

| Semantic | Light Mode | Dark Mode |
|----------|-----------|-----------|
| Verified / Active | #1A7A4A | #4CAF81 |
| Warning / Degraded | #B45309 | #F59E0B |
| Revoked / Failed | #B91C1C | #F87171 |
| Unknown / Neutral | #6B7280 | #9CA3AF |
| Background | #FFFFFF | #111827 |
| Surface | #F9FAFB | #1F2937 |
| Border | #E5E7EB | #374151 |

### 10.4 Motion and Animation

- **Key generation:** 200ms seal-press animation. Communicates permanence.
- **Verification progress feed:** 80ms stagger between steps appearing.
- **Credential add confirmation:** Brief scale-up of the new card (200ms).
- **Share confirmation:** ✓ checkmark draws itself (300ms).
- **Degraded state transition:** Amber fade-in (400ms, not jarring).

Motion is functional, not decorative. Every animation communicates the state change it accompanies.

---

## 11. Accessibility

### 11.1 Screen Reader Support

All interactive elements MUST have accessible labels. Credential cards MUST announce:
- Credential type
- Issuer name
- Current status
- Trust level

The VerificationProgressFeed MUST announce each step as it resolves, using `aria-live="polite"` for passing steps and `aria-live="assertive"` for failures.

The recovery phrase screen MUST announce each word and its position number without requiring visual reference to the word grid.

### 11.2 Color Independence

All status indicators MUST use both color AND an icon or text label. Color alone is never the sole indicator of status. This applies to:
- Credential status (active / expiring / revoked)
- Trust level (full / partial / degraded / failed)
- Revocation status (confirmed / cached / unknown / revoked)

### 11.3 Font Size Scaling

All text MUST respect the user's system font size preferences. The passport URI display (monospace, often small) MUST scale with the system preference and MUST NOT fall below 12px at any system font size setting.

### 11.4 Touch Target Sizes

All interactive elements MUST have a minimum touch target of 44×44 points (iOS/Android HIG minimum). Credential cards, status indicators, and action buttons all meet this minimum.

### 11.5 Keyboard Navigation

Desktop and web surfaces MUST be fully keyboard navigable. Tab order follows visual hierarchy. The verification progress feed announces steps via `aria-live`. All modal dialogs trap focus until dismissed.

---

## 12. Security Considerations for the UX Layer

### 12.1 Screenshot Prevention on Sensitive Screens

The following screens MUST prevent screenshots and screen recording on both iOS and Android:

- Recovery phrase display (O-4)
- Backup export (all variants)
- Raw private key display (if ever exposed in Settings)

Implementation: `FLAG_SECURE` on Android; `UIScreen.isCaptured` check with overlay on iOS.

### 12.2 Clipboard Security

When the user copies their passport URI or a presentation, the clipboard entry MUST expire after 60 seconds (using iOS `UIPasteboard.expirationDate` and Android `ClipData` with expiry where supported). The clipboard MUST be cleared when the app moves to background.

Recovery phrase words MUST NEVER be placed on the clipboard individually or as a whole phrase.

### 12.3 Biometric Authentication for Signing Operations

Any operation that exercises the holder's signing key — creating a presentation, adding a credential, revoking a slot — MUST require biometric authentication (Face ID / Touch ID / fingerprint) or device PIN before the key is accessed. This MUST be enforced at the platform level (Secure Enclave / StrongBox access guard), not solely at the application level.

The biometric prompt MUST describe the operation being authorized:
- "Share credentials with [Verifier Name]"
- "Add credential from [Issuer Name]"

Not just: "Confirm" or "Authenticate."

### 12.4 Verifier Domain Verification in Presentation Flow

Before displaying a DisclosureRequest's verifier name and domain to the holder, the application MUST verify the verifier's organizational authority bootstrap (Phase 4, §12.5 of the passport extension). If the verifier's domain cannot be verified, the application MUST display:

```
⚠ Unverified requester

This request comes from an organization
whose identity could not be confirmed.

Authority: key:ed25519:z...
Domain: [not verified]

Do you want to continue?
[Cancel]  [Continue with caution]
```

The holder is never deceived about the verifier's verification status. An unverified verifier does not automatically block the presentation — the holder decides — but the unverified state is unmistakable.

### 12.5 Disclosure Request Expiry

The application MUST enforce DisclosureRequest expiry. A request that has passed its `expiresAt` timestamp MUST be displayed with a prominent expiry warning and MUST require the holder to explicitly acknowledge the expiry before continuing. Expired requests SHOULD be declined automatically when the expiry is more than 5 minutes past.

### 12.6 No Silent Refresh

Presentations are never automatically refreshed or re-sent without holder interaction. If a verifier sends a new DisclosureRequest because the previous one expired, the holder sees a new request and makes a new decision. The application MUST NOT automatically re-sign a new presentation using a cached previous presentation.

### 12.7 Verification Log Privacy

The holder's local Verification Log — the record of every presentation they have made — MUST be stored encrypted on device. It MUST NOT be included in iCloud Backup or Google Drive Backup by default (only in explicit encrypted backup exports). It MUST be deletable by the holder at any time.

### 12.8 Selective Persistence of Self-Attestations

When a holder provides new information during a presentation flow (§4.9), the application MUST default to ephemeral sharing. The entered data is signed into the presentation only and is never written to the Passport Store unless the holder explicitly opts in.

**NORMATIVE requirements:**

- The "Save to my passport" checkbox MUST default to **unchecked** on every presentation where self-attested fields are collected. There are no exceptions based on field type, verifier identity, or previous holder behavior.

- The application MUST NOT pre-check the save option based on a verifier's `saveDefault` field. If a verifier provides `saveDefault: true` in a `requestedFields` entry, the application MUST ignore it and default to unchecked. This behavior MUST NOT be configurable by verifiers.

- The checkbox label and explanatory text defined in §4.9.2 are REQUIRED. Applications MUST NOT substitute shorter or less explicit text. The phrase "verifiers you share with in the future can request this data" MUST appear in its entirety.

- When the holder saves a self-attested field to their passport, the application MUST confirm the save action with a summary: "Saved to your passport: Username, Shipping Address. Future services can request these."

- The application MUST make it easy to delete self-attested slots. The delete path from the Passport Home MUST require no more than two taps and MUST NOT present additional friction beyond a single confirmation dialog.

**Rationale:** Self-attestation is a powerful convenience feature. Its power is also its risk: a holder who unknowingly saves a username to their global passport may expose it to unrelated verifiers in the future. The default-ephemeral requirement protects holders from accumulating a cluttered, inadvertently public personal data record in their passport. Persistence is always a deliberate choice.

### 12.9 Self-Attestation Trust Communication

Self-attested data MUST be visually distinguished from issuer-verified data at every verification surface where both appear. This is a non-negotiable requirement for the integrity of the trust model.

**NORMATIVE requirements:**

- Every surface displaying credentials — Passport Home, Credential Detail, P-2 Review, P-3 Confirmation, Verification Result, Web Viewer — MUST render Tier 1 (Verified) and Tier 2 (Self-Attested) data with visually distinct treatment following §3.7.

- A green checkmark, a verification badge, or any other indicator associated with issuer verification MUST NOT appear adjacent to self-attested data. The ✏ pencil icon is the REQUIRED indicator for self-attested data on all surfaces.

- The label "Self-attested" or "You are asserting" MUST appear explicitly. Neutral language like "Profile data" or "Your information" that obscures the absence of third-party verification is NOT acceptable.

- When a verifier displays received presentation data to their end users, they MUST apply the same trust tier distinction. The SDK's `VerificationResult` object separates `verified` and `selfAttested` arrays precisely so that verifier UIs can apply the correct treatment without custom logic.

**Rationale:** The value of the HIRI ecosystem depends entirely on verifiers and relying parties being able to distinguish what has been independently confirmed from what the holder has asserted about themselves. Conflating these two trust levels undermines the entire purpose of third-party issuance. A verifier who displays a green check next to a self-attested address is misleading their users about the quality of data they received.

---

## 13. Conformance Levels

| Level | Description | Required Surfaces |
|-------|-------------|-------------------|
| **UX-Core** | Minimum viable holder experience | Mobile app: creation, credential add, presentation generation |
| **UX-Interoperable** | Full holder + basic verifier | All mobile flows + web viewer + verify flow |
| **UX-Full** | Complete ecosystem surface | All of above + issuer portal + desktop app + CLI |
| **UX-Accessible** | Full + WCAG 2.1 AA compliance | UX-Full + §11 requirements fully implemented |

All conformance levels MUST implement:
- The backup urgency requirement (§4.2)
- Screenshot prevention on sensitive screens (§12.1)
- Biometric authentication for signing (§12.3)
- Unverified verifier warning (§12.4)
- No silent presentation refresh (§12.6)

---

## Appendix A: Screen Inventory

| ID | Screen Name | Surface | Section |
|----|-------------|---------|---------|
| O-1 | Landing | Mobile | §4.2 |
| O-2 | Backup — Immediate | Mobile | §4.2 |
| O-3 | Passport Created | Mobile | §4.2 |
| O-4 | Recovery Phrase | Mobile | §4.2 |
| O-5 | Recovery Kit (Print PDF) | Mobile | §4.2.4 |
| T-1 | P2P Transfer — New Device QR | Mobile | §4.2.5 |
| T-2 | P2P Transfer — Old Device Scan | Mobile | §4.2.5 |
| T-3 | P2P Transfer Complete | Mobile | §4.2.5 |
| CR-1 | Cloud Restore Entry | Mobile | §4.2.6 |
| CR-2 | Cloud Restore — Backup Found | Mobile | §4.2.6 |
| CR-3 | Cloud Restore Complete | Mobile | §4.2.6 |
| H-1 | Passport Home (with self-attested tier) | Mobile | §4.3 |
| H-2 | Credential Detail | Mobile | §4.4 |
| CC-1 | Add Credential Entry | Mobile | §4.5 |
| CC-2 | Review Incoming Credential | Mobile | §4.5 |
| P-1 | Incoming Request (with rate-limit warning) | Mobile | §4.6 |
| P-1.5 | Data Entry — Form-Fill (standard fields, scope selector) | Mobile | §4.9.2 |
| P-1.6 | Secondary Consent — High-Sensitivity Field | Mobile | §4.9.7 |
| P-2 | Review Presentation (tiered: verified + self-attested) | Mobile | §4.6 |
| P-3 | Share Confirmation | Mobile | §4.6 |
| V-1 | Verify Entry (with profile selector) | Mobile | §4.7 |
| V-2 | Verification Progress (per-issuer checkpoint ages) | Mobile | §4.7 |
| V-3 | Verification Result | Mobile | §4.7 |
| KR-1 | Key Rotation Entry | Mobile | §4.8 |
| KR-2A | Compromise Rotation — What Changes | Mobile | §4.8 |
| KR-2B | Routine Rotation — What Changes | Mobile | §4.8 |
| KR-3 | Rotation Complete + Re-stamping | Mobile | §4.8 |
| PX-1 | Proximity Presentation Ready | Mobile | §4.10 |
| PX-2 | Proximity Verification Complete (with pre-compute age) | Mobile | §4.10 |
| ID-1 | Issuer Directory | Mobile | §4.11 |
| WP-1 | Wallet Export Entry | Mobile | §4.12 |
| WP-2 | Wallet Export Passphrase | Mobile | §4.12 |
| **PA-1** | **Privacy Audit** | **Mobile** | **§4.14** |
| GE-1 | Guardian Setup Entry | Mobile | Appendix E |
| GE-2 | Guardian List | Mobile | Appendix E |
| GE-3 | Individual Guardian Setup | Mobile | Appendix E |
| GE-4 | Deliver Share (with storage warnings + entropy) | Mobile | Appendix E |
| GE-5 | Guardian Loss Handling | Mobile | Appendix E.8 |
| GE-6 | Rotate All Guardian Shares | Mobile | Appendix E.8 |
| GR-1 | Recovery Entry | Mobile | Appendix E |
| GR-2 | Recovery Complete | Mobile | Appendix E |
| GR-3 | Partial Recovery — Not Enough Shares | Mobile | Appendix E.8 |
| **GU-1** | **Guardian Passphrase Upgrade Entry** | **Mobile** | **Appendix E.9** |
| **GU-2** | **Guardian Key Upgrade Ceremony** | **Mobile** | **Appendix E.9** |
| **GC-1** | **Emergency Security / Coercion Response** | **Mobile** | **Appendix E.10** |
| D-1 | Desktop Dashboard | Desktop | §5 |
| D-2 | Batch Verification | Desktop | §5.2 |
| D-3 | Manifest Inspector | Desktop | §5.2 |
| W-1 | Web Verification Result | Web | §6 |
| I-1 | Issuer Dashboard | Portal | §7.1 |
| I-2 | Issue Step 1 (Holder) | Portal | §7.2 |
| I-3 | Issue Step 2 (Content) | Portal | §7.2 |
| I-4 | Issue Step 3 (Preview) | Portal | §7.2 |
| I-5 | Revoke Credential | Portal | §7.3 |
| I-6 | Log Monitor | Portal | §7.4 |

---

## Appendix B: Error Message Registry

User-facing error messages MUST use plain language. Technical details are accessible but never the primary message.

| Error Code | User-Facing Message | Technical Detail |
|------------|--------------------|--------------------|
| `PASSPORT_MANIFEST_INVALID_SIGNATURE` | "This passport's signature is invalid. It may have been tampered with." | Show in technical details |
| `PASSPORT_KEY_REVOKED` | "The key for this passport has been revoked by its holder." | Show revocation timestamp |
| `ATTESTATION_STALE` | "This credential has expired and may no longer be valid." | Show `validUntil` |
| `ATTESTATION_ISSUER_KEY_REVOKED` | "The organization that issued this credential has revoked their signing key." | Show issuer authority |
| `ATTESTATION_TIER2_OVERRIDE_REVOKED` | "This credential has been revoked by its issuer." | Show `revokedAt` if available |
| `REVOCATION_LOG_STATE_UNKNOWN` | "Revocation status could not be confirmed (offline)." | Show checkpoint age |
| `REVOCATION_LOG_STALE_HIGH_VALUE` | "Revocation status is too old for a high-security check." | Show checkpoint age |
| `ORG_DOMAIN_BINDING_FAILED` | "The issuer's organization identity could not be verified." | Show domain checked |
| `ORACLE_NOT_IN_TRUST_ANCHORS` | "This biometric verification comes from an unrecognized provider." | Show oracle authority |
| `PRESENTATION_KEY_ROTATED_AFTER_CREATION` | "This credential presentation is no longer valid — the key was changed after it was created." | Show rotation timestamp |
| `PRESENTATION_PROOF_ARTIFACT_UNAVAILABLE` | "Biometric verification is temporarily unavailable. The credential itself is still valid." | Show retry option |
| `KEYDOCUMENT_REQUIRED_MISSING` | "The issuer has not published their key information. Verification is incomplete." | Show issuer authority |
| `SELF_ATTESTED_FIELD_REQUIRED_EMPTY` | "Please fill in [field label] to continue." | Show `fieldId`, mark input with error state |
| `SELF_ATTESTED_FIELD_PATTERN_INVALID` | "[Field label] doesn't match the required format. [Pattern hint if provided]" | Show regex pattern in technical details |
| `SELF_ATTESTED_SAVE_DEFAULT_REJECTED` | *(Internal — not shown to user. Verifier's saveDefault: true is silently ignored; checkbox stays unchecked.)* | Log to developer console |
| `SELF_ATTESTED_TRUST_DISPLAY_VIOLATION` | *(Internal — conformance failure if self-attested data is rendered with Tier 1 trust indicators.)* | Conformance audit finding |
| `SENSITIVE_FIELD_PROHIBITED` | "New Service requested some information that this app doesn't share. The request was adjusted automatically." | List dropped fieldIds in technical details |
| `SENSITIVE_FIELD_PURPOSE_MISSING` | *(Internal — DisclosureRequest with requestedFields missing `purpose`. Request is rejected before display.)* | Show to developer: "All requestedFields must include a `purpose` string." |
| `PROXIMITY_PRESENTATION_EXPIRED` | "This tap-to-verify token has expired. Please open your passport app to generate a new one." | Show expiry rule (5min / 30s for High-Value) |
| `PROXIMITY_NONCE_REPLAY` | "This presentation has already been used. Please tap again with your device." | Show replay protection rule |
| `PROXIMITY_BLE_ATTESTATION_FAILED` | "The verification device could not be authenticated. This tap was blocked for your safety." | Show mutual attestation failure details |
| `PROXIMITY_HIGH_VALUE_BIOMETRIC_REQUIRED` | "High-security verification requires your biometric confirmation. Please authenticate to continue." | Shown before presentation for High-Value |
| `GUARDIAN_SHARE_INVALID` | "This key piece could not be verified. Make sure you're using the right piece for this passport." | Show address hint mismatch |
| `GUARDIAN_SHARE_WRONG_KEY` | "This key piece was delivered by a different person than expected. Recovery blocked." | Show fingerprint mismatch; suggest re-enrollment |
| `GUARDIAN_SHARE_DUPLICATE` | "You've already added a piece from this guardian. Each person's piece is unique." | Show share index conflict |
| `GUARDIAN_THRESHOLD_NOT_MET` | "You need [M] pieces to recover. You have [K] so far — contact [M-K] more guardians." | Show current vs. required count |
| `GUARDIAN_RECORD_EXPIRED` | "Robin's key piece has expired (set up over a year ago). Ask Robin to re-enroll." | Show `expiresAt` from guardian record |
| `GUARDIAN_ENROLLMENT_CEREMONY_INCOMPLETE` | "Robin hasn't completed the enrollment step yet. Ask them to sign the enrollment code." | Show pending ceremony state |
| `WALLET_EXPORT_PASSPHRASE_MISMATCH` | "The passphrases don't match. Please try again." | Input validation |
| `ISSUER_DIRECTORY_UNAVAILABLE` | "The issuer directory is temporarily unavailable. Browse manually or try again later." | Show cached directory if available |
| `WASM_KERNEL_SIGNATURE_INVALID` | "The passport security component could not be verified. The app will not proceed until this is resolved." | Show expected vs. received kernel hash; prompt to reinstall |
| `GUARDIAN_PASSPHRASE_ENTROPY_TOO_LOW` | "This passphrase is too easy to guess. Try using 4 or more unrelated words." | Show zxcvbn score and specific failure reasons |
| `GUARDIAN_REVOCATION_CONFLICT` | "This key piece belongs to a guardian that has been revoked. Recovery cannot continue with this piece." | Show `guardianPublicKeyFingerprint` mismatch vs. revocation record |
| `RATE_LIMIT_NEW_FIELDS_WARNING` | "⚠ This service has requested new personal information [N] times in the past 30 days." | Show per-verifier field request history count |
| `SCOPE_LABEL_CROSS_CONTEXT` | *(Internal — field withheld silently; holder sees empty input field on P-1.5)* | Log scope label vs. verifier category mismatch to privacy log |
| `NON_REFERENCE_KERNEL_ACTIVE` | Persistent banner: "⚠ Enterprise kernel — signed by [keyId] — Not the HIRI reference implementation" | Non-suppressible; shown on all screens |
| `NONCE_POLICY_CEILING_EXCEEDED` | *(Internal — verifier's `maxNonceLifetimeSeconds` clamped to transactionClass ceiling)* | Log to developer console; clamped value applied |
| `BLE_FAILURE_MUTUAL_ATTESTATION` | "The verification device could not be authenticated. This tap was blocked." | See BLE failure mode table §4.10.4 |
| `GUARDIAN_UPGRADE_CEREMONY_PENDING` | "Robin hasn't completed the key upgrade yet. Ask them to scan the enrollment code." | Show pending upgrade state |

---

## Document History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-03 | Draft | Initial specification |
| 1.1.0 | 2026-03 | Draft | P2P device transfer; Sovereign Cloud restore; Key Rotation UX; Verification Profiles with Fast-Pass; Phantom slots; Recovery Kit PDF; CLI exit code 7; Web viewer IP privacy |
| 1.2.0 | 2026-03 | Draft | Self-attestation architecture; Three-tier trust vocabulary; Request-to-Fill (§4.9); Screen P-1.5; Ephemeral vs. Persistent slots; §12.8–12.9 normative; SDK §9.4–9.5 |
| 1.3.0 | 2026-03 | Draft | Guardian Recovery (Appendix E, Shamir M-of-N); Proximity Transport §4.10; Issuer Discovery §4.11; Wallet Portability §4.12; Security Health Score §4.13 |
| 1.4.0 | 2026-03 | Draft | Guardian enrollment cryptographic binding; BLE mutual ECDH attestation; NFC High-Value hardening; Sensitive field policy §4.9.6–4.9.7; WASM reproducible build §3.2.1; Per-issuer checkpoint age §4.7.3; Guardian churn UX; Color-blind TrustTierBadge; Appendix F governance |
| **1.5.0** | **2026-03** | **Draft — Final** | Guardian passphrase entropy requirements (E.9, zxcvbn ≥3); Guardian revocation record normative; Guardian passphrase upgrade path (E.9, GU-1/GU-2); Guardian coercion response (E.10, GC-1); NFC verifier-declared nonce policy (§4.10.7); Background NFC confirmation toast (normative); PX-2 pre-compute timestamp; BLE failure mode table; Request-to-Fill rate limiting §4.9.9; Self-attested scope labels §4.9.9; Privacy Audit View §4.14 (normative); WASM alternate signing keys + non-reference kernel banner; Appendix F.7 PR moderation checklist; §C.7 Scope Label Pattern |

---

## Appendix C: Interaction Patterns

### C.1 The Consent Pattern

Every operation that sends data to another party MUST follow this pattern:

1. **Request display** — Show WHO is asking and WHAT they're asking for
2. **Preview** — Show exactly what will be sent (✓) and what will not (—)
3. **Explicit action** — A clearly labeled button ("Confirm & Share", not "OK" or "Continue")
4. **Confirmation** — Show what was sent and to whom, with a timestamp

No step may be skipped. No step may be pre-completed.

### C.2 The Degraded State Pattern

When verification is incomplete due to network or cache limitations:

1. Show what was verified (with check marks)
2. Show what is uncertain (with amber warning icons)
3. Show a plain-language explanation of what the uncertainty means
4. Show the trust level explicitly
5. Let the holder/verifier make their own decision about whether to proceed

Never hide degraded state. Never collapse "could not verify" into "verified."

### C.3 The Technical Depth Pattern

Every result screen and credential detail view MUST offer a "View Technical Details" path. The path MUST be:
- Consistently labeled ("View Technical Details" everywhere)
- Consistently placed (bottom of the screen, secondary action)
- Consistently formatted (JSON viewer with syntax highlighting and collapsible sections)

The technical view shows: full manifest JSON, signature algorithm, proof value, canonicalization method, Merkle inclusion proof (where applicable), and all verification phase results.

### C.4 The Form-Fill Pattern

The Form-Fill pattern governs the transition from a pure credential review flow into a data collection flow when a DisclosureRequest contains `requestedFields` not present in the passport.

**Trigger condition:** A DisclosureRequest contains `requestedFields` with one or more fields that do not match any existing passport slot. If all requested fields are already in the passport (as `SelfAttestedCredential` slots or other slots), the form-fill screen is skipped entirely and the flow goes directly to P-2.

**Required pattern steps:**

1. **P-1 — Incoming Request** is shown as normal. If any `requestedFields` are present, P-1 MUST include a summary line: "New Service also needs some profile information from you." This previews the form-fill step without jumping directly into data entry.

2. **P-1.5 — Data Entry** collects only the missing fields. Fields already in the passport appear in the "FROM YOUR PASSPORT" section and are not re-collected. The holder sees the full picture: what is coming from their passport, and what they are being asked to provide fresh.

3. **Save decision** occurs at P-1.5, not P-2. By the time the holder reaches P-2, the save/ephemeral decision has already been made. P-2 shows the outcome: either the data appears as "Ephemeral — this session only" or as a new self-attested slot with a dashed border.

4. **P-2 — Review** always shows the tiered presentation. VERIFIED BY ISSUERS section (solid border, green check) appears above YOU ARE ASSERTING section (dashed border, pencil). The layout is normative — these sections MUST NOT be reordered.

5. **P-3 — Confirmation** mirrors the tier distinction. If persistent data was saved to the passport, P-3 includes a secondary confirmation: "Also saved to your passport: [field names]."

**Anti-patterns to avoid:**

- **Do not auto-complete form fields from the passport.** If the holder has a `SelfAttestedCredential` containing "shippingAddress" and the verifier also asks for "shippingAddress," present the existing value in the "FROM YOUR PASSPORT" section and do not show it again in the form. Showing the same data twice implies they are different things.

- **Do not allow progressive disclosure of essential fields.** If a field is `essential: true`, the holder MUST see and respond to it on P-1.5. Do not defer essential fields to a secondary screen or collapse them behind "Show more."

- **Do not modify the save checkbox after P-1.5.** The save decision is made once, on P-1.5. P-2 reflects the decision but does not offer a change option. This creates a clear, non-revisable consent moment.

**Accessibility for the Form-Fill screen:**

- Form inputs MUST be associated with their labels via `aria-labelledby` or equivalent
- Validation errors MUST be announced via `aria-live="assertive"`
- The save checkbox MUST have an accessible description that reads the full explanatory text, not just the label
- The "FROM YOUR PASSPORT" section MUST be announced as "already in your passport, not re-collected" to screen reader users

### C.5 The Proximity Handshake Pattern

The Proximity Handshake governs the in-person presentation flow (§4.10). It differs from the remote presentation flow in three important ways: there is no DisclosureRequest from the verifier, the timing window is much tighter, and the visual feedback must be immediate and interpretable at a glance.

**Pattern steps:**

1. **Pre-computation.** Before the holder approaches a reader, the app pre-computes a proximity presentation bundle signed with a proximity nonce. This happens automatically when the holder opens the Present tab or is triggered by NFC background intent. Pre-computation decouples signing latency from tap latency.

2. **Transport.** NFC or BLE delivers the pre-computed bundle to the verifier device. The transport layer adds no additional signing or ceremony — it is a delivery mechanism only.

3. **Immediate local verification.** The verifier's kernel verifies the presentation entirely from cache (Fast-Pass profile). Network calls do not occur during the tap interaction.

4. **Instant visual result.** The verifier display renders the result within 500ms of the tap. The result is optimized for human reading at a glance: large name, large pass/fail indicator, staleness disclosure.

5. **Bilateral confirmation.** Both devices confirm the interaction completed — the holder's device shows a brief confirmation animation, the verifier's device shows the result screen. The holder's Verification Log records the event.

**Anti-patterns for proximity:**

- **Do not require the holder to unlock the app before tapping** — for Fast-Pass and Standard transactionClass. NFC background launch and lock-screen presentation must be supported for gate-check contexts where fumbling with the phone is unacceptable. Note: High-Value is the explicit exception to this rule per §4.10.3.

- **Do not show the full verification progress feed (V-2) in proximity mode.** The step-by-step feed is appropriate for deliberate desktop verification; it's wrong for a 1-second tap interaction. The verifier sees only the result screen (PX-2).

- **Do not require a confirmation tap from the holder before transmitting** — for Fast-Pass and Standard. For High-Value, biometric confirmation IS the required confirmation step. The distinction is intentional: Fast-Pass optimizes for throughput; High-Value optimizes for assurance.

### C.6 The Guardian Enrollment Pattern

Guardian enrollment is a trust ceremony, not a form submission. The UX must reflect that the holder is establishing a long-term security relationship with another person.

**Pattern steps:**

1. **Threshold selection.** The holder chooses M and N with clear plain-language explanation of what each combination means for their security. The UI shows the implication: "Any M of your N guardians can help you recover. Up to M-1 can be compromised without risk."

2. **Guardian identity collection.** For each guardian, the holder records a name and chooses an authentication method (HIRI passport key, passphrase, or passphrase-encrypted file).

3. **Cryptographic enrollment ceremony** (for key-capable guardians). The holder generates a nonce; the guardian signs it; the holder verifies the signature and records the public key fingerprint. This step MUST be completed synchronously — it cannot be deferred. A guardian who has not completed the ceremony is shown as "Pending enrollment" and does not count toward the threshold.

4. **Share delivery with storage warnings.** The share is delivered alongside mandatory storage guidance (§E.4). The holder cannot mark delivery as complete without acknowledging the storage warnings. The guardian's acknowledgment is optional (they may not have the app) but the holder's acknowledgment is REQUIRED.

5. **Enrollment confirmation.** The app shows a summary: "3 of 5 guardians enrolled. You need 3 to recover. Your recovery capability is active." The Security Health Score upgrades to Gold when the minimum threshold is enrolled.

**Anti-patterns for guardian enrollment:**

- **Do not treat guardian enrollment as a one-way delivery.** The enrollment ceremony exists precisely because one-way delivery (sending a file to someone without verification) is vulnerable to impersonation. The UI must make the ceremony feel like a meaningful step, not a technicality.

- **Do not allow "I'll do it later" on the cryptographic ceremony.** The guardian's signature is what prevents impersonation during recovery. A share delivered without a ceremony is a degraded share — mark it clearly as such and nag for completion.

- **Do not bury the storage warnings.** The warnings about cloud photos and email attachments must appear at the point of delivery, not in a help article the guardian will never read.

### C.7 The Scope Label Pattern

The Scope Label Pattern governs how self-attested data saved to the passport is scoped to a use context, and how that scope is enforced during future presentation flows.

**Pattern purpose:** When a holder saves form-fill data (e.g., a shipping address), they are implicitly consenting to future re-use. Without scope, that shipping address could be presented to any verifier who asks — including ones the holder would never have expected to share it with. The scope label makes the re-use contract explicit at save time.

**Pattern steps:**

1. **Scope selection at save time.** When the holder checks "Save to passport" on P-1.5, the scope selector appears (§4.9.9.2). The holder selects from: General, Work only, Shopping only, This service only, Custom. The default selection is "This service only" — the most restrictive option. This is intentional: it matches the holder's likely intent (they're filling in this form for this service) and requires explicit broadening.

2. **Scope enforcement at presentation time.** The SDK compares the verifier's declared `categories` (from the Issuer Directory) against the saved field's `scopeLabel`. If the categories don't match the scope, the field is treated as absent.

3. **Scope mismatch notification.** When a field is withheld due to scope mismatch, the form-fill screen (P-1.5) shows an empty input — the holder fills it in fresh. The scope mismatch is not surfaced as an error; it simply means the holder enters the data again for the new context.

4. **Scope upgrade at re-entry.** If the holder fills in the same data for a second context and checks "Save," the save dialog shows: "You already have this saved for [original scope]. Update to include [new context] too?" The holder can broaden the scope or keep two separate saved entries.

**Scope label ↔ verifier category mapping:**

| Scope Label | Accepted Verifier Categories |
|-------------|------------------------------|
| `general` | Any |
| `work` | `employment`, `professional`, `education` |
| `shopping` | `retail`, `ecommerce`, `marketplace` |
| `this-service-only` | Only the specific verifier authority that received it |
| Custom string | Fuzzy match against verifier `categories` array |

**Anti-patterns:**

- **Do not expose scope labels to verifiers.** The scope is a holder-side privacy mechanism. Verifiers never see which scope a field was saved under. They only see whether the field was present in the presentation or not.

- **Do not use scope enforcement as a gatekeeping mechanism.** A verifier cannot force a field to be scoped to them, nor can they learn why a field was absent. Scope is transparent to the holder, opaque to verifiers.

- **Do not default to "General."** Defaulting to general scope would mean every saved field is immediately re-usable everywhere, undermining the purpose of the feature. The default MUST be the most restrictive scope appropriate to the context.

---

## Appendix D: Architecture Diagrams

### D.1 Key Generation Flow

```
User taps "Create passport"
          │
          ▼
CryptoProvider.generateKeyPair("ed25519")
  → hardware-backed if available
  → note: hardware-backed: true/false recorded
          │
          ▼
PassportKernel.deriveAuthority(publicKey)
  → "key:ed25519:z" + base58btc(publicKey)
          │
          ▼
PassportKernel.createGenesisManifest(authority, displayName)
  → PassportManifest v1, no chain block
          │
          ▼
PassportKernel.sign(manifest, privateKey)
  → URDNA2015 canonicalization
  → Ed25519 signature
          │
          ▼
PassportStore.save(signedManifest)
SlotBlindingKeyDerivation: HKDF(privateKey, "hiri-passport-blinding-v1", authority)
SecureStorage.storeBlindingKey(passportId, blindingKey)
          │
          ▼
UI: Proceed to backup screen
```

### D.2 Presentation Generation Flow

```
DisclosureRequest received
          │
          ▼
Validate request signature
Verify verifier organizational authority (Phase 4)
Check request expiry
          │
          ▼
UI: Show request to holder
Holder reviews and approves
Holder biometric authentication
          │
          ▼
For each requested slot:
  PassportKernel.computePresentationSlotToken(
    slotBlindingKey,
    slotId,
    requestNonce,
    verifierAuthority
  ) → HMAC-SHA256(key, slotId ∥ 0x00 ∥ nonce ∥ 0x00 ∥ verifierAuthority)
          │
          ▼
For selective-disclosure slots:
  PassportKernel.computeDisclosureProof(
    attestation,
    requestedFields,
    indexSalt,
    hmacKey
  ) → DisclosureProof with selected N-Quads
          │
          ▼
PassportKernel.createPresentation(
  passportURI,
  passportManifestHash,
  disclosureRequestId,
  requestNonce,
  verifierAuthority,
  disclosedSlots,
  omittedSlotCount [padded if Passport-Hardened]
)
          │
          ▼
PassportKernel.sign(presentation, holderKey) [JCS canonicalization]
          │
          ▼
Transmit to verifier
Record in local Verification Log
UI: Show confirmation
```

### D.3 Guardian Recovery Flow

```
GUARDIAN ENROLLMENT
  │
  ├── Holder chooses N guardians and threshold M
  ├── PassportKernel.shamirSplit(signingKey, M, N)
  │     → N encrypted shares (each 32 bytes + metadata)
  │
  ├── For each guardian i:
  │     share_i = {
  │       shareIndex: i,
  │       shareValue: <32 bytes>,
  │       threshold: M,
  │       totalShares: N,
  │       passportAddressHint: H(authority, "guardian-hint")
  │     }
  │     encryptedShare_i = AES-256-GCM(share_i, HKDF(guardianPublicKey))
  │     → QR code / file delivered to guardian i
  │
  └── Each guardian stores their encrypted share.
      No guardian can reconstruct the key alone.


RECOVERY (M shares collected)
  │
  ├── Holder generates new Ed25519 keypair on new device
  ├── Holder contacts M guardians out-of-band
  │
  ├── For each guardian j (of M collected):
  │     guardian_j sends encrypted share to holder
  │     holder decrypts with their known key
  │
  ├── PassportKernel.shamirRecombine([share_1...share_M])
  │     → original signingKey (32 bytes)
  │
  ├── Old key installed in new device SecureStorage
  ├── Holder optionally rotates to new key (§4.8)
  └── Key Continuity Attestation obtained if rotating (Appendix G.4 of protocol spec)
```

---

## Appendix E: Guardian Recovery Specification

This appendix is normative. It defines the threshold key recovery mechanism using Shamir Secret Sharing, enabling a holder to recover their passport signing key with the help of M-of-N designated guardians.

### E.1 Design Principles

**Guardians hold shares, not keys.** Each guardian holds an encrypted fragment of the holder's signing key. No individual guardian can reconstruct the key alone — not even if they collude with fewer than M-1 others. The adversarial model is: up to M-1 guardians can be compromised or coerced without the key being recoverable.

**The guardian does not need to understand what they hold.** A guardian's share is an opaque encrypted blob stored as a file or QR code. The guardian does not need to install the HIRI app or understand the protocol. Their role is custodian of a file.

**Recovery is fully local.** Once M shares are collected, the key is reconstituted entirely on the holder's new device. No share is ever sent to a server. No guardian learns the reconstituted key.

**Guardian recovery is the third backup tier, not the first.** The backup priority order is: (1) Recovery Kit / Sovereign Cloud — instant, no coordination; (2) Guardian Recovery — requires M guardians and coordination; (3) Accept key loss and start fresh. Guardian recovery is for the scenario where the holder has lost both their device and their Recovery Kit.

### E.2 Shamir Secret Sharing

The implementation uses Shamir's Secret Sharing over GF(2^8) (the same finite field used in AES). The holder's 32-byte Ed25519 private key is split into N shares where any M shares can reconstruct the original.

**Key splitting:**

```
Input:  signingKey (32 bytes)
        M (threshold)
        N (total shares, M ≤ N ≤ 10)

Output: shares[1..N], each containing:
  {
    "shareIndex": i,            // 1-indexed share identifier
    "shareValue": <32 bytes>,   // the share value
    "threshold": M,
    "totalShares": N,
    "passportAddressHint": H(authority || "guardian-hint-v1"),
    "createdAt": "<ISO-8601>"
  }
```

The Slot Blinding Key (§11.7.2 of the passport extension) MUST also be split using the same M-of-N threshold and packaged with the signing key shares, since the blinding key is required for presentation generation.

**Key reconstruction:**

```
Input:  shares[j1..jM] (any M of the N shares)

Output: signingKey (32 bytes), verified by:
  deriveAuthority(signingKey) == passportAddressHint preimage
```

Reconstruction MUST verify the output against the passport address before installing the key. If the passport address hint does not match, the reconstruction has failed (wrong shares, corrupted data, or wrong passport).

### E.3 Guardian Share Encryption

Each share is encrypted before delivery to the guardian. The encryption key is derived from the guardian's HIRI passport authority (if the guardian has a HIRI passport) or from a guardian-provided passphrase (if not).

**For guardians with HIRI passports:**

```
shareEncryptionKey = HKDF-SHA256(
  ikm   = ECDH(holderEphemeralKey, guardianPublicKey),
  salt  = "hiri-guardian-share-v1",
  info  = guardianAuthority || holderPassportAddressHint,
  len   = 32
)

encryptedShare = AES-256-GCM(
  key   = shareEncryptionKey,
  iv    = <random 12 bytes>,
  data  = JSON(share)
)
```

**For guardians without HIRI passports:**

```
shareEncryptionKey = HKDF-SHA256(
  ikm   = guardianPassphrase (UTF-8 bytes),
  salt  = <random 32 bytes, included in the encrypted share file>,
  info  = "hiri-guardian-passphrase-share-v1",
  len   = 32
)
```

The guardian stores the encrypted share file. They do not need to know the encryption key — they only need to be able to produce the file when the holder requests it during recovery.

### E.4 Guardian Enrollment Flow

#### Screen GE-1: Guardian Setup Entry

```
┌──────────────────────────────────────┐
│  ←  Guardian Recovery Setup          │
│                                      │
│  Protect against total device loss  │
│  by distributing your key among     │
│  trusted people you choose.         │
│                                      │
│  How it works:                      │
│  • You pick 3–10 trusted people     │
│  • Each gets one encrypted piece    │
│    of your key (useless alone)      │
│  • If you lose everything, any 2   │
│    (or however many you choose)     │
│    can help you recover             │
│                                      │
│  Choose your threshold:             │
│                                      │
│  Total guardians (N):  [5] ▾        │
│  Required to recover (M): [3] ▾     │
│                                      │
│  This means: any 3 of your 5       │
│  guardians can help you recover.   │
│  2 guardians compromised? Safe.    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Set up guardians →        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### Screen GE-2: Guardian List

```
┌──────────────────────────────────────┐
│  ←  Add Guardians  (0 of 5)          │
│                                      │
│  Add people you trust. They will   │
│  receive one encrypted key piece   │
│  to store safely.                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  + Add guardian                │  │
│  └────────────────────────────────┘  │
│                                      │
│  For each guardian, you can send   │
│  their share by:                   │
│  • HIRI passport (most secure)     │
│  • Encrypted file via email/chat   │
│  • In-person QR scan               │
│                                      │
└──────────────────────────────────────┘
```

#### Screen GE-3: Individual Guardian Setup

```
┌──────────────────────────────────────┐
│  ←  Guardian 1 of 5                  │
│                                      │
│  Guardian name: [Robin Thompson  ]   │
│                                      │
│  How will they store their piece?   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🪪 They have a HIRI passport  │  │
│  │     (most secure)              │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  🔑 They'll use a passphrase   │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  📁 Send them an encrypted     │  │
│  │     file to store anywhere     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### Screen GE-4: Deliver Share

```
┌──────────────────────────────────────┐
│  ←  Send Share to Robin              │
│                                      │
│  Share their recovery piece via:    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📱 Show QR — they scan now    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  📧 Send as encrypted file     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ⚠ Tell Robin:                      │
│  "Please store this file somewhere  │
│  safe. I may need it if I lose my  │
│  phone and all my backups."         │
│                                      │
│  Robin does NOT need the HIRI app  │
│  to hold their piece — just a file. │
│                                      │
│  [Mark as delivered — Robin         │
│   has their piece]                  │
└──────────────────────────────────────┘
```

After all N guardians have been set up and marked as delivered, the app confirms Gold tier status (§4.13.2) and records the guardian configuration locally.

**NORMATIVE — Cryptographic enrollment binding (v1.4.0):**

Guardian enrollment MUST include a cryptographic challenge-response ceremony when the guardian has a HIRI passport or a public-key-capable device. This prevents impersonation — an attacker who intercepts the share file cannot claim to be the legitimate guardian during recovery without the matching private key.

**Enrollment ceremony steps:**

1. Holder generates a 32-byte random enrollment nonce and displays it as a QR code alongside the share delivery.
2. Guardian scans the QR and signs the nonce with their private key (HIRI passport key, or device key if no passport).
3. Guardian returns the signed nonce to the holder (via QR display, encrypted message, or NFC tap).
4. Holder verifies the guardian's signature and records the `guardianPublicKeyFingerprint` in the passport metadata.

```json
{
  "guardianRecord": {
    "guardianName": "Robin Thompson",
    "guardianPublicKeyFingerprint": "sha256:<fingerprint-of-guardian-public-key>",
    "enrolledAt": "2026-03-15T10:00:00Z",
    "expiresAt": "2027-03-15T10:00:00Z",
    "shareIndex": 1,
    "enrollmentNonce": "<base64url-32-bytes>",
    "guardianSignatureOfNonce": "z<base64url-signature>"
  }
}
```

**Recovery request authentication:** During recovery (§E.5), when a guardian submits their share, the recovery flow MUST verify that the share is accompanied by a signature from the `guardianPublicKeyFingerprint` recorded at enrollment. A share submitted by a different key is rejected with: "This key piece doesn't match the registered guardian. Recovery cannot continue with this piece."

For guardians without HIRI passports or signing capability, the enrollment ceremony is passphrase-based: the guardian sets a guardian passphrase during enrollment, and the share is encrypted with `HKDF(guardianPassphrase, ...)` as defined in §E.3. The holder records `enrollmentMethod: "passphrase"` in the guardian record. During recovery, the guardian supplies their passphrase rather than a signature.

**Guardian storage warnings (NORMATIVE — shown during GE-4):**

The GE-4 screen MUST display the following storage warnings before the share is delivered. These are not optional advisory notes — they MUST be presented and MUST require explicit acknowledgment from the holder before marking delivery as complete:

```
┌────────────────────────────────────────┐
│  ⚠ Storage guidance for Robin:        │
│                                        │
│  SAFE storage:                        │
│  ✓ Hardware-backed password manager   │
│  ✓ Encrypted USB drive in a safe      │
│  ✓ Password-protected encrypted folder│
│                                        │
│  UNSAFE — do NOT do these:            │
│  ✗ Cloud photo (iCloud, Google Photos)│
│  ✗ Unencrypted email attachment       │
│  ✗ Screenshot                         │
│  ✗ Screenshot in backup-enabled app   │
│                                        │
│  [ ] I understand and will tell Robin │
│      to store this safely.            │
│                                        │
│  [Continue]  (only enabled when       │
│   checkbox is checked)                │
└────────────────────────────────────────┘
```

**Guardian expiry:** Guardian records MUST have an `expiresAt` date (default: 365 days from enrollment). When a guardian record approaches expiry (within 30 days), the app surfaces a renewal prompt: "Robin's recovery piece expires soon — ask them to re-enroll." Expired guardian records MUST NOT be counted toward the M-of-N threshold.

### E.7 Guardian Lifecycle Management

#### E.7.1 Revoking a Guardian

When a guardian is no longer trusted or reachable, the holder revokes their share. Revocation does not require the guardian's cooperation — the holder simply removes the guardian record from their passport metadata and the old share becomes permanently invalid (it no longer contributes to the threshold count).

If revocation drops the number of active guardians below M, the app warns: "You now have fewer than 3 guardians. You cannot recover your passport if you lose your key. Add a new guardian to maintain your recovery capability."

Revocation is recorded as a `GuardianRevocationRecord` in the passport metadata:

```json
{
  "guardianRevocation": {
    "guardianName": "Robin Thompson",
    "shareIndex": 1,
    "revokedAt": "2026-06-01T00:00:00Z",
    "reason": "guardian-unreachable"
  }
}
```

#### E.7.2 Rotating Guardian Shares

Share rotation generates a new set of N shares from the same underlying key and delivers them to guardians. This is required after key compromise suspicion, after a guardian revocation, or periodically (recommended: annually).

**Share rotation ceremony:**

1. Holder performs a new Shamir split on the current signing key.
2. New shares are generated and delivered to all active guardians using the same enrollment ceremony as §E.4.
3. Old shares are declared invalid via a `GuardianShareRotationRecord` in the passport metadata.
4. Guardians are notified to discard their old share file and replace it with the new one.

The holder MUST contact each guardian out-of-band to confirm they have replaced their old share. The app shows a checklist:

```
Share Rotation Progress

Guardian 1 — Robin Thompson
  Old share: revoked
  New share: [Delivered ✓]

Guardian 2 — Jamie Kim
  Old share: revoked
  New share: [Deliver →]

Guardian 3 — Dr. Martinez
  Old share: revoked
  New share: [Deliver →]
```

Old shares that have not been explicitly replaced remain in the guardian's possession but are no longer valid for the threshold computation — the app records the rotation timestamp and rejects old shares at recovery time.

#### E.7.3 Optional Guardian Passphrase as Second Factor

For guardians with HIRI passports (who authenticate via signature during recovery), a guardian passphrase adds a second factor: the recovery flow requires both the guardian's signature AND their passphrase to decrypt the share. This raises the attack cost from "compromise the guardian's private key" to "compromise the guardian's private key AND obtain their passphrase."

The guardian passphrase is set by the guardian during enrollment, not by the holder. The holder cannot know or recover the guardian's passphrase — if the guardian forgets it, that guardian's share is unrecoverable and a new guardian must be added.

The share encryption in §E.3 is extended:

```
shareEncryptionKey = HKDF-SHA256(
  ikm   = ECDH(holderEphemeralKey, guardianPublicKey) XOR HKDF(guardianPassphrase),
  salt  = "hiri-guardian-2fa-share-v1",
  info  = guardianAuthority || holderPassportAddressHint,
  len   = 32
)
```

The holder records `twoFactorEnabled: true` in the guardian record without recording any passphrase material.

### E.8 Guardian Churn UX

These screens handle the failure modes in guardian management — guardian loss, partial recovery, and share rotation. They complete the guardian lifecycle that §E.4 and §E.7 establish.

#### Screen GE-5: Guardian Loss Handling

Displayed in Settings when a guardian record expires or the holder needs to remove an unreachable guardian:

```
┌──────────────────────────────────────┐
│  ←  Guardian Issue: Robin Thompson   │
│                                      │
│  ⚠ Robin's key piece expired        │
│  (or Robin is no longer reachable)  │
│                                      │
│  YOUR OPTIONS:                       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Re-enroll Robin               │  │
│  │  Ask Robin to re-do the        │  │
│  │  enrollment and receive a      │  │
│  │  new key piece.                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Remove Robin, add someone     │  │
│  │  else                          │  │
│  │  Robin's piece is revoked.     │  │
│  │  You'll add a new guardian.    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Remove Robin — I'll manage    │  │
│  │  with fewer guardians          │  │
│  │  ⚠ This may drop below your   │  │
│  │  threshold.                    │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen GE-6: Rotate All Guardian Shares

Displayed in Settings → Guardian Recovery → Rotate shares, or triggered after key rotation:

```
┌──────────────────────────────────────┐
│  ←  Rotate Guardian Shares           │
│                                      │
│  All guardian pieces are being      │
│  replaced with new ones. Your key   │
│  stays the same.                    │
│                                      │
│  WHY ROTATE?                        │
│  • After key compromise suspicion   │
│  • Annual security hygiene          │
│  • After adding/removing guardians  │
│                                      │
│  WHAT GUARDIANS NEED TO DO:        │
│  Each guardian must discard their  │
│  old piece and accept a new one.   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Generate new pieces →         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen GR-3: Partial Recovery — Not Enough Shares

Displayed when recovery has begun but fewer than M shares are available:

```
┌──────────────────────────────────────┐
│  ←  Recovery in Progress             │
│                                      │
│  You need 3 pieces to recover.      │
│  You have 2 so far.                 │
│                                      │
│  Collected:                         │
│  ✓ Robin's piece                    │
│  ✓ Jamie's piece                    │
│  ○ Still need 1 more                │
│                                      │
│  WHO TO CONTACT:                    │
│  • Dr. Martinez (guardian 3)        │
│  • Sam Park (guardian 4)            │
│  • Taylor Reed (guardian 5)         │
│                                      │
│  Contact them out of band and ask  │
│  them to send their key piece.     │
│                                      │
│  If you can't reach enough          │
│  guardians:                         │
│  [What are my other options?]       │
│                                      │
└──────────────────────────────────────┘
```

"What are my other options?" expands to:

> If you cannot reach enough guardians, your passport key cannot be recovered via this method. Your options are:
>
> - **Start fresh**: Create a new passport. Your old credentials cannot be moved — you would need to request re-issuance from each issuer. This is the same as a complete key loss.
>
> - **Legal / notarial assistance**: If your passport was used for high-value purposes (legal identity, financial access), a notary or legal representative may be able to assist with guardian coordination or document the situation for issuers who require formal re-issuance.
>
> - **Contact issuers directly**: Some issuers have out-of-band re-issuance procedures for holders who have lost their passport key. Contact each issuer individually.

### E.9 Guardian Passphrase Upgrade Path

#### E.9.1 Passphrase Entropy Requirements

Passphrase-encrypted guardian shares are only as secure as the passphrase chosen by the guardian. A weak passphrase reduces the threshold recovery to a brute-force problem against the share file. This section defines normative minimum entropy requirements and the UX that enforces them.

**Entropy requirement (NORMATIVE):**

The application MUST evaluate guardian passphrases using a zxcvbn-equivalent algorithm and MUST enforce a minimum score of **3 out of 4** (approximately 45 bits of effective entropy). The "Continue" button on the guardian passphrase entry screen MUST be disabled until the passphrase meets this threshold.

The entropy evaluation MUST check against:
- A common password list (minimum 10,000 entries: rockyou top-10k or equivalent)
- Keyboard patterns (qwerty, 12345, etc.)
- Personal information from context (guardian name if known, passport address hint)
- Dictionary words without meaningful transformation

**Passphrase entry screen (Screen GU-1 also used during enrollment):**

```
┌──────────────────────────────────────┐
│  ←  Set Guardian Passphrase          │
│                                      │
│  Robin will enter this passphrase   │
│  to help recover your passport.     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Enter passphrase...           │  │
│  └────────────────────────────────┘  │
│                                      │
│  Strength:                          │
│  ██████░░░░  Fair — add more words  │
│                                      │
│  ✗ Too short                        │
│  ✗ Common phrase detected           │
│  ✓ No keyboard pattern             │
│                                      │
│  Try: use 4 or more unrelated words │
│  (e.g., "correct horse battery      │
│   staple" — that style)             │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Continue (disabled until ≥3)  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

The strength meter uses four levels: Weak (score 0–1), Fair (score 2), Good (score 3), Strong (score 4). Only Good and Strong permit continuation.

The application MUST record `guardianEntropyScore` (the integer score 0–4) in the guardian record metadata — not the passphrase itself. This allows future audits to detect when guardian passphrases were enrolled below the current minimum threshold, prompting re-enrollment.

#### E.9.2 Passphrase-to-Key Guardian Upgrade

Guardians who enrolled using a passphrase MAY upgrade to key-based enrollment. This is recommended because key-based enrollment provides stronger authentication during recovery (§E.4 enrollment ceremony) and eliminates passphrase brute-force risk.

**180-day upgrade reminder:**

The application MUST display an upgrade reminder for any guardian enrolled in passphrase mode when:
- 180 days have elapsed since enrollment, OR
- The guardian record's `entropyScore` is less than 3 (was enrolled before entropy requirements were enforced)

The reminder appears in Settings → Security as an amber badge and as an in-line prompt in the Guardian List view:

```
┌────────────────────────────────────────┐
│  Robin Thompson  ·  Passphrase mode    │
│  ⚠ Enrolled 6 months ago             │
│  Upgrade to key-based for better     │
│  security.                           │
│  [Ask Robin to upgrade →]            │
└────────────────────────────────────────┘
```

**Upgrade flow (Screens GU-1, GU-2):**

```
┌──────────────────────────────────────┐
│  ←  Upgrade Robin's enrollment       │
│  Screen GU-1                         │
│                                      │
│  Robin can upgrade from passphrase   │
│  to key-based enrollment.           │
│                                      │
│  HOW IT WORKS:                      │
│  1. Robin needs to install the HIRI  │
│     passport app (free)             │
│  2. You'll run the enrollment        │
│     ceremony again — takes 1 min   │
│  3. The new key replaces the        │
│     passphrase for Robin's share    │
│                                      │
│  Robin's old share stays valid      │
│  until the upgrade completes.       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Start upgrade ceremony →      │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Skip — keep passphrase mode]      │
│                                      │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────┐
│  ←  Robin's Key Upgrade              │
│  Screen GU-2                         │
│                                      │
│  Show Robin this QR code:           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [QR CODE — enrollment nonce]  │  │
│  └────────────────────────────────┘  │
│                                      │
│  Robin scans it with their HIRI    │
│  app and signs the code.           │
│                                      │
│  Waiting for Robin's signature...  │
│  ●●○                                │
│                                      │
│  Once Robin signs, their key       │
│  fingerprint is recorded and the  │
│  passphrase is no longer needed.   │
│                                      │
└──────────────────────────────────────┘
```

After a successful ceremony, the guardian record is updated: `enrollmentMethod` changes from `"passphrase"` to `"key"`, `guardianPublicKeyFingerprint` is recorded, and the share is re-encrypted using the key-based method (§E.3). The old passphrase-encrypted share is invalidated.

### E.10 Guardian Coercion Response

This section provides practical guidance for holders who are being pressured — legally or physically — to provide their guardian recovery materials or to assist an adversary in reconstructing their key.

#### E.10.1 What Coercion Looks Like

Coercion in the context of guardian recovery may take several forms:
- A court order requiring key disclosure
- A physical threat to the holder or their guardians
- Social engineering targeting individual guardians to obtain shares without the holder's knowledge
- A hostile party who has already compromised M-1 guardians and needs the holder to identify the remaining ones

#### E.10.2 Immediate Response Checklist (Screen GC-1)

Available from Settings → Security → Emergency:

```
┌──────────────────────────────────────┐
│  ←  Emergency Security Options       │
│  Screen GC-1                         │
│                                      │
│  ⚠ If you are being pressured to    │
│  give up your passport or guardian  │
│  information, these steps may help. │
│                                      │
│  IMMEDIATE ACTIONS:                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🔄 Emergency rekey            │  │
│  │  Generate a new key now.       │  │
│  │  Your old key becomes useless  │  │
│  │  even with all guardian shares.│  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🔒 Rotate guardian shares     │  │
│  │  Old shares become invalid.    │  │
│  │  Anyone who had a share can    │  │
│  │  no longer use it.             │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🚨 Revoke specific guardian   │  │
│  │  If one guardian is compromised│  │
│  │  or unreachable, revoke just   │  │
│  │  their share.                  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────  │
│  ⚖ Legal / authority contact:      │
│  [Country-specific guidance →]      │
│  ─────────────────────────────────  │
│                                      │
│  [Learn what NOT to do]             │
│                                      │
└──────────────────────────────────────┘
```

#### E.10.3 What NOT to Do

The "Learn what NOT to do" section expands to:

> **Do not tell the adversary which guardians you have or how many shares are required.**
> The adversary only needs to know M. If they know your threshold is 3 of 5, they need only find 3 guardians — by not revealing this, you limit their ability to target the right people.
>
> **Do not collect shares on behalf of the adversary.**
> An adversary who cannot contact your guardians directly may pressure you to contact them and collect shares yourself. Refuse. Once you have M shares, reconstitution is trivial for anyone watching.
>
> **Do not assume that legal coercion is impossible to resist.**
> In many jurisdictions, a court cannot compel key disclosure for personal identity credentials. Consult a qualified legal professional before complying with any official demand. The app provides jurisdiction-specific guidance (informational only, not legal advice).
>
> **If you must comply, emergency rekey first.**
> If you genuinely cannot resist a demand, performing an emergency rekey before compliance means the shares being sought are now worthless — the adversary obtains a key that no longer controls your identity. This is not obstruction of justice; rekey is a normal security operation.

#### E.10.4 Post-Incident Recovery

After a coercion incident, the holder should:

1. **Emergency rekey** (if not already done) — invalidates all existing shares
2. **Rotate guardian shares** — deliver new shares to existing guardians or select new ones
3. **Notify affected issuers** — any issuer whose credential may have been exposed should be informed. Most issuers have a contact path for security incidents.
4. **Review the Privacy Audit** (§4.14) — identify which verifiers received presentations recently; consider whether any presentations were made under coercion

---

#### Screen GR-1: Recovery Entry

```
┌──────────────────────────────────────┐
│  ←  Recovery with Guardians          │
│                                      │
│  You need 3 of your 5 guardians    │
│  to recover your passport.         │
│                                      │
│  Contact them out of band and ask  │
│  them to send you their key piece. │
│                                      │
│  Shares collected:                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Robin ········· [Add share]   │  │
│  │  Jamie ········· [Add share]   │  │
│  │  (waiting for 1 more)         │  │
│  └────────────────────────────────┘  │
│                                      │
│  Add a share:                       │
│  [Scan QR]  [Open file]            │
│                                      │
└──────────────────────────────────────┘
```

#### Screen GR-2: Recovery Complete

```
┌──────────────────────────────────────┐
│                                      │
│              ✓                       │
│                                      │
│       Passport recovered            │
│                                      │
│  Your signing key has been         │
│  restored from 3 guardian shares.  │
│                                      │
│  Verified: hiri://key:ed25519:z6Mk  │
│                                      │
│  Recommended next step:             │
│  Rotate your key and notify         │
│  issuers, since the old key may     │
│  have been accessible on your      │
│  lost device.                       │
│                                      │
│  [Rotate key now]  [Later]         │
│                                      │
└──────────────────────────────────────┘
```

After recovery, the app recommends key rotation (§4.8) since the old key was on a lost device. The holder can also reconfigure their guardian set with new shares generated from the rotated key.

### E.6 Security Properties and Limitations

**What guardian recovery protects against:**
- Total device loss with no other backups
- Recovery Kit destruction (fire, flood)
- Forgotten recovery phrase (amnesia, passage of time)

**What guardian recovery does NOT protect against:**
- M or more guardians colluding to reconstruct the key without the holder's consent
- M or more guardians being coerced simultaneously
- An attacker who can impersonate M guardians convincingly enough to receive their shares

**Mitigations for coercion risk:**
- Guardians should be geographically distributed
- Guardians should not know each other, making simultaneous coercion harder
- Guardians who hold passphrase-encrypted shares require the attacker to also obtain the passphrase — adding a second factor to the share

**Recommended guardian selection:**
- Choose people who are unlikely to be coerced simultaneously (different jurisdictions, different relationships)
- Avoid choosing people who know each other (prevents coordinated disclosure)
- Include at least one guardian who is a legal professional (lawyer, notary) whose professional ethics create additional disincentive to disclose

---

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-03 | Draft | Initial specification |
| 1.1.0 | 2026-03 | Draft | P2P device transfer; Sovereign Cloud restore; Key Rotation UX; Verification Profiles with Fast-Pass; Phantom slots explained in P-2; Recovery Kit PDF; CLI exit code 7; Web viewer IP privacy |
| 1.2.0 | 2026-03 | Draft | Self-attestation architecture (§3.6); Three-tier trust vocabulary (§3.7); Request-to-Fill pattern (§4.9); Screen P-1.5 Data Entry; Ephemeral vs. Persistent self-attested slots; §12.8 and §12.9 normative; SDK patterns §9.4–9.5 |
| 1.3.0 | 2026-03 | Draft | Guardian Recovery Spec (Appendix E, Shamir M-of-N); Proximity Presentation Transport §4.10 (NFC/BLE); Issuer Discovery §4.11 (directory + browser extension handoff); Wallet Portability Export §4.12; Security Health Score §4.13 |
| **1.4.0** | **2026-03** | **Draft — FINAL** | Guardian enrollment cryptographic binding (challenge-response ceremony, fingerprint recording, mandatory storage warnings, expiry/rotation/revocation); BLE mutual ECDH attestation (relay attack prevention); NFC High-Value hardening (30s nonce, biometric required, no background launch); Sensitive field policy for Request-to-Fill (sensitivity enum, prohibited/high/standard, §4.9.6–4.9.7, Screen P-1.6); WASM reproducible build §3.2.1; Per-issuer checkpoint age display §4.7.3; Guardian churn UX (GE-5, GE-6, GR-3); Color-blind safe TrustTierBadge (shape+icon+label); Appendix F Issuer Directory Governance |

---

## Appendix F: Issuer Directory Governance (INFORMATIVE)

This appendix is INFORMATIVE. It defines the governance, trust model, and moderation process for the community Issuer Directory (§4.11).

### F.1 Directory Governance Principles

The Issuer Directory is a public good, not a commercial registry. Its governance follows three principles:

1. **Permissionless submission.** Any HIRI Organizational Authority can submit a directory entry by publishing a `hiri:IssuerDirectoryEntry` document at their `.well-known` URI and opening a pull request to the community repository at `https://github.com/hiri-protocol/issuer-directory`.

2. **Community moderation, not central approval.** No single entity controls which issuers appear. Entries are reviewed by community maintainers for technical validity (does the domain resolve? does the HIRI authority match the KeyDocument?), not for business legitimacy or subjective trustworthiness.

3. **Directory displays facts, not endorsements.** An entry in the directory means the issuer has published a valid `hiri:IssuerDirectoryEntry` and their HIRI authority is technically verified. It does not mean the HIRI protocol endorses them, that their credentials are accurate, or that holders should trust them.

### F.2 Entry Requirements

For an entry to be merged into the directory, the submitter MUST provide evidence of:

| Requirement | Verification Method |
|-------------|-------------------|
| Valid `hiri:IssuerDirectoryEntry` document at `https://<domain>/.well-known/hiri-issuer.json` | Automated CI check at submission time |
| HIRI Organizational Authority published at the same domain | KeyDocument resolution check |
| DNSSEC enabled on the domain | Automated DNSSEC validation |
| `issuerAuthority` in directory entry matches KeyDocument `authorityURI` | Automated signature check |
| Domain has been registered for > 30 days | WHOIS / registry check |
| Entry is not a duplicate of an existing entry for the same authority | Automated deduplication |

### F.3 Sybil Controls

The directory prevents trivial Sybil attacks (flooding the directory with fake issuers) through:

- **Domain age requirement.** Domains registered within the last 30 days are ineligible. This eliminates throwaway domains.
- **DNSSEC requirement.** DNSSEC is required for all entries, which requires the domain owner to actively configure their DNS provider — a meaningful friction for low-effort spam entries.
- **Rate limiting.** No single registrant (as determined by domain registrar) may submit more than 5 entries per calendar month.
- **Manual review flag.** Automated checks flag entries for manual review if: the domain has no web presence, the credential types claimed are unusually broad, or the entry matches patterns associated with previous abuse.

### F.4 Dispute Resolution

When a legitimate organization disputes a fraudulent or impersonating entry, the process is:

1. **File an issue** in the directory repository with evidence of the dispute (trademark registration, government registration number, or other proof of organizational identity).
2. **48-hour notice.** The disputed entry is marked `"status": "disputed"` in the directory for 48 hours, surfacing a warning in the app: "This issuer is under review. Proceed with caution."
3. **Resolution.** Community maintainers review evidence. If the dispute is upheld, the fraudulent entry is removed and the domain is blocklisted for 12 months. If the dispute is rejected, the entry is restored to full status.
4. **Appeal.** Either party may appeal to a panel of three independent maintainers. The panel's decision is final.

### F.5 Entry Signing

Directory entries MUST be signed by the issuer's HIRI authority. The signature covers the full `hiri:IssuerDirectoryEntry` JSON. This means:

- The directory cannot be tampered with to add or modify entries without the issuer's key
- The directory server cannot fabricate entries on behalf of issuers
- Holders can verify any directory entry they receive against the issuer's published KeyDocument

The community repository stores entries as signed JSON files. The directory server re-validates signatures on every cache refresh (maximum 1 hour). Any entry whose signature fails validation is removed from the live directory and flagged for review.

### F.6 Removal Process

An issuer entry is removed from the directory under the following conditions:

- **Issuer request.** The issuer opens a PR to remove their own entry. No review required.
- **Domain expiry.** If the issuer's domain expires and the `hiri:IssuerDirectoryEntry` document becomes unreachable for more than 7 days, the entry is automatically removed.
- **KeyDocument revocation.** If the issuer's HIRI authority key is revoked, the entry is automatically removed.
- **Dispute resolution.** Per §F.4.
- **Policy violation.** If an issuer is found to be issuing fraudulent credentials or engaging in practices that harm holders, maintainers may remove the entry by consensus.

### F.7 PR Moderation Checklist

Every pull request submitting or updating a directory entry MUST pass the following checklist before merge. Steps 1–6 are automated (run by CI on every PR); steps 7–8 require human review.

| # | Check | Method | Pass Criteria | Fail Action |
|---|-------|--------|--------------|-------------|
| 1 | `hiri:IssuerDirectoryEntry` document reachable | HTTP GET `https://<domain>/.well-known/hiri-issuer.json` | HTTP 200, valid JSON-LD | Block merge; comment on PR |
| 2 | Signature valid | Verify JSON-LD signature against claimed `issuerAuthority` | Signature passes Ed25519 verification | Block merge |
| 3 | DNSSEC enabled | DNS lookup with DNSSEC validation | All records in chain signed, RRSIG present | Block merge |
| 4 | `issuerAuthority` matches KeyDocument | Resolve HIRI authority → KeyDocument | `authorityURI` in KeyDocument == `issuerAuthority` in entry | Block merge |
| 5 | Domain registration age | WHOIS / RDAP lookup | Domain registered > 30 days ago | Block merge |
| 6 | Duplicate check | Compare `issuerAuthority` against all existing entries | No existing entry for this authority | Block merge; suggest update to existing entry |
| 7 | Web presence check | Human review of `https://<domain>` | Verifiable organizational web presence consistent with claimed credential types | Request changes |
| 8 | Credential type plausibility | Human review of `credentialTypes` array | Claimed types plausible for declared organization category | Request changes |

**Rate limits on PR submission:**

The CI system enforces: no more than 5 new entry PRs per GitHub account per calendar month. Accounts that have had entries removed for policy violations are blocked from submitting new entries for 6 months.

**Fast-track for government domains:**

PRs from `.gov`, `.mil`, or equivalent country-code government TLDs automatically pass step 7 (web presence) and receive expedited human review within 48 hours.

**Dispute flag:**

Any community member may comment `!dispute` on a merged entry PR to flag it for re-review. The disputed entry is marked `"status": "disputed"` in the live directory immediately, pending resolution per §F.4.

---

## License

**Specification:** CC0 1.0 Universal (Public Domain)
**Reference Implementations:** Apache 2.0

---

*The interface is not separate from the protocol. The way users experience sovereignty, privacy, and verification IS the protocol, made legible.*
