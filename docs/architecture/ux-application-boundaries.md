# UX Application Boundaries

The application is layered as UI/workflow orchestration, application services, pure Passport/HIRI kernel, and injected ports. The kernel performs parsing, canonicalization, signing, verification, and report production. It has no implicit network, filesystem, storage, clock, randomness, biometric, analytics, or policy-discovery access.

Ports supply time, cryptographically secure randomness, cryptographic operations, protected storage, resolver candidates with source and retrieval time, schema/context bytes, configured issuer-authoritative assertions, identity anchors, relying-party policy, and transport. Device biometrics or platform integrity may gate local key use but are not protocol authority, issuer identity, signature, or status evidence.

Local record IDs, notes, labels, sort order, archive state, favorites, counts, and presentation history stay protected and do not enter messages, packages, issuer-visible artifacts, verifier logs, or telemetry. Network conveniences remain outside the kernel and preserve retrieval provenance.

Coverage: UX §5, §5.1–§5.3.
