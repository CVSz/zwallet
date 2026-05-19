# Security Middleware Integration Guide

## Enable Intelligent Defense

Add to `app/main.py`:

```python
from app.middleware.security_intelligent import IntelligentSecurityMiddleware

app.add_middleware(IntelligentSecurityMiddleware)
```

## Recommended Stack Order

```text
NGINX (ModSecurity)
→ Distributed Security
→ Autonomous Security
→ Intelligent Security
```

## Required ENV

```
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong-secret>
```

## Notes
- Ensure Redis is HA (cluster/sentinel)
- Tune thresholds in risk_engine.py
- Add whitelist for internal services
