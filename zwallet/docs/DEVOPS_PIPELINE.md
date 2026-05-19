# DevOps Pipeline

## Components
- Dockerized microservices in `infra/docker/docker-compose.devops.yml`.
- Kubernetes base workloads and services in `k8s/base`.
- AWS EKS and GCP GKE Terraform stacks in `terraform/aws` and `terraform/gcp`.
- GitHub Actions CI/CD in `.github/workflows/cicd.yml`.

## Authentication model (secretless deploy)
- GitHub Actions deploy job uses OpenID Connect (OIDC) with `id-token: write` permission.
- AWS credentials are minted at runtime through `sts:AssumeRoleWithWebIdentity` (no static cloud keys in GitHub secrets).
- Kubernetes access is bootstrapped via `aws eks update-kubeconfig` using short-lived AWS credentials only.
- No long-lived kubeconfig is stored in repository or secret manager for CI.

## AWS trust policy hardening checklist
1. Restrict audience to STS: `token.actions.githubusercontent.com:aud = sts.amazonaws.com`.
2. Restrict subject to this repository in trust policy:
   - Recommended during initial setup/troubleshooting: `repo:CVSz/zwallet:*`
   - Then harden to specific branches (example):
     - `repo:CVSz/zwallet:ref:refs/heads/main`
     - `repo:CVSz/zwallet:ref:refs/heads/dev`
3. If you get `Not authorized to perform sts:AssumeRoleWithWebIdentity`, verify repository name and case exactly match `CVSz/zwallet`.
4. Keep branch protection enabled for `main` (required reviewers + status checks).
5. Avoid mapping deploy role to `system:masters`; bind a namespace-scoped RBAC role for least privilege.

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

## AWS account ID format reminder
- Use the 12-digit account ID in IAM/CLI/API calls: `171518635073`.
- Do **not** use the console billing display format with hyphens (for example `1715-1863-5073`) in IAM ARNs or CLI commands.
