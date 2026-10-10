interface RobotsContext { request: Request; env?: { STAGING_NOINDEX?: string }; }

export const onRequest = ({ request, env }: RobotsContext): Response => {
  const origin = new URL(request.url).origin;
  const body = env?.STAGING_NOINDEX === 'true' ? 'User-agent: *\nDisallow: /\n' : [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
