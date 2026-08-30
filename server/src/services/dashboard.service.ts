import { prisma } from '../config/prisma';

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

export async function getDashboardStats(userId: string) {
  const [
    totalProjects,
    activeProjects,
    pendingTasks,
    completedTasks,
    assignedTasks,
    recentActivity,
    recentNotifications,
  ] = await Promise.all([
    // Total projects user is a member of
    prisma.projectMember.count({ where: { userId } }),

    // Active projects
    prisma.projectMember.count({
      where: {
        userId,
        project: { status: 'ACTIVE' },
      },
    }),

    // Pending tasks (TODO + IN_PROGRESS + IN_REVIEW) in user's projects
    prisma.task.count({
      where: {
        project: { members: { some: { userId } } },
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
      },
    }),

    // Completed tasks in user's projects
    prisma.task.count({
      where: {
        project: { members: { some: { userId } } },
        status: 'DONE',
      },
    }),

    // Tasks assigned to current user
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: 'DONE' },
      },
    }),

    // Recent activity across all user's projects
    prisma.activity.findMany({
      where: {
        project: { members: { some: { userId } } },
      },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Recent notifications for user
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totalProjects,
    activeProjects,
    pendingTasks,
    completedTasks,
    assignedTasks,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      user: {
        ...a.user,
        createdAt: a.user.createdAt.toISOString(),
        updatedAt: a.user.updatedAt.toISOString(),
      },
    })),
    recentNotifications: recentNotifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}
