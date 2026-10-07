# Phase 12 — Security review

## Changes in this pass

- Removed the hard-coded development PostgreSQL password fallback. The API now requires `ConnectionStrings__DefaultConnection` in every environment.
- Added a fixed-window per-remote-address limit of 10 login attempts per five minutes. ASP.NET Identity also locks accounts after five failed password checks for 15 minutes.
- Added generic Problem Details exception handling so API responses do not return exception details or stack traces.
- Added restrictive API response headers and HSTS outside Development. Cloudflare Pages adds a Content Security Policy, HSTS, and browser security headers to frontend responses.
- Added a 1 MiB maximum API request body size. No multipart upload or file storage endpoints exist.
- Made production startup fail unless host filtering, HTTPS CORS origins, HTTPS public-site base URL, JWT signing key, and PostgreSQL connection are configured.
- Restricted the browser auth interceptor to the configured API URL path boundary so similar URL prefixes cannot receive the admin bearer token.

## Reviewed controls

- Passwords are handled by ASP.NET Core Identity's password hasher; password policy requires 12 characters, upper/lowercase, a digit, and a non-alphanumeric character.
- Login uses Identity lockout, requires confirmed email, and only issues tokens to active Admin-role users. JWTs validate issuer, audience, signature, and expiry; lifetimes are limited to 1–60 minutes.
- All admin controllers require the Administrator role. The fallback authorization policy requires authentication for any endpoint that does not explicitly opt into anonymous access.
- CORS uses explicitly configured origins and does not allow credentials or wildcard origins. Production rejects non-HTTPS origins.
- Request contracts use data annotations and `[ApiController]` automatic validation. EF Core LINQ is used for database access; no raw SQL APIs were found in application code.
- Database entities have unique indexes, query indexes, explicit foreign keys, restrict behavior for category/author deletion, and cascades for dependent galleries and join rows.
- Angular renders article and other authored content through escaped interpolation. The only `bypassSecurityTrustResourceUrl` use is for YouTube embeds after validating the video ID format. Admin tokens stay in memory rather than local/session storage.
- There are no upload handlers. Video is hosted by YouTube and image URLs are content metadata.

## Required production setup

Configure secrets and host-specific values in the hosting provider, never in the repository:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key` (at least 32 random UTF-8 bytes), `Jwt__Issuer`, and `Jwt__Audience`
- `AllowedHosts` (semicolon-separated API host names; never `*`)
- `AllowedOrigins__0` (HTTPS website origin; add numbered entries for any additional sites)
- `PublicSite__BaseUrl` (HTTPS website origin)
- Optional `AdminBootstrap__Email` and `AdminBootstrap__Password` only when initial administrator provisioning is intended

Render/Cloudflare or the selected hosting edge must enforce HTTPS and redirect HTTP. Behind a shared reverse proxy, configure forwarded headers with the proxy's trusted address ranges; do not blindly trust arbitrary `X-Forwarded-For` values. Add an edge rate-limit rule for `/api/auth/login` when the app process sees a shared proxy IP.

## Review limits

The source scan excludes ignored build artifacts and runtime data. A source review cannot prove credentials were never exposed in prior commits, deployment settings, logs, or third-party dashboards. Rotate any credential suspected of prior exposure. No secrets were printed during this review.
