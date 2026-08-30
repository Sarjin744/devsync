import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as DashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const overview = await DashboardService.getDashboardOverview(userId);
  sendSuccess(res, overview, 'Dashboard overview retrieved successfully');
}

export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const overview = await DashboardService.getDashboardOverview(userId);
  sendSuccess(res, overview, 'Dashboard overview retrieved successfully');
}

export async function getProjectDashboard(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId;
  const dashboard = await DashboardService.getProjectDashboard(projectId, userId);
  sendSuccess(res, dashboard, 'Project dashboard retrieved successfully');
}

export async function getProjectWorkload(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId;
  const workload = await DashboardService.getProjectWorkload(projectId, userId);
  sendSuccess(res, workload, 'Project workload retrieved successfully');
}

export async function getProjectProductivity(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projectId = req.params.projectId;
  const range = (req.query.range as '7d' | '30d' | '90d') || '30d';
  const productivity = await DashboardService.getProjectProductivity(projectId, userId, range);
  sendSuccess(res, productivity, 'Project productivity retrieved successfully');
}
