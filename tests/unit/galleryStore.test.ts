import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/lib/services/AuthService.svelte';
import { SettingsService } from '../../src/lib/services/SettingsService.svelte';
import { BoardService } from '../../src/lib/services/BoardService.svelte';
import { GalleryService } from '../../src/lib/services/GalleryService.svelte';
import * as booruClient from '../../src/lib/api/booruClient';
import { DEFAULT_SETTINGS } from '../../src/lib/utils/storage';
import type { BooruPost } from '../../src/lib/api/types';

describe('Gallery Service', () => {
  let auth: AuthService;
  let settingsService: SettingsService;
  let board: BoardService;
  let gallery: GalleryService;

  const mockPost1: BooruPost = {
    id: 101,
    title: 'Cat 1',
    file_url: 'https://cdn.example.com/101.jpg',
    preview_url: 'https://cdn.example.com/101_thumb.jpg',
    sample_url: 'https://cdn.example.com/101_sample.jpg',
    width: 800,
    height: 600,
    score: 10,
    rating: 'general',
    tags: 'cat_ears solo',
    owner: 'user1',
    created_at: '2026-01-01',
    md5: 'md5_101',
    directory: 'dir1',
    image: '101.jpg',
    source: ''
  };

  const mockPost2: BooruPost = {
    id: 102,
    title: 'Cat 2',
    file_url: 'https://cdn.example.com/102.jpg',
    preview_url: 'https://cdn.example.com/102_thumb.jpg',
    sample_url: 'https://cdn.example.com/102_sample.jpg',
    width: 800,
    height: 600,
    score: 20,
    rating: 'general',
    tags: 'cat_ears duo',
    owner: 'user2',
    created_at: '2026-01-02',
    md5: 'md5_102',
    directory: 'dir2',
    image: '102.jpg',
    source: ''
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    auth = new AuthService();
    settingsService = new SettingsService();
    board = new BoardService(auth, settingsService);
    gallery = new GalleryService(auth, board);
  });

  it('sets error state when searching without authentication', async () => {
    await gallery.search('cat_ears');

    expect(gallery.error).toContain('Требуется авторизация');
    expect(gallery.posts).toEqual([]);
  });

  it('fetches posts on search when authenticated', async () => {
    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    vi.spyOn(booruClient, 'fetchPosts').mockResolvedValue({
      posts: [mockPost1, mockPost2],
      count: 2,
      page: 0,
      limit: 50
    });

    await gallery.search('cat_ears');

    expect(gallery.searchQuery).toBe('cat_ears');
    expect(gallery.posts.length).toBe(2);
    expect(gallery.filteredPosts.length).toBe(2);
    expect(gallery.totalCount).toBe(2);
    expect(gallery.error).toBeNull();
  });

  it('appends unique posts on loadMore', async () => {
    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    const fetchSpy = vi.spyOn(booruClient, 'fetchPosts');

    fetchSpy.mockResolvedValueOnce({
      posts: [mockPost1],
      count: 2,
      page: 0,
      limit: 50
    });

    await gallery.search('cat_ears');

    fetchSpy.mockResolvedValueOnce({
      posts: [mockPost2],
      count: 2,
      page: 1,
      limit: 50
    });

    await gallery.loadMore();

    expect(gallery.posts.length).toBe(2);
    expect(gallery.posts[0].id).toBe(101);
    expect(gallery.posts[1].id).toBe(102);
  });

  it('passes negative -rating: tags to fetchPosts when ratings are unchecked', async () => {
    settingsService.updateSettings(DEFAULT_SETTINGS);
    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    const fetchSpy = vi.spyOn(booruClient, 'fetchPosts').mockResolvedValue({
      posts: [mockPost1],
      count: 1,
      page: 0,
      limit: 50
    });

    // Disable 'general' rating
    settingsService.toggleRating('general');

    await gallery.search('cat_ears');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: 'cat_ears -rating:general'
      })
    );
  });

  it('passes positive rating: tag when only 1 rating is enabled', async () => {
    settingsService.updateSettings({
      allowedRatings: {
        general: false,
        sensitive: false,
        questionable: false,
        explicit: true
      }
    });

    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    const fetchSpy = vi.spyOn(booruClient, 'fetchPosts').mockResolvedValue({
      posts: [],
      count: 0,
      page: 0,
      limit: 50
    });

    await gallery.search('cat_ears');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: 'cat_ears rating:explicit'
      })
    );
  });

  it('does not alter query if manual rating: or -rating: tag is present', async () => {
    settingsService.updateSettings({
      allowedRatings: {
        general: false,
        sensitive: true,
        questionable: true,
        explicit: true
      }
    });

    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    const fetchSpy = vi.spyOn(booruClient, 'fetchPosts').mockResolvedValue({
      posts: [],
      count: 0,
      page: 0,
      limit: 50
    });

    await gallery.search('cat_ears rating:general');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: 'cat_ears rating:general'
      })
    );
  });

  it('sets loadMoreError when loadMore fails', async () => {
    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    const fetchSpy = vi.spyOn(booruClient, 'fetchPosts');
    fetchSpy.mockResolvedValueOnce({
      posts: [mockPost1],
      count: 2,
      page: 0,
      limit: 50
    });

    await gallery.search('cat_ears');

    fetchSpy.mockRejectedValueOnce(new Error('Network error during page 1 fetch'));

    await gallery.loadMore();

    expect(gallery.loadMoreError).toBe('Network error during page 1 fetch');
    expect(gallery.isLoadingMore).toBe(false);
  });

  it('stops pagination when reaching Gelbooru 20,000 post offset limit', async () => {
    auth.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'testkey'
    });

    // Simulate being at page 399 with limit 50 (399 * 50 = 19,950)
    gallery.apiPage = 399;
    gallery.limit = 50;

    // Loading page 400 (400 * 50 = 20,000) should be blocked by threshold
    await gallery.loadMore();

    expect(gallery.hasMore).toBe(false);
    expect(gallery.isLoadingMore).toBe(false);
  });
});
