import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as ActivityService from '../services/activity.service';
import { sendSuccess } from '../utils/response';

export async function getProjectActivity(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const page = parseInt(req.query.page as string || '1');
  const limit = parseInt(req.query.limit as string || '20');
  const activity = await ActivityService.getProjectActivity(req.params.projectId, userId, page, limit);
  sendSuccess(res, activity);
}

export async function getUserActivity(req: Request, res: Response): Promise<void> {
  const activity = await ActivityService.getUserActivity(req.params.userId);
  sendSuccess(res, activity);
}
