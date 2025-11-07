# PiChat Security Caveats
- Keys should be protected with device keystore. Stubs keep keys in-memory for demo.
- No analytics or plaintext notifications.
- Recovery-kit encryption must use a modern KDF (Argon2id) before a real release.
