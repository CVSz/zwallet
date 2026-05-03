# zWallet Full-Stack Reference Implementation

This repository now contains a runnable **full-stack scaffold** aligned to `ARCHITECTURE.md`:

- `backend/` — Node.js 22 + TypeScript microservices:
  - `gateway` (Fastify API edge)
  - `wallet-service`
  - `portfolio-service`
  - `tx-orchestrator`
  - `swap-service`
  - `policy-service`
  - `notify-service`
- `mobile/` — React Native/Expo client (placeholder for Android-native migration path).
- `infra/` — Docker Compose + K8s manifests.

## Quick start

```bash
cd backend
npm install
npm run dev
```

In another shell:

```bash
cd mobile
npm install
npm start
```
## Requirements Documentation

Project requirement documents are available in `docs/requirements/`:
- `PRODUCT_REQUIREMENTS.md`
- `NON_FUNCTIONAL_REQUIREMENTS.md`
- `TECHNICAL_REQUIREMENTS.md`

