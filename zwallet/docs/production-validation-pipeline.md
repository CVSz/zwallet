# zWallet Production Validation Pipeline

This runbook defines an end-to-end validation workflow to execute before a production rollout.

## Architecture Guardrails (Pre-Flight)

- Production ledger and payment business logic source of truth is `api/src` (TypeScript).
- `api/app` (Python) is limited to orchestration and security support concerns.
- Any duplicate business logic across Python and TypeScript must fail review before deploy.

## 1) Deploy (Kubernetes)

```bash
helm upgrade --install zwallet ./infra/k8s/helm/zwallet
kubectl rollout status deployment/zwallet-api
```

Verify:
- Pods are Ready
- Services are reachable
- Database connectivity is healthy

## 2) Load Test (k6)

Create `load.js`:

```js
import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
  http.post('http://zwallet.local/tx', JSON.stringify({
    amount: 100,
    from: 'A',
    to: 'B'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  sleep(1);
}
```

Run:

```bash
k6 run --vus 100 --duration 2m load.js
```

Check:
- p95 latency
- Error rate
- Database lock contention

## 3) Chaos Test

### Kill Postgres primary

```bash
kubectl delete pod -l application=spilo
```

Expected:
- Failover in under 10 seconds
- No data loss

### Kill API pods

```bash
kubectl delete pod -l app=zwallet-api
```

Expected:
- Traffic continues through healthy replicas

## 4) Observe

### Metrics
- CPU / memory utilization
- Request latency

### Logs (SIEM)
- `trace_id` continuity
- Anomaly detection events

### Alerts
- Webhook alerts trigger correctly

## 5) Verify Invariants

Run:

```sql
SELECT transaction_id
FROM ledger_entries
GROUP BY transaction_id
HAVING SUM(amount) != 0;
```

Expected result:

```text
0 rows
```

## 6) Tune

If latency is high:
- Increase API replicas
- Tune DB pool sizing

If errors increase:
- Inspect logs
- Adjust retry/idempotency settings

If failover is slow:
- Tune Patroni settings and readiness probes

## Success Criteria

- No ledger imbalance
- No duplicate processing
- Failover works reliably
- Stable under load
- Alerts trigger correctly

## Final Result

System is validated for:
- Correctness
- Resilience
- Observability
