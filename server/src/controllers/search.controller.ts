import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as SearchService from '../services/search.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';
import { InternalSearchOptions } from '../search/search.types';

type SearchTypeParam = NonNullable<InternalSearchOptions['type']>;

const VALID_SEARCH_TYPES: readonly SearchTypeParam[] = [
  'all',
  'projects',
  'tasks',
  'users',
  'messages',
  'files',
  'activity',
] as const;

export async function search(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const rawQuery = req.query.q as string;
  const rawType = (req.query.type as string)?.toLowerCase() || 'all';
  const projectId = req.query.projectId as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
    throw new BadRequestError('Search query parameter "q" is required');
  }

  if (rawType && !VALID_SEARCH_TYPES.includes(rawType as SearchTypeParam)) {
    throw new BadRequestError(
      `Invalid search type "${rawType}". Allowed types: ${VALID_SEARCH_TYPES.join(', ')}`,
    );
  }

  const result = await SearchService.search(userId, rawQuery, {
    type: rawType as SearchTypeParam,
    projectId,
    page,
    limit,
  });

  sendSuccess(res, result, 'Search completed successfully');
}
