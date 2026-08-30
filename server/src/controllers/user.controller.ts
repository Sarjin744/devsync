import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as UserService from '../services/user.service';
import { sendSuccess } from '../utils/response';

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await UserService.getUserById(userId);
  sendSuccess(res, user);
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await UserService.updateUserProfile(userId, req.body);
  sendSuccess(res, user, 'Profile updated successfully');
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const { currentPassword, newPassword } = req.body;
  await UserService.changeUserPassword(userId, currentPassword, newPassword);
  sendSuccess(res, null, 'Password updated successfully');
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string) || '';
  const currentUserId = (req as AuthenticatedRequest).userId;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const result = await UserService.searchUsers(query, currentUserId, page, limit);
  sendSuccess(res, result);
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = await UserService.getUserById(req.params.userId);
  sendSuccess(res, user);
}
