import { SvelteSet } from 'svelte/reactivity';
import type { BooruPost } from '../api/types';
import { fetchPosts } from '../api/booruClient';
import { getBooruAdapter } from '../api/adapters/booruFactory';
import { isPostBlacklisted } from '../utils/tagParser';
import type { AuthService } from './AuthService.svelte';
import type { BoardService } from './BoardService.svelte';

export class GalleryService {
  posts = $state<BooruPost[]>([]);
  searchQuery = $state<string>('');
  currentPage = $state<number>(0);
  apiPage = $state<number>(0);
  totalCount = $state<number>(0);
  limit = $state<number>(50);
  isLoading = $state<boolean>(false);
  isLoadingMore = $state<boolean>(false);
  hasMore = $state<boolean>(true);
  error = $state<string | null>(null);
  loadMoreError = $state<string | null>(null);

  private currentAbortController: AbortController | null = null;

  filteredPosts = $derived.by(() => {
    const settings = this.boardService.getEffectiveSettings();
    const allowed = settings.allowedRatings || { general: true, sensitive: true, questionable: true, explicit: true };
    const hasAnyAllowed = Object.values(allowed).some(Boolean);

    return this.posts.filter(post => {
      // 1. Rating filter
      if (hasAnyAllowed) {
        const rating = (post.rating || 'general') as 'general' | 'sensitive' | 'questionable' | 'explicit';
        if (allowed[rating] === false) {
          return false;
        }
      }
      // 2. Blacklist filter
      if (settings.blacklist && settings.blacklist.length > 0) {
        if (isPostBlacklisted(post.tags, settings.blacklist)) {
          return false;
        }
      }
      return true;
    });
  });

  constructor(
    private authService: AuthService,
    private boardService: BoardService
  ) {}

  buildEffectiveQuery(query: string): string {
    const creds = this.authService.credentials;
    const settings = this.boardService.getEffectiveSettings();
    const adapter = getBooruAdapter(creds?.engine || creds?.booruUrl);
    return adapter.buildEffectiveQuery(query, settings);
  }

  async search(query: string) {
    await this.loadPage(query, 0);
  }

  async loadPage(query: string, page: number) {
    const creds = this.authService.credentials;
    if (!creds || !creds.userId || !creds.apiKey) {
      this.error = 'Требуется авторизация.';
      return;
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    this.isLoading = true;
    this.isLoadingMore = false;
    this.error = null;
    this.loadMoreError = null;
    this.searchQuery = query;
    this.currentPage = page;
    this.apiPage = page;

    try {
      const settings = this.boardService.getEffectiveSettings();
      const effectiveQuery = this.buildEffectiveQuery(query);

      const res = await fetchPosts(creds, {
        tags: effectiveQuery,
        page,
        limit: this.limit,
        useProxyFallback: settings.useProxyFallback,
        customProxyUrl: settings.customProxyUrl,
        signal
      });

      this.posts = res.posts;
      this.totalCount = res.count;
      this.apiPage = page;
      this.hasMore = res.posts.length > 0 && (page + 1) * this.limit < 20000;
      this.isLoading = false;
      this.error = null;
    } catch (e: unknown) {
      if ((e instanceof DOMException && e.name === 'AbortError') || (e as { name?: string })?.name === 'AbortError') {
        return; // Request was aborted due to new search
      }
      const errorMessage = e instanceof Error ? e.message : 'Ошибка загрузки галереи';
      console.error('Failed to load gallery posts:', e);
      this.isLoading = false;
      this.error = errorMessage;
    }
  }

  async loadMore() {
    if (this.isLoading || this.isLoadingMore || !this.hasMore) {
      return;
    }

    const creds = this.authService.credentials;
    if (!creds || !creds.userId || !creds.apiKey) return;

    const nextPageToFetch = this.apiPage + 1;

    // Check Gelbooru DAPI offset threshold (20,000 posts ceiling limit)
    if (nextPageToFetch * this.limit >= 20000) {
      this.hasMore = false;
      this.isLoadingMore = false;
      return;
    }

    this.isLoadingMore = true;
    this.loadMoreError = null;

    try {
      const settings = this.boardService.getEffectiveSettings();
      const effectiveQuery = this.buildEffectiveQuery(this.searchQuery);

      const res = await fetchPosts(creds, {
        tags: effectiveQuery,
        page: nextPageToFetch,
        limit: this.limit,
        useProxyFallback: settings.useProxyFallback,
        customProxyUrl: settings.customProxyUrl
      });

      if (res.posts.length === 0) {
        this.hasMore = false;
        this.isLoadingMore = false;
        return;
      }

      // Deduplicate posts by ID
      const existingIds = new SvelteSet(this.posts.map(p => p.id));
      const newUnique = res.posts.filter(p => !existingIds.has(p.id));

      this.posts = [...this.posts, ...newUnique];
      this.apiPage = nextPageToFetch;
      this.hasMore = res.posts.length > 0 && (nextPageToFetch + 1) * this.limit < 20000;
      this.isLoadingMore = false;
    } catch (e: unknown) {
      if ((e instanceof DOMException && e.name === 'AbortError') || (e as { name?: string })?.name === 'AbortError') {
        return;
      }
      const errorMessage = e instanceof Error ? e.message : 'Ошибка загрузки дополнительных постов';
      console.error('Failed to load more posts:', e);
      this.loadMoreError = errorMessage;
      this.isLoadingMore = false;
    }
  }

  refresh() {
    this.loadPage(this.searchQuery, this.currentPage);
  }
}
