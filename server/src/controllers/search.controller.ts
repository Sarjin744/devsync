import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as SearchService from '../services/search.service';
import { sendSuccess } from '../utils/response';

export async function search(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const query = req.query.q as string;
  const type = req.query.type as string | undefined;
  const page = parseInt(req.query.page as string || '1');
  const limit = parseInt(req.query.limit as string || '20');

  const results = await SearchService.search(userId, query, { type, page, limit });
  sendSuccess(res, results);
}
