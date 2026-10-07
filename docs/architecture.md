# Architecture — Phases 1–6

## System context

The Angular site will call a versioned ASP.NET Core REST API. The API owns application behavior and data access. PostgreSQL hosted by Supabase is the planned database. YouTube hosts and streams video; this system stores references and metadata only. Supabase Storage is reserved for eligible image assets.

```text
Browser ── HTTPS/JSON ──> ASP.NET Core API ──> PostgreSQL (Supabase)
   │                           │
   └──── YouTube embeds        └──── YouTube API adapter (later phase)
```

## Backend dependency direction

```text
Api ──> Application ──> Domain
 │           ▲
 └──> Infrastructure ──> Application + Domain
```

- **Domain** owns entities, value objects, and business invariants; it has no framework dependencies.
- **Application** owns use cases and ports/interfaces; it depends on Domain.
- **Infrastructure** implements persistence and external-service ports; it depends inward on Application and Domain.
- **API** is the composition root and HTTP boundary. Controllers should remain thin and delegate to Application.

Keep provider-specific code out of Domain and Application. Use dependency injection at the API composition root. EF Core mappings and migrations belong in Infrastructure. Never commit connection strings, JWT signing keys, or provider credentials.

## Localization

The frontend uses language-prefixed routes (`/en`, `/ar`) and sets the document `lang` and `dir` (`ltr` / `rtl`) from the active locale. Public landing-page copy currently has explicit English and Arabic variants. Backend content models represent translations with language-specific fields; content APIs will select the requested locale in a later phase.

## Hosting and operations direction

- Build Angular as static assets for Cloudflare Pages.
- Containerize or publish the API for Render.
- Configure Supabase PostgreSQL credentials only through the hosting environment's secret store.
- Configure CORS with explicit production origins; local development permits the Angular dev server.
- Health checks, database migrations, development seed data, the admin Identity/JWT foundation, anonymous localized public read APIs, and bilingual public browsing pages are in place. Development startup applies migrations and sample data only when a connection string is configured. Admin content management, YouTube integration, and production deployment are later phases.
- Set the public contact address in `src/frontend/src/environments/environment.ts` before release. It is intentionally empty by default; no address is assumed.

## Decisions

1. **.NET 10 LTS**: long support window for the API and EF Core stack.
2. **Angular 21**: supported Angular line compatible with the available Node 22.12 runtime.
3. **Layered backend**: isolates business rules and use cases from HTTP, PostgreSQL, and external providers.
4. **No video file handling**: YouTube remains the streaming platform; the database stores metadata and IDs.
5. **Bilingual from the outset**: route and content architecture reserves `en` and `ar` and full RTL support.
