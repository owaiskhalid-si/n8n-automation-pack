output "public_ip" {
  description = "Create an A record for var.domain pointing here."
  value       = aws_eip.n8n.public_ip
}

output "n8n_url" {
  value = "https://${var.domain}"
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.id
}

output "connect" {
  description = "Open a shell on the instance without SSH."
  value       = "aws ssm start-session --region ${var.region} --target ${aws_instance.n8n.id}"
}
