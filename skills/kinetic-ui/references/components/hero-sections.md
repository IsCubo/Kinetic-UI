# Hero sections

> Keywords: hero, hero section, above the fold, LCP hero, media hero, video hero, 3D hero, WebGL hero, parallax hero, scroll-linked hero, split hero, hero entrance, hero choreography, headline animation, hero CTA, above-the-fold performance, héroe, portada
> Summary: How heroes behave: anatomy, entrance choreography, media, 3D, split, and scroll-linked variants, and the above-the-fold performance rules, with reduced-motion and low-end tiers.

## When to use

| Variant | Use for |
| --- | --- |
| Text hero | One statement + one primary action; the default and the fastest |
| Media hero (image/video) | Products with strong visuals, destination pages where a frame sells the story |
| Split hero | Visual + copy side by side; comparable claims (features, pricing intros) |
| Scroll-linked hero | Storytelling sections where content reveals on scroll (marketing narratives) |
| Parallax hero | Depth on a single flagship screen; travel tied to `--kui-parallax-strength` |
| 3D hero (WebGL) | Immersive brand moments on flagship pages, T3 only |

## When not to use

- More than one hero per page. Second-place scroll sections are plain sections.
- Dashboards, docs, and search pages: there the first content row is the hero.
- Full-viewport heroes on watch and in-car surfaces; the actionable content must not need scrolling.
- 3D or video where it adds no meaning the static frame lacks, or where the hero is the only path to content.
- Text over media that no scrim can hold at 4.5:1 for body-sized text. If contrast fails over the lightest frame, change the frame or the layout.
- Long load-blocking media: if the LCP would suffer, the hero ships as text first.

## How it works

Anatomy: **media layer** (back; image, video, gradient, or canvas) · **scrim** (gradient from the brand surface over the media where text sits) · **copy block** (eyebrow, `h1` headline, one sub-sentence) · **action row** (one primary CTA + optional secondary link) · optional **scroll cue** · optional **decorative layer** (parallax strip, WebGL canvas). The container sizes with `100svh` and safe-area insets; the CTA must stay above the usable fold.

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest (idle) | — | Copy at full opacity over the settled media; scroll cue visible | — | — |
| Entering (open) | First paint, or returning to the page | Copy layers fade-and-rise `--kui-distance-md`; media fades in last; stagger capped ~300 ms | `--kui-duration-xl` total | `--kui-ease-enter` |
| Hover | Pointer over the CTA (`hover: hover`) | See the button states in `references/components/buttons.md` | `--kui-duration-xs` | `--kui-ease-standard` |
| Focus-visible | Keyboard focus on the CTA or secondary link | 2px outline, appears instantly | none (instant) | — |
| Pressed | `:active` on the CTA | Scale to `--kui-scale-press` | `--kui-duration-xs` | `--kui-ease-standard` |
| Media loading | Image/video not ready | Poster or brand-surface gradient holds the exact media box | none (instant) | — |
| Media empty | Reduced data, or no media asset | Static gradient or poster stands in | none (instant) | — |
| Media error | Image or video fails | Static fallback keeps the box; no broken-image icon | none (instant) | — |
| Scrolling | Scroll progress through the hero | Media drifts with `--kui-parallax-strength`; scroll cue fades out | scrub (linear) | `--kui-ease-linear` |

Never move viewport or viewpoint: at any tier, the hero's motion paints inside the page, it does not scroll-jack.

## Implementation

```html
<header class="hero">
  <img class="hero__media" src="hero-1600.avif" alt=""
       width="1600" height="900" fetchpriority="high" decoding="async"
       srcset="hero-800.avif 800w, hero-1600.avif 1600w, hero-2400.avif 2400w"
       sizes="100vw">
  <div class="hero__copy">
    <p class="hero__eyebrow" style="--i: 0">Fleet tools</p>
    <h1 class="hero__title" style="--i: 1">Deliveries that plan themselves</h1>
    <p class="hero__sub" style="--i: 2">Routes, drivers, and proof of delivery in one place.</p>
    <p class="hero__actions" style="--i: 3">
      <a class="hero__cta" href="/trial">Start free trial</a>
      <a class="hero__secondary" href="/tour">Take the tour</a>
    </p>
  </div>
  <canvas class="hero__canvas" data-kui-min-tier="3" aria-hidden="true" defer-mount></canvas>
</header>
```

```css
.hero {
  min-height: 100vh;
  min-height: 100svh;                 /* stable across browser chrome; `references/foundations/devices-responsive.md` */
  position: relative; isolation: isolate;
  display: grid; align-content: center;
  padding: max(4rem, env(safe-area-inset-top)) 1.5rem max(2rem, env(safe-area-inset-bottom));
}
.hero__media { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; object-fit: cover; }
.hero__scrim {
  position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--brand-surface) 65%, transparent));
}
.hero__title { font: 800 clamp(2.2rem, 1.2rem + 4.5vw, 4rem)/1.05 var(--brand-font-display); max-width: 22ch; }
.hero__copy { color: var(--brand-on-surface); max-width: 46ch; }
.hero__cta { background: var(--brand-primary); color: var(--brand-on-primary); }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .hero__copy > * {
    animation: hero-rise var(--kui-duration-lg) var(--kui-ease-enter) both;
    animation-delay: calc(var(--i, 0) * var(--kui-stagger));   /* total capped near 300 ms */
  }
  :root:not([data-motion-tier="0"]) .hero__media { animation: hero-fade var(--kui-duration-xl) var(--kui-ease-standard) both; }
}
@keyframes hero-rise { from { opacity: 0; transform: translateY(var(--kui-distance-md)); } }
@keyframes hero-fade { from { opacity: 0; } }

@media (prefers-reduced-motion: no-preference) and (prefers-reduced-data: no-preference) {
  :root:not([data-motion-tier="0"]) .hero__media {
    animation: hero-drift linear both;
    animation-timeline: scroll(root);                  /* scrub, always linear; `references/effects/scroll-driven.md` */
    animation-range: 0 80vh;
  }
  @keyframes hero-drift { to { transform: translateY(calc(var(--kui-parallax-strength) * 12vh)); } }
}
```

The static document state is the finished state: content is legible even if no animation ever runs (`--kui-parallax-strength` collapses to 0 under reduce and T0). Nest a second element if you split X/Y for the arc trick (`references/foundations/motion-principles.md`), and keep scroll ranges in one stable unit (`svh`/`vh`, never `dvh`).

Video hero: `<video autoplay muted loop playsinline preload="metadata" poster="hero.avif" width="1600" height="900">`, no audio, and controls only as the required pause when content exceeds 5 s (`references/foundations/accessibility-motion.md`). Gate autoplay video behind `(prefers-reduced-motion: no-preference)` and `(prefers-reduced-data: no-preference)`; otherwise show the poster image as the media layer. Streaming fallback to an image: same box, same contrast.

3D hero (T3): mount the canvas only where the tier allows it:

```html
<img class="hero__poster" …>
<canvas data-kui-min-tier="3" …></canvas>
```

Mount/teardown follows `assets/effects/webgl-3d.js` and the tier attribute from `assets/snippets/motion-tier.js`; the poster is the permanent fallback (`data-kui-max-tier="2"` twin slot). Depth tips: `references/effects/parallax.md`.

Split hero: a plain two-column grid from `48rem` up, copy first in DOM, media second; it stacks to one column below that. Keep the reflow instant (no transition on grid columns; rotation guidance in `references/foundations/devices-responsive.md`):

```css
.hero--split { grid-template-columns: 1fr; gap: 1.5rem; }
@media (width >= 48rem) { .hero--split { grid-template-columns: minmax(0, 46ch) 1fr; align-items: center; } }
.hero--split .hero__media { position: static; inline-size: 100%; block-size: auto; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--brand-radius); }
```

Art-directed media per breakpoint with `<picture>`, same layout contract (explicit dimensions per source):

```html
<picture>
  <source media="(width >= 48rem)" srcset="hero-wide.avif 1600w" width="1600" height="700">
  <img src="hero-portrait-800.avif" srcset="hero-portrait-800.avif 800w" sizes="100vw"
       width="800" height="1200" alt="" fetchpriority="high" decoding="async">
</picture>
```

Scroll cue (T2+: bounce at `--kui-ease-spring` is playful-personality only; the static chevron is the baseline):

```css
.hero__cue { opacity: 0.7; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .hero__cue { animation: cue-drift var(--kui-duration-md) var(--kui-ease-standard) alternate infinite; animation-delay: 2s; animation-iteration-count: 3; }
}
@keyframes cue-drift { to { translate: 0 var(--kui-distance-sm); } }
```

The cue stops after 3 cycles (`iterations` capped) and stops on scroll: motion near content never runs more than a few cycles, per `references/foundations/accessibility-motion.md`.

Above-the-fold rules (binding for every variant):
1. Hero media is the LCP: `fetchpriority="high"`, never `loading="lazy"`, explicit `width`/`height` (CLS ≤ 0.1), `srcset`/`<picture>` for the largest needed viewport, modern formats (`avif`, `webp`), preloaded when the URL is known.
2. Copy arrives in markup: text renders before any media; the hero must read without JS, canvas, or media.
3. Primary CTA sits above the usable fold on a 360×640 viewport: use `100svh`, not centered so low that browser chrome covers it.
4. No hero-blocking JS: entrance is CSS; canvas and video mount after first paint.
5. Fonts: no hero-blocking webfont without `font-display: swap` and a sized fallback; CLS stays ≤ 0.1.

Framework notes: hero entrance is best as CSS-first markup, then optionally Motion variants when an app shell already loads Motion; React wiring: `references/platforms/web-frameworks.md`, native layouts and spring equivalents: `references/platforms/swiftui.md`.

## Reduced motion

T0 behavior, exactly:
- No entrance choreography: copy appears at final opacity and position; the media layer may run one opacity fade capped by the tokens at 200 ms.
- No parallax: `--kui-parallax-strength` is 0, the scroll-linked keyframe produces a static transform.
- Video: no autoplay; keep the poster frame until the user explicitly starts playback, and when playback resumes by tier, the visible pause control applies.
- 3D/canvas: never mounts (`data-kui-min-tier="3"`); poster renders instead.
- No scroll-jacking, no cue chase; the scroll cue stays as a static affordance.
- Interaction feedback on the CTA keeps opacity/color state changes, no travel or scale.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Full media hero, 3D canvas behind the copy, scroll-linked parallax and entrance choreography |
| T2 | Entrance choreography, layered parallax (capped strength), animated scroll cue; static media layer without WebGL |
| T1 | CSS only: static hero, one short opacity fade on first paint, no scroll-linked transform, no WebGL. Poster or image only; no video |
| T0 | As in Reduced motion |

## Performance budget

- Animate `transform`, `translate`, and `opacity` only. The scrim gradient is static; never tween the gradient itself.
- One rAF scroll listener at most when a JS parallax is unavoidable; `content-visibility` on the sections after the hero.
- The hero media is the LCP element: keep it small (target device DPR, not `2×` on every viewport), `avif`/`webp`, cache-friendly, `fetchpriority="high"`, `decoding="async"`.
- Defer the whole hero choreography into CSS; no JS timeline for what a keyframe covers.
- Cap GPU pressure: one animated surface (media layer), not text + media + cue simultaneously; at T2 the cue is CSS, not WebGL.
- Data saver (honored on heroes and any media-heavy section): `(prefers-reduced-data: reduce)` posters instead of video and `srcset`-downsized hero images.

## Accessibility

- The `h1` lives in the hero: the page and its first statement match.
- Primary action above the usable fold: the CTA must never sit below the fold of a `min-height: 100svh` layout; verify the CTA is reachable at 360×640 and after 200% zoom (WCAG 1.4.4).
- Contrast: 4.5:1 for the sub-copy and 4.5:1 for CTA text over the scrim (1.4.3); the scrim is part of the design, not a hover-only overlay; re-check over the darkest and lightest media frames.
- Decorative media is `alt=""`; the 3D canvas is `aria-hidden="true"` and never carries content only available visually.
- The scroll cue is an affordance, not the only entry path to content; keyboard users reach section content by tab order, not by simulating scroll.
- No `viewport`-scaled hero text in `px` for H1: fluid sizes `clamp()` between min and max, preserving 200% zoom legibility (`references/foundations/devices-responsive.md`).
- Video: no sound, no autoplay at T0, visible pause for content over 5 s and pause on `document.hidden`.

## Libraries

Plain CSS covers the default hero; three.js or react-three-fiber for a T3 WebGL hero; Motion for sequenced React entrances; GSAP ScrollTrigger only when CSS scroll-driven support is insufficient for the requirement. Sizes and caveats: `references/libraries.md`.

## Pitfalls

- Centering copy mid-viewport on small screens: the CTA drops under the browser chrome on first paint.
- Autoplay video with `preload="auto"` and sound jumps straight into a data/annoyance trap.
- Missing `width`/`height` (or aspect-ratio) on the hero image: CLS breaks the LCP.
- Scrim gradient too light near the bottom: sub-copy readability fails over bright frames.
- Animating the `h1` position with layout properties (`margin`, `top`) instead of `transform`.
- Entrance runs per navigation on a persistent app shell instead of once per page load.
- Never place a `data-kui-min-tier="3"` canvas without the fallback slot: set `data-kui-max-tier="2"` on the poster twin and honor `(prefers-reduced-data: reduce)` with the poster.
- `100vh` instead of `100svh`: the CTA hides behind mobile toolbars.
- Stacking `translateY` on `.hero__media` for entrance AND parallax: the scroll keyframe overwrites the entrance; split into two layers.
