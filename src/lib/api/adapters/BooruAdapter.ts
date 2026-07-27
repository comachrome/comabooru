import type {
  BooruCredentials,
  BooruEngine,
  BooruPost,
  TagSuggestion,
  AppSettings
} from '../types';

export interface FetchPostsOptions {
  tags?: string;
  page?: number;
  limit?: number;
  useProxyFallback?: boolean;
  customProxyUrl?: string;
  signal?: AbortSignal;
}

export interface FetchPostsResult {
  posts: BooruPost[];
  count: number;
  page: number;
  limit: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  count?: number;
}

export interface BooruAdapter {
  readonly engine: BooruEngine;
  readonly defaultUrl: string;
  readonly userIdLabel: string;

  isSupportedUrl(url: string): boolean;
  getProxyHeaders(url: URL): Record<string, string>;

  testConnection(
    creds: BooruCredentials,
    proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string }
  ): Promise<ConnectionTestResult>;

  fetchPosts(
    creds: BooruCredentials,
    options?: FetchPostsOptions
  ): Promise<FetchPostsResult>;

  fetchTagSuggestions(
    creds: BooruCredentials,
    pattern: string
  ): Promise<TagSuggestion[]>;

  getPostUrl(post: BooruPost, booruUrl?: string): string;

  buildEffectiveQuery(query: string, settings: AppSettings): string;

  normalizePost(raw: Record<string, unknown>, booruUrl: string): BooruPost;
}
