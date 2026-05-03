# 10. TESTING

## 10.1 Unit
- wallet
  - Validate wallet metadata schema and related guards.
  - Confirm security schema validation for auth/device payloads.
- swap
  - Validate swap orchestration input schema and quote/execute path guards.

## 10.2 Integration
- API + DB
  - Verify API endpoints persist expected records to DB-backed stores.
  - Validate audit/event writes for wallet and swap flows.

## 10.3 E2E
- create wallet
- send tx
- swap

## 10.4 Command Map
- Unit: `npm --prefix backend run -w @zwallet/gateway test -- test/unit.security.test.ts`
- Integration: `npm --prefix backend run -w @zwallet/gateway test -- test/integration.api-db.test.ts`
- E2E: `npm --prefix backend run -w @zwallet/gateway test -- test/e2e.wallet-tx-swap.test.ts`
