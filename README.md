# PiChat-mini

Tiny demo that preserves the mechanics: identity + fingerprint, pair by sharing a public key, E2EE messages, in-memory storage. Swap implementations later for libsignal/js-waku/Realm without changing UI.

## Dev
- `yarn`
- `yarn typecheck && yarn lint && yarn test`
- `yarn android` / `yarn ios`

## How to use (two emulators)
1) Run the app on **Device A** and **Device B**.
2) On A, copy **Share link**, extract the part after `pichat://pub/` (this is A's `pubKeyB64`).
3) On B, paste A's pub into the top input and press **Start chat**.
4) Type a message on B → **Encrypt & send (demo)**. The app shows only local outbox for now.
5) To simulate network receive on A, copy B’s outbox ciphertext (dev-log or add a toast), paste into **Decrypt incoming** (`iv.ct`) and press **Decrypt**.
   - Replace this step later with **Waku publish/subscribe** and **Signal sessions**.

## Swap-in plan (same function shapes)
- `miniCrypto.ts` → real Signal (X3DH + Double Ratchet)
- `store.ts` map → Realm repositories
- “receive” pastebox → Waku subscribe callback

## Security
**Demo crypto is not production-safe**. It demonstrates the flow only. Use Signal protocol and OS keystore for real builds.
