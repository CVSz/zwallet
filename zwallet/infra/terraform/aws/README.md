# zWallet Terraform (AWS)

Provisioned infrastructure:

- VPC across 3 AZs
- EKS cluster with autoscaling managed node group
- CloudWatch log group for centralized logs
- Amazon Managed Prometheus workspace for metrics

## Usage

```bash
terraform init
terraform plan
terraform apply
```
