# zWallet Non-Functional Requirements (NFR)

## 1. Security
- Private keys/seed material must be stored only in platform secure storage (Android Keystore / secure enclave equivalent).
- Sensitive data in transit must use TLS 1.2+.
- Services must implement JWT validation and request authentication at trusted boundaries.
- Security-relevant events must be auditable.

## 2. Performance
- API p95 latency target for standard reads (balance, history): <= 500 ms under nominal load.
- API p95 latency target for transaction initiation flows: <= 1200 ms excluding chain confirmation.
- Mobile app cold start target: <= 3 seconds on reference device tier.

## 3. Availability & Reliability
- Core API target availability: 99.9% monthly.
- Degraded dependencies (pricing/quotes) must fail gracefully with user-safe messaging.
- Idempotency must be used for transaction submission requests.

## 4. Scalability
- Services should scale horizontally.
- Stateless service processes are preferred; shared state must be externalized.

## 5. Observability
- Each service must expose health/readiness endpoints.
- Structured logging must include correlation/request IDs.
- Metrics and traces should support per-service SLO monitoring.

## 6. Maintainability
- APIs must be versioned.
- Core business logic should be testable independently from transport layers.
- Shared contracts/schemas should be centralized to reduce drift.

## 7. Compliance & Privacy
- Collect minimum user data required for operation.
- Avoid storing PII unless explicitly needed and documented.
- Data retention and deletion behavior must be documented per environment.
