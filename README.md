# HIRI Passport

[![CI](https://github.com/Skreen5hot/HIRI-Passport/actions/workflows/ci.yml/badge.svg)](https://github.com/Skreen5hot/HIRI-Passport/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/Skreen5hot/HIRI-Passport/actions/workflows/pages.yml/badge.svg)](https://github.com/Skreen5hot/HIRI-Passport/actions/workflows/pages.yml)

HIRI Passport is a mobile-first exploration of holder-controlled digital credentials: inspect what a credential says, keep different evidence questions separate, review a disclosure request, and make an explicit sharing decision.

> **OpenAI Build Week submission status:** the public application is a **Synthetic Demo** using generated sample data. It creates no real keys, accepts no real credentials, performs no production identity verification, and makes no conformance or production-readiness claim.

## Try the working demo

- Public demo: **[https://hiri-protocol.org/](https://hiri-protocol.org/)**
- Direct sample portfolio: [open the Synthetic Demo passport](https://hiri-protocol.org/#/home)
- No account, login, API key, or test credential is required.

The demo is intentionally labeled on every screen. It is free to use and will remain available in its submitted form throughout the Build Week judging period.

## What the demo shows

- A holder-first, mobile-responsive passport containing synthetic credentials and a self-asserted record.
- Separate results for cryptography, credential status, issuer identity, provenance, and relying-party policy instead of one misleading aggregate trust badge.
- Credential detail with inspectable content, schemas, and hashes.
- Local request import and an explicit consent review with a visible decline path.
- Synthetic presentation, delivery, verification, privacy-history, key-lifecycle, offline, and update states.
- Keyboard, zoom, reduced-motion, hostile-text, and screen-reader-oriented acceptance coverage.
- A compile-time boundary between `synthetic-demo` and the fail-closed `real-holder-preview` composition.

All names, organizations, credentials, requests, identifiers, and hashes shown by the public demo are synthetic or non-authoritative.

## Sixty-second judge walkthrough

1. Open the [sample passport](https://hiri-protocol.org/#/home) and note the persistent **Synthetic demo** ribbon.
2. Open **Professional Engineer**. Compare the independent Cryptography, Status, Issuer identity, Provenance, and Policy results.
3. Select **Present**, choose **Load synthetic consent preview**, and then **Inspect request**.
4. Review the fixed unknown-identity warning, requested field and purpose, and visible **Decline request** option.
5. Visit **Verify** or **Settings** to inspect additional simulated states without creating a real authority or key.

Detailed judge instructions are in [docs/build-week-2026/JUDGES.md](docs/build-week-2026/JUDGES.md).

## Run locally

### Prerequisites

- Node.js 22 or newer; the repository pins its expected version in [`.node-version`](.node-version).
- npm, included with Node.js.

### Development server

```powershell
git clone https://github.com/Skreen5hot/HIRI-Passport.git
cd HIRI-Passport
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

### Build the static demo

```powershell
npm run build
npm run preview
```

The generated static artifact is written to `dist/`. The public deployment uses the same locked dependency graph and build command in GitHub Actions.

### Verify the project

```powershell
npm run check
npx playwright install chromium
npm run test:browser
```

`npm run check` performs resource preflight, Core and PWA tests, TypeScript checking, conformance reporting, a production-style static build, and bundle auditing. Browser acceptance exercises the built artifact rather than a mocked development page.

## Architecture

The repository is intentionally specification-driven:

- `src/core/` contains deterministic protocol and validation functions with explicit injected ports.
- `app/src/` contains the React PWA, local state, storage, adapters, services, and runtime compositions.
- `test/core/`, `test/pwa/`, and `test/browser/` cover deterministic logic, browser-backed application behavior, accessibility, privacy, origin controls, and deployment behavior.
- `resources/preview/` contains an **unsigned review candidate**, not approved production resources.
- `plan.js`, `pwa-plan.js`, and `real-holder-preview-plan.js` are dependency-ordered implementation contracts derived from the specifications.

The Synthetic Demo and Real Holder Preview are separate compile-time compositions. Production activation stays fail closed: the packaged production resource catalog is empty, independent review is pending, and candidate metadata remains `candidateReady: false`.

## OpenAI Build Week 2026

The HIRI concept and design work began before Build Week. The implementation repository was created during the submission period, and the mobile PWA, automated test suite, runtime separation, security foundations, review tooling, CI, and public deployment were built or meaningfully extended with Codex and GPT-5.6 during that period.

Submission materials:

- [Build Week submission record](BUILD-WEEK-SUBMISSION.md)
- [How GPT-5.6 and Codex accelerated the work](CodexAcceleration.md)
- [Judge testing guide](docs/build-week-2026/JUDGES.md)
- [Paste-ready Devpost description](docs/build-week-2026/DEVPOST-DESCRIPTION.md)
- [Demo video script](docs/build-week-2026/VIDEO-SCRIPT.md)
- [Development and verification evidence](docs/build-week-2026/EVIDENCE.md)
- [Known limitations](docs/build-week-2026/KNOWN-LIMITATIONS.md)

- Primary Codex session ID: `019f7ee9-bd51-7ab0-97db-60f1993f21f0`
- Recorded session model: `gpt-5.6-sol`

## Specification status

The compatibility-corrected specifications remain Working Drafts and are not conformance targets:

- [Compatibility and Normative Decisions](HIRI-Passport-v2_0_0-Compatibility-and-Normative-Decisions.md)
- [Digital Passport Extension v2.0.0 Draft](HIRI-Digital-Passport-Extension-v2_0_0-DRAFT.md)
- [UX Architecture v2.0.0 Draft](HIRI-Passport-UX-Architecture-Spec-v2_0_0-DRAFT.md)
- [Bootstrap Verification Profile v3.0.0 Draft](HIRI-Bootstrap-Verification-Profile-v3_0_0-DRAFT.md)

Historical design inputs are preserved for traceability and are not current development contracts.

## Security and privacy boundary

Do not enter real personal information, credentials, private keys, authentication secrets, or production requests into the Synthetic Demo. The public build is for demonstration and evaluation only. See [KNOWN-LIMITATIONS.md](docs/build-week-2026/KNOWN-LIMITATIONS.md) and the [Real Holder Preview owner-blocker register](real-holder-preview-owner-blockers.md) for the gates that remain open.

## License

Copyright (c) 2026 Aaron Damiano. Released under the [MIT License](LICENSE).
