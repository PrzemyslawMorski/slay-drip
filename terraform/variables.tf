
variable "scw_region" {
  description = "The Scaleway region to deploy to. Must be an EU region (fr-par, nl-ams or pl-waw)."
  type        = string
  default     = "fr-par"

  validation {
    condition     = contains(["fr-par", "nl-ams", "pl-waw"], var.scw_region)
    error_message = "scw_region must be an EU Scaleway region: fr-par, nl-ams or pl-waw."
  }
}

variable "scw_zone" {
  description = "The Scaleway availability zone within scw_region."
  type        = string
  default     = "fr-par-1"
}

variable "scw_project_id" {
  description = "The Scaleway project ID that owns the resources. Set via TF_VAR_scw_project_id."
  type        = string
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

variable "database_url" {
  description = "PostgreSQL connection string for the Serverless SQL Database, passed to the API container as a secret. Set via TF_VAR_database_url."
  type        = string
  sensitive   = true
}
