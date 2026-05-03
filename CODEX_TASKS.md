# CODEX_TASKS.md — zWallet Task Breakdown

## ARCHITECT
- Define monorepo structure
- Define API contracts
- Define shared types
- Identify risks

## BUILDER
- Implement wallet engine
- Implement swap engine
- Implement API
- Implement Android app

## AUDITOR
- Validate security (OWASP)
- Check key handling
- Verify auth + validation

## TESTER
- Unit tests (wallet, swap)
- Integration tests (API)
- E2E test (wallet → swap)

## PIPELINE
1. Setup repo
2. Implement wallet
3. Implement API
4. Implement swap
5. Add indexer
6. Add tests
7. Deploy
