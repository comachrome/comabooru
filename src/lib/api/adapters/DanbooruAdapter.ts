import type {
  BooruAdapter,
  FetchPostsOptions,
  FetchPostsResult,
  ConnectionTestResult
} from './BooruAdapter';
import type {
  BooruCredentials,
  BooruEngine,
  BooruPost,
  TagSuggestion,
  Rating,
  AppSettings
} from '../types';
import { fetchWithProxy, fetchWithRateLimitRetry, proxifyMediaUrl } from '../httpUtils';
import { getTagCategory } from '../../utils/tagParser';

export class DanbooruAdapter implements BooruAdapter {
  readonly engine: BooruEngine = 'danbooru';
  readonly defaultUrl = 'https://danbooru.donmai.us';
  readonly userIdLabel = 'Username / Login';

  isSupportedUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('danbooru.donmai.us') ||
      lower.includes('safebooru.donmai.us') ||
      lower.includes('testbooru.donmai.us') ||
      lower.includes('booru.donmai.us')
    );
  }

  getProxyHeaders(_url: URL): Record<string, string> {
    return {
      'User-Agent': 'comabooru/1.0 (https://github.com/alvkn/lsas)',
      // Danbooru explicitly requires NOT sending their domain as a Referer in proxy requests
    };
  }

  normalizePost(raw: Record<string, unknown>, booruUrl: string): BooruPost {
    const cleanUrl = booruUrl.replace(/\/+$/, '');

    const ratingMap: Record<string, Rating> = {
      g: 'general',
      s: 'sensitive',
      q: 'questionable',
      e: 'explicit'
    };
    const rawRating = String(raw.rating || 'g').toLowerCase();
    const rating = ratingMap[rawRating] || (rawRating as Rating) || 'general';

    let previewUrl = '';
    const mediaAsset = raw.media_asset as Record<string, unknown> | undefined;
    if (mediaAsset?.variants && Array.isArray(mediaAsset.variants)) {
      const v360 = mediaAsset.variants.find((v: Record<string, unknown>) => v.type === '360x360');
      const v720 = mediaAsset.variants.find((v: Record<string, unknown>) => v.type === '720x720');
      if (v360?.url) previewUrl = String(v360.url);
      else if (v720?.url) previewUrl = String(v720.url);
    }
    if (!previewUrl) {
      previewUrl = String(raw.preview_file_url || raw.preview_url || '');
      if (previewUrl.includes('/180x180/')) {
        previewUrl = previewUrl.replace('/180x180/', '/360x360/');
      }
    }

    let sampleUrl = String(raw.large_file_url || raw.sample_url || raw.file_url || '');
    let fileUrl = String(raw.file_url || raw.large_file_url || '');

    if (previewUrl && !previewUrl.startsWith('http')) {
      previewUrl = `${cleanUrl}/${previewUrl.replace(/^\/+/, '')}`;
    }
    if (sampleUrl && !sampleUrl.startsWith('http')) {
      sampleUrl = `${cleanUrl}/${sampleUrl.replace(/^\/+/, '')}`;
    }
    if (fileUrl && !fileUrl.startsWith('http')) {
      fileUrl = `${cleanUrl}/${fileUrl.replace(/^\/+/, '')}`;
    }

    return {
      id: Number(raw.id || 0),
      created_at: String(raw.created_at || ''),
      score: Number(raw.score || 0),
      width: Number(raw.image_width || raw.width || 0),
      height: Number(raw.image_height || raw.height || 0),
      md5: String(raw.md5 || ''),
      directory: '',
      image: raw.file_ext ? `${raw.md5}.${raw.file_ext}` : String(raw.image || ''),
      rating,
      source: String(raw.source || ''),
      tags: String(raw.tag_string || raw.tags || ''),
      file_url: proxifyMediaUrl(fileUrl),
      preview_url: proxifyMediaUrl(previewUrl),
      sample_url: proxifyMediaUrl(sampleUrl),
      owner: String(raw.tag_string_artist || raw.uploader_id || raw.owner || ''),
      title: String(raw.title || '')
    };
  }

  async testConnection(
    creds: BooruCredentials,
    proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string }
  ): Promise<ConnectionTestResult> {
    const cleanUrl = creds.booruUrl.replace(/\/+$/, '');
    const queryParams = new URLSearchParams({ limit: '1' });
    if (creds.userId) queryParams.append('login', creds.userId);
    if (creds.apiKey) queryParams.append('api_key', creds.apiKey);

    const testUrl = `${cleanUrl}/posts.json?${queryParams.toString()}`;

    try {
      const res = await fetchWithRateLimitRetry(
        testUrl,
        {
          method: 'GET',
          headers: { Accept: 'application/json' }
        },
        proxyOptions
      );

      if (!res.ok) {
        return { success: false, message: `Ошибка сервера Danbooru (HTTP ${res.status}: ${res.statusText})` };
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        return { success: true, count: data.length };
      }
      return { success: true, count: 0 };
    } catch (e: unknown) {
      console.error('Danbooru Connection test failed:', e);
      const err = e as Error;
      return {
        success: false,
        message:
          err.message && err.message.includes('Failed to fetch')
            ? 'Ошибка сети или CORS. Проверьте адрес Danbooru и соединение.'
            : `Ошибка проверки API: ${err.message || 'Неизвестная ошибка'}`
      };
    }
  }

  async fetchPosts(
    creds: BooruCredentials,
    options: FetchPostsOptions = {}
  ): Promise<FetchPostsResult> {
    const { tags = '', page = 0, limit = 50, useProxyFallback, customProxyUrl } = options;
    const cleanUrl = creds.booruUrl.replace(/\/+$/, '');

    const danbooruLimit = Math.min(limit, 200);
    const queryParams = new URLSearchParams({
      limit: String(danbooruLimit),
      page: String(page + 1) // Danbooru page parameter is 1-indexed
    });

    if (creds.userId) queryParams.append('login', creds.userId);
    if (creds.apiKey) queryParams.append('api_key', creds.apiKey);
    if (tags.trim()) queryParams.append('tags', tags.trim());

    const fullUrl = `${cleanUrl}/posts.json?${queryParams.toString()}`;

    const res = await fetchWithRateLimitRetry(
      fullUrl,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: options.signal
      },
      { useProxyFallback, customProxyUrl }
    );

    if (!res.ok) {
      throw new Error(`Danbooru API error (HTTP ${res.status})`);
    }

    const contentType = res.headers?.get ? res.headers.get('content-type') || '' : '';
    if (contentType.includes('text/html')) {
      throw new Error('Danbooru вернул HTML-страницу вместо JSON (возможно, блокировка Cloudflare или неверный URL).');
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error('Не удалось распарсить ответ сервера Danbooru как JSON.');
    }

    const rawPosts: Record<string, unknown>[] = Array.isArray(data) ? data : [];
    let totalCount = rawPosts.length;

    // Danbooru posts.json does not return total count metadata.
    // Concurrently fetch total count from /counts/posts.json on page 0 if possible.
    if (page === 0 && rawPosts.length > 0) {
      try {
        const countUrl = `${cleanUrl}/counts/posts.json?${tags.trim() ? `tags=${encodeURIComponent(tags.trim())}` : ''}`;
        const countRes = await fetchWithProxy(
          countUrl,
          { headers: { Accept: 'application/json' } },
          { useProxyFallback, customProxyUrl }
        );
        if (countRes.ok) {
          const countData = await countRes.json();
          if (countData && countData.counts && typeof countData.counts.posts === 'number') {
            totalCount = countData.counts.posts;
          }
        }
      } catch {
        // Fallback if counts endpoint fails
      }
    }

    const posts = rawPosts.map(p => this.normalizePost(p, cleanUrl));

    return {
      posts,
      count: totalCount,
      page,
      limit: danbooruLimit
    };
  }

  async fetchTagSuggestions(creds: BooruCredentials, pattern: string): Promise<TagSuggestion[]> {
    if (!pattern || pattern.trim().length < 2) return [];

    const cleanUrl = creds.booruUrl.replace(/\/+$/, '');
    const searchPattern = pattern.trim();

    // Primary: Danbooru autocomplete endpoint
    const autoUrl = `${cleanUrl}/autocomplete.json?search[query]=${encodeURIComponent(searchPattern)}&type=tag_query`;
    try {
      const res = await fetchWithProxy(autoUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: Record<string, unknown>, idx: number) => ({
            id: idx,
            name: String(item.value || item.name || item.label || item),
            count: Number(item.post_count || item.count || 0),
            type: getTagCategory(Number(item.category || item.type || 0))
          }));
        }
      }
    } catch {
      // Fallback to tags endpoint
    }

    // Fallback: Danbooru tags endpoint
    const tagsUrl = `${cleanUrl}/tags.json?search[name_matches]=${encodeURIComponent(searchPattern)}*&search[order]=count&limit=15`;
    try {
      const res = await fetchWithRateLimitRetry(tagsUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((t: Record<string, unknown>) => ({
            id: Number(t.id || 0),
            name: String(t.name || ''),
            count: Number(t.post_count || t.count || 0),
            type: getTagCategory(Number(t.category || t.type || 0))
          }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch Danbooru tag suggestions:', e);
    }

    return [];
  }

  getPostUrl(post: BooruPost, booruUrl?: string): string {
    if (!post) return '#';
    const cleanBase = booruUrl ? booruUrl.replace(/\/+$/, '') : 'https://danbooru.donmai.us';
    return `${cleanBase}/posts/${post.id}`;
  }

  buildEffectiveQuery(query: string, settings: AppSettings): string {
    const allowed = settings.allowedRatings || {
      general: true,
      sensitive: true,
      questionable: true,
      explicit: true
    };
    const checked = Object.entries(allowed)
      .filter(([_, val]) => val)
      .map(([key]) => key);
    const unchecked = Object.entries(allowed)
      .filter(([_, val]) => !val)
      .map(([key]) => key);

    if (query.includes('rating:') || query.includes('-rating:')) {
      return query;
    }

    if (unchecked.length === 0) {
      return query;
    }

    // Danbooru Member accounts have a strict 2-tag limit per API query!
    const userTagCount = query.trim() ? query.trim().split(/\s+/).length : 0;
    if (userTagCount >= 2) {
      return query; // Do not append extra rating tags to prevent TagLimitError!
    }
    if (checked.length === 1) {
      return query.trim() ? `${query.trim()} rating:${checked[0]}` : `rating:${checked[0]}`;
    }
    if (userTagCount <= 1 && unchecked.length === 1) {
      return query.trim() ? `${query.trim()} -rating:${unchecked[0]}` : `-rating:${unchecked[0]}`;
    }
    return query;
  }
}
