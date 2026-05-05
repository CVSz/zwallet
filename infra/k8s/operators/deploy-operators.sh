#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-zwallet}"

helm repo add zalando https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1 || kubectl create namespace "${NAMESPACE}"
kubectl apply -f infra/k8s/operators/namespace-labels.yaml

helm upgrade --install postgres-operator zalando/postgres-operator \
  --namespace "${NAMESPACE}" \
  --set configKubernetes.enable_pod_antiaffinity=true \
  --wait

kubectl apply -f infra/k8s/operators/postgres-cluster.yaml

helm upgrade --install redis bitnami/redis-cluster \
  --namespace "${NAMESPACE}" \
  -f infra/k8s/operators/redis-values.yaml \
  --wait

helm upgrade --install vault hashicorp/vault \
  --namespace "${NAMESPACE}" \
  -f infra/k8s/operators/vault-values.yaml \
  --wait
kubectl apply -f infra/k8s/operators/vault-auth.yaml

kubectl apply -f infra/k8s/operators/istio-gateway.yaml
kubectl apply -f infra/k8s/operators/istio-destination-rule.yaml
kubectl apply -f infra/k8s/operators/istio-authorization-policy.yaml

kubectl rollout status statefulset/redis-redis-cluster -n "${NAMESPACE}" --timeout=10m
kubectl get postgresql -n "${NAMESPACE}"
kubectl get pods -n "${NAMESPACE}" -l application=spilo

cat <<EOF
Deployment complete.
Next steps:
1) Configure Vault kubernetes auth and policies.
2) Run failover simulation: kubectl delete pod -n ${NAMESPACE} -l application=spilo --field-selector=status.phase=Running --wait=false
EOF
