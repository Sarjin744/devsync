import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

export interface TokenUserPayload {
  userId: string;
  email: string;
}

export interface AccessTokenClaims extends TokenUserPayload {
  iat: number;
  exp: number;
}

export interface RefreshTokenClaims {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

/**
 * Generates a short-lived JWT access token.
 */
export function generateAccessToken(payload: TokenUserPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as jwt.SignOptions,
  );
}

/**
 * Generates a long-lived JWT refresh token with unique token ID.
 */
export function generateRefreshToken(userId: string, tokenId: string = crypto.randomUUID()): string {
  return jwt.sign(
    { userId, tokenId },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as jwt.SignOptions,
  );
}

/**
 * Verifies an access token and returns its decoded payload.
 */
export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenClaims;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Verifies a refresh token and returns its decoded payload.
 */
export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

/**
 * Creates a deterministic cryptographic hash of a refresh token for safe database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
