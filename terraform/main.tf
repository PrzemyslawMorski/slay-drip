
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "app_bucket" {
  bucket = "slay-drip-app-bucket"

  tags = {
    Name        = "Slay Drip App Bucket"
    Environment = "Dev"
  }
}
