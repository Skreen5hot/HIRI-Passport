# Real Holder Preview threat and privacy model

Status: TECHNICAL WORKING DRAFT — owner privacy, legal, operational, and residual-risk approval remains open

Applies to: `docs/rhp/release-contract.md` and the Real Holder Preview build

Review trigger: architecture, origin, dependency, storage, key, transport, or policy change

RHP-DR-002 changes resource, trust, browser, key, local-authentication, and recovery policy. Its authentication therefore triggers a complete threat-model re-review before any real-data deployment; signing the policy is not that re-review.

## 1. Security objective

The preview must protect holder key material and local evidence against avoidable disclosure or substitution, preserve the distinction between cryptography and trust, and fail closed when required evidence or platform capability is absent. It does not promise protection from a fully compromised browser, operating system, device, dependency supply chain, or authorized user session.

## 2. Protected assets

| Asset | Required property |
|---|---|
| Ed25519 and X25519 private keys | Not serialized into application state, logs, telemetry, exports, or routine backups; non-extractable in the approved path |
| Portfolio content-encryption keys | Confidential, purpose-bound, rotated as required, absent from logs and UI |
| Decrypted portfolio/claim content | Memory-limited, not cached by the service worker, not logged or sent without consent |
| Signed requests and presentations | Exact-byte integrity, replay binding, bounded retention, no silent mutation |
| Resource and configuration pins | Immutable identity by URI plus SHA-256; rollback/substitution resistance |
| Current-head evidence | Source, retrieval time, authority classification, and anti-rollback state preserved |
| Local history and settings | Holder-controlled, excluded from protocol artifacts, scoped deletion |
| Approval and release evidence | Public integrity and provenance; no private signing material |

## 3. Trust boundaries

1. **Public web origin:** GitHub Pages serves immutable build assets and mutable emergency notices. Hosting availability does not establish protocol trust.
2. **Browser runtime:** application code, WebCrypto, IndexedDB, service worker, clipboard, downloads, and display memory share a browser/OS boundary.
3. **Pure kernel:** parsing, canonicalization, hashing, signing targets, verification, and reports receive all I/O and policy as explicit inputs.
4. **Adapters:** storage, protected keys, resources, resolvers, local authentication, transport, and policy may fail or be malicious and must preserve provenance.
5. **External input:** pasted files, packages, requests, resolver responses, URLs, schemas, and display strings are attacker-controlled until verified.
6. **Recipient/verifier:** once presentation bytes are delivered, the preview cannot retract, delete, or control recipient copies.
7. **Owner operations:** GitHub, DNS, release approvals, incident response, and notice publication are external governance boundaries.

## 4. Adversaries and failure sources

The model includes:

- malicious requests, packages, schemas, contexts, resolver content, verifier hints, filenames, and URLs;
- compromised or mistaken issuers, BVS operators, verifiers, resolvers, dependencies, service workers, and maintainers;
- cross-site scripting, dependency substitution, stale service-worker content, and same-origin application interference;
- device theft, shared sessions, screen capture, clipboard history, browser extensions, storage clearing, eviction, rollback, quota failure, and multi-tab races;
- replay, request/presentation substitution, stale key lifecycle evidence, current-head equivocation, and trust-on-first-use;
- accidental user disclosure, destructive deletion, weak backup handling, and total key loss;
- operator error in DNS, GitHub settings, workflow permissions, rollback, notice publication, or release claims.

## 5. Assumptions and non-assumptions

The build assumes the standardized cryptographic primitives, HTTPS implementation, browser random source, and pinned bytes behave as specified. It does not assume:

- TLS makes a resolver issuer-authoritative;
- a browser non-extractable key is hardware-backed or immune to same-origin code;
- a service worker, install prompt, or PWA shell makes IndexedDB durable;
- a display name or domain proves organizational identity;
- holder-supplied or cached material proves current status;
- a valid signature proves truth, legal effect, or relying-party acceptance;
- encryption alone provides authority recovery after every key is lost.

## 6. Risk register

| ID | Threat or failure | Required control and safe failure | Release evidence |
|---|---|---|---|
| RHP-T01 | Demo code or fixtures enter real mode | Separate module graph, database, bootstrap, artifact audit, and exact-origin gate; refuse startup | Production bundle/module audit |
| RHP-T02 | Script/dependency compromise extracts keys or claims | No remote runtime scripts, exact locks, CSP, dependency audit, minimal dependencies, independent review | SBOM, audit, CSP and bundle results |
| RHP-T03 | Private key bytes are exported or serialized | Generate the final private key non-extractably; prohibit PKCS#8/JWK export in real mode; test storage/log/export paths | Key-generation and bundle tests |
| RHP-T04 | Same-origin or lookalike origin accesses state | Exact custom-origin enforcement before storage/key access; refuse project Pages, ports, frames, and alternate hosts | Origin adversarial tests |
| RHP-T05 | IndexedDB rollback, corruption, eviction, or partial migration | Authenticated heads, monotonic migrations, journals, transactions, downgrade refusal, no silent reset | Storage/migration matrix |
| RHP-T06 | Malicious resource or schema changes semantics | URI+SHA-256 selection, packaged bytes, closed schemas, remote-ref prohibition, size/depth limits | Resource manifest and adversarial vectors |
| RHP-T07 | Resolver reachability is mistaken for authority/current status | Empty default allowlists; preserve source/time; require explicit issuer-authoritative configuration; otherwise `unknown` | Trust-config and status tests |
| RHP-T08 | Request replay/substitution or purpose/display text impersonates a system security message | Verify signature, method, time, nonce, resource pins, and replay before consent; render attacker text inertly inside a fixed application-owned frame; keep the identity-unknown warning associated throughout review and repeat it at final authorization | Request/consent and adversarial-copy tests |
| RHP-T09 | Consent authorizes different bytes or excess content | Bind exact request and selection; show complete-public content; one authorization creates at most one presentation | Signing-target and UI tests |
| RHP-T10 | Delivery retry creates changed or duplicate authority action | Persist signed bytes before transport; retries use identical bytes; distinguish attempted/acknowledged/verified | Delivery/receipt tests |
| RHP-T11 | Clipboard, download, screenshot, or app switching leaks content | Explicit actions, warnings, platform privacy controls where available, no guaranteed clipboard deletion claim | Physical-device review |
| RHP-T12 | Backup leaks keys or gives false recovery assurance | Owner-approved format only, authenticated encryption, bounded derivation, restore rehearsal, exact limitations | Backup decision and rehearsal |
| RHP-T13 | Device/key loss is represented as recoverable | State non-durable limitation; disable unsupported recovery; distinguish rotation, compromise, and total loss | Onboarding/destructive UX tests |
| RHP-T14 | Service worker caches mutable/sensitive traffic | Precache reviewed shell and immutable resources only; notices and protocol/network traffic stay network-only | Cache manifest audit |
| RHP-T15 | Logs, analytics, support, or CI artifacts collect identifiers/claims | No analytics by default, structured redaction, public synthetic CI only, controlled failure artifacts | Log/telemetry tests |
| RHP-T16 | Public claims overstate Working Draft or trust | Fixed approved language, claim audit, `candidateReady:false`, no aggregate badge | Page and bundle claim audit |
| RHP-T17 | Emergency notice or replacement artifact is stale or unavailable | Network-only notice page, owner procedure, post-publication verification, connected-client update gate, 15-minute connected-active target, update-before-sensitive-operation after reconnect, alternate repository evidence | Incident/tabletop and lifecycle evidence |
| RHP-T18 | Release approval is inferred from technical success | Deterministic release evidence plus separate signed go/no-go; default no-go | OWNER-RHP-16 record |

## 7. Current known implementation hazards

The following repository state is acceptable only because the deployed build is synthetic:

1. `app/src/adapters/protected-key-store.ts` currently generates extractable key pairs, exports the private key as PKCS#8, and re-imports it as non-extractable. This path is prohibited in Real Holder Preview mode. The production implementation must generate the final private key non-extractably and prove no private encoding enters application-visible memory or storage.
2. UI and state modules still import synthetic fixtures. A real build must exclude those modules rather than merely hide demo controls.
3. `.github/workflows/pages.yml` explicitly builds with `HIRI_DEMO_MODE: "true"`. That setting must remain until all real-data deployment gates close.
4. `app/src/resources/catalog.ts` has no production resources and reports `productionReady: false`. This is the correct fail-closed state until resource governance is approved.
5. **`RHP-BUILD-05` — current-artifact sensitive-operation gate:** `app/src/components/pwa/update-coordinator.tsx` now surfaces a waiting worker and reloads after `controllerchange`, but no common production gate yet checks capability-evidence expiry and current-artifact state before every authority creation, signing, rotation, destructive deletion, or later approved backup/device action. Before real-data activation, `harden-pwa-lifecycle` and `implement-local-authentication` must provide one fail-closed gate that blocks a stale client, activates a reviewed waiting worker, and permits the operation only after `controllerchange` and fresh capability evidence. Offline/reconnected clients must pass the same gate. UI wording alone is insufficient.

These findings are build tasks, not accepted residual risks.

## 8. Privacy purpose and minimization

The preview's only product purpose is to let a holder create and use a disposable local preview authority and make explicit disclosure decisions. The default design therefore requires:

- no account, participant directory, contact list, advertising, behavioral analytics, cross-device analytics, or claim telemetry;
- no server-side storage of holder authorities, credentials, requests, presentations, history, keys, or backups;
- no collection of IP addresses beyond unavoidable hosting infrastructure behavior represented as a platform limitation;
- no publication of portfolios or persistent self-assertions;
- no request, presentation, credential, or claim values in URLs;
- no support uploads until OWNER-RHP-09, OWNER-RHP-10, and OWNER-RHP-13 define purpose, access, retention, and deletion.

Local history may record the verifier authority, signed purpose, disclosed items, time, byte hash, and delivery state. It must not include undisclosed portfolio records and remains excluded from protocol messages and backups unless a later approved policy explicitly includes it.

## 9. Retention and deletion baseline

Until OWNER-RHP-09 and OWNER-RHP-10 close:

| Data | Location | Baseline |
|---|---|---|
| Keys, encrypted portfolio, settings | Browser origin storage | Holder-controlled until local deletion, storage eviction, or preview exit |
| Decrypted claims and encryption keys | Process memory | No deliberate persistence; release references promptly |
| Replay tuples/one-shot authorizations | Browser origin storage | Minimum protocol safety interval, then delete under a versioned rule |
| Local privacy history | Browser origin storage | Holder-visible and deletable; no synchronization |
| Service-worker shell | Browser cache | Versioned shell only; no claims, keys, requests, presentations, or notices |
| CI/test artifacts | GitHub | Synthetic/redacted only under repository retention settings |
| Server logs | GitHub Pages infrastructure | Not controlled by the PWA; document platform behavior before real-data release |

Preview exit requires local deletion instructions. Local deletion cannot retract recipient copies, browser/OS backups, screenshots, clipboard history, downloads, or prior ciphertext obtained by removed recipients.

## 10. Residual risks requiring owner acceptance

The owner must explicitly resolve or accept:

- supported browser/device and physical-test coverage (`OWNER-RHP-06`);
- browser key-protection and local-authentication assurance (`OWNER-RHP-07`);
- backup, loss, compromise, and recovery behavior (`OWNER-RHP-08`);
- privacy/legal/age and infrastructure-log position (`OWNER-RHP-09`);
- retention, deletion, support, and telemetry operations (`OWNER-RHP-10`);
- independent security, privacy, and accessibility findings (`OWNER-RHP-11`);
- hosting, branch protection, deployment approval, rollback, and header limitations (`OWNER-RHP-12`);
- incident and vulnerability-disclosure ownership (`OWNER-RHP-13`);
- the final exact-artifact release risk (`OWNER-RHP-16`).

No passing technical test closes one of these owner decisions.
