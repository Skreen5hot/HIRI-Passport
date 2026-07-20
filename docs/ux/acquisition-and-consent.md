# Acquisition and consent acceptance criteria

Status: Working Draft review contract.

A direct credential is added locally only after its manifest, content hash, issuer authority, subject, schema, and available lifecycle evidence are checked. A BVS credential identifies the BVS as the direct issuer and names source providers only as evidence sources. Cryptographically valid credentials from an unconfigured BVS remain visible with unknown or untrusted policy state.

Request-to-fill defaults to an ephemeral self-assertion. Persisting the assertion is a separate choice, and public publication requires an additional public-consequence confirmation.

Consent begins only after closed-schema, fixed-value, ID, nonce, freshness, proof, signature, and verifier-method validation. An expired or replayed request is blocked. Signed display values are labeled as hints unless backed by separate identity evidence. The view shows every item and field, purpose, required flag, known provenance, complete public Credential Claim content, BVS evidence, and the consequence that public mode discloses the whole claim.

The holder can decline the request and omit optional items. Acceptance binds one presentation to the exact verifier authority, request ID, nonce, items, and modes. Omitted data is absent without counts or topology hints. After signing, only byte-identical retransmission is allowed under the accepted tuple.
