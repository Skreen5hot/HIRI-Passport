# Passport-Core traceability

Status: Working Draft implementation traceability.

| Requirement family | Implementation | Tests |
|---|---|---|
| Scalar and proof rules | `src/core/scalars.mjs`, `canonical.mjs`, `proof.mjs` | `test/core/scalars.test.mjs`, `proof.test.mjs` |
| Authority, manifests, resources | `src/core/authority.mjs`, `manifest.mjs`, `resources.mjs` | Corresponding Core tests |
| Portfolios and credentials | `src/core/portfolio-*.mjs`, `credential*.mjs`, `status.mjs` | Corresponding Core tests |
| Requests and presentations | `src/core/message.mjs`, `disclosure-request.mjs`, `request-session.mjs`, `presentation*.mjs` | Corresponding Core tests |
| Verification and policy | `src/core/verify-rhc.mjs`, `identity-policy.mjs`, `report.mjs` | Corresponding Core tests |
| Security and migration | `src/core/security-state.mjs`, `migration.mjs` | Corresponding Core tests |

The executable harness extracts every accepted `REQ-*` identifier from the current Core specification and reports the test inventory and stable error registry. The JSON report is deterministic; it does not turn placeholders into vectors or make a Working Draft conformance claim.

Revision history: 2026-07-20 — initial v2.0 compatibility/correctness build traceability from the accepted decision record and plan.
