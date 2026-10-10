# Phase 13.7 release-gate report

## Automated results

- HTTP release-gate suite: 18 passed, 0 failed. Covers JWT rejection/acceptance, administrator role enforcement, CORS, login rate limiting, security headers, safe invalid-JSON handling, and `/health`.
- Previous complete backend suite: 45 passed before this phase. The release-gate suite was run independently after its isolated TestServer setup passed.
- Frontend suite: 41 passed in the last completed run.
- Cloudflare Pages function TypeScript check: passed.
- Secret signature scan: passed.

## Test isolation

`Testing:SkipStartupDataInitialization` is honored only in the `Testing` environment. It prevents migrations, seed data, and identity bootstrapping during TestServer tests; the test configuration uses an unreachable placeholder database connection and does not access development or production data.

## Browser acceptance

Browser automation remains unavailable for localhost. Public visual, RTL/responsive, administrator navigation, and disposable CRUD browser scenarios are **BLOCKED**, not passed. Use the existing `MANUAL_BROWSER_CHECKLIST.md` before production release.

## Source changes

- `src/backend/SpaceMedia.Api/Program.cs`
- `src/backend/SpaceMedia.Tests/ReleaseGateHttpTests.cs`

No commit, push, deployment, production resource, or production migration was performed.

## Release build lock resolution

The local `SpaceMedia.Api.exe` Release process was verified by PID and stopped with owner approval to release its locked DLLs. `dotnet build SpaceMedia.sln --configuration Release --no-restore` then passed with 0 warnings and 0 errors. The local API was restarted with its prior Release/no-build logging configuration. Process startup was verified; localhost HTTP health verification remains manual because this session cannot access localhost through browser or raw HTTP tooling.

## Branding correction

The Admin top navigation now uses the localized official label: `East West Hub Administration` in English and `إدارة إيست ويست هب` in Arabic. A targeted frontend source scan found no remaining user-facing `Space Media`, `SpaceMedia`, or `Space Media Agency` references; retained technical namespace references are excluded from this branding check.

The reported legacy label next to the language switcher was an existing authenticated account `displayName`, not a translation key. That location now renders the localized official administration brand and retains the current page title in the navigation context.

## User-confirmed Categories CRUD acceptance

Using disposable development data, the project owner confirmed Create, refresh persistence, Edit, updated refresh persistence, Delete, and deletion refresh persistence all pass in a real browser. The disposable category was removed. The Categories form normalizes an empty optional image URL to `null`; the focused regression test covers that payload.

Final frontend regression run: 43 tests in 11 files passed with 0 failures. The Categories suite covers invalid submission without an HTTP request and empty `imageUrl` normalization to `null` on create. Angular production build passed with a 499.73 kB initial bundle and 121.22 kB estimated transfer.

After service-detail language-switch regression coverage was added, the complete frontend suite passed again: 11 test files and 45 tests, with 0 failures. The final Angular production build passed with 0 warnings and 0 errors; initial output remained 499.73 kB raw and 121.22 kB estimated transfer.

## Admin Projects list refresh correction

The Admin Projects save path closed the editor and then issued a fresh list request. It did not mark the view for checking at the save callback, and it accepted a response from any earlier in-flight list request. A stale response could therefore replace the current collection after a confirmed POST or PUT. When the search input also held text such as `Non`, the existing client-side filter correctly produced zero results and made the stale collection look like an empty project catalog.

The save callback now reconciles the confirmed POST/PUT response into the existing collection, invalidates earlier list responses, resets the search, status filter, and current page, then marks the view for checking. This preserves existing projects, immediately shows the saved project, and prevents duplicate clicks while saving. Failed saves leave the editor open, retain the existing collection, and show the existing error alert. The search control has an explicit portfolio-specific name and disables browser autocomplete; no application code or API response assigned `Non` to the query value.

Focused Admin Projects regression run: 1 file passed with 11 tests and 0 failures. It covers create with one request only, immediate collection reconciliation, reset of stale search/status/page state, an older list response completing after the save, edit reconciliation without removing existing projects, and failed-save behavior.

Current complete frontend run: 11 test files, 49 tests passed, 0 failures. `npm test` now invokes the Angular test target correctly; the prior script passed the obsolete `--watch=false` argument to Angular 21. Angular production build passed with 0 errors and 0 warnings; initial output was 499.73 kB raw and 121.20 kB estimated transfer.

Real-browser confirmation for the Admin Projects create/edit refresh flow remains pending. No backend, database, deployment, Git commit, push, or production resource change was made.

## Admin Articles validation correction

The Article form requires four bilingual identity fields: `titleEn`, `slugEn`, `titleAr`, and `slugAr`. It also requires a selected author. The API accepts empty content, excerpts, SEO values, publication date, and cover image; these are optional. The article manager additionally rejects an unknown or inactive author with a conflict response.

The reported visible English values alone cannot make the form valid: when the hidden Arabic tab has no title or slug, the invalid controls are `titleAr` and `slugAr`. The original UI did not identify either field, and its error callback reduced every non-conflict API response to the same generic message. The exact historical browser response cannot be reconstructed because its network payload was not recorded, but the visible form state and client validators establish the missing Arabic identity fields as invalid.

The form now permits a save attempt to mark fields touched, selects the first incomplete language tab, and shows field-level messages for English/Arabic title and slug plus the author. It blocks invalid requests, normalizes optional empty strings and cover image URL to `null`, avoids duplicate saves, marks asynchronous updates for rendering, and keeps the editor open for API errors. API validation failures and inactive-author conflicts now receive distinct localized messages.

Focused Admin Articles run: 14 tests in the Admin experience file passed with 0 failures, covering hidden-Arabic validation with no request, valid bilingual create with optional-value normalization and list reload, and API validation error handling. The complete frontend suite then passed: 11 files, 52 tests, 0 failures.

The Angular production build passed with 0 errors. It emitted one budget warning: the 501.28 kB initial bundle exceeds the 500 kB warning threshold by 1.28 kB (estimated transfer 121.50 kB). Real-browser retest of Article Create remains pending.

## Articles live-failure diagnostics follow-up

The current source cannot recover the prior browser request, but its generic Arabic message is emitted only after an HTTP error callback. The UI now distinguishes client validation from API failures: field-level Problem Details errors, inactive-author conflict, expired session (401), and insufficient permission (403) are all displayed separately. A complete bilingual request rejected with `409 Select an active author.` is covered by regression testing, confirming that this failure occurs after the API request.

Focused Admin Articles checks: 15 tests passed. Current complete frontend suite: 11 files, 53 tests passed, 0 failures. Production build passed with 0 errors and one initial-bundle budget warning: 502.08 kB, 2.08 kB above the 500 kB warning threshold (121.53 kB estimated transfer). Browser acceptance remains required to capture the actual HTTP status for the reported attempt.

## Articles UTC persistence correction

The Development browser retest produced a confirmed EF Core persistence failure. PostgreSQL rejected `Article.PublishedAt` because the incoming `DateTimeOffset` had offset `+03:00`, while the `timestamp with time zone` mapping accepts UTC offsets only. `CreatedAt` and `UpdatedAt` were already generated with `DateTimeOffset.UtcNow` by `SpaceMediaDbContext`; the failing property was the client-supplied `PublishedAt` value.

`AdminArticleManager` now applies `ToUniversalTime()` to the nullable input before assigning it for both Create and Update. This preserves the represented instant, keeps `null` values null, and preserves the existing draft/publish behavior. No schema change and no existing content modification was made. The related YouTube metadata ingestion and video synchronization path were also audited and now normalize externally supplied publication timestamps before they reach `Videos`.

Focused backend regression run: 24 passed, 0 failed, 0 skipped. It covers Article Create and Update with `+03:00`, UTC instant preservation, zero UTC offset on the persisted value, nullable draft publication dates, existing article CRUD behavior, and non-UTC YouTube source timestamps. The complete backend suite then passed: 71 passed, 0 failed, 0 skipped. `dotnet build SpaceMedia.sln --configuration Release --no-restore` passed with 0 warnings and 0 errors.

The local Development API was restarted from the existing `http` launch profile after the Release build. It is listening on `127.0.0.1:5080`; `/health` returned HTTP 200. Real-browser Article Create and Article Update acceptance remain pending.

## Public Watch video eligibility correction

Read-only Development database audit found 22 media records in the Admin catalog. The prior public Watch API response contained 2 records, which matched the only two rows classified as `MediaContentType.Video`. The other eligible non-podcast records were classified as Program (2), Interview (2), Campaign (2), Documentary (1), Original Content (2), Event (1), and Branded Content (2). Five published podcasts remain correctly exclusive to `/podcasts`; one draft podcast, one draft documentary, and one future-scheduled event remain excluded from public display.

The discrepancy was a backend classification mismatch: Admin labels every non-podcast media type as Videos, while `PublicContentReader.GetVideosAsync` and the Watch detail lookup restricted results to the single `Video` enum value. The Watch query and detail lookup now include every non-podcast media type. The Watch tags endpoint uses the same non-podcast eligibility rule. No existing record, category, publication flag, or schedule was modified.

Focused Public API regression run: 11 passed, 0 failed, 0 skipped. It verifies that Watch includes Video and Program records while excluding Podcast, draft, and future-scheduled media. Full backend suite: 72 passed, 0 failed, 0 skipped. Release build: passed with 0 warnings and 0 errors. The restarted Development API returned HTTP 200 from `/health` and HTTP 200 with `totalCount: 14` from the unfiltered Watch API query; all 14 eligible records were returned with a page size of 50.

## Safe YouTube synchronization import limit

YouTube synchronization now supports optional server-side `YouTube:MaxImports`. The default remains 500, preserving the prior behavior. Whole-number values from 1 through 500 are accepted; missing, zero, negative, oversized, or malformed values safely fall back to 500. The limit is applied after upload IDs are de-duplicated and before metadata processing, so it bounds the number of distinct records a synchronization can process.

Development User Secrets now set `YouTube:MaxImports` to 5. No API key, channel setting, production configuration, or synchronization was changed. Focused YouTube regression tests passed: 24 passed, 0 failed, 0 skipped. They cover the configured limit, default behavior, and invalid configuration fallback. The complete backend suite passed: 77 passed, 0 failed, 0 skipped. Release build passed with 0 warnings and 0 errors. The Development API was restarted successfully and `/health` returned HTTP 200.
