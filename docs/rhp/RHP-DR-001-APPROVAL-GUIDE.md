# RHP-DR-001 approval guide

This guide separates the three things that must not be confused:

1. The Git commit makes the completed decision record immutable.
2. The SHA-256 identifier proves which exact file bytes were approved.
3. The external signature authenticates the approver.

The hash alone is not a signature, and typed initials alone do not bind the approval to a commit.

## Before committing

Confirm that `RHP-DR-001-Real-Holder-Preview-Decision-Record-FINAL.md`:

- contains only the selected options;
- contains no underscore placeholders;
- records ISO approval and review dates;
- identifies `https://hiri-protocol.org/notices/`;
- identifies the manual expiry and emergency control;
- has the approver's initials for sections 2, 4, and 5.

Do not include `RHP-DR-001-Approval-Evidence.json` in the decision commit. It cannot exist until the decision commit identifier exists.

## Decision commit

Stage the completed record, its public information pages, and its control documentation. Review the staged diff before committing.

```powershell
git diff --check
git diff --staged
git commit -m "Approve RHP-DR-001 Real Holder Preview"
```

Record the commit:

```powershell
$decisionCommit = (git rev-parse HEAD).Trim()
```

## Generate approval evidence

Choose one signature mechanism permitted by RHP-DR-001 and provide its public signer identity. For a GPG-signed Git tag, the signer identity is the full public-key fingerprint.

```powershell
npm run rhp:approval:create -- --commit $decisionCommit --mechanism gpg-signed-git-tag --signer <PUBLIC-KEY-FINGERPRINT>
```

The generator reads the exact file bytes from the commit, rejects incomplete decision records, computes SHA-256, and creates `RHP-DR-001-Approval-Evidence.json`.

Check its content binding:

```powershell
npm run rhp:approval:verify
```

## Sign

For a GPG-signed annotated tag:

```powershell
git tag -s RHP-DR-001-approved-2026-07-20 $decisionCommit -F RHP-DR-001-Approval-Evidence.json
git tag -v RHP-DR-001-approved-2026-07-20
```

The tag name is external verification metadata. Do not add the tag's own identifier to the signed JSON.

## Publish and verify

Push the decision commit and the signed tag, then verify the tag again from a clean checkout or another trusted environment.

```powershell
git push origin main
git push origin RHP-DR-001-approved-2026-07-20
git tag -v RHP-DR-001-approved-2026-07-20
```

Record the tag name in the owner-blocker register and release evidence. Never commit a private signing key or passphrase.
