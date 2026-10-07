# Public content API

Public read endpoints are anonymous and return only published content. Every endpoint accepts `lang=en` or `lang=ar`; English is the default. Invalid languages return `400`.

## Endpoints

| Endpoint | Result |
| --- | --- |
| `GET /api/v1/public/site?lang=ar` | Localized agency details and visible social links |
| `GET /api/v1/public/categories?lang=en` | Published categories |
| `GET /api/v1/public/videos?lang=en&page=1&pageSize=12&category=content-production` | Published video-format media whose category is published |
| `GET /api/v1/public/videos/{slug}?lang=ar` | Published video-format media by localized slug |
| `GET /api/v1/public/podcasts?lang=ar&page=1&pageSize=12` | Published podcast episodes with optional search |
| `GET /api/v1/public/podcasts/{slug}?lang=en` | Published podcast episode by localized slug |
| `GET /api/v1/public/services?lang=ar&page=1&pageSize=12` | Published services |
| `GET /api/v1/public/services/{slug}?lang=en` | Published service by localized slug |
| `GET /api/v1/public/portfolio?lang=en&page=1&pageSize=12` | Published case studies and ordered images |
| `GET /api/v1/public/portfolio/{slug}?lang=ar` | Published case study by localized slug |
| `GET /api/v1/public/articles?lang=ar&page=1&pageSize=12` | Published articles whose publication time has arrived |
| `GET /api/v1/public/articles/{slug}?lang=en` | Published article by localized slug |

Paginated endpoints return `{ items, page, pageSize, totalCount }`. `page` starts at 1; `pageSize` must be between 1 and 50. Unknown localized slugs return `404`.

All database queries are read-only and use no tracking. Unpublished items, future-dated videos/articles, videos in unpublished categories, and hidden social links are excluded. The API stores and returns YouTube video IDs but never proxies video files. These endpoints need the PostgreSQL migrations applied; the development sample content remains unpublished by design.

Example:

```http
GET http://localhost:5080/api/v1/public/videos?lang=ar&page=1&pageSize=12
```
