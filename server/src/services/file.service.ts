import { prisma } from '../config/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { requireProjectMember } from './project.service';
import { createActivity } from './activity.service';
import { storageService } from '../storage/storage.service';
import { getIO } from '../sockets';
import { ProjectRole, Prisma } from '@prisma/client';

export interface FileQueryOptions {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'name' | 'size';
  search?: string;
}

export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: Express.Multer.File,
) {
  // 1. Verify project membership
  await requireProjectMember(projectId, userId);

  // 2. Validate filename
  const originalName = file.originalname.trim();
  if (!originalName || originalName.length > 255) {
    throw new BadRequestError('Invalid file name length');
  }

  // 3. Generate safe unique storage key
  const storageKey = storageService.generateStorageKey(projectId, originalName);

  // 4. Upload to Cloud / Stateless storage
  const uploadResult = await storageService.uploadFile({
    storageKey,
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName,
  });

  // 5. Save metadata in PostgreSQL (with compensation cleanup on failure)
  let fileRecord;
  try {
    fileRecord = await prisma.file.create({
      data: {
        fileName: originalName,
        originalName,
        storageKey,
        fileUrl: uploadResult.url,
        mimeType: file.mimetype,
        fileSize: uploadResult.size,
        projectId,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            bio: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  } catch (dbError) {
    // Cleanup orphaned storage object if database insert fails
    await storageService.deleteFile(storageKey);
    throw dbError;
  }

  const formattedFile = {
    ...fileRecord,
    size: fileRecord.fileSize,
    url: uploadResult.url,
    createdAt: fileRecord.createdAt.toISOString(),
    updatedAt: fileRecord.updatedAt.toISOString(),
    uploadedBy: {
      ...fileRecord.uploadedBy,
      createdAt: fileRecord.uploadedBy.createdAt.toISOString(),
      updatedAt: fileRecord.uploadedBy.updatedAt.toISOString(),
    },
  };

  // 6. Record Activity
  await createActivity({
    action: 'FILE_UPLOADED',
    type: 'FILE_UPLOADED',
    description: `Uploaded file "${originalName}"`,
    entityType: 'FILE',
    entityId: fileRecord.id,
    metadata: {
      fileId: fileRecord.id,
      fileName: originalName,
      fileSize: fileRecord.fileSize,
    },
    projectId,
    userId,
  });

  // 7. Real-Time Socket.IO broadcast to project room
  try {
    const io = getIO();
    if (io) {
      io.to(`project:${projectId}`).emit('file:new', formattedFile);
    }
  } catch {
    // Socket broadcast errors should not fail upload
  }

  return formattedFile;
}

export async function getProjectFiles(
  projectId: string,
  userId: string,
  options: FileQueryOptions = {},
) {
  // 1. Verify project membership
  await requireProjectMember(projectId, userId);

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // Build where filter
  const where: Prisma.FileWhereInput = { projectId };
  if (options.search && options.search.trim()) {
    where.originalName = {
      contains: options.search.trim(),
      mode: 'insensitive',
    };
  }

  // Build orderBy
  let orderBy: Prisma.FileOrderByWithRelationInput = { createdAt: 'desc' };
  if (options.sort === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (options.sort === 'name') {
    orderBy = { originalName: 'asc' };
  } else if (options.sort === 'size') {
    orderBy = { fileSize: 'desc' };
  }

  const [total, files] = await Promise.all([
    prisma.file.count({ where }),
    prisma.file.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            bio: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  const formattedFiles = await Promise.all(
    files.map(async (f) => {
      const url = f.storageKey
        ? await storageService.getFileUrl(f.storageKey)
        : f.fileUrl;
      return {
        ...f,
        size: f.fileSize,
        url,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        uploadedBy: {
          ...f.uploadedBy,
          createdAt: f.uploadedBy.createdAt.toISOString(),
          updatedAt: f.uploadedBy.updatedAt.toISOString(),
        },
      };
    }),
  );

  return {
    files: formattedFiles,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getFileDetails(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
          bio: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!file) throw new NotFoundError('File');

  await requireProjectMember(file.projectId, userId);

  const url = file.storageKey
    ? await storageService.getFileUrl(file.storageKey)
    : file.fileUrl;

  return {
    ...file,
    size: file.fileSize,
    url,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    uploadedBy: {
      ...file.uploadedBy,
      createdAt: file.uploadedBy.createdAt.toISOString(),
      updatedAt: file.uploadedBy.updatedAt.toISOString(),
    },
  };
}

export async function getFileDownload(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File');

  await requireProjectMember(file.projectId, userId);

  const signedUrl = file.storageKey
    ? await storageService.getSignedDownloadUrl(
        file.storageKey,
        file.originalName || file.fileName,
      )
    : file.fileUrl;

  const stream = file.storageKey
    ? await storageService.getFileStream(file.storageKey)
    : null;

  return {
    file,
    signedUrl,
    stream,
    fileName: file.originalName || file.fileName,
    mimeType: file.mimeType,
  };
}

export async function renameFile(fileId: string, userId: string, newName: string) {
  const trimmedName = newName?.trim();
  if (!trimmedName || trimmedName.length > 255) {
    throw new BadRequestError('File name must be between 1 and 255 characters');
  }

  if (trimmedName.includes('..') || trimmedName.includes('/') || trimmedName.includes('\\')) {
    throw new BadRequestError('Invalid file name containing path characters');
  }

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File');

  // Verify project membership & permissions
  const member = await prisma.projectMember.findFirst({
    where: { projectId: file.projectId, userId },
  });

  if (!member) throw new ForbiddenError('You are not a member of this project');

  if (member.role === ProjectRole.VIEWER) {
    throw new ForbiddenError('Viewers cannot rename files');
  }

  if (
    member.role !== ProjectRole.OWNER &&
    member.role !== ProjectRole.TEAM_LEAD &&
    file.uploadedById !== userId
  ) {
    throw new ForbiddenError('You can only rename files you uploaded');
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      originalName: trimmedName,
      fileName: trimmedName,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
          bio: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const formattedFile = {
    ...updatedFile,
    size: updatedFile.fileSize,
    url: updatedFile.fileUrl,
    createdAt: updatedFile.createdAt.toISOString(),
    updatedAt: updatedFile.updatedAt.toISOString(),
    uploadedBy: {
      ...updatedFile.uploadedBy,
      createdAt: updatedFile.uploadedBy.createdAt.toISOString(),
      updatedAt: updatedFile.uploadedBy.updatedAt.toISOString(),
    },
  };

  // Record Activity
  await createActivity({
    action: 'FILE_RENAMED',
    type: 'FILE_RENAMED',
    description: `Renamed file to "${trimmedName}"`,
    entityType: 'FILE',
    entityId: file.id,
    metadata: {
      fileId: file.id,
      oldName: file.originalName || file.fileName,
      newName: trimmedName,
    },
    projectId: file.projectId,
    userId,
  });

  // Real-Time Socket.IO broadcast
  try {
    const io = getIO();
    if (io) {
      io.to(`project:${file.projectId}`).emit('file:updated', formattedFile);
    }
  } catch {
    // Socket broadcast errors should not fail rename
  }

  return formattedFile;
}

export async function deleteFile(fileId: string, userId: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File');

  // Verify role permissions
  const member = await prisma.projectMember.findFirst({
    where: { projectId: file.projectId, userId },
  });

  if (!member) throw new ForbiddenError('You are not a member of this project');

  if (member.role === ProjectRole.VIEWER) {
    throw new ForbiddenError('Viewers cannot delete files');
  }

  if (
    member.role !== ProjectRole.OWNER &&
    member.role !== ProjectRole.TEAM_LEAD &&
    file.uploadedById !== userId
  ) {
    throw new ForbiddenError('You can only delete files you uploaded');
  }

  // 1. Delete object from cloud storage
  if (file.storageKey) {
    try {
      await storageService.deleteFile(file.storageKey);
    } catch {
      // Continue to remove database record even if storage deletion warning occurs
    }
  }

  // 2. Delete database metadata record
  await prisma.file.delete({ where: { id: fileId } });

  // 3. Record Activity
  await createActivity({
    action: 'FILE_DELETED',
    type: 'FILE_DELETED',
    description: `Deleted file "${file.originalName || file.fileName}"`,
    entityType: 'FILE',
    entityId: file.id,
    metadata: {
      fileId: file.id,
      fileName: file.originalName || file.fileName,
    },
    projectId: file.projectId,
    userId,
  });

  // 4. Real-Time Socket.IO broadcast
  try {
    const io = getIO();
    if (io) {
      io.to(`project:${file.projectId}`).emit('file:deleted', {
        fileId,
        projectId: file.projectId,
      });
    }
  } catch {
    // Socket broadcast errors should not fail deletion
  }
}
