variable "region" {
  type    = string
  default = "us-east-1"
}

variable "monthly_budget_limit_usd" {
  type        = string
  default     = "5"
  description = "Monthly AWS cost budget limit in USD."
}

variable "budget_alert_threshold_percent" {
  type        = number
  default     = 80
  description = "Budget alert threshold percentage that triggers auto-shutdown notifications."
}

variable "budget_alert_email" {
  type        = string
  default     = ""
  description = "Optional email to receive budget alerts. Leave empty to disable email alerts."
}

variable "deny_policy_role_name" {
  type        = string
  default     = ""
  description = "Optional IAM role name to attach the deny-costly-infra policy."
}
