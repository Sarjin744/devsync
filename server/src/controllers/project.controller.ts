import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as ProjectService from '../services/project.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ProjectStatus } from '@prisma/client';

export async function createProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.createProject(userId, req.body);
  sendCreated(res, project, 'Project created successfully');
}

export async function getProjects(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const { teamId, status } = req.query as { teamId?: string; status?: ProjectStatus };
  const projects = await ProjectService.getUserProjects(userId, { teamId, status });
  sendSuccess(res, projects);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.getProjectById(req.params.projectId, userId);
  sendSuccess(res, project);
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.updateProject(req.params.projectId, userId, req.body);
  sendSuccess(res, project, 'Project updated successfully');
}

export async function archiveProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.archiveProject(req.params.projectId, userId);
  sendSuccess(res, project, 'Project archived successfully');
}

export async function restoreProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.restoreProject(req.params.projectId, userId);
  sendSuccess(res, project, 'Project restored successfully');
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await ProjectService.deleteProject(req.params.projectId, userId);
  sendSuccess(res, null, 'Project deleted successfully');
}

export async function leaveProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await ProjectService.leaveProject(req.params.projectId, userId);
  sendSuccess(res, null, 'Left project successfully');
}

export async function getProjectMembers(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const members = await ProjectService.getProjectMembers(req.params.projectId, userId);
  sendSuccess(res, members);
}

export async function addProjectMember(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const member = await ProjectService.addProjectMember(req.params.projectId, userId, req.body);
  sendCreated(res, member, 'Member added to project');
}

export async function updateProjectMemberRole(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const member = await ProjectService.updateProjectMemberRole(
    req.params.projectId,
    req.params.userId,
    userId,
    req.body.role,
  );
  sendSuccess(res, member, 'Member role updated successfully');
}

export async function removeProjectMember(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await ProjectService.removeProjectMember(req.params.projectId, req.params.userId, userId);
  sendSuccess(res, null, 'Member removed from project');
}
