export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 50;

/**
 * Normalizes user search input:
 * - Trims leading/trailing whitespace
 * - Collapses consecutive spaces
 * - Truncates to MAX_QUERY_LENGTH
 */
export function normalizeSearchQuery(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  return rawQuery
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_QUERY_LENGTH);
}

/**
 * Extracts a relevant contextual snippet around matching query terms.
 */
export function createSnippet(
  content: string | null | undefined,
  query: string,
  maxLength = 140,
): string {
  if (!content) return '';
  const cleanContent = content.trim().replace(/\s+/g, ' ');
  if (cleanContent.length <= maxLength) return cleanContent;

  const lowerContent = cleanContent.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  const matchIndex = lowerContent.indexOf(lowerQuery);
  if (matchIndex === -1) {
    return cleanContent.slice(0, maxLength) + '...';
  }

  const halfWindow = Math.floor((maxLength - query.length) / 2);
  const start = Math.max(0, matchIndex - halfWindow);
  const end = Math.min(cleanContent.length, start + maxLength);

  let snippet = cleanContent.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < cleanContent.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Calculates a search relevance score:
 * - Exact title match: 100
 * - Title starts with query: 60
 * - Title contains query: 40
 * - Description/content contains query: 20
 * - Recency bonus: up to 10 points for recent activity
 */
export function calculateRelevanceScore(
  title: string,
  content: string | null | undefined,
  query: string,
  createdAt?: Date,
): number {
  let score = 0;
  const lowerTitle = (title || '').toLowerCase().trim();
  const lowerContent = (content || '').toLowerCase().trim();
  const lowerQuery = query.toLowerCase().trim();

  if (lowerTitle === lowerQuery) {
    score += 100;
  } else if (lowerTitle.startsWith(lowerQuery)) {
    score += 60;
  } else if (lowerTitle.includes(lowerQuery)) {
    score += 40;
  }

  if (lowerContent.includes(lowerQuery)) {
    score += 20;
  }

  if (createdAt) {
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) score += 10;
    else if (ageDays <= 7) score += 6;
    else if (ageDays <= 30) score += 3;
  }

  return score;
}
