# Development content

The development catalog is deliberately separate from production content. It is loaded only when the API environment name is exactly `Development`.

## What is seeded

- 10 approved East West Hub services in English and Arabic.
- 8 categories and 13 bilingual tags.
- 16 fictional media records and 6 fictional podcast records.
- 8 fictional projects and 8 fictional insights.
- 42 local SVG visual studies under `src/frontend/src/assets/demo/`.

The media, podcasts, projects, and insights are fictional development material. They do not represent East West Hub clients, work, results, partnerships, or audience figures. They must be replaced before production.

The business service names and their bilingual descriptions are editable CMS content. They are not labelled as demo material.

## How development seeding works

`DevelopmentSeeder` reads the embedded catalog in `src/backend/SpaceMedia.Infrastructure/Persistence/SeedData/`. It uses deterministic IDs and does not use titles as identity.

It adds missing records, upgrades only the exact legacy placeholders that shipped with the project, and preserves later editor changes. It can be run repeatedly without duplicates. It also refuses to run in Production, Staging, or any other environment.

To refresh a local development database, start the API with the `Development` environment. Do not delete database records to refresh demo content: edit or remove the development catalog only when you intentionally want to change the deterministic dataset.

## Video policy

Most seeded media is poster-only and has no YouTube ID. This is intentional: it avoids fabricated playable videos. The one ID in the catalog, `M7lc1UVf-VE`, is the public example used in Google's YouTube IFrame API documentation and is clearly used as a replacement example only. Confirm playback and embed availability before presenting it in a production environment.

## Asset status

All SVGs in `assets/demo/` are temporary development visual studies. Each contains a development/replacement label. They are local, light-weight, and do not depict a real client project.

### Client input required before production

- Official logo files, approved colour and font direction.
- Confirmed YouTube channel, API configuration, videos, and showreel.
- Approved podcast episodes and artwork.
- Approved project descriptions, imagery, related services, and client permissions.
- Approved editorial insights, team/studio photography, contact details, social links, and legal pages.

Never copy development media, project, or insight entries to Production. Never add API keys, JWT keys, database credentials, or Supabase service keys to this catalog.
