# Manual browser acceptance checklist

Run after signing in locally with the API and frontend active. Record any failure with route, viewport, language, console output, and screenshot.

1. At 390×844, 768×1024, 1366×768, 1536×864, 1920×1080, and 2560×1440, open `/en` and `/ar`. Confirm no horizontal scrollbar, correct Hero text/media placement, no temporary captions, and correct reduced-motion behavior.
2. In both languages, visit Watch, Podcasts, Services, Projects, Insights, About, Contact, one valid detail route per type, each legacy redirect, and an invalid route.
3. Verify Arabic direction, mixed-language labels, dates, pagination, filters, search, keyboard focus, skip link, and language switching preserves the matching route.
4. In Admin, click Dashboard, Videos, Podcasts, YouTube, Categories, Tags, Services, Projects, Articles, and Settings once each. Confirm URL, active item, loading state, data request, and rendered data all change once.
5. Test browser refresh, Back/Forward, logout, expired/invalid session, and direct Admin URLs.
6. Using disposable records only, test supported create/edit/cancel/delete/validation/filter/pagination actions. Do not run YouTube sync with production credentials or send mailto messages to customers.
7. Inspect browser console/network for failed assets, 401/403 behavior, unexpected 404s, CORS errors, and unhandled exceptions.
