import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface CorrelatedRequest extends Request {
  id?: string;
}

export function requestCorrelation(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : randomUUID();

  (req as CorrelatedRequest).id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
