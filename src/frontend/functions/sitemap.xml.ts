interface SitemapContext {
  request: Request;
  env: { API_BASE_URL?: string };
}

export const onRequest = async ({ env }: SitemapContext): Promise<Response> => {
  const apiBaseUrl = env.API_BASE_URL?.trim().replace(/\/$/, '');
  if (!apiBaseUrl) return new Response('API_BASE_URL is not configured.', { status: 503 });

  try {
    const upstream = await fetch(`${apiBaseUrl}/sitemap.xml`, { headers: { Accept: 'application/xml' } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return new Response('Sitemap service is temporarily unavailable.', { status: 502 });
  }
};
