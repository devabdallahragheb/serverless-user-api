import { UserService } from './src/services/user.service.js';
import { ResponseBuilder } from './src/utils/response.js';
import { RequestParser } from './src/utils/request-parser.js';
import { lambdaWrapper } from './src/middleware/lambda-wrapper.js';

const userService = new UserService();

const listUsersHandler = async (event) => {
  const paginationParams = {
    limit: RequestParser.getQueryParameter(event, 'limit'),
    lastEvaluatedKey: RequestParser.getQueryParameter(event, 'nextToken'),
    sortOrder: RequestParser.getQueryParameter(event, 'sortOrder')
  };

  const filterParams = {
    role: RequestParser.getQueryParameter(event, 'role'),
    name: RequestParser.getQueryParameter(event, 'name'),
    email: RequestParser.getQueryParameter(event, 'email')
  };

  const result = await userService.getAllUsers(paginationParams, filterParams);
  return ResponseBuilder.success(result);
};

export const handler = lambdaWrapper(listUsersHandler);
