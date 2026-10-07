# YouTube Video Platform

The API reads public uploads from a YouTube channel using the YouTube Data API v3. The application stores metadata only; playback remains on YouTube.

Development seed content is neutral and explicitly fictional: one published YouTube player demonstration video plus draft-only placeholder video/podcast records.

## Configuration

Set these environment variables in the API runtime or local user secrets:

```text
YouTube__ApiKey=<YouTube Data API key>
YouTube__ChannelId=<channel ID>
```

The values are intentionally blank in `.env.example` and `appsettings.json`. Never commit real credentials. Development without configuration remains available; an authorized sync request returns `503` with a setup message.

## Synchronization

An authenticated administrator calls `POST /api/admin/youtube/sync` with the category for newly discovered uploads:

```json
{ "categoryId": "<existing-category-guid>" }
```

New public videos are added as drafts so they are reviewed before publication. Repeated syncs match videos by the unique YouTube video ID. Later syncs refresh the stored YouTube title, description, thumbnail, publication date, and duration fields. The public-facing bilingual titles/descriptions, custom thumbnail override, category, tags, featured flag, display order, and publishing state remain intact.

The admin dashboard exposes category management, synchronization, and bilingual media editing. Podcast classification and episode details remain editorial fields when YouTube metadata syncs. Deleting a video only removes its metadata from this site; the YouTube upload remains untouched.

## Public API filters

`GET /api/v1/public/videos` accepts:

- `lang=en|ar`
- `page` and `pageSize` (1–50)
- `search`
- `category` (localized category slug)
- `tag` (localized tag slug)
- `featured=true|false`
- `order=featured|latest|oldest`

`GET /api/v1/public/tags?lang=en|ar` returns tags used by currently published videos. Video detail pages use lazy-loaded privacy-enhanced YouTube embeds and expose tags, publication date, related videos, and share actions.
