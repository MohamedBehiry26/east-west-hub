# Phase 12.8 — Full-width cinematic layout refinement

## Result

The public width system now uses four deliberate layers:

| Layer | Maximum width | Use |
| --- | ---: | --- |
| Full bleed | viewport | Ambient backgrounds, hero atmosphere, section bands, footer background |
| Cinematic | 1720px | Hero, navigation alignment, media, services, projects, editorial grids, footer content |
| Standard | 1360px | Detail and structured information pages |
| Reading | 760px | Article and long-form detail body copy |

Responsive gutters are centralised in `--ew-gutter`, scaling from 20px to 96px. The 1720px cinematic canvas occupies about 90% of a 1920px viewport before controlled gutters, rather than being capped at the previous 1440px.

## Root cause

The main public container was capped at 1440px and used for the Hero as well as content. The Hero ambient layer was also calculated from that inner container. At desktop widths this left large areas outside the composition without a corresponding visual layer.

## Changes made

1. Replaced the single public width token with cinematic, standard, and reading-width tokens.
2. Kept text-heavy details constrained while widening public collections and cinematic homepage sections.
3. Moved the Hero atmosphere to a full-width `cinema-hero-shell`; no `100vw` or negative viewport sizing is used.
4. Increased Hero composition emphasis toward media, increased the large-screen headline cap, media-stage scale, perspective, and desktop height.
5. Made public navigation align to the cinematic canvas.
6. Made the footer background full-width while retaining its internal cinematic content alignment.
7. Increased large-screen grid gaps and featured-media proportions without adding extra cards.
8. Strengthened Services with a wider large-screen row layout, imagery, and numbered presentation.
9. Kept portfolio, podcast, insight, About, Contact, and article prose constrained according to their content role.
10. Removed the public global horizontal clipping rule instead of using it to conceal width problems.
11. Removed conflicting `max-w-7xl` utility wrappers from public utility pages.
12. Added component assertions for the Hero shell and full-width footer structure.

## RTL, responsive, performance, and accessibility

The width system uses logical properties (`inline-size`, `max-inline-size`, `padding-inline`, and `margin-inline`) and retains the existing RTL typography, directional icons, mobile layouts, reduced-motion behavior, semantic headings, and focus styles.

The 2400px breakpoint only adjusts gutters and composition caps; content does not stretch indefinitely. Mobile/tablet rules remain in place below 1024px and 768px. No image source requirements, APIs, authentication, database schema, Admin layout, JavaScript dependencies, or 3D libraries changed. Existing lazy YouTube behavior is untouched.

## Verification

- Frontend unit tests: 37 passed.
- Angular production build: passed.
- Cloudflare Pages TypeScript checks: passed.
- Production initial bundle: 492.25 kB raw / 120.42 kB estimated transfer, a 1.02 kB raw increase over Phase 12.7, entirely CSS/template layout work.

The saved localhost browser-access restriction still prevents screenshots and interactive visual checks at 1366, 1440, 1920, and 2560px, and horizontal-overflow/console inspection in a live browser. The layout was audited statically and avoids `100vw` and public global overflow clipping. Complete that visual pass in a browser-accessible local or staging environment before Phase 13.5 or production approval.

No deployment occurred and Phase 13.5 was not started.
