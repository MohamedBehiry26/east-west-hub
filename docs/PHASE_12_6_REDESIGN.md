# Phase 12.6 — East West Hub public experience

Date: 2026-10-07

Implementation is ready for visual review. Automated build/component gates pass; **the visual quality gate is still pending**. The saved localhost browser-access restriction documented in `PHASE_13_QA.md` remains in effect. No browser, remote-debugging, or raw-HTTP workaround was attempted. No Phase 13.5 work was started.

## 1. Original problems

- Public pages repeated the same small rounded cards, blue-black panels, cyan highlights and narrow headings.
- The homepage lacked a strong production/media composition; its sections had similar proportions and contrast.
- Services, podcasts, projects and articles shared an almost identical listing template.
- Navigation and footer were functional but visually understated.
- The supplied studio illustration was referenced by URL while Angular's asset-copy list was empty. It would be missing from deployment output.
- `/watch` pointed to the simplified listing instead of the existing searchable/filterable `VideoListPage`.
- Other content collections consumed only their first API page.
- Router scrolling was not configured. Hash-only links also needed care because the document uses `<base href="/">`.

## 2. Creative direction

An editorial production studio: large type, a restrained warm copper accent, visible media frames, editing-timeline geometry, generous spacing and alternating dark/light sections. No astronomy imagery, client names, awards, performance claims or invented metrics were introduced. The copper and typographic monogram are temporary brand choices pending official assets.

## 3. Design system

`src/frontend/src/public-experience.css` defines scoped public tokens for near black `#050505`, rich black `#090909`, charcoal `#111111`, white `#F5F5F5`, gray `#9A9A9A`, and copper `#D4A077`; responsive spacing, container, radius, type scale, easing, durations, header layering and shadows.

Most new layouts use semantic classes. Existing functional utility-page templates have been aligned to the public palette. All cinematic selectors are scoped beneath `.public-site`. Admin templates and styles were not redesigned.

English uses Space Grotesk; Arabic uses IBM Plex Sans Arabic, with local system fallbacks. Remote font families were reduced from four to two and retain `display=swap`.

## 4. Homepage

The page now follows: dimensional hero → featured media → capabilities statement → latest media/category links → podcast band → numbered services → alternating projects → oversized brand statement → editorial insights → copper contact finale → oversized footer.

The hero includes localized display type, two primary navigation actions, an editing-frame composition, an intentional-watch link when media exists, and a locale-correct scroll link. The local illustrated poster is immediately available; no background video or iframe is downloaded. CMS entries populate the featured/media/service/project/article areas. Unpublished content is not fabricated to fill sections. Empty and error states retain useful navigation.

## 5. 3D implementation

CSS perspective and three media planes form the hero scene. A foreground editing timeline gives a recognisable production reference. `MediaDepthDirective` adds a small pointer tilt only for visible, fine-pointer desktop scenes with motion enabled.

It schedules at most one frame per pointer update, has no continuous render loop, resets on leaving the viewport or hiding the document, and cleans up observers/listeners. Tablet removes a rear plane; mobile uses a static wide image; reduced-motion users get a static composition. Unsupported CSS 3D falls back to the front image. WebGL is not required.

## 6. Motion

`RevealDirective` uses IntersectionObserver and a finite Web Animations reveal. Text remains visible when either capability is absent. Reveals disconnect after use, cancel on preference changes/destruction, and do not run for reduced-motion users. Shared easing coordinates page entry, image crops, buttons, navigation underlines and service-row interactions. There is no blocking intro, autoplay, custom cursor or continuous decorative animation.

## 7. Watch

Both language routes now use the full media library. Search, category, tag, sort, featured filtering and pagination are retained and tested. A larger lead media item, play indicators, duration and translated content-type labels provide a media-library hierarchy. Filters stack on phones, use two columns on tablets, and four on wide screens. Stale filter responses are unsubscribed before new requests.

## 8. Podcasts

The homepage has a warm audio band. The listing uses square artwork, waveform decoration, translated episode labels, guest/duration metadata, API search and pagination. Detail playback remains the same intent-loaded YouTube player with episode information and related episodes.

## 9. Services

Services use numbered editorial rows with large headings and optional supporting imagery. The homepage and collection retain CMS descriptions. Details retain capabilities, process and related projects. Collection pagination now exposes later pages of existing API content.

## 10. Projects

Project listings and the homepage use alternating large imagery and staggered desktop placement. Mobile stacks the images. Case studies use wider presentation and split heading/body story sections for available challenge, approach, solution and results, followed by existing galleries/services. Absent client facts or results are omitted.

## 11. Insights

The publication layout gives its first story extra scale, includes localized dates and author information, and uses a narrower reading measure for detail bodies. Article content rendering and SEO logic are preserved.

## 12. About, Contact and footer

About combines the configured agency description, a clearly labelled temporary production illustration and an editorial process sequence based on the existing content-production description. Contact uses a large statement, a labelled project-type selector and the existing configured-address `mailto:` brief flow. No lead-storage claim or fake address was added.

The footer contains primary navigation, configured email/phone/address/social links, language switching, copyright and Admin access, followed by an oversized typographic brand mark. Navigation becomes solid after scrolling or on interior pages. The mobile navigation is a full-width numbered menu with Escape-to-close, active-page state and a persistent language control.

## 13. Arabic and RTL

Public direction remains `rtl` for Arabic and `ltr` for English. Arabic has its own font, line height, display-size rules and reduced letter spacing. Layout spacing uses logical properties. Directional arrows mirror; playback triangles and production geometry do not. Numerals in service numbering and podcast-list metadata use locale formatting. New UI copy resides in both translation resources. A structural scan found **466 matching translation leaves per language**, including array entries.

The language switch keeps translated entity overrides. Navigation-start clears stale entity overrides before the next page supplies its own. The Arabic hero scroll link stays on `/ar`.

## 14. Responsive decisions

| Target | Implemented layout behavior | Rendered verification |
| --- | --- | --- |
| 360 / 390 | Static wide hero media, stacked story sections, one-column filters and content, compact header | Pending |
| 768 | Reduced media depth, two-column filters/listings, numbered mobile menu | Pending |
| 1024 | Wider editorial composition; menu remains available without squeezing all links | Pending |
| 1440+ | Full depth scene, desktop navigation, staggered projects, wide featured media | Pending |

Breakpoints and DOM behavior were reviewed in source and component tests. They are **not substitutes for screenshots or physical-device checks**.

## 15. Accessibility

- Single public main landmark, keyboard skip link, visible focus treatments and semantic headings/navigation.
- Labelled menu, search/filter controls and playback; active navigation exposes `aria-current`.
- Escape closes the mobile menu and restores button focus.
- Decorative depth/waveform content is hidden from assistive technology.
- Motion preferences have both CSS and JavaScript fallbacks.
- Images reserve their area; missing image URLs fall back once to the local illustration.
- New primary palette pairs were calculated at 6.71:1 (gray on charcoal), 8.83:1 (copper on black), 8.05:1 (dark text on copper), and 6.58:1 (body text on the light statement).

These calculations cover solid token pairs, not every composited image overlay. End-to-end keyboard order, assistive technology and rendered contrast still need browser review.

## 16. Performance

No animation or 3D library was added. Page components remain lazy. The hero illustration is 2,464 bytes, and is now confirmed in the production assets directory. Below-fold images use lazy loading; image regions reserve aspect ratios. The YouTube iframe exists only after activating playback. Existing API caching remains intact, including shared settings requests. Expensive motion is absent on touch/mobile/reduced-motion scenes.

No LCP/CLS/INP score is claimed: actual browser profiling remains pending. Build estimates exclude downloaded CMS images and font files.

## 17. Dependencies and test runner

No package dependency was added. The existing Vitest runner was changed from one thread worker to one fork worker after the thread pool failed to start in this Windows session. The same tests then ran successfully; tests were not skipped or weakened.

## 18. Production bundle

The final production build is **490.53 kB raw / 120.08 kB estimated transfer**, with no build warnings or errors. The previous Phase 13 baseline was 484.31 kB raw / 113.74 kB estimated transfer: a 6.22 kB raw increase (approximately 1.28%). The unchanged initial warning budget is 500 kB; no budget increase was used. The lazy homepage chunk is 16.82 kB raw / 4.57 kB estimated transfer. Final CSS is 72.84 kB raw / 12.02 kB estimated transfer.

## 19. Verification

Final run: `npm run build` passed; `npm test` passed **34/34 tests across 9 files**, with no test-runner errors. Production output contains the byte-identical local placeholder asset. The frontend and API listening processes were also confirmed on 4200 and 5080; this is process evidence, not a browser/HTTP acceptance check.

New tests cover both locale homepages, menu and footer, translated entity links, media-load error recovery, Watch parameters and stale responses, podcast metadata/search/pagination, contact mailto, collection empty states, route selection, Arabic scroll routing, translation parity, reduced motion, observer lifecycle, desktop tilt/offscreen reset, and image fallback.

Existing routing, SEO metadata, cached public API, lazy YouTube playback, Admin login, auth guard and interceptor tests remain in the suite. These are unit/component tests with mock APIs, not live authentication or YouTube-network acceptance tests. Backend and database were outside the redesign scope and were not modified.

## 20. Required client assets

| Asset | Where it belongs |
| --- | --- |
| Approved wordmark/monogram, brand color and usage rules | Replace temporary text mark and copper token |
| Real production/studio poster, ideally 1600–1920 px with mobile crop | Replace the hero/About temporary SVG |
| Approved showreel YouTube ID, title, description and poster | Publish/feature through the existing media CMS; no separate showreel setting was invented |
| Real project covers/gallery photographs and approved case-study copy | Existing project CMS fields |
| Podcast artwork, episode metadata and guest photography/permissions | Existing media CMS fields |
| Article cover images, author data and bilingual editorial content | Existing article CMS fields |
| Real contact/social details and approved agency description | Site settings |

For new photographic exports, provide appropriately compressed WebP/AVIF renditions and source originals. The current vector placeholder does not need raster conversion. The API currently exposes single image URLs; automatic CDN resizing/srcset derivation was not invented without a provider contract.

## 21. Remaining visual work and sign-off

1. Inspect every public route and representative details at 360, 390, 768, 1024 and 1440 in both languages in an approved browser-accessible environment.
2. Inspect real console/network behavior, focus navigation, touch menu, scrolling, slow-network media and image failures.
3. Replace the temporary illustration/wordmark/accent with client-approved assets, then tune crops and line breaks against actual content.
4. Profile Core Web Vitals with real media/fonts and verify reduced-motion on an actual browser.

The implementation and automated results are reviewable now. Final visual/production sign-off remains pending those checks. Stop here; Phase 13.5 has not begun.
