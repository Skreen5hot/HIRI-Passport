# BVS Security and Operations

The BVS threat model includes malicious holders, compromised source accounts, provider changes, replay, confused-deputy and session-swapping attacks, ambiguous source data, resolver rollback, insiders, and BVS-key compromise. A BVS signature proves what the BVS asserted, not the truth of the assertion.

Holder, source subject, intent, provider, adapter, schema, and issuance decision remain bound in one protected session. The signing boundary accepts only a validated issuance record containing exact claim/evidence hashes, holder-binding result, public-publication authorization, and issuance-policy decision. Signing keys are isolated from adapters, web handlers, analytics, and raw evidence storage.

Raw evidence is minimized, encrypted, access-controlled, retention-limited, and deleted when its documented purpose ends unless law requires longer. Public evidence and logs exclude source tokens, passwords, cookies, private responses, document images, biometrics, device fingerprints, and internal risk scores.

Operations maintain key lifecycle, incident response, adapter change control, access review, audit logs, retention, and status procedures. Incidents identify adapter/profile/implementation versions, time range, and affected credentials without rewriting historical evidence. Audit claims name their scheme, scope, auditor, period, exceptions, and expiry.

Coverage: BVP §16, §16.1–§16.3.
