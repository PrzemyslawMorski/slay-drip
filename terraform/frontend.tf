# Frontend Deployment Resources
# S3 Bucket for static website hosting
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.app_name}-frontend-${var.environment}"

  tags = {
    Name        = "${var.app_name} Frontend Bucket"
    Environment = var.environment
    Project     = var.app_name
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "frontend_bucket_versioning" {
  bucket = aws_s3_bucket.frontend_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "frontend_bucket_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Acceleration Configuration
resource "aws_s3_bucket_accelerate_configuration" "frontend_bucket_acceleration" {
  bucket = aws_s3_bucket.frontend_bucket.id
  status = "Enabled"
  
  # Handle existing buckets with acceleration already enabled
  lifecycle {
    ignore_changes = [status]
  }
}

# S3 Bucket Request Payment Configuration
resource "aws_s3_bucket_request_payment_configuration" "frontend_bucket_request_payment" {
  bucket = aws_s3_bucket.frontend_bucket.id
  payer  = "BucketOwner"
}

# S3 Bucket Policy for Public Read Access
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_public_access]
}

# S3 Bucket Website Configuration
resource "aws_s3_bucket_website_configuration" "frontend_bucket_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# S3 Bucket CORS Configuration for PWA
resource "aws_s3_bucket_cors_configuration" "frontend_bucket_cors" {
  bucket = aws_s3_bucket.frontend_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend_distribution" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Use only North America and Europe for the moment

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = "200"
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = "200"
    response_page_path = "/index.html"
  }

  # Additional error responses for PWA support
  custom_error_response {
    error_code         = 400
    response_code      = "200"
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 500
    response_code      = "200"
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 24 hours
    max_ttl                = 31536000 # 1 year
  }

  # Cache behavior for PWA manifest and service worker
  ordered_cache_behavior {
    path_pattern     = "/manifest.json"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600     # 1 hour (allow updates)
    max_ttl                = 86400    # 24 hours
  }

  # Cache behavior for service worker (no caching)
  ordered_cache_behavior {
    path_pattern     = "/service-worker.js"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0        # No caching for service worker
    max_ttl                = 0
  }

  # Cache behavior for PWA icons and assets
  ordered_cache_behavior {
    path_pattern     = "/logo*.png"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 24 hours
    max_ttl                = 31536000 # 1 year
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.app_name} Frontend Distribution"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Outputs
output "frontend_bucket_name" {
  description = "Name of the S3 bucket hosting the frontend"
  value       = aws_s3_bucket.frontend_bucket.bucket
}

output "frontend_website_endpoint" {
  description = "S3 website endpoint"
  value       = aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "frontend_cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.frontend_distribution.domain_name}"
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend_distribution.id
} 