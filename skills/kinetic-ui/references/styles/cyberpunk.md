# Cyberpunk

> Keywords: cyberpunk, neon, glow, dark UI, glitch, chromatic aberration, RGB split, scanlines, CRT, HUD, terminal UI, sci-fi interface, angular panels, clip-path, cut corners, 3D cyberpunk, neon city, bloom, wireframe, estilo cyberpunk, neón
> Summary: How to build the cyberpunk style (neon on dark, glitch, scanlines, HUD panels, 3D neon scenes) on brand tokens while keeping flashes under 3 per second and contrast honest.

## When to use

| Fits | Avoid |
| --- | --- |
| Games, esports, streaming, music and nightlife, product launches, security and developer tools with an edgy voice, sci-fi storytelling | Healthcare, public services, finance onboarding, long-form reading, audiences sensitive to flashing |
| Emotions: rebellious, electric, nocturnal, high-tech, urgent | Emotions: calm, warm, trustworthy, gentle |

Use it as a full theme on brand pages, or as an accent layer (one HUD panel, one glitch headline) inside product UI. Cap product dashboards at T1.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Night surface (very dark, tinted with the brand hue); main neon (`--brand-accent`); secondary neon (`--brand-primary`); dim line color for edges; near-white text tinted with the brand. Neon goes on edges, highlights, and display type, never on paragraphs. |
| Typography | Display: squared, wide, or condensed techno sans. HUD and data: a monospace. Body: a plain, highly legible sans. Open-source examples: Orbitron, Chakra Petch, Oxanium (display); JetBrains Mono, IBM Plex Mono (mono). Verify each font license before shipping. |
| Shapes | Panels with cut corners, 1px lines, corner brackets, diagonal hazard stripes, grid or hex backdrops. Radius 0 unless the brand radius is a core identity trait. |
| Texture | Scanlines, faint grid, noise, vignette. Static by default. |
| Iconography | Thin-stroke line icons with square caps; status lights as small dots that always carry a text label. |
| Motion personality | Digital and fast: `steps()` timing, `--kui-duration-xs`/`--kui-duration-sm`, decoded text, sharp wipes. Glitch is punctuation, not wallpaper. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Glitch, RGB split, scramble/decode, typewriter | Headlines and HUD readouts, on hover/focus or once on load | `references/effects/text-effects.md` |
| Neon hover, press, and toggle feedback | Borders and labels brighten | `references/effects/microinteractions.md` |
| Crosshair cursor, pointer spotlight, HUD tilt | Fine pointer only, T2+ | `references/effects/cursor-pointer.md` |
| Grid, scanline, noise, and particle backdrops | Behind the hero, static at T0 | `references/effects/ambient-backgrounds.md` |
| Layered HUD depth, perspective panels | Panels float on Z layers | `references/effects/depth-layers.md` |
| Scroll-linked readouts and wipes | Counters, progress bars, section reveals | `references/effects/scroll-driven.md` |
| Slice-wipe route changes | Short crossfade with a glitch slice | `references/effects/page-transitions.md` |
| 3D neon city, wireframe terrain, bloom | Hero scene, T3 only | `references/effects/webgl-3d.md` |

For buttons, inputs, and overlays in this style, apply the tokens below to `references/components/buttons.md`, `references/components/inputs-forms.md`, and `references/components/overlays.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Map the brand's most saturated color to `--brand-accent` (main neon) and its second color to `--brand-primary`. With a one-color brand, use a lighter tint of the same hue as the second neon; never swap in stock magenta and cyan.
2. Derive the night surface from the brand primary mixed with black (`--cyber-night`) so the dark carries the brand hue.
3. If the brand surface is light, do not reuse `--brand-on-surface` on the night surface; use `--cyber-text`.
4. Muted brands (pastel, earthy) keep their hue: push chroma only in the glow layer and keep glyph colors on-brand.
5. Keep `--brand-font-body` for body text. Use a techno display face only when the brand has no display face or allows a campaign face.
6. If rounded corners are a brand trait, keep `--brand-radius` on controls and use cut corners only on decorative panels.
7. Terminal-style microcopy only where the brand voice allows; action labels stay plain ("Save", "Buy ticket").

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--cyber-` prefix.

```css
.cyber-theme {
  --cyber-night: color-mix(in oklch, var(--brand-primary) 10%, black);
  --cyber-raised: color-mix(in oklch, var(--brand-primary) 18%, black);
  --cyber-text: color-mix(in oklch, var(--brand-primary) 6%, white);
  --cyber-neon-core: color-mix(in oklch, var(--brand-accent) 65%, white);
  --cyber-glow: color-mix(in oklch, var(--brand-accent) 55%, transparent);
  --cyber-line: color-mix(in oklch, var(--brand-accent) 45%, transparent);
  --cyber-scanline: rgb(0 0 0 / 0.22);
  --cyber-cut: 14px;
  background: var(--cyber-night);
  color: var(--cyber-text);
  font-family: var(--brand-font-body);
}

/* Neon type: contrast is carried by the glyph color, never by the glow. */
.cyber-neon {
  font-family: var(--brand-font-display);
  color: var(--cyber-neon-core);
  text-shadow: 0 0 0.04em var(--cyber-neon-core), 0 0 0.35em var(--cyber-glow), 0 0 0.9em var(--cyber-glow);
}

/* Cut-corner panel: clip the pseudo-elements, not the element, so focus rings and content are never clipped. */
.cyber-panel { position: relative; isolation: isolate; padding: 1.25rem 1.5rem; }
.cyber-panel::before,
.cyber-panel::after {
  content: "";
  position: absolute;
  z-index: -1;
  clip-path: polygon(var(--cyber-cut) 0, 100% 0, 100% calc(100% - var(--cyber-cut)), calc(100% - var(--cyber-cut)) 100%, 0 100%, 0 var(--cyber-cut));
}
.cyber-panel::before { inset: 0; background: var(--cyber-line); }
.cyber-panel::after { inset: 1px; background: var(--cyber-raised); }

/* Scanlines: a decorative layer element (aria-hidden), static at every tier. */
.cyber-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(to bottom, transparent 0 2px, var(--cyber-scanline) 2px 3px);
}

/* Glitch: <h1 class="cyber-glitch" data-text="Night shift">Night shift</h1>
   `/ ""` gives the duplicates an empty alt text so screen readers do not read the title three times. */
.cyber-glitch { position: relative; }
.cyber-glitch::before,
.cyber-glitch::after {
  content: attr(data-text) / "";
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}
.cyber-glitch::before { color: var(--brand-primary); }
.cyber-glitch::after { color: var(--brand-accent); }

@media (prefers-reduced-motion: no-preference) {
  /* One burst of 3 steps per trigger, never looped. */
  :root:not([data-motion-tier="0"]) .cyber-glitch:is(:hover, :focus-visible)::before {
    animation: cyber-glitch var(--kui-duration-md) steps(1, end) 1;
  }
  :root:not([data-motion-tier="0"]) .cyber-glitch:is(:hover, :focus-visible)::after {
    animation: cyber-glitch var(--kui-duration-md) steps(1, end) 1 reverse;
  }
  /* Neon flicker: one shallow dip per cycle, finite so it ends before 5 s. */
  :root:not([data-motion-tier="0"]) .cyber-flicker {
    animation: cyber-flicker 2.4s var(--kui-ease-linear) 2;
  }
}

@keyframes cyber-glitch {
  0%   { opacity: 1; transform: translateX(-2px); clip-path: inset(12% 0 58% 0); }
  33%  { opacity: 1; transform: translateX(3px);  clip-path: inset(56% 0 18% 0); }
  66%  { opacity: 1; transform: translateX(-1px); clip-path: inset(32% 0 44% 0); }
  100% { opacity: 0; transform: none; }
}
@keyframes cyber-flicker {
  0%, 88%, 92%, 100% { opacity: 1; }
  90% { opacity: 0.72; }
}
```

### 3D cyberpunk scene (T3)

Ship a poster image in the HTML, put the HTML headline over it, and mount the canvas on top only at T3:

```js
import { applyMotionTier } from './motion-tier.js';

const { tier } = applyMotionTier();
const mount = document.querySelector('[data-cyber-scene]');
if (tier >= 3 && mount) {
  addEventListener('load', async () => {
    const { startScene } = await import('./cyber-scene.js'); // three.js lives only in this lazy chunk
    startScene(mount); // stop on kui:motiontierchange to 0, when offscreen, and when the tab is hidden
  }, { once: true });
}
```

Scene recipe (details in `references/effects/webgl-3d.md`): dark fog and clear color matching `--cyber-night`; emissive materials in the brand neons; bloom only on emissive parts; instanced meshes for buildings or terrain; one slow camera drift plus capped pointer parallax; static, subtle chromatic aberration. Keep all text in HTML, never inside the scene.

Other platforms: build glow on a separate blurred layer and gate glitch on the system reduce-motion setting. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Glitch: none. The clean headline shows; the RGB-split layers stay hidden.
- Neon flicker: none. The glow is steady.
- Scanlines, grid, noise: static. No sweep band, no drifting grid.
- Decoded, scrambled, or typed text: render the final text immediately.
- HUD feedback: hover and focus change color and glow with fades of `--kui-duration-sm` or less; no tilt, no travel.
- 3D scene: show the poster. Never mount the canvas; if it is mounted when the preference changes, render one static frame and stop the loop.
- Route changes: instant swap or a crossfade of 200ms or less; no slice wipe.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Hero | WebGL neon scene with bloom | Muted loop video or Lottie over the poster, with a pause button | Poster with static scanlines and a CSS fade-in |
| Glitch | Hover/focus bursts plus one load burst | Same as T3 | Hover/focus bursts only (CSS) |
| Text decode | JS scramble | JS scramble | Final text with a fade |
| Grid backdrop | 3D grid inside the scene | CSS perspective grid, finite loop or pause button | Static grid |
| HUD tilt | Pointer tilt | Pointer tilt | None |
| Glow | Layered `text-shadow` | Layered `text-shadow` | One shadow layer on display text only |

Glow cost: large stacked shadows repaint whenever they animate. To pulse a glow, animate the `opacity` of a pre-blurred pseudo-element, never the shadow values. `clip-path` keyframes in the glitch repaint the pseudo-elements; keep glitched text small.

## Accessibility

- Contrast honesty: measure the glyph color (`--cyber-neon-core`, `--cyber-text`) against `--cyber-night`. Glow adds no contrast and blurs edges, so use no glow on text under 24px and never put neon text on a neon fill.
- Flashing (WCAG 2.3.1): no more than 3 flashes in any 1-second window. Count every visible on/off flip of a glitch slice or flicker dip as a flash. Bursts run once per trigger; keep glitched areas small, and avoid saturated red flashing.
- Pause (WCAG 2.2.2): loops longer than 5 s (video, grid drift, 3D scene) need a visible pause control.
- `forced-colors: active` strips text and box shadows: keep 1px borders, hide decorative layers, and never encode state only in glow.
- `prefers-contrast: more`: remove scanlines and glow, and raise `--cyber-line` to a solid color.
- Decorative canvases and scanline layers get `aria-hidden="true"`; status lights carry text labels.
- Avoid long all-caps monospace strings; keep HUD text at 14px or larger.

## Pitfalls

- Stock magenta/cyan replacing the brand hue.
- Glitch on every element, or a glitch loop that never stops.
- `clip-path` on a focusable element: it clips the focus ring. Clip a pseudo-element instead.
- Scanlines over body text, which lowers contrast across the whole paragraph.
- Bundling three.js into the main chunk, or blocking first paint on the scene.
- Neon on light surfaces: glow disappears and contrast fails; this style needs the night surface.
