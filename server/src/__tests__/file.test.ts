import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
      },
      file: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      activity: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('File Management & Upload Suite (Stage 9)', () => {
  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Johnson',
    email: 'alex@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Project Lead',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outsider = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tokenA = generateAccessToken({ userId: userA.id, email: userA.email });
  const tokenOutsider = generateAccessToken({ userId: outsider.id, email: outsider.email });

  const mockProject = {
    id: 'proj-123',
    name: 'DevSync Web',
    description: 'Main project',
    status: ProjectStatus.ACTIVE,
    ownerId: userA.id,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'pm-1',
        projectId: 'proj-123',
        userId: userA.id,
        role: ProjectRole.OWNER,
      },
    ],
  };

  const mockFile = {
    id: 'file-1',
    fileName: 'architecture.pdf',
    fileUrl: '/uploads/test-file.pdf',
    mimeType: 'application/pdf',
    fileSize: 10240,
    projectId: 'proj-123',
    uploadedById: userA.id,
    createdAt: new Date(),
    uploadedBy: userA,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === userA.id || where.email === userA.email) return Promise.resolve(userA);
      if (where.id === outsider.id || where.email === outsider.email)
        return Promise.resolve(outsider);
      return Promise.resolve(null);
    });
  });

  describe('File Upload & Listing Endpoints', () => {
    it('POST /api/files/project/:projectId should upload a file for project member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.file.create as jest.Mock).mockResolvedValue(mockFile);
      (prisma.activity.create as jest.Mock).mockResolvedValue({ id: 'act-1' });

      const res = await request(app)
        .post(`/api/files/project/${mockProject.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', Buffer.from('Mock file contents'), 'architecture.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('architecture.pdf');
    });

    it('GET /api/files/project/:projectId should return list of project files', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([mockFile]);

      const res = await request(app)
        .get(`/api/files/project/${mockProject.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].id).toBe(mockFile.id);
    });

    it('GET /api/files/project/:projectId should reject non-members with 403 Forbidden', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .get(`/api/files/project/${mockProject.id}`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });

  describe('File Deletion', () => {
    it('DELETE /api/files/:fileId should allow uploader to delete file', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prisma.file.delete as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(204);
      expect(prisma.file.delete).toHaveBeenCalled();
    });

    it('DELETE /api/files/:fileId should reject unauthorized user with 403 Forbidden', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });
});
