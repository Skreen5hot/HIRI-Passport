# UX Principles and Vocabulary

The product must not equate a Passport authority with a vendor account. Consent shows the verifier, available identity evidence, each requested item and field, its purpose, required state, known provenance, and disclosure mode. Decline is at least as reachable as acceptance. Externally supplied text is untrusted plain text.

Every result exposes separate protocol/cryptography, credential status, issuer identity, provenance, and policy dimensions. `unknown` means missing, stale, unsupported, or unauthenticated evidence; it is neither valid nor invalid. Numeric trust tiers, overall trust badges, and portfolio-membership or completeness claims are prohibited.

User-facing mappings:

- Passport: experience around a stable holder authority and private portfolio.
- Portfolio: protected holder records, not public evidence.
- Credential: complete issuer-signed Credential Claim and Resolution Manifest.
- Request: verifier-signed Disclosure Request.
- Presentation: holder-signed Passport Presentation, usually in an unsigned package.
- Self-provided information: persistent or ephemeral holder assertion, never independent issuer evidence.

Technical detail views expose relevant authorities and methods, hashes, schemas and pins, times, status provenance, policy identity/version, and structured errors. They do not invent Merkle proofs, public slots, custom revocation proofs, or aggregate trust.

Coverage: UX §3, §3.1–§3.4, §4, §4.1–§4.3.
