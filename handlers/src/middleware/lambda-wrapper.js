import { errorHandler } from './error-handler.js';
import { logger } from '../utils/logger.js';

export const lambdaWrapper = (handler) => {
  return async (event, context) => {
    const requestId = context.requestId;
    
    logger.info('Lambda invocation started', {
      requestId,
      path: event.path,
      method: event.httpMethod
    });

    try {
      const result = await handler(event, context);
      
      logger.info('Lambda invocation completed', {
        requestId,
        statusCode: result.statusCode
      });

      return result;
    } catch (error) {
      logger.error('Lambda invocation failed', error, { requestId });
      return errorHandler(error);
    }
  };
};
