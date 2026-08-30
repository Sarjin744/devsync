import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as TaskService from '../services/task.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export async function createTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.createTask(userId, req.body);
  sendCreated(res, task, 'Task created successfully');
}

export async function getTasks(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.query.projectId as string;
  const status = req.query.status as string | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;
  const tasks = await TaskService.getProjectTasks(projectId, userId, { status, assigneeId });
  sendSuccess(res, tasks);
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.getTaskById(req.params.taskId, userId);
  sendSuccess(res, task);
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.updateTask(req.params.taskId, userId, req.body);
  sendSuccess(res, task, 'Task updated successfully');
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await TaskService.deleteTask(req.params.taskId, userId);
  sendNoContent(res);
}

export async function assignTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.assignTask(req.params.taskId, userId, req.body.assigneeId);
  sendSuccess(res, task, 'Task assigned successfully');
}

export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.updateTaskStatus(req.params.taskId, userId, req.body.status);
  sendSuccess(res, task, 'Task status updated');
}
