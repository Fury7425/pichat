# PiChat Threat Model

## Assets
- Long-term identity key pair and registration id
- Signed pre-keys and one-time pre-keys
- Double Ratchet session state per peer
- Encrypted message history, attachments, and recovery kit
- Realm database contents stored on device

## Adversaries
- Passive network observers capturing Waku traffic
- Active network attackers attempting replay, impersonation, or downgrade
- Stolen or compromised mobile devices
- Malicious contacts attempting to bypass fingerprint verification

## Mitigations
- Identity/private material persisted via platform keystore references
- X3DH bootstrap + Signal Double Ratchet for forward secrecy and authentication
- Argon2id + XChaCha20-Poly1305 protected recovery kits
- Realm database encrypted at rest via OS; only ciphertext published to Waku topics
- Fingerprint comparison UI to detect MITM during onboarding
- Session storage persisted in Realm with tamper-evident signatures from Signal
- Local notifications use generic “Secure message received” text without plaintext

## Residual Risks
- Device compromise after unlock yields access to decrypted state
- Waku peer selection relies on public bootstrapping (subject to eclipse attacks)
- No transport-level anonymity; metadata leaks via topic timing remain
- Recovery kit security dependent on user-supplied passphrase strength
