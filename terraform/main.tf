
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
  
  # Explicitly disable SSO and use default credentials
  shared_credentials_files = ["~/.aws/credentials"]
  profile                  = "default"
}
