import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBooruAdapter } from '../../src/lib/api/adapters/booruFactory';
import { GelbooruAdapter } from '../../src/lib/api/adapters/GelbooruAdapter';
import { DanbooruAdapter } from '../../src/lib/api/adapters/DanbooruAdapter';
import { DEFAULT_SETTINGS } from '../../src/lib/utils/storage';

describe('Booru Adapters Strategy Pattern', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('factory resolves correct adapter instances', () => {
    const gelbooru = getBooruAdapter('gelbooru');
    const danbooru = getBooruAdapter('danbooru');

    expect(gelbooru).toBeInstanceOf(GelbooruAdapter);
    expect(danbooru).toBeInstanceOf(DanbooruAdapter);

    expect(getBooruAdapter('https://gelbooru.com')).toBeInstanceOf(GelbooruAdapter);
    expect(getBooruAdapter('https://danbooru.donmai.us')).toBeInstanceOf(DanbooruAdapter);
  });

  it('GelbooruAdapter builds effective queries with negative rating tags', () => {
    const gelbooru = getBooruAdapter('gelbooru');
    const settings = {
      ...DEFAULT_SETTINGS,
      allowedRatings: { general: true, sensitive: true, questionable: false, explicit: false }
    };

    const query = gelbooru.buildEffectiveQuery('cat_ears', settings);
    expect(query).toBe('cat_ears -rating:questionable -rating:explicit');
  });

  it('DanbooruAdapter enforces max 2-tag query limit for rating tags', () => {
    const danbooru = getBooruAdapter('danbooru');
    const settings = {
      ...DEFAULT_SETTINGS,
      allowedRatings: { general: true, sensitive: true, questionable: false, explicit: false }
    };

    // User tag count >= 2 -> do not append rating tags
    const query = danbooru.buildEffectiveQuery('hatsune_miku 1girl', settings);
    expect(query).toBe('hatsune_miku 1girl');

    // User tag count <= 1 & 1 unchecked rating -> appends negative rating tag
    const settings1Neg = {
      ...DEFAULT_SETTINGS,
      allowedRatings: { general: true, sensitive: true, questionable: true, explicit: false }
    };
    const querySingleNeg = danbooru.buildEffectiveQuery('hatsune_miku', settings1Neg);
    expect(querySingleNeg).toBe('hatsune_miku -rating:explicit');
  });

  it('adapters generate correct canonical post URLs', () => {
    const gelbooru = getBooruAdapter('gelbooru');
    const danbooru = getBooruAdapter('danbooru');

    const post = {
      id: 1234,
      created_at: '',
      score: 10,
      width: 800,
      height: 600,
      md5: 'abc',
      directory: '',
      image: 'abc.jpg',
      rating: 'general' as const,
      source: '',
      tags: 'solo',
      file_url: 'http://example.com/file.jpg',
      preview_url: 'http://example.com/thumb.jpg',
      sample_url: 'http://example.com/sample.jpg'
    };

    expect(gelbooru.getPostUrl(post, 'https://gelbooru.com')).toBe('https://gelbooru.com/index.php?page=post&s=view&id=1234');
    expect(danbooru.getPostUrl(post, 'https://danbooru.donmai.us')).toBe('https://danbooru.donmai.us/posts/1234');
  });

  it('adapters correctly identify supported URLs', () => {
    const gelbooru = getBooruAdapter('gelbooru');
    const danbooru = getBooruAdapter('danbooru');

    expect(gelbooru.isSupportedUrl('https://gelbooru.com')).toBe(true);
    expect(gelbooru.isSupportedUrl('https://danbooru.donmai.us')).toBe(false);

    expect(danbooru.isSupportedUrl('https://danbooru.donmai.us')).toBe(true);
    expect(danbooru.isSupportedUrl('https://safebooru.donmai.us')).toBe(true);
    expect(danbooru.isSupportedUrl('https://gelbooru.com')).toBe(false);
  });

  it('adapters return correct proxy headers', () => {
    const gelbooru = getBooruAdapter('gelbooru');
    const danbooru = getBooruAdapter('danbooru');

    const gelbooruHeaders = gelbooru.getProxyHeaders(new URL('https://gelbooru.com/index.php?page=dapi'));
    expect(gelbooruHeaders['User-Agent']).toContain('Mozilla/5.0');
    expect(gelbooruHeaders['Referer']).toBe('https://gelbooru.com/');

    const danbooruHeaders = danbooru.getProxyHeaders(new URL('https://danbooru.donmai.us/posts.json'));
    expect(danbooruHeaders['User-Agent']).toContain('comabooru');
    expect(danbooruHeaders['Referer']).toBeUndefined();
  });
});
