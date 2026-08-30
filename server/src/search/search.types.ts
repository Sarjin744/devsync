import { SearchResultItem, PaginationMeta } from '@devsync/shared';

export interface InternalSearchOptions {
  q: string;
  type?: 'all' | 'projects' | 'tasks' | 'users' | 'messages' | 'files' | 'activity';
  projectId?: string;
  page: number;
  limit: number;
}

export interface SearchServiceResult {
  query: string;
  results: SearchResultItem[];
  pagination: PaginationMeta;
}

export interface ScoredSearchResult extends SearchResultItem {
  score: number;
}
