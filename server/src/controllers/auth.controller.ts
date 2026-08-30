import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as AuthService from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { changePasswordSchema } from '../validators/auth.validator';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await AuthService.registerUser(req.body);
  sendCreated(res, result, 'Account created successfully');
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await AuthService.loginUser(req.body);
  sendSuccess(res, result, 'Login successful');
}

export async function logout(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await AuthService.logoutUser(userId);
  sendSuccess(res, null, 'Logged out successfully');
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await AuthService.refreshAccessToken(refreshToken);
  sendSuccess(res, tokens, 'Token refreshed');
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await AuthService.getCurrentUser(userId);
  sendSuccess(res, user);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const data = changePasswordSchema.parse(req.body);
  await AuthService.changePassword(userId, data.currentPassword, data.newPassword);
  sendSuccess(res, null, 'Password changed successfully');
}
