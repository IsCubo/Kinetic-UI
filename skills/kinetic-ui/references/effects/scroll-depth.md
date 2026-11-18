# Scroll depth (travel through Z)

> Keywords: scroll depth, z-axis scroll, travel through z, fly-through, dolly, forward motion on scroll, immersive scroll, scroll tunnel, perspective scroll, translateZ, position sticky, pinned stage, --kui-z-p, --kui-z-travel, --kui-z, @property, animation-timeline, fog, depth cues, profundidad, eje z, recorrido
> Summary: How to make scrolling feel like moving forward through a scene: stage/track/layer anatomy, stage dolly vs per-layer z, sticky pinning, stop pacing and scroll-length budget, depth cues, a CSS-only path, a JS controller fallback, and the static stack for T0.

Scrolling moves a pinned camera forward along Z. Layers sit at fixed depths, perspective makes near ones bigger, and each stop of content arrives, holds, and passes. Build the static stack first, then pin and travel only where motion is allowed.

## When to use

| Fits | Notes |
| --- | --- |
| Launch or brand story told in 3–5 beats | One section per page |
| Product tour where each feature is a stop | Copy stays short per stop |
| Editorial or portfolio opener that should feel immersive | Desktop and mobile, T1+ |
| Reuse of layered art already drawn at several depths | Overscan the art |

Which file do I open:

| You want | Open |
| --- | --- |
| The viewer travels forward through stops as they scroll | This file |
| Decorative planes drift at different speeds, no forward travel | `references/effects/parallax.md` |
| Timeline plumbing: reveals, progress bars, ranges, ScrollTrigger | `references/effects/scroll-driven.md` |
| Perspective cards, tilt on hover or keyboard, elevation | `references/effects/depth-layers.md` |
| A real 3D scene with a camera | `references/effects/webgl-3d.md` |

## When not to use

- Product UI, dashboards, forms, checkout, documentation, and long reading pages.
- More than one per page, or a scene longer than 6 stops. Fatigue and scroll cost grow with length.
- Content the user must read at their own pace, or that holds forms and many links.
- When text would sit on a layer that is fading or scaling: contrast and legibility change every frame.
- As the only carrier of meaning. Every stop must also read as plain content in the static stack.

## How it works

Anatomy: three parts, one shared number.

| Part | Role | Rules |
| --- | --- | --- |
| Stage | Tall element: the scroll length, owns `--kui-z-p`, clips overflow | `overflow: clip`, never `hidden` (no new scroll container) |
| Track | Pinned child, `position: sticky`, one viewport high; owns the lens (`perspective`) | Perspective sits here because the vanishing point must be the pinned viewport centre, not the middle of the tall stage |
| Layer | Art or a Stop, placed at a depth | `--kui-z` resting depth in px (negative is far), `--kui-z-speed` multiplier (default 1) |

`--kui-z-p` is progress 0..1 across the pinned range. `--kui-z-travel` is the forward distance in px over the whole range. A layer's depth at progress p is `--kui-z + p × --kui-z-travel × --kui-z-speed`. Zero means it sits on the screen plane; positive means it has passed the camera.

| Choreography | How | Pick it when |
| --- | --- | --- |
| Stage dolly | One `preserve-3d` world wrapper gets `translateZ(p × travel)`; layers keep static `translateZ(var(--kui-z))` | All layers share one speed; cheapest, one moving element |
| Per-layer z | Each layer computes its own `translate` from `--kui-z-p` | You need `--kui-z-speed` (depth parallax) or per-layer opacity ramps |

The recipes below use per-layer z because opacity ramps need it anyway. Dolly is the same CSS with the `translate` moved to the wrapper. Preserve-3d breaks if any ancestor in the chain sets `overflow`, `opacity`, `filter` or `mix-blend-mode`.

Depth cues, in order of value:

1. Perspective divide: apparent scale is `perspective ÷ (perspective − z)`. Use 700–1100px; lower is more dramatic. Free, and it is the main cue.
2. Opacity ramp: fade in from far, fade out before the layer reaches the lens (`translate` stays below about 0.6 × perspective).
3. Fog veil: one static gradient overlay in the background colour above far layers. No animated property.
4. Blur is a last resort. Distance blur needs `filter`, which re-rasterizes the layer on every change. Bake it into far art, or use one static blur at T3 on at most two layers, never animated.

Pacing: give each stop about 80–120svh of scroll. Stage height is `100svh + (stops − 1) × 100svh`, so 3 stops is `300svh`. Above about 3 viewports of pinned scroll, add a skip link after the stage; hard cap is 6 stops. Keep `--kui-z-travel` at or below twice the perspective.

Support: `@property` is Baseline since 2024-07 (Firefox 128 was the last engine); the individual `translate` property is older. Without registration `--kui-z-p` does not interpolate, so the static stack must stay the default. Scroll-driven animations are Limited availability as of 2026-10 (Chrome 115, Safari 26, Firefox 159 due 2026-10-27). Wrap them in `@supports` and treat the static composition as the default.

## Implementation

### HTML

```html
<section class="kui-zdepth" aria-labelledby="zd-title">
  <div class="kui-zdepth__track">
    <div class="kui-zdepth__layer kui-zdepth__art" style="--kui-z: -900px" aria-hidden="true"><img src="tunnel.avif" alt="" width="2400" height="1500"></div>
    <article class="kui-zdepth__layer kui-zdepth__stop" style="--kui-z: 0px; --at: 0"><h2 id="zd-title">Start here</h2><p>First beat.</p></article>
    <article class="kui-zdepth__layer kui-zdepth__stop" style="--kui-z: -450px; --at: .5"><h3>Then deeper</h3><p>Second beat.</p></article>
    <article class="kui-zdepth__layer kui-zdepth__stop" style="--kui-z: -810px; --at: .9"><h3>Arrive</h3><p>Final beat.</p></article>
    <div class="kui-zdepth__veil" aria-hidden="true"></div>
  </div>
</section>
```

`--at` is a unitless local helper (not part of the shared contract): the progress at which the stop reaches the screen plane, `−z ÷ travel` (here travel is 900px). CSS cannot divide a length by a length everywhere yet, so state both and keep them in sync. The last stop uses `--at: .9` so it is still fully visible at p = 1.

### Static stack, then the live scene (CSS-only path, T1+)

```css
@property --kui-z-p { syntax: '<number>'; inherits: true; initial-value: 0; } /* unregistered, the animation would jump 0 → 1 */
@keyframes kui-z-p { from { --kui-z-p: 0; } to { --kui-z-p: 1; } }

.kui-zdepth { position: relative; overflow: clip; isolation: isolate; }
.kui-zdepth__stop { padding-block: var(--kui-distance-lg); }
.kui-zdepth__art { display: none; }   /* decorative art appears only in the live scene */
.kui-zdepth__veil { display: none; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-zdepth { block-size: 300svh; --kui-z-travel: 900px; }
  :root:not([data-motion-tier="0"]) .kui-zdepth__track {
    position: sticky; inset-block-start: 0; block-size: 100svh; overflow: clip;
    display: grid; place-items: center;
    perspective: 900px; perspective-origin: 50% 50%;
  }
  :root:not([data-motion-tier="0"]) .kui-zdepth__layer {
    grid-area: 1 / 1;
    translate: 0 0 calc(var(--kui-z, 0px) + var(--kui-z-p) * var(--kui-z-travel) * var(--kui-z-speed, 1));
    /* d = p − at: fade in over d −0.35…−0.10, hold, fade out over d 0.10…0.30 (before the lens) */
    opacity: min(
      clamp(0, calc((var(--kui-z-p) - var(--at, 0) + 0.35) * 4), 1),
      clamp(0, calc((0.3 - var(--kui-z-p) + var(--at, 0)) * 5), 1));
  }
  :root:not([data-motion-tier="0"]) .kui-zdepth__art { display: block; inline-size: 160%; block-size: 160%; place-self: center; opacity: 1; }   /* overscan; never fades */
  :root:not([data-motion-tier="0"]) .kui-zdepth__veil {
    display: block; grid-area: 1 / 1; pointer-events: none; z-index: 1;
    background: radial-gradient(closest-side, transparent 55%, var(--brand-surface));
  }
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) .kui-zdepth {
      animation: kui-z-p 1ms linear both;   /* the stage's own view timeline */
      animation-timeline: view();           /* after the shorthand, which resets it */
      animation-range: contain 0% contain 100%;   /* taller than the viewport: pinned start to pinned end */
    }
  }
}

/* No timeline and no JS tier: restore the static stack. Must come last. */
@supports not (animation-timeline: view()) {
  :root:not([data-motion-tier="2"]):not([data-motion-tier="3"]) .kui-zdepth { block-size: auto; }
  :root:not([data-motion-tier="2"]):not([data-motion-tier="3"]) .kui-zdepth__track { position: static; block-size: auto; display: block; perspective: none; }
  :root:not([data-motion-tier="2"]):not([data-motion-tier="3"]) .kui-zdepth__layer { translate: none; opacity: 1; }
  :root:not([data-motion-tier="2"]):not([data-motion-tier="3"]) .kui-zdepth__art,
  :root:not([data-motion-tier="2"]):not([data-motion-tier="3"]) .kui-zdepth__veil { display: none; }
}
```

The animated custom property runs on the main thread and restyles the track subtree each frame; that is the reason for the layer caps below. T3 adds `data-kui-min-tier="3"` to extra overscan art and one more veil (`assets/tokens/motion.css`).

### JS controller (T2+, browsers without scroll timelines)

`assets/effects/scroll-depth.js` replaces the animation: it writes `--kui-z-p` and nothing else. Use one writer per stage, so start it only when the CSS timeline is missing.

```js
import { applyMotionTier } from '../snippets/motion-tier.js';
import { createScrollDepth } from './scroll-depth.js';

applyMotionTier();
const stage = document.querySelector('.kui-zdepth');
const depth = createScrollDepth(stage, { length: 2 * innerHeight }); // optional: pinned px; default measured
if (!CSS.supports('animation-timeline: view()')) depth.start();
// route change or unmount: depth.dispose()
```

| Controller behavior | Detail |
| --- | --- |
| Work gate | One `IntersectionObserver`; one `requestAnimationFrame` loop that runs only while the stage is visible |
| Progress | `-stage.getBoundingClientRect().top ÷ pinned length`, clamped 0..1, rounded to 3 decimals |
| Tier | Runs at `data-motion-tier` 2 or 3 only; re-evaluates on `kui:motiontierchange` and on `prefers-reduced-motion` changes |
| Cleanup | `dispose()` removes observer, listeners and the pending frame, and clears `--kui-z-p` |

Framework notes: call `start()` in a mount effect (`useEffect`, `onMounted`, `$effect`) and return `dispose`. See `references/platforms/web-frameworks.md`.

## Reduced motion

Exact T0 behavior:

- The live rules sit inside `prefers-reduced-motion: no-preference` and exclude `data-motion-tier="0"`, so neither applies: no pinning, no perspective, no travel, no timeline.
- The result is the static stack: stops in normal flow, in source order, at rest, with `translate: none`, `opacity: 1`, and the art and veil hidden.
- The controller never starts, and a switch to T0 or to `reduce` clears `--kui-z-p` and releases the observer.
- No smooth scrolling, no snapping, no replacement animation. An entrance fade of 200ms or less on the whole section is the only allowed motion.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Full choreography: up to 6 stops, overscan art, veil, optionally one static blur on at most two layers | Nothing; cap at 8 layers |
| T2 | JS controller where timelines are missing, otherwise the CSS timeline; at most 3 stops, 2 art layers | No blur, no extra veil, no `--kui-z-speed` variance |
| T1 | CSS timeline only, 3 stops, 2 art layers; without timeline support, the static stack | All JS: no controller |
| T0 | Static stack | Everything above |

When `watchFrameRate()` lowers the tier mid-scroll, the static rules or the lower layer set apply immediately; re-arm the controller on `kui:motiontierchange`.

## Performance budget

- Animated properties: `transform`/`translate` and `opacity` on layers, plus the one registered custom property on the stage. Never `top`, `filter`, `box-shadow`, width or height.
- Layers: at most 8 at T3, 5 at T2, 4 at T1. Each full-bleed art layer costs about width × height × DPR² × 4 bytes of GPU memory, and overscan multiplies it: size art images to the plane.
- Style cost: custom property changes restyle every layer that reads them. Keep layers few; do not add `will-change` beyond the layers.
- One writer, one loop, one observer per stage. Never one scroll listener per layer. Write only when the 3-decimal value changes.
- Total scroll length: at most about 6 viewports; a typical scene is 3–5. Verify at 4× CPU throttling (`references/foundations/performance-tiers.md`).

## Accessibility

- Every stop is real content in source order, readable by a screen reader without scrolling the scene. Art layers are `aria-hidden="true"` with `alt=""`.
- Keep links and buttons out of middle stops: a faded layer is still focusable and its focus ring is invisible (WCAG 2.4.7, 2.4.11). Put calls to action after the stage, or in the last stop, which stays opaque.
- Check text contrast at the first and last frame of each stop's opaque range (WCAG 1.4.3) and keep text at scale ≤ 1.25.
- Scroll is never hijacked: native speed, no snap, no wheel handlers. Add a skip link after the stage when it exceeds about 3 viewports.
- Provide the in-product "Reduce motion" toggle that forces T0 (WCAG 2.3.3), as in `references/foundations/accessibility-motion.md`.

## Libraries

- Native CSS scroll timelines plus the asset; no package is needed at T1 or T2.
- GSAP ScrollTrigger (`pin`, `scrub`) can drive `--kui-z-p` or a dolly timeline for authored sequences; use it instead of, never beside, the CSS path.
- Lenis smooth scroll is not part of this effect.
- Facts, licenses, and maintenance status: `references/libraries.md`.

## Pitfalls

- `perspective` on the tall stage: the vanishing point lands in the middle of the whole stage and layers slide sideways or up as you scroll. Put it on the pinned track.
- `perspective` plus `translateZ` on `<body>` or a scroll container to fake this: it breaks native scrolling, `position: sticky` and scroll restoration.
- `overflow: hidden` on the stage creates a scroll container and kills `sticky`; use `overflow: clip`. A stretched grid or flex item cannot stick either: keep `block-size: 100svh` on the track.
- Layers that reach `perspective` distance explode in size, and past it they flip behind the camera. Fade them out first and keep `--kui-z-travel` ≤ 2 × perspective.
- Far layers shrink under the divide and expose their edges: overscan art by 30% or more.
- Per-layer z on a flat track does not depth-sort: siblings paint in source order, so a far stop later in the source covers a near one. Keep source order for reading, keep stop opacity windows from overlapping, and set `z-index` from near to far when they must; the stage dolly's `preserve-3d` world sorts by depth.
- `animation-timeline` before the `animation` shorthand: the shorthand resets it to `auto` and progress runs on time.
- A second writer: the CSS animation overrides inline values, so a running controller beside a supported timeline is wasted work. Start the controller only without support.
- Unregistered `--kui-z-p`: it interpolates discretely, so the scene jumps between the first and last frame.
- `100svh` track with a measured `innerHeight` span: toolbar resizing on mobile drifts progress slightly. Pass `length`.
- Dropping `--at` or forgetting to keep it equal to `−z ÷ travel`: a stop fades in at the wrong time and may never be fully opaque.
