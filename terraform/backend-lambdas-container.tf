# Backend API (Scaleway Serverless Containers, container image from Scaleway Container Registry)
# Replaces the earlier AWS Lambda + DynamoDB + API Gateway stack.

# Container Registry for the API image
resource "scaleway_registry_namespace" "api" {
  name        = "${var.app_name}-${var.environment}"
  description = "Container images for ${var.app_name} (${var.environment})"
  region      = var.scw_region
  project_id  = var.scw_project_id
  is_public   = false
}

# Serverless SQL Database (PostgreSQL-compatible) for items and outfits
resource "scaleway_sdb_sql_database" "main" {
  name       = "${var.app_name}-${var.environment}"
  min_cpu    = 0
  max_cpu    = 2
  region     = var.scw_region
  project_id = var.scw_project_id

}

# Serverless Containers namespace and the API container
resource "scaleway_container_namespace" "api" {
  name        = "${var.app_name}-api-${var.environment}"
  description = "API for ${var.app_name} (${var.environment})"
  region      = var.scw_region
  project_id  = var.scw_project_id
}

resource "scaleway_container" "api" {
  namespace_id   = scaleway_container_namespace.api.id
  name           = "${var.app_name}-api-${var.environment}"
  description    = "Slay Drip REST API"
  region         = var.scw_region
  registry_image = "${scaleway_registry_namespace.api.endpoint}/api:latest"
  port           = 8080

  cpu_limit          = 140
  memory_limit_bytes = 268435456
  min_scale          = 0
  max_scale          = 3
  timeout            = 30

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true

  environment_variables = {
    ENVIRONMENT = var.environment
  }

  secret_environment_variables = {
    DATABASE_URL = var.database_url
  }

}

# Outputs
output "api_url" {
  description = "Public HTTPS endpoint of the API container"
  value       = "${scaleway_container.api.public_endpoint}/api/v1"
}

output "api_container_id" {
  description = "ID of the API container (used to redeploy after pushing a new image)"
  value       = scaleway_container.api.id
}

output "registry_endpoint" {
  description = "Container Registry endpoint for the API image"
  value       = scaleway_registry_namespace.api.endpoint
}

output "database_endpoint" {
  description = "Endpoint of the Serverless SQL Database"
  value       = scaleway_sdb_sql_database.main.endpoint
}
