interface ApiProxyContext { request: Request; env: { API_BASE_URL?: string }; }

const MAX_BODY = 1_048_576;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

export const onRequest = async ({ request, env }: ApiProxyContext): Promise<Response> => {
  const failure = (status: number, title: string) => new Response(JSON.stringify({ title }), {
    status, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' }
  });
  if (!METHODS.has(request.method)) return failure(405, 'Method not allowed.');
  let origin: URL;
  try {
    origin = new URL(env.API_BASE_URL ?? '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash)
      return failure(503, 'API origin is not configured correctly.');
  } catch { return failure(503, 'API origin is not configured correctly.'); }
  const incoming = new URL(request.url);
  if (!/^\/api(?:\/|$)/.test(incoming.pathname) || /%(?:2e|2f|5c)/i.test(incoming.pathname))
    return failure(400, 'Invalid API path.');
  const target = new URL(incoming.pathname + incoming.search, origin);
  if (target.origin !== origin.origin || !/^\/api(?:\/|$)/.test(target.pathname))
    return failure(400, 'Invalid API path.');

  // Forward only API headers. Never forward cookies, Host or visitor-supplied proxy/IP headers.
  const headers = new Headers({ 'Cache-Control': 'no-cache' });
  for (const name of ['Accept', 'Content-Type', 'Authorization']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method) && request.body) {
    if (Number(request.headers.get('Content-Length')) > MAX_BODY) return failure(413, 'Request body is too large.');
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length;
        if (size > MAX_BODY) { await reader.cancel(); return failure(413, 'Request body is too large.'); }
        chunks.push(chunk.value);
      }
    } catch { return failure(400, 'Could not read the request body.'); }
    const joined = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    body = joined.buffer;
  }
  try {
    const upstream = await fetch(target, {
      method: request.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(90_000)
    });
    // Do not let an upstream redirect send authorization to another service.
    if (upstream.status >= 300 && upstream.status < 400) return failure(502, 'Unexpected API redirect.');
    const output = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ['Content-Type', 'Retry-After', 'WWW-Authenticate']) {
      const value = upstream.headers.get(name); if (value) output.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch { return failure(502, 'API is temporarily unavailable. Please retry.'); }
};
