# Depth and layers

> Keywords: depth, depth layers, 3D transforms, perspective, preserve-3d, tilt card, hover tilt, 3D card, elevation, layered shadows, z-index scale, z-depth hierarchy, stacking context, glass depth, glassmorphism depth, device orientation tilt, gyroscope, DeviceOrientationEvent, profundidad
> Summary: How to build depth with perspective and 3D transforms, tilt cards that answer pointer and keyboard, layered elevation shadows, a z-depth hierarchy, glass depth, and opt-in device-orientation tilt.

Depth tells users what sits above what and what they can touch. Build it from static cues first (elevation, overlap, z-order), then add motion cues (tilt, lift) as enhancements scaled by `--kui-parallax-strength`.

## When to use

- Product, pricing, or collectible cards where a tactile response invites inspection.
- Hierarchy: menus, popovers, sheets, and dialogs that float above the page.
- Hero compositions with stacked planes or a HUD of floating panels.
- Glass panels that must read as a layer above a busy background.

## When not to use

- Dense lists, tables, and rows: tilt on every item is noise.
- Text-heavy cards: rotated text blurs and is harder to read.
- Device-orientation tilt as a default: it surprises users and needs a permission prompt on iOS.
- Tilt as the only affordance that something is clickable.

## How it works

| Cue | CSS | Cost |
| --- | --- | --- |
| Elevation | Layered `box-shadow` per level; lighter surface per level in dark mode | Static: cheap. Animated shadow values repaint |
| Overlap and z-order | A fixed z-index scale; the top layer for overlays | None |
| Perspective | `transform: perspective(900px) …` on the element, or `perspective` on a shared parent | Cheap |
| Rotation | `rotateX`/`rotateY`, at most 8° | Compositor (`transform`) |
| Lift | `translateY(-var)` plus a stronger shadow on a pseudo-element faded by `opacity` | Compositor |
| Pop-out layers | `transform-style: preserve-3d` with children at `translateZ()` | Compositor; breaks with flattening properties |
| Glass | `backdrop-filter: blur()` over moving content | Expensive: keep panels small and few |

Z-depth hierarchy (starter scale; map it to the project's tokens):

| Layer | z-index | Elevation | Examples |
| --- | --- | --- | --- |
| Base | auto | none | Page content |
| Raised | 1 | `--elevation-1`–`--elevation-2` | Cards, tilt cards at rest |
| Sticky | 100 | `--elevation-2` | Sticky header, toolbars |
| Floating | 200 | `--elevation-3` | Dropdowns, hover cards |
| Overlay | top layer | `--elevation-4` | `<dialog>`, `popover`, sheets (`references/components/overlays.md`) |

Higher elevation means closer: larger, softer shadow and, on dark surfaces, a lighter surface tint.

Tilt states:

| State | Trigger | Visual change | Duration token |
| --- | --- | --- | --- |
| Rest | — | Flat, `--elevation-1` | — |
| Hover (T1) | `:hover` | Fixed gentle tilt, lift, stronger shadow | `--kui-duration-sm` |
| Track (T2+) | `pointermove` | Rotation follows the pointer, up to `--kui-tilt-max` | `--kui-duration-sm` (retargeted) |
| Keyboard focus | `:has(:focus-visible)` | Same as hover; focus ring on the link | `--kui-duration-sm` |
| Orientation (opt-in, T2+) | `deviceorientation` | Rotation follows the device | `--kui-duration-sm` |

## Implementation

### Elevation tokens

```css
:root {
  --shadow-color: color-mix(in oklab, var(--brand-on-surface, #1b1b2a) 14%, transparent);
  --elevation-1: 0 1px 2px var(--shadow-color);
  --elevation-2: 0 1px 2px var(--shadow-color), 0 4px 10px var(--shadow-color);
  --elevation-3: 0 2px 4px var(--shadow-color), 0 8px 18px var(--shadow-color), 0 18px 36px var(--shadow-color);
  --elevation-4: 0 4px 8px var(--shadow-color), 0 16px 32px var(--shadow-color), 0 32px 64px var(--shadow-color);
}
```

### Tilt card (T1 CSS, T2+ pointer)

```html
<article class="kui-tilt">
  <img src="sneaker.avif" alt="" width="640" height="480">
  <h3><a href="/p/runner">Trail runner</a></h3>
</article>
```

```css
.kui-tilt {
  --kui-tilt-x: 0;      /* -1..1, written by JS (pointer or device orientation) */
  --kui-tilt-y: 0;
  --kui-tilt-max: 8deg;
  --kui-lift: 0px;
  position: relative;
  border: 1px solid transparent; /* becomes visible in forced-colors mode, where shadows disappear */
  border-radius: var(--brand-radius);
  background: var(--brand-surface);
  box-shadow: var(--elevation-1);
  transform:
    perspective(900px)
    rotateX(calc(var(--kui-tilt-y) * var(--kui-tilt-max) * var(--kui-parallax-strength) * -1))
    rotateY(calc(var(--kui-tilt-x) * var(--kui-tilt-max) * var(--kui-parallax-strength)))
    translateY(var(--kui-lift));
  transition: transform var(--kui-duration-sm) var(--kui-ease-standard);
}
.kui-tilt::after { /* the stronger shadow fades in; shadow values never animate */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: var(--elevation-3);
  opacity: 0;
  transition: opacity var(--kui-duration-sm) var(--kui-ease-standard);
  pointer-events: none;
}
.kui-tilt:hover,
.kui-tilt:has(:focus-visible) { --kui-tilt-y: -0.4; --kui-lift: calc(-1 * var(--kui-distance-sm)); }
.kui-tilt:hover::after,
.kui-tilt:has(:focus-visible)::after { opacity: 1; }
.kui-tilt a::after { content: ""; position: absolute; inset: 0; } /* whole card is the link's hit area */
```

```js
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

export function pointerTilt(card) {
  if (!finePointer.matches || Number(document.documentElement.dataset.motionTier) < 2) return () => {};
  let rect = card.getBoundingClientRect();
  let frame = 0;
  let x = 0;
  let y = 0;
  const write = () => {
    frame = 0;
    card.style.setProperty('--kui-tilt-x', x.toFixed(3));
    card.style.setProperty('--kui-tilt-y', y.toFixed(3));
  };
  const onEnter = () => { rect = card.getBoundingClientRect(); };
  const onMove = (event) => {
    x = ((event.clientX - rect.left) / rect.width) * 2 - 1; // the area under the pointer presses away
    y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    frame ||= requestAnimationFrame(write);
  };
  const onLeave = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    card.style.removeProperty('--kui-tilt-x'); // hand back to the CSS rest/focus state
    card.style.removeProperty('--kui-tilt-y');
  };
  card.addEventListener('pointerenter', onEnter);
  card.addEventListener('pointermove', onMove, { passive: true });
  card.addEventListener('pointerleave', onLeave);
  return () => {
    onLeave();
    card.removeEventListener('pointerenter', onEnter);
    card.removeEventListener('pointermove', onMove);
    card.removeEventListener('pointerleave', onLeave);
  };
}
```

Pop-out layers: add `transform-style: preserve-3d` to the card and `transform: translateZ(calc(40px * var(--kui-parallax-strength)))` to a child (badge, product cut-out). The card must not use `overflow: hidden`, `filter`, `clip-path`, `mask`, or `opacity < 1`; they flatten the 3D context.

### Glass depth

A glass panel reads as a layer through translucency, a hairline highlight, and elevation. Full recipe, tints, and contrast rules: `references/styles/glassmorphism.md`.

```css
.kui-glass { background: var(--brand-surface); box-shadow: var(--elevation-3); border: 1px solid color-mix(in oklab, var(--brand-on-surface) 12%, transparent); }
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .kui-glass { background: color-mix(in oklab, var(--brand-surface) 62%, transparent); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
}
@media (prefers-reduced-transparency: reduce) {
  .kui-glass { background: var(--brand-surface); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
```

### Device-orientation tilt (opt-in, off by default, T2+)

Render `<button type="button" aria-pressed="false" hidden>Tilt with device motion</button>` next to the card. iOS Safari grants motion data only from `DeviceOrientationEvent.requestPermission()` called inside a user gesture; other browsers need a secure context and no prompt.

```js
export function orientationTilt(button, card) {
  const root = document.documentElement;
  const supported = typeof DeviceOrientationEvent !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (!supported) return () => {};
  let on = false;
  let base = null;
  let frame = 0;
  let x = 0;
  let y = 0;
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const write = () => {
    frame = 0;
    card.style.setProperty('--kui-tilt-x', x.toFixed(3));
    card.style.setProperty('--kui-tilt-y', y.toFixed(3));
  };
  const onOrientation = (event) => {
    if (event.beta === null || event.gamma === null) return;
    base ??= event.beta; // the angle the user holds the phone at when enabling
    x = clamp(event.gamma / 30);
    y = clamp((event.beta - base) / 30);
    frame ||= requestAnimationFrame(write);
  };
  const setOn = (value) => {
    on = value;
    base = null;
    button.setAttribute('aria-pressed', String(on));
    if (on) { addEventListener('deviceorientation', onOrientation); return; }
    removeEventListener('deviceorientation', onOrientation);
    cancelAnimationFrame(frame);
    frame = 0;
    card.style.removeProperty('--kui-tilt-x');
    card.style.removeProperty('--kui-tilt-y');
  };
  const onClick = async () => {
    if (!on && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const state = await DeviceOrientationEvent.requestPermission().catch(() => 'denied'); // called inside the click
      if (state !== 'granted') return;
    }
    setOn(!on);
  };
  const onTier = () => {
    const allowed = Number(root.dataset.motionTier) >= 2;
    button.hidden = !allowed;
    if (!allowed) setOn(false);
  };
  onTier();
  button.addEventListener('click', onClick);
  document.addEventListener('kui:motiontierchange', onTier);
  return () => { setOn(false); button.removeEventListener('click', onClick); document.removeEventListener('kui:motiontierchange', onTier); };
}
```

Framework notes: run `pointerTilt` and `orientationTilt` in a mount effect and return the cleanup. React users can smooth values with Motion springs; GSAP users with `gsap.quickTo()`.

## Reduced motion

Exact T0 behavior:

- No rotation, lift, or pop-out: `--kui-parallax-strength` and `--kui-distance-sm` are 0, so every transform resolves to flat.
- `pointerTilt` and `orientationTilt` attach nothing; the orientation button stays hidden, and an active orientation listener is removed on `kui:motiontierchange`.
- Hover and focus keep feedback: the stronger shadow fades in over `--kui-duration-sm` (150ms), and the focus ring shows.
- Elevation, z-order, and glass stay as static depth cues.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Everything in T2; optional depth inside a 3D scene (`references/effects/webgl-3d.md`) | — |
| T2 | Pointer tilt, opt-in orientation tilt on touch devices, preserve-3d pop-outs, glass blur | — |
| T1 | CSS only: hover/focus lift and a fixed tilt at strength 0.4 (≈1.3°), shadow fade, static elevation; glass blur only on small panels | Pointer and orientation tracking, pop-out layers |

## Performance budget

- Animate `transform` and `opacity`; never animate `box-shadow`, `filter`, or `backdrop-filter` values.
- One tilting element at a time: the hovered card. Pointer handlers do one `requestAnimationFrame` write per frame and read the rect on enter.
- No permanent `will-change` on grids of cards; transitions promote layers while they run.
- `backdrop-filter`: at most a few panels per viewport, blur radius around 20px or less, never on full-screen layers that scroll on low-end phones.
- Large blurred shadows on many cards repaint on scroll in some engines; keep `--elevation-3` and `--elevation-4` for floating elements.

## Accessibility

- Tilt is decoration: the card works without it, and nothing requires a gesture or device motion (WCAG 2.5.1).
- Keyboard focus produces the same lift as hover (WCAG 2.1.1). Keep the focus ring on the link with `outline-offset`, and never clip it with `overflow` or `clip-path` (WCAG 2.4.7).
- Return to flat at rest so reading happens without rotation; keep `--kui-tilt-max` at 8° or less.
- Orientation tilt is opt-in, labelled, reversible with the same button (`aria-pressed`), and never prompts on page load (WCAG 2.3.3).
- Glass and elevated panels keep 4.5:1 text contrast against the busiest backdrop (WCAG 1.4.3); `prefers-reduced-transparency` gets a solid surface.
- In forced-colors mode shadows disappear; the transparent border keeps the layer edge visible.

## Libraries

- A small custom implementation (above) beats a tilt package; `references/libraries.md` lists the stale tilt libraries to avoid.
- Motion or GSAP only when the project already ships them, for spring or `quickTo` smoothing.
- Versions and licenses: `references/libraries.md`.

## Pitfalls

- A stacking context per transformed card traps tooltips and menus underneath neighbors; render them in the top layer (`popover`, `<dialog>`).
- Escalating z-index values (9999) instead of a scale.
- `overflow: hidden` for rounded images on a preserve-3d card flattens the pop-out; round the image itself instead.
- `perspective` on a shared parent gives every card the same vanishing point, so edge cards look skewed; use `perspective()` inside each card's transform.
- Device orientation: prompting on load gets denied permanently; landscape mode swaps axes (check `screen.orientation.angle`); insecure origins receive no events.
- Glare highlights driven by pointer position repaint a gradient every frame; keep them to T2+ and small cards.
