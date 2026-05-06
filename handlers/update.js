import { UserService } from './src/services/user.service.js';
import { ResponseBuilder } from './src/utils/response.js';
import { RequestParser } from './src/utils/request-parser.js';
import { lambdaWrapper } from './src/middleware/lambda-wrapper.js';
import { SUCCESS_MESSAGES } from './src/constants/error-messages.js';

const userService = new UserService();

const updateUserHandler = async (event) => {
  const userId = RequestParser.getPathParameter(event, 'id');
  const updateData = RequestParser.parseBody(event);
  const user = await userService.updateUser(userId, updateData);
  return ResponseBuilder.success(user, SUCCESS_MESSAGES.USER_UPDATED);
};

export const handler = lambdaWrapper(updateUserHandler);
