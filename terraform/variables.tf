
variable "aws_region" {
  description = "The AWS region to deploy to."
  type        = string
  default     = "eu-central-1"
}

variable "app_name" {
  description = "The name of the application."
  type        = string
  default     = "slay-drip"
}

variable "environment" {
  description = "The environment to deploy to. Use 'dev' for development (auto-deploys from main) or 'live' for production (manual deployment only)."
  type        = string
  default     = "dev"
}

variable "github_repository" {
  description = "The GitHub repository in format 'owner/repo-name' (e.g., 'username/slay-drip')"
  type        = string
  default     = "PrzemyslawMorski/slay-drip"
}
