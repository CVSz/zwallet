# Operators Deployment (Production HA)

This directory defines production-grade operators for:
- PostgreSQL (Zalando Patroni Operator)
- Redis (Bitnami Redis Cluster)
- Vault (HashiCorp Vault Helm)
- Istio (Service Mesh Full)

---

## 1. PostgreSQL Operator (Patroni)

```bash
helm repo add zalando https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm install postgres-operator zalando/postgres-operator
```

---

## 2. Redis Cluster

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis bitnami/redis-cluster
```

---

## 3. Vault (Secrets)

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault
```

Enable Kubernetes auth:

```bash
vault auth enable kubernetes
```

---

## 4. Istio (Full Mesh)

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
./bin/istioctl install --set profile=demo -y
```

Enable mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
spec:
  mtls:
    mode: STRICT
```

---

## Notes
- All components support HA and failover
- Must be deployed on multi-node k8s cluster
- Integrate with existing Helm chart
