# HIRI Passport — About the Project

## Project title

HIRI Passport — Synthetic Demo

## Tagline

A mobile-first, holder-controlled credential experience that keeps cryptography, identity, status, provenance, and policy honest and separate.

## Category

Apps for Your Life

## Inspiration

Digital identity is often controlled by platforms, institutions, and centralized databases. People repeatedly upload the same documents, disclose more personal information than an interaction requires, and have little visibility into how that information is stored or reused.

HIRI Passport began with a simple idea: your identity should belong to you.

The intended product is a portable, holder-controlled passport in which people can receive credentials, understand their evidence, and decide what to disclose for a particular interaction. Just as importantly, it should never turn a valid cryptographic signature into a misleading claim that every other trust question has been answered.

The OpenAI Build Week submission is an honest first implementation of that experience: a working Synthetic Demo that explores the holder journey without asking judges or users to trust it with real identity data.

## What it does

The public application is a mobile-first Synthetic Demo built entirely with generated sample data. It creates no real holder keys, accepts no real credentials, contacts no production resolver, and performs no production identity verification.

In the working demo, a user can:

- explore a synthetic credential portfolio;
- inspect credential content, schemas, identifiers, and hashes;
- see cryptography, credential status, issuer identity, provenance, and relying-party policy as separate evidence dimensions;
- observe honest unknown, unavailable, and not-applicable results instead of one aggregate trust badge;
- load a synthetic disclosure request and inspect the requested field and stated purpose;
- explicitly decline or continue from a consent review;
- explore simulated presentation, delivery, verification, privacy-history, key-lifecycle, offline, and update states; and
- use the experience on mobile or desktop without creating an account or entering personal information.

The intended build extends this experience into a real holder-controlled passport. Its design supports protected holder keys, authoritative and third-party-issued credentials, cryptographic subject binding, selective disclosure, proof of possession, credential status evaluation, organizational identity evidence, verifier-controlled policy, and privacy-preserving presentations. Those capabilities are the direction of the project, not claims about the current public demo.

## How we built it

The HIRI concept and initial specification work predated Build Week. During the challenge, I used Codex with GPT-5.6 Sol to turn that design work into a compatibility-corrected, specification-driven implementation.

I supplied the project direction, selected the holder-first risk posture, made the product and governance decisions, and approved the boundaries. Codex reviewed and harmonized the Core, UX, and bootstrap-verification specifications; converted the accepted requirements into dependency-ordered implementation units; implemented the PWA and deterministic Core; wrote and ran tests; diagnosed failures; and prepared deployment, approval, and independent-review evidence.

The working application is a React and TypeScript progressive web app built with Vite and deployed as a static site through GitHub Actions and GitHub Pages. Deterministic protocol and validation behavior is kept in the Core, while storage, network, identity, policy, resolver, and acquisition behavior is supplied through explicit application boundaries.

The Synthetic Demo and Real Holder Preview use separate compile-time compositions. Synthetic fixtures and demo controls are excluded from the real-holder module graph. The preview side includes substantial foundations for IndexedDB migration, persistent state, protected-key handling, local authentication, encrypted portfolio state, resource registries, identity and policy configuration, resolver adapters, and credential acquisition, but production activation remains fail closed.

The submission gate includes 82 deterministic Core tests, 188 PWA unit and integration tests, TypeScript checking, 240 conformance-trace mappings, bundle and Pages-artifact audits, and browser acceptance for mobile, desktop, accessibility, privacy, offline behavior, consent, hostile input, origin controls, and both root and project-path deployment shapes.

## Challenges we ran into

The hardest challenge was separating cryptographic validity from real-world authority. A valid signature can show that particular bytes were signed and were not altered. It does not automatically establish that the signer is an authoritative organization, that a credential is current, that its provenance is acceptable, or that a relying party should accept it. HIRI Passport therefore presents those questions independently.

A second challenge was allowing the Synthetic Demo to mirror the intended experience without letting synthetic fixtures, reset controls, simulated keys, or ambiguous runtime flags enter the real-holder composition. This led to compile-time runtime separation, dedicated origin requirements, and fail-closed production resources.

Offline and unavailable evidence also required care. The application must preserve useful local information without silently converting a failed status check, missing identity anchor, or unreachable resolver into success.

Finally, the project had to recognize what automation cannot legitimately approve. Codex created deterministic resource candidates, exact hashes, positive and adversarial vectors, and a complete independent-review kit. It did not pretend to be the external human reviewer or manufacture production authorization.

## Accomplishments that we're proud of

I am proud that the result is a coherent mobile-first experience rather than a disconnected cryptographic proof of concept.

The Build Week implementation includes:

- persistent Synthetic Demo labeling and clear warnings against entering real data;
- a visible decline path during disclosure consent;
- separate evidence dimensions and honest unknown states;
- accessible, responsive behavior across mobile and desktop layouts;
- a deterministic Core with injected external dependencies;
- compile-time separation between demo and real-holder compositions;
- an empty production resource catalog and explicit activation blockers;
- extensive automated tests and GitHub deployment gates;
- traceability from specifications to plans, files, tests, and implementation; and
- exact-hash governance and review tooling that stops where accountable human judgment must begin.

The public demo is intentionally modest in authority but substantial in engineering. It demonstrates the intended product experience without representing synthetic behavior as a production credential system.

## What we learned

The most important lesson was that digital identity is not one question. A verifier and a holder need to distinguish at least:

1. Who controls the passport?
2. Who signed the credential?
3. Were the signed bytes altered?
4. Is the credential bound to this holder?
5. Is the credential still active?
6. What did the issuer or evidence provider actually verify?
7. Is the organization authoritative for this type of claim?
8. Does the relying party's own policy accept the available evidence?
9. What information has the holder agreed to disclose?

Keeping those questions separate makes a system easier to evaluate, audit, and improve. It also prevents a green cryptographic result from hiding unresolved identity, status, provenance, or policy questions.

We also learned that privacy is partly a data-modeling problem. Selective-disclosure technology cannot provide meaningful minimization if unrelated personal facts are combined into one inseparable field. Credential schemas must be designed around the smallest useful units of disclosure.

Finally, honest uncertainty is a feature. Unknown, unavailable, stale, and not-evaluated evidence should remain visible instead of being promoted to success for the sake of a smoother interface.

## What's next for HIRI Passport

The immediate next step is not an unsupported production launch. An external technical reviewer will evaluate the exact candidate resource package using the checked-in independent-review kit. The project will then complete physical-device testing, production-origin isolation, deployment and rollback rehearsals, operational evidence, and the remaining owner approval gates.

After those gates close, the next milestone is a limited Real Holder Preview that uses protected holder state and approved resources without inheriting data or capabilities from the Synthetic Demo. Production activation will remain blocked until the relevant exact bytes, identity anchors, policies, resolver behavior, and operating procedures have been reviewed and approved.

The longer-term intended build includes direct credential issuance by authoritative institutions, carefully represented third-party verification, interoperable issuer and verifier applications, privacy-preserving derived claims, and locally generated proofs. The goal is to let existing institutions remain authoritative for the facts they know while the passport, credentials, keys, and disclosure decisions remain under the holder's control.

## Links

- Demo: https://hiri-protocol.org/
- Code: https://github.com/Skreen5hot/HIRI-Passport
- Primary Codex session ID: `019f7ee9-bd51-7ab0-97db-60f1993f21f0`
