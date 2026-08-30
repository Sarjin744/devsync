import { prisma } from '../config/prisma';

export interface UpdatePreferencesInput {
  taskAssignments?: boolean;
  taskUpdates?: boolean;
  projectInvitations?: boolean;
  mentions?: boolean;
}

export async function getPreferences(userId: string) {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {
        userId,
        taskAssignments: true,
        taskUpdates: true,
        projectInvitations: true,
        mentions: true,
      },
    });
  }

  return {
    id: preferences.id,
    userId: preferences.userId,
    taskAssignments: preferences.taskAssignments,
    taskUpdates: preferences.taskUpdates,
    projectInvitations: preferences.projectInvitations,
    mentions: preferences.mentions,
    createdAt: preferences.createdAt.toISOString(),
    updatedAt: preferences.updatedAt.toISOString(),
  };
}

export async function updatePreferences(userId: string, data: UpdatePreferencesInput) {
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      taskAssignments: data.taskAssignments ?? true,
      taskUpdates: data.taskUpdates ?? true,
      projectInvitations: data.projectInvitations ?? true,
      mentions: data.mentions ?? true,
    },
    update: {
      taskAssignments: data.taskAssignments !== undefined ? data.taskAssignments : undefined,
      taskUpdates: data.taskUpdates !== undefined ? data.taskUpdates : undefined,
      projectInvitations:
        data.projectInvitations !== undefined ? data.projectInvitations : undefined,
      mentions: data.mentions !== undefined ? data.mentions : undefined,
    },
  });

  return {
    id: preferences.id,
    userId: preferences.userId,
    taskAssignments: preferences.taskAssignments,
    taskUpdates: preferences.taskUpdates,
    projectInvitations: preferences.projectInvitations,
    mentions: preferences.mentions,
    createdAt: preferences.createdAt.toISOString(),
    updatedAt: preferences.updatedAt.toISOString(),
  };
}
