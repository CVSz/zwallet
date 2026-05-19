output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "prometheus_workspace_id" {
  value = aws_prometheus_workspace.metrics.id
}
