# zWallet Threat Model and Security Implementation

## Threat model
- **Assets:** mnemonics/private keys, JWT sessions, refresh tokens, transaction payloads/signatures, Vault-managed secrets.
- **Trust boundaries:** mobile device ↔ gateway API, service-to-service traffic, tx-orchestrator ↔ blockchain RPC.
- **Entry points:** mobile API calls, auth endpoints, transaction orchestration endpoints, CI/CD secret injection.

## Attack scenarios and mitigations
1. **Stolen mobile device / local data extraction**
   - Attack: attacker extracts local preferences or app DB.
   - Mitigations: Android `EncryptedSharedPreferences` + `MasterKey`, secret wipe API (`clearSecrets`), release obfuscation and resource shrinking.
2. **MITM against mobile API**
   - Attack: forged certificate intercepts API requests.
   - Mitigations: OkHttp certificate pinning with backup pins.
3. **Token theft / long-lived session abuse**
   - Attack: stolen access token reused; refresh token replay.
   - Mitigations: short-lived access JWT, refresh JWT rotation, revoked refresh token set, issuer/audience claims.
4. **OWASP API abuse (headers, brute force, replay)**
   - Attack: excessive requests, nonce replay, missing security headers.
   - Mitigations: rate limiting, anti-replay nonce gate, Helmet secure headers, CSRF protection, strict auth guard.
5. **Secrets leakage in code or env drift**
   - Attack: default dev secret reaches production.
   - Mitigations: hard fail when JWT secrets absent; require runtime injection from Vault (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
6. **Malicious transaction crafting**
   - Attack: malformed tx broadcast or tampered signature.
   - Mitigations: pre-broadcast simulation (`/v1/tx/simulate`) and server-side signature verification (`/v1/tx/verify-signature`).

## Implementation checklist
- Mobile: secure storage ✅, code obfuscation ✅, certificate pinning ✅.
- Backend: OWASP protections ✅, JWT rotation ✅, Vault-aligned secrets management ✅.
- Blockchain: signature verification ✅, pre-broadcast simulation ✅.
