export async function fetchWithProxy(
  url: string,
  init?: RequestInit,
  proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string }
): Promise<Response> {
  // 1. Try user custom proxy if specified
  if (proxyOptions?.customProxyUrl) {
    try {
      const pUrl = proxyOptions.customProxyUrl.includes('%s')
        ? proxyOptions.customProxyUrl.replace('%s', encodeURIComponent(url))
        : `${proxyOptions.customProxyUrl.replace(/\/+$/, '')}/${encodeURIComponent(url)}`;
      return await fetch(pUrl, init);
    } catch {
      // Continue to fallback
    }
  }

  // 2. To prevent scary red CORS errors in browser console, we completely skip direct fetch
  // and ALWAYS route through our self-hosted proxy for external Booru APIs.
  const selfProxyUrl = `/p/${encodeURIComponent(url)}`;
  return await fetch(selfProxyUrl, init);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRateLimitRetry(
  url: string,
  init?: RequestInit,
  proxyOptions?: { useProxyFallback?: boolean; customProxyUrl?: string },
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchWithProxy(url, init, proxyOptions);

      if (res.status === 429 || res.status === 503) {
        if (attempt < maxRetries) {
          const retryAfter = res.headers.get('Retry-After');
          let delayMs = 1200 * Math.pow(2, attempt);
          if (retryAfter) {
            const parsedSeconds = parseInt(retryAfter, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = parsedSeconds * 1000;
            }
          }
          console.warn(
            `[RateLimit] Received HTTP ${res.status} for ${url}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`
          );
          await sleep(delayMs);
          attempt++;
          continue;
        }
      }

      return res;
    } catch (err: unknown) {
      if ((err instanceof DOMException && err.name === 'AbortError') || (err as { name?: string })?.name === 'AbortError') {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt);
        console.warn(`[NetworkRetry] Retrying ${url} in ${delayMs}ms due to network error:`, err);
        await sleep(delayMs);
        attempt++;
        continue;
      }
      throw err;
    }
  }

  throw new Error('Превышен лимит попыток запроса к Booru API (Rate Limit / Timeout).');
}

export function proxifyMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/p/${encodeURIComponent(url)}`;
  }
  return url;
}
