# Holder onboarding and home acceptance criteria

Status: Working Draft review contract.

Onboarding explains that the holder authority is a stable, correlatable cryptographic identifier, not an account, public profile, verified human identity, or recovery service. It creates the Ed25519 authority in protected storage and a private Mode 2 portfolio. The flow verifies an available backup, states plainly when no recovery path exists, and never promises recovery after every authority key is lost.

Before completion, the holder is told that each Mode 2 recipient can decrypt a portfolio version, recipient removal creates a fresh encrypted version, and ciphertext already copied cannot be retracted. Routine rotation preserves the holder authority and portfolio URI and does not require issuer restamping.

The home view groups local records by holder intent and verified provenance: direct issuer, BVS, persistent self-assertion, or ephemeral self-assertion. It displays expired, revoked, invalid, suspended, superseded, and unknown as distinct states. `unknown` is not success. Local counts, labels, notes, tags, and history stay visible only to the holder and do not enter protocol messages, resolver requests, logs, or analytics.

Acceptance requires keyboard completion, assistive-technology labels, non-color state cues, no numbered trust tiers, and no language implying that portfolio membership authenticates a record.
