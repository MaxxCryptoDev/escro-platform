import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    err,
    req_id: req.id,
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl,
    status,
  }, message);

  if (status >= 500 && process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        req_id: req.id,
        userId: req.user?.id,
        method: req.method,
        url: req.originalUrl,
      },
    });
  }

  res.status(status).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
