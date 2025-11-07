# Design Tokens & Component Mapping

The design tokens exported from Figma live in `design/figma-tokens.json`. They are surfaced in code through:

- `packages/ui/src/tokens.ts` – platform-ready palette, spacing, typography
- `apps/mobile/src/theme/tokens.ts` – raw JSON import for native theming pipelines
- `apps/mobile/src/theme/index.ts` – runtime theme bundle consumed by the app

## Core Components

| Figma Component | Implementation |
| --------------- | -------------- |
| Primary Button | `@pichat/ui` → `Button` |
| App Bar | `@pichat/ui` → `AppBar` |
| Text Field | `@pichat/ui` → `Input` |
| Conversation List Item | `@pichat/ui` → `ConversationItem` |
| Message Bubble | `@pichat/ui` → `ChatBubble` |
| QR Identity Card | `@pichat/ui` → `QRCard` |
| Toast | `@pichat/ui` → `Toast` |
| Dialog | `@pichat/ui` → `Dialog` |

Tokens maintain WCAG AA contrast targets and 44px hit areas per spec.
