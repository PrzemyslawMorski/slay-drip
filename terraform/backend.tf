terraform {
  backend "s3" {
    bucket         = "slay-drip-tfstate"
    key            = "terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "slay-drip-tfstate-lock"
    encrypt        = true
  }
} 