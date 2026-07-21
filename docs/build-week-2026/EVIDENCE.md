# Build Week Development and Verification Evidence

## Primary Codex session

| Field | Value |
|---|---|
| Session ID | `019f7ee9-bd51-7ab0-97db-60f1993f21f0` |
| Recorded model | `gpt-5.6-sol` |
| Recorded provider | `openai` |
| Session record match | Environment thread ID and local `session_meta` ID matched |

This is the primary session in which the specifications were reviewed, implementation plans were created, the PWA and Real Holder Preview foundations were built, failures were corrected, the independent-review kit was prepared, and the Build Week submission was packaged.

## Development-period commit evidence

The repository has no commit before the Build Week submission period. The project concept and source specifications predated the repository and are disclosed as prior work.

Selected dated implementation commits:

| Commit | Date (Eastern) | Evidence |
|---|---|---|
| `53199e5` | 2026-07-20 | Repository created |
| `488c255` | 2026-07-20 | Mobile-first HIRI Passport PWA |
| `a878268` | 2026-07-20 | Pages subpath browser CI correction |
| `6808692` | 2026-07-20 | Signed Real Holder Preview decision record |
| `03b2452` | 2026-07-20 | Signed technical policy decision |
| `8a52e46` | 2026-07-20 | RHP plan harmonized with signed policy |
| `76cb7c3` | 2026-07-21 | RHP foundations and independent resource-review source kit |
| `662e97f` | 2026-07-21 | Exact resource review candidate |

Use `git log --date=iso-strict` to inspect the complete history and signatures.

## Public repository and deployment

- Repository: https://github.com/Skreen5hot/HIRI-Passport
- Visibility: public
- License: MIT
- Default branch: `main`
- Public demo: https://hiri-protocol.org/
- Submission tag: `openai-build-week-2026-submission-v2`

Pre-packaging implementation evidence on commit `662e97fd96164760cff873d8987eae29d6503169`:

- CI: https://github.com/Skreen5hot/HIRI-Passport/actions/runs/29844595459
- GitHub Pages: https://github.com/Skreen5hot/HIRI-Passport/actions/runs/29844594535

Both runs completed successfully. The submission packaging commit triggers fresh CI and Pages runs; the dynamic badges in the README report their current result.

## Automated evidence

The checked-in `npm run check` gate runs:

1. exact resource-source preflight;
2. deterministic Core tests;
3. PWA unit and integration tests;
4. TypeScript checking;
5. conformance report generation and validation;
6. Synthetic Demo static build;
7. Pages artifact validation;
8. bundle auditing.

The separate browser suite covers deployment smoke, consent, evidence separation, accessibility, hostile display text, key protection, privacy, offline behavior, origin gates, Pages subpaths, public preview behavior, service-worker updates, and storage migration.

Submission-packaging results on July 21, 2026:

- Core tests: 82 of 82 passed.
- PWA unit and integration tests: 188 of 188 passed.
- Conformance trace: 240 of 240 mappings present, with all 31 declared error conditions covered.
- TypeScript, Pages artifact, and bundle audits: passed.
- Root-domain browser acceptance: 24 passed; the two project-path variants were intentionally skipped because they require a different build base.
- Dedicated `/HIRI-Passport/` project-path browser acceptance: 2 of 2 passed after rebuilding with the CI base-path configuration.

## Independent review boundary

The resource candidate is mechanically verified but not semantically approved:

- Source commit: `76cb7c37e62e2daef00d4c30f6c44782608d8b8f`
- Candidate commit: `662e97fd96164760cff873d8987eae29d6503169`
- Manifest SHA-256: `sha256:7c08fd1d92f9d2e88182562faf14024964696c45fc0124581414842ec3b60e7d`
- Mechanical checks: 10 passed
- Positive vectors: 8
- Adversarial vectors: 15
- Production approval: false

This candidate is not used to claim that the Build Week Synthetic Demo is a production credential system.
