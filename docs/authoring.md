# Authoring contract

Rules for anyone (human or agent) writing files inside `skills/kinetic-ui/`. The validator (`npm run validate`) enforces the mechanical parts.

## Language and voice

- English. Imperative, runtime instructions for an LLM ("Use", "Avoid", "Cap"). No history, marketing, or filler.
- Target 120–250 lines per reference file. Prefer tables for decisions and short, correct code.
- No external URLs as primary references. Facts about libraries (versions, licenses, sizes) live only in `references/libraries.md`; other files name the library and point there.

## File header (mandatory, first lines)

```markdown
# Title

> Keywords: comma-separated terms a user or agent would search for (synonyms, effect names, Spanish terms optional)
> Summary: One sentence describing what the file answers.
```

Assets use the same two lines as comments (`// Keywords:` / `/* Keywords: */`); JSON uses top-level `"$keywords"` and `"$summary"` strings. `INDEX.md` is generated from these headers: run `npm run index` after adding or renaming files. Never edit `INDEX.md` by hand.

## Paths

Write every path to another skill file relative to the skill root, in a code span: `references/foundations/performance-tiers.md`. The validator fails on paths that do not exist.

## Templates

### Effects (`references/effects/`) and components (`references/components/`)

Sections in this order. The two marked sections are mandatory and validated.

```markdown
## When to use
## When not to use
## How it works            <- anatomy, states, timing (components: a States table with trigger, visual change, duration token)
## Implementation          <- framework-agnostic first (HTML/CSS, then vanilla JS), then short framework notes
## Reduced motion          <- MANDATORY: exact T0 behavior
## Low-end fallback        <- MANDATORY: behavior per tier T1/T2/T3, what is removed or simplified
## Performance budget
## Accessibility           <- keyboard, focus, ARIA, contrast, WCAG items that apply
## Libraries               <- names only, link `references/libraries.md`
## Pitfalls
```

### Styles (`references/styles/`)

```markdown
## When to use             <- page types and emotions it fits
## Visual language         <- palette roles, typography, shapes, texture, iconography
## Signature effects       <- link the effect files they rely on
## Brand adaptation        <- how to apply the style while keeping a given brand
## Implementation          <- tokens/CSS starter
## Reduced motion          <- MANDATORY
## Low-end fallback        <- MANDATORY
## Accessibility           <- contrast, flashing (WCAG 2.3.1), readability
## Pitfalls
```

### Foundations, brand, platforms

Free structure, but keep the header, tables over prose, and link the effect/component files they inform.

## Shared invariants (do not redefine)

| Invariant | Definition |
| --- | --- |
| Motion tiers | T0 Reduced, T1 Essential (CSS only), T2 Enhanced (JS motion), T3 Immersive (GPU/3D). Source of truth: `references/foundations/performance-tiers.md` |
| Tier attribute | `<html data-motion-tier="0..3">`, set by `assets/snippets/motion-tier.js` (`applyMotionTier`, `watchFrameRate`, event `kui:motiontierchange`) |
| Tier utilities | `data-kui-min-tier="N"` / `data-kui-max-tier="N"` from `assets/tokens/motion.css` |
| Motion tokens | `--kui-duration-{xs,sm,md,lg,xl}`, `--kui-ease-{standard,enter,exit,linear,spring}`, `--kui-distance-{sm,md,lg}`, `--kui-scale-{press,pop}`, `--kui-stagger`, `--kui-parallax-strength` from `assets/tokens/motion.css` |
| Brand tokens | `--brand-primary`, `--brand-on-primary`, `--brand-accent`, `--brand-surface`, `--brand-on-surface`, `--brand-muted`, `--brand-font-display`, `--brand-font-body`, `--brand-radius`. Derived tint/shade scales are project-local suffixes (`--brand-primary-50` … `--brand-primary-950`, see `references/brand/brand-intake.md`); the nine tokens stay the shared API |
| Motion personalities | Calm, Precise, Energetic, Playful, Luxurious, defined in `references/foundations/motion-principles.md`. Overrides load after `assets/tokens/motion.css` inside `@media (prefers-reduced-motion: no-preference)` so they never cancel the reduced-motion collapse |
| Accessibility | `references/foundations/accessibility-motion.md`: reduced motion keeps fades ≤200ms and removes travel; no more than 3 flashes per second; pause for motion over 5 s |
| Animated properties | `transform` and `opacity` by default; anything else must state its cost |

## Planned file manifest

| Folder | Files |
| --- | --- |
| `references/foundations/` | `ux-principles.md`, `ui-patterns.md`, `motion-principles.md`, `devices-responsive.md`, `performance-tiers.md`, `accessibility-motion.md` |
| `references/brand/` | `brand-intake.md`, `emotion-to-style.md` (+ `assets/tokens/brand-tokens.template.json`) |
| `references/effects/` | `microinteractions.md`, `cursor-pointer.md`, `text-effects.md`, `page-transitions.md`, `ambient-backgrounds.md`, `parallax.md`, `scroll-driven.md`, `depth-layers.md`, `motion-2d.md`, `webgl-3d.md` |
| `references/styles/` | `cyberpunk.md`, `glassmorphism.md`, `neo-brutalism.md`, `editorial.md`, `minimal-luxury.md`, `retro-futurism.md`, `organic-soft.md`, `playful-3d.md` |
| `references/components/` | `buttons.md`, `inputs-forms.md`, `cards.md`, `navigation.md`, `overlays.md`, `feedback.md`, `selection-controls.md`, `carousels-galleries.md`, `hero-sections.md`, `lists-collections.md` |
| `references/platforms/` | `web-frameworks.md`, `flutter.md`, `swiftui.md`, `jetpack-compose.md` |
| `references/` | `libraries.md` |
| `assets/` | `tokens/motion.css`, `snippets/motion-tier.js`; effect-specific assets go in `assets/effects/<effect-name>.{css,js}` |

## Workflow

```bash
npm run index      # regenerate INDEX.md from headers
npm run validate   # spec, headers, mandatory sections, paths, JS syntax, index freshness
npm test           # validator test suite
```
