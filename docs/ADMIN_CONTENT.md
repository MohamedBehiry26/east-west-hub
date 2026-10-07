# Admin services and portfolio

All routes below require an authenticated user in the `Admin` role. The Angular route guard is only a navigation aid; the API enforces access.

## Services

- `GET /api/admin/services` lists drafts and published records ordered by display order.
- `POST /api/admin/services` creates a service.
- `PUT /api/admin/services/{id}` updates a service.
- `DELETE /api/admin/services/{id}` deletes a service.

Requests carry English and Arabic titles, slugs, short and full descriptions, capability lists, process text, image URL, display order, publication state, and localized SEO title and description fields. Capabilities and process can be entered as newline-separated text. Slugs must be unique in each language. A duplicate slug returns `409 Conflict`.

## Portfolio projects

- `GET /api/admin/portfolio` lists all projects with their ordered image gallery.
- `POST /api/admin/portfolio` creates a project.
- `PUT /api/admin/portfolio/{id}` updates a project and replaces its gallery with the submitted image list.
- `DELETE /api/admin/portfolio/{id}` deletes the project and its gallery.

Projects support English and Arabic titles, slugs, overview, challenge, solution, results, client, cover image, project date, display order, featured and published states, localized SEO fields, linked services, and gallery entries with a URL, localized alt text, and display order. Service detail pages show linked published projects; project detail pages list the services used. Images are external URLs; binary image upload and storage are not part of this phase. Database migrations add project display order, service capability/process fields, and the service-project relationship.

The dashboard pages are available at `/admin/services` and `/admin/portfolio` after sign-in.

## Editorial articles

- `GET /api/admin/authors` lists active editorial authors.
- `GET /api/admin/articles` lists drafts and published articles.
- `POST /api/admin/articles` creates an article.
- `PUT /api/admin/articles/{id}` updates an article.
- `DELETE /api/admin/articles/{id}` deletes an article.

All routes require the `Admin` role. Article fields include English and Arabic titles, unique slugs, excerpts, long-form text/Markdown content, cover image URL, author, publication timestamp/state, and localized SEO metadata. Publishing without a chosen timestamp starts publication immediately; a future timestamp schedules publication, and public API filtering keeps it hidden until that time. The admin editor is at `/admin/articles` (shown as Insights in the dashboard); the public Insights section uses `/en/insights` and `/ar/insights`; `/articles` remains an internal API compatibility route and legacy public redirect.

## Site settings

- `GET /api/admin/settings` returns the agency profile and social links.
- `PUT /api/admin/settings` updates the bilingual agency name, description and address; contact email and phone; logo and favicon URLs; and ordered social links.

Settings routes require the `Admin` role. Hidden social links are retained in admin settings and omitted from public contact information. The dashboard editor is at `/admin/settings`; the saved values feed the existing localized public settings API.
