import { prisma } from '../config/prisma';
import { BadRequestError, ForbiddenError } from '../utils/errors';
import {
  InternalSearchOptions,
  SearchServiceResult,
  ScoredSearchResult,
} from '../search/search.types';
import {
  normalizeSearchQuery,
  createSnippet,
  calculateRelevanceScore,
  MIN_QUERY_LENGTH,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
} from '../search/search.utils';
import { SearchResultItem } from '@devsync/shared';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  profileImage: true,
  bio: true,
  isOnline: true,
} as const;

export async function search(
  userId: string,
  rawQuery: string,
  options: Partial<InternalSearchOptions> = {},
): Promise<SearchServiceResult> {
  const q = normalizeSearchQuery(rawQuery);
  if (!q || q.length < MIN_QUERY_LENGTH) {
    throw new BadRequestError(
      `Search query must be at least ${MIN_QUERY_LENGTH} characters long`,
    );
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(
    MAX_SEARCH_LIMIT,
    Math.max(1, options.limit || DEFAULT_SEARCH_LIMIT),
  );
  const targetType = options.type || 'all';

  // ─── 1. Determine User's Accessible Project IDs ──────────
  const userMemberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const allAccessibleProjectIds = userMemberships.map((m) => m.projectId);

  let targetProjectIds: string[] = allAccessibleProjectIds;

  if (options.projectId) {
    if (!allAccessibleProjectIds.includes(options.projectId)) {
      throw new ForbiddenError('You do not have access to this project');
    }
    targetProjectIds = [options.projectId];
  }

  // ─── 2. Determine User's Accessible Teammate User IDs ─────
  let accessibleUserIds: string[] = [];
  if (targetType === 'all' || targetType === 'users') {
    const [projectTeammates, userTeams] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId: { in: allAccessibleProjectIds } },
        select: { userId: true },
      }),
      prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      }),
    ]);

    const teamIds = userTeams.map((t) => t.teamId);
    const teamTeammates =
      teamIds.length > 0
        ? await prisma.teamMember.findMany({
            where: { teamId: { in: teamIds } },
            select: { userId: true },
          })
        : [];

    accessibleUserIds = Array.from(
      new Set([
        ...projectTeammates.map((m) => m.userId),
        ...teamTeammates.map((m) => m.userId),
      ]),
    ).filter((id) => id !== userId);
  }

  // ─── 3. Execute Search Tasks Concurrently ────────────────
  const searchPromises: Promise<SearchResultItem[]>[] = [];

  // Search Projects (unless a specific projectId was scoped or type excludes it)
  if (!options.projectId && (targetType === 'all' || targetType === 'projects')) {
    searchPromises.push(searchProjects(q, allAccessibleProjectIds));
  }

  // Search Tasks
  if (targetType === 'all' || targetType === 'tasks') {
    searchPromises.push(searchTasks(q, targetProjectIds));
  }

  // Search Users (if not project-scoped)
  if (!options.projectId && (targetType === 'all' || targetType === 'users')) {
    searchPromises.push(searchUsers(q, accessibleUserIds));
  }

  // Search Messages
  if (targetType === 'all' || targetType === 'messages') {
    searchPromises.push(searchMessages(q, targetProjectIds));
  }

  // Search Files
  if (targetType === 'all' || targetType === 'files') {
    searchPromises.push(searchFiles(q, targetProjectIds));
  }

  // Search Activities
  if (targetType === 'all' || targetType === 'activity') {
    searchPromises.push(searchActivities(q, targetProjectIds));
  }

  const resultArrays = await Promise.all(searchPromises);
  const allResults = resultArrays.flat();

  // ─── 4. Score and Rank Results ───────────────────────────
  const scoredResults: ScoredSearchResult[] = allResults.map((item) => ({
    ...item,
    score: calculateRelevanceScore(
      item.title,
      item.snippet || item.description,
      q,
      item.createdAt ? new Date(item.createdAt) : undefined,
    ),
  }));

  // Sort descending by relevance score
  scoredResults.sort((a, b) => b.score - a.score);

  // ─── 5. Paginate ─────────────────────────────────────────
  const total = scoredResults.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;
  const paginatedResults: SearchResultItem[] = scoredResults
    .slice(skip, skip + limit)
    .map(({ score: _score, ...item }) => item);

  return {
    query: q,
    results: paginatedResults,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Searches Projects where the user is an authorized member.
 */
async function searchProjects(
  q: string,
  accessibleProjectIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleProjectIds.length === 0) return [];

  const projects = await prisma.project.findMany({
    where: {
      id: { in: accessibleProjectIds },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 50,
  });

  return projects.map((p) => ({
    id: p.id,
    type: 'PROJECT',
    title: p.name,
    description: p.description,
    snippet: p.description ? createSnippet(p.description, q) : null,
    project: { id: p.id, name: p.name },
    url: `/projects/${p.id}`,
    metadata: { status: p.status },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

/**
 * Searches Tasks in accessible projects.
 */
async function searchTasks(
  q: string,
  accessibleProjectIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleProjectIds.length === 0) return [];

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: accessibleProjectIds },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    take: 50,
  });

  return tasks.map((t) => ({
    id: t.id,
    type: 'TASK',
    title: t.title,
    description: t.description,
    snippet: t.description ? createSnippet(t.description, q) : null,
    project: { id: t.project.id, name: t.project.name },
    url: `/projects/${t.projectId}`,
    metadata: {
      status: t.status,
      priority: t.priority,
      assigneeName: t.assignee?.name || null,
      dueDate: t.dueDate?.toISOString() || null,
    },
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

/**
 * Searches Teammates and Project Members relevant to the user.
 */
async function searchUsers(
  q: string,
  accessibleUserIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleUserIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { in: accessibleUserIds },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: USER_SELECT,
    take: 30,
  });

  return users.map((u) => ({
    id: u.id,
    type: 'USER',
    title: u.name,
    description: u.email,
    snippet: u.bio ? createSnippet(u.bio, q) : u.email,
    project: null,
    url: `/profile`,
    metadata: {
      email: u.email,
      profileImage: u.profileImage,
      isOnline: u.isOnline,
    },
  }));
}

/**
 * Searches Messages in accessible projects.
 */
async function searchMessages(
  q: string,
  accessibleProjectIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleProjectIds.length === 0) return [];

  const messages = await prisma.message.findMany({
    where: {
      projectId: { in: accessibleProjectIds },
      content: { contains: q, mode: 'insensitive' },
    },
    include: {
      project: { select: { id: true, name: true } },
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return messages.map((m) => ({
    id: m.id,
    type: 'MESSAGE',
    title: `${m.sender.name} in #${m.project.name}`,
    description: m.content,
    snippet: createSnippet(m.content, q),
    project: { id: m.project.id, name: m.project.name },
    url: `/projects/${m.projectId}`,
    metadata: {
      senderId: m.sender.id,
      senderName: m.sender.name,
      messageId: m.id,
    },
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Searches Files in accessible projects.
 */
async function searchFiles(
  q: string,
  accessibleProjectIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleProjectIds.length === 0) return [];

  const files = await prisma.file.findMany({
    where: {
      projectId: { in: accessibleProjectIds },
      OR: [
        { originalName: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      project: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return files.map((f) => ({
    id: f.id,
    type: 'FILE',
    title: f.originalName || f.fileName,
    description: f.description || `File in ${f.project.name}`,
    snippet: f.description ? createSnippet(f.description, q) : null,
    project: { id: f.project.id, name: f.project.name },
    url: `/projects/${f.projectId}`,
    metadata: {
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      uploaderName: f.uploadedBy.name,
    },
    createdAt: f.createdAt.toISOString(),
  }));
}

/**
 * Searches Activities in accessible projects.
 */
async function searchActivities(
  q: string,
  accessibleProjectIds: string[],
): Promise<SearchResultItem[]> {
  if (accessibleProjectIds.length === 0) return [];

  const activities = await prisma.activity.findMany({
    where: {
      projectId: { in: accessibleProjectIds },
      OR: [
        { description: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      project: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return activities.map((a) => ({
    id: a.id,
    type: 'ACTIVITY',
    title: `${a.user.name}: ${a.description}`,
    description: a.description,
    snippet: createSnippet(a.description, q),
    project: { id: a.project.id, name: a.project.name },
    url: `/projects/${a.projectId}`,
    metadata: {
      action: a.action,
      actorName: a.user.name,
    },
    createdAt: a.createdAt.toISOString(),
  }));
}
