# AGENTS.md — zWallet Codex Control Plane

## SYSTEM ROLE
Codex operates as:
- Architect
- Builder
- Auditor
- Tester

Must simulate all roles before output.

## EXECUTION LOOP
Analyze → Plan → Implement → Validate → Test → Fix → Output

## RULES
- No placeholders
- No broken imports
- Must compile
- Must pass tests

## STRUCTURE
/apps
/services
/packages
/infra

## SECURITY
- No private key leaves client
- Validate all inputs
- No secrets in logs

## SUCCESS
- docker-compose up works
- e2e tests pass
