output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.users_table.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.users_table.arn
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_stage.lambda_api_stage.invoke_url
}

output "lambda_functions" {
  description = "Lambda function names"
  value = {
    create = aws_lambda_function.create_user.function_name
    get    = aws_lambda_function.get_user.function_name
    list   = aws_lambda_function.list_users.function_name
    update = aws_lambda_function.update_user.function_name
    delete = aws_lambda_function.delete_user.function_name
  }
}
