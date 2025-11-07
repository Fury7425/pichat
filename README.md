# PiChat

Monorepo scaffold for a secure, Signal-protocol-based messenger over Waku.
This archive includes a production-leaning structure with clear package APIs
and a React Native app placeholder that wires them together.

> NOTE: Crypto/Network/Storage are **stubbed** here to keep the template lightweight.
> Replace stubs with real implementations (libsignal, js-waku, Realm) per the package README notes.

## Workspaces
- `apps/mobile` – React Native app (TypeScript)
- `packages/crypto` – Signal facade (stubs)
- `packages/network` – Waku wrapper (stubs)
- `packages/storage` – Repository layer (in-memory stub)
- `packages/ui` – Tokens & components
- `packages/types` – Shared contracts
- `packages/utils` – Helpers

## Quick start
```bash
yarn
yarn typecheck
yarn test
# RN project scaffolding required for android/ios run
```
