import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { requireProjectMember } from './project.service';
import { createActivity } from './activity.service';
import path from 'path';
import fs from 'fs';

export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: Express.Multer.File,
) {
  await requireProjectMember(projectId, userId);

  const fileRecord = await prisma.file.create({
    data: {
      name: file.originalname,
      url: `/uploads/${path.basename(file.path)}`,
      mimeType: file.mimetype,
      size: file.size,
      projectId,
      uploadedById: userId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  await createActivity({
    type: 'FILE_UPLOADED',
    description: `File "${file.originalname}" was uploaded`,
    projectId,
    userId,
  });

  return {
    ...fileRecord,
    createdAt: fileRecord.createdAt.toISOString(),
    uploadedBy: {
      ...fileRecord.uploadedBy,
      createdAt: fileRecord.uploadedBy.createdAt.toISOString(),
      updatedAt: fileRecord.uploadedBy.updatedAt.toISOString(),
    },
  };
}

export async function getProjectFiles(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);

  const files = await prisma.file.findMany({
    where: { projectId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return files.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    uploadedBy: {
      ...f.uploadedBy,
      createdAt: f.uploadedBy.createdAt.toISOString(),
      updatedAt: f.uploadedBy.updatedAt.toISOString(),
    },
  }));
}

export async function getFileDownload(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File');

  await requireProjectMember(file.projectId, userId);

  const filePath = path.join(process.cwd(), file.url);
  return { filePath, fileName: file.name };
}

export async function deleteFile(fileId: string, userId: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File');

  if (file.uploadedById !== userId) {
    // Check if user has owner/lead role
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: file.projectId,
        userId,
        role: { in: ['OWNER', 'TEAM_LEAD'] },
      },
    });
    if (!member) throw new ForbiddenError('You cannot delete this file');
  }

  // Delete from filesystem
  const filePath = path.join(process.cwd(), file.url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.file.delete({ where: { id: fileId } });
}
