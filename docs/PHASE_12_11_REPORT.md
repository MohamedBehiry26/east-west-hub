# Phase 12.11 — Admin first-click data loading

## Findings and correction

1. The previous sidebar navigation correction already produced one router navigation per click.
2. Source and log review found the Admin API endpoints returning the seeded catalog queries, including videos, services, categories, projects, and articles.
3. Dashboard state is signal-based, while the other Admin pages were assigning HTTP results to ordinary component fields.
4. A missed Angular render scheduling boundary after these imperative subscription callbacks explains why a later user interaction could reveal data that had already arrived.
5. This phase adds `ChangeDetectorRef.markForCheck()` only at asynchronous HTTP success and error boundaries.
6. No timeout, reload, synthetic click, repeated navigation, duplicate request, auth relaxation, API change, or database change was introduced.
7. The correction covers Videos, Podcasts, Categories, Services, Projects, Articles, Tags, YouTube category loading, and Settings.
8. The Dashboard already uses signals and was not changed.

## Flow verification

- Videos: first component initialization requests `/api/admin/videos` and `/api/admin/categories`; a response populates and renders the video row.
- Services: first component initialization requests `/api/admin/services`; a response populates and renders the service row.
- Existing API logs show authenticated reads for the Admin catalog endpoints, and the Development database still contains 22 media records, 6 podcasts, 10 services, 8 projects, and 8 articles.
- Authentication attaches the bearer token synchronously from the in-memory session before the request. Locale setup has no asynchronous translation loading and does not reset module state.
- The Videos and Podcasts routes share a component class but use route snapshot data only to select the content-type filter; each route activation creates the corresponding lazy component and runs its initial load.

## Regression coverage

- Added first-load tests that create Videos and Services once, assert their initial HTTP requests, flush data, and assert the visible record text.
- Existing sidebar test continues to cover one-click route and active-state changes for every Admin module.
- Frontend tests: **41 passed** across 11 files.
- Angular production build: passed, with an initial bundle of **497.11 kB raw / 121.07 kB estimated transfer**.
- Cloudflare Pages function TypeScript check: passed.

## Limits

Interactive localhost browser access remains restricted in this task environment. Automated route/component/request/response/render coverage and the code-level correction are complete, but final live-browser acceptance for direct load, refresh, back/forward, and rapid navigation remains pending user verification.

No deployment was made and Phase 13.5 was not started.
