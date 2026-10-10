# Final acceptance matrix

| Test ID | Area | Scenario | Environment | Actual | Status | Evidence | Severity |
|---|---|---|---|---|---|---|---|
| SEC-HTTP-01 | API/Security | JWT validity and Admin authorization | TestServer | 18 release-gate tests passed | PASS | `ReleaseGateHttpTests` | — |
| SEC-HTTP-02 | API/Security | CORS and login rate limiting | TestServer | Allowed/disallowed origins and 429 threshold passed | PASS | `ReleaseGateHttpTests` | — |
| API-REG-01 | API | Complete backend regression after the UTC persistence correction | Unit/TestServer | 71 passed, 0 failed, 0 skipped | PASS | `dotnet test SpaceMedia.sln --no-restore` | — |
| WEB-REG-01 | Public/Admin | Frontend suite | Angular/Vitest | 41 passed | PASS | `npm test` baseline | — |
| CF-01 | Release | Pages functions type check | TypeScript | Passed | PASS | `npx tsc --noEmit` | — |
| PUB-BROWSER-01 | Public | English/Arabic routes, RTL, responsive layouts | Browser | Automation unavailable | BLOCKED | Manual checklist | HIGH |
| ADMIN-BROWSER-01 | Admin | First-click, CRUD, navigation, session behavior | Browser | Automation unavailable | BLOCKED | Manual checklist | HIGH |
| ADMIN-CAT-CRUD-01 | Admin | Categories create, edit, delete and persistence | Browser / Development | User-confirmed with disposable record; record removed | PASS | Owner acceptance | — |
| ADMIN-CAT-REG-01 | Admin | Validation, no invalid request, empty image URL normalization, refresh | Angular/Vitest | 2 focused scenarios passed | PASS | `admin-experience.spec.ts` | — |
| WEB-BUILD-01 | Release | Angular production build | Angular CLI | Passed; 499.73 kB initial / 121.22 kB estimated transfer | PASS | `npm run build` | — |
| WEB-LANG-DETAIL-01 | Public | Service details Arabic/English alternate slug switching | Angular/Vitest | Raw alternate slug and target-locale API lookup verified in both directions | PASS | `content-detail.page.spec.ts` | — |
| ADMIN-PROJECT-REG-01 | Admin | Create reconciles the saved project, prevents duplicate save, clears stale filters, ignores an older list response, and refreshes the view | Angular/Vitest | 4 focused scenarios passed | PASS | `admin-experience.spec.ts` | — |
| ADMIN-PROJECT-REG-02 | Admin | Edit reconciliation and failed-save behavior | Angular/Vitest | Existing projects retained; failed save keeps editor open and shows alert | PASS | `admin-experience.spec.ts` | — |
| WEB-REG-02 | Public/Admin | Complete frontend regression suite after Projects and Articles corrections | Angular/Vitest | 11 files, 53 tests passed, 0 failures | PASS | `npm test` | — |
| WEB-BUILD-02 | Release | Angular production build after Articles diagnostics correction | Angular CLI | Passed; 502.08 kB initial / 121.53 kB estimated transfer; 0 errors, 1 budget warning | PASS WITH WARNING | `npm run build` | LOW |
| ADMIN-PROJECT-BROWSER-01 | Admin | Project create/edit followed by immediate list visibility and persistence | Browser / Development | Pending user retest | BLOCKED | Manual browser acceptance required | HIGH |
| ADMIN-ARTICLE-REG-01 | Admin | Missing hidden Arabic identity fields are identified and no request is sent | Angular/Vitest | `titleAr` and `slugAr` select the Arabic tab and show validation state | PASS | `admin-experience.spec.ts` | — |
| ADMIN-ARTICLE-REG-02 | Admin | Valid create, optional empty-string normalization, list refresh, and API validation error | Angular/Vitest | 3 focused Article scenarios passed | PASS | `admin-experience.spec.ts` | — |
| ADMIN-ARTICLE-BROWSER-01 | Admin | Article Create with bilingual identity fields and an active author | Browser / Development | Pending user retest | BLOCKED | Manual browser acceptance required | HIGH |
| ADMIN-ARTICLE-REG-03 | Admin | Complete bilingual request rejected for an inactive author | Angular/Vitest | API 409 active-author response is shown as a specific author error | PASS | `admin-experience.spec.ts` | — |
| ADMIN-ARTICLE-UTC-01 | Admin/API | Create and Update with `+03:00` publication timestamp preserve the instant and persist a UTC offset; nullable draft date remains null | Isolated backend regression | 24 focused tests passed, 0 failed | PASS | `AdminArticleManagerTests` | — |
| VIDEO-UTC-01 | API | Externally supplied YouTube publication timestamp is normalized before video persistence | Isolated backend regression | Included in 24 focused tests; 0 failures | PASS | `AdminVideoManagerTests` | — |
| ADMIN-ARTICLE-BROWSER-02 | Admin | Article Create and Update with local-time publication date against Development PostgreSQL | Browser / Development | Pending retest after UTC normalization | BLOCKED | Manual browser acceptance required | HIGH |
| PUBLIC-WATCH-API-01 | Public/API | Watch includes all eligible non-podcast media types and excludes podcasts, drafts, and scheduled media | Development database + backend regression | Admin: 22 records; eligible Watch: 14; live public API: `totalCount: 14` | PASS | `PublicApiQaTests`; live `/api/v1/public/videos` query | — |
| PUBLIC-WATCH-BROWSER-01 | Public | Watch listing pagination and detail navigation for non-podcast media types | Browser / Development | Pending visual retest after API correction | BLOCKED | Manual browser acceptance required | MEDIUM |
| YOUTUBE-LIMIT-01 | API | Optional configured import limit, default behavior, and invalid-value fallback | Backend regression | 24 focused tests passed; complete backend suite 77 passed | PASS | `AdminVideoManagerTests`; `dotnet test SpaceMedia.sln --no-restore` | — |
| YOUTUBE-LIVE-01 | Admin / Development | NASA channel synchronization with Development limit of five distinct records | Browser / Development | Not run by instruction | BLOCKED | Requires explicit manual Sync action | MEDIUM |
