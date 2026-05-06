import { UserService } from './src/services/user.service.js';
import { ResponseBuilder } from './src/utils/response.js';
import { RequestParser } from './src/utils/request-parser.js';
import { lambdaWrapper } from './src/middleware/lambda-wrapper.js';
import { SUCCESS_MESSAGES } from './src/constants/error-messages.js';

const userService = new UserService();

const deleteUserHandler = async (event) => {
  const userId = RequestParser.getPathParameter(event, 'id');
  const result = await userService.deleteUser(userId);
  return ResponseBuilder.success(result, SUCCESS_MESSAGES.USER_DELETED);
};

export const handler = lambdaWrapper(deleteUserHandler);
