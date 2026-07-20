# Browser security model

The primary risks are script injection, compromised dependencies or service workers, same-origin applications, malicious resolver content, storage rollback or eviction, hostile signed display text, clipboard/screen capture, and lost devices.

Controls include a dedicated production origin, no third-party runtime scripts, restrictive CSP, inert text rendering, exact dependency pins, bundle review, explicit resolver provenance, non-extractable keys where supported, transactional IndexedDB state, protected backup, secret-free logs, and capability checks that fail closed. Browser key protection and local authentication reduce exposure but are not hardware-wallet guarantees or Passport evidence.
