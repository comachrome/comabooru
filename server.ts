import { serve, file } from 'bun';
import { detectBooruEngine, getBooruAdapter } from './src/lib/api/adapters/booruFactory';

const PORT = process.env.PORT || 3101;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Handle API & Image Proxy
    if (url.pathname.startsWith('/p/')) {
      const targetUrl = decodeURIComponent(url.pathname.slice(3) + url.search);
      if (!targetUrl) {
        return new Response('Missing target URL', { status: 400 });
      }

      try {
        const parsedTarget = new URL(targetUrl);
        const engine = detectBooruEngine(targetUrl);
        const adapter = getBooruAdapter(engine);

        const headers: Record<string, string> = {
          ...adapter.getProxyHeaders(parsedTarget),
          'Accept': req.headers.get('accept') || '*/*'
        };

        const resp = await fetch(targetUrl, { headers });
        const proxyHeaders = new Headers();
        
        resp.headers.forEach((val, key) => {
          const lowerKey = key.toLowerCase();
          if (!['content-encoding', 'transfer-encoding', 'access-control-allow-origin'].includes(lowerKey)) {
            proxyHeaders.set(key, val);
          }
        });
        proxyHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(resp.body, {
          status: resp.status,
          headers: proxyHeaders
        });
      } catch (err: unknown) {
        console.error('Proxy error:', err);
        return new Response((err as Error)?.message || 'Proxy error', { status: 500 });
      }
    }

    // 2. Serve static files from dist/
    let filePath = `./dist${url.pathname}`;
    if (filePath.endsWith('/')) {
      filePath += 'index.html';
    }

    let f = file(filePath);
    if (!(await f.exists())) {
      // SPA Fallback
      f = file('./dist/index.html');
    }

    return new Response(f);
  }
});

console.log(`🚀 Comabooru server running on http://localhost:${PORT}`);
