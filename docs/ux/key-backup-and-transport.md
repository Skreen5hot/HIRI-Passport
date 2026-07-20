# Key, backup, device, and transport acceptance criteria

Status: Working Draft review contract.

Routine rotation shows both required signatures, preserves the genesis-derived authority and portfolio URI, and does not imply credential reissuance. Compromise handling distinguishes one-key loss from total loss. Biometrics, an encrypted portfolio, social familiarity, a device vendor account, or copied ciphertext cannot reconstruct a lost authority by themselves. Total-loss recovery remains blocked by `OPEN-RECOVERY-01`.

A new device receives a fresh X25519 key and a fresh opaque Mode 2 recipient ID in a newly encrypted portfolio version. Removal warnings state that earlier ciphertext and keys may remain usable. Backups retain the manifest, ciphertext, recipient metadata, and chain evidence and are verified after creation.

QR, links, and files carry unchanged signed protocol semantics. They do not replace signatures, hashes, authority lifecycle, status, identity, or policy verification and cannot add members to closed messages. Proximity transport security and related claims remain blocked by `OPEN-TRANSPORT-01`.
