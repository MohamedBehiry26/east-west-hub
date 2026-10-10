# Manual YouTube media management

The current application uses manually selected YouTube links. Synchronization, automatic imports and YouTube Data API credentials are not part of this workflow. Older phase reports describing Sync are historical.

1. Sign in to `/admin/login`, then open Videos or Podcasts.
2. Add a supported watch, youtu.be, shorts or embed link. Enter the English and Arabic titles/slugs, category and intended publishing state.
3. Use the type, tags, episode/season, bilingual guest and SEO controls as needed. Existing values are copied into the edit draft; changing only a title preserves the other metadata. Publication timestamp, duration and source metadata are not rewritten by this editor.
4. Existing poster-only records may be edited without adding a link. Leaving the link blank during an update retains the existing YouTube ID or poster-only state. A new manual record still requires a valid link. Explicit deletion remains a separate confirmed action.
5. The public Watch section includes eligible published non-podcast types; Podcasts includes published podcasts. Unpublished categories, drafts and future publication timestamps remain excluded.
6. Hero video is configured independently under Settings. The home featured card uses the featured flag and ordering of eligible media.

Playback stays on YouTube through deferred privacy-enhanced iframes. Syntactically valid links may still point to private, removed or embedding-disabled videos; verify real playback before client preview. Linked public cards currently use the YouTube thumbnail; poster-only media use their stored image/fallback. The app does not upload video files or validate embedding availability via a Data API.

Use [FREE-STAGING.md](FREE-STAGING.md) for preview preparation. Do not enable demo seeding to recreate deleted content, configure a YouTube API key, or restart old Sync workflows.
