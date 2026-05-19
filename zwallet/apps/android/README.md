# zWallet Android App Blueprint

## Stack
- Kotlin
- Jetpack Compose
- MVVM architecture

## Core Features
- Wallet create/import flow.
- Send/receive assets flow.
- Swap UI with quote preview and execution states.

## Security Requirements
- Android Keystore-backed secret storage.
- Biometric unlock gate for sensitive actions.
- Root detection with restricted execution mode when compromised.

## Suggested Module Layout
- `app/src/main/java/.../ui`: Compose screens and navigation graph.
- `app/src/main/java/.../viewmodel`: MVVM ViewModels and UI state contracts.
- `app/src/main/java/.../domain`: Use cases for wallet, transfer, and swap flows.
- `app/src/main/java/.../data`: Repositories and API/storage adapters.
- `app/src/main/java/.../security`: Keystore, biometrics, root checks.

## Minimum Acceptance Criteria
- Create/import wallet flow is fully testable through ViewModel state transitions.
- Send/receive flow includes validation and error-state UX.
- Swap UI supports loading, quote success, and actionable failure states.
- Sensitive material is never stored in plaintext outside keystore-protected storage.
