import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

function dynamicBooruProxyPlugin() {
  return {
    name: 'dynamic-booru-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      const handler = async (req: import('http').IncomingMessage & { originalUrl?: string }, res: import('http').ServerResponse) => {
        try {
          const fullUrl = req.originalUrl || req.url || '';
          let targetUrl = '';
          if (fullUrl.startsWith('/p/')) {
            const rawUrl = fullUrl.slice('/p/'.length);
            targetUrl = decodeURIComponent(rawUrl);
          }

          if (!targetUrl) {
            res.statusCode = 400;
            return res.end('Missing target URL');
          }
          const parsed = new URL(targetUrl);

          // Dynamically import to avoid any issues with top-level browser globals during vite startup
          const { detectBooruEngine, getBooruAdapter } = await import('./src/lib/api/adapters/booruFactory.ts');
          
          const engine = detectBooruEngine(targetUrl);
          const adapter = getBooruAdapter(engine);
          
          const headers: Record<string, string> = {
            ...adapter.getProxyHeaders(parsed),
            'Accept': req.headers['accept'] || '*/*'
          };

          if (req.headers['range']) {
            headers['Range'] = req.headers['range'] as string;
          }

          const resp = await fetch(targetUrl, { headers });
          res.statusCode = resp.status;
          resp.headers.forEach((val: string, key: string) => {
            if (!['content-encoding', 'transfer-encoding', 'access-control-allow-origin'].includes(key.toLowerCase())) {
              res.setHeader(key, val);
            }
          });
          res.setHeader('Access-Control-Allow-Origin', '*');

          if (resp.body) {
            const reader = resp.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } else {
            const buffer = await resp.arrayBuffer();
            res.end(Buffer.from(buffer));
          }
        } catch (e: unknown) {
          res.statusCode = 500;
          res.end((e as Error)?.message || 'Proxy error');
        }
      };

      server.middlewares.use('/p', handler);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), dynamicBooruProxyPlugin()],
  resolve: {
    conditions: ['browser'],
    alias: {
      '$lib': path.resolve('./src/lib'),
      '@': path.resolve('./src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
