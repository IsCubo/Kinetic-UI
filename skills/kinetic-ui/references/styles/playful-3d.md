# Playful 3D

> Keywords: playful 3D, claymorphism, clay UI, soft 3D, puffy, inflated, bouncy, spring animation, squash and stretch, stickers, toys, 3D illustration, 3D icons, Rive, Lottie, character animation, mascot, celebration, fun UI, 3D juguetón
> Summary: How to build the playful 3D style (claymorphism-style soft 3D, sparing bouncy springs, stickers and toys, 3D illustrations or Rive characters) on brand tokens with static fallbacks per tier.

## When to use

| Fits | Avoid |
| --- | --- |
| Consumer apps, kids and education, games, onboarding, fintech for young audiences, community and creator tools, launch pages, empty states and celebrations | Legal, medical, grief, luxury, enterprise data tools |
| Emotions: joyful, friendly, approachable, delightful, energetic | Emotions: serious, exclusive, austere |

In product UI, keep the play in moments (onboarding, success, empty states) and the everyday UI calm.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Soft candy fills from the brand (`--brand-primary`, `--brand-accent` mixed toward white); deeper tones of the same hues for clay shading; light `--brand-surface`; text in `--brand-on-surface`. |
| Typography | Rounded, chunky display; friendly, plain body. Open-source examples: Fredoka, Baloo 2, Lilita One (display); Nunito (body). Verify each font license before shipping. |
| Shapes | Big radii, pills, squircles, puffy inflated cards, thick soft edges; stickers with a white outline and a slight rotation. |
| Clay surface | Inner highlight top-left, inner shade bottom-right, soft outer drop shadow; matte, no gloss. |
| Lighting | One light direction (top-left) shared by CSS shadows, 3D illustrations, and icons. Mixed light directions break the illusion. |
| Iconography | Pre-rendered 3D icons or chunky filled icons in the same palette. |
| Motion personality | Bouncy but purposeful: `--kui-ease-spring` for moments of delight (pop, success, sticker drop, toggle thumb); `--kui-ease-enter` everywhere else. Squash and stretch on press; characters react to state. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Squash press, spring pop, toggle thumbs | Core feedback | `references/effects/microinteractions.md` |
| Draggable stickers and toys, Lottie or Rive characters | Delight and mascots | `references/effects/motion-2d.md` |
| Real-time 3D toy or scene | Hero only, T3 | `references/effects/webgl-3d.md` |
| Floating layers, tilt cards | Soft depth | `references/effects/depth-layers.md` |
| Pointer-reactive eyes, tilt, magnetic toys | Fine pointer only, T2+ | `references/effects/cursor-pointer.md` |
| Confetti and celebratory bursts | Success moments, short and finite | `references/effects/ambient-backgrounds.md` |
| Bouncy headline letters | Section headers, once | `references/effects/text-effects.md` |

Apply the tokens to `references/components/buttons.md`, `references/components/selection-controls.md`, `references/components/feedback.md`, and `references/components/cards.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Clay fills are brand colors mixed toward white; shading uses deeper mixes of the same hue, so every surface stays on-brand.
2. Keep `--brand-font-body`. Use a rounded display face only if the brand allows it; otherwise round the shapes, not the type.
3. If the brand has a mascot, use it as the Rive or 3D character before inventing one; keep its proportions and colors.
4. Render 3D illustrations and icons in the brand palette and the shared light direction.
5. A restrained brand uses clay on a few hero elements and one spring moment per flow.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--playful-` prefix.

```css
.playful-theme {
  --playful-clay: color-mix(in oklch, var(--brand-primary) 30%, white);
  --playful-light: color-mix(in oklch, white 70%, transparent);
  --playful-shade: color-mix(in oklch, var(--brand-primary) 35%, transparent);
  --playful-depth: color-mix(in oklch, var(--brand-primary) 25%, transparent);
  --playful-radius: max(var(--brand-radius), 1.5rem);
  background: var(--brand-surface);
  color: var(--brand-on-surface);
  font-family: var(--brand-font-body);
}

.playful-clay {
  background: var(--playful-clay);
  border-radius: var(--playful-radius);
  box-shadow:
    inset 6px 6px 12px var(--playful-light),
    inset -8px -8px 16px var(--playful-shade),
    0 18px 30px -12px var(--playful-depth);
}

/* Squash on press: the scale tokens collapse to 1 under reduced motion and T0. */
.playful-btn { transform-origin: 50% 100%; }
.playful-btn:active { transform: scale(calc(2 - var(--kui-scale-press)), var(--kui-scale-press)); }

/* Stickers: bake the white outline into the asset (SVG stroke or PNG border); CSS adds only a static shadow. */
.playful-sticker {
  rotate: -4deg;
  filter: drop-shadow(0 6px 8px var(--playful-depth));
}

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .playful-btn {
    transition: transform var(--kui-duration-sm) var(--kui-ease-standard);
  }
  /* Spring pop: only for moments of delight (a new badge, a sticker drop, success). */
  :root:not([data-motion-tier="0"]) .playful-pop {
    animation: playful-pop var(--kui-duration-lg) var(--kui-ease-spring) both;
  }
}
@keyframes playful-pop { from { opacity: 0; transform: scale(0.6); } }

/* T0: the pop is an instant appearance or a short fade. */
@media (prefers-reduced-motion: reduce) {
  .playful-pop { animation: playful-fade var(--kui-duration-sm) var(--kui-ease-standard) both; }
}
@keyframes playful-fade { from { opacity: 0; } }
```

The pop scales from 0.6 so the spring overshoot is visible; `--kui-ease-spring` falls back to the standard curve where `linear()` is unsupported (handled in `assets/tokens/motion.css`). Use it on one element per moment, never on every hover.

3D illustrations and characters:
- Ship pre-rendered stills (AVIF or WebP with alpha, PNG fallback) in the HTML at every tier. They are the T0 and T1 experience.
- T2: Rive (state machines for idle, hover, press, success, error) or Lottie characters, loaded when they scroll into view, paused offscreen.
- T3: a real-time 3D toy (three.js, React Three Fiber, or a Spline export) for the hero only, loaded after LCP with a capped device pixel ratio.
- Library names only here; check `references/libraries.md` for versions, licenses, and caveats.

```js
const host = document.querySelector('[data-playful-character]');
const io = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  io.disconnect();
  const tier = Number(document.documentElement.dataset.motionTier ?? 1);
  if (tier < 2) return; // the still image stays
  const { mountCharacter } = await import('./character.js'); // the Rive runtime lives only in this chunk
  mountCharacter(host); // pause it offscreen and on kui:motiontierchange to 0
});
if (host) io.observe(host);
```

Other platforms: Rive and Lottie have native runtimes; build clay with layered inner and outer shadows; use a spring with moderate damping for pops. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Press squash: none; the press shows a color or shadow change.
- Spring pop: replaced by a fade of `--kui-duration-sm` or an instant appearance; no scale, no overshoot.
- Characters: show the still image, or the Rive/Lottie first frame of the matching state, without looping.
- Stickers and toys: static; drag actions have a button alternative.
- Confetti and celebrations: replaced by a static success illustration and a text message.
- 3D toy: the pre-rendered still; the canvas is never mounted.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Hero | Real-time 3D toy with pointer reaction | Rive or Lottie character over the still | Still 3D illustration with a CSS pop-in |
| Feedback | Squash and spring pop | Squash and spring pop | Squash and spring pop (CSS) |
| Stickers and toys | Draggable with physics | Draggable without physics | Static, rotated |
| Celebrations | GPU or canvas confetti, under 2 s | Canvas confetti with few pieces, under 2 s | A single CSS pop of a success badge |
| Tilt cards | Pointer tilt | Pointer tilt | None |

Cost notes: stacked `drop-shadow()` filters and large inner shadows repaint when animated; animate `transform` on the element and keep shadows static. Rive and 3D runtimes are lazy chunks; never bundle them into the main chunk.

## Accessibility

- Contrast (WCAG 1.4.3): pastel clay fills lower contrast. Keep text at 4.5:1 against the clay color, not against the page.
- Non-text contrast (WCAG 1.4.11): soft shadows alone do not mark control edges; keep a 3:1 boundary or fill difference.
- Flashing (WCAG 2.3.1): celebrations must not strobe; nothing flashes more than 3 times per second.
- Pause (WCAG 2.2.2): idle character loops longer than 5 s get a pause control, or stop after a few cycles.
- Characters that convey state (success, error) mirror it in text with `role="status"`; decorative ones are `aria-hidden="true"`.
- Dragging (WCAG 2.5.7): every draggable toy or sticker has a single-pointer or keyboard alternative.

## Pitfalls

- Spring on everything: the interface feels unstable. One spring moment per interaction.
- Mixed light directions across illustrations, icons, and CSS shadows.
- Shipping only the 3D or Rive layer with no still image underneath.
- Clay shading so strong that labels lose contrast.
- Long celebration animations that block the next action.
