import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as TaskService from '../services/task.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { TaskPriority, TaskStatus } from '@prisma/client';

export async function createProjectTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId || req.body.projectId;
  const task = await TaskService.createTask(projectId, userId, req.body);
  sendCreated(res, task, 'Task created successfully');
}

export async function getProjectTasks(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId || (req.query.projectId as string);
  const { status, priority, assigneeId, page, limit } = req.query as {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    page?: string;
    limit?: string;
  };

  const result = await TaskService.getProjectTasks(projectId, userId, {
    status,
    priority,
    assigneeId,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  sendSuccess(res, result.tasks, undefined, 200, result.pagination);
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

export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const task = await TaskService.updateTaskStatus(req.params.taskId, userId, req.body.status);
  sendSuccess(res, task, 'Task status updated successfully');
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await TaskService.deleteTask(req.params.taskId, userId);
  sendSuccess(res, null, 'Task deleted successfully');
}

export async function getMyTasks(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const tasks = await TaskService.getMyTasks(userId);
  sendSuccess(res, tasks);
}
