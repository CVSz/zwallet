# 1. MONOREPO INIT
Refactor repo into:

/apps/android
/apps/api
/services/wallet-engine
/services/swap-engine
/services/indexer
/packages/crypto-core
/packages/chain-adapters
/packages/shared-types

Rules:
- strict TypeScript
- pnpm workspace
- no circular deps

Generate:
- tsconfig
- eslint
- CI (GitHub Actions)
