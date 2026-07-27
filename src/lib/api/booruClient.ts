import type {
  BooruCredentials,
  BooruEngine,
  BooruPost,
  TagSuggestion
} from './types';
import type {
  FetchPostsOptions,
  FetchPostsResult,
  ConnectionTestResult
} from './adapters/BooruAdapter';
import { getBooruAdapter, detectBooruEngine } from './adapters/booruFactory';
import { fetchWithProxy, fetchWithRateLimitRetry, proxifyMediaUrl } from './httpUtils';

export type { FetchPostsOptions, FetchPostsResult, ConnectionTestResult };
export { detectBooruEngine, fetchWithProxy, fetchWithRateLimitRetry, proxifyMediaUrl };

/**
 * Normalizes raw post object from Danbooru API
 */
export function normalizeDanbooruPost(raw: Record<string, unknown>, booruUrl: string): BooruPost {
  return getBooruAdapter('danbooru').normalizePost(raw, booruUrl);
}

/**
 * Normalizes raw post object from Gelbooru / Danbooru API to ensure all properties exist
 */
export function normalizePost(raw: Record<string, unknown>, booruUrl: string, engine?: BooruEngine): BooruPost {
  const adapter = getBooruAdapter(engine || booruUrl);
  return adapter.normalizePost(raw, booruUrl);
}

/**
 * Tests Booru API credentials by attempting to fetch a single post
 */
export async function testConnection(
  creds: BooruCredentials,
  proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string }
): Promise<ConnectionTestResult> {
  const adapter = getBooruAdapter(creds.engine || creds.booruUrl);
  return adapter.testConnection(creds, proxyOptions);
}

/**
 * Fetches posts list from Booru API (Gelbooru or Danbooru)
 */
export async function fetchPosts(
  creds: BooruCredentials,
  options: FetchPostsOptions = {}
): Promise<FetchPostsResult> {
  const adapter = getBooruAdapter(creds.engine || creds.booruUrl);
  return adapter.fetchPosts(creds, options);
}

/**
 * Fetches tag suggestions for autocomplete (Gelbooru or Danbooru)
 */
export async function fetchTagSuggestions(
  creds: BooruCredentials,
  pattern: string
): Promise<TagSuggestion[]> {
  const adapter = getBooruAdapter(creds.engine || creds.booruUrl);
  return adapter.fetchTagSuggestions(creds, pattern);
}

/**
 * Constructs the canonical web page URL for a post on its Booru platform
 */
export function getBooruPostUrl(post: BooruPost, booruUrl?: string): string {
  if (!post) return '#';
  
  const targetBooruUrl = booruUrl || 'https://gelbooru.com';
  const engine = detectBooruEngine(targetBooruUrl);
  
  const adapter = getBooruAdapter(engine);
  return adapter.getPostUrl(post, targetBooruUrl);
}
