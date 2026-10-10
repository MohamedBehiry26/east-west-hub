# East West Hub

Bilingual media, content, and creative platform built on a layered Angular and ASP.NET Core architecture.

## Stack

- Angular 21, TypeScript, Tailwind CSS 4
- ASP.NET Core Web API on .NET 10 LTS
- EF Core with PostgreSQL (Supabase target)
- Cloudflare Pages (frontend) and Render (API) are deployment targets
- YouTube remains the video host; the application will store metadata only

## Repository layout

```text
src/
  frontend/                 Angular application
  backend/
    SpaceMedia.Api/         HTTP entry point and composition root
    SpaceMedia.Application/ Use cases and application contracts
    SpaceMedia.Domain/      Business model and rules
    SpaceMedia.Infrastructure/ EF Core, PostgreSQL, external adapters
docs/                       Architecture records and deployment notes
```

## Prerequisites

- Node.js 22.12+ and npm
- .NET SDK 10.0.3xx
- PostgreSQL locally, or a Supabase PostgreSQL connection

## Local development

1. Set the variables documented in `.env.example` in your shell or local hosting configuration, replacing placeholders locally. ASP.NET Core does not load `.env` files automatically. Never commit real credentials.
2. Install frontend dependencies with `npm install` in `src/frontend`.
3. If using the local PostgreSQL cluster provisioned for this checkout and it is stopped, start it from the repository root with:

   ```powershell
   $cluster = Join-Path $PWD 'work/space-media-postgres-data-utf8'
   $log = Join-Path $PWD 'work/space-media-postgres-utf8.log'
   & 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D $cluster -l $log -o '-p 5434 -h 127.0.0.1' start
   ```

   Its connection is stored in the API project's .NET User Secrets, outside the repository. The ignored `work/` directory contains the local database files.
4. Start the API with `dotnet run --project src/backend/SpaceMedia.Api`. In Development, configured connections apply migrations at startup. Demo content is disabled by default; explicitly set Development__SeedDemoContent=true only when provisioning a disposable demo database.
5. Start the frontend with `npm start` in `src/frontend`; its `/api` proxy targets the local API on `127.0.0.1:5080`.

The API listens at `http://127.0.0.1:5080`; Angular listens at `http://localhost:4200`.

## Admin dashboard

The protected administration area starts at `/admin/login`. It provides bilingual management screens for manually selected YouTube videos and podcasts, categories, tags, services, projects, articles, administrator account creation, and site settings. Synchronization and automatic imports are not part of the current implementation. Do not put administrator credentials in source control.

## Free client staging preparation

See [docs/FREE-STAGING.md](docs/FREE-STAGING.md) for the same-origin Pages API proxy, Render .NET Dockerfile, staging PostgreSQL migrations, first administrator, provider variables, noindex behavior and acceptance checklist. No deployment is performed by these files. Older phase/synchronization descriptions below are historical and do not authorize or require YouTube Sync.

## Production sitemap

Cloudflare Pages discovers the proxy in `src/frontend/functions/sitemap.xml.ts` when the Pages project root is `src/frontend`. Configure `API_BASE_URL` in the Pages environment to the Render API origin (for example, `https://your-api.example.com`). Configure `PublicSite__BaseUrl` in the API runtime to the public frontend origin. The proxy serves the localized XML sitemap at the public `/sitemap.xml` path.

## Production security configuration

The API refuses to start outside Development unless it receives a PostgreSQL connection string, a JWT key of at least 32 random UTF-8 bytes, a non-wildcard `AllowedHosts` value, HTTPS-only `AllowedOrigins`, and an HTTPS `PublicSite__BaseUrl`. Configure these through the hosting provider's secret/environment settings; do not add production values to source files.

Terminate HTTPS and redirect HTTP at the production hosting edge. The API emits HSTS outside Development. If deployed behind a proxy, trust forwarded headers only from the actual proxy addresses before relying on client-IP controls. The login endpoint has an app-level rate limit and ASP.NET Identity account lockout; also configure a rate limit for `/api/auth/login` at the edge when the app sees a shared proxy address.

Cloudflare Pages responses get a Content Security Policy and browser security headers from `src/frontend/functions/_middleware.ts`. Set `API_BASE_URL` to the API origin so the policy permits API connections. The application has no file-upload endpoint; video stays on YouTube and image URLs are externally hosted.

## Verification

Run the backend test suite from the repository root with `dotnet test SpaceMedia.sln`, then create a release build with `dotnet build SpaceMedia.sln --configuration Release --no-restore`. From `src/frontend`, run `npm test` for the frontend suite and `npm run build` for the production frontend build. Automated backend tests cover JWT signature, claims, admin role, configured expiry, and service/portfolio CRUD including galleries and project-service links.

## Current scope and phase order

The project originally agreed phases define the source of truth. An earlier README revision shifted phase numbers and incorrectly suggested later phases had been completed. The repo contains partial public website work and an admin services/portfolio feature that was implemented prematurely; that does not mean the intervening phases are complete.

- Phases 1–3: repository and layered architecture, bilingual database entities, PostgreSQL migrations and development seed data, and admin Identity/JWT foundation.
- Phase 4: localized public read API for published site content.
- Phase 5: premium bilingual public website experience. The homepage, responsive shared navigation, API-backed content pages, category detail, search, and 404 experience are implemented. Visual review at mobile and desktop sizes remains unverified.
- Phase 6: video platform and YouTube integration. API search/filter/pagination, categories and video admin, and duplicate-safe YouTube synchronization are implemented. Live sync requires `YouTube__ApiKey` and `YouTube__ChannelId` in the local/runtime environment.
- Phase 7: services and portfolio management now meets the agreed scope: bilingual service and case-study content, translated project categories, gallery management, service/project links, publish/order controls, SEO metadata, and public detail pages with contact CTAs.
- Phase 8: bilingual editorial article management with protected author/article CRUD, draft and scheduled publishing, localized SEO fields, and the public Insights pages.
- Phase 9: protected site settings management for bilingual agency identity and descriptions, contact details, brand image URLs, and ordered social links.
- Phase 10: bilingual administration dashboard with content management navigation, dashboard metrics, video filtering/pagination/actions, and YouTube synchronization tools.
- Phase 11: dynamic SEO metadata and structured data, language-aware sitemap and robots rules, deferred YouTube embeds, bounded API response caching, image/font loading improvements, and keyboard/reduced-motion refinements. Visual mobile review remains unverified due to a saved browser-access restriction for localhost.

See [docs/PHASE_STATUS.md](docs/PHASE_STATUS.md) for the corrected checklist and acceptance criteria.
See [docs/PHASE_13_QA.md](docs/PHASE_13_QA.md) for Phase 13 automated QA results and the remaining live-browser/device checks.
See [docs/YOUTUBE.md](docs/YOUTUBE.md) for YouTube configuration, sync behavior, and video filtering.

See [docs/DATABASE.md](docs/DATABASE.md) for the schema and migration workflow.
See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for admin login and token handling.
See [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) for Phase 12 security findings and production configuration requirements.
See [docs/PUBLIC_API.md](docs/PUBLIC_API.md) for public content endpoints and visibility rules.
See [docs/ADMIN_CONTENT.md](docs/ADMIN_CONTENT.md) for services, projects, and Insights management endpoints.


## Phase 12.5 — business domain alignment

The public brand and information architecture are aligned to East West Hub: Watch, Podcasts, Services, Projects, Insights, About, and Contact. Video records retain their existing table/API foundation with a `ContentType` enum and optional podcast episode, season, guest, and localized SEO metadata. See [docs/PHASE_12_5.md](docs/PHASE_12_5.md) for scope and migration details.
