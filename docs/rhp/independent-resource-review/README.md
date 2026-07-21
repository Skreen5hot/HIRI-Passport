# Independent review kit: RHP project resources

Status: source kit complete; no candidate manifest or production approval exists until the author and reviewer execute the stages below.

Purpose: close the independent semantic-review portion of `OWNER-RHP-03` without asking the reviewer to infer scope, commands, evidence, or approval meaning.

## What this kit contains

- 11 exact project preview resource sources under `resources/preview/rhp-2026-07/`;
- 8 positive and 15 adversarial project vectors;
- requirement-to-resource-to-test mappings in `REQUIREMENT-TRACEABILITY.md`;
- a commit-addressed candidate generator;
- an independently implemented candidate verifier;
- reviewer qualification and semantic decision rules;
- machine-checked findings, semantic-assessment, verification-report, and review-record formats;
- an owner handoff that preserves the distinction between independent review and owner production approval.

## Roles

| Role | Required person | May perform |
|---|---|---|
| Responsible byte author | Named in `candidate-metadata.json` | Preflight, commit sources, generate and commit candidate, answer questions; cannot independently review the same candidate. |
| Independent reviewer | A named qualified person different from the responsible byte author | Verify exact candidate, inspect semantic mappings, record findings, approve/reject the candidate; cannot grant production approval. |
| Project owner | Aaron Damiano or a formally delegated successor | Authenticate reviewer evidence, resolve findings, sign exact manifest-hash approval, and later authorize catalog integration/deployment. |

One person may be both responsible author and project owner, but that person cannot be the independent reviewer for those bytes.

## Stage gates

1. **Source preflight:** `npm run rhp:resources:preflight` passes.
2. **Source commit:** every resource, vector, mapping, generator, verifier, and instruction is committed.
3. **Candidate preparation:** the generator reads only that exact source commit and creates canonical manifest/metadata bytes.
4. **Candidate commit:** generated files are committed without changing source files.
5. **Independent mechanical verification:** reviewer checks out the exact candidate commit and supplies the separately communicated manifest hash.
6. **Independent semantic review:** reviewer completes all six assessments and records every finding.
7. **Review evidence:** reviewer returns the JCS review record plus the JCS mechanical report through the agreed authenticated channel.
8. **Owner verification and signature:** owner verifies the evidence, signs an approval binding the exact manifest hash, and records expiry/review date.
9. **Integration:** only a later implementation change may populate `app/src/resources/catalog.ts`. The candidate and reviewer record alone do not activate production paths.

Any byte change after stage 2 restarts stages 2 through 8. Any change after stage 4 creates a new candidate commit and manifest hash.

## Start points

- Responsible author: `AUTHOR-CANDIDATE-PREPARATION.md`
- Independent reviewer: `REVIEWER-RUNBOOK.md`
- Project owner after review: `OWNER-HANDOFF.md`
