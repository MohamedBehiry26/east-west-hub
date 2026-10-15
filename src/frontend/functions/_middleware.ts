interface SecurityMiddlewareContext {
  request: Request;
  env: { API_BASE_URL?: string; STAGING_NOINDEX?: string };
  next: () => Promise<Response>;
}

export const onRequest = async ({ request, env, next }: SecurityMiddlewareContext): Promise<Response> => {
  const response = await next();
  const headers = new Headers(response.headers);
  if (env.STAGING_NOINDEX === 'true') headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const connectSources = new Set(["'self'"]);

  if (env.API_BASE_URL) {
    try {
      connectSources.add(new URL(env.API_BASE_URL).origin);
    } catch {
      // Ignore malformed optional configuration; the API request itself will fail closed.
    }
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      `connect-src ${[...connectSources].join(' ')}`,
      "media-src 'self' https:",
      'frame-src https://www.youtube-nocookie.com',
      'upgrade-insecure-requests'
    ].join('; ')
  );

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
