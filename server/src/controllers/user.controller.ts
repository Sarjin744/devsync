import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as UserService from '../services/user.service';
import { sendSuccess } from '../utils/response';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = await UserService.getUserById(req.params.userId);
  sendSuccess(res, user);
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await UserService.updateUserProfile(userId, req.body);
  sendSuccess(res, user, 'Profile updated successfully');
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }
  const user = await UserService.updateAvatar(userId, req.file);
  sendSuccess(res, user, 'Avatar updated successfully');
}

export async function getUserProjects(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const projects = await UserService.getUserProjects(userId);
  sendSuccess(res, projects);
}

export async function getUserTasks(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const tasks = await UserService.getUserTasks(userId);
  sendSuccess(res, tasks);
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = req.query.q as string;
  const currentUserId = (req as AuthenticatedRequest).userId;
  const users = await UserService.searchUsers(query, currentUserId);
  sendSuccess(res, users);
}
