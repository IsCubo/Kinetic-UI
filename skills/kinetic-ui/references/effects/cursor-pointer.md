# Cursor and pointer effects

> Keywords: custom cursor, cursor follower, trailing cursor, cursor halo, cursor ring, magnetic button, magnetic cursor, pointer follower, pointer spotlight, cursor spotlight, crosshair cursor, sticker cursor, block cursor, cursor url, hotspot, fine pointer, hover media query, cursor personalizado, efecto de cursor
> Summary: How to add pointer followers, halos, spotlights, and magnetic pull plus native cursor shapes without hiding the system pointer, with exact per-tier behavior.

A pointer effect answers the hand: the surface acknowledges where the person aims. The native pointer stays visible and functional; these effects decorate the space around it, never replace it.

## When to use

| Fits | Effect |
| --- | --- |
| Brand and marketing pages with a desktop audience | Trailing ring or halo around the native pointer |
| Galleries, product viewers, dark hero sections | Pointer spotlight on a decorative layer |
| One primary call to action per page | Magnetic pull, capped at `--kui-distance-md` |
| A style that defines the pointer (cyberpunk crosshair, neo-brutalist sticker, minimal ring) | Native cursor shape via `cursor: url()` plus a keyword fallback |
| Cards that must feel physical | Pointer-tracked tilt, in `references/effects/depth-layers.md` |

## When not to use

- Touch-first, TV, in-car, and console UIs. There is no pointer: mount nothing when `(hover: none)`.
- Product UI, forms, dashboards, and code editors. A follower over inputs distracts and can cover the caret or a drag handle.
- Long reading pages. A halo crossing running text changes contrast frame by frame.
- As a substitute for the system pointer. `cursor: none` is forbidden in this skill: it removes the hotspot, the OS cursor size and contrast settings, the text caret, and every native drag affordance.
- As the only cue that something is interactive. Hover and focus states must already exist.
- With a trail that survives `pointerleave`, or with any idle loop while the pointer sits still.

## How it works

| Layer | Markup | Cost |
| --- | --- | --- |
| Native pointer | OS cursor, optionally restyled with `cursor: url(...) 4 4, auto` | None |
| Follower | One fixed element, `pointer-events: none`, moved with `translate` | Compositor |
| Halo or ring | The same element: border, outline, or radial-gradient disc | Compositor |
| Spotlight | One fixed layer with a radial gradient at the pointer, behind content | Paint on a viewport-sized layer |
| Magnet target | The element's own `translate`, clamped to a maximum | Compositor |

Pointer position lives in two custom properties written once per frame, so one listener drives the follower, the spotlight, and any decorative echo.

| Variable | Default | Role |
| --- | --- | --- |
| `--cursor-x`, `--cursor-y` | `-100px` | Pointer position in viewport pixels; offscreen at rest |
| `--cursor-size` | `28px` | Ring diameter; `10px` for a dot |
| `--cursor-lag` | `--kui-duration-sm` | Follower smoothing; cap at `--kui-duration-md` |
| `--cursor-grow` | `calc(1 + (var(--kui-scale-pop) - 1) * 10)` | Ring scale over interactive targets: 1.4 by default, exactly 1 at T0 |
| `--cursor-pull` | `0.25` | Magnetic ratio of pointer-to-center distance |
| `--cursor-pull-max` | `--kui-distance-md` | Magnet travel cap; read it in the handler or pass `max` to `magnet()` |
| `--cursor-spot` | `220px` | Spotlight radius; keep at or below `240px` |

States:

| State | Trigger | Visual change | Duration token |
| --- | --- | --- | --- |
| Rest | Pointer enters the viewport | Follower fades in over the pointer | `--kui-duration-xs` |
| Over a control | `pointerover` on `a, button, [role="button"], summary` | Ring grows to `--cursor-grow`, border takes `--brand-primary` | `--kui-duration-xs` |
| Leave window | `pointerout` with `relatedTarget: null`, or `blur` | Follower and spotlight fade out, magnet resets | `--kui-duration-sm` |
| Touch, pen, T0, T1 | Gate fails | No follower element is rendered | — |

## Implementation

Native cursor shapes are T1 and need no JS: a cursor image is a static asset, not motion. Keep the hotspot on the visible point, supply a keyword fallback, and stay within the 32×32 limit that platforms enforce.

```css
.kui-cursor-sticker {
  /* 20×20 sticker, hotspot at 4 4; `pointer` keeps a valid fallback everywhere. */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect x='2' y='2' width='16' height='16' rx='3' fill='%23111'/%3E%3C/svg%3E") 4 4, pointer;
}
```

### Follower and halo (T2+, fine pointer)

```html
<div class="kui-cursor" data-kui-min-tier="2" aria-hidden="true"></div>
```

```css
:root {
  --cursor-x: -100px; --cursor-y: -100px;
  --cursor-grow: calc(1 + (var(--kui-scale-pop) - 1) * 10);   /* 1.4 default, 1 at T0 */
}

.kui-cursor {
  position: fixed; inset: 0 auto auto 0;
  inline-size: var(--cursor-size, 28px); block-size: var(--cursor-size, 28px);
  border: 2px solid var(--brand-accent); border-radius: 50%;
  translate: calc(var(--cursor-x) - 50%) calc(var(--cursor-y) - 50%);
  scale: 1; opacity: 0; pointer-events: none; z-index: 9999;
}
:root[data-cursor="active"] .kui-cursor { opacity: 1; }
:root[data-cursor-grow="true"] .kui-cursor { scale: var(--cursor-grow, 1); border-color: var(--brand-primary); }

@media (prefers-reduced-motion: no-preference) {
  :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .kui-cursor {
    transition:
      translate var(--cursor-lag, var(--kui-duration-sm)) var(--kui-ease-standard),
      scale var(--kui-duration-xs) var(--kui-ease-standard),
      opacity var(--kui-duration-xs) var(--kui-ease-linear);
  }
}
@media (hover: none), (pointer: coarse) { .kui-cursor { display: none; } }
```

`--cursor-grow` multiplies the `--kui-scale-pop` delta, so the ring is 1.4 with default tokens and exactly 1 when the tokens collapse at T0. `data-kui-min-tier="2"` already hides the element below T2; the tier selector keeps the transitions off as well.

### One listener for every pointer layer

```js
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const INTERACTIVE = 'a, button, [role="button"], summary, [data-cursor-grow]';

export function pointerLayers(root) {
  if (!finePointer.matches || Number(root.dataset.motionTier ?? 1) < 2) return () => {};
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;
  let x = -100;
  let y = -100;

  const flush = () => {
    frame = 0;
    root.style.setProperty('--cursor-x', `${x}px`);
    root.style.setProperty('--cursor-y', `${y}px`);
  };
  const onMove = (event) => {
    x = event.clientX;
    y = event.clientY;
    root.dataset.cursor = 'active';
    frame ||= requestAnimationFrame(flush);
  };
  const onOver = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    root.dataset.cursorGrow = String(Boolean(target?.closest(INTERACTIVE)));
  };
  const onOut = (event) => {
    if (event.relatedTarget) return;      // moved between elements, not out of the window
    delete root.dataset.cursor;
    delete root.dataset.cursorGrow;
  };

  document.addEventListener('pointermove', onMove, { passive: true, signal });
  document.addEventListener('pointerover', onOver, { passive: true, signal });
  document.addEventListener('pointerout', onOut, { signal });
  window.addEventListener('blur', onOut, { signal });

  return () => {
    cancelAnimationFrame(frame);
    controller.abort();
    root.style.removeProperty('--cursor-x');
    root.style.removeProperty('--cursor-y');
  };
}
```

Never read `getBoundingClientRect()` in `pointermove`: one write per frame, and the browser batches it into the next paint.

### Spotlight (T2+, sparse pages only)

```css
.kui-spotlight {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; opacity: 0; contain: paint;
  background: radial-gradient(
    circle var(--cursor-spot, 220px) at var(--cursor-x) var(--cursor-y),
    color-mix(in oklab, var(--brand-accent) 18%, transparent),
    transparent 70%);
}
:root[data-cursor="active"] .kui-spotlight { opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
  :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .kui-spotlight {
    transition: opacity var(--kui-duration-md) var(--kui-ease-standard);
  }
}
```

The spotlight lightens; it never darkens. It sits behind content, so text contrast can only improve: a dark scrim over text is a contrast bug, not a mood.

### Magnetic pull (T2+)

The full component-level recipe lives in `references/components/buttons.md`; the contract is the same: clamp the offset, write `translate` (not `transform`, so it composes with the press `scale`), reset on `pointerleave`.

| Target | `--cursor-pull` | Max travel |
| --- | --- | --- |
| Primary CTA | `0.3` | `--kui-distance-md` |
| Card or tile | `0.12` | `--kui-distance-sm` |
| Icon button | `0.2` | `calc(var(--kui-distance-sm) * 1.5)` |

```js
export function magnet(el, pull = 0.25, max = 12) {
  if (!finePointer.matches || Number(document.documentElement.dataset.motionTier ?? 1) < 2) return;
  let box;
  const clamp = (v) => Math.max(-max, Math.min(max, v * pull));
  el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });
  el.addEventListener('pointermove', (event) => {
    el.style.translate = `${clamp(event.clientX - box.left - box.width / 2)}px ${clamp(event.clientY - box.top - box.height / 2)}px`;
  });
  el.addEventListener('pointerleave', () => { el.style.translate = ''; });
}
```

Framework notes: mount `pointerLayers` in a mount effect and return its cleanup — `useEffect`, `onMounted`, or `$effect`; see `references/platforms/web-frameworks.md`. Native equivalents: Flutter `MouseRegion(onHover:)` plus `SystemMouseCursors`, SwiftUI `.onContinuousHover` and `.pointerStyle`, Compose `pointerHoverIcon` inside `pointerInput`; see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

| Layer | T0 |
| --- | --- |
| Native pointer | Unchanged, visible, at the OS size and contrast the user chose |
| Follower and halo | Not rendered: the element carries `data-kui-min-tier="2"` and its transitions are gated off |
| Spotlight | Not rendered; no `--cursor-x` writes, so no full-viewport repaint |
| Magnet | Disabled; the JS returns before attaching listeners, and a tier change to 0 runs the cleanup |
| Cursor shapes | Kept when the style enables them: a static cursor image is not animation |

No fade-in on the follower, no lerp, no echo layer, and no replacement animation. The pointer simply is the system pointer.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Follower, halo, spotlight behind a contained hero, magnet on one CTA, all from one rAF writer | Nothing beyond the one-CTA cap |
| T2 | Follower and halo, magnet on fine pointers, spotlight only on a hero-height layer with `contain: paint` | Full-viewport spotlight, decorative echo layers |
| T1 | Native cursor shapes only | All JS: no follower, no magnet, no spotlight |
| T0 | As in Reduced motion | Everything above |

When `watchFrameRate()` lowers the tier, re-run the setup on `kui:motiontierchange` (`assets/snippets/motion-tier.js`) and let the cleanup remove the listeners.

## Performance budget

- One `pointermove` listener and one `requestAnimationFrame` write per frame, for every layer on the page.
- Animate `translate` and `scale` only. No `filter`, no `blur`, no `box-shadow` per frame on the follower; those force repaint of a moving layer.
- Keep the spotlight at or below `240px` radius and behind content, so only a small area repaints. `contain: paint` bounds it.
- Read the element rect on `pointerenter` and on `resize`, never on `pointermove`.
- `will-change: translate` on the follower only, and remove it when the tier drops.
- The whole effect is under 1 KB. A cursor library costs more than this and usually sets `cursor: none`.
- Verify at 4× CPU throttling: no long tasks while moving the pointer across text, and a stable frame rate at 120 Hz, where the single per-frame write still applies.

## Accessibility

- The native pointer is preserved (WCAG 2.5.1 is satisfied by the unchanged pointer, not by the decoration). Never `cursor: none`.
- `cursor: url()` keeps a keyword fallback, so forced-colors mode, an unsupported image format, and the OS pointer settings all still produce a usable pointer.
- The follower is `pointer-events: none` and `aria-hidden="true"`: it never intercepts a click, a drag, or a text selection, and screen readers never announce it.
- Magnet moves the hit area. Cap it at `--kui-distance-md`, skip it on destructive confirmations, on menu bars, and on anything inside a scrollable text block.
- The spotlight must not reduce contrast at its brightest point: verify 4.5:1 for body text and 3:1 for large text in the busiest frame (WCAG 1.4.3).
- Every pointer affordance has a keyboard path that already exists: focus ring, hover state mirrored on `:focus-visible`, and `Enter`/`Space` activation (WCAG 2.1.1, 2.4.7).
- Provide the in-product "Reduce motion" toggle that forces T0, as described in `references/foundations/accessibility-motion.md`.

## Libraries

- No library: the follower and the magnet are about 40 lines and reuse `assets/tokens/motion.css`.
- Optional at T2: Motion (`useSpring`, `motionValue`) for a velocity-aware follower, GSAP `quickTo` for a magnetic follow. Facts, licenses, and maintenance status: `references/libraries.md`.

## Pitfalls

- `cursor: none` plus a JS follower: the pointer disappears on the first dropped frame, during drags, and for every user who relies on the OS pointer size.
- A follower drawn at the hotspot hides the caret and the resize arrows; offset the ring or make it hollow.
- `pointermove` without `requestAnimationFrame`: one style write per event, dozens per frame on a high-polling mouse.
- Listening on `pointermove` without a fine-pointer check: touch scrolling emits pointer events and the ring jumps across the screen.
- Magnet applied to a fixed header: the hit area moves away from the visual target and clicks land outside it.
- Leaving the halo visible after the pointer exits the iframe or the window; `pointerout` with `relatedTarget: null` is the reliable signal.
