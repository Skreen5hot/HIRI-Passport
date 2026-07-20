# HIRI Passport Suite Contract

This record acknowledges Core v2.0.0 WD2, UX v2.0.0 WD1, and BVP v3.0.0 WD1 under the v1.2.0 design-control baseline. The pinned upstream contract is HIRI Protocol v3.1.1 and Privacy Extension v1.4.1 at commit `009c145c9740188fc7a03b19c8ac2079bfe61cdb`. Upstream HIRI rules control artifact semantics; Core controls Passport messages and verification; BVP narrows BVS behavior; UX controls application behavior without redefining protocol bytes.

BCP 14 uppercase terms are normative. Cryptographic evidence, credential status, issuer organizational identity, provenance, and relying-party policy are independent dimensions. A valid signature proves control by a cryptographic authority, not truth, legal effect, or policy acceptance.

Passport-Core uses complete public Credential Claims linked to a stable genesis-derived Ed25519 holder authority. The content is observable, copyable, and correlatable. Sensitive employment, health, government identity, private education, financial, and similar claims are excluded unless complete public disclosure is explicitly authorized and permitted. Public mode is not selective disclosure.

The holder portfolio is private storage, not verifier evidence. BVS credentials name the BVS as direct issuer and providers or registries as evidence. Provenance is one of `direct-issuer`, `bvs`, `self-asserted-persistent`, or `self-asserted-ephemeral`.

Out of scope in the current build are selective-disclosure cryptography, interoperable current-head discovery, total-loss authority recovery, proximity transport security, universal issuer discovery, legal-identity equivalence, and aggregate trust scoring. Downstream work must fail closed or report `unknown` where those omissions remove required evidence.

Coverage: Core §1, §2, §2.1, §2.2, §2.4, §3; UX §1, §2, §2.1, §2.2, §2.3; BVP §1, §2, §2.1, §2.2, §2.3, §3.
