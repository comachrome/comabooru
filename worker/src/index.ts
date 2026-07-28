export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Извлекаем целевой URL из /p/...
    const targetUrlString = decodeURIComponent(url.pathname.slice(3) + url.search);
    
    if (!targetUrlString) {
      return new Response('Missing target URL', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const targetUrl = new URL(targetUrlString);
      
      const headers = new Headers();
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      headers.set('Referer', `${targetUrl.protocol}//${targetUrl.host}/`);
      headers.set('Accept', request.headers.get('accept') || '*/*');

      // Edge-запрос к Gelbooru
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
      });

      const proxyHeaders = new Headers();
      response.headers.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (!['content-encoding', 'transfer-encoding', 'access-control-allow-origin'].includes(lowerKey)) {
          proxyHeaders.set(key, val);
        }
      });
      proxyHeaders.set('Access-Control-Allow-Origin', '*');

      if (response.status !== 200 && response.status !== 206) {
        proxyHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }

      // Маркер для удобной отладки в браузере (чтобы точно знать, что запрос обработан Воркером)
      proxyHeaders.set('X-Proxy-Engine', 'Cloudflare-Worker');

      return new Response(response.body, {
        status: response.status,
        headers: proxyHeaders
      });
    } catch (err) {
      return new Response('Proxy Error: ' + (err as Error).message, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  },
};
