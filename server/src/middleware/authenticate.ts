import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Enforces JWT Bearer authentication on protected endpoints.
 * Validates the token, ensures the user still exists in the database,
 * and attaches userId and userEmail to the request.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token is required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Access token is required');
  }

  const payload = verifyAccessToken(token);

  // Verify that the user still exists in the database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new UnauthorizedError('User account not found');
  }

  (req as AuthenticatedRequest).userId = user.id;
  (req as AuthenticatedRequest).userEmail = user.email;

  next();
}

/**
 * Optional authentication — attaches user credentials if a valid token is present,
 * but allows unauthenticated requests to proceed.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = payload.userId;
    (req as AuthenticatedRequest).userEmail = payload.email;
  } catch {
    // Token invalid or expired — proceed as unauthenticated without failing
  }

  next();
}
