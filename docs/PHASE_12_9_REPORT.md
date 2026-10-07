# Phase 12.9 — Public experience refinement

## Audit and root cause

The shared 1720px/1360px/760px width system from Phase 12.8 remains intact. The remaining visual weakness was vertical, not horizontal: the homepage Hero used a stage whose height followed the width of an already widened media column. Combined with `min(980px, 100svh)`, large headlines, 120px top padding, and the fixed header overlay, a wide but short desktop viewport could push the introduction and CTA beyond the first screen.

The audit found the public collection shell, content-list shell, Watch, and utility pages still needed a common inner-page introduction. The only remaining `max-w-4xl` is the intentional 404 reading layout; Admin is outside this phase.

## What changed

1. The homepage Hero is now height-aware as well as width-aware.
2. Its normal desktop canvas targets a controlled 900px/available-viewport range rather than scaling to 980px.
3. The media stage uses the available viewport height to determine its maximum inline scale, while retaining CSS perspective and layered planes.
4. Vertical padding, description spacing, composition padding, and the lower cue were tightened without narrowing the 1720px canvas.
5. Desktop rules for heights up to 900px and up to 790px reduce headline and media scale while preserving the two-column cinematic layout.
6. Mobile retains its natural scroll-first Hero behavior.
7. A shared `page-hero` system now gives Watch, Podcasts, Services, Projects, and Insights a compact full-canvas editorial introduction.
8. Page Hero backgrounds use ambient gradients, subtle editorial line texture, decorative type, and page-specific colour treatments.
9. Watch has a dedicated media Hero, integrated filters, a strong first media card, and cinematic grid spacing.
10. Podcasts retain their audio identity through waveform treatment, square artwork, and a wider featured first episode.
11. Services retain their actual bilingual CMS content, now with a stronger Hero media plane, oversized numbering, and wide editorial rows.
12. Projects preserve their asymmetric imagery and now share the refined page-introduction system.
13. Insights preserve their editorial hierarchy and article body remains restricted to the 760px reading width.
14. Details remain standard-width, with large visual media allowed to use the cinematic width and prose held to reading width.
15. About and Contact retain the standard content/form widths but now get stronger ambient backgrounds, headline scale, and conversion framing.
16. Footer remains full-bleed with cinematic-width content.
17. No API, database, authentication, localization, SEO, Admin, seed, or YouTube changes were made.

## Responsive, RTL, and accessibility

The refinement uses logical sizing and spacing properties, preserves RTL direction and Arabic-specific heading scale, avoids `100vw`, and does not restore global horizontal clipping. Existing reduced-motion behavior, semantic headings, focus styles, touch targets, lazy images, and on-demand YouTube embeds remain in place.

Static rules cover mobile, tablet, normal desktop, short desktop (1366×768/1536×864), 1920×1080, and controlled 2560px+ composition. Browser zoom naturally permits scrolling rather than clipping important Hero content.

## Verification

- Frontend tests: 37 passed.
- Angular production build: passed.
- Cloudflare Pages TypeScript check: passed.
- Initial bundle: 497.16 kB raw / 121.22 kB estimated transfer.
- Phase 12.8 baseline: 492.25 kB raw / 120.42 kB estimated transfer.
- Change: +4.91 kB raw, CSS/template-only; no dependency was added.

Browser visual acceptance, live console/network inspection, exact horizontal-overflow measurement, and screenshots at 1366×768, 1536×864, 1920×1080, and 2560×1440 remain unavailable under the saved localhost browser-access restriction. They are verification gaps rather than known defects. No deployment occurred and Phase 13.5 was not started.
