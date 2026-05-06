import { UserService } from './src/services/user.service.js';
import { ResponseBuilder } from './src/utils/response.js';
import { RequestParser } from './src/utils/request-parser.js';
import { lambdaWrapper } from './src/middleware/lambda-wrapper.js';
import { SUCCESS_MESSAGES } from './src/constants/error-messages.js';

const userService = new UserService();

const createUserHandler = async (event) => {
  const userData = RequestParser.parseBody(event);
  const user = await userService.createUser(userData);
  return ResponseBuilder.created(user, SUCCESS_MESSAGES.USER_CREATED);
};

export const handler = lambdaWrapper(createUserHandler);
