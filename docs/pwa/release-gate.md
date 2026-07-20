# PWA release gate

## Level 1 — Synthetic Demo

The default `skreen5hot.github.io/HIRI-Passport/` project site may deploy only as a visibly synthetic demonstration. CI, TypeScript, protocol and PWA unit tests, mobile and desktop Chromium acceptance, accessibility checks, adversarial rendering, offline shell behavior, repository-subpath routing, bundle audit, and Pages artifact checks must pass. The build must contain no real holder keys, credentials, client secrets, private endpoints, source maps, remote runtime scripts, or Working Draft conformance claim.

## Level 2 — Real Holder Preview

A real-data preview additionally requires a dedicated verified origin, enforced HTTPS, an approved browser capability matrix, reviewed and hash-pinned normative resources, external resolver CORS and provenance review, backup and migration rehearsal, dependency and service-worker security review, and privacy/security sign-off. Placeholder normative resources and synthetic protocol success paths must be absent. A browser non-extractable key reduces exposure but is not represented as hardware-backed protection.

## Blocked claims

Production conformance remains blocked while the specifications are Working Drafts and the open Core capability gates, official vectors, and independent reviews remain unresolved. Policy acceptance never promotes invalid or unknown cryptography; cached or holder-supplied state never establishes current issuer head freshness.
