import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { CorrelatedRequest } from './requestCorrelation';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const reqId = (req as CorrelatedRequest).id || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Do not flood logs with health check probes unless debugging
    if (req.path === '/health' || req.path === '/api/health') {
      return;
    }

    const logPayload = `${req.method} ${req.originalUrl || req.path} ${statusCode} - ${duration}ms [reqId: ${reqId}]`;

    if (statusCode >= 500) {
      logger.error(logPayload);
    } else if (statusCode >= 400) {
      logger.warn(logPayload);
    } else {
      logger.info(logPayload);
    }
  });

  next();
}
