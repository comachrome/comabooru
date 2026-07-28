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

export class GelbooruAdapter implements BooruAdapter {
  readonly engine: BooruEngine = 'gelbooru';
  readonly defaultUrl = 'https://gelbooru.com';
  readonly userIdLabel = 'User ID';

  isSupportedUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('gelbooru.com');
  }

  getProxyHeaders(url: URL): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `${url.protocol}//${url.host}/`
    };
  }

  normalizePost(raw: Record<string, unknown>, booruUrl: string): BooruPost {
    const cleanUrl = booruUrl.replace(/\/+$/, '');

    // Construct URLs if relative
    let previewUrl = String(raw.preview_url || '');
    if (previewUrl && !previewUrl.startsWith('http')) {
      previewUrl = `${cleanUrl}/${previewUrl.replace(/^\/+/, '')}`;
    }

    let sampleUrl = String(raw.sample_url || '');
    if (
      !sampleUrl &&
      (raw.sample === 1 || raw.sample === true || raw.sample === '1' || raw.sample === 'true')
    ) {
      if (raw.directory && raw.image) {
        sampleUrl = `${cleanUrl}/samples/${String(raw.directory)}/sample_${String(raw.image).replace(/\.(png|gif|jpeg|jpg)$/i, '.jpg')}`;
      }
    }
    if (!sampleUrl) {
      sampleUrl = String(raw.file_url || '');
    }
    if (sampleUrl && !sampleUrl.startsWith('http')) {
      sampleUrl = `${cleanUrl}/${sampleUrl.replace(/^\/+/, '')}`;
    }

    let fileUrl = String(raw.file_url || '');
    if (fileUrl && !fileUrl.startsWith('http')) {
      fileUrl = `${cleanUrl}/${fileUrl.replace(/^\/+/, '')}`;
    }

    const isVideo = fileUrl.endsWith('.mp4') || fileUrl.endsWith('.webm') || fileUrl.endsWith('.zip');

    // Prefer sample_url for high resolution crisp thumbnails on Gelbooru,
    // but for videos, sampleUrl is the .mp4 file URL so we must use the JPG previewUrl image!
    const highResPreviewUrl = isVideo ? (previewUrl || fileUrl) : (sampleUrl || previewUrl || fileUrl);

    const rawRating = String(raw.rating || 'general').toLowerCase();
    let rating = rawRating;
    if (rawRating === 'g') rating = 'general';
    else if (rawRating === 's') rating = 'sensitive';
    else if (rawRating === 'q') rating = 'questionable';
    else if (rawRating === 'e') rating = 'explicit';

    return {
      id: Number(raw.id || 0),
      created_at: String(raw.created_at || ''),
      score: Number(raw.score || 0),
      width: Number(raw.width || 0),
      height: Number(raw.height || 0),
      md5: String(raw.md5 || ''),
      directory: String(raw.directory || ''),
      image: String(raw.image || ''),
      rating: rating as Rating,
      source: String(raw.source || ''),
      tags: String(raw.tags || ''),
      file_url: proxifyMediaUrl(fileUrl),
      preview_url: proxifyMediaUrl(highResPreviewUrl),
      sample_url: proxifyMediaUrl(sampleUrl),
      owner: String(raw.owner || ''),
      title: String(raw.title || '')
    };
  }

  async testConnection(
    creds: BooruCredentials,
    proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string }
  ): Promise<ConnectionTestResult> {
    if (!creds.userId || !creds.apiKey) {
      return { success: false, message: 'User ID и API Key обязательны.' };
    }

    const cleanUrl = creds.booruUrl.replace(/\/+$/, '');
    const testUrl = `${cleanUrl}/index.php?page=dapi&s=post&q=index&json=1&limit=1&user_id=${encodeURIComponent(creds.userId)}&api_key=${encodeURIComponent(creds.apiKey)}`;

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
        return { success: false, message: `Ошибка сервера Booru (HTTP ${res.status}: ${res.statusText})` };
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        return { success: true, count: data.length };
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.post)) {
          const count = data['@attributes']?.count ? Number(data['@attributes'].count) : data.post.length;
          return { success: true, count };
        } else if (data.post && typeof data.post === 'object') {
          return { success: true, count: 1 };
        } else if (data['@attributes']) {
          return { success: true, count: Number(data['@attributes'].count || 0) };
        }
      }

      return { success: true, count: 0 };
    } catch (e: unknown) {
      console.error('Gelbooru Connection test failed:', e);
      const err = e as Error;
      return {
        success: false,
        message:
          err.message && err.message.includes('Failed to fetch')
            ? 'Ошибка сети или CORS. Проверьте адрес Booru и соединение.'
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

    const queryParams = new URLSearchParams({
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: '1',
      limit: String(limit),
      pid: String(page)
    });

    if (creds.userId) queryParams.append('user_id', creds.userId);
    if (creds.apiKey) queryParams.append('api_key', creds.apiKey);
    if (tags.trim()) queryParams.append('tags', tags.trim());

    const fullUrl = `${cleanUrl}/index.php?${queryParams.toString()}`;

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
      throw new Error(`Booru API error (HTTP ${res.status})`);
    }

    const contentType = res.headers?.get ? res.headers.get('content-type') || '' : '';
    if (contentType.includes('text/html')) {
      throw new Error('Gelbooru вернул HTML-страницу вместо JSON (возможно, блокировка Cloudflare или неверный URL).');
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error('Не удалось распарсить ответ сервера Booru как JSON.');
    }

    let rawPosts: Record<string, unknown>[] = [];
    let totalCount = 0;

    if (Array.isArray(data)) {
      rawPosts = data;
      totalCount = data.length;
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.post)) {
        rawPosts = d.post;
      } else if (d.post && typeof d.post === 'object') {
        rawPosts = [d.post as Record<string, unknown>];
      }
      
      const attrs = d['@attributes'] as Record<string, unknown> | undefined;
      if (attrs?.count) {
        totalCount = Number(attrs.count);
      } else {
        totalCount = rawPosts.length;
      }
    }

    const posts = rawPosts.map(p => this.normalizePost(p, cleanUrl));

    return {
      posts,
      count: totalCount,
      page,
      limit
    };
  }

  async fetchTagSuggestions(creds: BooruCredentials, pattern: string): Promise<TagSuggestion[]> {
    if (!pattern || pattern.trim().length < 2) return [];

    const cleanUrl = creds.booruUrl.replace(/\/+$/, '');
    const searchPattern = pattern.trim();

    // Primary: Gelbooru autocomplete endpoint
    const autoUrl = `${cleanUrl}/autocomplete.php?q=${encodeURIComponent(searchPattern)}`;

    try {
      const res = await fetchWithProxy(autoUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: Record<string, unknown>, idx: number) => ({
            id: idx,
            name: String(item.value || item.label || item.name || item),
            count: Number(item.post_count || item.count || 0),
            type: getTagCategory(Number(item.category || item.type || 0))
          }));
        }
      }
    } catch {
      // Fall back to DAPI tag search
    }

    // Fallback: DAPI tag query
    const dapiUrl = `${cleanUrl}/index.php?page=dapi&s=tag&q=index&json=1&name_pattern=${encodeURIComponent(searchPattern)}%25&limit=15`;
    try {
      const res = await fetchWithRateLimitRetry(dapiUrl);
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        let rawTags: Record<string, unknown>[] = [];
        if (Array.isArray(data)) {
          rawTags = data;
        } else if (data && data.tag) {
          rawTags = Array.isArray(data.tag) ? data.tag : [data.tag as Record<string, unknown>];
        }

        return rawTags.map(t => ({
          id: Number(t.id || 0),
          name: String(t.name || ''),
          count: Number(t.count || 0),
          type: getTagCategory(Number(t.type || t.category || 0))
        }));
      }
    } catch (e) {
      console.error('Failed to fetch tag suggestions:', e);
    }

    return [];
  }

  getPostUrl(post: BooruPost, booruUrl?: string): string {
    if (!post) return '#';
    const cleanBase = booruUrl ? booruUrl.replace(/\/+$/, '') : 'https://gelbooru.com';
    return `${cleanBase}/index.php?page=post&s=view&id=${post.id}`;
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

    if (checked.length === 1) {
      return query.trim() ? `${query.trim()} rating:${checked[0]}` : `rating:${checked[0]}`;
    }

    if (unchecked.length > 0 && checked.length > 0) {
      const negTags = unchecked.map(r => `-rating:${r}`).join(' ');
      return query.trim() ? `${query.trim()} ${negTags}` : negTags;
    }

    return query;
  }
}
