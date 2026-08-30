import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as MessageService from '../services/message.service';
import { sendSuccess, sendNoContent } from '../utils/response';

export async function getMessages(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '30', 10);
  const before = req.query.before as string | undefined;

  const result = await MessageService.getProjectMessages(projectId, userId, page, limit, before);
  sendSuccess(res, result, undefined, 200, result.pagination);
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await MessageService.deleteMessage(req.params.messageId, userId);
  sendNoContent(res);
}
