# Storage and migration model

The versioned `hiri-passport` IndexedDB database stores protected key handles, encrypted portfolio versions, holder-local record metadata, pinned resources, authenticated head cache entries, replay tuples, one-presentation authorizations, privacy history, settings, and migration journals.

Stable local IDs, notes, counts, tags, favorites, and history never enter protocol messages. Upgrades are transactional and monotonic, close old connections on version change, reject downgrade, and never silently reset corrupted or blocked storage. Database prefixes prevent accidental collisions but do not create origin isolation.
