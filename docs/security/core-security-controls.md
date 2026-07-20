# Core Security Controls

| Risk | Required control | Implementation evidence |
|------|------------------|-------------------------|
| Malicious transport or resolver | Verify signatures, hashes, chains, authorities, and retrieval provenance independently of transport | Manifest, package, and status tests |
| Request or presentation replay | Retain accepted tuples through expiry plus skew and reject duplicates | Request and security-state tests |
| Resolver rollback | Never let holder material establish freshness; reject an older authenticated cache replacing a newer one without chain explanation | Status and cache tests |
| Key exposure | Keep signing, X25519, content-encryption keys, and plaintext behind injected protected-storage ports and out of logs | Port, redaction, and backup tests |
| Decryption oracle | Expose one indistinguishable remote failure class and bound recipient trials | Portfolio crypto tests |
| Correlation | Disclose stable-authority and complete-public-content consequences; keep local record IDs and history out of protocol and analytics | Request, presentation, and UX reviews |
| Portfolio traffic analysis | Document ciphertext size, timing, stable URI, recipient-array length, and length changes; never call the array length a device count | Portfolio and UX reviews |
| Malicious display text | Render purpose, names, and domains as untrusted plain text; do not promote signed hints to verified identity | Request and UX tests |
| BVS secret leakage | Exclude provider tokens, passwords, cookies, documents, biometrics, and raw responses from public evidence | BVP issuance tests |
| Recipient removal | Re-encrypt future versions and state that previously received ciphertext cannot be retracted | Portfolio and backup tests |

Network or resolver failure never proves `active`. Policy acceptance never rewrites cryptographic or status evidence. Local presentation history remains holder-controlled and is not synchronized or exported without explicit configuration.

Coverage: Core §17 and §17.1–§17.9.
