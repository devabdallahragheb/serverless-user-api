import { ValidationError } from '../errors/app-error.js';
import { ERROR_MESSAGES } from '../constants/error-messages.js';

export class RequestParser {
  static parseBody(event) {
    if (!event.body) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_REQUEST_BODY);
    }

    try {
      return JSON.parse(event.body);
    } catch (error) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_REQUEST_BODY);
    }
  }

  static getPathParameter(event, paramName) {
    const param = event.pathParameters?.[paramName];
    
    if (!param) {
      throw new ValidationError(`Missing required path parameter: ${paramName}`);
    }

    return param;
  }

  static getQueryParameter(event, paramName, defaultValue = null) {
    return event.queryStringParameters?.[paramName] || defaultValue;
  }
}
