# Phase 13.5 acceptance matrix

| ID | Flow | Evidence | Status |
|---|---|---|---|
| P-01 | Public EN/AR route declarations, legacy redirects, 404 | Angular route tests and static route review | PASS (automated) |
| P-02 | Public localized data, visibility rules, search/filter/pagination | Backend QA tests | PASS (automated) |
| P-03 | Home, Watch, Podcasts, Services, Projects, Insights, About, Contact visual review at required viewports | Live browser is restricted | BLOCKED |
| P-04 | RTL, typography, language switching and horizontal-overflow review | Unit/static coverage; no live browser | BLOCKED |
| A-01 | Admin auth guard and bearer interceptor | Frontend tests | PASS (automated) |
| A-02 | Admin one-click navigation and active state | Admin shell test plus user confirmation | PASS |
| A-03 | First-load Videos and Services request/response/render | Frontend regression tests | PASS (automated) |
| A-04 | Full Admin CRUD with disposable records | Not run against a disposable HTTP environment | NOT RUN |
| H-01 | Backend authorization, JWT, validation, public access | 42 backend tests | PASS (unit/controller scope) |
| H-02 | Full HTTP middleware: CORS, headers, rate limit, malformed JWT | No WebApplicationFactory/TestServer suite exists | NOT RUN |
| D-01 | Development catalog counts | Independent DB check: 22 media, 6 podcasts, 10 services, 8 projects, 8 articles | PASS |
| D-02 | Migration/model alignment and seed idempotency | Backend tests | PASS (automated) |
| R-01 | Angular production build and Pages function typecheck | Build and TypeScript checks | PASS |
| R-02 | .NET Release build | Release build | PASS |
| R-03 | Deployment configuration and real provider resources | No deployment requested or created | NOT RUN |
