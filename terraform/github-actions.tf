# CI access for GitHub Actions
# Scaleway has no OIDC federation for GitHub, so CI uses a dedicated IAM application
# with a long-lived API key. Store its key pair in the GitHub environment secrets
# (see terraform/local-run.readme and docs/requirements.md).

resource "scaleway_iam_application" "github_actions" {
  name        = "${var.app_name}-github-actions-${var.environment}"
  description = "GitHub Actions deploy access for ${var.app_name} (${var.environment})"
}

resource "scaleway_iam_policy" "github_actions" {
  name           = "${var.app_name}-github-actions-policy-${var.environment}"
  description    = "Deploy permissions for ${var.app_name} (${var.environment})"
  application_id = scaleway_iam_application.github_actions.id

  rule {
    project_ids = [var.scw_project_id]
    permission_set_names = [
      "ObjectStorageFullAccess",
      "ContainerRegistryFullAccess",
      "ServerlessContainersFullAccess",
      "ServerlessSQLDatabaseFullAccess",
    ]
  }
}

resource "scaleway_iam_api_key" "github_actions" {
  application_id = scaleway_iam_application.github_actions.id
  description    = "GitHub Actions key for ${var.app_name} (${var.environment})"
}

# Set these as GitHub environment secrets: SCW_ACCESS_KEY and SCW_SECRET_KEY
output "github_actions_access_key" {
  description = "Access key for GitHub Actions (SCW_ACCESS_KEY)"
  value       = scaleway_iam_api_key.github_actions.access_key
}

output "github_actions_secret_key" {
  description = "Secret key for GitHub Actions (SCW_SECRET_KEY)"
  value       = scaleway_iam_api_key.github_actions.secret_key
  sensitive   = true
}
