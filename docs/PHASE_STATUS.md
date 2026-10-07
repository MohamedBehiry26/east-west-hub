# Agreed Phase Status

The phase order below follows the original project agreement. Some work was previously labeled with shifted phase numbers; this document corrects that record.

| Phase | Scope | Status |
| --- | --- | --- |
| 1–3 | Repository/layer architecture, bilingual data model, PostgreSQL setup, admin Identity/JWT foundation | Implemented baseline |
| 4 | Localized anonymous public content API | Implemented baseline |
| 5 | Premium public website design and complete public page experience | Implemented; visual review remains unverified |
| 6 | Video discovery/management and YouTube integration/synchronization | Implemented; live channel sync awaits credentials |
| 7 | Bilingual services and portfolio/case studies | Implemented and validated |
| 8 | Bilingual articles and editorial publishing | Implemented and validated |
| 9 | Admin site settings and agency profile management | Implemented; validation in progress |
| 10 | Productivity-focused bilingual admin dashboard | Implemented baseline; visual review remains unverified |
| 11 | Production SEO, performance, and accessibility optimization | Implemented baseline; responsive visual audit remains unverified |
| 12 | Complete security review | Implemented baseline; production host/proxy settings must be supplied at deployment |
| 13 | Complete QA and acceptance review | Automated checks pass; browser/device and live-service checks remain unverified (see [PHASE_13_QA.md](PHASE_13_QA.md)) |

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the Phase 12 findings, fixes, and production configuration requirements.

## Phase 12 security checklist

- [x] Source/config scan for literal API, JWT, Supabase, and database credentials; development fallbacks removed
- [x] Identity password policy, password hashing, failed-login lockout, JWT signature/issuer/audience/expiry validation
- [x] Admin APIs protected by Administrator role and fallback authorization policy
- [x] Login rate limiting, bounded request size, generic exception responses, and security headers
- [x] Production startup requires HTTPS origins, canonical HTTPS site URL, non-wildcard hosts, JWT key, and database connection
- [x] EF Core indexes/foreign keys/cascade policies and parameterized LINQ access reviewed; no raw SQL or upload handlers found
- [x] Frontend token stays in memory, admin route guard is present, escaped interpolation is used, and trusted URL bypass is limited to validated YouTube IDs
- [ ] Supply and validate the production host, CORS, database, JWT, TLS/proxy, and edge rate-limit settings at deployment

## Phase 5 acceptance checklist

- [x] Bilingual English/Arabic content, route-aware language, and RTL/LTR document direction
- [x] Cinematic homepage with featured/latest videos, categories, about, services, Projects, Insights, and contact CTA sections
- [x] Responsive shared navigation with mobile menu, language switch, search entry, and contact CTA
- [x] API-backed public list and detail pages for videos, services, portfolio, and articles
- [x] Category detail pages and an accessible 404 page
- [x] Search experience across currently loaded published videos, services, projects, and articles
- [x] Reduced-motion preference support
- [ ] Visual review at mobile and desktop breakpoints and final accessibility/polish pass

Search currently filters the public items loaded by the client. Server-side search, tags, and robust video discovery belong to Phase 6.

## Phase 6 acceptance checklist

- [x] YouTube API adapter and configuration via `YouTube__ApiKey` / `YouTube__ChannelId`
- [x] Admin sync endpoint `POST /api/admin/youtube/sync`
- [x] Duplicate-safe synchronization that refreshes source metadata while preserving website-managed copy, custom thumbnail, category, tags, and publishing fields
- [x] Video listing with server-side search, category/tag filters, pagination, featured/latest ordering
- [x] Video detail with privacy-enhanced click-to-load embed, tags, publication date, related videos, and sharing
- [x] Admin video metadata, categories, tags, featured/published state, and ordering

The local API and database are migrated. Live synchronization requires the user to configure a valid YouTube Data API key and channel ID; no credentials are committed or embedded in this project.

## Phase 7 acceptance checklist

- [x] Protected admin CRUD for services and portfolio projects
- [x] English and Arabic titles, slugs, descriptions, categories, challenge/approach/solution/results, and SEO metadata
- [x] Hero/cover images, ordered portfolio galleries with bilingual alt text, and project-to-service links
- [x] Featured/published state and display ordering
- [x] Public service and project detail pages, related projects, and contact calls to action
- [x] Localized SEO title and description updates on public detail pages
- [x] EF migration for bilingual portfolio categories and approach content
- [x] Backend CRUD/public projection tests and frontend production build

## Phase 8 acceptance checklist

- [x] Protected admin author list and article create/read/update/delete endpoints
- [x] Bilingual title, slug, excerpt, long-form text/Markdown content, cover image, and SEO fields
- [x] Draft/published states and future publication scheduling
- [x] Author selection and publication date display through the existing public Insights routes
- [x] Arabic and English admin editing and localized public article detail metadata
- [x] Backend tests and Angular production build

## Phase 9 acceptance checklist

- [x] Admin-only settings API for reading and updating the site profile
- [x] Bilingual agency name, description, and address editing
- [x] Contact email/phone and logo/favicon URL editing
- [x] Ordered visible/hidden social link management
- [x] Saved settings flow through the existing localized public settings API
- [x] Backend tests and Angular production build

## Phase 11 acceptance checklist

- [x] Dynamic page title, description, canonical URL, Open Graph, Twitter/X metadata, and language alternates
- [x] Organization and breadcrumb JSON-LD on public pages; VideoObject and Article schemas on detail pages
- [x] Language-aware sitemap for static routes and published bilingual content, plus dynamic robots.txt
- [x] YouTube iframe is created only after an explicit play action
- [x] One-minute bounded in-memory cache for repeat public API GET requests; sitemap cache headers
- [x] Smaller homepage API responses, code-split routes, lazy below-the-fold images, reserved image ratios, and font preconnects
- [x] Global keyboard focus visibility and reduced-motion handling
- [ ] Visual and interaction review at 360px, 390px, and 768px; blocked by the saved localhost browser-access restriction

## Phase 12.5 — business domain alignment

Completed after Phase 12 and before the separate Phase 13 QA plan. East West Hub is the public brand; Podcasts use the existing media entity with a content classification and optional episode metadata. See [PHASE_12_5.md](PHASE_12_5.md) for scope and checks.
