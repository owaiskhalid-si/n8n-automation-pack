# Single-instance n8n on EC2 (Graviton), fronted by Caddy with automatic HTTPS.
# - No SSH: administration via SSM Session Manager (port 22 stays closed)
# - Secrets generated here and stored as SecureString parameters in SSM
# - Nightly Postgres + workflow backups to an encrypted, versioned S3 bucket

data "aws_ssm_parameter" "ubuntu_arm64" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_caller_identity" "current" {}

# ─── Secrets ────────────────────────────────────────────────────────────────

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "random_id" "encryption_key" {
  byte_length = 32
}

resource "aws_ssm_parameter" "postgres_password" {
  name  = "/${var.project}/postgres_password"
  type  = "SecureString"
  value = random_password.postgres.result
}

resource "aws_ssm_parameter" "encryption_key" {
  name  = "/${var.project}/encryption_key"
  type  = "SecureString"
  value = random_id.encryption_key.hex
}

# ─── Backups ────────────────────────────────────────────────────────────────

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "backups" {
  bucket = "${var.project}-backups-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    filter {}
    expiration {
      days = var.backup_retention_days
    }
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# ─── IAM: SSM access + backups + reading our own secrets ────────────────────

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "n8n" {
  name               = "${var.project}-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.n8n.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "n8n" {
  statement {
    sid       = "Backups"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
  }
  statement {
    sid       = "ReadSecrets"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/*"]
  }
}

resource "aws_iam_role_policy" "n8n" {
  name   = "${var.project}-app"
  role   = aws_iam_role.n8n.id
  policy = data.aws_iam_policy_document.n8n.json
}

resource "aws_iam_instance_profile" "n8n" {
  name = "${var.project}-instance"
  role = aws_iam_role.n8n.name
}

# ─── Network ────────────────────────────────────────────────────────────────

resource "aws_security_group" "n8n" {
  name        = "${var.project}-web"
  description = "HTTP/HTTPS only; administration through SSM Session Manager"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  for_each          = toset(["80", "443"])
  security_group_id = aws_security_group.n8n.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "http3" {
  security_group_id = aws_security_group.n8n.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "udp"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.n8n.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ─── Instance ───────────────────────────────────────────────────────────────

resource "aws_instance" "n8n" {
  ami                    = data.aws_ssm_parameter.ubuntu_arm64.value
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.n8n.id]
  iam_instance_profile   = aws_iam_instance_profile.n8n.name

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/bootstrap.sh.tftpl", {
    project              = var.project
    region               = var.region
    repo_url             = var.repo_url
    domain               = var.domain
    acme_email           = var.acme_email
    timezone             = var.timezone
    editor_allowed_cidrs = join(" ", var.editor_allowed_cidrs)
    backup_bucket        = aws_s3_bucket.backups.id
  })
  user_data_replace_on_change = false

  tags = {
    Name = var.project
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "n8n" {
  instance = aws_instance.n8n.id
  domain   = "vpc"
}
