import { PrismaClient, ProjectRole, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Starting DevSync database seed...');

  // Clean existing data in dependency order
  await prisma.activity.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.taskComment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.teamInvitation.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create development seed users with safely hashed test passwords
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  const alex = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex.dev@devsync.local',
      passwordHash: defaultPasswordHash,
      bio: 'Senior Full-Stack Architect & Project Owner',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      name: 'Sarah Chen',
      email: 'sarah.lead@devsync.local',
      passwordHash: defaultPasswordHash,
      bio: 'Technical Lead & System Designer',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'marcus.eng@devsync.local',
      passwordHash: defaultPasswordHash,
      bio: 'Frontend & React Native Specialist',
    },
  });

  const elena = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena.qa@devsync.local',
      passwordHash: defaultPasswordHash,
      bio: 'QA Engineer & Test Automation Lead',
    },
  });

  console.info(`✅ Created 4 seed users: ${alex.email}, ${sarah.email}, ${marcus.email}, ${elena.email}`);

  // 2. Create multiple sample development teams
  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Core Platform Engineering',
      description: 'Primary platform infrastructure and product development team',
      ownerId: alex.id,
      members: {
        create: [
          { userId: alex.id, role: 'OWNER' },
          { userId: sarah.id, role: 'MEMBER' },
          { userId: marcus.id, role: 'MEMBER' },
          { userId: elena.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const designTeam = await prisma.team.create({
    data: {
      name: 'Product Design & UX',
      description: 'User experience research, prototyping, and UI design system team',
      ownerId: sarah.id,
      members: {
        create: [
          { userId: sarah.id, role: 'OWNER' },
          { userId: marcus.id, role: 'MEMBER' },
          { userId: alex.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.info(`✅ Created 2 seed teams: "${engineeringTeam.name}", "${designTeam.name}"`);

  // 3. Create multiple projects (Active & Archived) with diverse roles
  const devsyncProject = await prisma.project.create({
    data: {
      name: 'DevSync Platform MVP',
      description: 'Real-time team collaboration platform with Kanban and WebSocket messaging',
      teamId: engineeringTeam.id,
      ownerId: alex.id,
      status: ProjectStatus.ACTIVE,
      members: {
        create: [
          { userId: alex.id, role: ProjectRole.OWNER },
          { userId: sarah.id, role: ProjectRole.TEAM_LEAD },
          { userId: marcus.id, role: ProjectRole.DEVELOPER },
          { userId: elena.id, role: ProjectRole.VIEWER },
        ],
      },
    },
  });

  const designSystemProject = await prisma.project.create({
    data: {
      name: 'DevSync Design System 2.0',
      description: 'Unified cross-platform design token system and component library',
      teamId: designTeam.id,
      ownerId: sarah.id,
      status: ProjectStatus.ACTIVE,
      members: {
        create: [
          { userId: sarah.id, role: ProjectRole.OWNER },
          { userId: marcus.id, role: ProjectRole.DEVELOPER },
          { userId: alex.id, role: ProjectRole.VIEWER },
        ],
      },
    },
  });

  const legacyProject = await prisma.project.create({
    data: {
      name: 'Legacy Monolith Migration',
      description: 'Decommissioning v1 backend services and database table schemas',
      teamId: engineeringTeam.id,
      ownerId: alex.id,
      status: ProjectStatus.ARCHIVED,
      members: {
        create: [
          { userId: alex.id, role: ProjectRole.OWNER },
          { userId: sarah.id, role: ProjectRole.TEAM_LEAD },
        ],
      },
    },
  });

  console.info(`✅ Created 3 seed projects: "${devsyncProject.name}", "${designSystemProject.name}", "${legacyProject.name}" (Archived)`);

  // 4. Create sample tasks for MVP project
  const task1 = await prisma.task.create({
    data: {
      title: 'Design System & UI Color Tokens',
      description: 'Implement shared design tokens across Next.js web dashboard and Expo mobile application',
      status: 'DONE',
      priority: 'HIGH',
      projectId: devsyncProject.id,
      creatorId: sarah.id,
      assigneeId: marcus.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Implement PostgreSQL Relational Schema',
      description: 'Define relational models, indexes, and constraints using Prisma ORM for PostgreSQL',
      status: 'DONE',
      priority: 'HIGH',
      projectId: devsyncProject.id,
      creatorId: alex.id,
      assigneeId: sarah.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'JWT Authentication & Refresh Token Pipeline',
      description: 'Setup token generation, rotation, bcrypt password hashing, and auth middleware',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      projectId: devsyncProject.id,
      creatorId: alex.id,
      assigneeId: alex.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Socket.IO Real-Time Chat Engine',
      description: 'Build room-based project messaging with persistence and typing indicators',
      status: 'TODO',
      priority: 'MEDIUM',
      projectId: devsyncProject.id,
      creatorId: sarah.id,
      assigneeId: marcus.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.info('✅ Created sample development tasks');

  // 5. Create sample task comments
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: marcus.id,
      content: 'Tailwind CSS classes and React Native color constants have been synchronized with shared types.',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: sarah.id,
      content: 'Looks great! Verified compatibility on mobile and web viewports.',
    },
  });

  // 6. Create sample project activity
  await prisma.activity.create({
    data: {
      projectId: devsyncProject.id,
      userId: alex.id,
      action: 'PROJECT_CREATED',
      description: `Project "${devsyncProject.name}" was initialized`,
    },
  });

  await prisma.activity.create({
    data: {
      projectId: devsyncProject.id,
      userId: sarah.id,
      action: 'TASK_COMPLETED',
      description: `Task "${task2.title}" was marked as DONE`,
    },
  });

  // 7. Create sample message
  await prisma.message.create({
    data: {
      projectId: devsyncProject.id,
      senderId: alex.id,
      content: 'Welcome to DevSync! Database schema and initial workspace foundation are ready.',
    },
  });

  console.info('✨ DevSync database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
