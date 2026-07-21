# Paste-ready Devpost Description

## Project title

HIRI Passport - Synthetic Demo

## Tagline

A mobile-first, holder-controlled credential experience that keeps proof, identity, status, provenance, and policy honest and separate.

## Category

Apps for Your Life

## Description

HIRI Passport explores what a user-controlled digital credential wallet should feel like before the ecosystem asks people to trust it with real identity data.

The Build Week submission is a working mobile-first Synthetic Demo. A holder can inspect a sample passport, open credential details, see cryptography, credential status, issuer identity, provenance, and relying-party policy as independent evidence dimensions, load a synthetic disclosure request, review the exact requested field and purpose, decline or continue, and explore presentation, verification, privacy-history, offline, update, and key-lifecycle states.

The separation of evidence is the product idea. A valid signature does not automatically establish that an organization is who it claims to be, that a credential is current, or that a relying party should accept it. HIRI Passport keeps those questions visible instead of collapsing them into one green trust badge.

The public application is intentionally labeled **Synthetic Demo - no real keys or credentials**. It uses generated sample data, performs no production identity verification, and makes no production-readiness or standards-conformance claim. A Real Holder Preview architecture exists behind fail-closed gates, but independent resource review and final production approvals remain post-challenge work.

## How it was built

The project used a specification-driven Codex workflow. I supplied the HIRI project direction, selected the holder-first risk posture, made product and governance decisions, and approved the boundaries. Codex with GPT-5.6 Sol reviewed and harmonized the specifications, converted them into dependency-ordered implementation units, implemented the PWA and deterministic Core, wrote and executed tests, diagnosed failures, and created review and deployment evidence.

Each implementation unit named its files, dependencies, covered specification sections, and complete scope. This let the build proceed module by module while mechanically checking coverage and preserving file boundaries. The resulting repository includes the plan artifacts, application code, extensive Core/PWA/browser tests, CI, GitHub Pages deployment, and exact-hash resource-review tooling.

## What was challenging

The hardest part was maintaining honest boundaries. The UI had to distinguish valid cryptography from organizational identity, current status, provenance, and local policy. The build also had to make the attractive demo easy to test without allowing synthetic fixtures, reset controls, or ambiguous runtime flags into the real-holder composition.

Another challenge was recognizing what automation cannot approve. Codex prepared deterministic review candidates and mechanical evidence, but the project intentionally leaves independent human semantic review and owner production approval open.

## What I am proud of

- A coherent mobile-first experience rather than a disconnected technical proof of concept.
- Persistent synthetic labeling and a visible decline path.
- Separate evidence dimensions and honest unknown states.
- Compile-time demo/preview separation with fail-closed production resources.
- A substantial deterministic test and conformance suite.
- A traceable specification-to-plan-to-code workflow built with Codex.

## What is next

After Build Week, an external technical reviewer will review the exact candidate resource package. The project will then continue the planned Real Holder Preview work, physical-device evidence, deployment hardening, and the move of the Synthetic Demo to its own isolated origin. Production activation remains blocked until those gates close.

## Links

- Demo: https://hiri-protocol.org/
- Code: https://github.com/Skreen5hot/HIRI-Passport
- Primary Codex session ID: `019f7ee9-bd51-7ab0-97db-60f1993f21f0`
