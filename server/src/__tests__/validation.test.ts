import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';

describe('Authentication Validation Schema Test Suite', () => {
  describe('registerSchema', () => {
    it('should accept valid registration inputs', () => {
      const valid = {
        name: 'Valid Name',
        email: 'user@example.com',
        password: 'Password123!',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject names shorter than 2 characters', () => {
      const invalid = {
        name: 'A',
        email: 'user@example.com',
        password: 'Password123!',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email formats', () => {
      const invalid = {
        name: 'User',
        email: 'invalid-email-address',
        password: 'Password123!',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const invalid = {
        name: 'User',
        email: 'user@example.com',
        password: 'Pass1',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login inputs', () => {
      const valid = {
        email: 'user@example.com',
        password: 'anyPassword',
      };
      const result = loginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing or invalid email', () => {
      const invalid = {
        email: 'not-email',
        password: 'password',
      };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalid = {
        email: 'user@example.com',
        password: '',
      };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should accept valid refresh token payload', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 'some-valid-token' });
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token payload', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });
});
