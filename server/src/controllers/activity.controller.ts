import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as ActivityService from '../services/activity.service';
import { sendSuccess } from '../utils/response';

export async function getProjectActivity(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '30', 10);
  const type = req.query.type as string | undefined;

  const result = await ActivityService.getProjectActivity(
    req.params.projectId,
    userId,
    page,
    limit,
    type,
  );

  sendSuccess(res, result.activities, undefined, 200, result.pagination);
}

export async function getUserActivity(req: Request, res: Response): Promise<void> {
  const activity = await ActivityService.getUserActivity(req.params.userId);
  sendSuccess(res, activity);
}
