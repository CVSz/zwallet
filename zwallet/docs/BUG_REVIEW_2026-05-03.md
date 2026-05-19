# Bug Review (2026-05-03)

## Critical findings

1. **Authentication bypass in `authenticate` decorator**  
   In `securityPlugin`, failed JWT verification sends `401` but does not stop request execution (no `return`/`throw`). Routes using `preHandler: [authGuard]` can continue executing after an unauthorized response attempt, creating a potential auth bypass or double-send instability depending on Fastify flow control.

2. **Global anti-replay hook blocks public endpoints and can leak memory**  
   The `preHandler` anti-replay hook applies to all routes, including unauthenticated endpoints like `/health` and `/v1/auth/login`. Requests without `x-nonce` are rejected with `400`, which is operationally unsafe and breaks standard clients. Also, used nonces are added to an in-memory `Set` with no TTL/eviction, causing unbounded growth.

3. **Sensitive key material forwarded server-side**  
   The lifecycle route forwards `privateKeyHex` from API request body to `tx-orchestrator` during signature verification. This violates least exposure principles and conflicts with wallet security boundaries; backend should never receive raw private keys.

4. **Refresh token revocation store is process-local and non-persistent**  
   Revoked refresh tokens are kept in an in-memory `Set`. Any process restart (or multi-instance deployment) forgets revocations, allowing replay of previously revoked refresh tokens.

5. **Security plugin does not short-circuit on rate-limit hit**  
   `onRequest` sends `429` for rate limit violations but does not explicitly return/throw, allowing downstream handlers/hooks to continue in some execution paths.

## Additional correctness risk

6. **Internal error details returned to clients**  
   The global error handler returns raw error messages in `detail`, which can expose internal implementation details and increase attack surface for reconnaissance.
