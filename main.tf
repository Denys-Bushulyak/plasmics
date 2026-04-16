provider "aws" {
  region = var.aws_region
}

# --- 1. DynamoDB Table ---
resource "aws_dynamodb_table" "counter_table" {
  name         = "${var.project_name}-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }
}

# --- 2. ECR Repository ---
resource "aws_ecr_repository" "backend_repo" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

# --- 3. IAM Role for Lambda ---
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "dynamo_access" {
  name = "DynamoAccess"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
      ]
      Resource = aws_dynamodb_table.counter_table.arn
    }]
  })
}

# --- 4. Lambda Function (Docker) ---
resource "aws_lambda_function" "backend_func" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend_repo.repository_url}:latest"
  timeout       = 10
  memory_size   = 128

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.counter_table.name
      PK_VALUE   = "counter"
      MAX_VALUE  = "1000000000"
      MIN_VALUE  = "0"
      DELTA      = "1"
      REGION     = var.aws_region
    }
  }

  depends_on = [aws_iam_role_policy.dynamo_access]
}

# --- 5. API Gateway (HTTP) ---
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-gateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["*"]
    allow_methods     = ["GET", "POST"]
    allow_origins     = ["*"]
    expose_headers    = ["*"]
    max_age           = 300
  }
}

# Single Lambda integration for all routes
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  integration_uri        = aws_lambda_function.backend_func.invoke_arn
}

# S3 integration for serving frontend static files
resource "aws_apigatewayv2_integration" "s3_integration" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "HTTP_PROXY"
  integration_uri  = "http://${aws_s3_bucket.frontend_bucket.id}.s3-website.${var.aws_region}.amazonaws.com"
  integration_method = "ANY"
}

# GET /current
resource "aws_apigatewayv2_route" "get_counter" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /current"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# POST /increment
resource "aws_apigatewayv2_route" "post_increment" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /increment"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# POST /decrement
resource "aws_apigatewayv2_route" "post_decrement" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /decrement"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# GET / -> S3 root
resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /"
  target    = "integrations/${aws_apigatewayv2_integration.s3_integration.id}"
}

# $default route -> S3 for all other static assets
resource "aws_apigatewayv2_route" "default_s3" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.s3_integration.id}"
}

# Production stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# Lambda permission for HTTP API
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_func.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# --- 6. S3 for Frontend ---
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.project_name}-web-host-2026"
}

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
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket_pab" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_cors_configuration" "frontend_cors" {
  bucket = aws_s3_bucket.frontend_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# --- Outputs ---
output "api_gateway_url" {
  value       = "https://${aws_apigatewayv2_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_apigatewayv2_stage.default.name}"
  description = "API Gateway invoke URL"
}

output "s3_bucket_url" {
  value       = "http://${aws_s3_bucket_website_configuration.frontend_website.website_endpoint}"
  description = "S3 bucket website endpoint"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend_bucket.id
  description = "S3 bucket name for the frontend"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.backend_repo.repository_url
  description = "ECR repository URL for pushing Docker images"
}
