import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt';

// Mock Prisma client methods for deterministic testing
jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

describe('Authentication & Security Suite (Stage 3)', () => {
  const mockUser = {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'Alex Rivera',
    email: 'alex.dev@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Test bio',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let validAccessToken: string;
  let validRefreshToken: string;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
    validAccessToken = generateAccessToken({ userId: mockUser.id, email: mockUser.email });
    validRefreshToken = generateRefreshToken(mockUser.id);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Registration ────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alex Rivera',
          email: 'alex.dev@devsync.local',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never expose passwordHash
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alex Rivera',
          email: 'alex.dev@devsync.local',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject registration with invalid email format (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Pass User',
          email: 'weakpass@devsync.local',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with missing fields (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'missing@devsync.local',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Login ───────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should successfully log in with correct credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with incorrect password (401)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject login with unknown account without leaking email existence (401)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@devsync.local',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  // ─── 3. Protected Route (GET /api/auth/me) ──────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return user profile with valid Bearer token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockUser.id);
      expect(res.body.data.email).toBe(mockUser.email);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should reject request without Bearer token (401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with malformed token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 4. Refresh Tokens ──────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should rotate tokens and return new access and refresh tokens', async () => {
      const tokenHash = hashToken(validRefreshToken);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-2' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should reject revoked or non-existent refresh tokens (401)', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired refresh tokens (401)', async () => {
      const tokenHash = hashToken(validRefreshToken);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 60000), // Expired in the past
        revokedAt: null,
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 5. Logout & Session Revocation ────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should revoke active refresh token session on logout', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });
});
