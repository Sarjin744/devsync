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
  const file = await FileService.uploadProjectFile(req.params.projectId, userId, req.file);
  sendCreated(res, file, 'File uploaded successfully');
}

export async function getFiles(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const files = await FileService.getProjectFiles(req.params.projectId, userId);
  sendSuccess(res, files);
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const { filePath, fileName } = await FileService.getFileDownload(req.params.fileId, userId);
  res.download(filePath, fileName);
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await FileService.deleteFile(req.params.fileId, userId);
  sendNoContent(res);
}
