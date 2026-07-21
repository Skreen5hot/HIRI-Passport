# Independent reviewer runbook

This review is byte-specific. Do not review a website, branch name, pull-request head, ZIP file, or screenshot in place of the exact Git commit and manifest hash.

Estimated active time: 60-90 minutes for a reviewer already familiar with JSON Schema, JCS/SHA-256, and signed protocol messages. Stop rather than guess when an input, tool, or cited requirement is missing.

## 1. Inputs you must receive before starting

Obtain all six items from the project owner or responsible author:

1. repository URL: `https://github.com/Skreen5hot/HIRI-Passport`;
2. full candidate commit (40 or 64 lowercase hexadecimal characters);
3. manifest hash (`sha256:` plus 64 lowercase hexadecimal characters);
4. responsible author name and durable contact;
5. completed review request identifying the return channel;
6. confirmation that you are reviewing project preview resources, not normative HIRI resources.

If any item is absent, stop and request it. Never derive the manifest hash from a mutable branch and treat that as the separately communicated expected value.

## 2. Qualification and independence gate

You qualify only if every statement is true:

- You did not author, direct, or approve the candidate resource bytes, schemas, vectors, generator, or verifier.
- You are not the responsible author named in candidate metadata.
- You have no reporting-line or financial conflict that would impair an adverse finding. Disclose any other relationship in `independenceBasis`.
- You can review JSON Schema Draft 2020-12 closed shapes and reference behavior.
- You can explain RFC 8785 JCS and SHA-256 byte binding.
- You can read the cited Passport v2.0.0 Working Draft and distinguish cryptographic validity, status, identity, BVS evidence, provenance, and policy.

If any statement is false, do not continue as the independent reviewer. Tell the owner which qualification was not met. You may still give informal feedback, but it cannot close the gate.

## 3. Tool prerequisites

Use a fresh clone or a checkout with no tracked changes. Required tools:

- Git;
- Node.js 22 or newer;
- npm supplied with that Node installation.

Verify them:

```powershell
git --version
node --version
npm --version
```

On macOS/Linux, the same three commands apply. If `node --version` is below `v22.0.0`, stop and install a supported Node release before continuing.

## 4. Clone and pin the exact candidate

Replace the two quoted instruction values with the commit and hash you received.

```powershell
git clone https://github.com/Skreen5hot/HIRI-Passport
Set-Location HIRI-Passport
$CandidateCommit = "FULL CANDIDATE COMMIT"
$ManifestHash = "sha256:FULL MANIFEST DIGEST"
git fetch origin --tags
git checkout --detach $CandidateCommit
if ((git rev-parse HEAD) -ne $CandidateCommit) { throw "Candidate checkout mismatch" }
if (git status --porcelain --untracked-files=no) { throw "Tracked checkout is not clean" }
npm ci
```

The scripts reject abbreviated commits, a different `HEAD`, tracked edits, the wrong manifest hash, or a source commit that is not an ancestor.

macOS/Linux equivalent variable syntax:

```bash
CandidateCommit="FULL CANDIDATE COMMIT"
ManifestHash="sha256:FULL MANIFEST DIGEST"
git checkout --detach "$CandidateCommit"
test "$(git rev-parse HEAD)" = "$CandidateCommit"
test -z "$(git status --porcelain --untracked-files=no)"
npm ci
```

## 5. Run independent mechanical verification

PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path review-output | Out-Null
npm run rhp:resources:review -- --candidate-commit $CandidateCommit --manifest-hash $ManifestHash 2>&1 | Tee-Object -FilePath review-output/mechanical-verification.log
if ($LASTEXITCODE -ne 0) { throw "Mechanical verification failed" }
```

macOS/Linux:

```bash
mkdir -p review-output
set -o pipefail
npm run rhp:resources:review -- --candidate-commit "$CandidateCommit" --manifest-hash "$ManifestHash" 2>&1 | tee review-output/mechanical-verification.log
```

Success prints all of the following:

- `Independent mechanical verification passed`;
- the exact candidate commit;
- the exact manifest SHA-256;
- `review-output/rhp-resource-verification-report.json`;
- a report SHA-256.

Any thrown error, nonzero exit, missing line, commit mismatch, or hash mismatch is a blocking finding. Do not edit code to make the review pass. Save the full command output and report the failure.

## 6. Perform the human semantic review

Read, in this order:

1. `RHP-DR-001-Real-Holder-Preview-Decision-Record-FINAL.md`, especially D1-A through D6-A;
2. `RHP-DR-002-Technical-Policy-Decision-Record-FINAL.md`, especially D1-A and D2-A;
3. `docs/rhp/release-contract.md`;
4. `docs/rhp/resource-governance.md`, sections 4-7 and 11;
5. `docs/rhp/trust-configuration-policy.md`;
6. `docs/specifications/current/HIRI-Digital-Passport-Extension-v2_0_0-DRAFT.md`, cited sections in the traceability file;
7. `REQUIREMENT-TRACEABILITY.md`;
8. every entry named by `resources/preview/rhp-2026-07/resource-set.json`;
9. `resources/preview/rhp-2026-07/vectors/project-vectors-v1.json`;
10. delegated validators listed in `REQUIREMENT-TRACEABILITY.md`.

For each resource, answer the exact semantic question in the traceability table. Then complete all six cross-cutting assessments in the semantic template. Automation proves byte and parser properties; it cannot decide whether the project-specific claim shape, portfolio record, context vocabulary, validator delegation, release scope, or trust/configuration semantics correctly represent the signed decisions and Working Draft.

## 7. Record findings and semantic conclusions

```powershell
Copy-Item -LiteralPath docs/rhp/independent-resource-review/templates/findings.template.json -Destination review-output/findings.json
Copy-Item -LiteralPath docs/rhp/independent-resource-review/templates/semantic-assessment.template.json -Destination review-output/semantic-assessment.json
```

macOS/Linux:

```bash
cp docs/rhp/independent-resource-review/templates/findings.template.json review-output/findings.json
cp docs/rhp/independent-resource-review/templates/semantic-assessment.template.json review-output/semantic-assessment.json
```

Edit those two copied files, not the committed templates.

For an `acceptable` semantic conclusion, delete the `findingId` member or set it to an empty string. For `blocking-finding`, replace it with the matching open blocking finding ID.

Finding severity:

- `blocking`: semantic mismatch, security/privacy failure, incorrect scope activation, hash/URI/byte inconsistency, missing requirement coverage, or a verifier failure. Approval is prohibited while open.
- `non-blocking`: clarity or maintainability improvement that does not change the safety, meaning, accepted bytes, or release scope.

Finding status:

- `open`: candidate has not resolved it;
- `resolved`: you verified the resolution in this exact candidate. A fix made after this candidate cannot be marked resolved here; it requires a new candidate and review.

Decision:

- `approve`: every mechanical check passed, all six semantic conclusions are `acceptable`, and no open blocking finding exists;
- `changes-required`: at least one correctable blocking finding exists;
- `reject`: the candidate is fundamentally unsuitable or the review cannot be completed reliably.

## 8. Create the review record

The command requires five explicit qualification confirmations. Supply truthful, specific prose for independence and qualifications.

```powershell
$ReviewedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
npm run rhp:resources:review-record -- `
  --candidate-commit $CandidateCommit `
  --manifest-hash $ManifestHash `
  --verification-report review-output/rhp-resource-verification-report.json `
  --findings review-output/findings.json `
  --semantic-assessment review-output/semantic-assessment.json `
  --reviewer-name "YOUR FULL NAME" `
  --reviewer-affiliation "YOUR AFFILIATION OR INDEPENDENT" `
  --reviewer-contact "YOUR DURABLE CONTACT" `
  --reviewed-at $ReviewedAt `
  --independence-basis "SPECIFIC BASIS FOR INDEPENDENCE AND ANY DISCLOSED RELATIONSHIP" `
  --qualification-summary "RELEVANT JSON SCHEMA, CANONICALIZATION, CRYPTOGRAPHIC PROTOCOL, AND HIRI REVIEW EXPERIENCE" `
  --decision approve `
  --confirm-not-author `
  --confirm-no-reporting-conflict `
  --confirm-no-financial-conflict `
  --confirm-schema-competence `
  --confirm-hiri-competence `
  --confirm-working-drafts-reviewed 2>&1 | Tee-Object -FilePath review-output/review-record-creation.log
if ($LASTEXITCODE -ne 0) { throw "Review record creation failed" }
```

Replace every capitalized instruction value. Change `--decision` when appropriate. The command rejects incomplete assessments, conflicted identity, an approval with open blockers, and evidence for a different candidate.

Verify your output:

```powershell
npm run rhp:resources:review-record:verify -- --record review-output/rhp-independent-review-record.json --verification-report review-output/rhp-resource-verification-report.json --findings review-output/findings.json --semantic-assessment review-output/semantic-assessment.json 2>&1 | Tee-Object -FilePath review-output/review-record-verification.log
if ($LASTEXITCODE -ne 0) { throw "Review record verification failed" }
```

macOS/Linux uses the same values with shell continuation and pipe-failure checking:

```bash
ReviewedAt="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
set -o pipefail
npm run rhp:resources:review-record -- \
  --candidate-commit "$CandidateCommit" \
  --manifest-hash "$ManifestHash" \
  --verification-report review-output/rhp-resource-verification-report.json \
  --findings review-output/findings.json \
  --semantic-assessment review-output/semantic-assessment.json \
  --reviewer-name "YOUR FULL NAME" \
  --reviewer-affiliation "YOUR AFFILIATION OR INDEPENDENT" \
  --reviewer-contact "YOUR DURABLE CONTACT" \
  --reviewed-at "$ReviewedAt" \
  --independence-basis "SPECIFIC BASIS FOR INDEPENDENCE AND ANY DISCLOSED RELATIONSHIP" \
  --qualification-summary "RELEVANT JSON SCHEMA, CANONICALIZATION, CRYPTOGRAPHIC PROTOCOL, AND HIRI REVIEW EXPERIENCE" \
  --decision approve \
  --confirm-not-author \
  --confirm-no-reporting-conflict \
  --confirm-no-financial-conflict \
  --confirm-schema-competence \
  --confirm-hiri-competence \
  --confirm-working-drafts-reviewed 2>&1 | tee review-output/review-record-creation.log
npm run rhp:resources:review-record:verify -- \
  --record review-output/rhp-independent-review-record.json \
  --verification-report review-output/rhp-resource-verification-report.json \
  --findings review-output/findings.json \
  --semantic-assessment review-output/semantic-assessment.json 2>&1 | tee review-output/review-record-verification.log
```

## 9. Return evidence

Return these exact files through the authenticated channel named in the review request:

1. `review-output/rhp-resource-verification-report.json`;
2. `review-output/rhp-independent-review-record.json`;
3. `review-output/findings.json`;
4. `review-output/semantic-assessment.json`;
5. `review-output/mechanical-verification.log`;
6. `review-output/review-record-creation.log`;
7. `review-output/review-record-verification.log`;
8. any supplemental notes referenced by a finding.

Also send the printed review-record SHA-256 in the authenticated message body. Do not send modified source resources. Keep a copy until the owner confirms receipt and hash verification.

Your approval is independent-review evidence only. It does not activate production resources; the project owner must separately sign an exact manifest-hash approval.
