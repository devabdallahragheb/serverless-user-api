import { UserService } from './src/services/user.service.js';
import { ResponseBuilder } from './src/utils/response.js';
import { RequestParser } from './src/utils/request-parser.js';
import { lambdaWrapper } from './src/middleware/lambda-wrapper.js';

const userService = new UserService();

const getUserHandler = async (event) => {
  const userId = RequestParser.getPathParameter(event, 'id');
  const user = await userService.getUserById(userId);
  return ResponseBuilder.success(user);
};

export const handler = lambdaWrapper(getUserHandler);
