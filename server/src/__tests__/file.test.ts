import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import app from '../app';
import { initializeSocket } from '../sockets';
import { prisma } from '../config/prisma';
import { generateAccessToken } from '../utils/jwt';
import { storageService } from '../storage/storage.service';
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
        count: jest.fn(),
        update: jest.fn(),
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

describe('File Management & Cloud Storage Suite (Stage 9)', () => {
  let server: HttpServer;

  const ownerUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Owner',
    email: 'alex@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Project Lead',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const devUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sarah Dev',
    email: 'sarah@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Developer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const viewerUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Tom Viewer',
    email: 'tom@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Viewer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outsiderUser = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tokenOwner = generateAccessToken({ userId: ownerUser.id, email: ownerUser.email });
  const tokenDev = generateAccessToken({ userId: devUser.id, email: devUser.email });
  const tokenViewer = generateAccessToken({ userId: viewerUser.id, email: viewerUser.email });
  const tokenOutsider = generateAccessToken({ userId: outsiderUser.id, email: outsiderUser.email });

  const mockProject = {
    id: 'proj-123',
    name: 'DevSync Cloud',
    description: 'Main project',
    status: ProjectStatus.ACTIVE,
    ownerId: ownerUser.id,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      { id: 'pm-1', projectId: 'proj-123', userId: ownerUser.id, role: ProjectRole.OWNER },
      { id: 'pm-2', projectId: 'proj-123', userId: devUser.id, role: ProjectRole.DEVELOPER },
      { id: 'pm-3', projectId: 'proj-123', userId: viewerUser.id, role: ProjectRole.VIEWER },
    ],
  };

  const mockFile = {
    id: 'file-123',
    fileName: 'architecture.pdf',
    originalName: 'architecture.pdf',
    storageKey: 'projects/proj-123/uuid-architecture.pdf',
    fileUrl: 'https://storage.devsync.local/projects/proj-123/uuid-architecture.pdf',
    mimeType: 'application/pdf',
    fileSize: 20480,
    projectId: 'proj-123',
    uploadedById: devUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    uploadedBy: devUser,
  };

  beforeAll(async () => {
    server = createServer(app);
    initializeSocket(server);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === ownerUser.id || where.email === ownerUser.email) return Promise.resolve(ownerUser);
      if (where.id === devUser.id || where.email === devUser.email) return Promise.resolve(devUser);
      if (where.id === viewerUser.id || where.email === viewerUser.email) return Promise.resolve(viewerUser);
      if (where.id === outsiderUser.id || where.email === outsiderUser.email) return Promise.resolve(outsiderUser);
      return Promise.resolve(null);
    });

    (prisma.project.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === mockProject.id) return Promise.resolve(mockProject);
      return Promise.resolve(null);
    });

    (prisma.projectMember.findFirst as jest.Mock).mockImplementation(({ where }) => {
      const match = mockProject.members.find(
        (m) => m.projectId === where.projectId && m.userId === where.userId,
      );
      return Promise.resolve(match || null);
    });
  });

  describe('File Upload Endpoint (POST /api/projects/:projectId/files)', () => {
    it('should upload a valid file for project member and store metadata', async () => {
      jest.spyOn(storageService, 'uploadFile').mockResolvedValue({
        storageKey: 'projects/proj-123/uuid-test.pdf',
        url: 'https://storage.devsync.local/projects/proj-123/uuid-test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      });

      (prisma.file.create as jest.Mock).mockResolvedValue(mockFile);
      (prisma.activity.create as jest.Mock).mockResolvedValue({ id: 'act-1' });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/files`)
        .set('Authorization', `Bearer ${tokenDev}`)
        .attach('file', Buffer.from('PDF content mock'), 'architecture.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalName).toBe('architecture.pdf');
      expect(prisma.file.create).toHaveBeenCalled();
    });

    it('should reject file upload without attachment (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/files`)
        .set('Authorization', `Bearer ${tokenDev}`);

      expect(res.status).toBe(400);
    });

    it('should reject file upload for non-project member (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/files`)
        .set('Authorization', `Bearer ${tokenOutsider}`)
        .attach('file', Buffer.from('PDF content mock'), 'secret.pdf');

      expect(res.status).toBe(403);
    });
  });

  describe('File Listing & Details (GET /api/projects/:projectId/files)', () => {
    it('should return paginated list of files for project member', async () => {
      (prisma.file.count as jest.Mock).mockResolvedValue(1);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([mockFile]);
      jest.spyOn(storageService, 'getFileUrl').mockResolvedValue('https://storage.devsync.local/view');

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/files?page=1&limit=20&sort=newest`)
        .set('Authorization', `Bearer ${tokenViewer}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].id).toBe(mockFile.id);
      expect(res.body.pagination.total).toBe(1);
    });

    it('should reject file listing for non-project member (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/files`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/files/:fileId should return single file details for member', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      jest.spyOn(storageService, 'getFileUrl').mockResolvedValue('https://storage.devsync.local/view');

      const res = await request(app)
        .get(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenDev}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockFile.id);
    });
  });

  describe('File Download & Streaming (GET /api/files/:fileId/download)', () => {
    it('should provide secure redirect to signed URL for project member', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      jest
        .spyOn(storageService, 'getSignedDownloadUrl')
        .mockResolvedValue('https://storage.devsync.local/signed-download-url');

      const res = await request(app)
        .get(`/api/files/${mockFile.id}/download`)
        .set('Authorization', `Bearer ${tokenDev}`);

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('https://storage.devsync.local/signed-download-url');
    });

    it('should reject download for non-project member (403 Forbidden)', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .get(`/api/files/${mockFile.id}/download`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });

  describe('File Rename (PATCH /api/files/:fileId)', () => {
    it('should allow file uploader to rename file', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prisma.file.update as jest.Mock).mockResolvedValue({
        ...mockFile,
        originalName: 'system-architecture.pdf',
        fileName: 'system-architecture.pdf',
      });
      (prisma.activity.create as jest.Mock).mockResolvedValue({ id: 'act-2' });

      const res = await request(app)
        .patch(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenDev}`)
        .send({ originalName: 'system-architecture.pdf' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalName).toBe('system-architecture.pdf');
    });

    it('should allow project OWNER to rename any file', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prisma.file.update as jest.Mock).mockResolvedValue({
        ...mockFile,
        originalName: 'owner-renamed.pdf',
      });

      const res = await request(app)
        .patch(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ originalName: 'owner-renamed.pdf' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject VIEWER from renaming file (403 Forbidden)', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .patch(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ originalName: 'viewer-attempt.pdf' });

      expect(res.status).toBe(403);
    });

    it('should reject invalid empty filename (400 Bad Request)', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .patch(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenDev}`)
        .send({ originalName: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('File Deletion (DELETE /api/files/:fileId)', () => {
    it('should allow file uploader to delete own file', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      jest.spyOn(storageService, 'deleteFile').mockResolvedValue();
      (prisma.file.delete as jest.Mock).mockResolvedValue(mockFile);
      (prisma.activity.create as jest.Mock).mockResolvedValue({ id: 'act-3' });

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenDev}`);

      expect(res.status).toBe(204);
      expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: mockFile.id } });
    });

    it('should allow project OWNER to delete any file', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      jest.spyOn(storageService, 'deleteFile').mockResolvedValue();
      (prisma.file.delete as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(204);
    });

    it('should reject VIEWER from deleting file (403 Forbidden)', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenViewer}`);

      expect(res.status).toBe(403);
    });

    it('should reject non-project member from deleting file (403 Forbidden)', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const res = await request(app)
        .delete(`/api/files/${mockFile.id}`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });
});
