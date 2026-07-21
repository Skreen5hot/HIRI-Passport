# Real Holder Preview browser capability matrix

Status: PROVISIONAL TEST MATRIX — no browser or device is approved for real authority creation

Owner gate: `OWNER-RHP-06`

Related gates: `OWNER-RHP-07` key/local-auth policy and `OWNER-RHP-08` backup/recovery policy

## 1. Decision rule

Browser brand or user-agent version never establishes support. A device/browser pair may create a real preview authority only after exact-version physical evidence passes every mandatory capability, durability, lifecycle, accessibility, and privacy test required by the enabled workflows.

Until owner approval, every platform is inspect-only for real-data purposes. The Synthetic Demo may continue to run with visible labeling.

## 2. Evidence already available

| Evidence | Current result | What it proves | What it does not prove |
|---|---|---|---|
| Playwright desktop Chromium project | Passing in CI | Responsive/root-path synthetic browser flows work in an isolated Chromium context | Physical device storage durability, key protection, WebAuthn, OS privacy, long-lived service worker behavior |
| Playwright Pixel 7 emulation | Passing in CI | Mobile viewport/input synthetic flow works in Chromium emulation | Android hardware, mobile browser process death, storage eviction, biometrics, install/update behavior |
| GitHub Pages subpath test | Passing in CI | Synthetic project-path manifest/service-worker routing works | Custom-origin real-data isolation or release approval |
| PWA/unit capability tests | Passing | Capability probe executes algorithms and fail-closed code paths | A specific browser/version is approved |
| Live custom origin | HTTPS and Pages deployment verified | Public shell/preview/notice availability | Real-data mode, key durability, privacy/security approval |

CI runs with `HIRI_DEMO_MODE: "true"`. No current result authorizes real key creation.

## 3. Capability states

| State | Meaning |
|---|---|
| NOT TESTED | No exact-version physical evidence exists. |
| INSPECT-ONLY | Public information and synthetic demo may be viewed; no real state/key path. |
| TEST EVIDENCE | Required automated/physical tests passed, but owner has not approved support. |
| APPROVED | Owner approved the exact browser/device range and evidence package. |
| DEGRADED | A named non-sensitive workflow is allowed; authority/signing remains blocked. |
| WITHDRAWN | Previously approved support was removed by an authenticated decision. |

## 4. Mandatory protocol capability gates

| Capability | Test requirement | Failure behavior |
|---|---|---|
| Secure context and exact origin | `isSecureContext`; exact scheme/host/port/base; frame/lookalike tests | Block before storage/key initialization |
| Capability-evidence policy | Hash-bound public configuration with explicit `notAfter`; check at startup and immediately before every authority creation or sensitive operation | Inspect-only before key/state access when missing, invalid, or expired |
| Cryptographic randomness | Execute `crypto.getRandomValues`; uniqueness/bounds tests | Block authority creation/signing |
| SHA-256 | Execute known-answer digest | Block parsing/hash/signing workflows |
| AES-256-GCM | Generate/import, encrypt/decrypt, tamper and AAD tests | Block portfolio/backup paths |
| HKDF-SHA256 | Import and derive known-answer bits | Block portfolio recipient derivation |
| Ed25519 | Generate non-extractable private key, sign/verify vectors, reload use | Block authority/signing |
| X25519 | Generate non-extractable private key, derive vectors, reload use | Block portfolio recipients/device addition |
| IndexedDB | Open, transaction, abort, structured-clone `CryptoKey`, reload/restart persistence | Block all real state |
| Service worker | Install/update/scope, waiting-worker prompt, multi-tab activation, `controllerchange` reload, connected-client convergence, offline/reconnect, installed-mode, and broken-worker recovery | May allow online inspect-only; block supported PWA claim and all stale-client sensitive operations |
| Storage persistence API | Query/request/result and eviction communication | Absence may be allowed only with explicit durability policy; never imply guaranteed persistence |
| File import/export | Bounded selection/download, cancellation, hostile filename/content | Disable file workflow only |
| Clipboard | Permission/copy/failure and explicit warning | Disable clipboard workflow only |
| WebAuthn/local auth | User verification, cancel, retry, exact operation/state-hash binding, 300-second maximum, single use, and invalidation on navigation/reload/material state change | Block sensitive operation when OWNER-RHP-07 requires it |

The current `protocolReady` probe is necessary but insufficient: it does not yet prove private-key generation without an extractable intermediate, durable `CryptoKey` reuse after process restart, storage rollback handling, local authentication, or physical-device behavior.

## 5. Required key-protection evidence

For each approved browser/device pair:

1. generate final Ed25519 and X25519 private keys with `extractable === false` from creation;
2. prove `exportKey` fails for each private key;
3. persist the handles through IndexedDB structured clone without serializing PKCS#8/JWK bytes;
4. close all tabs, terminate/restart the browser, reload, and prove authorized operations still work;
5. inspect application storage, logs, history, backups, crash artifacts, and network capture for private encodings;
6. verify deletion makes the handles unavailable to the application;
7. document what same-origin scripts, browser extensions, device compromise, and OS backup can still do.

`app/src/adapters/protected-key-store.ts` does not meet item 1 because it currently exports a PKCS#8 intermediate. It is demo/prototype code and blocks real-data approval until replaced.

## 6. Required durability and lifecycle evidence

Each pair must pass:

- first run, reload, browser restart, OS/device restart, update, and service-worker replacement;
- update discovery in every connected active tab; coordinated activation without holder data in messages; safe cancellation or completion-boundary behavior for an active sensitive operation; no new sensitive operation after an emergency replacement is known; and reload only after `controllerchange`;
- measured convergence within 15 minutes after an emergency replacement becomes publicly available for visible, active, network-connected tabs and installed clients, with deployment, public-availability, discovery, activation, control, and reload timestamps;
- offline launch and reconnect, proving that no finite offline convergence is claimed and that a stale client updates before another sensitive operation;
- capability-evidence `notAfter` before, at, and after expiry using explicit protocol time; missing/invalid configuration; manipulated device-clock limitation disclosure; and no unapproved network lookup;
- quota pressure, denied persistence request, storage clearing, simulated eviction, corrupted record, and unavailable IndexedDB;
- blocked/version-change transaction, concurrent tabs, expired lease, partial migration, downgrade refusal, and no silent reset;
- offline shell with status/resource-dependent results remaining unknown;
- routine rotation, one-key loss, compromise, device addition/removal, backup verification, restore, and destructive deletion according to approved policies.

Installation to a home screen or desktop does not prove durable storage or recovery.

## 7. Required accessibility and privacy evidence

Each supported workflow is tested on physical devices with keyboard or switch access where applicable, screen reader, 200% and 400% zoom/reflow, reduced motion, high contrast/non-color status, focus restoration, target size, orientation, and cancellation. Identity-unknown requests include adversarial purpose/display strings that imitate security or system messages; attacker text must remain inside the fixed application-owned frame while its persistent identity warning remains visibly associated and is repeated at final authorization.

Privacy review covers screenshots, screen recording, app switching, notification previews, clipboard history, downloads, password managers, browser sync/backup, extensions, and device sharing. Platform controls are documented as risk reduction, never guaranteed prevention.

## 8. Candidate test inventory

No row below is approved. Exact OS/browser versions and device models are recorded when testing begins.

| Family | Device class | Current state | Required evidence owner |
|---|---|---|---|
| Chromium on Windows | Desktop/laptop | NOT TESTED for real data | Physical test record and OWNER-RHP-06 approval |
| Edge/Chromium on Windows | Desktop/laptop | NOT TESTED for real data | Physical test record and OWNER-RHP-06 approval |
| Chromium on macOS | Desktop/laptop | NOT TESTED for real data | Physical test record and OWNER-RHP-06 approval |
| Safari on macOS | Desktop/laptop | NOT TESTED | Physical test record and OWNER-RHP-06 approval |
| Firefox on desktop | Desktop/laptop | NOT TESTED | Physical test record and OWNER-RHP-06 approval |
| Chrome/Chromium on Android | Phone/tablet | NOT TESTED; viewport emulation only | Physical Android test record and OWNER-RHP-06 approval |
| Safari/WebKit on iOS/iPadOS | Phone/tablet | NOT TESTED | Physical Apple mobile test record and OWNER-RHP-06 approval |
| Installed standalone PWA | All | NOT TESTED | Per-platform install/update/storage/privacy evidence |

Unsupported or untested families remain inspect-only. The UI must identify missing capabilities without recommending a weaker algorithm or silently generating synthetic state under a real-data label.

The public limitation surface must state this platform policy before authority creation is offered: public eligibility is not universal support, mobile-first design is not device approval, and only exact tested and owner-approved ranges may create a real preview authority.

## 9. Test-record schema

Each physical test record contains:

- record ID, tester, date/time, timezone, device model, OS build, browser name/full version, installed/standalone state;
- origin, release commit, artifact SHA-256, runtime/resource/trust configuration hashes;
- capability results and raw safe error codes;
- capability-evidence configuration hash/`notAfter`, expiry-gate results, and 300-second single-use local-authorization results;
- key non-extractability/durability evidence without private bytes;
- storage, lifecycle, offline, accessibility, privacy, and update results;
- the 15-minute visible/active/network-connected-client convergence target, observed timings, and any offline/suspended cases excluded from that bound;
- screenshots only when they contain no private data;
- failures, workarounds, retest commit, reviewer, and expiry/review date.

Evidence expires when the browser/OS major version, storage/key behavior, application key path, service-worker lifecycle, enabled workflow, or relevant owner policy changes.

## 10. Recommended initial owner decision

The safest approval sequence is:

1. approve no browser in advance;
2. complete the protected-key and storage implementation;
3. run the full matrix on one desktop Chromium pair and one physical Android Chromium pair;
4. approve only exact tested version ranges that pass;
5. retain inspect-only behavior everywhere else;
6. add Safari/WebKit and Firefox only after separate evidence rather than assuming Chromium equivalence.

This recommendation is not approval. Real authority creation remains disabled until OWNER-RHP-06, OWNER-RHP-07, and the applicable backup decision are authenticated.
