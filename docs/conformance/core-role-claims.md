# Passport-Core role claims

Status: implementation evidence for a Working Draft; no conformance claim.

The codebase implements separable holder, verifier, issuer, BVS-facing, and resolver boundaries. Each role consumes injected clock, cryptographic, storage, resolution, schema, identity-anchor, and policy capabilities. An application may implement more than one role, but evidence produced by one role does not inherit the authority or trust of another.

`Passport-Interoperable` and `Passport-Hardened` claims are blocked. Candidate evaluation requires all open profile gates to be resolved or removed, versioned final schemas, pinned final contexts, official positive and adversarial cryptographic vectors, validated examples, unique requirement-to-test mapping, pinned HIRI v3.1.1 compatibility evidence, and completed security and privacy review.

The deterministic report is produced by `node scripts/check-core-conformance.mjs`. Its `candidateReady` value remains `false` while the document is a Working Draft or any named gate is absent. Placeholder keys, hashes, signatures, URLs, contexts, and examples are not vectors.
