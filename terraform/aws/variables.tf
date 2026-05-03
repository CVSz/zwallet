variable "region" {
  type    = string
  default = "us-east-1"
}

variable "eks_role_arn" {
  type        = string
  description = "IAM role ARN for EKS control plane"
}
