# Lambda Functions for Slay Drip Backend

# DynamoDB Table for backend data
resource "aws_dynamodb_table" "backend_table" {
  name         = "${var.app_name}-table-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  # Global Secondary Index for user queries
  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "pk"
    projection_type = "INCLUDE"
    non_key_attributes = [
      "name",
      "category",
      "image_url",
      "created",
      "updated",
      "item_type"
    ]
  }

  # Global Secondary Index for category queries
  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    range_key       = "pk"
    projection_type = "INCLUDE"
    non_key_attributes = [
      "name",
      "user_id",
      "image_url",
      "created",
      "updated",
      "item_type"
    ]
  }

  tags = {
    Name        = "${var.app_name}-table-${var.environment}"
    Environment = var.environment
  }
}

# S3 Bucket for Lambda deployment packages
resource "aws_s3_bucket" "lambda_deployment" {
  bucket = "${var.app_name}-lambda-deployment-${var.environment}"

  tags = {
    Name        = "${var.app_name}-lambda-deployment-${var.environment}"
    Environment = var.environment
  }
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_execution" {
  name = "${var.app_name}-lambda-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-lambda-execution-role-${var.environment}"
    Environment = var.environment
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for Lambda to access DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.app_name}-lambda-dynamodb-policy-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.backend_table.arn,
          "${aws_dynamodb_table.backend_table.arn}/index/*"
        ]
      }
    ]
  })
}

# Lambda Functions
locals {
  lambda_functions = {
    "get-items" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
    "get-item" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
    "create-item" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
    "get-outfits" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
    "get-outfit" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
    "create-outfit" = {
      handler     = "bootstrap"
      runtime     = "provided.al2"
      timeout     = 30
      memory_size = 128
    }
  }
}

# Create Lambda functions
resource "aws_lambda_function" "backend_functions" {
  for_each = local.lambda_functions

  function_name = "${var.app_name}-${each.key}-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = each.value.handler
  runtime       = each.value.runtime
  timeout       = each.value.timeout
  memory_size   = each.value.memory_size

  # Source code will be uploaded by GitHub Actions
  filename = "dummy.zip" # Placeholder, will be replaced by actual deployment

  environment {
    variables = {
      ENVIRONMENT = var.environment
      TABLE_NAME  = aws_dynamodb_table.backend_table.name
    }
  }

  tags = {
    Name        = "${var.app_name}-${each.key}-${var.environment}"
    Environment = var.environment
    Function    = each.key
  }
}

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.app_name}-api-${var.environment}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.app_name}-api-${var.environment}"
    Environment = var.environment
  }
}

# API Gateway Resources
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "v1" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "v1"
}

resource "aws_api_gateway_resource" "items" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "items"
}

resource "aws_api_gateway_resource" "item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.items.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "outfits" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "outfits"
}

resource "aws_api_gateway_resource" "outfit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.outfits.id
  path_part   = "{id}"
}

# API Gateway Methods
resource "aws_api_gateway_method" "get_items" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.items.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "create_item" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.items.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "get_item" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.item.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "get_outfits" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.outfits.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "create_outfit" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.outfits.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "get_outfit" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.outfit.id
  http_method   = "GET"
  authorization = "NONE"
}

# API Gateway Integrations
resource "aws_api_gateway_integration" "get_items" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.items.id
  http_method = aws_api_gateway_method.get_items.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["get-items"].invoke_arn
}

resource "aws_api_gateway_integration" "create_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.items.id
  http_method = aws_api_gateway_method.create_item.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["create-item"].invoke_arn
}

resource "aws_api_gateway_integration" "get_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.item.id
  http_method = aws_api_gateway_method.get_item.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["get-item"].invoke_arn
}

resource "aws_api_gateway_integration" "get_outfits" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.outfits.id
  http_method = aws_api_gateway_method.get_outfits.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["get-outfits"].invoke_arn
}

resource "aws_api_gateway_integration" "create_outfit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.outfits.id
  http_method = aws_api_gateway_method.create_outfit.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["create-outfit"].invoke_arn
}

resource "aws_api_gateway_integration" "get_outfit" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.outfit.id
  http_method = aws_api_gateway_method.get_outfit.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_functions["get-outfit"].invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "get_items" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["get-items"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_item" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["create-item"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_item" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["get-item"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_outfits" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["get-outfits"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_outfit" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["create-outfit"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_outfit" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_functions["get-outfit"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Deployment (updated to use modern approach)
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.get_items,
    aws_api_gateway_integration.create_item,
    aws_api_gateway_integration.get_item,
    aws_api_gateway_integration.get_outfits,
    aws_api_gateway_integration.create_outfit,
    aws_api_gateway_integration.get_outfit,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage (modern approach)
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  tags = {
    Name        = "${var.app_name}-api-stage-${var.environment}"
    Environment = var.environment
  }
}

# Outputs (updated to use stage)
output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "${aws_api_gateway_stage.main.invoke_url}"
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.backend_table.name
}

output "lambda_functions" {
  description = "Map of Lambda function names"
  value = {
    for k, v in aws_lambda_function.backend_functions : k => v.function_name
  }
}
