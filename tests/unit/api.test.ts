import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizePost,
  normalizeDanbooruPost,
  detectBooruEngine,
  testConnection,
  fetchPosts,
  fetchTagSuggestions,
  proxifyMediaUrl
} from '../../src/lib/api/booruClient';

describe('Booru Client API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects engine correctly from URL', () => {
    expect(detectBooruEngine('https://gelbooru.com')).toBe('gelbooru');
    expect(detectBooruEngine('https://danbooru.donmai.us')).toBe('danbooru');
    expect(detectBooruEngine('https://safebooru.donmai.us')).toBe('danbooru');
    expect(detectBooruEngine('https://testbooru.donmai.us')).toBe('danbooru');
  });

  it('normalizes Gelbooru raw post data correctly', () => {
    const raw = {
      id: '12345',
      created_at: '2026-01-01 12:00:00',
      score: '42',
      width: '1920',
      height: '1080',
      md5: 'abc123md5',
      directory: 'ab/cd',
      image: 'abc123md5.jpg',
      rating: 'EXPLICIT',
      tags: 'cat_ears solo highres',
      preview_url: 'images/ab/cd/thumbnail_abc123md5.jpg',
      file_url: 'https://simg3.gelbooru.com/images/ab/cd/abc123md5.jpg',
      sample_url: 'https://simg3.gelbooru.com/samples/ab/cd/sample_abc123md5.jpg'
    };

    const normalized = normalizePost(raw, 'https://gelbooru.com');

    expect(normalized.id).toBe(12345);
    expect(normalized.score).toBe(42);
    expect(normalized.width).toBe(1920);
    expect(normalized.height).toBe(1080);
    expect(normalized.rating).toBe('explicit');
    expect(normalized.preview_url).toBe(proxifyMediaUrl('https://simg3.gelbooru.com/samples/ab/cd/sample_abc123md5.jpg'));
    expect(normalized.file_url).toBe(proxifyMediaUrl('https://simg3.gelbooru.com/images/ab/cd/abc123md5.jpg'));
  });

  it('normalizes Danbooru raw post data correctly', () => {
    const raw = {
      id: 9999,
      created_at: '2026-07-24T12:00:00.000Z',
      score: 15,
      image_width: 1200,
      image_height: 1600,
      md5: 'danboorumd5',
      file_ext: 'jpg',
      rating: 's',
      tag_string: 'cat_ears solo 1girl',
      tag_string_artist: 'artist_name',
      preview_file_url: 'https://cdn.donmai.us/preview/danboorumd5.jpg',
      large_file_url: 'https://cdn.donmai.us/sample/danboorumd5.jpg',
      file_url: 'https://cdn.donmai.us/original/danboorumd5.jpg'
    };

    const normalized = normalizeDanbooruPost(raw, 'https://danbooru.donmai.us');

    expect(normalized.id).toBe(9999);
    expect(normalized.score).toBe(15);
    expect(normalized.width).toBe(1200);
    expect(normalized.height).toBe(1600);
    expect(normalized.rating).toBe('sensitive');
    expect(normalized.tags).toBe('cat_ears solo 1girl');
    expect(normalized.owner).toBe('artist_name');
    expect(normalized.preview_url).toBe(proxifyMediaUrl('https://cdn.donmai.us/preview/danboorumd5.jpg'));
    expect(normalized.file_url).toBe(proxifyMediaUrl('https://cdn.donmai.us/original/danboorumd5.jpg'));
    expect(normalized.sample_url).toBe(proxifyMediaUrl('https://cdn.donmai.us/sample/danboorumd5.jpg'));
  });

  it('tests connection successfully for Gelbooru', async () => {
    const mockPosts = [{ id: 1, tags: 'solo' }];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPosts
    });

    const result = await testConnection({
      booruUrl: 'https://gelbooru.com',
      userId: '100',
      apiKey: 'test_key'
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it('tests connection successfully for Danbooru', async () => {
    const mockPosts = [{ id: 50, tag_string: 'solo' }];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPosts
    });

    const result = await testConnection({
      engine: 'danbooru',
      booruUrl: 'https://danbooru.donmai.us',
      userId: 'testuser',
      apiKey: 'test_api_key'
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('login=testuser&api_key=test_api_key')),
      expect.anything()
    );
  });

  it('fetches posts with query parameters for Gelbooru', async () => {
    const mockResponse = {
      '@attributes': { count: 150, offset: 0, limit: 50 },
      post: [
        { id: 1, id_str: '1', score: 10, width: 800, height: 600, rating: 'general', tags: 'cat_ears', preview_url: 'http://example.com/thumb.jpg', file_url: 'http://example.com/file.jpg', sample_url: 'http://example.com/sample.jpg' }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await fetchPosts(
      { booruUrl: 'https://gelbooru.com', userId: '100', apiKey: 'key' },
      { tags: 'cat_ears', page: 0, limit: 50 }
    );

    expect(result.posts.length).toBe(1);
    expect(result.count).toBe(150);
    expect(result.posts[0].tags).toBe('cat_ears');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('tags=cat_ears')),
      expect.anything()
    );
  });

  it('fetches posts with 1-indexed page and total count for Danbooru', async () => {
    const mockPosts = [
      { id: 100, image_width: 800, image_height: 600, rating: 'g', tag_string: 'hatsune_miku', preview_file_url: 'http://example.com/thumb.jpg', file_url: 'http://example.com/file.jpg' }
    ];
    const mockCounts = { counts: { posts: 420 } };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl.includes('/counts/posts.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCounts
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockPosts
      });
    });

    const result = await fetchPosts(
      { engine: 'danbooru', booruUrl: 'https://danbooru.donmai.us', userId: 'myuser', apiKey: 'mykey' },
      { tags: 'hatsune_miku', page: 0, limit: 50 }
    );

    expect(result.posts.length).toBe(1);
    expect(result.count).toBe(420);
    expect(result.posts[0].tags).toBe('hatsune_miku');
    expect(result.posts[0].rating).toBe('general');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('page=1')),
      expect.anything()
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('login=myuser')),
      expect.anything()
    );
  });

  it('fetches tag suggestions for Danbooru autocomplete', async () => {
    const mockSuggestions = [
      { value: 'cat_ears', name: 'cat_ears', post_count: 54321, category: 0 }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSuggestions
    });

    const results = await fetchTagSuggestions(
      { engine: 'danbooru', booruUrl: 'https://danbooru.donmai.us', userId: 'user', apiKey: 'key' },
      'cat'
    );

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('cat_ears');
    expect(results[0].count).toBe(54321);
    expect(results[0].type).toBe('general');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/p/https%3A%2F%2Fdanbooru.donmai.us%2Fautocomplete.json%3Fsearch%5Bquery%5D%3Dcat%26type%3Dtag_query',
      undefined
    );
  });
});
