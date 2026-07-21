# OpenAI Build Week 2026 Submission Record

## Submission identity

| Field | Value |
|---|---|
| Project | HIRI Passport - Synthetic Demo |
| Recommended category | Apps for Your Life |
| Public demo | https://hiri-protocol.org/ |
| Source repository | https://github.com/Skreen5hot/HIRI-Passport |
| License | MIT |
| Submission version | `openai-build-week-2026-submission-v1` |
| Primary Codex session | `019f7ee9-bd51-7ab0-97db-60f1993f21f0` |
| Recorded session model | `gpt-5.6-sol` |

## Submitted project

HIRI Passport is a mobile-first Synthetic Demo of a holder-controlled digital credential experience. It demonstrates a local passport, inspectable credential evidence, explicit disclosure consent, presentation and verification states, privacy history, and honest unknown or unavailable results.

The submitted application uses generated fixtures and non-authoritative identifiers. It creates no real holder keys, accepts no real credentials, contacts no production resolver, and is not represented as conformant, independently reviewed, certified, or production ready.

## Prior work and Build Week work

The HIRI concept and specification work began before the Build Week submission period. That prior design work is not represented as newly invented during the challenge.

The repository was created during the submission period. Work completed or meaningfully extended with Codex and GPT-5.6 during the period includes:

- compatibility and correctness revision of the Passport specifications;
- dependency-ordered deterministic implementation plans;
- the mobile-first React PWA and public Synthetic Demo;
- deterministic Core validation and protocol functions;
- IndexedDB persistence, migration, protected-key, local-authentication, and encrypted-state foundations;
- compile-time Synthetic Demo and Real Holder Preview separation;
- origin, resource, identity, policy, resolver, and acquisition boundaries;
- automated Core, PWA, browser, accessibility, privacy, offline, and deployment tests;
- GitHub Actions CI and GitHub Pages deployment;
- exact-hash decision and resource-review evidence tooling.

The dated commit history and [evidence record](docs/build-week-2026/EVIDENCE.md) distinguish this work from the earlier project concept and design inputs.

## Submission requirements evidence

- **Working project:** the public demo requires no account or test credential and loads from the URL above.
- **Category:** Apps for Your Life is recommended because the demonstrated product is a holder-facing consumer application.
- **Description:** [DEVPOST-DESCRIPTION.md](docs/build-week-2026/DEVPOST-DESCRIPTION.md) is ready to paste into the submission form.
- **Demo video:** [VIDEO-SCRIPT.md](docs/build-week-2026/VIDEO-SCRIPT.md) provides a timed script under three minutes; the owner must record, upload publicly to YouTube, and supply the final link.
- **Repository:** the repository is public and MIT licensed.
- **README:** [README.md](README.md) contains demo access, setup, sample data, testing, architecture, limitations, and Codex collaboration links.
- **Codex use:** [CodexAcceleration.md](CodexAcceleration.md) records acceleration, owner decisions, GPT-5.6 use, and the human/automation boundary.
- **Session ID:** `019f7ee9-bd51-7ab0-97db-60f1993f21f0`.

Official rules: https://openai.devpost.com/rules

## Submission freeze

The signed tag `openai-build-week-2026-submission-v1` identifies the source shown to judges. The public Synthetic Demo should remain materially consistent with the video and description through the judging period ending August 5, 2026 at 5:00 PM Pacific Time.

Post-submission Real Holder Preview work may continue on a separate branch. It should not replace the submitted public demo or change the submitted Devpost materials during judging. The planned origin separation remains documented in [demo-origin-migration-plan.js](demo-origin-migration-plan.js) for execution after the submission freeze.

## Remaining owner actions

1. Record the demo using the timed script.
2. Upload the video publicly to YouTube and verify audio and visibility in a signed-out browser.
3. Paste the project description and required links into Devpost.
4. Enter the session ID exactly as shown above.
5. Review eligibility and accept the official rules personally.
6. Submit before July 21, 2026 at 5:00 PM Pacific Time and retain the confirmation.
