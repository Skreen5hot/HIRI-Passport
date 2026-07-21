{
  "units": [
    {
      "id": "record-demo-origin-contract",
      "kind": "narrative",
      "files": ["docs/demo/origin-and-repository-contract.md"],
      "depends_on": [],
      "covers": ["RHP release contract §4", "RHP release contract §5", "OWNER-RHP-02", "OWNER-RHP-12"],
      "scope": "Define https://hiri-protocol.org/ as the exclusive root-path Real Holder Preview origin and https://demo.hiri-protocol.org/ as the proposed Synthetic Demo origin. Prohibit hosting the demo at /demo/ because a path is not an origin, prohibit any transfer or interpretation of demo storage as real holder state, and preserve https://hiri-protocol.org/preview/ for approved limitations and release information. Name Skreen5hot/HIRI-Passport as the only product-source repository and Skreen5hot/HIRI-Passport-Demo as a deployment-controller repository that contains no application source or generated site. Define the plan convention that paths beginning with demo-repo/ belong at the corresponding path in the deployment repository; all other paths belong to the canonical source repository. Record that this unit authorizes no DNS, repository, Pages, or production-mode change and that the safe default remains the current Synthetic Demo until the staged cutover gates pass."
    },
    {
      "id": "record-demo-parity-contract",
      "kind": "narrative",
      "files": ["docs/demo/parity-contract.md", "docs/demo/parity-matrix.json"],
      "depends_on": ["record-demo-origin-contract"],
      "covers": ["RHP release contract §5", "UX §5", "UX §6", "UX §7", "UX §8", "UX §9", "UX §10", "UX §11", "UX §12", "UX §13", "UX §14", "UX §15", "UX §16"],
      "scope": "Define mirroring as one shared UI and application-service implementation compiled with different injected runtime ports, not two manually synchronized applications. Inventory every route, component, user-visible state, workflow, and accessibility contract as shared, simulated, preview-only, or intentionally excluded, with a reason and test owner for every non-shared entry. Require the Synthetic Demo to mirror layout, navigation, validation, consent, uncertainty, error, responsive, and accessibility behavior while using clearly synthetic fixtures and non-authoritative adapters. Require persistent Synthetic Demo labeling and prohibit the demo from creating real holder authority, protected keys, WebAuthn enrollment, real credentials, resolver traffic, signed protocol output, approved-resource status, or production claims. Changes to a shared experience must update the parity matrix and parameterized tests in the same canonical pull request."
    },
    {
      "id": "record-two-repository-operations",
      "kind": "narrative",
      "files": ["docs/demo/two-repository-operations.md"],
      "depends_on": ["record-demo-origin-contract", "record-demo-parity-contract"],
      "covers": ["GitHub Actions cross-repository deployment", "OWNER-RHP-12"],
      "scope": "Record repository ownership and change flow. The canonical repository owns all product source, tests, dependencies, build scripts, parity rules, and the dispatch schema. The demo repository owns only its README, security notice, repository policy, exact-source validator, drift monitor, and GitHub Pages workflow; generated Pages bytes are deployed as an Actions artifact and never committed. Define the synchronization invariant as: every published demo identifies one exact canonical commit that passed canonical CI and demo release gates, and the demo repository contains no second copy of source to merge. Define forward deployment, no-op redeployment, explicitly approved rollback, incident disablement, credential rotation, workflow update, and evidence retention responsibilities. State that a passing deployment is operational evidence, not approval of Real Holder Preview resources or release readiness."
    },
    {
      "id": "record-demo-migration-owner-handoff",
      "kind": "narrative",
      "files": ["docs/demo/owner-handoff.md"],
      "depends_on": ["record-two-repository-operations"],
      "covers": ["OWNER-RHP-02", "OWNER-RHP-12", "Demo migration owner inputs"],
      "scope": "Provide an exact owner checklist for creating the public Skreen5hot/HIRI-Passport-Demo repository, enabling GitHub Actions and Pages through Actions, verifying hiri-protocol.org at the account level, configuring demo.hiri-protocol.org without wildcard DNS, enforcing HTTPS, selecting primary and backup operators, configuring protected github-pages and demo-release environments, applying branch and CODEOWNERS protection, and installing the least-privilege cross-repository credential. Prefer a GitHub App installation token scoped to dispatch the demo repository; permit a fine-grained token only as a documented temporary fallback with the minimum target-repository permission, an owner, an expiry, and a rotation procedure. Include fields for screenshots or exported settings, DNS evidence, operator identities, secret names without secret values, and completion dates. Keep cutover blocked while any required owner field is blank."
    },
    {
      "id": "scaffold-explicit-runtime-release-commands",
      "kind": "code",
      "files": ["package.json", "scripts/build-runtime-artifact.mjs", "scripts/check-runtime-command-contract.mjs", "test/tooling/runtime-release-commands.test.mjs"],
      "depends_on": ["record-demo-origin-contract", "record-demo-parity-contract"],
      "covers": ["RHP release contract §5", "Runtime build determinism", "GitHub Pages deployment"],
      "scope": "Replace ambiguous release use of npm run build with explicit build:demo, check:demo, build:rhp, and check:rhp commands while retaining any compatibility alias only for local development and marking it non-release. build:demo must compile synthetic-demo for an explicit base URL and output directory; build:rhp must compile real-holder-preview only for root-path hosting and remain fail closed when production inputs are absent. The build wrapper accepts a fixed runtime mode, base path, output directory, canonical source repository, and full 40-hex source commit; rejects missing, unknown, contradictory, or dirty release inputs; never selects a runtime mode from browser-controlled state; and invokes the existing service-worker and artifact checks for the chosen composition. Tests execute argument validation and prove that the two commands select distinct bootstraps and cannot overwrite each other's output in a combined CI run."
    },
    {
      "id": "implement-mode-neutral-app-shell",
      "kind": "code",
      "files": ["app/src/shell/app-shell.tsx", "app/src/shell/route-registry.ts", "app/src/bootstrap/demo-bootstrap.tsx", "app/src/bootstrap/preview-bootstrap.tsx", "app/src/app.tsx", "test/pwa/runtime-shell-parity.test.tsx"],
      "depends_on": ["record-demo-parity-contract", "scaffold-explicit-runtime-release-commands"],
      "covers": ["UX §5", "UX §6", "UX §14", "UX §15", "RHP release contract §5"],
      "scope": "Extract the holder-facing shell, navigation, route identifiers, responsive structure, accessibility landmarks, and shared presentation components into mode-neutral modules in the canonical repository. Both bootstraps must construct the same shell and route contracts through typed ports while retaining compile-time-separated runtime composition. Production-only services and demo fixtures must never be imported by the shared shell. Expose a frozen route registry with stable route IDs and an explicit availability classification supplied by each runtime. Tests render both compositions with inert adapters and prove equal shared route ordering, labels, landmarks, keyboard behavior, and mobile structure while permitting only differences declared by the parity contract."
    },
    {
      "id": "implement-synthetic-simulation-ports",
      "kind": "code",
      "files": ["app/src/demo/simulation-ports.ts", "app/src/demo/demo-fixtures.ts", "app/src/demo/demo-gate.ts", "test/pwa/demo-simulation-ports.test.ts"],
      "depends_on": ["implement-mode-neutral-app-shell"],
      "covers": ["RHP release contract §5", "Demo parity", "Synthetic-data safety"],
      "scope": "Implement typed Synthetic Demo ports for authority, credential acquisition, evidence evaluation, request inspection, consent, presentation preparation, delivery simulation, history, update state, and reset behavior so shared UI paths can run without production adapters. Every returned object must be generated or fixed non-authoritative data carrying an explicit synthetic provenance marker. Prohibit WebAuthn, protected-key storage, production IndexedDB names, approved resource catalogs, real network transports, browser signing, and production resolver or identity endpoints. The demo gate must fail before rendering if the compiled runtime mode is not synthetic-demo or if a production-only port is present. Tests prove deterministic scenarios, no outbound requests, no production storage access, no protocol-valid private material, and safe reset of demo-only state."
    },
    {
      "id": "implement-demo-parity-gate",
      "kind": "code",
      "files": ["scripts/check-demo-parity.mjs", "test/pwa/demo-parity-matrix.test.ts", "test/browser/demo-parity.spec.ts", "docs/demo/parity-matrix.json"],
      "depends_on": ["implement-mode-neutral-app-shell", "implement-synthetic-simulation-ports"],
      "covers": ["Demo parity", "UX §5", "UX §16", "PWA Release Gate Level 1"],
      "scope": "Validate the parity matrix as a closed schema keyed by the frozen route and capability IDs. Fail when a shared route or user-visible state has no classification, when a non-shared entry lacks rationale and an owning test, when demo and preview use different shared component IDs, or when a canonical change adds an unclassified experience. Run parameterized browser scenarios against both compositions for navigation, validation, consent review, uncertainty and error rendering, keyboard operation, responsive layout, and accessibility semantics. Compare behavioral contracts and stable test IDs rather than fragile screenshots or production data. Emit a deterministic JSON parity report containing the canonical commit and every permitted difference; zero undocumented differences is the exit condition."
    },
    {
      "id": "implement-demo-labeling-and-provenance",
      "kind": "code",
      "files": ["app/src/demo/demo-banner.tsx", "app/src/demo/build-provenance.ts", "scripts/write-demo-build-manifest.mjs", "test/pwa/demo-labeling.test.tsx", "test/tooling/demo-build-manifest.test.mjs"],
      "depends_on": ["implement-synthetic-simulation-ports", "scaffold-explicit-runtime-release-commands"],
      "covers": ["RHP release contract §5", "Demo provenance", "Synthetic-data safety"],
      "scope": "Add an always-visible Synthetic Demo banner and an accessible explanation that data and outcomes are simulated, including on narrow mobile screens, dialogs, exported demo files, and offline pages. Generate demo-build.json after compilation with schema version, canonical repository, exact source commit, lockfile SHA-256, runtime mode, base path, route/parity report digest, and an ordered digest inventory of every deployed file except the manifest itself. Use no wall-clock value unless derived deterministically from the canonical commit. Expose the source commit in an About surface without implying production approval. Tests reject absent or dismissible labeling, production wording, non-canonical repository identifiers, short or malformed commits, recursive manifest hashing, unlisted output files, and provenance that does not match the artifact bytes."
    },
    {
      "id": "harden-demo-artifact-boundary",
      "kind": "code",
      "files": ["scripts/audit-demo-bundle.mjs", "scripts/check-pages-artifact.mjs", "vite.config.mts", "test/tooling/demo-bundle-audit.test.mjs"],
      "depends_on": ["implement-demo-parity-gate", "implement-demo-labeling-and-provenance"],
      "covers": ["RHP release contract §5", "Core §17", "PWA Release Gate Level 1", "PWA Release Gate Level 2"],
      "scope": "Create a fail-closed demo artifact audit using Vite module-graph evidence and final bytes. Require the synthetic bootstrap, persistent demo labeling, root base path for demo.hiri-protocol.org, a demo-only storage namespace, a scoped service worker, and a valid demo-build.json. Reject the preview bootstrap, production runtime configuration, approved production resource activation, protected-key and local-auth adapters, production database names, real resolver or delivery origins, source maps, secrets, private-key encodings, unlabeled exports, remote runtime assets, unreviewed third-party requests, or a bundle capable of switching mode at runtime. Tests include tampered module graphs and artifacts for every rejection class and prove that cosmetic use of the words Synthetic Demo cannot bypass structural checks."
    },
    {
      "id": "implement-legacy-root-demo-quarantine",
      "kind": "code",
      "files": ["app/src/security/legacy-demo-quarantine.ts", "app/src/routes/legacy-demo-detected.tsx", "app/src/storage/schema.ts", "app/src/pwa/register.ts", "test/pwa/legacy-demo-quarantine.test.ts", "test/browser/legacy-root-demo-cutover.spec.ts"],
      "depends_on": ["record-demo-origin-contract", "scaffold-explicit-runtime-release-commands"],
      "covers": ["RHP release contract §4", "Core §17", "OWNER-RHP-02", "Origin migration refusal"],
      "scope": "Protect the future Real Holder Preview root from Synthetic Demo data and service workers previously served at https://hiri-protocol.org/. Assign disjoint database, cache, service-worker, and broadcast-channel namespaces; detect legacy demo registrations and storage markers before any production database, key, import, resolver, or signing operation; and never parse, copy, upgrade, or trust demo state as holder state. When legacy control could affect the page, remain inspect-only and present an explicit demo-data cleanup and reload procedure with clear consequences. Cleanup may target only enumerated legacy demo stores, caches, and registrations after confirmation and must verify removal without deleting preview namespaces. Tests seed legacy demo state and workers, prove all sensitive factories remain untouched, exercise confirmed cleanup, and prove fresh preview state starts empty."
    },
    {
      "id": "split-canonical-runtime-ci",
      "kind": "code",
      "files": [".github/workflows/ci.yml", ".github/workflows/demo-source-ready.yml", "scripts/check-demo-source-ready.mjs", "test/tooling/canonical-runtime-ci.test.mjs"],
      "depends_on": ["harden-demo-artifact-boundary", "implement-legacy-root-demo-quarantine"],
      "covers": ["GitHub Actions CI", "RHP release contract §5", "Demo synchronization"],
      "scope": "Refactor canonical CI into shared tests plus separately named Synthetic Demo and Real Holder Preview build/audit jobs. The demo-source-ready result must bind the full main-branch commit, lockfile digest, parity report, demo artifact digest, and workflow run ID; it succeeds only after tests, typecheck, conformance, demo parity, demo browser acceptance, and demo artifact audit pass. Pull requests may build both modes but may not dispatch or deploy. Pin every action to an immutable commit, grant read-only permissions by default, upload only non-sensitive evidence, and prevent the existing Pages workflow from treating generic npm run check success as authority to deploy a runtime. Tests parse the workflows and fail on implicit build commands, mode ambiguity, mutable action tags, dispatch from pull requests, or write permissions in untrusted jobs."
    },
    {
      "id": "scaffold-demo-deployment-repository",
      "kind": "code",
      "files": ["demo-repo/README.md", "demo-repo/SECURITY.md", "demo-repo/CODEOWNERS", "demo-repo/.github/dependabot.yml", "demo-repo/deploy-policy.json", "demo-repo/scripts/validate-repository-shape.mjs", "demo-repo/test/repository-shape.test.mjs"],
      "depends_on": ["record-two-repository-operations", "record-demo-migration-owner-handoff"],
      "covers": ["GitHub Pages deployment", "Demo deployment repository", "OWNER-RHP-12"],
      "scope": "Create the minimal Skreen5hot/HIRI-Passport-Demo repository scaffold. deploy-policy.json fixes the canonical repository, permitted source branch, required canonical check name, demo hostname, runtime mode, base path, dispatch schema version, and allowed repository paths. The shape validator must fail if application source, package dependencies, generated Pages bytes, fixture copies, production configuration, or unexpected executable files are committed. README and SECURITY must state that the repository is a deployment controller, identify the canonical source and currently deployed commit evidence, and direct vulnerabilities to the canonical policy. Configure dependency updates only for the small workflow/controller surface and require CODEOWNERS review for workflows and policy."
    },
    {
      "id": "implement-exact-canonical-source-checkout",
      "kind": "code",
      "files": ["demo-repo/scripts/validate-source-candidate.mjs", "demo-repo/test/source-candidate.test.mjs", "demo-repo/.github/workflows/validate.yml"],
      "depends_on": ["split-canonical-runtime-ci", "scaffold-demo-deployment-repository"],
      "covers": ["Demo synchronization", "GitHub Actions cross-repository deployment", "Supply-chain integrity"],
      "scope": "Validate every requested demo source before executing canonical code. Accept a closed dispatch payload containing schema version, hard-coded canonical repository identity, full 40-hex source commit, canonical CI run ID, lockfile SHA-256, and expected demo-source-ready evidence digest. Fetch the public canonical repository by exact commit with credentials disabled, prove the commit is reachable from canonical main, query GitHub for the named successful canonical check on that exact commit, compare all supplied digests to canonical evidence, and reject forks, pull-request heads, abbreviated SHAs, branch names in place of SHAs, missing checks, stale or contradictory payloads, and unexpected repository redirects. The validation workflow runs with contents read and no Pages permission; tests use recorded API fixtures for success, spoofing, rollback, force-push, check-race, and digest-tampering cases."
    },
    {
      "id": "implement-demo-pages-release",
      "kind": "code",
      "files": ["demo-repo/.github/workflows/pages.yml", "demo-repo/scripts/verify-demo-deployment.mjs", "demo-repo/test/pages-workflow.test.mjs"],
      "depends_on": ["implement-exact-canonical-source-checkout", "harden-demo-artifact-boundary"],
      "covers": ["GitHub Pages deployment", "Demo synchronization", "OWNER-RHP-12"],
      "scope": "Build and deploy the Synthetic Demo entirely from the validated canonical commit. The workflow checks out the demo controller and canonical source into separate directories, runs npm ci from the canonical lockfile, runs the canonical check:demo release command with mode synthetic-demo, base path /, canonical repository, and exact source commit, re-runs parity and artifact audits, uploads only the audited dist artifact, and deploys it through the protected github-pages environment to https://demo.hiri-protocol.org/. Pin Actions by commit, use read-only permissions during validation/build, grant pages:write and id-token:write only to the deploy job, serialize deployments, and perform cache-busted post-deploy checks for HTTPS, hostname, demo labeling, service-worker scope, no production markers, and exact demo-build.json provenance. Do not commit generated output or accept source supplied by the demo repository."
    },
    {
      "id": "implement-cross-repository-demo-dispatch",
      "kind": "code",
      "files": [".github/workflows/demo-dispatch.yml", "scripts/create-demo-dispatch-payload.mjs", "test/tooling/demo-dispatch.test.mjs", "demo-repo/.github/workflows/pages.yml"],
      "depends_on": ["split-canonical-runtime-ci", "implement-exact-canonical-source-checkout", "record-demo-migration-owner-handoff"],
      "covers": ["Demo synchronization", "GitHub Actions repository_dispatch", "OWNER-RHP-12"],
      "scope": "After the canonical demo-source-ready workflow completes successfully for main, generate the closed versioned payload from that exact workflow run and send one repository_dispatch event to Skreen5hot/HIRI-Passport-Demo. Use an owner-installed GitHub App token scoped only to the target repository and created just in time; support a separately named expiring fine-grained secret only as the documented fallback. Never dispatch from pull requests, failed or cancelled runs, arbitrary branches, user-provided repository names, or unvalidated manual SHAs. The target workflow must treat the event as an untrusted hint and independently perform exact-source validation before running source code. Include a manual dispatch path for recovery that requires the protected demo-release environment and the same validation. Tests validate event filtering, payload canonicalization, permission declarations, secret non-logging, replay idempotence, and refusal when credentials or evidence are absent."
    },
    {
      "id": "implement-demo-drift-and-rollback-controls",
      "kind": "code",
      "files": ["demo-repo/.github/workflows/drift.yml", "demo-repo/scripts/check-demo-drift.mjs", "demo-repo/scripts/authorize-demo-rollback.mjs", "demo-repo/test/drift-and-rollback.test.mjs"],
      "depends_on": ["implement-demo-pages-release", "implement-cross-repository-demo-dispatch"],
      "covers": ["Demo synchronization", "Demo rollback", "OWNER-RHP-12"],
      "scope": "Implement scheduled and manual drift checks that compare the cache-busted public demo-build.json to the latest canonical main commit with a successful demo-source-ready result. Report synchronized, deployment-pending, source-failed, drifted, or unavailable without treating an ungreen canonical head as deployable. A normal deployment may advance only to the same commit or a descendant of the served canonical commit; reject out-of-order older runs. A rollback accepts only an exact previously successful canonical commit, requires protected-environment approval and an incident reason, rebuilds from source instead of reusing mutable bytes, records previous and replacement digests, and never changes canonical source. Drift creates a failed workflow summary and retained redacted evidence; it must not silently copy files, force-push, open broad-permission pull requests, or deploy a guessed commit."
    },
    {
      "id": "implement-separated-origin-acceptance",
      "kind": "code",
      "files": ["test/browser/origin-separation.spec.ts", "test/browser/demo-domain.spec.ts", "scripts/verify-origin-separation.mjs", "docs/demo/origin-acceptance-schema.json"],
      "depends_on": ["implement-legacy-root-demo-quarantine", "implement-demo-drift-and-rollback-controls"],
      "covers": ["RHP release contract §4", "RHP release contract §5", "OWNER-RHP-02", "Demo origin migration"],
      "scope": "Verify the two-origin deployment using generated non-authoritative test state. Require HTTPS and exact hostnames; require hiri-protocol.org to reject Synthetic Demo composition and demo.hiri-protocol.org to reject Real Holder Preview composition; prove demo service workers, caches, IndexedDB, local storage, broadcast channels, and navigation stay scoped to the demo origin; prove demo state is absent from a fresh root-origin context; and prove the preview origin refuses sensitive initialization when legacy root-demo control is detected. Verify /demo/ is not used as an isolation boundary and may only be absent or issue a simple navigation redirect that reads no holder storage. Capture a deterministic redacted report with origin, commit, artifact digest, test result, and no holder data."
    },
    {
      "id": "implement-rhp-root-cutover-gate",
      "kind": "code",
      "files": [".github/workflows/pages.yml", ".github/workflows/rhp-pages.yml", "scripts/check-rhp-cutover-ready.mjs", "test/tooling/rhp-cutover-gate.test.mjs"],
      "depends_on": ["split-canonical-runtime-ci", "implement-legacy-root-demo-quarantine", "implement-separated-origin-acceptance"],
      "covers": ["RHP release contract §4", "RHP release contract §5", "PWA Release Gate Level 2", "OWNER-RHP-03", "OWNER-RHP-12"],
      "scope": "Remove automatic Synthetic Demo publication from the canonical Pages workflow only after the separate demo origin is healthy. Configure the canonical repository to deploy only an audited real-holder-preview root artifact through a protected environment and an exact release commit. The cutover checker must refuse deployment while normative resources lack independent review and signed owner approval, public runtime configuration is inert, required browser/device evidence is absent, production artifact and origin audits have not passed, operators or rollback evidence are missing, or the served demo does not identify the expected canonical source. Ordinary main pushes may run CI but cannot publish real-data mode. Preserve the existing safe site until an approved cutover; never replace it with a partially enabled preview, never package demo fixtures at the production origin, and never infer owner GO from CI success."
    },
    {
      "id": "record-domain-cutover-and-rollback-runbook",
      "kind": "narrative",
      "files": ["docs/demo/domain-cutover-and-rollback.md"],
      "depends_on": ["implement-demo-drift-and-rollback-controls", "implement-separated-origin-acceptance", "implement-rhp-root-cutover-gate"],
      "covers": ["OWNER-RHP-02", "OWNER-RHP-12", "Demo origin migration", "Incident rollback"],
      "scope": "Provide exact, ordered operator instructions for preflight, account-level domain verification, demo-repository Pages configuration, demo subdomain DNS, HTTPS verification, first exact-source deployment, cross-origin acceptance, root deployment approval, service-worker transition monitoring, rollback, emergency demo disablement, credential rotation, and post-cutover observation. Define hold points before DNS and before root replacement, expected commands and screenshots, success and abort conditions, DNS propagation caveats, and which operator performs and independently verifies each step. Rollback must restore a previously audited artifact at the same origin without migrating data or moving the demo back onto the production origin. No instruction may include a secret value or weaken a browser warning."
    },
    {
      "id": "generate-demo-origin-migration-evidence",
      "kind": "code",
      "files": ["scripts/generate-demo-migration-evidence.mjs", "docs/demo/migration-evidence-schema.json", "docs/demo/migration-evidence.json", "test/conformance/demo-migration-evidence.test.mjs"],
      "depends_on": ["record-domain-cutover-and-rollback-runbook"],
      "covers": ["Demo origin migration", "Demo synchronization", "OWNER-RHP-02", "OWNER-RHP-12", "PWA Release Gate Level 2"],
      "scope": "Generate a deterministic evidence record binding the canonical source commit, demo controller commit, both artifact digests, parity report digest, demo-build.json, canonical CI and demo deployment runs, exact origins, DNS and HTTPS observations, service-worker scopes, storage-isolation results, drift status, legacy-demo quarantine result, protected-environment approvals, rollback rehearsal, operator evidence references, and every remaining owner gate. Validate evidence against a closed schema and exact hashes. Set demoOriginReady and rootCutoverReady independently; rootCutoverReady must remain false until every Real Holder Preview release gate is independently satisfied. The generator reads only public or explicitly supplied evidence, includes no secrets or holder data, and cannot change an approval state."
    },
    {
      "id": "record-demo-origin-migration-exit-review",
      "kind": "narrative",
      "files": ["docs/demo/DEMO_ORIGIN_MIGRATION_EXIT_REVIEW.md"],
      "depends_on": ["generate-demo-origin-migration-evidence"],
      "covers": ["Demo origin migration", "Demo synchronization", "OWNER-RHP-02", "OWNER-RHP-12"],
      "scope": "Produce a go/no-go review for the two-repository and two-origin migration. Name exact commits, artifacts, workflows, domains, operators, parity exceptions, drift state, isolation evidence, unresolved findings, rollback result, and owner evidence. Permit GO for the demo-origin move only when demo.hiri-protocol.org is healthy, labeled, source-bound, synchronized, isolated, and recoverable. Evaluate the Real Holder Preview root cutover separately and default it to NO-GO while any production resource, configuration, physical-device, operations, or final owner approval gate remains open. Record that the demo continues to mirror canonical source through exact-commit builds and that the deployment repository is not an independent product fork."
    }
  ]
}
