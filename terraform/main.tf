terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "users_table" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "dynmo-crud"
  }
}

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

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
}

resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "${var.project_name}-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.users_table.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

data "archive_file" "lambda_zip" {
  for_each = toset(["create", "get", "list", "update", "delete"])
  
  type        = "zip"
  source_file = "${path.module}/../handlers/${each.key}.js"
  output_path = "${path.module}/lambda_${each.key}.zip"
}

resource "aws_lambda_function" "create_user" {
  filename         = data.archive_file.lambda_zip["create"].output_path
  function_name    = "${var.project_name}-create-user"
  role            = aws_iam_role.lambda_role.arn
  handler         = "create.handler"
  source_code_hash = data.archive_file.lambda_zip["create"].output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.users_table.name
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_lambda_function" "get_user" {
  filename         = data.archive_file.lambda_zip["get"].output_path
  function_name    = "${var.project_name}-get-user"
  role            = aws_iam_role.lambda_role.arn
  handler         = "get.handler"
  source_code_hash = data.archive_file.lambda_zip["get"].output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.users_table.name
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_lambda_function" "list_users" {
  filename         = data.archive_file.lambda_zip["list"].output_path
  function_name    = "${var.project_name}-list-users"
  role            = aws_iam_role.lambda_role.arn
  handler         = "list.handler"
  source_code_hash = data.archive_file.lambda_zip["list"].output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.users_table.name
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_lambda_function" "update_user" {
  filename         = data.archive_file.lambda_zip["update"].output_path
  function_name    = "${var.project_name}-update-user"
  role            = aws_iam_role.lambda_role.arn
  handler         = "update.handler"
  source_code_hash = data.archive_file.lambda_zip["update"].output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.users_table.name
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_lambda_function" "delete_user" {
  filename         = data.archive_file.lambda_zip["delete"].output_path
  function_name    = "${var.project_name}-delete-user"
  role            = aws_iam_role.lambda_role.arn
  handler         = "delete.handler"
  source_code_hash = data.archive_file.lambda_zip["delete"].output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.users_table.name
      AWS_REGION = var.aws_region
    }
  }
}

resource "aws_apigatewayv2_api" "lambda_api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_stage" "lambda_api_stage" {
  api_id      = aws_apigatewayv2_api.lambda_api.id
  name        = var.environment
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  for_each = {
    create = aws_lambda_function.create_user
    get    = aws_lambda_function.get_user
    list   = aws_lambda_function.list_users
    update = aws_lambda_function.update_user
    delete = aws_lambda_function.delete_user
  }

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.lambda_api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "create_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.create_user.invoke_arn
}

resource "aws_apigatewayv2_route" "create_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.create_integration.id}"
}

resource "aws_apigatewayv2_integration" "list_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.list_users.invoke_arn
}

resource "aws_apigatewayv2_route" "list_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.list_integration.id}"
}

resource "aws_apigatewayv2_integration" "get_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.get_user.invoke_arn
}

resource "aws_apigatewayv2_route" "get_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "GET /users/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.get_integration.id}"
}

resource "aws_apigatewayv2_integration" "update_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.update_user.invoke_arn
}

resource "aws_apigatewayv2_route" "update_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "PATCH /users/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.update_integration.id}"
}

resource "aws_apigatewayv2_integration" "delete_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.delete_user.invoke_arn
}

resource "aws_apigatewayv2_route" "delete_route" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "DELETE /users/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.delete_integration.id}"
}
