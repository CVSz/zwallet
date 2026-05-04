# zWallet World App Blueprint

## Purpose
The World App is the global consumer-facing surface that unifies wallet, swaps, card controls, and fiat on/off-ramp experiences.

## Scope
- Portfolio and activity overview.
- Wallet send/receive flows with clear validation and failure UX.
- Swap flow with route, gas-aware quote, and slippage controls.
- Card controls: freeze/unfreeze, spend limits, and usage visibility.
- Fiat rails: deposit/withdraw status and compliance checkpoints.

## Security and Reliability Requirements
- Never expose raw private key material in UI logs, analytics, or crash reports.
- Route sensitive operations through secure device storage + signed backend challenges.
- Use strict input validation for all user-entered addresses, amounts, and fiat identifiers.
- Display simulation/preview status before transaction signing.
- Handle degraded backend/RPC states with user-safe retry and fallback messaging.

## Suggested App Modules
- `src/features/wallet`: create/import, balance, send/receive.
- `src/features/swap`: quote, route selection, execution status.
- `src/features/card`: controls, limits, and transaction timeline.
- `src/features/fiat`: funding sources, withdrawals, compliance status.
- `src/core/security`: secure storage, session/auth hardening.
- `src/core/network`: API clients, retries, timeout policy, circuit handling.

## Minimum Acceptance Criteria
- Wallet, swap, and card user journeys each have deterministic state transitions.
- Transaction actions require a validated preview step before submit.
- User-facing errors are categorized (validation, liquidity, RPC/network, auth).
- Sensitive data handling follows secure-storage boundaries by default.
