# Verifier results and export acceptance criteria

Status: Working Draft review contract.

The results view preserves Phase R request evidence, Phase H holder evidence, Phase C per-credential evidence, Phase I issuer identity, and Phase P policy. It shows completed checks when another dependency is invalid, unavailable, stale, or unsupported. Valid signature control is not organizational identity; an absent anchor remains `unknown` without changing signature validity.

`active` status appears only when a fresh configured issuer-authoritative current head, verified chain, and valid key state support it. Cached evidence displays source, retrieval time, head hash, freshness, and transport provenance. Network failure, a holder package, an unsigned internal flag, a custom revocation log, or a third-party checkpoint never establishes active Core status.

Machine and human exports preserve verification time, exact clock skew and issuance tolerance, every evidence dimension, manifest and content hashes, provenance, policy ID/version and reasons, structured errors, and cache provenance. Export and retention follow the disclosed purpose; secret keys, decrypted portfolios, source credentials, and unrelated holder-local history are excluded.
