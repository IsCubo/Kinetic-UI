# Devices and responsive design

> Keywords: responsive design, adaptive layout, device classes, smartwatch, phone, foldable, tablet, desktop, ultrawide, TV, 10-foot UI, in-car, automotive, XR, spatial, visionOS, breakpoints, container queries, media queries, hover, pointer, any-pointer, input mode, touch targets, target size, WCAG 2.5.8, safe area, notch, env safe-area-inset, dvh, svh, lvh, viewport units, high refresh rate, 120Hz, orientation, spatial navigation, D-pad, focus navigation, hover to press, device orientation, gyroscope tilt, diseño responsivo, dispositivos
> Summary: How layout, input, and motion adapt across device classes from watch to XR, with content-first breakpoints, container queries, input-mode queries, touch targets, safe areas, viewport units, refresh rates, orientation, TV focus, and per-device effect changes.

Design for capabilities, not device names. Viewport size, input mode, and user preferences are separate signals: a small screen is not a slow device, and a large screen is not a mouse. Motion tiers come only from `references/foundations/performance-tiers.md` and `assets/snippets/motion-tier.js`; never derive them from the device class.

## Device classes

| Class | Context | Layout | Input | Motion |
| --- | --- | --- | --- | --- |
| Watch | Glances lasting seconds; tiny round or square screen | One column, one primary action per screen; inset content from curved edges | Touch, rotary crown or bezel, side buttons, voice | Feedback only, at `--kui-duration-xs` to `--kui-duration-sm`; nothing decorative; battery comes first |
| Phone | Roughly 360 to 430 CSS px wide in portrait; one hand, on the move | Single column; primary actions in the thumb zone at the bottom; bottom sheets | Touch (coarse, no hover), virtual keyboard, gestures | Baseline tokens; press instead of hover; minimal parallax |
| Foldable | A phone when folded, a small tablet when open; posture can change mid-task | Reflow on fold and unfold without losing state; list-detail when open; keep content off the hinge | Touch | Never replay entrance animations on resize; reflow instantly |
| Tablet | Roughly 700 to 1400 CSS px; portrait and landscape; couch and desk | Two panes (list-detail), navigation rail, multi-column grids | Touch plus optional keyboard, trackpad (hover appears), and stylus | Sheets and side panels may step up one duration token |
| Laptop and desktop | Focused sessions with a precise pointer | Multiple columns, persistent navigation, line length capped at ~65 to 75 characters | Mouse or trackpad (fine, hover), keyboard shortcuts, sometimes touch | Snappy hover and menus; cursor and magnetic effects from T2 |
| Ultrawide | 21:9 and wider; most of the width sits in peripheral vision | Cap content width; use extra width for side panels, never for wider text | Same as desktop | Bound travel by component size, never by viewport width; no motion at the far edges |
| TV (10-foot) | Viewed from about 3 m, lean-back, shared screen | Large type and spacing; rows of tiles; keep content inside ~5% safe margins | D-pad remote (arrows, OK, back), voice; usually no pointer or hover | Focus motion is the core interaction; keep it fast enough for key repeat; TV chips are often weak, so cap with `applyMotionTier({ maxTier: 2 })` |
| In-car | The driver's attention belongs to the road; glances under ~2 s | Few large targets, shallow hierarchy, high contrast, day and night themes. Native car platforms use templates; follow their rules first | Touch, rotary knob, steering-wheel controls, voice | Essential feedback only; no decorative, looping, or video motion while driving; cap with `applyMotionTier({ maxTier: 1 })` |
| Spatial / XR | Headsets; panels float in 3D space | Panels within a comfortable field of view; text with strong contrast over passthrough; depth as hierarchy; generous targets (visionOS guidance is about 60 pt) | Eyes and pinch, hands, controllers, voice. The system draws gaze hover; pages never receive the gaze position | Never move the viewpoint or the world without user input; no head-locked moving content; prefer fades and short depth moves; hold a steady frame rate (`references/effects/webgl-3d.md`) |

Never detect a device class from the user agent. iPadOS Safari requests desktop sites by default, and desktop browsers run on touch screens.

## Content-first breakpoints and container queries

- Start with the smallest layout. Add a breakpoint where the content breaks (lines too long, cards too cramped), not at a device width.
- Write media query breakpoints in `rem` so they follow the user's font size. Interpolate between breakpoints with `clamp()`.
- Use media queries for the page layout and container queries for components, which then adapt to whatever slot they land in.
- Mix `rem` into fluid type (`clamp(2rem, 1.2rem + 3vw, 3.5rem)`); `vw` alone ignores text zoom (WCAG 1.4.4).

```css
.page { display: grid; gap: 1rem; }
@media (width >= 48rem) { .page { grid-template-columns: 16rem 1fr; } }

.card-list { container-type: inline-size; }
.card { display: grid; gap: 0.75rem; }
@container (inline-size >= 30rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
```

Starting points only (heuristic), to be moved to wherever the content breaks: 30rem, 48rem, 64rem, 80rem.

## Input modes

| Query | Matches | Use it to |
| --- | --- | --- |
| `(hover: hover) and (pointer: fine)` | The primary input is a mouse or trackpad | Enable hover reveals, cursor effects, magnetic buttons |
| `(hover: none) and (pointer: coarse)` | The primary input is touch | Use press states, show hover-revealed actions permanently, enlarge targets |
| `(any-pointer: coarse)` | At least one coarse input exists (touch laptop, tablet with trackpad) | Keep touch-sized targets even when the primary pointer is fine |
| `(any-hover: hover)` | Some input can hover | Allow hover as an enhancement; never hide content behind hover alone |
| `(pointer: none)` | No pointing device (keyboard-only, many TVs) | Rely on focus states and spatial navigation |

- `hover` and `pointer` describe the primary input; `any-hover` and `any-pointer` describe all inputs. Inputs change at runtime (a keyboard attaches to a tablet), so listen with `matchMedia(query).addEventListener('change', …)`.
- For gesture logic, read `event.pointerType` per pointer event. Never detect touch with `'ontouchstart' in window`.

## Touch targets

| Source | Minimum | Notes |
| --- | --- | --- |
| WCAG 2.5.8 Target Size (Minimum), AA | 24 × 24 CSS px | Smaller targets pass only with enough spacing (a 24 px circle centered on each does not overlap another target or circle), inline in text, or when essential |
| WCAG 2.5.5 Target Size (Enhanced), AAA | 44 × 44 CSS px | |
| Apple Human Interface Guidelines (iOS, iPadOS) | 44 × 44 pt | |
| Material Design (Android) | 48 × 48 dp | About 8 dp between targets |
| This skill | 24 px hard floor; 44 to 48 px when the pointer is coarse | Grow the hit area, not the visual size |

```css
.icon-button { position: relative; }
.icon-button::after { content: ""; position: absolute; inset: -10px; } /* 24px icon, 44px hit area */
@media (any-pointer: coarse) { .icon-button { min-inline-size: 44px; min-block-size: 44px; } }
```

## Safe areas

Let the page extend under notches, rounded corners, and system bars, then pad interactive content back inside:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.75rem max(1rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
}
```

- Insets are physical, so pair them with physical properties (`left`, `padding-right`), not logical ones.
- Use `max()` so the padding never drops below the design spacing on devices without insets.
- Keep focus rings, toasts, and floating buttons inside the safe area; backgrounds may bleed under it.

## Viewport units

| Unit | Equals | Use for |
| --- | --- | --- |
| `svh` | The viewport with browser toolbars shown (smallest) | A hero that must fit completely on first view |
| `lvh` | The viewport with toolbars hidden (largest) | Backgrounds that must never show a gap when toolbars retract |
| `dvh` | The current viewport; it changes as toolbars show and hide | Full-screen app shells, dialogs, and sheets sized to the visible area |
| `vh` | Defined by the browser; on mobile it usually equals `lvh` | A fallback before the newer units |

```css
.hero { min-height: 100vh; min-height: 100svh; }
.sheet { max-height: 100vh; max-height: 100dvh; }
```

Do not size long scrolling content with `dvh`: it relayouts while toolbars move. Measure scroll-linked effects against one stable unit.

## High refresh rates

- Displays run at 90, 120, 144 Hz and above; at 120 Hz a frame has 8.3 ms. Never assume 60 fps.
- Prefer CSS transitions, keyframes, and the Web Animations API: they adapt to any refresh rate.
- In JS loops, move by elapsed time from the `requestAnimationFrame` timestamp, never by a fixed step per frame, and never throttle with `setTimeout(16)`.
- Battery savers can lower the frame rate. `watchFrameRate()` measures fps directly, so sustained low rates still lower the tier.
- Higher refresh rates make stutter in low-fps content more visible: prefer fewer, smoother effects.

```js
let x = 0;
let last = performance.now();
const speed = 120; // px per second, identical at 60 Hz and 120 Hz

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // seconds; clamped after a hidden tab resumes
  last = now;
  x += speed * dt;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

## Orientation

- Never lock orientation unless it is essential (WCAG 1.3.4).
- Treat short landscape phones as their own case: `@media (orientation: landscape) and (height < 30rem)` collapses headers and moves to two columns.
- Prefer `aspect-ratio` and container queries for components over orientation queries.
- On rotation, keep scroll position, focus, and state. Do not replay entrance animations, and do not attach transitions to properties that change on rotation (width, grid columns): the reflow is instant.

## TV focus navigation

- Make every interactive element reachable with the arrow keys. Move focus spatially, to the nearest element in the pressed direction. Browsers ship no spatial navigation, so use the TV runtime's support or a small focus manager.
- Set initial focus on load. Never lose focus: restore it to the originating tile when returning from a detail view, and make the back key go up one level.
- Make focus obvious from 3 m: scale plus an outline. The outline keeps focus visible at T0, where `--kui-scale-pop` becomes 1.
- Keep the focused item inside the safe margins with `scroll-padding`; scroll smoothly only when motion is allowed.

```css
.row { overflow-x: auto; scroll-padding-inline: 5vw; }
.tile { transition: transform var(--kui-duration-sm) var(--kui-ease-standard); }
.tile:focus-visible {
  outline: 4px solid var(--brand-accent);
  outline-offset: 4px;
  transform: scale(var(--kui-scale-pop));
}
```

```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('focusin', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('.row')) return;
  event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
});
```

## Adapt effects per device

| Effect | Fine pointer with hover | Touch | TV (D-pad) | Reduced motion (T0) |
| --- | --- | --- | --- | --- |
| Card hover lift or tilt | Lift `--kui-distance-sm`; pointer tilt from T2 | Press feedback on `:active` with `--kui-scale-press`; no tilt | Focus scale plus outline | Shadow or color change only |
| Custom cursor, magnetic buttons | From T2 (`references/effects/cursor-pointer.md`) | Off: there is no cursor | Off | Off |
| Parallax | Full `--kui-parallax-strength` | Minimized (0.4); never on text | Off or very subtle | None |
| Device-orientation tilt | Not applicable | Opt-in through a button; iOS needs a permission request | Not applicable | Off |
| Scroll-driven reveals | Allowed | Allowed with shorter travel | Reveal on focus instead | Content visible, no travel |
| Hover-revealed actions | On hover and focus | Always visible or in an overflow menu | Visible on focus | Same, without motion |
| Swipe gestures | Buttons or keys alongside | Allowed with a button alternative (WCAG 2.5.1, 2.5.7) | Arrow keys | Instant change |

Hover becomes press on touch. Guard hover so tapped elements do not stay stuck in the hover state:

```css
.card { transition: transform var(--kui-duration-md) var(--kui-ease-standard); }
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(calc(-1 * var(--kui-distance-sm))); }
}
.card:active { transform: scale(var(--kui-scale-press)); transition-duration: var(--kui-duration-xs); }
```

Minimize parallax on touch-first devices: small screens magnify layer offsets, and handheld motion is more likely to cause discomfort. Load this after `assets/tokens/motion.css`; the plain `:root` keeps losing to the T0 and T1 values there:

```css
@media (prefers-reduced-motion: no-preference) and (pointer: coarse) {
  :root { --kui-parallax-strength: 0.4; }
}
```

Device-orientation tilt needs a secure context, an explicit button, and on iOS a permission prompt that only appears inside a user gesture:

```js
export async function enableTilt(onTilt) {
  const DOE = window.DeviceOrientationEvent;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!DOE || reduce || document.documentElement.dataset.motionTier === '0') return false;
  if (typeof DOE.requestPermission === 'function') { // iOS and iPadOS Safari
    try {
      if ((await DOE.requestPermission()) !== 'granted') return false;
    } catch {
      return false; // denied, or called outside a user gesture
    }
  }
  let pending = 0;
  window.addEventListener('deviceorientation', (e) => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      onTilt(e.beta ?? 0, e.gamma ?? 0); // degrees: beta front-back, gamma left-right
    });
  });
  return true;
}

document.querySelector('#enable-tilt')?.addEventListener('click', () => enableTilt((beta, gamma) => {
  const clamp = (v) => Math.max(-10, Math.min(10, v));
  document.querySelector('.tilt-card')?.style.setProperty('transform', `rotateX(${clamp(beta - 45)}deg) rotateY(${clamp(gamma)}deg)`);
}));
```

The `beta - 45` offset assumes a phone held at about 45°. Offer a control that turns the effect off again. Layer and depth details: `references/effects/parallax.md`, `references/effects/depth-layers.md`, `references/effects/microinteractions.md`.

## Native platforms

| Concern | Web | Flutter | SwiftUI | Jetpack Compose |
| --- | --- | --- | --- | --- |
| Layout by available space | Container queries | `LayoutBuilder`, `MediaQuery.sizeOf` | Size classes, `ViewThatFits` | Window size classes, `BoxWithConstraints` |
| Safe areas | `env(safe-area-inset-*)` | `SafeArea` | Respected by default; `.ignoresSafeArea()` to bleed | `WindowInsets.safeDrawing`, `Modifier.safeDrawingPadding()` |
| Hover and pointer | `hover` and `pointer` media queries | `MouseRegion` | `.onHover`, `.hoverEffect()` | `Modifier.hoverable` |

Platform details: `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`.

## Verification

1. Resize from 320 CSS px to ultrawide: no two-dimensional scrolling at 320 px (WCAG 1.4.10), and line length stays capped.
2. Emulate a coarse pointer: no content depends on hover, and targets meet the sizes above.
3. Rotate the device: state, scroll position, and focus survive, and no orientation lock applies.
4. Check a device with a notch and a home indicator: controls sit inside the safe area.
5. For TV builds, operate everything with arrow keys, OK, and back only.
6. Zoom text to 200%: layout reflows without clipping.
