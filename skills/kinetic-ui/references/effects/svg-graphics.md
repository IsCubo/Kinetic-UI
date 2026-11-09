# SVG graphics

> Keywords: svg, icon, iconography, icon set, logo, logotype, illustration, diagram, data viz svg, vector graphics, svgo, svg optimization, viewbox, currentcolor, theming, dark mode image, picture element, light and dark svg, stroke animation, path morph, path interpolation, draw-on, line drawing, decorative svg, aria-label svg, role img, accessible svg, static svg, animated svg, icon sprite, symbol use, svg accesible, ícono, logotipo, gráfico vectorial
> Summary: How to author a static SVG asset well (structure, optimization, theming, accessibility), and how to prepare one for motion, handing the animation techniques themselves off to `references/effects/motion-2d.md`.

This file is about the SVG asset itself — the markup, the file, the craft — not the loop that drives it. Draw-on, morph, and motion-path techniques live in `references/effects/motion-2d.md`; read this file first so the asset you hand it is already clean.

## When to use

| Situation | Use this file |
| --- | --- |
| A logo, icon, illustration, or diagram the brief needs | Yes |
| An icon set for a whole product | Yes — start from a verified set before hand-authoring |
| The SVG will also animate (draw-on, morph, motion path) | Yes, then continue in `references/effects/motion-2d.md` |
| A photograph, a gradient-heavy hero image, a screenshot | No — raster, out of scope here |
| A canvas-based particle system or WebGL scene | No — `references/effects/motion-2d.md` (canvas) or `references/effects/webgl-3d.md` |

## When not to use

Do not hand-author what a verified icon set already solved (`## Libraries`), and do not re-derive animation technique here — `references/effects/motion-2d.md` already covers stroke, motion-path, and morph; this file only covers what makes the asset ready for it.

## How it works

### Anatomy

- Always set `viewBox`; never ship a bare `width`/`height` with no `viewBox`, or the asset stops scaling in any context that resizes it.
- `preserveAspectRatio="xMidYMid meet"` is the default; only change it when the brief needs cropping instead of letterboxing.
- One file, one purpose for a set: an icon set ships one `<symbol>` per icon inside one sprite `<svg>`, referenced with `<use href="#id">`, not one file per icon repeated across every page that needs it.
- Flatten what a design tool exported. Illustrator and Figma exports carry unused `<defs>`, redundant groups, and inline styles the browser never needs — run every export through SVGO (`## Libraries`) before it ships.

### Static craft

| Decision | Rule |
| --- | --- |
| Color | A UI icon that must recolor with its context uses `fill="currentColor"` (or `stroke="currentColor"`) and no hardcoded hex; a logo or illustration with a fixed brand palette uses the brand tokens' hex values directly |
| Theming, one look | A single-color mark on a transparent background (no background rect) reads on both a light and a dark host with one file — the simplest fix, and it needs no media query at all |
| Theming, two looks | When light and dark truly need different art, not just inverted color, ship two files and swap them with `<picture>` + `source[media="(prefers-color-scheme: dark)"]`, GitHub's documented pattern. As of 2026-11 GitHub has an open regression where this sometimes follows the OS preference instead of the site's own manual theme toggle (`github/community#210469`) — view the rendered page in both themes before shipping, do not assume the pattern alone proves it |
| Sizing | Check the file at both its largest and smallest use (a favicon-sized render and a hero banner) before shipping, the same way `references/workflow/verify.md` checks a motion tier at its own capture width |

### Preparing for motion

`references/effects/motion-2d.md` covers the animation itself; this file only covers what makes an SVG animate well once you get there:

- **Draw-on (stroke-dasharray/offset):** one continuous `<path>` per stroke you want to draw; a path built from several disconnected subpaths draws all of them at once, not in sequence.
- **Morph between shapes:** both paths need the same command count and the same command types in the same order for a native tween; a library like Flubber (`## Libraries`) interpolates arbitrary shapes without that constraint.
- **Staged reveal:** split one complex illustration into named `<g id="…">` groups in the order they should appear, instead of one opaque path a later animation pass has to reverse-engineer.

## Implementation

Hand-built static icon, accessible and themeable:

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     role="img" aria-label="Download">
  <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>
</svg>
```

Decorative icon next to its own visible label — hide it from assistive tech instead of duplicating the label:

```html
<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">…</svg>
<span>Download</span>
```

CSS `d`-path animation, with a feature check (Chrome and Firefox animate `d` directly as of this writing; confirm Safari at `caniuse.com/mdn-svg_elements_path_d_path` before shipping it with no JS fallback):

```css
@supports (d: path("M0 0 L1 1")) {
  .icon-swap path { transition: d 200ms var(--kui-ease-standard); }
}
```

## Reduced motion

A static SVG produces no motion: it is already the T0 artifact. When it is the reduced-motion fallback for an animated counterpart (a draw-on logo, a morphing icon), this file's output is exactly what ships under `prefers-reduced-motion: reduce` — do not swap in a different, simpler asset at T0; swap in this one.

## Low-end fallback

| Tier | What ships |
| --- | --- |
| T0/T1 | This file's static output only |
| T2 | `references/effects/motion-2d.md`'s stroke and transform techniques |
| T3 | Multi-path morphs and choreographed multi-group reveals |

File weight is the real low-end cost even with zero animation: an unoptimized design-tool export can run several times larger than its SVGO output, and every `<filter>` (blur, drop-shadow, turbulence) repaints even when nothing moves. Budget a single icon under 2 KB and a detailed illustration under 20 KB after optimization; re-run SVGO after every hand-edit, since manual edits reintroduce exactly what it stripped.

## Performance budget

- Path point count: a hand-drawn icon rarely needs more than a few dozen points; hundreds suggest an unflattened export.
- `<filter>` elements (blur, drop-shadow, turbulence) are the single most expensive thing in a static SVG — they repaint on scroll and resize with no animation at all. Prefer a CSS `filter: drop-shadow()` on the `<img>` wrapper, or a plain `box-shadow`, over an in-SVG filter for a simple effect.
- Sprite icons you reuse more than a few times as one `<symbol>` + `<use>` set instead of repeating the markup — one parse instead of N.

## Accessibility

- Meaningful (conveys information no nearby text already gives): `role="img"` plus `aria-label`, or a `<title>` as the first child for a longer description a tooltip can expose.
- Decorative (a nearby label already says the same thing): `aria-hidden="true" focusable="false"`.
- Never put a bare `>`, `<`, or `&` inside an `alt` or `aria-label` on a raw HTML `<img>` embedded in Markdown without checking the host's renderer first: GitHub's markdown-to-HTML pass can close the tag early at an unescaped `>` inside the attribute and dump the rest as literal text. Use words ("18 or newer") instead of symbols (`>=18`) in README image alt text, or escape it as `&gt;`.
- An interactive SVG (a button built from one) needs the same focus-visible, keyboard, and target-size rules as any other control — `references/components/buttons.md`.

## Libraries

Snapshot verified **2026-11-09** against the npm registry and each project's own license page; see `references/libraries.md` for everything animation-specific (GSAP, anime.js, Motion), which this file does not repeat.

| Need | Choice | License | Notes |
| --- | --- | --- | --- |
| Optimize any hand-authored or exported SVG | SVGO 4.x | MIT | Two advisories exist for older releases (`removeScripts`, a DOS path) — pin the current patched version, not an old lockfile entry |
| A verified icon set before hand-authoring custom icons | Lucide 1.x | ISC | Actively maintained fork of Feather; most framework packages ship tree-shakeable per-icon imports |
| Arbitrary shape morphing without matching path commands | Flubber | MIT | Interpolates between any two shapes; pair it with the tween library already named in `references/libraries.md`, not a new one |

## Pitfalls

- A design-tool export with no `viewBox`, only `width`/`height` — add it back, or the icon stops scaling the moment it sits in a context that resizes it.
- A bare `>` or other unescaped symbol inside a README `<img>`'s `alt` attribute — breaks the host's HTML parser, not the SVG; this exact mistake shipped and broke a badge in this repo's own README before it was caught and fixed.
- Animating `fill`/`stroke` color in CSS without `currentColor` — it works, but fights every future theme change; token it instead.
- A decorative icon with no `aria-hidden` — read aloud right before the label that already says the same thing.
- Shipping a morph between two paths with a different number of points — most browsers render a snap, not a tween, or refuse the animation outright.
