# Organic soft

> Keywords: organic, organic design, soft UI, blobs, blob shapes, pebble shapes, natural palette, earthy colors, calm motion, gentle spring, settle easing, rounded, hand-drawn, paper texture, tinted soft shadows, wavy divider, wellness, orgánico, suave
> Summary: How to build the organic soft style (soft shapes, blobs, natural palettes, gentle springs, calm motion) on brand tokens with pausable ambient motion and readable contrast.

## When to use

| Fits | Avoid |
| --- | --- |
| Wellness, mental health, meditation, food and farming, sustainability, skincare, parenting, nonprofits, community apps, eco hospitality | High-performance tech, trading, esports, urgent alerts, dense data tools |
| Emotions: calm, warm, nurturing, natural, safe, human | Emotions: aggressive, technical, cold, urgent |

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Natural tones derived from the brand: lower-chroma versions of `--brand-primary` and `--brand-accent` for fills and blobs; a soft `--brand-surface`; text in `--brand-on-surface` (not pure black). Take hues from the brand instead of defaulting to sage, sand, and terracotta. |
| Typography | Humanist sans, rounded sans, or a soft serif with gentle terminals; relaxed line-height. Open-source examples: Fraunces, Literata (soft serif); Nunito, Figtree (humanist or rounded sans). Verify each font license before shipping. |
| Shapes | Blobs and pebbles (irregular eight-value `border-radius` or SVG paths), wavy section dividers, large radii on containers. Controls keep `--brand-radius` so they still read as controls. |
| Texture | Fine paper grain at 3–4% opacity, hand-drawn strokes, botanical or human illustration. |
| Shadows | Soft, layered, low opacity, tinted with the brand hue instead of neutral grey. |
| Iconography | Rounded strokes, slightly hand-drawn, consistent stroke width. |
| Motion personality | Calm: slow ambient drift (12 s or longer, small amplitude), gentle settle with about 2% overshoot (`--organic-ease-settle`), soft fades. No snaps, no fast loops, no large bounces. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Drifting blobs, soft gradient mesh, paper grain | The calm backdrop | `references/effects/ambient-backgrounds.md` |
| Gentle hover lift, soft press, toggles | Feedback that settles softly | `references/effects/microinteractions.md` |
| SVG blob and path morphs, hand-drawn line draws | Illustrations and dividers | `references/effects/motion-2d.md` |
| Soft section reveals | Content fades in as it enters | `references/effects/scroll-driven.md` |
| Layered leaves or hills | Low-strength depth while scrolling | `references/effects/parallax.md` |
| Stacked soft layers | Cards resting on soft shadows | `references/effects/depth-layers.md` |

Apply the tokens to `references/components/cards.md`, `references/components/buttons.md`, and `references/components/feedback.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Soften, do not replace: mix brand colors toward the surface for fills, and keep the full-strength brand color for primary actions.
2. Tint shadows with `--brand-primary` so depth carries the brand hue.
3. Keep `--brand-font-body`. A geometric or sharp brand face pairs with organic shapes; do not swap it for a rounded font without approval.
4. A sharp-cornered brand keeps sharp controls and moves the softness into blobs, dividers, and illustrations.
5. A saturated brand keeps saturation in small accents; large blobs use the softened mix.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--organic-` prefix.

```css
.organic-theme {
  --organic-fill: color-mix(in oklch, var(--brand-primary) 22%, var(--brand-surface));
  --organic-blob: color-mix(in oklch, var(--brand-accent) 30%, var(--brand-surface));
  --organic-shadow:
    0 1px 2px color-mix(in oklch, var(--brand-primary) 12%, transparent),
    0 14px 36px -10px color-mix(in oklch, var(--brand-primary) 22%, transparent);
  --organic-ease-settle: cubic-bezier(0.34, 1.25, 0.64, 1); /* about 2% overshoot; transforms only */
  --organic-radius-lg: max(var(--brand-radius), 1.5rem);
  background: var(--brand-surface);
  color: var(--brand-on-surface);
  font: 400 1.0625rem/1.7 var(--brand-font-body);
}

.organic-card {
  background: var(--organic-fill);
  border-radius: var(--organic-radius-lg);
  box-shadow: var(--organic-shadow);
}

/* Decorative blob: aria-hidden, behind content. */
.organic-blob {
  position: absolute;
  z-index: -1;
  width: clamp(12rem, 40vw, 28rem);
  aspect-ratio: 1;
  border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%;
  background: var(--organic-blob);
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  /* Gentle lift that settles. */
  :root:not([data-motion-tier="0"]) .organic-card {
    transition: transform var(--kui-duration-lg) var(--organic-ease-settle);
  }
  :root:not([data-motion-tier="0"]) .organic-card:hover {
    transform: translateY(calc(-1 * var(--kui-distance-sm)));
  }
  /* Ambient drift with transforms only (cheap), never border-radius morphing (repaints). */
  :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .organic-blob {
    animation: organic-drift 18s var(--kui-ease-standard) infinite alternate;
  }
  .organic-scene[data-paused] .organic-blob { animation-play-state: paused; }
}
@keyframes organic-drift {
  to { transform: translate(var(--kui-distance-lg), calc(-0.5 * var(--kui-distance-lg))) rotate(6deg) scale(1.05); }
}
```

The drift is infinite, so pair it with a pause control on `.organic-scene` (toggling `data-paused`) or the product's "Reduce motion" setting.

Wavy dividers: use an inline SVG path with `preserveAspectRatio="none"`, filled with the next section's color, `aria-hidden="true"`. Animate the path only at T2+, and only on scroll entry, once.

Blob morphs: morph SVG paths only between shapes with the same number of points, at T2+, slowly (several seconds), and pause them offscreen. See `references/effects/motion-2d.md`.

Paper grain: a small tiled, pre-rendered noise image at 3–4% opacity on the page background; static at every tier.

Other platforms: build blobs as custom shapes or paths, tint shadows with the brand hue, and use a gentle spring with high damping for the settle. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Blob drift and morph: none; blobs rest in place.
- Hover lift: none; hover and focus change the fill or shadow tint with a fade of `--kui-duration-sm` or less.
- Section reveals: content is visible immediately, or fades in at 200ms or less with no travel.
- Line draws and wavy divider motion: shown in their final state.
- Layered parallax: none; layers scroll together.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Backdrop | Drifting blobs, optional soft WebGL gradient | Drifting blobs (CSS) with pause control | Static blobs |
| Blob morph | SVG path morph | SVG path morph | Static shape |
| Hover | Settle lift | Settle lift | Settle lift (CSS) |
| Reveals | Choreographed fade and rise with stagger | Fade and rise with stagger | CSS scroll-driven fade where supported, else static |
| Parallax | Multi-layer | Two layers | CSS scroll-driven at `--kui-parallax-strength` 0.4, or none |

Cost notes: large blurred blobs (`filter: blur()`) are expensive; prefer soft gradients inside the shape. Animating `border-radius` repaints every frame; drift with `transform` instead.

## Accessibility

- Contrast (WCAG 1.4.3): softened palettes drift toward low contrast. Keep body text at 4.5:1 against the fills it sits on, including blob overlaps.
- Non-text contrast (WCAG 1.4.11): soft cards still need control boundaries at 3:1; low-contrast shadows alone do not count.
- Pause (WCAG 2.2.2): any ambient drift or morph longer than 5 s has a pause control.
- Flashing (WCAG 2.3.1): no pulsing brightness; nothing flashes more than 3 times per second.
- Focus (WCAG 2.4.7): a solid, visible focus ring; soft styling never replaces it with a faint glow.
- Decorative blobs, dividers, and grain are `aria-hidden="true"`.

## Pitfalls

- Neutral grey shadows: they flatten the warmth. Tint them.
- Blobs behind text that drop contrast in some frames of the drift.
- Bouncy springs: they make the style playful instead of calm; use `--organic-ease-settle`, not `--kui-ease-spring`.
- Every container as a blob: controls lose affordance.
- Ambient loops with no pause control, or running while offscreen.
