import { HTTP_STATUS } from '../constants/http-status.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export class ResponseBuilder {
  static success(data, statusCode = HTTP_STATUS.OK, message = null) {
    const body = message ? { success: true, message, data } : { success: true, data };
    
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify(body)
    };
  }

  static created(data, message = 'Resource created successfully') {
    return this.success(data, HTTP_STATUS.CREATED, message);
  }

  static error(error, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    const body = {
      success: false,
      error: {
        message: error.message || 'An error occurred',
        ...(error.errors && { details: error.errors }),
        ...(process.env.NODE_ENV === 'development' && error.stack && { stack: error.stack })
      }
    };

    return {
      statusCode: error.statusCode || statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify(body)
    };
  }

  static validationError(message, errors = []) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          message,
          details: errors
        }
      })
    };
  }

  static notFound(message = 'Resource not found') {
    return {
      statusCode: HTTP_STATUS.NOT_FOUND,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: { message }
      })
    };
  }
}
