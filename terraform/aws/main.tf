terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  name_prefix = "zwallet-guardrail"
}

resource "aws_budgets_budget" "monthly_cost_cap" {
  name         = "${local.name_prefix}-monthly-cost-cap"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.budget_alert_threshold_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
    subscriber_email_addresses = var.budget_alert_email == "" ? [] : [var.budget_alert_email]
  }
}

resource "aws_sns_topic" "budget_alerts" {
  name = "${local.name_prefix}-budget-alerts"
}

resource "aws_iam_role" "lambda_stop_instances" {
  name = "${local.name_prefix}-lambda-stop-instances"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_stop_instances.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_ec2_stop" {
  name = "${local.name_prefix}-ec2-stop"
  role = aws_iam_role.lambda_stop_instances.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances"
        ],
        Resource = "*"
      }
    ]
  })
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/stop_instances.py"
  output_path = "${path.module}/lambda/stop_instances.zip"
}

resource "aws_lambda_function" "stop_instances" {
  function_name    = "${local.name_prefix}-stop-instances"
  role             = aws_iam_role.lambda_stop_instances.arn
  handler          = "stop_instances.lambda_handler"
  runtime          = "python3.12"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
}

resource "aws_sns_topic_subscription" "budget_to_lambda" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.stop_instances.arn
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.budget_alerts.arn
}

resource "aws_iam_policy" "deny_costly_infra" {
  name        = "${local.name_prefix}-deny-costly-infra"
  description = "Temporary deny policy to prevent accidental costly infrastructure deployments."

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Deny",
      Action = [
        "ec2:RunInstances",
        "eks:CreateCluster",
        "eks:CreateNodegroup",
        "elasticloadbalancing:*"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach_deny_policy" {
  count      = var.deny_policy_role_name == "" ? 0 : 1
  role       = var.deny_policy_role_name
  policy_arn = aws_iam_policy.deny_costly_infra.arn
}
