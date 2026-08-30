import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} ${_res.statusCode} - ${duration}ms`);
  });
  next();
}
