import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as PreferenceService from '../services/notificationPreference.service';
import { sendSuccess } from '../utils/response';

export async function getPreferences(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const preferences = await PreferenceService.getPreferences(userId);
  sendSuccess(res, preferences);
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const preferences = await PreferenceService.updatePreferences(userId, req.body);
  sendSuccess(res, preferences, 'Notification preferences updated');
}
