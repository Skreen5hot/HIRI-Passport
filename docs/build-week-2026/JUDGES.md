# Judge Testing Guide

## Fastest path: public demo

Open https://hiri-protocol.org/#/home in a current desktop or mobile browser.

No login, account, API key, wallet, credential, or test data is required. Do not enter real personal or credential information; the submitted project is a Synthetic Demo.

### Expected walkthrough

1. Confirm the persistent banner says **Synthetic demo - no real keys or credentials**.
2. On the Passport screen, open the **Professional Engineer** sample.
3. Confirm credential detail reports Cryptography, Status, Issuer identity, Provenance, and Policy separately.
4. Use the primary navigation to open **Present**.
5. Select **Load synthetic consent preview**, then **Inspect request**.
6. Confirm the request remains labeled unverified/synthetic, shows its requested field and purpose, and offers **Decline request**.
7. Optionally inspect **Verify**, **Settings**, and **Privacy history** states.

Expected safety behavior:

- all data is synthetic;
- no real key or credential is required;
- unknown identity or policy is not silently promoted to success;
- the demo remains usable at mobile width and keyboard accessible;
- the application makes no third-party runtime requests during the normal demo flow.

## Local installation

Requirements: Git and Node.js 22 or newer.

```powershell
git clone https://github.com/Skreen5hot/HIRI-Passport.git
cd HIRI-Passport
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173/.

## Static build

```powershell
npm run build
npm run preview
```

The static artifact is generated in `dist/` and requires no application server API.

## Verification

```powershell
npm run check
npx playwright install chromium
npm run test:browser
```

The browser suite serves the compiled artifact at a loopback origin. GitHub Actions executes the same checked-in commands on each main-branch push.

## Submitted version and scope

- Source tag: `openai-build-week-2026-submission-v2`
- License: MIT
- Submitted runtime: `synthetic-demo`
- Sample data: checked-in synthetic fixtures under `app/src/demo/`
- Primary Codex session ID: `019f7ee9-bd51-7ab0-97db-60f1993f21f0`

The `real-holder-preview` source is future work and is not the working project represented in the video. Its production resources and activation flags remain fail closed pending external review and owner approval.

For known limitations, see [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md).
