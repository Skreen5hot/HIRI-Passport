{
  "units": [
    {
      "id": "record-rhp-release-contract",
      "kind": "narrative",
      "files": ["docs/rhp/release-contract.md"],
      "depends_on": [],
      "covers": ["PWA Release Gate Level 2", "Core §18", "UX §17", "BVP §17"],
      "scope": "Define Real Holder Preview as a real-data, holder-first, non-conformant release distinct from the Synthetic Demo and any future Passport-Interoperable or Passport-Hardened release. Record the allowed audience, evidence-limited platform availability, local file/paste-only Disclosure Request ingress with no live verifier endpoint, supported holder workflows, excluded issuer/BVS services, unsupported selective disclosure, confirmed-current status limitations, no total-loss recovery, no proximity-security claim, required dedicated origin, emergency-update limitations, and fail-closed behavior. Make owner approval of audience and public claims an explicit release input rather than an implementation assumption."
    },
    {
      "id": "record-rhp-owner-blockers",
      "kind": "narrative",
      "files": ["real-holder-preview-owner-blockers.md"],
      "depends_on": ["record-rhp-release-contract"],
      "covers": ["PWA Release Gate Level 2", "Core §18", "Core §19", "UX §18", "BVP §17"],
      "scope": "Maintain the authoritative register of decisions, external relationships, credentials, governance evidence, independent reviews, and risk acceptances that only the project owner can supply. Require a named resource reviewer independent of the byte author plus primary and backup release/incident operators using separate accounts, signing identities, and private keys. Every item has a stable OWNER-RHP identifier, safe default, acceptable evidence, and dependent plan units. The register never contains secrets, never treats technical success as owner approval, and never permits an unresolved value to be invented or bypassed."
    },
    {
      "id": "record-rhp-threat-and-privacy-model",
      "kind": "narrative",
      "files": ["docs/rhp/threat-and-privacy-model.md", "docs/rhp/data-flow-inventory.md"],
      "depends_on": ["record-rhp-release-contract", "record-rhp-owner-blockers"],
      "covers": ["Core §17", "Core §17.1–§17.9", "UX §16", "UX §16.2", "BVP §16"],
      "scope": "Create the preview-specific threat model and complete data-flow inventory for holder keys, encrypted portfolio state, credential inspection, disclosure requests, presentations, prohibited backup/device-add attempts, authority abandonment, receipts, service-worker caches, logs, support, and deployment. Identify trust boundaries, attacker capabilities, privacy purposes, retention, deletion, and prohibited telemetry. Map every risk to an implementation control, test, operational owner, and residual-risk decision without making legal conclusions on the owner's behalf."
    },
    {
      "id": "record-rhp-resource-governance",
      "kind": "narrative",
      "files": ["docs/rhp/resource-governance.md", "docs/rhp/trust-configuration-policy.md"],
      "depends_on": ["record-rhp-release-contract", "record-rhp-owner-blockers"],
      "covers": ["Core §6.2", "Core §6.3", "Core §14", "Core §15", "BVP §3", "OPEN-CONTEXT-01", "OPEN-HEAD-01"],
      "scope": "Define who may approve contexts, schemas, evidence profiles, adapter profiles, hashes, identity anchors, issuer-authoritative current-head origins, artifact resolvers, and relying-party policy. Place every initial project resource below the explicit `https://hiri-protocol.org/resources/preview/rhp-2026-07/` namespace and require review by a named person other than the byte author. Specify immutable publication, versioning, correction, deprecation, compromise, review, and rollback procedures. Require all unapproved resources and identities to remain unavailable or unknown, and distinguish project preview vectors from official conformance vectors."
    },
    {
      "id": "record-rhp-browser-capability-matrix",
      "kind": "narrative",
      "files": ["docs/rhp/browser-capability-matrix.md"],
      "depends_on": ["record-rhp-threat-and-privacy-model", "record-rhp-owner-blockers"],
      "covers": ["UX Appendix A", "UX §11", "UX §16.3", "PWA Release Gate Level 2"],
      "scope": "Record the owner-approved operating-system, browser, version, and device matrix for Ed25519, X25519, AES-GCM, HKDF, non-extractable CryptoKeys, IndexedDB CryptoKey persistence, WebAuthn user verification, storage persistence, service workers, file handling, clipboard, and installability. Define exact inspect-only or unsupported behavior and an upfront public availability disclosure. Require dated physical-device evidence for waiting-worker prompts, multi-tab activation, safe sensitive-operation boundaries, `controllerchange` reload, measured connected-active-client convergence, and offline/reconnect behavior without claiming a finite offline bound."
    },
    {
      "id": "scaffold-rhp-toolchain",
      "kind": "code",
      "files": ["package.json", "package-lock.json", "tsconfig.json", "vitest.config.ts"],
      "depends_on": ["record-rhp-release-contract"],
      "covers": ["Core §18", "UX §17", "BVP §17", "RHP build tooling"],
      "scope": "Add deterministic scripts and exact dependency pins for real-holder-preview unit tests, production-mode builds, production artifact audits, browser acceptance, release evidence generation, and dry-run deployment verification. Preserve the existing Synthetic Demo commands. Production commands must require an explicit preview profile, default to fail closed, run without embedded secrets, and produce reproducible outputs suitable for CI."
    },
    {
      "id": "implement-runtime-mode-boundary",
      "kind": "code",
      "files": ["vite.config.mts", "app/src/vite-env.d.ts", "app/src/config/runtime-mode.ts", "app/src/demo/demo-gate.ts", "test/pwa/runtime-mode.test.ts"],
      "depends_on": ["record-rhp-release-contract", "record-rhp-owner-blockers", "scaffold-rhp-toolchain"],
      "covers": ["PWA Release Gate Level 1", "PWA Release Gate Level 2", "UX §5", "UX §18"],
      "scope": "Create an explicit compile-time and runtime boundary between synthetic-demo and real-holder-preview modes. Preview builds exclude demo fixture imports and reset controls, reject ambiguous or missing mode configuration, expose no mode toggle to untrusted runtime input, and cannot run real-data paths on the default project Pages origin. Tests inspect the production module graph and bundle inputs to prove that setting a flag is not the only separation control."
    },
    {
      "id": "implement-production-runtime-config",
      "kind": "code",
      "files": ["app/src/config/runtime-config.ts", "config/holder-preview.example.json", "test/pwa/runtime-config.test.ts"],
      "depends_on": ["record-rhp-resource-governance", "implement-runtime-mode-boundary"],
      "covers": ["Core §6.2", "Core §14", "Core §15", "UX §5.2"],
      "scope": "Define and strictly validate the public, secret-free preview configuration for canonical origin, permitted resolver and delivery origins, resource-manifest digest, identity-anchor set version, policy version, supported capabilities, capability-evidence hash and `notAfter`, and release identifier. Check evidence expiry at startup and before every authority creation or sensitive operation; missing, invalid, or expired evidence produces inspect-only behavior before key/state access. Treat the browser clock as a documented correctness limitation, not tamper-resistant revocation, and perform no unapproved network check. Reject unknown members, insecure URLs, wildcard trust, placeholder domains, absent hashes, production secrets, and configuration that enables an open capability. Ship only an inert example profile until owner-supplied public values pass validation."
    },
    {
      "id": "implement-origin-isolation",
      "kind": "code",
      "files": ["app/src/security/origin-policy.ts", "app/src/routes/origin-blocked.tsx", "test/pwa/origin-policy.test.ts"],
      "depends_on": ["record-rhp-threat-and-privacy-model", "implement-runtime-mode-boundary", "implement-production-runtime-config"],
      "covers": ["Core §17", "UX §16.2", "PWA Release Gate Level 2"],
      "scope": "Enforce the configured dedicated preview origin before database access, key creation, import, resolver use, signing, same-device rotation, authority abandonment, or local delivery. Treat origin, scheme, port, and base path exactly; reject lookalikes, redirects, embedded contexts, the shared GitHub project origin, and stale configuration. Provide an inspect-only blocked screen that performs no sensitive initialization. Tests cover custom-domain root hosting, localhost test mode, hostile origins, and origin migration refusal."
    },
    {
      "id": "implement-production-bootstrap",
      "kind": "code",
      "files": ["app/src/main.tsx", "app/src/app.tsx", "app/src/bootstrap/demo-bootstrap.tsx", "app/src/bootstrap/preview-bootstrap.tsx", "test/pwa/production-bootstrap.test.tsx"],
      "depends_on": ["implement-runtime-mode-boundary", "implement-production-runtime-config", "implement-origin-isolation"],
      "covers": ["UX §5", "UX §6", "UX §16.3", "PWA Release Gate Level 2"],
      "scope": "Compose separate demo and preview applications. The demo receives only synthetic state and ports; the preview receives validated public configuration, origin policy, storage, crypto, resolver, resource, identity, policy, clock, randomness, and transport capabilities. Initialize nothing sensitive until configuration and origin pass, surface recoverable bootstrap failures without silent reset, and prove that preview startup begins with no credentials, history, authority, or demo success state."
    },
    {
      "id": "harden-indexeddb-state",
      "kind": "code",
      "files": ["app/src/storage/schema.ts", "app/src/storage/database.ts", "app/src/storage/migrations.ts", "app/src/storage/repositories.ts", "app/src/storage/storage-coordinator.ts", "test/pwa/indexeddb-state.test.ts", "test/pwa/storage-coordinator.test.ts"],
      "depends_on": ["record-rhp-threat-and-privacy-model", "scaffold-rhp-toolchain", "implement-production-bootstrap"],
      "covers": ["Core §7", "Core §13", "Core §17", "UX §6.2", "UX §11", "UX §16.3"],
      "scope": "Implement versioned transactional storage with explicit upgrade journals, downgrade rejection, corruption and quota handling, multi-tab version-change coordination, sensitive-operation leases, and no silent reset. Separate demo and preview databases, preserve CryptoKey structured clones, and provide atomic transactions spanning state that must change together. Tests cover blocked upgrades, aborted transactions, concurrent tabs, partial migration, eviction signals, recovery choices, and fail-closed startup."
    },
    {
      "id": "implement-persistent-app-state",
      "kind": "code",
      "files": ["app/src/state/app-state.ts", "app/src/state/app-state.tsx", "app/src/state/app-state-context.tsx", "app/src/state/state-hydration.ts", "app/src/types.ts", "test/pwa/persistent-app-state.test.tsx"],
      "depends_on": ["implement-production-bootstrap", "harden-indexeddb-state"],
      "covers": ["UX §6", "UX §6.2", "UX §7", "UX §16.2"],
      "scope": "Replace preview-mode in-memory synthetic initialization with explicit loading, locked, empty, ready, migrating, blocked, and failed states hydrated from IndexedDB repositories. Persist only holder-local view state through services, never through component shortcuts, and keep demo fixtures confined to demo bootstrap. Tests prove reload persistence, empty preview startup, secret-free error state, cancellation, migration gating, and absence of cross-mode state."
    },
    {
      "id": "harden-protected-key-storage",
      "kind": "code",
      "files": ["app/src/adapters/protected-key-store.ts", "app/src/services/key-service.ts", "test/pwa/protected-key-store.test.ts", "test/pwa/key-lifecycle.test.ts"],
      "depends_on": ["record-rhp-browser-capability-matrix", "harden-indexeddb-state", "implement-persistent-app-state"],
      "covers": ["Core §5", "Core §5.1–§5.3", "Core §17.3", "UX §11"],
      "scope": "Generate and persist Ed25519 signing and X25519 agreement keys without exporting private-key bytes in the supported production path. Store public material, method identifiers, lifecycle state, capability evidence, and protected CryptoKey handles separately. Fail before authority creation when private non-extractability or durable structured-clone behavior is unavailable. Implement key lookup, authorization, compromise state, deletion safeguards, and tests proving no private bytes enter logs, JSON, export paths, or application state."
    },
    {
      "id": "implement-local-authentication",
      "kind": "code",
      "files": ["app/src/adapters/local-auth.ts", "app/src/routes/onboarding/local-auth.tsx", "app/src/components/sensitive-surface.tsx", "test/pwa/local-authentication.test.tsx"],
      "depends_on": ["record-rhp-browser-capability-matrix", "harden-protected-key-storage"],
      "covers": ["UX §6.4", "UX §9.4", "UX §11", "UX §12", "Core §17.3"],
      "scope": "Implement RHP-DR-002 D4-A: mandatory fresh WebAuthn user verification with no PIN-only, password-only, unlocked-session, or silent fallback for authority creation, presentation signing, same-device rotation, compromise action, authority abandonment, or destructive local deletion. Treat local authentication only as a gate, never as Passport evidence. Bind each challenge to one exact operation and state hash for at most 300 seconds, consume it once, and invalidate it on cancellation, completion, replay, page reload/navigation, or material state change. Handle cancellation and unsupported platforms fail closed, redact authenticator output, prevent UI navigation from bypassing the result, and provide a test adapter only in test builds."
    },
    {
      "id": "implement-holder-onboarding",
      "kind": "code",
      "files": ["app/src/routes/onboarding/welcome.tsx", "app/src/routes/onboarding/correlation.tsx", "app/src/routes/onboarding/storage-readiness.tsx", "app/src/routes/onboarding/authority-setup.tsx", "app/src/routes/unsupported-browser.tsx", "app/src/services/onboarding-service.ts", "app/src/adapters/crypto-capabilities.ts", "test/pwa/holder-onboarding-preview.test.tsx"],
      "depends_on": ["implement-origin-isolation", "implement-persistent-app-state", "harden-protected-key-storage", "implement-local-authentication"],
      "covers": ["UX §6", "UX §6.1–§6.5", "UX §16.3", "Core §5"],
      "scope": "Build real preview onboarding that explains stable-authority correlation, single-device scope, and irreversible total loss; verifies origin and required capabilities; requests storage readiness; creates the holder key set and genesis authority through protected services; and persists completion atomically. Cancellation leaves no partial authority. Unsupported browsers remain inspect-only. Completion requires explicit acknowledgement that there is no private-key backup, same-authority restore, device addition, browser-sync recovery, or account recovery."
    },
    {
      "id": "implement-encrypted-portfolio-state",
      "kind": "code",
      "files": ["app/src/services/portfolio-service.ts", "app/src/storage/portfolio-store.ts", "app/src/storage/record-store.ts", "test/pwa/encrypted-portfolio-state.test.ts"],
      "depends_on": ["harden-indexeddb-state", "harden-protected-key-storage", "implement-persistent-app-state"],
      "covers": ["Core §7", "Core §7.1–§7.5", "UX §7", "UX §11"],
      "scope": "Compose the Core Mode 2 portfolio crypto and record APIs with protected key handles and transactional storage. Persist encrypted portfolio versions, authenticated manifest/head evidence, local record metadata, and conflict state without storing decrypted portfolio plaintext at rest. Use fresh content keys, IVs, recipient IDs, and ciphertext for every rewrite; reject divergent heads; preserve unknown record kinds; and keep labels, notes, counts, and local IDs out of protocol artifacts."
    },
    {
      "id": "implement-production-resource-registry",
      "kind": "code",
      "files": ["app/src/resources/catalog.ts", "app/src/adapters/pinned-resources.ts", "app/src/adapters/schema-validator.ts", "app/src/resources/resource-manifest.ts", "test/pwa/pinned-resources.test.ts", "test/pwa/production-resource-registry.test.ts"],
      "depends_on": ["record-rhp-resource-governance", "implement-production-runtime-config"],
      "covers": ["Core §6.2", "Core §6.3", "BVP §3", "OPEN-CONTEXT-01"],
      "scope": "Load only owner-approved, immutable, hash-pinned contexts, Draft 2020-12 schemas, evidence profiles, and adapter profiles from a versioned public resource manifest. Verify bytes before parsing, reject remote references and placeholders, enforce limits, store reviewed immutable bytes for offline use, and report missing resources as unknown. Keep all real success paths disabled while the manifest is absent or `OPEN-CONTEXT-01` remains unresolved."
    },
    {
      "id": "implement-resolver-and-head-adapters",
      "kind": "code",
      "files": ["app/src/adapters/artifact-resolver.ts", "app/src/adapters/current-head-resolver.ts", "app/src/config/public-endpoints.ts", "app/src/storage/head-cache.ts", "app/src/services/resolution-service.ts", "test/pwa/resolver-provenance.test.ts", "test/pwa/current-head-resolution.test.ts"],
      "depends_on": ["record-rhp-resource-governance", "implement-production-runtime-config", "implement-production-resource-registry", "harden-indexeddb-state"],
      "covers": ["Core §14", "Core §14.1–§14.4", "Core §17.1", "OPEN-HEAD-01", "UX §10.2"],
      "scope": "Implement the RHP-DR-002 D2-A empty resolver/current-head boundary: validate that artifact-resolver and issuer-authoritative origin sets are empty, expose no production fetch path, perform no discovery, and return explicit unavailable/unknown results without touching the network or cache. Tests reject placeholders, wildcards, redirects, inferred origins, holder-supplied authority, and any configuration entry not authorized by a successor signed decision. Preserve the adapter interface only as a fail-closed boundary; do not ship dormant open-network behavior as an enabled capability."
    },
    {
      "id": "implement-identity-and-policy-configuration",
      "kind": "code",
      "files": ["app/src/config/identity-anchors.ts", "app/src/config/relying-party-policy.ts", "app/src/services/policy-service.ts", "app/src/services/identity-service.ts", "test/pwa/identity-policy-config.test.ts", "test/pwa/identity-anchor-evaluation.test.ts"],
      "depends_on": ["record-rhp-resource-governance", "implement-production-runtime-config", "implement-production-resource-registry"],
      "covers": ["Core §15", "Core §15.1–§15.3", "UX §3", "UX §10", "BVP §14"],
      "scope": "Implement the RHP-DR-002 D2-A empty identity-anchor and relying-party-policy configuration. Reject every non-empty production entry absent a successor signed decision, perform no trust-on-first-use or discovery, keep organizational identity `unknown` and policy `not-evaluated`, and preserve cryptography, credential status, BVS evidence, and provenance as independent dimensions. Tests prove display hints, TLS, holder-supplied evidence, and parse success cannot create identity or policy acceptance."
    },
    {
      "id": "implement-real-credential-acquisition",
      "kind": "code",
      "files": ["app/src/routes/acquire/acquire.tsx", "app/src/routes/acquire/acquisition-review.tsx", "app/src/services/acquisition-service.ts", "app/src/adapters/import-source.ts", "test/pwa/credential-acquisition.test.tsx", "test/pwa/credential-acquisition-integration.test.ts"],
      "depends_on": ["implement-encrypted-portfolio-state", "implement-production-resource-registry", "implement-identity-and-policy-configuration"],
      "covers": ["Core §8", "Core §8.1–§8.6", "Core §13", "UX §8"],
      "scope": "Inspect credentials and presentation packages from bounded paste or explicit file selection, preserve ingress provenance, strictly parse closed structures, verify manifests, hashes, signatures, method authorization, schemas, issuer chain, status evidence, identity, BVS evidence, and resource availability, then present every dimension separately. Under RHP-DR-001 D6-A and RHP-DR-002 D2-A, issuer/BVS artifacts are unsupported or inspection-only: do not activate or persist them as trusted preview credentials, do not infer success from parse validity, and perform no live URL fetching. Persistent real records in this release are holder self-assertions only."
    },
    {
      "id": "implement-credential-evidence-surfaces",
      "kind": "code",
      "files": ["app/src/routes/home/home.tsx", "app/src/routes/home/empty-state.tsx", "app/src/routes/home/record-card.tsx", "app/src/routes/credential/credential-route.tsx", "app/src/routes/credential/credential-detail.tsx", "app/src/routes/credential/claim-view.tsx", "app/src/routes/credential/evidence-view.tsx", "app/src/components/evidence/evidence-summary.tsx", "app/src/components/evidence/evidence-dimension.tsx", "app/src/components/evidence/status-provenance.tsx", "app/src/components/evidence/technical-details.tsx", "app/src/services/home-view-model.ts", "test/pwa/credential-evidence-preview.test.tsx"],
      "depends_on": ["implement-real-credential-acquisition"],
      "covers": ["UX §7", "UX §7.1–§7.4", "UX §8", "UX §10.1"],
      "scope": "Render the persistent holder self-assertion portfolio and its loading, empty, valid, invalid, unknown, stale, unsupported, and missing-resource states. Render imported issuer/BVS artifacts only inside the bounded transient inspection flow; do not add them to the persistent preview portfolio or present them as trusted/preview-issued. Keep claim content, cryptography, current status, issuer identity, provenance, BVS evidence, and policy separate; display source, capture time, hashes, and parameters; render hostile text inertly; and never claim portfolio completeness, overall trust, or current active status."
    },
    {
      "id": "implement-live-request-acceptance",
      "kind": "code",
      "files": ["app/src/routes/request/request-ingress.tsx", "app/src/routes/request/request-validation.tsx", "app/src/services/ingress.ts", "app/src/services/request-service.ts", "app/src/services/request-ingress-service.ts", "app/src/storage/replay-store.ts", "test/pwa/request-ingress.test.tsx", "test/pwa/live-request-acceptance.test.ts"],
      "depends_on": ["implement-local-authentication", "implement-production-resource-registry", "implement-identity-and-policy-configuration"],
      "covers": ["Core §10", "Core §11", "Core §11.1–§11.3", "UX §9", "UX §13"],
      "scope": "Accept Disclosure Request bytes only through bounded paste or explicit local file selection. Expose no live verifier request endpoint, deep-link ingress, inbox, polling receiver, background receiver, or signed payload in a URL. Strictly verify structure, domain-separated signature, verifier method authorization, clock bounds, expiry, resource pins, identity evidence, disclosure modes, purposes, and replay. Persist accepted request/nonce tuples through expiry plus skew before consent. Invalid and unknown evidence never reaches authorization, and display hints remain untrusted text even when correctly signed."
    },
    {
      "id": "implement-dynamic-consent-review",
      "kind": "code",
      "files": ["app/src/routes/request/consent-review.tsx", "app/src/routes/request/complete-public-preview.tsx", "app/src/routes/request/final-authorization.tsx", "app/src/services/consent-view-model.ts", "app/src/services/authorization-service.ts", "app/src/components/forms/confirmation-dialog.tsx", "test/pwa/consent-review.test.tsx", "test/pwa/dynamic-consent-review.test.tsx"],
      "depends_on": ["implement-credential-evidence-surfaces", "implement-live-request-acceptance"],
      "covers": ["Core §11.3", "Core §12", "UX §9", "UX §9.1–§9.4"],
      "scope": "Build consent from the verified request and actual eligible portfolio records. Show verifier hint versus verified identity, per-item and per-field purpose, required and optional choices, provenance, evidence state, complete-public disclosure consequences, correlation, expiry, and destination. Render attacker-controlled purpose/display text inertly inside a fixed application-owned frame that cannot resemble browser, OS, or Passport system chrome; keep the identity-unknown warning visibly associated throughout review and repeat it at final authorization. Decline remains first-class. Final authorization binds exactly one response to the request, nonce, verifier authority, selected items, expiry, and local-auth result and is persisted atomically without implying signature or delivery."
    },
    {
      "id": "implement-signed-presentations",
      "kind": "code",
      "files": ["app/src/adapters/browser-crypto.ts", "app/src/services/presentation-service.ts", "app/src/services/presentation-signing-service.ts", "app/src/routes/present/signing.tsx", "test/pwa/browser-crypto.test.ts", "test/pwa/presentation-signing.test.tsx", "test/pwa/signed-presentation-integration.test.ts"],
      "depends_on": ["harden-protected-key-storage", "implement-local-authentication", "implement-encrypted-portfolio-state", "implement-dynamic-consent-review"],
      "covers": ["Core §10.2", "Core §12", "Core §12.1–§12.4", "UX §9.4"],
      "scope": "Create complete Passport presentations through the Core APIs, include the authorized credential artifacts or allowed self-assertions, canonicalize with JCS, sign the exact domain-separated bytes using the currently authorized non-extractable Ed25519 method, and persist an idempotent result before release to transport. Enforce expiry, one authorization, identical retry bytes, selected-item binding, no local IDs/counts/history, local-auth cancellation, key-state changes, and no JSON.stringify-based protocol signature path."
    },
    {
      "id": "implement-presentation-delivery-and-receipts",
      "kind": "code",
      "files": ["app/src/routes/present/delivery.tsx", "app/src/routes/present/receipt.tsx", "app/src/transports/file-transport.ts", "app/src/transports/copy-transport.ts", "app/src/services/delivery-service.ts", "app/src/services/delivery-receipt-service.ts", "test/pwa/presentation-delivery.test.tsx", "test/pwa/delivery-receipts.test.ts"],
      "depends_on": ["implement-signed-presentations"],
      "covers": ["Core §13", "Core §14.3", "UX §13", "OPEN-TRANSPORT-01"],
      "scope": "Deliver immutable signed bytes only through an explicit file download or clipboard action, as approved by RHP-DR-002 D2-A. QR, HTTPS POST, deep-link, background, and other remote delivery paths remain absent and fail closed. Separate prepared, signed, attempted, and locally completed states without implying recipient acknowledgement or verification. Record a local receipt with the selected local transport, purpose, disclosed items, hash, time, and outcome while making no proximity-security or remote-deletion claim."
    },
    {
      "id": "implement-disposable-authority-lifecycle",
      "kind": "code",
      "files": ["app/src/routes/settings/keys.tsx", "app/src/routes/settings/rotation.tsx", "app/src/routes/settings/abandon-authority.tsx", "app/src/services/rotation-service.ts", "app/src/services/authority-disposal-service.ts", "test/pwa/disposable-authority-lifecycle.test.tsx"],
      "depends_on": ["record-rhp-owner-blockers", "harden-protected-key-storage", "implement-encrypted-portfolio-state", "implement-local-authentication"],
      "covers": ["Core §5", "Core §7.3", "Core §17.3", "UX §6.5", "UX §11", "UX §12", "OPEN-RECOVERY-01"],
      "scope": "Implement RHP-DR-002 D5-A as an explicit exclusion boundary: no private-key backup/export, same-authority restore, device addition/removal, recipient-based continuity, browser-sync recovery, or vendor-account recovery. Show irreversible-loss consequences before authority creation and destructive actions. Permit key inspection and same-device routine rotation or one-method compromise only when another authorized local method already exists and the Core transition can complete atomically with fresh WebAuthn UV; otherwise loss is terminal. Implement authenticated authority abandonment and complete local deletion with post-delete verification while stating that delivered bytes, OS/browser backups, and old ciphertext cannot be retracted."
    },
    {
      "id": "implement-real-self-assertions",
      "kind": "code",
      "files": ["app/src/routes/self-assertion/self-assertion-editor.tsx", "app/src/routes/self-assertion/persistence-review.tsx", "app/src/services/self-assertion-service.ts", "test/pwa/self-assertion.test.tsx", "test/pwa/self-assertion-persistence.test.ts"],
      "depends_on": ["harden-protected-key-storage", "implement-encrypted-portfolio-state", "implement-dynamic-consent-review"],
      "covers": ["Core §9", "Core §9.1", "Core §9.2", "UX §7", "UX §9"],
      "scope": "Create ephemeral assertions only inside one authorized presentation and persistent assertions as holder-signed, unpublished-by-default artifacts stored through the encrypted portfolio. Validate pinned schemas and limits, label provenance unambiguously, require separate public-consequence consent for publication, and prevent self-assertions from appearing as issuer or BVS evidence. Cancellation and failed signing leave no persistent artifact."
    },
    {
      "id": "implement-local-privacy-history",
      "kind": "code",
      "files": ["app/src/routes/history/privacy-history.tsx", "app/src/routes/history/history-detail.tsx", "app/src/services/history-service.ts", "app/src/services/retention-policy.ts", "test/pwa/privacy-history.test.tsx", "test/pwa/history-retention.test.ts"],
      "depends_on": ["implement-persistent-app-state", "implement-presentation-delivery-and-receipts"],
      "covers": ["UX §16.2", "Core §17.6", "Core §17.7"],
      "scope": "Persist holder-controlled local disclosure receipts with exact local delivery state while keeping them out of presentations, issuer traffic, resolver traffic, analytics, and every export path. Implement scoped deletion, clear-all confirmation, retention display, export exclusion, offline access, and hostile-text rendering. Do not infer verifier receipt, successful verification, or remote deletion from local history state."
    },
    {
      "id": "harden-pwa-lifecycle",
      "kind": "code",
      "files": ["app/src/app.tsx", "app/src/components/pwa/install-prompt.tsx", "app/src/components/pwa/update-prompt.tsx", "app/src/components/pwa/update-coordinator.tsx", "app/src/routes/settings/app-storage.tsx", "app/src/security/sensitive-operation-gate.ts", "app/src/pwa/register.ts", "app/src/pwa/service-worker.ts", "app/src/pwa/cache-policy.ts", "app/src/pwa/manifest.ts", "scripts/build-service-worker.mjs", "test/pwa/install-update.test.tsx", "test/pwa/update-coordinator.test.tsx", "test/pwa/sensitive-operation-gate.test.ts", "test/pwa/service-worker.test.mjs", "test/browser/service-worker-update.spec.ts"],
      "depends_on": ["implement-origin-isolation", "harden-indexeddb-state", "implement-signed-presentations", "implement-disposable-authority-lifecycle"],
      "covers": ["UX Appendix A", "UX §16.3", "Core §14.3", "PWA Release Gate Level 2"],
      "scope": "Close `RHP-BUILD-05`. Limit service-worker caching to the reviewed shell and immutable pinned resources; keep resolver, status, import, notice, and mutable protocol traffic network-only. Surface a waiting reviewed worker in connected active tabs, coordinate activation across tabs without holder data in messages, block new sensitive operations after an emergency replacement is known, and let active migration, consent, signing, local delivery, rotation, or authority abandonment cancel safely or reach a defined boundary. Provide one common fail-closed gate before authority creation, signing, same-device rotation, authority abandonment, or destructive deletion that checks capability-evidence `notAfter` and current-artifact state, activates a reviewed waiting worker, waits for `controllerchange`, and only then permits the operation. Prove convergence within 15 minutes after an emergency replacement becomes publicly available for visible, active, network-connected clients; make no finite claim for offline, closed, suspended, or isolated clients; and require the same gate after reconnect. Implement real storage-persistence status and request behavior, eviction guidance, broken-worker recovery, offline unknown states, cache cleanup, and exact custom-origin scope without caching decrypted claims, keys, POST bodies, or opaque responses."
    },
    {
      "id": "harden-production-security-boundaries",
      "kind": "code",
      "files": ["app/index.html", "app/src/security/logging.ts", "app/src/security/privacy.ts", "app/src/security/safe-text.tsx", "app/src/security/security-policy.ts", "docs/rhp/production-security-controls.md", "test/pwa/production-security-boundaries.test.ts"],
      "depends_on": ["record-rhp-threat-and-privacy-model", "implement-production-runtime-config", "implement-resolver-and-head-adapters", "implement-presentation-delivery-and-receipts"],
      "covers": ["Core §17", "UX §16", "PWA Release Gate Level 2"],
      "scope": "Implement secret-free structured logging, hostile text and URL handling, sensitive-surface privacy behavior, endpoint-specific egress policy, referrer restrictions, and a production CSP derived from the exact approved origin set rather than `connect-src https:`. Document required HTTP headers that cannot be guaranteed by markup alone. Tests prohibit dynamic code, unreviewed third parties, credential content in logs, open redirects, unsafe schemes, source maps, broad egress, and security claims unsupported by browser evidence."
    },
    {
      "id": "implement-production-artifact-audit",
      "kind": "code",
      "files": ["scripts/audit-bundle.mjs", "scripts/check-pages-artifact.mjs", "scripts/audit-production-bundle.mjs", "scripts/check-runtime-config.mjs", "test/pwa/pages-artifact.test.mjs", "test/pwa/production-bundle.test.mjs"],
      "depends_on": ["record-rhp-owner-blockers", "record-rhp-resource-governance", "implement-runtime-mode-boundary", "harden-production-security-boundaries"],
      "covers": ["Core §18", "UX §17", "PWA Release Gate Level 2"],
      "scope": "Audit the preview artifact and dependency graph for demo fixtures and reset paths, placeholder domains and hashes, private endpoints, credentials, private-key encodings, source maps, remote runtime assets, unreviewed network APIs, broad CSP, dynamic code, conformance claims, unsupported capability claims, and missing release/config/resource digests. Require a dedicated origin profile and reproducible manifest. The audit must fail while owner-gated public configuration or normative resources are absent and must not read secret stores."
    },
    {
      "id": "implement-rhp-browser-acceptance",
      "kind": "code",
      "files": ["playwright.config.ts", "test/browser/fixtures.ts", "test/browser/pages.ts", "test/browser/rhp-onboarding.spec.ts", "test/browser/rhp-acquisition.spec.ts", "test/browser/rhp-consent-presentation.spec.ts", "test/browser/rhp-disposable-authority.spec.ts", "test/browser/rhp-storage-update.spec.ts", "test/browser/rhp-accessibility-security.spec.ts"],
      "depends_on": ["record-rhp-browser-capability-matrix", "implement-holder-onboarding", "implement-real-credential-acquisition", "implement-credential-evidence-surfaces", "implement-live-request-acceptance", "implement-dynamic-consent-review", "implement-signed-presentations", "implement-presentation-delivery-and-receipts", "implement-disposable-authority-lifecycle", "implement-real-self-assertions", "implement-local-privacy-history", "harden-pwa-lifecycle", "harden-production-security-boundaries"],
      "covers": ["UX §17", "UX Appendix A", "Core §18", "PWA Release Gate Level 2"],
      "scope": "Run deterministic preview-mode acceptance for the evidence-first Windows Chromium and Android Chromium targets selected by RHP-DR-002 D3-A, using generated non-authoritative test authorities. Cover first-run and reload, capability refusal and `notAfter` expiry, real storage composition, inspection-only issuer artifacts, valid/invalid/unknown/tampered/replayed local-file requests, deceptive system-message copy inside the fixed unknown-identity frame, mandatory WebAuthn UV through a test adapter, 300-second single-use authorization, consent decline/cancel, exact signing retry, file/clipboard delivery failure, absence of backup/restore/device-add paths, total-loss acknowledgement, safe same-device rotation or terminal loss, authority abandonment, multi-tab conflict, migration, eviction, waiting-worker sensitive-operation blocking, `controllerchange`, 15-minute visible/active/network-connected convergence, offline/reconnect update-before-operation, keyboard, zoom, assistive semantics, hostile text, and zero third-party runtime requests. Physical-device evidence remains an owner gate, and Codex will request it only after the implementation passes automated readiness checks."
    },
    {
      "id": "implement-rhp-ci",
      "kind": "code",
      "files": [".github/workflows/rhp-ci.yml", ".github/dependabot.yml"],
      "depends_on": ["scaffold-rhp-toolchain", "implement-production-artifact-audit", "implement-rhp-browser-acceptance"],
      "covers": ["Core §18", "UX §17", "BVP §17", "GitHub Actions CI"],
      "scope": "Add a least-privilege preview CI workflow that runs kernel and PWA tests, typecheck, conformance-negative gates, production-mode build, lockfile audit, resource/config validation, production artifact audit, and approved browser acceptance. Pin actions to immutable SHAs, use no production secrets for pull requests, upload only redacted failure artifacts, produce artifact digests and SBOM/provenance evidence, and prevent CI success from being interpreted as owner release approval."
    },
    {
      "id": "implement-rhp-deployment",
      "kind": "code",
      "files": [".github/workflows/rhp-pages.yml", "scripts/verify-preview-origin.mjs", "scripts/verify-preview-deployment.mjs", "docs/rhp/deployment-and-rollback.md"],
      "depends_on": ["record-rhp-owner-blockers", "implement-origin-isolation", "implement-production-artifact-audit", "implement-rhp-ci"],
      "covers": ["PWA Release Gate Level 2", "GitHub Pages deployment", "Core §18", "UX §17"],
      "scope": "Create a manually authorized, protected-environment deployment for the dedicated preview origin. Build from an exact commit with validated public configuration, verify canonical origin and HTTPS, upload only the audited artifact, record digest and deployment URL, run post-deploy shell/manifest/service-worker/CSP/config checks, and provide immutable rollback instructions. Refuse the default project origin, automatic real-data deployment from ordinary main pushes, missing environment approvers, unresolved owner release gates, or any secret embedded in the static artifact."
    },
    {
      "id": "generate-rhp-release-evidence",
      "kind": "code",
      "files": ["scripts/generate-rhp-release-evidence.mjs", "docs/rhp/release-evidence-schema.json", "docs/rhp/release-evidence.json", "docs/rhp/acceptance-matrix.md", "test/conformance/rhp-release-evidence.test.mjs"],
      "depends_on": ["record-rhp-threat-and-privacy-model", "record-rhp-resource-governance", "record-rhp-browser-capability-matrix", "implement-disposable-authority-lifecycle", "implement-production-artifact-audit", "implement-rhp-browser-acceptance", "implement-rhp-deployment"],
      "covers": ["Core §18", "Core §19", "UX §17", "UX §18", "BVP §17", "PWA Release Gate Level 2"],
      "scope": "Generate deterministic release evidence binding the exact commit, artifact digest, public configuration digest, resource manifest, origin, CI runs, browser results, migration, same-device lifecycle, authority-abandonment evidence, explicit backup/restore/device-add exclusion tests, security/privacy/accessibility review references, owner blocker statuses, unsupported capabilities, and Working Draft non-conformance language. `previewReady` remains false until every technical requirement and required owner evidence is complete. The generator never changes an owner status or treats an accepted limitation as protocol conformance."
    },
    {
      "id": "record-rhp-pilot-runbook",
      "kind": "narrative",
      "files": ["docs/rhp/pilot-runbook.md", "docs/rhp/manual-expiry-and-emergency-control.md", "SECURITY.md", "PRIVACY.md", "SUPPORT.md"],
      "depends_on": ["record-rhp-owner-blockers", "generate-rhp-release-evidence"],
      "covers": ["Core §17", "Core §18", "UX §16.2", "UX §17", "BVP §16"],
      "scope": "Record owner-approved participant eligibility, onboarding, support, privacy, retention, vulnerability disclosure, incident classification, issuer/verifier escalation, authority compromise, resolver outage, deployment rollback, emergency shutdown, participant notification, data deletion, and pilot termination procedures. Distinguish the notice-publication target from connected-client convergence, name and rehearse a backup operator with separate credentials and signing identity, and record the absence of any finite offline-client guarantee. Drafts remain marked unapproved until the named organizational owners and counsel or reviewers provide the required evidence; no service level or legal promise is invented."
    },
    {
      "id": "record-rhp-exit-review",
      "kind": "narrative",
      "files": ["docs/rhp/REAL_HOLDER_PREVIEW_EXIT_REVIEW.md"],
      "depends_on": ["generate-rhp-release-evidence", "record-rhp-pilot-runbook"],
      "covers": ["PWA Release Gate Level 2", "Core §18", "Core §19", "UX §17", "UX §18", "BVP §17"],
      "scope": "Produce the final go/no-go review for one exact release commit and artifact. Summarize every test and review, owner evidence, external dependency, unresolved finding, accepted preview limitation, rollback and incident readiness, audience, expiry/review date, and prohibited claim. The document defaults to NO-GO and can record GO only from explicit authenticated owner approval; it must continue to state Working Draft status, `candidateReady: false`, and all unresolved open-profile gates."
    }
  ]
}
