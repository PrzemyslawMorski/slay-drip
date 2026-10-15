# Keycloak identity provider (F11 spike, see ADR-0001)
# Self-hosted Keycloak on a Scaleway Serverless Container, with its own Serverless SQL Database.
# Keycloak is stateful: sessions and users live in its database. Keep its database separate from the app's.

# Separate Serverless SQL Database for Keycloak's schema
resource "scaleway_sdb_sql_database" "keycloak" {
  name       = "${var.app_name}-keycloak-${var.environment}"
  min_cpu    = 0
  max_cpu    = 2
  region     = var.scw_region
  project_id = var.scw_project_id
}

# Serverless Containers namespace for Keycloak
resource "scaleway_container_namespace" "keycloak" {
  name        = "${var.app_name}-keycloak-${var.environment}"
  description = "Identity provider (Keycloak) for ${var.app_name} (${var.environment})"
  region      = var.scw_region
  project_id  = var.scw_project_id
}

resource "scaleway_container" "keycloak" {
  namespace_id = scaleway_container_namespace.keycloak.id
  name         = "${var.app_name}-keycloak-${var.environment}"
  description  = "Keycloak for ${var.app_name} (${var.environment})"
  region       = var.scw_region
  image        = var.keycloak_image
  port         = 8080
  # The image entrypoint is kc.sh, so "start" is passed as an argument.
  # Confirm on the first real deploy that the container runs "start" and not a bare kc.sh.
  args = ["start"]

  # Keycloak needs more memory than the API. Tune after the spike measures it.
  cpu_limit          = 1000
  memory_limit_bytes = 1073741824
  # 0 = scale to zero (cold starts). 1 = always warm. The spike compares both.
  min_scale = var.keycloak_min_scale
  max_scale = 1
  timeout   = 30

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true

  environment_variables = {
    KC_DB                       = "postgres"
    KC_HTTP_ENABLED             = "true"
    KC_PROXY_HEADERS            = "xforwarded"
    KC_HEALTH_ENABLED           = "true"
    KC_HOSTNAME_STRICT          = "false"
    KC_BOOTSTRAP_ADMIN_USERNAME = var.keycloak_admin_username
  }

  # Secrets come from the container's secret environment, never from the repo.
  secret_environment_variables = {
    KC_DB_URL                   = var.keycloak_database_url
    KC_DB_USERNAME              = var.keycloak_database_username
    KC_DB_PASSWORD              = var.keycloak_database_password
    KC_BOOTSTRAP_ADMIN_PASSWORD = var.keycloak_admin_password
  }
}

# Outputs (no secrets)
output "keycloak_url" {
  description = "Public HTTPS endpoint of Keycloak (OpenID discovery is under /realms/<realm>/.well-known/openid-configuration)"
  value       = scaleway_container.keycloak.public_endpoint
}

output "keycloak_database_endpoint" {
  description = "Endpoint of the Keycloak Serverless SQL Database"
  value       = scaleway_sdb_sql_database.keycloak.endpoint
}
