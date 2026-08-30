import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

describe('JWT Utility Test Suite', () => {
  const sampleUser = {
    userId: 'user-uuid-1234',
    email: 'test@devsync.local',
  };

  it('should generate and verify a valid access token', () => {
    const token = generateAccessToken(sampleUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const claims = verifyAccessToken(token);
    expect(claims.userId).toBe(sampleUser.userId);
    expect(claims.email).toBe(sampleUser.email);
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it('should generate and verify a valid refresh token', () => {
    const refreshToken = generateRefreshToken(sampleUser.userId, 'custom-token-id');
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.split('.')).toHaveLength(3);

    const claims = verifyRefreshToken(refreshToken);
    expect(claims.userId).toBe(sampleUser.userId);
    expect(claims.tokenId).toBe('custom-token-id');
  });

  it('should reject invalid or tampered access tokens', () => {
    expect(() => verifyAccessToken('tampered.jwt.token')).toThrow(UnauthorizedError);
  });

  it('should reject invalid or tampered refresh tokens', () => {
    expect(() => verifyRefreshToken('tampered.refresh.token')).toThrow(UnauthorizedError);
  });

  it('should generate deterministic SHA-256 hash for refresh tokens', () => {
    const token = 'sample-refresh-token-value';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
    expect(hash1).not.toBe(token);
  });
});
