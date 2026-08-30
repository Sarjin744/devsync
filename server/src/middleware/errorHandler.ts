import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { CorrelatedRequest } from './requestCorrelation';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const reqId = (req as CorrelatedRequest).id;

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      success: false,
      error: messages || 'Validation failed',
      code: 'VALIDATION_ERROR',
      requestId: reqId,
      details: err.errors,
    });
    return;
  }

  // 2. Handle known operational application errors
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      requestId: reqId,
    });
    return;
  }

  // 3. Handle Prisma known request errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this unique value already exists',
        code: 'DUPLICATE_RESOURCE',
        requestId: reqId,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'The requested record was not found',
        code: 'RECORD_NOT_FOUND',
        requestId: reqId,
      });
      return;
    }
  }

  // 4. Handle JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      requestId: reqId,
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      requestId: reqId,
    });
    return;
  }

  // 5. Unhandled / Unexpected server errors
  logger.error(`[UNHANDLED ERROR] [reqId: ${reqId}] ${err.message}`, err.stack);

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected server error occurred'
        : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    requestId: reqId,
  });
}
