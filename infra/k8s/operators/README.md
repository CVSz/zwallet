# Operators Deployment Pack (Production HA)

This folder now contains deployable operator artifacts (not docs-only) for:
- PostgreSQL HA via Zalando Postgres Operator + Patroni CRD
- Redis HA via Bitnami Redis Cluster Helm overrides
- Vault HA via HashiCorp Vault Helm overrides + k8s auth RBAC
- Istio ingress + service policy manifests

## Files

- `postgres-cluster.yaml` — Patroni-managed Postgres cluster custom resource
- `redis-values.yaml` — Redis cluster production overrides (cluster mode, persistence, anti-affinity, PDB)
- `vault-values.yaml` — Vault HA + injector values
- `vault-auth.yaml` — Kubernetes auth service account + tokenreview binding
- `istio-gateway.yaml` — ingress gateway
- `istio-destination-rule.yaml` — mTLS + outlier detection policy
- `istio-authorization-policy.yaml` — namespace-level service access policy
- `namespace-labels.yaml` — sidecar injection namespace label
- `deploy-operators.sh` — one-command deployment automation

## One-command deploy

```bash
./infra/k8s/operators/deploy-operators.sh
```

## Post-deploy checks

```bash
kubectl get postgresql -n zwallet
kubectl get pods -n zwallet -l application=spilo
kubectl get pods -n zwallet -l app.kubernetes.io/name=redis-cluster
kubectl get pods -n zwallet -l app.kubernetes.io/name=vault
kubectl get gateway,destinationrule,authorizationpolicy -n zwallet
```

## Failover simulation

```bash
kubectl delete pod -n zwallet -l application=spilo --wait=false
kubectl get postgresql -n zwallet -w
```

## Notes

- CRDs for Postgres Operator are installed by Helm chart installation in `deploy-operators.sh`.
- Vault initialization/unseal procedure depends on your KMS/HSM strategy and should be run via secure ops runbook.
- Apply these changes only on multi-node Kubernetes clusters.
