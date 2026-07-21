# How GPT-5.6 and Codex Accelerated HIRI Passport

## Collaboration boundary

I supplied the project vision, the existing HIRI design work, the intended holder-first experience, and the product and risk decisions. I reviewed recommendations, selected the release posture, approved governance decisions, and kept owner-only approvals separate from technical implementation.

Codex, running with GPT-5.6 Sol in the primary Build Week session, acted as the planning and implementation engine. It reviewed and harmonized the specifications, converted accepted requirements into dependency-ordered plans, implemented scoped units, wrote and ran tests, diagnosed failures, and prepared deployment and review artifacts.

The work was collaborative rather than an unreviewed one-shot generation. Important security or governance decisions were returned to me as explicit choices. Codex did not invent external reviewers, organizational trust anchors, production approvals, DNS ownership, or release authorization.

- Primary Codex session ID: `019f7ee9-bd51-7ab0-97db-60f1993f21f0`
- Recorded model: `gpt-5.6-sol`
- Provider recorded in session metadata: `openai`

## The specification-to-software workflow

The central workflow was deliberately simple from the project-owner perspective: provide a specification, make the decisions the specification cannot make, and require the system to carry validated intent into tested software.

Codex helped establish and execute this sequence:

1. Review the original project and compatibility assumptions.
2. Correct and harmonize the Core, UX, and verification-profile specifications.
3. Convert the accepted specifications into implementation units with stable IDs.
4. Give each unit explicit dependencies, owned files, covered specification sections, and a buildable scope contract.
5. Implement units in dependency order.
6. Run focused tests after each unit and full gates at integration boundaries.
7. Keep owner approvals and independent review as external evidence rather than manufacturing technical substitutes.

The resulting plans are checked into the repository as `plan.js`, `pwa-plan.js`, and `real-holder-preview-plan.js`.

## Where Codex produced the largest acceleration

### Compatibility review

Codex compared the proposed Passport specifications with the original HIRI project, checked claimed compatibility facts, and revised conflicting requirements before implementation began. It then harmonized Core behavior, UX behavior, bootstrap verification, and the Real Holder Preview decisions.

### Deterministic planning

Instead of translating the specifications into a conventional backlog by hand, Codex produced dependency-ordered plan units shaped as:

```json
{
  "id": "kebab-name",
  "kind": "code|narrative",
  "files": ["src/x.mjs"],
  "depends_on": ["other-id"],
  "covers": ["section identifiers"],
  "scope": "complete implementation contract"
}
```

This made omissions, circular dependencies, vague responsibilities, and accidental file overlap easier to detect before code was written.

### Implementation and correction

Codex implemented the mobile-first PWA, deterministic Core functions, storage and migration layers, protected-key experiments, local authentication boundaries, encrypted holder-state services, resource registries, identity and policy evaluation, credential acquisition, and extensive tests. When tests or external critiques exposed an error, Codex traced the failure back to the relevant contract and corrected the implementation and evidence together.

### Governance without pretending governance is code

A key result was knowing where automation had to stop. Codex created decision records, exact-hash approval evidence, an independent-review kit, deterministic resource manifests, positive vectors, adversarial vectors, and mechanical verification scripts. It kept the actual independent human review and owner production approval open instead of treating generated evidence as its own approval.

## Key decisions I made

- Keep the public Build Week experience a clearly labeled Synthetic Demo with no real keys or credentials.
- Make the UI mobile first and holder centered.
- Show cryptography, status, issuer identity, provenance, and relying-party policy as separate questions rather than one trust score.
- Require explicit consent with a visible decline path.
- Separate Synthetic Demo and Real Holder Preview at compile time.
- Require a dedicated production origin and refuse path-based isolation as a security boundary.
- Use fail-closed defaults for missing resources, configuration, identity anchors, current-head evidence, and external review.
- Preserve unknown or unavailable evidence as unknown instead of promoting it to success.
- Defer production activation until an independent human review and signed owner approval bind exact bytes.

## How GPT-5.6 was used

GPT-5.6 Sol supplied the reasoning capacity for long-context specification review, dependency planning, compatibility analysis, threat-boundary decisions, cross-document consistency checks, and debugging across the Core, PWA, workflows, tests, and governance artifacts.

It was especially useful when a seemingly simple instruction had hidden correctness questions:

- How do we prove every normative requirement reached an implementation unit?
- Which behavior belongs in deterministic Core code and which belongs in an injected adapter?
- What must remain unknown when network or identity evidence is missing?
- How can the Synthetic Demo mirror the product without acquiring real-data capabilities?
- Which approvals can be mechanically verified, and which must remain human decisions?
- How can an exact resource package be reviewed without later byte drift?

Codex used GPT-5.6 to turn those questions into explicit contracts, code, tests, and fail-closed gates.

## What remains human work

The Build Week submission is a working Synthetic Demo, not a production credential wallet. Independent semantic review of the candidate resource package remains pending. Physical-device evidence, production operations, final release approval, and future trust relationships also remain human or organizational responsibilities.

That boundary is part of the result: Codex accelerated the engineering without erasing the places where accountable human judgment is required.
