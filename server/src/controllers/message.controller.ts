import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as MessageService from '../services/message.service';
import { sendSuccess, sendNoContent } from '../utils/response';

export async function getMessages(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const page = parseInt(req.query.page as string || '1');
  const limit = parseInt(req.query.limit as string || '50');
  const messages = await MessageService.getProjectMessages(req.params.projectId, userId, page, limit);
  sendSuccess(res, messages);
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await MessageService.deleteMessage(req.params.messageId, userId);
  sendNoContent(res);
}
