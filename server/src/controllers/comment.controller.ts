import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as CommentService from '../services/comment.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export async function createComment(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const comment = await CommentService.createComment(userId, req.body);
  sendCreated(res, comment, 'Comment added');
}

export async function getComments(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const comments = await CommentService.getTaskComments(req.params.taskId, userId);
  sendSuccess(res, comments);
}

export async function updateComment(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const comment = await CommentService.updateComment(req.params.commentId, userId, req.body.content);
  sendSuccess(res, comment, 'Comment updated');
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await CommentService.deleteComment(req.params.commentId, userId);
  sendNoContent(res);
}
