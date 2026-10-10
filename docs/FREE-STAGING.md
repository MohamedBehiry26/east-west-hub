# East West Hub — free staging preparation

These instructions prepare a client preview using the existing Angular + ASP.NET Core + PostgreSQL stack. They are not authorization to deploy. No resource, account, migration or administrator is created by the repository configuration.

## Architecture and free-tier limits

Cloudflare Pages serves Angular and Pages Functions. `/api/*` forwards only to the configured HTTPS Render API origin. Render runs the .NET 10 container. A separate Supabase project provides PostgreSQL. YouTube hosts playback; no Data API key, channel sync or automatic imports are needed.

Use only free plans without a payment method. If a provider requires payment details or no longer offers the required free tier, stop and reassess rather than upgrading. Render free web services sleep after 15 minutes of inactivity; the first request can take around a minute. Supabase free projects may pause after low activity over seven days. Open and verify the preview before the client meeting. This setup is a temporary preview, not an always-on production promise. Check current provider quotas before deployment.

Official references: https://render.com/docs/free, https://render.com/docs/docker, https://supabase.com/docs/guides/platform/free-project-pausing, https://developers.cloudflare.com/pages/functions/.

## 1. Validate and freeze the source

From the repository root:

```powershell
dotnet test SpaceMedia.sln --configuration Release --no-restore
dotnet build SpaceMedia.sln --configuration Release --no-restore
dotnet publish src/backend/SpaceMedia.Api/SpaceMedia.Api.csproj --configuration Release --no-restore --output work/staging-publish
```

From `src/frontend`:

```powershell
npm ci
npm test -- --watch=false
npm run test:staging
npm run build
```

With Docker available, from the root: `docker build -t east-west-hub-staging .`. Do not point a smoke-test container at development or production data: startup can bootstrap Identity and Development can migrate a database. Use an explicitly disposable database for container acceptance.

Review the release contents, including untracked files, before any later authorized deployment. No commit or push is part of this preparation.

## 2. Supabase staging database — separate from existing content

Create a dedicated Free project for staging only. Never replace, reset or import over the development/production database. Keep the database password exclusively in provider secrets or a private operator session.

For an IPv4 host, obtain the **session pooler** connection string from the Supabase Connect panel (normally port 5432), not the transaction pooler. Use its exact host, database and username; do not guess the project suffix. Configure Npgsql with TLS certificate verification (`SSL Mode=VerifyFull`); install the provider's trusted root certificate only if required by its current instructions. Never disable certificate validation.

Use a separate runtime role with only the application table/sequence privileges where practical, and a migration role for DDL. Do not put any PostgreSQL credentials or Supabase service-role keys in Angular or Pages variables.

Supabase's generated REST API is not the application's authorization layer. Ensure `anon` and `authenticated` roles cannot read or write the application's tables. After migration, review RLS/grants or remove application schemas from the Data API's exposed schemas. Verify anonymous REST access is denied. Do not rely on hiding an API key. In this dedicated staging database, an operator can revoke application-table/sequence grants from those roles and configure default privileges for future migrations. The ASP.NET API's database role must retain the required privileges.

## 3. Safe migration procedure — before API startup

No new migration is required for this preparation. The existing chain ends at `20261008221058_HomepageHeroVideo`; the model snapshot must match it.

1. Verify the explicit target is the staging database. Take a backup before changes to any populated target; inspect `__EFMigrationsHistory`.
2. In a private operator session, set `ConnectionStrings__DefaultConnection` to the staging migration connection. EF's factory also reads local User Secrets, so an explicit staging environment variable is essential. Never paste a password into a shared command transcript.
3. Generate the forward idempotent SQL from the root:

   ```powershell
   dotnet ef migrations script --idempotent --project src/backend/SpaceMedia.Infrastructure --startup-project src/backend/SpaceMedia.Api --configuration Release --no-build --output work/staging-migrations.sql
   ```

4. Review the generated SQL and target history. Apply the reviewed script using the staging provider SQL editor or a trusted PostgreSQL client. Do not use `database drop`, `EnsureDeleted`, downgrade migrations or automatic seed imports.
5. Confirm migration history and the hero column. Verify database grants, then use the runtime connection for the API.
6. Remove session-local secrets after use. Neither the SQL nor credentials belong in a public repository.

Production/Staging startup does **not** run migrations. An empty database must be migrated before Identity initialization. Do not switch the hosted API to Development to bypass this procedure.

## 4. Render — prepare a Free Docker web service

Repository root Dockerfile: `Dockerfile`; build context: root. The container runs the .NET 10 API as a non-root user and listens on Render's `PORT` (8080 fallback). Health check: `/health`. This is process liveness, not proof of database readiness; also check a public content endpoint after initialization.

Set these in Render's environment/secret settings only:

| Variable | Value / rule |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Staging` |
| `ConnectionStrings__DefaultConnection` | Private staging Npgsql connection, with verified TLS |
| `Jwt__Key` | Unique cryptographically random staging key, at least 32 UTF-8 bytes; never reuse production |
| `Jwt__Issuer` | `EastWestHub.Staging.Api` |
| `Jwt__Audience` | `EastWestHub.Staging.Admin` |
| `Jwt__AccessTokenMinutes` | `15` |
| `AllowedHosts` | Exact Render API hostname, no scheme/port/wildcard |
| `AllowedOrigins__0` | Exact HTTPS Pages preview origin, no path or trailing slash |
| `PublicSite__BaseUrl` | Same HTTPS Pages origin |
| `Development__SeedDemoContent` | `false` |

Do not set `Testing__SkipStartupDataInitialization`, any YouTube key or sync variables. Do not trust arbitrary forwarded-IP headers. The same-origin proxy deliberately strips visitor-supplied proxy/IP headers; per-account Identity lockout remains active. App IP throttling may group proxied clients, so configure provider-supported edge login rate limiting if available on the free plan, and verify legitimate login attempts are not blocked. Do not enable paid rules.

## 5. First staging administrator

After migrations, temporarily supply `AdminBootstrap__Email` and `AdminBootstrap__Password` as staging secrets. The password requires at least 12 characters, uppercase, lowercase, digit and symbol. Starting the Staging API creates the first Identity administrator through existing bootstrap code; it never imports media/content.

Verify login, then remove both bootstrap secrets together and restart/redeploy when separately authorized. Existing administrators remain in PostgreSQL. Additional accounts can be created through `/admin/accounts`. Do not expose the dashboard credentials in the client preview link or create a client administrator before owner approval. All created accounts have full Admin rights; there is no restricted client role.

## 6. Cloudflare Pages

- Project root: `src/frontend`.
- Node: 22.12 or later supported by Angular 21; install from the lockfile with `npm ci`.
- Build: `npm run build`.
- Output: `dist/space-media-web/browser`.
- Existing `wrangler.toml` describes the Pages output and defaults to staging noindex.
- Set `API_BASE_URL` to the HTTPS Render **origin only** (no `/api`, credentials, query or fragment).
- Set `STAGING_NOINDEX=true` for both preview and production variables of this staging Pages project.
- Do not put JWT/DB/bootstrap secrets in Pages. It needs only the public API origin.
- Retain the default SPA fallback; verify direct `/ar/watch/...` and `/admin/login` refresh. Pages Functions must actually be included in the deployment. A static-files-only upload is insufficient.
- The proxy preserves bearer tokens, methods, query and bounded request bodies; it does not forward cookies or follow redirects. API responses use `no-store` at the proxy.
- `X-Robots-Tag: noindex, nofollow, noarchive` covers staging responses; staging robots disallows crawling. Noindex is not access control: the staging URL remains public.

An empty staging database has no site settings/content. Use the dashboard to create approved settings and a small bilingual preview dataset, or restore a reviewed content-only copy into the **new staging database** after separate approval. Do not enable seeding to reconstruct deleted records. Preserve all existing databases. Correct the currently wrong YouTube social URL and replace/identify demo content before sharing.

## 7. Required acceptance before sharing

On the actual HTTPS staging URL verify public navigation, both languages, mobile layout, direct refresh, valid/missing details, poster-only media, actual YouTube playback and scroll stability. Sign in and use disposable staging records to verify each module's create/edit/save/error/retry/refresh persistence. Verify ordinary media edits preserve tags, episode/guest/SEO fields and publication/source data. Check failed/expired sessions, admin 401/403, social duplicate validation, network errors and settings retries.

Backend manager tests use isolated InMemory data, not a real PostgreSQL migration/persistence acceptance. Pages proxy tests mock upstream fetch, not a deployed Cloudflare runtime. Verify Docker, HTTPS proxy behavior, Supabase connectivity/grants and actual persistence before declaring the public preview ready. No paid resource, public deployment, migration or database change is performed by these instructions.
