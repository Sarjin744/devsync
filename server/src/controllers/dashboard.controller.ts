import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as DashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const stats = await DashboardService.getDashboardStats(userId);
  sendSuccess(res, stats);
}
