# Owner handoff after independent review

Do not sign a resource approval merely because the reviewer says “approved.” Verify the exact evidence first.

## Required returned evidence

- JCS mechanical verification report;
- JCS independent review record;
- exact findings and semantic-assessment files bound by the review record;
- review-record SHA-256 sent through the agreed authenticated channel;
- complete console output;
- all supplemental evidence referenced by findings.

## Verification procedure

Check out the reviewed candidate commit, install exact dependencies, and run:

```powershell
$CandidateCommit = "FULL REVIEWED CANDIDATE COMMIT"
git checkout --detach $CandidateCommit
npm ci
npm run rhp:resources:review-record:verify -- --record "PATH TO RETURNED REVIEW RECORD" --verification-report "PATH TO RETURNED VERIFICATION REPORT" --findings "PATH TO RETURNED FINDINGS" --semantic-assessment "PATH TO RETURNED SEMANTIC ASSESSMENT"
```

Compare the printed review-record hash to the hash in the authenticated return message. Confirm the reviewer identity through a channel already associated with that person; do not authenticate a new contact address solely from the returned JSON.

## Approval eligibility checklist

All items must be true before signing:

- review decision is `approve`;
- candidate commit and manifest hash equal the values originally sent;
- mechanical report contains only passing checks;
- reviewer is not the responsible author and the independence declaration is credible;
- all six semantic conclusions are `acceptable`;
- no open blocking finding exists;
- any open non-blocking finding is explicitly acknowledged in the owner decision;
- manifest remains `candidateReady: false` and classification remains `project preview resource`;
- approval states that direct-issuer, BVS, live resolver/current-head, remote-resource, remote-delivery, identity-anchor, and relying-party-policy paths remain disabled;
- an approval date and mandatory expiry/review date are selected;
- the decision binds the full candidate commit, source commit, manifest hash, resource count, review-record hash, reviewer name, release ID, limitations, and approval-record ID `RHP-RESOURCE-APPROVAL-RHP-2026-07-1`.

## What the owner signature does not do

It does not make the Working Draft normative, approve future byte changes, approve an issuer/BVS, enable network resolution, populate the production catalog, or deploy the PWA. Those remain separate implementation and release steps.

After the owner-signed resource decision and signed tag verify, retain the review report/record in the repository or an immutable release-evidence store. Then the next implementation unit may generate standalone schema validators, populate `app/src/resources/catalog.ts`, bind the runtime configuration to the approved manifest hash, and run the complete release suite. Until then `OWNER-RHP-03` and `OPEN-CONTEXT-01` remain open.
