
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

# Keycloak (F11 spike). Secrets are set via TF_VAR_* and never committed.
variable "keycloak_image" {
  description = "Pinned Keycloak 26.x image. Use a full tag, never 'latest'."
  type        = string
  default     = "quay.io/keycloak/keycloak:26.4"
}

variable "keycloak_min_scale" {
  description = "Minimum Keycloak container instances: 0 scales to zero (cold starts), 1 keeps one warm. The spike compares both."
  type        = number
  default     = 1
}

variable "keycloak_database_url" {
  description = "JDBC URL for Keycloak's Serverless SQL Database. Set via TF_VAR_keycloak_database_url."
  type        = string
  sensitive   = true
}

variable "keycloak_database_username" {
  description = "Database user for Keycloak. Set via TF_VAR_keycloak_database_username."
  type        = string
  sensitive   = true
}

variable "keycloak_database_password" {
  description = "Database password for Keycloak. Set via TF_VAR_keycloak_database_password."
  type        = string
  sensitive   = true
}

variable "keycloak_admin_username" {
  description = "Bootstrap admin username for the Keycloak admin console."
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Bootstrap admin password for Keycloak. Set via TF_VAR_keycloak_admin_password."
  type        = string
  sensitive   = true
}
