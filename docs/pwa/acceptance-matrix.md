# PWA acceptance matrix

| Area | Required evidence |
|---|---|
| Holder onboarding | Correlation, origin, storage, key, backup, cancellation, and no-recovery cases |
| Portfolio | Empty/loading/offline/stale and every distinct credential status/provenance case |
| Consent | Hostile text, expiry, replay, required/optional fields, complete-public preview, decline, local-auth cancellation |
| Presentation | Exact request binding, one response, identical retry, no local IDs or phantom counts |
| Keys and devices | Rotation, compromise, add/remove, rollback, backup verification, destructive confirmation |
| Verifier | R/H/C/I/P separation, unknown dependencies, cache provenance, BVP evidence, policy independence |
| Accessibility | Mobile-first 320px flow, 44px touch targets, keyboard, assistive technology, focus, non-color state, reduced motion, zoom and wide-screen enhancement |
| PWA and Pages | Root/subpath, manifest, service worker, offline, update, broken-worker recovery, deployment artifact |
| Security/privacy | Dedicated-origin gate, CSP, no runtime third parties, redaction, no secrets/demo data in production bundle |

Synthetic Demo and Real Holder Preview are separate release levels. Working Draft conformance and all five Core open capabilities remain unavailable.
