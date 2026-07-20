# BVP role claims

Status: Working Draft implementation evidence; no conformance claim.

The Holder Binding Client validates the complete BVS challenge and signs only the enumerated intent subset. The BVS Issuer binds that transcript, source transcript, adapter profile, and issuance policy in one protected session. An Adapter implements exactly one hash-pinned provider/method/profile version. The Credential Verifier preserves Core signature and status results while independently evaluating evidence profiles and BVS identity. The Relying-Party Policy Engine consumes the complete six-member trust tuple without rewriting evidence.

Candidate evidence requires final published schemas, canonical context/profile bytes and hashes, positive and adversarial signature/replay vectors, adapter conformance tests, complete requirement mapping, and security/privacy review. Placeholder authorities, hashes, URLs, signatures, and examples are not vectors. No Working Draft conformance claim may be made.
