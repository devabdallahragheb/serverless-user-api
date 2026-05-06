import { ResponseBuilder } from '../utils/response.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/http-status.js';

export const errorHandler = (error) => {
  logger.error('Error occurred', error);

  if (error instanceof AppError && error.isOperational) {
    return ResponseBuilder.error(error, error.statusCode);
  }

  return ResponseBuilder.error(
    { message: 'An unexpected error occurred' },
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};
