# RHP resource requirement traceability

Status: review candidate source mapping; no production resource approval is implied.

This document maps every proposed resource byte file to its controlling text, the semantics enforced by JSON Schema, the semantics enforced by Core/runtime code, and the points that require independent human judgment. The exact candidate is the manifest and Git commit named in the review request. If any byte changes, the review is void and must restart.

## Scope decisions applied

- RHP-DR-001 D6-A permits persistent and ephemeral holder self-assertions. Direct-issuer and BVS artifacts remain transient inspection-only and cannot be activated or persisted as trusted credentials.
- RHP-DR-002 D2-A requires empty issuer, verifier-identity, BVS, resolver, current-head, remote-resource, delivery, and relying-party-policy sets.
- Passport Core v2.0.0 is a Working Draft. These are project preview resources, not normative HIRI resources and not evidence of protocol conformance.
- JCS is the signing and resource canonicalization rule. The packaged JSON-LD context is descriptive vocabulary only; the preview does not claim URDNA2015 processing or interoperability.

## Resource-by-resource mapping

| Resource identifier | Exact controlling mapping | Mechanical enforcement | Independent semantic question |
|---|---|---|---|
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/configuration/trust-baseline/v1` | docs/rhp/trust-configuration-policy.md sections 4-12 | Exact empty arrays and canonical origin are validated by the trust schema and runtime parsers. | Does the byte file keep every D2-A trust and network capability closed without implying trust from TLS, display text, or parse success? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/contexts/passport/v2` | Core v2.0.0 Working Draft sections 6.2 and 9; RHP resource governance section 11 | Package verification prohibits remote context dependencies and binds exact JCS bytes. | Are the terms sufficient and non-misleading for the two self-assertion and encrypted-portfolio content types, with no claim of normative JSON-LD processing? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/profiles/release-profile/v1` | RHP-DR-001 D1-A through D6-A; RHP-DR-002 D1-A and D2-A | Fixed profile values disable issuer, BVS, resolver, head, remote-resource, and remote-delivery activation. | Does the profile accurately state every enabled and disabled preview capability and every Core maximum without broadening either signed decision? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/disclosure-request/v1` | Core v2.0.0 Working Draft sections 10 and 11; RHP-DR-001 D6-A | Closed shapes, fixed protocol/type, bounded text/arrays, self-assertion schema pins, and public disclosure only. Core validates exact base encodings, method-authority binding, duplicate tuples, time arithmetic, and combined item minimum. | Is narrowing credential requests to the project persistent-self-assertion schema and self-assertion requests to the project ephemeral schema a correct preview restriction rather than an accidental issuer activation? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/encrypted-portfolio/v1` | Core v2.0.0 Working Draft sections 7.4-7.5; RHP-DR-001 D6-A | Closed root and record shapes, private random record IDs, holder authority, local labels, and persistent-self-assertion references. Encryption properties are tested in the portfolio crypto implementation, not by this plaintext schema. | Core does not define a concrete persistent-self-assertion portfolio record shape. Is this project-only `persistentSelfAssertion` record an acceptable narrow representation, and does it avoid treating local metadata as signed claims? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/ephemeral-self-assertion/v1` | Core v2.0.0 Working Draft sections 9.2 and 12.3; RHP-DR-001 D6-A | Closed item and claim shapes, fixed provenance, exact project schema URI, random IDs, hash syntax, and bounded public text. Core validates request matching and holder-signature containment. | Is the project claim shape `{label,value}` a sufficiently explicit, privacy-safe preview subset of the Working Draft's schema-defined claims? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/passport-presentation/v1` | Core v2.0.0 Working Draft sections 10 and 12; RHP-DR-001 D6-A | Closed message/item shapes, fixed protocol/proof values, self-assertion-only provenance, and no local record ID member. Core validates request binding, method binding, uniqueness, required items, and time limits. | Does the schema exclude direct-issuer/BVS success while correctly permitting both persistent and ephemeral self-assertion presentation paths? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/persistent-self-assertion/v1` | Core v2.0.0 Working Draft section 9.1; RHP-DR-001 D6-A | Closed content/claims, exact preview context/type/schema URI, subject authority, hash syntax, and timestamp/text bounds. Runtime verifies holder/publisher binding and the exact schema digest. | Does the project claim shape and unpublished-by-default treatment preserve the complete-public-content warning and avoid issuer/BVS implications? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/presentation-package/v1` | Core v2.0.0 Working Draft section 13; RHP-DR-001 D6-A | Closed outer container and artifact envelope, count bounds, JCS markers, and hash syntax. The `presentation` and artifact `value` members are deliberately delegated to the separately pinned presentation/schema and HIRI artifact validators. | Is the explicit validator delegation acceptable, or must a later generated schema duplicate the complete presentation and upstream HIRI manifest schemas? Confirm that package containment never implies signature or trust. |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/runtime-config/v1` | real-holder-preview-plan implement-production-runtime-config; RHP-DR-002 D2-A | Exact release/origin, empty network origin arrays, enumerated capabilities, digest syntax, closed capability evidence, and deterministic capability set. Runtime additionally rejects draft/demo version labels and checks expiry. | Does every listed capability have an approved RHP path and does the schema avoid accepting configuration that the runtime will interpret more broadly? |
| `https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/trust-config/v1` | docs/rhp/trust-configuration-policy.md sections 4-12; RHP-DR-002 D2-A | Exact canonical origin/release and `maxItems: 0` on every trust, policy, resolver, head, resource, and delivery collection. | Does this preserve separate cryptography, status, issuer identity, BVS evidence, provenance, and policy dimensions as unknown/not-evaluated rather than accepted? |

## Constraints intentionally delegated to code

JSON Schema patterns narrow input but do not fully decode Ed25519 multibase authorities, base64url random IDs/nonces, calendar dates, absolute URI semantics, or verification-method ownership. The reviewer must inspect and run the Core validators named below:

- `src/core/scalars.mjs`: canonical base encodings, full byte lengths, URI, timestamp, authority, method, and claim-pointer parsing;
- `src/core/disclosure-request.mjs`: combined item minimum, uniqueness, method binding, accepted mode, and 15-minute lifetime;
- `src/core/presentation.mjs` and `src/core/self-assertion.mjs`: request binding, presentation uniqueness, record-ID exclusion, required-item satisfaction, provenance, and self-assertion matching;
- `src/core/presentation-package.mjs`: kind-specific artifact members, duplicate-hash substitution, package bytes/depth/string/artifact limits, and hash verification;
- `app/src/adapters/schema-validator.ts`: reviewed standalone-schema inspection, closed shape rules, runtime input limits, and exact compiled-validator byte binding;
- `app/src/resources/resource-manifest.ts`: manifest, resource hash, JCS, placeholder-material, remote-reference, and total-package checks.

The reviewer must treat a mismatch between a schema and its delegated code as a blocking finding. “The other validator catches it” is acceptable only where this document explicitly identifies the delegation and the complete composed path fails closed.

## Project vector coverage

| Vector | Expected result | Primary coverage |
|---|---|---|
| `PV-SELF-PERSISTENT-001` | valid | persistent holder assertion content and exact schema pin |
| `PV-SELF-EPHEMERAL-001` | valid | ephemeral holder assertion item and provenance |
| `PV-REQUEST-001` | valid | combined persistent/ephemeral request under the RHP restrictions |
| `PV-PRESENTATION-001` | valid | combined persistent/ephemeral presentation and request binding |
| `PV-PACKAGE-001` | valid | unsigned package containing the separately validated presentation |
| `PV-PORTFOLIO-001` | valid | encrypted plaintext profile with one private persistent assertion record |
| `PV-TRUST-001` | valid | exact empty D2-A baseline |
| `PV-RUNTIME-001` | valid | public runtime configuration shape with all network sets empty |
| `NV-REQUEST-UNKNOWN-MEMBER-001` | reject | closed request root |
| `NV-REQUEST-ISSUER-PATH-001` | reject | no issuer/BVS request activation |
| `NV-REQUEST-DUPLICATE-ID-001` | reject | duplicate request ID/tuple |
| `NV-REQUEST-METHOD-BINDING-001` | reject | verifier authority/method binding |
| `NV-REQUEST-LIFETIME-001` | reject | 15-minute maximum |
| `NV-PRESENTATION-ISSUER-PROVENANCE-001` | reject | no direct-issuer substitution in self assertions |
| `NV-PRESENTATION-LOCAL-ID-001` | reject | private portfolio record IDs never leave storage |
| `NV-SELF-OPEN-CLAIMS-001` | reject | closed complete-public claim shape |
| `NV-TRUST-NONEMPTY-001` | reject | empty identity anchors |
| `NV-RUNTIME-REMOTE-ORIGIN-001` | reject | no remote resource origin |
| `NV-JSON-DUPLICATE-MEMBER-001` | reject | duplicate JSON members |
| `NV-JSON-DEPTH-001` | reject | depth limit |
| `NV-JSON-SIZE-001` | reject | string/byte limit |
| `NV-RESOURCE-SUBSTITUTION-001` | reject | exact byte/hash binding |
| `NV-SCHEMA-REMOTE-REF-001` | reject | no external schema reference |

## Reviewer decision rule

Approve only if every automated check passes, every mapping above is examined against the cited text, all six cross-cutting semantic questions are answered in the review notes, and no blocking finding remains open. Any change to a resource, vector, generator, verifier, traceability file, candidate metadata, or manifest requires a new candidate commit, manifest hash, verification report, and complete re-review.
