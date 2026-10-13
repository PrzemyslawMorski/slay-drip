
# Remote state lives in a Scaleway Object Storage bucket. The "s3" backend is the
# generic S3-API client; it is pointed at Scaleway's S3-compatible endpoint below.
# The bucket must exist before `terraform init` (create it once in the Scaleway console).
#
# Access keys come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, which must be set to
# the Scaleway access key and secret key (see terraform/local-run.readme).
terraform {
  backend "s3" {
    bucket = "slay-drip-tfstate"
    # Separate key from the retired AWS state so the two can never overwrite each other
    key    = "scaleway/terraform.tfstate"
    region = "fr-par"

    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
