terraform {
  backend "s3" {
    bucket       = "slay-drip-tfstate"
    key          = "terraform.tfstate"
    region       = "eu-central-1"
    
    use_lockfile = true
    encrypt      = true
  }
} 
