import { prisma } from '../config/prisma';
import { requireProjectMember } from './project.service';
import { calculateProjectHealth } from '../config/insights.config';
import {
  DashboardOverviewData,
  ProjectDashboardData,
  MemberWorkload,
  ProductivityPoint,
  PriorityDistribution,
  Activity,
} from '@devsync/shared';
import { TaskStatus, TaskPriority } from '@prisma/client';

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

export async function getDashboardOverview(userId: string): Promise<DashboardOverviewData> {
  const now = new Date();

  // 1. Fetch user's authorized projects and their tasks/members
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          members: { select: { id: true } },
          tasks: {
            select: {
              id: true,
              status: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  const accessibleProjectIds = memberships.map((m) => m.projectId);

  let totalOpenTasks = 0;
  let totalCompletedTasks = 0;
  let totalOverdueTasks = 0;
  let totalUpcomingTasks = 0;

  const projectSummaries = memberships.map((m) => {
    const p = m.project;
    const tasks = p.tasks || [];
    const totalTasks = tasks.length;
    let openTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    tasks.forEach((t) => {
      if (t.status === TaskStatus.DONE) {
        completedTasks++;
      } else {
        openTasks++;
        if (t.dueDate) {
          if (new Date(t.dueDate) < now) {
            overdueTasks++;
          } else {
            totalUpcomingTasks++;
          }
        }
      }
    });

    totalOpenTasks += openTasks;
    totalCompletedTasks += completedTasks;
    totalOverdueTasks += overdueTasks;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const health = calculateProjectHealth({
      totalTasks,
      openTasks,
      completedTasks,
      overdueTasks,
    });

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      totalTasks,
      openTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      memberCount: p.members.length,
      health,
    };
  });

  // 2. Fetch recent activity and notifications
  const [recentActivity, recentNotifications] = await Promise.all([
    accessibleProjectIds.length > 0
      ? prisma.activity.findMany({
          where: { projectId: { in: accessibleProjectIds } },
          include: { user: { select: USER_SELECT } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [],
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    projects: memberships.length,
    openTasks: totalOpenTasks,
    completedTasks: totalCompletedTasks,
    overdueTasks: totalOverdueTasks,
    upcomingTasks: totalUpcomingTasks,
    projectSummaries,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      createdAt: a.createdAt.toISOString(),
      user: {
        ...a.user,
        createdAt: a.user.createdAt.toISOString(),
        updatedAt: a.user.updatedAt.toISOString(),
      },
    })) as Activity[],
    recentNotifications: recentNotifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function getProjectDashboard(
  projectId: string,
  userId: string,
): Promise<ProjectDashboardData> {
  // 1. Authorize project member
  await requireProjectMember(projectId, userId);

  const now = new Date();

  const [project, tasks, recentActivities] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
      },
    }),
    prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.findMany({
      where: { projectId },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  // 2. Task distribution
  let todo = 0;
  let inProgress = 0;
  let inReview = 0;
  let done = 0;
  let overdue = 0;

  const priorityDist: PriorityDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  const upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    assigneeName?: string | null;
  }> = [];

  tasks.forEach((t) => {
    // Status
    if (t.status === TaskStatus.TODO) todo++;
    else if (t.status === TaskStatus.IN_PROGRESS) inProgress++;
    else if (t.status === TaskStatus.IN_REVIEW) inReview++;
    else if (t.status === TaskStatus.DONE) done++;

    // Priority
    if (t.priority === TaskPriority.LOW) priorityDist.low++;
    else if (t.priority === TaskPriority.MEDIUM) priorityDist.medium++;
    else if (t.priority === TaskPriority.HIGH) priorityDist.high++;
    else if (t.priority === TaskPriority.CRITICAL) priorityDist.urgent++;

    // Overdue & Deadlines
    if (t.status !== TaskStatus.DONE && t.dueDate) {
      const due = new Date(t.dueDate);
      if (due < now) {
        overdue++;
      } else {
        upcomingDeadlines.push({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate.toISOString(),
          priority: t.priority,
          status: t.status,
          assigneeName: t.assignee?.name || null,
        });
      }
    }
  });

  upcomingDeadlines.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  const total = tasks.length;
  const open = todo + inProgress + inReview;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const health = calculateProjectHealth({
    totalTasks: total,
    openTasks: open,
    completedTasks: done,
    overdueTasks: overdue,
  });

  return {
    project,
    tasks: {
      total,
      open,
      todo,
      inProgress,
      inReview,
      done,
      completionRate,
      overdue,
      priorityDistribution: priorityDist,
    },
    health,
    upcomingDeadlines: upcomingDeadlines.slice(0, 5),
    recentActivity: recentActivities.map((a) => ({
      ...a,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      createdAt: a.createdAt.toISOString(),
      user: {
        ...a.user,
        createdAt: a.user.createdAt.toISOString(),
        updatedAt: a.user.updatedAt.toISOString(),
      },
    })) as Activity[],
  };
}

export async function getProjectWorkload(
  projectId: string,
  userId: string,
): Promise<{ members: MemberWorkload[] }> {
  // 1. Authorize project member
  await requireProjectMember(projectId, userId);

  const now = new Date();

  const [members, tasks] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        assigneeId: true,
        status: true,
        dueDate: true,
      },
    }),
  ]);

  const memberWorkload: MemberWorkload[] = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === m.userId);
    let openTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    memberTasks.forEach((t) => {
      if (t.status === TaskStatus.DONE) {
        completedTasks++;
      } else {
        openTasks++;
        if (t.dueDate && new Date(t.dueDate) < now) {
          overdueTasks++;
        }
      }
    });

    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      profileImage: m.user.profileImage,
      role: m.role,
      openTasks,
      completedTasks,
      overdueTasks,
      totalAssigned: memberTasks.length,
    };
  });

  // Sort by open tasks descending
  memberWorkload.sort((a, b) => b.openTasks - a.openTasks);

  return { members: memberWorkload };
}

export async function getProjectProductivity(
  projectId: string,
  userId: string,
  range: '7d' | '30d' | '90d' = '30d',
): Promise<{ range: string; trend: ProductivityPoint[] }> {
  // 1. Authorize project member
  await requireProjectMember(projectId, userId);

  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Fetch completed tasks in range
  const completedTasks = await prisma.task.findMany({
    where: {
      projectId,
      status: TaskStatus.DONE,
      updatedAt: { gte: startDate },
    },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  // Initialize date points
  const dateMap = new Map<string, number>();
  const currentDate = new Date(startDate);
  const now = new Date();

  while (currentDate <= now) {
    const key = currentDate.toISOString().split('T')[0];
    dateMap.set(key, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Populate completed count per day
  completedTasks.forEach((t) => {
    const key = new Date(t.updatedAt).toISOString().split('T')[0];
    if (dateMap.has(key)) {
      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    }
  });

  const trend: ProductivityPoint[] = Array.from(dateMap.entries()).map(([date, completedCount]) => ({
    date,
    completedCount,
  }));

  return { range, trend };
}
