# zWallet Product Requirements Document (PRD)

## 1. Purpose
Define core product requirements for zWallet as a secure, multi-chain digital wallet platform with mobile and service-oriented backend support.

## 2. Goals
- Enable users to create/import wallets and securely manage keys.
- Provide token balances, transaction history, send/receive flows, and swaps.
- Enforce security and policy checks before transaction execution.
- Support scalable backend operations across independently deployable services.

## 3. Personas
- **Retail user**: Holds and transfers crypto assets.
- **Power user**: Actively swaps assets and tracks portfolio performance.
- **Operator/Admin**: Monitors service health, policy outcomes, and alerts.

## 4. Functional Requirements

### 4.1 Authentication & Wallet Access
- User must be able to unlock wallet with local authentication (biometric/PIN).
- User must be able to create a new wallet and import via seed phrase/private key.
- Wallet secrets must never be exposed in logs or analytics payloads.

### 4.2 Portfolio & Balances
- System must show token balances per wallet/address.
- System must show fiat estimate (if pricing feed is available).
- System must refresh balances on app open and on manual refresh.

### 4.3 Send/Receive
- User must be able to generate receive address and QR code payload.
- User must be able to send assets with fee estimation before confirmation.
- System must validate destination address format per chain.

### 4.4 Transaction History
- User must view transaction list with status: pending, confirmed, failed.
- User must be able to open transaction details with hash and timestamp.

### 4.5 Swap
- User must be able to request quote for token swaps.
- User must confirm swap with final amount, route, and fees.
- Policy service must approve or reject high-risk swaps.

### 4.6 Notifications
- System should notify users about transaction state changes.
- Notification service should support push-ready event payloads.

### 4.7 Policy & Risk Controls
- System must perform pre-signing checks for suspicious destinations.
- System must enforce configurable spend/velocity limits.

## 5. Out of Scope (MVP)
- Custodial account recovery managed by provider.
- Social trading and copy portfolios.
- On-chain staking and lending products.

## 6. Acceptance Criteria (MVP)
- User can create/import wallet and successfully send/receive on at least one chain.
- User can view balances and recent transactions in app UI.
- Swap flow works end-to-end through orchestrator and policy gates.
- Critical security checks are applied before signing/broadcasting.
