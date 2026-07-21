# Real Holder Preview data-flow inventory

Status: TECHNICAL WORKING DRAFT — no authorization to collect real participant data

Companion: `docs/rhp/threat-and-privacy-model.md`

Canonical origin: `https://hiri-protocol.org`

## 1. Inventory rules

This inventory describes every intended Real Holder Preview data flow, including rejected input and operational metadata. A flow not listed here is prohibited until the inventory, threat model, policy, tests, and owner evidence are updated.

The static PWA has no application backend. GitHub Pages delivers public files; holder protocol state remains in browser origin storage. TLS, DNS, GitHub, the browser, the operating system, extensions, downloads, clipboard history, device backup, and recipients remain external boundaries.

## 2. Components and storage locations

| ID | Component | Stores real holder data? | Boundary |
|---|---|---:|---|
| C01 | GitHub Pages/CDN | No application state; infrastructure logs may exist | External hosting |
| C02 | Application shell | Transient UI state only | Browser main context |
| C03 | Pure HIRI/Passport kernel | No implicit persistence or network | In-process deterministic boundary |
| C04 | Runtime configuration | Public allowlists, release IDs, hashes only | Packaged/validated public input |
| C05 | Protected-key adapter | `CryptoKey` handles and public key bytes | WebCrypto + IndexedDB |
| C06 | Portfolio storage | Encrypted portfolio, records, settings, journals | IndexedDB at approved origin |
| C07 | Resource registry | Immutable resource bytes and pins | Packaged bytes/IndexedDB cache |
| C08 | Resolver/current-head adapter | Authenticated evidence, provenance, bounded cache | Network + IndexedDB; disabled by default |
| C09 | Replay/authorization store | Request tuples, one-shot authorization, signed byte reference | IndexedDB |
| C10 | Local privacy history | Holder-visible disclosure/delivery receipt | IndexedDB |
| C11 | Service worker/cache and in-page update coordinator | Reviewed shell, immutable public resources, and non-sensitive lifecycle state only | Cache Storage and page memory |
| C12 | Clipboard/download | User-selected presentation or backup bytes | OS/external application boundary |
| C13 | HTTPS delivery endpoint | Exact signed presentation bytes only | External recipient; disabled by default |
| C14 | Public preview/notice pages | Public limitation and emergency text only | GitHub Pages; notices network-only |
| C15 | GitHub Actions | Synthetic tests, public build metadata, redacted failures | External CI |

## 3. Data classes

| Class | Examples | Sensitivity | Protocol-visible? |
|---|---|---|---|
| D01 Private key material | Ed25519/X25519 private key, content key, backup passphrase | Critical secret | Never |
| D02 Public authority data | Holder authority, verification methods, public keys | Correlatable public identifier | When required and consented |
| D03 Encrypted local state | Portfolio ciphertext, recipient metadata, authenticated manifest | Confidential/correlatable | No public publication in this preview |
| D04 Decrypted holder content | Self-assertion values, imported claims, notes | Potentially sensitive | Only exact consented presentation content |
| D05 Request input | Signed request, nonce, purpose, verifier hint, expiry | Untrusted/correlatable | Input to holder |
| D06 Presentation output | Holder authority, selected public items, proof, expiry | Public to recipient/copyable | Yes |
| D07 Resource/config data | Schemas, contexts, profiles, hashes, allowlists | Public integrity-critical | Referenced by URI/hash |
| D08 Evidence/provenance | Signatures, chain, status source/time, identity evidence, result dimensions | Integrity-critical | Reports/packages as specified |
| D09 Local operational state | Replay tuple, migration journal, lease, error code | Potentially correlatable | Never |
| D10 Local privacy history | Recipient authority, purpose, items, time, byte hash, delivery state | Sensitive/correlatable | Never by default |
| D11 Public release evidence | Commit, artifact digest, signed approvals, test results | Public | Repository/release evidence |

## 4. Flow inventory

| Flow | Source → destination | Data | Trigger | Required controls | Retention/result |
|---|---|---|---|---|---|
| F01 | C01 → C02 | Shell HTML/CSS/JS, manifest | Navigation | HTTPS, exact origin, audited artifact, no remote runtime dependencies | Browser cache per shell version |
| F02 | C02 → C04 | Public runtime configuration | Startup | Closed schema, exact origin, no secrets/placeholders/wildcards, hash/version binding | Memory; public packaged copy |
| F03 | C02 → capability adapters | Algorithm/storage/service-worker test operations | User opens setup | Execute probes; no UA inference; no key persistence | Capability result in memory/settings with capture metadata |
| F04 | C02 → C05/C06 | New holder key pairs and genesis state | Explicit setup after gates | Fresh randomness, approved non-extractable generation, atomic persistence, cancellation cleanup | Protected handles/public data until deletion/exit |
| F05 | C02/C03 ↔ C06 | Encrypted portfolio read/write | Holder workflow | AES-GCM/HKDF/Mode 2 rules, authenticated manifest, transaction, fresh IV/key material, no plaintext at rest | Latest and required chain state |
| F06 | File/paste → C02/C03 | Credential/package/request bytes | Explicit selection/paste | Size/depth limits, strict JSON, inert preview, no URL or live-endpoint ingress, validation before acceptance | Rejected input discarded; approved evidence per workflow |
| F07 | C07 → C03 | Schema/context/profile bytes and hashes | Parse/verify/sign preparation | Exact `(URI, SHA-256)`, allowed kind, immutable bytes, resource limits | Packaged or reviewed immutable cache |
| F08 | C03 → C06 | Approved persistent self-assertion | Explicit save | Pinned schema, self-asserted provenance, protected local storage, no publication | Until holder deletion/exit |
| F09 | C03 → memory only | Ephemeral self-assertion | One accepted request | Exact request/schema/path binding, one presentation only | Release after signing/cancel/failure |
| F10 | C06/C03 → C02 | Claims and evidence display | Holder inspection/consent | Inert hostile text, separate evidence dimensions, no premature aggregate trust | Render memory only |
| F11 | C08 ↔ allowlisted endpoint | Artifact/current-head request and bounded response | Explicit verification need | HTTPS, exact allowlist, no redirects, CORS, timeout, content type/size, provenance, authority classification | Authenticated bounded cache only; otherwise unknown |
| F12 | C05/C06/C07/C09 → C03 | Exact signing inputs | Final authorization | Request/nonce/verifier/items/expiry binding, current capability evidence/artifact, local auth bound to exact operation/state for at most 300 seconds, one-shot authorization, current key state | No output on cancellation/failure/stale client |
| F13 | C03 → C09 | Immutable signed presentation bytes/hash | Successful signing | JCS/domain separation, persist before release, identical retry | Through expiry/retry window and history rule |
| F14 | C09 → C12 | Signed presentation file/clipboard | Explicit holder action | Exact bytes, user warning, no hidden metadata, no guaranteed clipboard erasure claim | Outside app control after release |
| F15 | C09 → C13 | Signed presentation HTTPS POST | Explicit holder action and allowlisted destination | Exact origin/path, no redirects, timeout/size/type, no mutated retry, distinguish response states | Recipient-controlled after delivery; local receipt only |
| F16 | C09/C13 → C10 | Local receipt | Delivery attempt | Store destination authority/origin, signed purpose, disclosed items, byte hash, time, outcome; no undisclosed data | Holder-controlled; deletable; no sync |
| F17 | C06/C05 → backup export | Approved encrypted backup package | Explicit holder action | OWNER-RHP-08 approval, authenticated format, bounded derivation, scope disclosure, verification | User-controlled external file |
| F18 | Backup file → C03/C05/C06 | Restore candidate | Explicit holder action | Validate complete package before write, rollback/authority binding, local auth, atomic replace/merge | Rejected input discarded; accepted protected state |
| F19 | C06/C05 → C06/C05 | Rotation/add/remove/compromise transition | Explicit sensitive action | Upstream lifecycle/recipient rules, local auth, atomic update, consequence warning | Versioned lifecycle evidence |
| F20 | C02/C06 → deletion | Local keys/state/history/cache | Explicit deletion or exit procedure | Scope display, re-auth where approved, no silent reset, post-delete verification | Removed locally; external copies unaffected |
| F21 | C01/C14 → user | Preview limitations and emergency notices | Navigation/incident | Notices network-only, explicit timestamp/state, no implication of real-data activation | Public mutable notice |
| F22 | Repository → C15 → C01 | Source, synthetic tests, built public artifact | Push/authorized deployment | Least privilege, exact lockfile, demo flag until release gates, no secrets, artifact audit | GitHub retention; public artifact only |
| F23 | C02 → local diagnostics | Stable error code and safe summary | Failure | No reflected markup, claims, keys, nonces, full input, or correlation IDs | Memory by default; no telemetry |
| F24 | C01/C11 ↔ C02 and same-origin tabs | Public artifact/update lifecycle state only | Waiting worker, emergency replacement, `controllerchange`, reconnect | No holder data in messages; notify every connected active tab; block new sensitive operations; safe active-operation boundary; reload after control change; current artifact required after reconnect | Page memory; shell cache by reviewed version; timestamped release evidence |

## 5. Network inventory

### 5.1 Allowed in the current deployed demo

- same-origin static asset and navigation requests to `https://hiri-protocol.org`;
- GitHub Pages infrastructure requests necessary to serve that origin;
- direct user navigation to public links.

### 5.2 Real-data preview baseline

The initial production configuration has empty arrays for:

- remote resource origins;
- artifact resolver origins;
- issuer-authoritative current-head origins;
- presentation delivery origins;
- identity-anchor origins;
- BVS/provider origins.

Local paste/file acquisition and file/clipboard delivery may be built without adding a network origin. Any future origin requires a public, versioned configuration change, data-flow/threat update, exact endpoint tests, and the applicable owner approval.

Requests and presentations must never be placed in query strings, fragments sent to servers, referrers, analytics, or remote error reports.

## 6. Service-worker and offline rules

The service worker may cache only the reviewed application shell and immutable approved resources. It must not cache:

- `/notices/` or an emergency response;
- credential, request, presentation, backup, or restore bytes;
- resolver/current-head responses unless a separate authenticated application cache handles them;
- POST bodies/responses, opaque responses, authorization state, keys, decrypted content, or local history.

Offline operation must preserve `unknown` for evidence requiring fresh network retrieval. Offline availability is not status freshness, backup, or storage durability.

A waiting reviewed worker must be surfaced to connected active tabs and coordinated across same-origin tabs without including holder data in lifecycle messages. Activation must not reload over an active sensitive operation; that operation must cancel safely or reach a defined safe boundary first. Reload occurs after `controllerchange`, not immediately after requesting `skipWaiting`.

The release must prove convergence within 15 minutes after an emergency replacement becomes publicly available for visible, active, network-connected clients. No finite target applies to offline, closed, suspended, or isolated devices. A stale client that reconnects must update to the current reviewed artifact before starting another sensitive operation. The update mechanism is operational convergence, not remote erasure or machine-enforced authorization expiry.

## 7. Logs, analytics, support, and CI

The application sends no analytics or operational telemetry. Local diagnostics use a stable code and a safe summary. The following are prohibited in logs and CI artifacts:

- private/public keys when used as cross-event identifiers;
- holder authorities, portfolio/credential URIs, stable local IDs, claim values, nonces, presentation IDs, signed bytes, backup bytes, and decrypted input;
- attacker-controlled raw errors, full URLs, clipboard content, and resolver response bodies.

Support intake and crash reporting remain disabled until OWNER-RHP-09, OWNER-RHP-10, and OWNER-RHP-13 define the legal purpose, fields, access, retention, deletion, and incident boundary.

## 8. Retention and deletion decisions still required

| Data | Technical safe default | Owner gate |
|---|---|---|
| Replay tuples | Retain through expiry plus skew, then delete under versioned rule | OWNER-RHP-10 |
| Signed retry bytes | Retain only for bounded delivery/retry and local evidence needs | OWNER-RHP-10 |
| Local privacy history | Local, holder-controlled, manually deletable, no sync | OWNER-RHP-10 |
| Backups | No feature until format and recovery policy approved | OWNER-RHP-08/09/10 |
| Hosting logs | No application access; document GitHub retention/controls | OWNER-RHP-09/12 |
| Security reports | No intake until private channel and retention approved | OWNER-RHP-13 |

## 9. Exit inventory

The exit procedure deletes C05, C06, C07 real-data caches, C09, C10, and preview-specific C11 caches at the approved origin. It does not promise deletion from downloads, clipboard managers, recipients, screenshots, OS/browser backup, GitHub infrastructure logs, or old ciphertext already acquired by a removed recipient.

Any successor migration requires a new signed decision and a separately tested mapping. The current decision requires abandonment rather than automatic authority migration.

## 10. Verification checklist

Before any real-data deployment, release evidence must show:

1. every implemented external I/O maps to one flow above;
2. production bundles contain no demo fixtures, placeholder resources, secrets, or unlisted origins;
3. browser storage inspection matches the declared data classes;
4. service-worker cache names and entries match Section 6;
5. network capture shows zero unlisted requests;
6. logs and failure artifacts contain none of the prohibited fields;
7. deletion and exit tests cover every local component;
8. owner decisions close every gate associated with enabled flows.
