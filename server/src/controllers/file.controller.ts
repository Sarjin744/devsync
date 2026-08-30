import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as FileService from '../services/file.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const projectId = req.params.projectId;
  const file = await FileService.uploadProjectFile(projectId, userId, req.file);
  sendCreated(res, file, 'File uploaded successfully');
}

export async function getFiles(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId;
  const { page, limit, sort, search } = req.query;

  const result = await FileService.getProjectFiles(projectId, userId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    sort: sort as 'newest' | 'oldest' | 'name' | 'size',
    search: search as string,
  });

  sendSuccess(res, result.files, 'Files retrieved successfully', 200, result.pagination);
}

export async function getFileDetails(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const file = await FileService.getFileDetails(req.params.fileId, userId);
  sendSuccess(res, file);
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const { signedUrl, stream, fileName, mimeType } = await FileService.getFileDownload(
    req.params.fileId,
    userId,
  );

  if (signedUrl && signedUrl.startsWith('http')) {
    // If a signed cloud URL is available, redirect to it
    res.redirect(signedUrl);
    return;
  }

  if (stream) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    stream.pipe(res);
    return;
  }

  res.redirect(signedUrl);
}

export async function renameFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const { originalName, name, fileName } = req.body;
  const targetName = originalName || name || fileName;

  const updatedFile = await FileService.renameFile(req.params.fileId, userId, targetName);
  sendSuccess(res, updatedFile, 'File renamed successfully');
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await FileService.deleteFile(req.params.fileId, userId);
  sendNoContent(res);
}
