# zWallet World Web Portal

Production-ready web portal for wallet transfer, swap routing, card controls, and fiat rails.

## Features
- Deterministic state transitions for wallet, swap, and fiat submit actions via validate/preview/submit flow.
- Input validation for EVM address, amounts, and slippage limits.
- Gas-aware multi-route scoring in swap preview.
- Card controls with freeze/unfreeze, spend limits, and MCC filtering toggle.
- Compliance gating for fiat withdrawals (KYC, risk, liquidity checks).

## Run
```bash
pnpm --filter @zwallet/world start
```

Then open `http://localhost:4173/apps/world/index.html`.

## Build
```bash
pnpm --filter @zwallet/world build
```

The static build output is generated in `apps/world/dist`.

## Checks
```bash
pnpm --filter @zwallet/world check
```
