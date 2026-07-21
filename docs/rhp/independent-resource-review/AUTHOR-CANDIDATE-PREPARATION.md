# Author candidate-preparation instructions

Do not send the current working tree to the reviewer. The reviewer needs a full candidate commit and a manifest SHA-256 communicated separately.

## 1. Preflight and commit the source kit

From the repository root in PowerShell:

```powershell
npm ci
npm run rhp:resources:preflight
git status --short
```

Review `git status --short`. Include the intended resource-kit and prerequisite correctness files in one source commit. Do not include logs, `review-output`, secrets, or unrelated personal files. Commit using the normal signed-commit workflow. Then record the exact full commit:

```powershell
$SourceCommit = git rev-parse HEAD
$SourceCommit
git status --short
```

`git status --short` must be empty before the next step. `$SourceCommit` must be 40 or 64 lowercase hexadecimal characters.

## 2. Generate the candidate

Choose the responsible human author. This is the person accountable for the candidate bytes, not the software assistant. Use a durable public or project contact address. Choose the UTC creation time explicitly; the script never guesses it.

```powershell
$CreatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
npm run rhp:resources:prepare -- --source-commit $SourceCommit --created-at $CreatedAt --author-name "FULL RESPONSIBLE AUTHOR NAME" --author-contact "DURABLE CONTACT"
```

Replace both quoted capitalized values. Do not literally submit those instruction labels. Expected output names:

- `resources/preview/rhp-2026-07/resource-manifest.json`
- `resources/preview/rhp-2026-07/candidate-metadata.json`

The command prints `Manifest SHA-256`. Copy it exactly, including the `sha256:` prefix.

## 3. Commit the generated candidate only

```powershell
git status --short
git diff -- resources/preview/rhp-2026-07/resource-manifest.json resources/preview/rhp-2026-07/candidate-metadata.json
git add resources/preview/rhp-2026-07/resource-manifest.json resources/preview/rhp-2026-07/candidate-metadata.json
git commit -S -m "Prepare RHP resource review candidate"
$CandidateCommit = git rev-parse HEAD
$CandidateCommit
git status --short
```

The final status must be empty. Do not amend, rebase, squash, or force-push after sending the commit to the reviewer. Any changed commit requires a new review request.

## 4. Push and create the review request

```powershell
git push origin main
Copy-Item -LiteralPath docs/rhp/independent-resource-review/templates/INDEPENDENT-REVIEW-REQUEST.template.md -Destination review-output/INDEPENDENT-REVIEW-REQUEST.md
```

Fill every field in the copied request. Send the reviewer:

1. repository URL `https://github.com/Skreen5hot/HIRI-Passport`;
2. full `$CandidateCommit`;
3. exact manifest SHA-256 from step 2;
4. responsible author name/contact from the command;
5. the completed review-request file;
6. an agreed authenticated return channel.

Send the commit and manifest hash in two messages or two channels if practical. The reviewer must compare both values with the candidate metadata and verification output.
