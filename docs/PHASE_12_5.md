# Phase 12.5 — East West Hub domain alignment

## Audit

The repository already has the Angular public application, ASP.NET Core API/Application/Domain/Infrastructure layers, EF Core/PostgreSQL, bilingual routes/resources, YouTube synchronization, protected admin modules, SEO metadata, and deployment configuration. The business-name mismatch was primarily in public copy, SEO labels, development fixtures, and documentation. Media records were video-only, with no first-class podcast routes or editorial metadata. The contact page had no lead selector or submission API; it used configured contact details only.

## Changes

- Updated customer-facing branding and bilingual copy for East West Hub and the Watch, Podcasts, Services, Projects, Insights, About, and Contact information architecture. Existing `/videos`, `/portfolio`, and `/articles` public URLs redirect to their new public paths; internal API/entity names remain stable.
- Added `MediaContentType` on the existing Video table plus episode/season, localized guest, and localized SEO fields. This avoids a disruptive media-table rewrite while leaving room for other content types.
- Added anonymous paginated/searchable podcast list and localized detail API routes, public pages, structured PodcastEpisode metadata, language-aware links, homepage feature selection, and cross-language search.
- Added a Podcasts admin navigation/view reusing the existing bilingual media editor, with content classification and podcast metadata fields. Dashboard metrics now distinguish media, videos, and podcasts.
- Updated only deterministic development seed IDs and known QA slugs. The ten sample services align with the supplied taxonomy. Sample data is fictional; no real clients, campaign results, or company history are asserted.
- Replaced the cosmic development illustration with a locally served production-studio illustration. Updated README, API, database, and YouTube docs.

## Database migration

`AddMediaContentTypesAndPodcasts` adds a non-null integer content type defaulted to Video and optional episode/season, guest, and SEO columns. A no-op EF snapshot reconciliation migration follows it so EF Core records the complete current model without altering additional columns. It preserves all previous migrations and existing Video rows. Development startup aligns only recognized deterministic demo records; unrelated editorial rows are not rewritten. Apply normally via the existing Development migration startup, or with `dotnet ef database update` after configuring the local connection.

## Verification

Frontend and backend production builds passed after the changes. Targeted backend tests passed (18/18); selected frontend tests passed (5/5). Frontend and backend production builds passed. The local Development database migration and neutral sample-data alignment also completed. Live-browser review is not included in this phase.

## Explicitly unchanged

- No new production client facts, contact details, awards, performance metrics, or partnerships were invented. The project-type selector prepares an email to the configured contact address; it does not claim a form submission service or invent contact details.
- Existing EF entity/API assembly names such as `Video`, `Portfolio`, and `Articles` remain internal compatibility details.
- Phase 13 full QA/device/browser plan remains separate.
