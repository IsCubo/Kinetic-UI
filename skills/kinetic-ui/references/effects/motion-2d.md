# Motion graphics 2D

> Keywords: canvas 2d, svg animation, sprite sheet, sprite frames, lottie, dotlottie, rive, state machine, 2d particles, confetti, sparks, path animation, motion path, offset-path, stroke-dashoffset, progress ring, line drawing, vector animation, efecto 2d
> Summary: When Canvas 2D, SVG, sprite sheets, dotLottie/Rive runtimes, and 2D particle systems beat DOM and CSS animation, and how to build each inside the motion tiers.

Two axes pick the layer: how many things move at once, and who authors the animation. Under roughly a dozen moving elements, DOM and CSS win on crispness and accessibility; high counts, per-pixel control, or designer-produced files push the work onto canvas. Scroll-driven DOM reveals live in `references/effects/scroll-driven.md`; hover and press feedback in `references/effects/microinteractions.md`.

## When to use

| Signal | Layer |
| --- | --- |
| Hundreds of small free-moving elements (confetti, sparks, dust) | Canvas 2D particle field |
| Designer-drawn animation delivered as a file | dotLottie or Rive runtime |
| A character or illustration that reacts to input or live data | Rive state machine |
| A logo or icon line that draws itself in | SVG stroke animation |
| An element that must follow a curve | CSS `offset-path` |
| A short fixed loop you can cut into frames | Sprite sheet with CSS `steps()` |
| Thousands of sprites, or sprite-level filters | GPU 2D renderer (PixiJS) |

## When not to use

- Text, forms, lists, and product UI: keep them DOM; hover and press follow `references/effects/microinteractions.md`.
- Flat depth: DOM planes with `references/effects/parallax.md` or `references/effects/depth-layers.md` stay vector-crisp and cheaper.
- Real geometry, lighting, or a camera: that is `references/effects/webgl-3d.md`.
- One looping gradient behind a hero: two CSS layers animate it; no canvas needed.
- Anything users must read, select, or copy: canvas pixels are invisible to screen readers and unselectable. Put real text in DOM; the canvas only paints behind or beside it.
- Per-card or per-row art: every instance adds context and work; share one canvas or use SVG.

## How it works

| Layer | What runs | Per-frame cost | Tier | Crispness |
| --- | --- | --- | --- | --- |
| CSS on DOM or SVG | transitions, keyframes, `offset-path`, strokes | compositor for `transform`/`opacity`; paint for `stroke-dashoffset` (small areas only) | T1+ | Vector |
| Canvas 2D | JS redraws one bitmap every frame | JS budget only; layout never runs | T2+ | Raster |
| dotLottie / Rive | WASM or JS renders exported vectors into its own canvas | player render; one loop per region | T2+ | Vector |
| PixiJS (GPU 2D) | WebGL batches sprites and filters | minimal JS; GPU texture memory | T3 | Raster |

T1 allows CSS and SVG only; canvas starts at T2 (`references/foundations/performance-tiers.md`). Every technique below the top row ships as a lazy `import()` after first paint, gated on the tier and the reduced-motion media query. The tier utilities `data-kui-min-tier` / `data-kui-max-tier` (`assets/tokens/motion.css`) keep first paint safe before any JS runs.

Path animation starters:

| Goal | Mechanism |
| --- | --- |
| Move along a curve | `offset-path`, animate `offset-distance` 0%→100% |
| Reveal a line; report progress | `stroke-dasharray` / `stroke-dashoffset` |
| Morph between shapes | GSAP MorphSVG or anime.js (license note in `## Libraries`) |

## Implementation

### SVG stroke and motion path (CSS, T1+)

```html
<svg class="m2d-ring" viewBox="0 0 160 160" width="48" height="48" role="img" aria-label="35% complete">
  <circle class="m2d-ring__track" cx="80" cy="80" r="70" pathLength="100"/>
  <circle class="m2d-ring__bar" cx="80" cy="80" r="70" pathLength="100" style="--m2d-progress: 0.35" aria-hidden="true"/>
</svg>
```

```css
.m2d-ring__track,
.m2d-ring__bar { fill: none; stroke-linecap: round; stroke-width: 10; }
.m2d-ring__track { stroke: color-mix(in oklab, var(--brand-on-surface) 15%, transparent); }
.m2d-ring__bar {
  stroke: var(--brand-accent);
  stroke-dasharray: 100;
  stroke-dashoffset: calc(100 - var(--m2d-progress) * 100); /* percentage via pathLength */
  transition: stroke-dashoffset var(--kui-duration-md) var(--kui-ease-standard);
}
```

`pathLength="100"` turns dash math into percentages. Strokes repaint (not compositor-driven): keep ring and line art small — icons and badges, never a full-viewport stroke loop.

A flyer along a drawn path:

```css
@supports (offset-path: path('M0 0')) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) .m2d-flyer {
      offset-path: path('M8 120 C 64 16, 128 16, 184 120');
      animation: m2d-flight var(--kui-duration-xl) var(--kui-ease-enter) forwards;
    }
  }
}
@keyframes m2d-flight { to { offset-distance: 100%; } }
```

### Canvas 2D particle field (T2+)

```js
// m2d-particles.js — lazy chunk; created only when the gate allows it
export function startParticles(canvas, { tier = 2 } = {}) {
  const ctx = canvas.getContext('2d'); // once per canvas; reuse the reference
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);  // setting width resets all context state
  canvas.height = Math.round(height * dpr);
  ctx.scale(dpr, dpr);
  const styles = getComputedStyle(canvas);
  const color = styles.getPropertyValue('--m2d-color').trim() || styles.getPropertyValue('--brand-accent').trim();
  const count = tier >= 3 ? 140 : 60; // density is a tier decision, not a wish
  const dots = Array.from({ length: count }, () => ({
    x: Math.random() * width, y: Math.random() * height,
    vx: -14 + Math.random() * 28, vy: -14 + Math.random() * 28,
    r: 1 + Math.random() * 2.5,
  }));
  let raf = 0;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05); // clamp hitch frames
    last = now;
    ctx.clearRect(0, 0, width, height); // clear; never translucent fill-stacking
    ctx.fillStyle = color;
    for (const d of dots) {
      d.x = (d.x + d.vx * dt + width) % width;
      d.y = (d.y + d.vy * dt + height) % height;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf); // one call, no leak
}
```

Gate wiring (assets/snippets/motion-tier.js dispatches `kui:motiontierchange`):

```js
const canvas = document.querySelector('.m2d-field');
const tierNow = () => {
  const t = Number(document.documentElement.dataset.motionTier);
  return Number.isInteger(t) ? t : 0;
};
const allowed = () => tierNow() >= 2 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
let loop = null;
const stopLoop = () => { if (loop) { loop(); loop = null; } };

async function reconcile() {
  stopLoop();
  if (!canvas || !allowed()) return;
  const { startParticles } = await import('./m2d-particles.js'); // never in the main bundle
  if (!allowed()) return; // tier dropped while importing
  loop = startParticles(canvas, { tier: tierNow() });
}
const inView = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) reconcile(); else stopLoop();
}, { rootMargin: '100px' });
inView.observe(canvas);
document.addEventListener('visibilitychange', () => (document.hidden ? stopLoop() : reconcile()));
document.addEventListener('kui:motiontierchange', reconcile);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', reconcile);
```

### Sprite sheet with CSS steps() (T1+, small loops)

```css
.m2d-sprite {
  --m2d-frame: 96px;  /* one frame of the strip */
  --m2d-frames: 12;
  width: var(--m2d-frame);
  aspect-ratio: 1;
  background: no-repeat 0 0 / auto 100% url('m2d/wave.avif'); /* horizontal strip */
}
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .m2d-sprite {
    animation: m2d-strip var(--kui-duration-xl) steps(var(--m2d-frames)) infinite;
  }
}
@keyframes m2d-strip { to { background-position: calc(-1 * var(--m2d-frames) * var(--m2d-frame)) 0; } }
```

Count frames in pixels, not percentages: percentage `background-position` is measured against (strip size − box size), which is hard to read and easy to break. `steps()` never rests on the strip's final frame, so make the last frame a duplicate of the first for a clean loop seam. Each step repaints only the strip's box; keep strips small (a badge, a mascot), never page-sized.

### Designer files: dotLottie and Rive (T2+)

| Runtime | Good for | Caveat |
| --- | --- | --- |
| dotLottie web (`@lottiefiles/dotlottie-web`) | Designer exports, `.lottie` playback | Pre-1.0; fetches ~500 KB WASM from a CDN by default — self-host it |
| Rive (`@rive-app/canvas`) | Interactive characters, state machines, live values | WASM runtime; `canvas-lite` variant when you only need playback |
| lottie-web | — (legacy player) | No release since May 2025: maintenance risk; do not start new work on it |

APIs differ per runtime, but the flow is the one above: gate on tier and reduced motion, dynamic-import the player after first paint, let it own one canvas, play/pause with the same IntersectionObserver + `visibilitychange` wiring, and run its cleanup (destroy/stop) on unmount.

Framework notes: mount logic belongs in a mount effect with cleanup (`useEffect`, `onMounted`, `$effect`): `references/platforms/web-frameworks.md`. Native runtimes: `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- No canvas is created and no player WASM loads: the gate (tier + `prefers-reduced-motion: reduce`, surfaced as `data-motion-tier="0"`) refuses before any dynamic `import()`, so the bytes are never fetched.
- Sprite strips, stroke loops, and motion-path flyers freeze: the first strip frame, the ring's current dash state, and `offset-distance: 0%` render statically; the media-query gate keeps the animations off.
- Progress and status still land: the ring shows its definite value, counters and labels stay DOM text.
- Motion that remains is a fade of ≤200ms on a whole element (the motion tokens already collapse distances and scale to neutral).

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Full-density particle field, sprite loops, dotLottie/Rive, PixiJS when sprite count justifies GPU batching | — |
| T2 | Particle field at ~60 dots per surface (dpr ≤ 2), dotLottie/Rive, sprite loops | GPU batching, high counts |
| T1 | CSS/SVG only: strokes, `offset-path`, small `steps()` strips | Canvas 2D, PixiJS, dotLottie/Rive; ambient loops become their first frame |

A tier drop (`watchFrameRate()` in assets/snippets/motion-tier.js) reconciles: the gate tears the loop down and the static first frame returns.

## Performance budget

- One particle loop per page; one dotLottie/Rive player per region. Both pause via IntersectionObserver and `visibilitychange`.
- Size the canvas to its box, never to the page; cap `devicePixelRatio` at 2.
- Counts: ~60 dots per surface at T2, ~140 at T3 at 1440×900; recycle positions instead of spawning.
- No allocation inside the tick: dots, colors, and paths are created once; clamp the time delta so background-tab hitches cannot teleport particles.
- Strip loops repaint only the strip box: keep frames small and the frame count honest.
- dotLottie costs ~500 KB WASM plus the `.lottie` file: pay for it only on surfaces that need designer files, and self-host the WASM (privacy and offline; `references/libraries.md`).
- PixiJS only when one Canvas 2D loop cannot hold the count (roughly thousands of sprites, or batched filters); its subpath exports allow tree-shaking.

## Accessibility

- Decorative canvases and strips: `aria-hidden="true"`, `alt=""`, `pointer-events: none`.
- Meaningful motion needs a DOM twin: progress rings report their value as text; counters are real text; the canvas only paints.
- Loops that run 5 s or longer alongside other content need a pause control (WCAG 2.2.2), including ambient Rive characters.
- Nothing flashes more than 3 times per second (WCAG 2.3.1); sparkle and strobe passes count.
- Contrast: particles stay out from behind body text; text over the canvas keeps 4.5:1 at its busiest frame (WCAG 1.4.3).
- Canvas interactions have real button or link equivalents that work from the keyboard (WCAG 2.1.1).

## Libraries

- CSS/SVG strokes and `offset-path` need no package — start there at T1.
- dotLottie web (`@lottiefiles/dotlottie-web`, MIT, pre-1.0, self-host the WASM) or Rive (`@rive-app/canvas`, MIT, WASM; `canvas-lite` for playback-only).
- lottie-web is stale (no release since May 2025): avoid for new work.
- pixi.js 8 (MIT) for GPU-batched 2D; GSAP (free for all users but not OSI-licensed — review before use in products that compete with no-code tools) or anime.js (MIT, v4 named ESM imports) for timelines and morphs. MorphSVG ships in GSAP's free plugin set (still not OSI).
- Versions, licenses, and sizes: `references/libraries.md`.

## Pitfalls

- `canvas.width = …` clears all context state: after resizing, re-apply `ctx.scale(dpr, dpr)` and any cached styles.
- Calling `getContext('2d')` per frame or per region: grab it once and store it.
- SMIL (`<animate>`, `<animateTransform>`): legacy and inconsistently implemented; prefer CSS, WAAPI, or a runtime.
- Percentage `background-position` math for sprite strips: use pixel math and count frames, not percentages.
- Text and copy inside canvas: pixels forever; screen-reader and zoom users lose it.
- `setInterval` for drawing: clock drift plus background-tab waste; use `requestAnimationFrame` and clamp the delta.
- Skipping the runtime's destroy/stop on unmount: the WASM instance keeps CPU and memory alive.
- Particles drifting under body text: the background moves, so contrast churns; scope the field away from copy.

