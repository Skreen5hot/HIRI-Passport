# Owner approval verification keys

These files contain public verification keys only. Private keys and passphrases must remain outside the repository.

| Approval scope | Fingerprint | Public-key file | Status |
|---|---|---|---|
| `RHP-DR-001` | `07171B3AF6042998D1ADDEE0DE640D2A3317B186` | `aaron-damiano-rhp-2026.asc` | Retained for historical signature verification; superseded for new approvals |
| `RHP-DR-002` and later approvals until superseded | `2B7BA5C378749418B1D051D9C01347EA45970647` | `aaron-damiano-rhp-2026-replacement.asc` | Current owner signing key |

Import and verify the current key:

```powershell
gpg --import docs/rhp/keys/aaron-damiano-rhp-2026-replacement.asc
gpg --fingerprint 2B7BA5C378749418B1D051D9C01347EA45970647
```

The displayed fingerprint must match exactly before trusting a signature. Key rotation does not invalidate signatures made by the historical key.
