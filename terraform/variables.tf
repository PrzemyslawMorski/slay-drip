
variable "aws_region" {
  description = "The AWS region to deploy to."
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "The name of the application."
  type        = string
  default     = "slay-drip"
}

variable "environment" {
  description = "The environment to deploy to."
  type        = string
  default     = "dev"
}

variable "docker_image_url" {
  description = "The URL of the Docker image to deploy."
  type        = string
}

variable "subnet_ids" {
  description = "The subnet IDs to deploy to."
  type        = list(string)
}

variable "security_group_ids" {
  description = "The security group IDs to deploy to."
  type        = list(string)
}
