import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as ProjectService from '../services/project.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export async function createProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const project = await ProjectService.createProject(userId, req.body);
  sendCreated(res, project, 'Project created successfully');
}

export async function getProjects(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const projects = await ProjectService.getUserProjects(userId);
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
  sendSuccess(res, project, 'Project archived');
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await ProjectService.deleteProject(req.params.projectId, userId);
  sendNoContent(res);
}

export async function addMember(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const member = await ProjectService.addMember(req.params.projectId, userId, req.body);
  sendCreated(res, member, 'Member added to project');
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await ProjectService.removeMember(req.params.projectId, req.params.userId, userId);
  sendNoContent(res);
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const member = await ProjectService.updateMemberRole(
    req.params.projectId,
    req.params.userId,
    userId,
    req.body.role,
  );
  sendSuccess(res, member, 'Member role updated');
}

export async function getProjectMembers(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const members = await ProjectService.getProjectMembers(req.params.projectId, userId);
  sendSuccess(res, members);
}
