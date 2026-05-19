# 5. ANDROID APP

## Technology Stack
- **Language**: Kotlin
- **UI**: Jetpack Compose
- **Architecture**: MVVM

## Feature Scope
### 1) Wallet Create / Import
- Create a new wallet with secure local key generation.
- Import existing wallet from supported recovery input.
- Confirm completion state with clear UX and recovery guidance.

### 2) Send / Receive
- Send flow with recipient, amount, fee visibility, and validation states.
- Receive flow with address display and copy/share UX.
- User-safe error messages for invalid input and failed submissions.

### 3) Swap UI
- Pair selection and input amount.
- Quote loading/success/error UI states.
- Confirmation and execution progress states.

## Security Requirements
### Android Keystore
- Store sensitive wallet secrets only in keystore-backed storage.
- Never persist raw private keys in plaintext.

### Biometric Unlock
- Gate sensitive actions (send, export-sensitive operations, approvals) behind biometric authentication.
- Include fallback handling for unavailable/unenrolled biometrics.

### Root Detection
- Detect rooted or tampered environments.
- Restrict high-risk operations when root signals are present.
- Present clear user messaging when security mode is reduced.

## Recommended Android Package Layout
- `ui/`: Compose screens, navigation, reusable components.
- `viewmodel/`: State holders and action dispatch for each feature flow.
- `domain/`: Use cases for wallet, transfer, and swap orchestration.
- `data/`: Repository implementations and local/remote adapters.
- `security/`: Keystore access, biometric gateway, and root-detection service.

## Minimum Acceptance Criteria
- Wallet create/import is fully represented by deterministic MVVM state transitions.
- Send/receive flows enforce validation and provide clear actionable error states.
- Swap screens handle loading, successful quote, and failure recovery states.
- Sensitive data handling paths comply with keystore-only secret storage policy.
