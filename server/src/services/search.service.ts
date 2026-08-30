import { prisma } from '../config/prisma';

interface SearchOptions {
  type?: string;
  page: number;
  limit: number;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  profileImage: true,
  bio: true,
  isOnline: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function search(userId: string, query: string, options: SearchOptions) {
  if (!query || query.trim().length < 2) {
    return { projects: [], tasks: [], users: [], messages: [] };
  }

  const q = query.trim();
  const results: Record<string, unknown[]> = {};

  if (!options.type || options.type === 'projects') {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId } },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        teamId: true,
        status: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
      take: options.limit,
      skip: (options.page - 1) * options.limit,
    });

    results.projects = projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  if (!options.type || options.type === 'tasks') {
    const userProjectIds = await prisma.projectMember
      .findMany({ where: { userId }, select: { projectId: true } })
      .then((members) => members.map((m) => m.projectId));

    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: userProjectIds },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        assignee: { select: USER_SELECT },
        creator: { select: USER_SELECT },
      },
      take: options.limit,
      skip: (options.page - 1) * options.limit,
    });

    results.tasks = tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate?.toISOString() ?? null,
    }));
  }

  if (!options.type || options.type === 'users') {
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: USER_SELECT,
      take: options.limit,
    });

    results.users = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  return results;
}
