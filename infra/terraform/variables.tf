variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "n8n-automation"
}

variable "region" {
  description = "AWS region. ca-central-1 keeps data in Canada."
  type        = string
  default     = "ca-central-1"
}

variable "instance_type" {
  description = "Graviton instance size. t4g.small (2 vCPU, 2 GB) comfortably runs n8n + Postgres + Caddy."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_gb" {
  type    = number
  default = 30
}

variable "domain" {
  description = "Hostname for n8n, e.g. n8n.example.com. Point an A record at the Elastic IP output."
  type        = string
}

variable "acme_email" {
  description = "Email for Let's Encrypt certificate notices."
  type        = string
}

variable "repo_url" {
  description = "Public Git URL of this repository — the server clones it for the compose files and scripts."
  type        = string
}

variable "editor_allowed_cidrs" {
  description = "CIDRs allowed to open the n8n editor. Webhooks stay public."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "backup_retention_days" {
  type    = number
  default = 30
}

variable "timezone" {
  type    = string
  default = "America/Toronto"
}
