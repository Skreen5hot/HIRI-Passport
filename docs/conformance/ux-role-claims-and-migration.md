# UX role claims and migration

Status: Working Draft acceptance evidence; no conformance claim.

Intended surfaces are Holder Application, Verifier Application, Issuer Console, BVS Console, CLI, and SDK. Each must provide interaction, keyboard and assistive-technology, non-color state, adversarial-display, offline/stale, rotation, backup, and requirement-traceability evidence. Test matrices cover loading, valid, invalid, unknown, offline, unsupported, expired, replayed, decline, cancellation, partial evidence, and accepted, rejected, and not-evaluated policy states.

The v1.5 UX migration is breaking. Removed slots, portfolio profile paths, Attestation credentials, HMAC presentation tokens, P-256 paths, custom status logs, generic trust levels, standalone governance signatures, and account/recovery implications are not renamed into v2. Holder-local labels and notes may be copied as non-authoritative metadata. Protocol artifacts are reconstructed and newly signed; issuer and BVS artifacts require reissuance by their original authority.

`Passport-Interoperable`, `Passport-Hardened`, total-loss recovery, selective disclosure, and proximity-security claims remain gated by the open-profile register. Placeholder contexts, hashes, signatures, keys, and examples are never conformance vectors.
