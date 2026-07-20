# Issuer and BVS operator-surface acceptance criteria

Status: Working Draft review contract.

The issuer surface constructs a Resolution Manifest at a randomized credential URI, previews the complete public Credential Claim, records explicit public-publication authorization, and signs only after schema, subject, issuance, and genesis-status checks pass. Status changes append signed versions at the same URI with exact effective times; unsigned database flags are never presented as Core status.

The BVS surface shows the BVS cryptographic authority, source provider and method, adapter/evidence profile IDs, hashes and versions, implementation version, jurisdiction, holder-binding result, checks, and complete final public claim. It labels the BVS as direct issuer and the provider as an evidence source. Failed, ambiguous, unauthenticated, replayed, or expired binding prohibits issuance and offers a fresh challenge. Cancellation signs nothing.
