class Logger {
  constructor() {
    this.context = 'Lambda';
  }

  setContext(context) {
    this.context = context;
    return this;
  }

  _log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message, meta) {
    this._log('INFO', message, meta);
  }

  error(message, error, meta) {
    this._log('ERROR', message, {
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
        ...(error.statusCode && { statusCode: error.statusCode })
      }
    });
  }

  warn(message, meta) {
    this._log('WARN', message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      this._log('DEBUG', message, meta);
    }
  }
}

export const logger = new Logger();
