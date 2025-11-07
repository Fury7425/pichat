# PiChat Security Notes

- Identity keys and pre-keys are persisted as opaque references via the platform keychain; raw private bytes never touch JS storage.
- The Signal implementation uses X3DH + Double Ratchet from `libsignal-protocol-typescript`; sessions are stored in Realm for crash-safe recovery.
- Recovery kits are Argon2id + XChaCha20-Poly1305 sealed blobs. Users must choose strong passphrases to avoid offline cracking.
- Notifications and logs redact message content; published Waku payloads are always encrypted envelopes.
- Realm is required for persistence; ensure devices enforce OS-level disk encryption.
- No analytics or telemetry is collected in this application.
