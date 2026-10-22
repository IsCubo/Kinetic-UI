# Accessibility of motion

> Keywords: prefers-reduced-motion, reduced motion, vestibular, motion sickness, WCAG, flashing, seizure, pause stop hide, autoplay, prefers-reduced-transparency, prefers-contrast, forced colors, focus visible, keyboard
> Summary: How to implement reduced motion everywhere, which WCAG criteria apply to animation and effects, and the accessibility checks every effect must pass.

## What reduced motion removes and keeps

| Remove (vestibular triggers) | Keep (safe feedback) |
| --- | --- |
| Parallax and scroll-linked transforms | Opacity and color fades ≤200ms |
| Large travel, zoom, spin, or flip | Focus indicators and selection states |
| Autoplaying video, 3D camera moves, moving backgrounds | Progress and loading indicators (prefer non-spinning) |
| Smooth-scroll hijacking and scroll snapping that moves the page | Instant layout changes |

Reduced motion means less vestibular motion, not a broken or unresponsive UI. Users must still get feedback that an action happened.

## Implementation

### CSS: motion as an enhancement

Write the static state first and add motion only when the user has no preference:

```css
.card { opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform var(--kui-duration-md) var(--kui-ease-enter); }
  .card:hover { transform: translateY(calc(-1 * var(--kui-distance-sm))); }
}
```

With `assets/tokens/motion.css`, distances and scales already collapse to neutral under reduced motion and T0, so token-based motion degrades automatically.

### JavaScript

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const shouldAnimate = () => !reduce.matches && document.documentElement.dataset.motionTier !== '0';
reduce.addEventListener('change', () => { /* stop or restart effects */ });
```

Library hooks:
- Motion: `useReducedMotion()` in React, or check the media query before calling `animate()`.
- GSAP: register animations inside `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` condition.
- three.js: render one static frame and stop the loop; skip camera intros.

### In-product toggle

Offer a "Reduce motion" setting that forces T0 (`data-motion-tier="0"`) and persists. The OS preference must still win when it is `reduce`.

## WCAG criteria for effects

| Criterion | Level | Rule for effects |
| --- | --- | --- |
| 2.3.1 Three Flashes or Below Threshold | A | Nothing flashes more than 3 times per second (glitch, strobe, neon flicker included) |
| 2.2.2 Pause, Stop, Hide | A | Motion that starts automatically, lasts more than 5 s, and runs alongside content needs a pause control |
| 2.3.3 Animation from Interactions | AAA | Motion triggered by interaction can be disabled; treat as mandatory in this skill |
| 1.4.3 / 1.4.11 Contrast | AA | Text over animated, glass, or gradient backgrounds keeps 4.5:1 (3:1 for large text and UI parts) in every frame |
| 2.4.7 Focus Visible / 2.4.11 Focus Not Obscured | AA | Effects never hide or clip the focus indicator; sticky or parallax layers do not cover focused elements |
| 2.5.1 Pointer Gestures / 2.5.7 Dragging Movements | A / AA | Tilt, drag, and gesture interactions have a single-pointer or button alternative |
| 2.1.1 Keyboard | A | Every interactive effect (magnetic buttons, cards, carousels) works with the keyboard |

## Other user preferences

- `prefers-reduced-transparency`: replace glass and blur with solid surfaces. Support is limited (Chromium), so also provide a solid fallback where `backdrop-filter` is unsupported.
- `prefers-contrast: more` and `forced-colors: active`: remove decorative gradients and glows; rely on system colors; keep borders visible.
- `prefers-color-scheme`: effects (glows, shadows, noise) need a tuned value per scheme.

## Checklist for every effect

1. Emulate reduced motion and confirm the T0 behavior described in the effect's `## Reduced motion` section.
2. Navigate with the keyboard only; focus is visible and never covered.
3. Check contrast of text over the effect at its busiest frame.
4. Confirm nothing flashes more than 3 times per second.
5. Confirm long or looping motion can be paused.
6. Test with a screen reader: decorative layers are `aria-hidden="true"`; canvases have a text alternative when they carry meaning.
