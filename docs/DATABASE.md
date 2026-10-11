# Database foundation

The API uses EF Core with Npgsql and PostgreSQL. Supabase PostgreSQL is the deployment target. Schema mappings and migrations live in `EastWestHub.Infrastructure`; the API owns development-time startup initialization.

## Entities

- `User`: author profile used by editorial content. Identity accounts are stored separately in the standard `AspNetUsers` table; an editor profile is not itself a login account.
- `Category` and `Video`: both store English and Arabic names/titles, slugs, and descriptions. A media record belongs to one category and references a YouTube video ID; `ContentType` separates videos from podcasts and other editorial formats without duplicating the storage model. Podcast records may include episode/season numbers, guest names, and localized SEO metadata. The application never stores video files.
- `Tag` and `VideoTag`: many-to-many video tagging with a composite key.
- `Service`: bilingual service content and SEO metadata.
- `PortfolioProject` and `PortfolioImage`: bilingual case studies with ordered gallery images and localized alt text.
- `Article`: bilingual editorial content authored by a `User` profile.
- `SiteSetting` and `SocialLink`: bilingual East West Hub identity/contact information and ordered social profiles.

## Integrity rules

- YouTube video IDs and each English/Arabic slug are unique within their entity type.
- User email and `(SiteSettingId, Platform)` are unique.
- Deleting a category or article author is restricted while content references it.
- Video tags and portfolio gallery images cascade with their owning content.
- Audit fields use UTC `DateTimeOffset` values. The context sets `CreatedAt` on insert and `UpdatedAt` on update.
- Images are stored as URLs/object references; binary files do not go in PostgreSQL.

## Development seed data

Development startup seeds clearly fictional media-oriented sample content only. The deterministic starter records are aligned in place to neutral East West Hub categories, services, projects, Insights, and media examples. The single published video uses YouTube's player demonstration clip; synthetic IDs and the podcast example remain drafts. Additional QA content is explicitly labeled as fictional and uses the local production-studio illustration.

The alignment routine only updates records with deterministic seed IDs or known QA seed slugs; unrelated editorial records are preserved. Never use development samples as production content. The seeded authors are not Identity accounts and have no passwords. Startup also ensures the `Admin` role exists; an administrator account is created only when both bootstrap environment variables are set.

## Migrations

Create a migration from the repository root:

```powershell
dotnet ef migrations add <MigrationName> `
  --project src/backend/EastWestHub.Infrastructure `
  --startup-project src/backend/EastWestHub.Api `
  --output-dir Persistence/Migrations
```

The EF design-time context reads the connection string from the Infrastructure project's .NET User Secrets, then from environment variables (environment variables take precedence). This lets the commands above use the same local connection configured for the API without putting credentials in the repository. On another machine, configure `ConnectionStrings__DefaultConnection` through User Secrets or the shell before running EF commands.

Generate an idempotent deployment script with:

```powershell
dotnet ef migrations script --idempotent `
  --project src/backend/EastWestHub.Infrastructure `
  --startup-project src/backend/EastWestHub.Api
```

Development startup applies migrations automatically only when a connection string is present. Production migration execution remains an explicit deployment operation; do not rely on web-service startup to mutate production schema.

## Configuration

Set `ConnectionStrings__DefaultConnection` in the local shell or deployment secret store. `.env.example` contains a local placeholder only; ASP.NET Core does not load `.env` files by itself. Never commit real credentials.

This checkout has a separate UTF-8 development cluster under the ignored `work/east-west-hub-postgres-data-utf8` folder, listening only on `127.0.0.1:5434`. Its connection string is held in the API project's .NET User Secrets. If the cluster is stopped, follow the start command in the README. This setup does not use or alter the machine's PostgreSQL service on port 5432.
