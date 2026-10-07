# SEO, delivery, and performance

## SEO metadata

Public routes update the document title and description, canonical URL, Open Graph fields, Twitter/X card fields, `lang`/`dir`, and `en`, `ar`, and `x-default` alternate links. Detail routes use the translated slug when constructing the alternate URL. The 404 route is marked `noindex, follow`.

JSON-LD is updated on navigation: `Organization` and `BreadcrumbList` are global; video details add `VideoObject`; article details add `Article`. Values are serialized into a `textContent` script element rather than interpolated as HTML.

## Sitemap and robots

- `GET /sitemap.xml` on the API builds paired English/Arabic URLs for public landing pages, categories, videos, services, projects, and articles. It excludes unpublished content and emits `hreflang` alternates.
- The Cloudflare Pages function at `/sitemap.xml` proxies to the API using the `API_BASE_URL` Pages environment variable and caches the response for one hour.
- The Cloudflare Pages function at `/robots.txt` allows public pages, disallows `/admin` and `/api/`, and points crawlers to the sitemap for the current site origin.
- Configure `PublicSite__BaseUrl` on the API to the canonical public website origin. Do not leave it pointed at localhost in production.

## Performance

- Angular route components are lazy-loaded and production bundles use hashed filenames with a 1 MB hard limit on initial JavaScript.
- The homepage requests only the items it renders. Repeat public API GETs share a one-minute in-memory response cache; public API responses and the sitemap expose cache headers.
- Content images reserve aspect ratios and below-the-fold images use lazy loading. The main video/detail image uses high fetch priority. Source image resizing remains the responsibility of the configured image host.
- YouTube uses the privacy-enhanced host and creates its iframe only after the visitor activates the play control.
- Font connections are prewarmed; `font-display: swap` is requested by Google Fonts. English and Arabic load only the configured family/weight files required by visible text.
- Global focus indicators and reduced-motion preferences are applied.

## Deployment and verification notes

Cloudflare Pages must build from `src/frontend` so that its `functions/` directory is discovered. Use `npm run build` and publish `dist/space-media-web/browser`. Configure `API_BASE_URL` as the API origin and `PublicSite__BaseUrl` as the website origin.

Metadata and JSON-LD currently update in the browser after Angular loads route data. Search engines that execute JavaScript receive the route metadata; social preview bots that only read the initial HTML may see the generic index title/description. Server-side rendering or edge HTML rendering is still needed for guaranteed per-route metadata before JavaScript.

Responsive layout was reviewed in code, but screenshots and interactive testing at 360px, 390px, and 768px could not be performed because the saved browser permission blocks localhost access.
