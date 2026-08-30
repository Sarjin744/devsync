import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../utils/jwt';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

describe('User Profile & Search Suite (Stage 4)', () => {
  const mockUser = {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'Alex Rivera',
    email: 'alex.dev@devsync.local',
    passwordHash: '',
    profileImage: 'https://example.com/avatar.png',
    bio: 'Full-Stack Developer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let validToken: string;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
    validToken = generateAccessToken({ userId: mockUser.id, email: mockUser.email });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Get Profile (GET /api/users/me) ─────────────────────────────
  describe('GET /api/users/me', () => {
    it('should return the authenticated user profile without passwordHash', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockUser.id);
      expect(res.body.data.name).toBe(mockUser.name);
      expect(res.body.data.email).toBe(mockUser.email);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Update Profile (PATCH /api/users/me) ─────────────────────────
  describe('PATCH /api/users/me', () => {
    it('should update name, bio, and profile image successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: 'Alex Updated',
        bio: 'Senior Software Engineer',
      });

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Alex Updated',
          bio: 'Senior Software Engineer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alex Updated');
      expect(res.body.data.bio).toBe('Senior Software Engineer');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject invalid input (e.g. name too short)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'A',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 3. Change Password (PATCH /api/users/me/password) ──────────────
  describe('PATCH /api/users/me/password', () => {
    it('should change password successfully and revoke existing refresh tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it('should reject change password if current password is wrong (401)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject change password if confirm password does not match (400)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'MismatchedPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 4. User Search (GET /api/users/search?q=) ──────────────────────
  describe('GET /api/users/search', () => {
    it('should return paginated user search results', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Sarah Connor',
          email: 'sarah@devsync.local',
          profileImage: null,
          bio: null,
          isOnline: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/users/search?q=sarah')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.users[0].name).toBe('Sarah Connor');
      expect(res.body.data.users[0].passwordHash).toBeUndefined();
    });

    it('should reject search with empty query (400)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/users/search?q=')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
