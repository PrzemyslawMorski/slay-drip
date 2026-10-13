# Frontend Deployment Resources
# Object Storage bucket served as a static website (PWA build output)

resource "scaleway_object_bucket" "frontend_bucket" {
  name       = "${var.app_name}-frontend-${var.environment}"
  region     = var.scw_region
  project_id = var.scw_project_id

  versioning {
    enabled = true
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  tags = {
    Name        = "${var.app_name} Frontend Bucket"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Public read access for the static site
resource "scaleway_object_bucket_policy" "frontend_bucket_policy" {
  bucket     = scaleway_object_bucket.frontend_bucket.name
  region     = var.scw_region
  project_id = var.scw_project_id

  policy = jsonencode({
    Version = "2023-04-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${scaleway_object_bucket.frontend_bucket.name}/*"
      },
    ]
  })
}

# Website hosting: index and SPA fallback for client-side routing
resource "scaleway_object_bucket_website_configuration" "frontend_bucket_website" {
  bucket = scaleway_object_bucket.frontend_bucket.name
  region = var.scw_region

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Outputs
output "frontend_bucket_name" {
  description = "Name of the Object Storage bucket hosting the frontend"
  value       = scaleway_object_bucket.frontend_bucket.name
}

output "frontend_website_url" {
  description = "Public URL of the frontend website (no CDN in front of it yet)"
  value       = "https://${scaleway_object_bucket.frontend_bucket.name}.s3-website.${var.scw_region}.scw.cloud"
}
