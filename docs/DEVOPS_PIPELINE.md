# DevOps Pipeline

## Components
- Dockerized microservices in `infra/docker/docker-compose.devops.yml`.
- Kubernetes base workloads and services in `k8s/base`.
- AWS EKS and GCP GKE Terraform stacks in `terraform/aws` and `terraform/gcp`.
- GitHub Actions CI/CD in `.github/workflows/cicd.yml`.

## Auto-scaling
- HPA is defined in `k8s/base/gateway-hpa.yaml` with CPU and memory targets.

## Monitoring
- Prometheus scrape config: `k8s/monitoring/prometheus.yml`.
- Grafana deployment: `k8s/monitoring/monitoring-stack.yaml`.

## Logging
- ELK workloads in `k8s/logging/elk-stack.yaml` and docker-compose equivalents.

## Blue/Green deployment strategy
1. Keep both tracks (`blue` and `green`) available via deployment labels.
2. Deploy the candidate version to green.
3. Run smoke checks and readiness probes.
4. Switch service selector from blue to green.

## Rollback strategy
- Use `kubectl rollout undo deploy/zwallet-gateway` to revert deployment revision.
- Re-point service selector to blue if health checks fail.
- GitHub Actions has automatic rollback step on deployment failure.
