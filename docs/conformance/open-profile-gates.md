# Open Profile Gates

The following gates are non-bypassable:

- `OPEN-SD-01`: no selective credential conformance. The current Mode 3 HMAC key must never be delegated to a verifier.
- `OPEN-HEAD-01`: no interoperable confirmed-current status discovery. A configured issuer-authoritative source may establish Core `active`; otherwise status remains `unknown`.
- `OPEN-CONTEXT-01`: placeholder contexts, schemas, profile URLs, and hashes are non-production and block Candidate status.
- `OPEN-RECOVERY-01`: no claim that loss of all authorized signing and recovery methods preserves the holder authority.
- `OPEN-TRANSPORT-01`: no interoperable selective-presentation or proximity-transport security claim.

Passport-Interoperable and Passport-Hardened conformance are disabled. Custom transparency logs, proprietary statement subsets, guardian recovery, and transport-specific closed-message members are not implemented. The conformance harness must report `candidateReady: false` while any gate remains open or required schemas, vectors, compatibility evidence, and reviews are missing.

Coverage: Core §8.5, §14.4, §18.2, §18.3, §18.4, §19; UX Appendix B; BVP Appendix B.
