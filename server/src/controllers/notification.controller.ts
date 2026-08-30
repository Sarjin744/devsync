import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as NotificationService from '../services/notification.service';
import { sendSuccess } from '../utils/response';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const isRead =
    req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

  const result = await NotificationService.getUserNotifications(userId, {
    page,
    limit,
    isRead,
  });

  sendSuccess(res, result.notifications, undefined, 200, result.pagination);
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const count = await NotificationService.getUnreadCount(userId);
  sendSuccess(res, { count });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await NotificationService.markAsRead(req.params.notificationId, userId);
  sendSuccess(res, null, 'Notification marked as read');
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await NotificationService.markAllAsRead(userId);
  sendSuccess(res, null, 'All notifications marked as read');
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await NotificationService.deleteNotification(req.params.notificationId, userId);
  sendSuccess(res, null, 'Notification deleted successfully');
}
