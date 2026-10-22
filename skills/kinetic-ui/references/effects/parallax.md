# Parallax

> Keywords: parallax, multi-plane parallax, layered parallax, scroll parallax, pointer parallax, mouse parallax, depth on scroll, view-timeline, animation-timeline, --kui-parallax-strength, background-attachment fixed, efecto parallax
> Summary: How to build layered scroll-linked and pointer-linked parallax with CSS scroll timelines, a JS fallback, strength scaled by --kui-parallax-strength, and per-tier degradation.

Parallax moves decorative planes at different speeds so a flat section reads as deep. Use it for one hero or one storytelling section per page, and keep the text on a plane that never moves.

## When to use

| Fits | Variant |
| --- | --- |
| Brand heroes, launches, editorial storytelling | Scroll-linked, 2–4 planes |
| Illustrations already drawn as separate planes (sky, hills, foreground) | Scroll-linked |
| Desktop hero that should answer the cursor | Pointer-linked, fine pointer only |
| A 3D scene that needs camera depth | Use `references/effects/webgl-3d.md` instead |

## When not to use

- Product UI, dashboards, forms, checkout, documentation, and long reading pages.
- Behind body text: every frame changes the background, and therefore the contrast.
- On every section. Repeated parallax becomes noise and multiplies GPU memory.
- With a single photo cut into fake planes; mismatched edges look cheap. Ask for layered art.
- As the only carrier of meaning. Parallax decorates content; it never explains it.

## How it works

Each plane gets `--kui-depth`, the distance it travels (in px) across the section's view range at strength 1. The sign sets direction: a positive value lags behind the scroll (far plane), a negative value leads it (near plane), and 0 scrolls with the page (content plane).

Travel = `--kui-depth × --kui-parallax-strength`. The token is 1 by default, 0.4 at T1, and 0 at T0 and under reduced motion (`assets/tokens/motion.css`), so every tier scales without extra code.

| Plane | `--kui-depth` | Content |
| --- | --- | --- |
| Far | `80px` | Sky, gradient, distant shapes |
| Mid | `32px` | Hills, architecture, large shapes |
| Content | `0` | Headline, copy, buttons (never moves) |
| Near | `-40px` | Foliage, particles, frame elements at the edges |

| Driver | How | Tier |
| --- | --- | --- |
| CSS scroll timeline | `view-timeline` on the section, `animation-timeline` on each plane | T1+ where supported |
| JS scroll fallback | Motion `scroll()` on browsers without scroll timelines | T2+ |
| Pointer | `pointermove` writes `--kui-px`/`--kui-py`; planes use the `translate` property | T2+, `(hover: hover) and (pointer: fine)` |

Timing: scroll-linked motion uses linear progress (`--kui-ease-linear`); the scroll position is the clock. Pointer motion eases toward the target with a short transition.

Scroll-driven animations are Limited availability as of 2026-10 (Chrome 115, Safari 26, Firefox 159 due 2026-10-27). Wrap them in `@supports` and treat the static composition as the default.

## Implementation

### HTML and CSS (T1+)

```html
<section class="kui-parallax" aria-labelledby="story-title">
  <div class="kui-parallax__plane" style="--kui-depth: 80px" aria-hidden="true"><img src="sky.avif" alt="" width="1600" height="1000"></div>
  <div class="kui-parallax__plane" style="--kui-depth: 32px" aria-hidden="true"><img src="hills.avif" alt="" width="1600" height="1000"></div>
  <div class="kui-parallax__content"><h2 id="story-title">Above the tree line</h2></div>
  <div class="kui-parallax__plane" style="--kui-depth: -40px" data-kui-min-tier="3" aria-hidden="true"><img src="leaves.avif" alt="" width="1600" height="1000"></div>
</section>
```

```css
.kui-parallax {
  position: relative;
  overflow: clip;                       /* clip, not hidden: no new scroll container */
  isolation: isolate;
  view-timeline: --kui-parallax block;  /* planes read the section's progress, not their own */
}
.kui-parallax__plane {
  position: absolute;
  inset: -80px 0;                       /* overscan >= the largest |--kui-depth| so edges never show */
  pointer-events: none;
}
.kui-parallax__plane img { inline-size: 100%; block-size: 100%; object-fit: cover; }
.kui-parallax__content { position: relative; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) .kui-parallax__plane {
      animation: kui-parallax 1ms linear both;
      animation-timeline: --kui-parallax;  /* after the shorthand, which resets it */
      animation-range: cover 0% cover 100%;
    }
  }
}

@keyframes kui-parallax {
  from { transform: translate3d(0, calc(var(--kui-depth) * var(--kui-parallax-strength) * -1), 0); }
  to   { transform: translate3d(0, calc(var(--kui-depth) * var(--kui-parallax-strength)), 0); }
}
```

The near plane carries `data-kui-min-tier="3"`, so it renders only at T3; T1 and T2 get two planes.

### JS scroll fallback (T2+, no scroll timelines)

```js
import { animate, scroll } from 'motion';

export function parallaxFallback(section) {
  const root = document.documentElement;
  if (CSS.supports('animation-timeline: view()') || Number(root.dataset.motionTier) < 2) return () => {};
  const strength = parseFloat(getComputedStyle(root).getPropertyValue('--kui-parallax-strength')) || 0;
  const cancels = [...section.querySelectorAll('.kui-parallax__plane')].map((plane) => {
    const travel = (parseFloat(getComputedStyle(plane).getPropertyValue('--kui-depth')) || 0) * strength;
    const motion = animate(plane, { transform: [`translateY(${-travel}px)`, `translateY(${travel}px)`] }, { ease: 'linear' });
    return scroll(motion, { target: section, offset: ['start end', 'end start'] });
  });
  return () => cancels.forEach((cancel) => cancel());
}
```

`['start end', 'end start']` matches the CSS `cover` range. Re-run it on `kui:motiontierchange`.

### Pointer parallax (T2+, fine pointer)

```css
:root:is([data-motion-tier="2"], [data-motion-tier="3"]) .kui-parallax__plane {
  /* `translate` composes with the scroll animation on `transform` instead of overriding it. */
  translate:
    calc(var(--kui-px, 0) * var(--kui-depth) * var(--kui-parallax-strength) * -0.5)
    calc(var(--kui-py, 0) * var(--kui-depth) * var(--kui-parallax-strength) * -0.5);
  transition: translate var(--kui-duration-lg) var(--kui-ease-standard);
}
```

```js
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

export function pointerParallax(section) {
  if (!finePointer.matches || Number(document.documentElement.dataset.motionTier) < 2) return () => {};
  let rect = section.getBoundingClientRect();
  let frame = 0;
  let x = 0;
  let y = 0;
  const write = () => {
    frame = 0;
    section.style.setProperty('--kui-px', x.toFixed(3));
    section.style.setProperty('--kui-py', y.toFixed(3));
  };
  const onEnter = () => { rect = section.getBoundingClientRect(); };
  const onMove = (event) => {
    x = (event.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    y = (event.clientY - rect.top) / rect.height - 0.5;
    frame ||= requestAnimationFrame(write);
  };
  const onLeave = () => { x = 0; y = 0; frame ||= requestAnimationFrame(write); };
  section.addEventListener('pointerenter', onEnter);
  section.addEventListener('pointermove', onMove, { passive: true });
  section.addEventListener('pointerleave', onLeave);
  return () => {
    cancelAnimationFrame(frame);
    section.removeEventListener('pointerenter', onEnter);
    section.removeEventListener('pointermove', onMove);
    section.removeEventListener('pointerleave', onLeave);
    section.style.removeProperty('--kui-px');
    section.style.removeProperty('--kui-py');
  };
}

// Wire both enhancements to the tier (assets/snippets/motion-tier.js dispatches the event):
// let stop = pointerParallax(section);
// document.addEventListener('kui:motiontierchange', () => { stop(); stop = pointerParallax(section); });
```

Framework notes: call these functions in a mount effect (`useEffect`, `onMounted`, `$effect`) and return the cleanup. See `references/platforms/web-frameworks.md`.

## Reduced motion

Exact T0 behavior:

- No plane moves. The CSS animation is gated by `prefers-reduced-motion: no-preference` and `:not([data-motion-tier="0"])`, and `--kui-parallax-strength: 0` neutralizes any remaining transform math.
- The JS fallback and pointer parallax return without attaching listeners; a tier change to 0 runs their cleanup.
- The section shows the static composition: all T0-eligible planes stacked at rest, with the text plane unchanged.
- No smooth scrolling, no scroll snapping, and no replacement animation. An entrance fade of 200ms or less on the whole section is the only allowed motion.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Up to 4 planes (`data-kui-min-tier="3"` planes included), CSS timeline or the Motion fallback, pointer parallax on fine pointers | Nothing; cap at 4 planes |
| T2 | 2–3 planes, CSS timeline or the Motion fallback, pointer parallax on fine pointers, strength 1 | Near/extra planes |
| T1 | 2 planes, CSS timeline only, strength 0.4 from the token; without timeline support, the static composition | All JS: no Motion fallback, no pointer listeners |

When `watchFrameRate()` lowers the tier during the hero, the token and the `data-kui-min-tier` planes update automatically; re-run the JS setup on `kui:motiontierchange`.

## Performance budget

- Moving planes: at most 4 at T3, 3 at T2, 2 at T1. Animate `transform` (scroll) and `translate` (pointer) only.
- Each full-viewport plane costs about width × height × DPR² × 4 bytes of GPU memory: roughly 20 MB at 1440×900 and DPR 2. Crop transparent areas and size images to the plane.
- Use AVIF or WebP, give every image `width` and `height` (no CLS), and lazy-load planes below the fold.
- No scroll listeners at T1. At T2, use one library-managed handler (Motion `scroll()`), never a handler per plane.
- Pointer: one `requestAnimationFrame` write per frame; read the rect on `pointerenter`, not on every move.
- Do not add `will-change` beyond the moving planes. Verify with 4× CPU throttling (`references/foundations/performance-tiers.md`).

## Accessibility

- Planes are decorative: `aria-hidden="true"`, `alt=""`, `pointer-events: none`.
- Keep text on the content plane and check its contrast at the first and last frame of the range (WCAG 1.4.3).
- Near planes stay at the edges and never cover focusable content or the focus ring (WCAG 2.4.11).
- Pointer parallax is an enhancement; nothing requires moving the cursor (WCAG 2.5.1).
- Provide the in-product "Reduce motion" toggle that forces T0 (WCAG 2.3.3), as described in `references/foundations/accessibility-motion.md`.

## Libraries

- Native CSS scroll timelines first; no package needed at T1.
- JS fallback: Motion (`scroll()`) or GSAP ScrollTrigger (`scrub`). Parallax does not need a smooth-scroll library.
- For tilt-style depth on cards, use `references/effects/depth-layers.md`.
- Facts, licenses, and maintenance status: `references/libraries.md`.

## Pitfalls

- `background-attachment: fixed`: mobile browsers, iOS Safari included, ignore or mishandle it, and desktop browsers repaint it on every scroll frame. Use a positioned plane with a transform.
- The `perspective` + `translateZ` CSS trick needs its own scroll container, which breaks native page scrolling, `position: sticky`, and scroll restoration.
- Declaring `animation-timeline` before the `animation` shorthand: the shorthand resets it to `auto` and the planes animate on time.
- `overflow: hidden` on the section creates a scroll container; use `overflow: clip`.
- Anonymous `view()` on each plane: every oversized plane gets its own range, so planes drift out of sync. Name the section's timeline and share it.
- Forgetting overscan: planes expose empty edges at the ends of the range.
- Pointer parallax on touch devices: touch scrolling fires `pointermove` and causes jitter. Gate on `(hover: hover) and (pointer: fine)`.
