# Ambient backgrounds

> Keywords: ambient background, animated background, gradient background, mesh gradient, aurora, gradient blobs, noise, grain, film grain, scanlines, grid background, vignette, particles, dust, confetti burst, spotlight background, video background, shader background, fondo animado, fondo ambiental
> Summary: How to build layered ambient backdrops (gradient mesh, grain, grid, drift, particles) on brand tokens, with a pause control, exact reduced-motion composition, and per-tier degradation.

Ambient backgrounds set a mood behind content. They are decorative layers: static by default, slow when they move, and always removable without losing information.

## When to use

| Fits | Layer |
| --- | --- |
| Brand hero, launch page, section opener | Static mesh gradient from primary and accent |
| Cyberpunk, retro-futurist, or brutalist flavor | Static grid, scanlines, or grain at 4–8% opacity |
| Calm, organic, wellness surfaces | Two soft blobs, slow drift, low chroma |
| Glass panels that need something to refract | Static gradient beneath the glass |
| A completed task worth celebrating | One finite particle burst, once |

## When not to use

- Behind body text, forms, dashboards, checkout, or data tables: the contrast changes per frame and reading suffers.
- On every section: each full-viewport layer multiplies paint work and GPU memory.
- As the only carrier of brand color, or as a substitute for real imagery and hierarchy.
- An infinite drift with no pause control, or a video background that autoplays with sound.
- On top of content, or with `mix-blend-mode` over text: both destroy contrast in ways users cannot override.
- Behind a focus ring or a sticky header you still need to read.

## How it works

Build the stack from the cheapest layer upward and stop as soon as the mood reads.

| Layer | Technique | Cost | Tier |
| --- | --- | --- | --- |
| Base fill | `--brand-surface` | Free | T1 |
| Gradient mesh or blobs | 2–4 radial gradients on one oversized element | Paint once, compositor when translated | T1 |
| Grain | Tiled SVG turbulence or an AVIF noise tile, 4–8% opacity | One composite | T1 |
| Grid or scanlines | `repeating-linear-gradient`, static | Paint once | T1 |
| Drift | `translate3d` on the gradient layer | Compositor | T1 |
| Pointer spotlight | Radial gradient at the pointer, behind content | Paint per frame | T2 |
| Particles | Canvas 2D, ≤60 elements, DPR capped | One rAF loop | T2 |
| Video | Muted loop with a poster | Decode + bandwidth | T2 |
| Shader | WebGL full-screen pass | GPU, lazy chunk | T3 |

Motion rules:

| Motion | Loop | Control |
| --- | --- | --- |
| Drift and particle motion | Continuous, ~24 s per pass | Pause control; stops offscreen and in background tabs |
| Twinkle or pulse | 3 cycles, ≤ 2 flashes per second | Finite |
| Scanline sweep | 3 cycles, then still | Finite |
| Celebration burst | One shot, ≤ `calc(var(--kui-duration-xl) * 2)` | Finite, elements removed after |

Effect-local variables, prefixed and project-local: `--ambient-drift`, `--ambient-opacity`, `--ambient-grain`, `--ambient-glow`, `--ambient-count`.

## Implementation

### Static stack (T1, the default and the fallback)

```html
<section class="kui-ambient">
  <div class="kui-ambient__layer kui-ambient__blobs" aria-hidden="true"></div>
  <div class="kui-ambient__layer kui-ambient__grid" aria-hidden="true"></div>
  <div class="kui-ambient__layer kui-ambient__grain" aria-hidden="true"></div>
  <div class="kui-ambient__content"><h2>Built for weather</h2></div>
</section>
```

```css
.kui-ambient {
  --ambient-opacity: 0.9;
  position: relative; isolation: isolate; overflow: clip;
  background: var(--brand-surface); color: var(--brand-on-surface);
}
.kui-ambient__layer {
  position: absolute; inset: -10%; z-index: -1;   /* overscan hides drift edges */
  pointer-events: none;
}
.kui-ambient__blobs {
  opacity: var(--ambient-opacity);
  background:
    radial-gradient(38% 42% at 22% 28%,
      color-mix(in oklab, var(--brand-primary) 40%, transparent), transparent 70%),
    radial-gradient(34% 38% at 76% 66%,
      color-mix(in oklab, var(--brand-accent) 34%, transparent), transparent 72%);
}
.kui-ambient__grid {
  opacity: 0.16;
  background-image:
    repeating-linear-gradient(90deg, var(--brand-on-surface) 0 1px, transparent 1px 64px),
    repeating-linear-gradient(0deg, var(--brand-on-surface) 0 1px, transparent 1px 64px);
  mask-image: radial-gradient(70% 70% at 50% 40%, black, transparent);
}
.kui-ambient__grain {
  opacity: var(--ambient-grain, 0.06);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.kui-ambient__content { position: relative; }

@media (forced-colors: active), (prefers-reduced-transparency: reduce) {
  .kui-ambient__layer { display: none; }   /* gradients and grain are decoration only */
}
```

Gradients are soft by construction, so no `filter: blur()` is needed. If you add one, bake it: a blur that must be recomputed per frame is the most expensive mistake in this family.

### Drift with a pause control (T1)

```html
<button class="kui-ambient__pause" type="button" aria-pressed="false">Pause background</button>
```

```css
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-ambient__blobs {
    --ambient-drift: calc(var(--kui-duration-xl) * 40);   /* ≈24 s, derived from the tokens */
    animation: kui-ambient-drift var(--ambient-drift) var(--kui-ease-linear) infinite;
  }
  .kui-ambient[data-paused="true"] .kui-ambient__blobs { animation-play-state: paused; }
}
@keyframes kui-ambient-drift {
  50% { transform: translate3d(3%, -2%, 0); }
  100% { transform: none; }
}
@media (prefers-reduced-motion: reduce) { .kui-ambient__pause { display: none; } }
:root[data-motion-tier="0"] .kui-ambient__pause { display: none; }   /* nothing to pause */
```

```js
const pause = document.querySelector('.kui-ambient__pause');
pause.addEventListener('click', () => {
  const paused = pause.getAttribute('aria-pressed') === 'true';
  pause.setAttribute('aria-pressed', String(!paused));
  pause.closest('.kui-ambient').dataset.paused = String(!paused);
  pause.textContent = paused ? 'Pause background' : 'Play background';
});
```

Animate `translate3d` only. `background-position` on a full-viewport element repaints it every frame; a transform moves a cached texture instead. The control is a real button, keyboard reachable, and visible for as long as the drift runs.

### Scanlines and twinkle (T1, finite)

```css
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-ambient__scan {
    background: repeating-linear-gradient(0deg,
      color-mix(in oklab, var(--brand-on-surface) 12%, transparent) 0 1px, transparent 1px 4px);
    animation: kui-ambient-scan var(--kui-duration-lg) var(--kui-ease-linear) 3;
  }
}
@keyframes kui-ambient-scan { to { transform: translate3d(0, -12%, 0); } }
```

Three passes of `--kui-duration-lg` finish in about 1.2 s and stop. A scanline that runs forever sits at the edge of the 3-flashes limit and drains battery on every page that shows it.

### Particle dust (T2)

```js
export function dust(canvas, { count = 40 } = {}) {
  const root = document.documentElement;
  if (Number(root.dataset.motionTier ?? 1) < 2) return () => {};
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio, 2);
  const host = canvas.closest('.kui-ambient');
  let frame = 0, paused = false;
  const dots = Array.from({ length: Math.min(count, 60) }, () => ({
    x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.4, v: 0.00008 + Math.random() * 0.00012,
  }));
  const resize = () => {
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr); };
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(root).getPropertyValue('--brand-accent').trim() || '#fff';
    ctx.globalAlpha = 0.35;
    for (const d of dots) {
      d.y = (d.y - d.v * 16 + 1) % 1;
      ctx.beginPath();
      ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!paused) frame = requestAnimationFrame(draw);
  };
  const sync = () => {
    paused = document.hidden || host?.dataset.paused === 'true';
    cancelAnimationFrame(frame);
    if (!paused) frame = requestAnimationFrame(draw); };
  resize();
  sync();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  return () => {
    paused = true; cancelAnimationFrame(frame);
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', sync); };
}
```

Canvas dust costs one loop and one texture; mount the canvas with `data-kui-min-tier="2"` and `aria-hidden="true"`, positioned like the other layers. It must stop on `visibilitychange`, offscreen (`IntersectionObserver`), and when the pause control is on. `getComputedStyle` reads belong outside the frame loop in production; cache the color and re-read it on tier or theme change.

### Celebration burst (T2, one shot)

`el.animate()` on 12–24 absolutely positioned dots, `--kui-duration-lg` total, nodes removed on `finish`. No canvas, no library: `references/effects/microinteractions.md` covers the element-level version.

Framework notes: mount the layer setup in a client-only effect and return its cleanup; see `references/platforms/web-frameworks.md`. Native equivalents: Flutter `CustomPainter` with `AnimatedBuilder` and `MediaQuery.disableAnimationsOf(context)`, SwiftUI `Canvas` with `TimelineView`, Compose `Canvas` with `rememberInfiniteTransition` and `LocalAccessibilityManager`; see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

| Layer | T0 |
| --- | --- |
| Gradient mesh, grid, grain | All still present as one static composition; no drift, no fade-in |
| Drift | Stopped at rest; the pause button is hidden |
| Scanline and twinkle | Static texture at its resting position; no sweep, no pulse |
| Particles | Not mounted: the canvas is `data-kui-min-tier="2"`, so it never enters the DOM |
| Pointer spotlight | Not rendered, as described in `references/effects/cursor-pointer.md` |

The static frame is a designed composition, not the first frame of the animation: pick the gradient position that reads best and freeze it there. No replacement animation, and nothing that hides content.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | GPU particle field or shader background, lazy-loaded after the main content | Nothing beyond one full-viewport layer |
| T2 | Gradient mesh, grid, grain, drift with pause, canvas dust ≤40 particles | Video background, shader pass, pointer spotlight over large areas |
| T1 | Gradient mesh, grid, grain, drift with pause, all CSS | Canvas, video, WebGL, pointer spotlight |
| T0 | Static composition, as in Reduced motion | Everything above |

## Performance budget

- A full-viewport layer is painted at screen size. Two or three static layers are cheap once; a layer that changes per frame is not.
- Animate `transform` and `opacity` only. Never animate `background-position`, `background-size`, `filter`, or `box-shadow` on a full-screen element.
- `mix-blend-mode` and `backdrop-filter` on a full-viewport layer force a recomposite on every scroll frame; keep blend modes off background layers entirely.
- No `filter: blur()` recomputed per frame. If the gradient needs blur, bake it into an image or widen the gradient's transparent stop.
- Canvas: cap `devicePixelRatio` at 2, size the bitmap to the visible box, one rAF loop, and clear with a single `clearRect`.
- Video: a looped clip ≤3 MB, `muted`, `playsinline`, a poster, `preload="none"`, played only when visible.
- Stop every loop when offscreen, hidden, or paused; one page, one ambient loop.
- Verify at 4× CPU throttling and on one real low-end Android device: scrolling with the backdrop visible is the test that matters.

## Accessibility

- All decorative layers are `aria-hidden="true"` and `pointer-events: none`; the canvas needs a text alternative only if it carries meaning.
- Text over an ambient background keeps 4.5:1 contrast at the busiest frame (3:1 for large text, WCAG 1.4.3): measure with the gradient at its lightest point, not the average.
- Nothing flashes more than 3 times per second (WCAG 2.3.1): drift is slow, twinkle is finite, and no strobing scanline ships.
- Motion that starts automatically and lasts more than 5 s has a pause control (WCAG 2.2.2); drift and particles share one, and the in-product "Reduce motion" toggle forces T0 (WCAG 2.3.3).
- Reduced transparency and forced colors remove the decoration instead of leaving unreadable surfaces; see `references/foundations/accessibility-motion.md`.
- Video backgrounds carry no audio, never autoplay with sound, and never cover the skip link or the focus ring (WCAG 2.4.11).

## Libraries

CSS gradients, `repeating-linear-gradient`, and an SVG turbulence tile cover the whole T1 set; no package is needed. PixiJS for large 2D particle fields and three.js for a shader pass are T3 and load through a dynamic `import()`. dotLottie or Rive fit designer-made ambient loops that must stay small. Versions, licenses, and caveats: `references/libraries.md`.

## Pitfalls

- Animating `background-position` on a full-viewport gradient: a repaint of the whole viewport every frame.
- `filter: blur(80px)` on a drifting layer: the blur is recomputed as the layer moves, and the cost scales with area. Fake softness with gradient stops.
- A dark scrim over text to make the background visible: it drops contrast below 4.5:1 and cannot be overridden.
- Video backgrounds without a poster: a black rectangle until the first frame decodes.
- Layering the effect above content because `z-index: -1` was blocked by a parent without `isolation`, or forgetting `overflow: clip` so the overscan adds a horizontal scrollbar.
