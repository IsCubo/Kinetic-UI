# Retro-futurism

> Keywords: retro-futurism, retrofuturism, synthwave, outrun, vaporwave, Y2K, chrome, chrome text, liquid metal, iridescent, sunset gradient, perspective grid, neon grid floor, pixel font, pixel art, VHS, film grain, noise, CRT, 80s, 90s, retro futurista
> Summary: How to build retro-futurism (synthwave, Y2K, chrome, gradients, perspective grids, pixel or chrome type, subtle VHS noise) on brand tokens with legible text and safe looping motion.

## When to use

| Fits | Avoid |
| --- | --- |
| Music, games, events and festivals, nostalgia campaigns, creative studios, launches with a playful retro angle, merch drops | Serious B2B, healthcare, legal, long-form reading, flows where heavy texture hurts legibility |
| Emotions: nostalgic, optimistic, dreamy, bold, fun | Emotions: sober, minimal, trustworthy-conservative |

Pick one primary flavor and at most one secondary:

| Flavor | Signature |
| --- | --- |
| Synthwave / outrun | Sunset gradient, sun with horizontal stripes, neon grid floor, chrome logo, night palette |
| Y2K | Chrome and liquid metal, bubbly translucent plastic, iridescent sheens, sparkles, light silver or pastel base |
| Pixel / 8-bit | Pixel type, hard pixel edges, limited palette, stepped sprite animation |
| VHS / analog | Grain, tracking lines, slight color fringe, timecode overlay |

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Gradient ramps from `--brand-primary` to `--brand-accent` (sky, sun, chrome tint); a dark base for synthwave, a light silver or pastel base for Y2K; grid lines in the accent. Text sits on solid or darkened areas, never on the brightest gradient band. |
| Typography | Chrome display: wide extended or italic sans; script for small accents; pixel type for pixel and VHS flavors; body in a plain sans. Open-source examples: Monoton, Audiowide, Michroma (display); VT323, Silkscreen, Press Start 2P (pixel). Verify each font license before shipping. |
| Shapes | Horizon line, striped sun, perspective grid, pill and bubble shapes (Y2K), pixel-stepped edges (pixel). |
| Texture | Grain and scanlines at very low opacity (4–8%), static by default. |
| Iconography | Pixel icons, chrome bevel icons, or star sparkles, matching the flavor. |
| Motion personality | Nostalgic and smooth: endless-drive grid, slow sun shimmer, stepped sprites (`steps()`), occasional tracking-line sweep. All loops are slow, pausable, and low contrast. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Gradient skies, grid floor, grain | The backdrop of the flavor | `references/effects/ambient-backgrounds.md` |
| Chrome text, glitch, typewriter | Logos and headlines | `references/effects/text-effects.md` |
| 3D synthwave terrain and sun | Hero scene, T3 only | `references/effects/webgl-3d.md` |
| Layered mountains and skyline | Depth while scrolling | `references/effects/parallax.md` |
| Pixel sprites, stepped animation | Pixel flavor characters and icons | `references/effects/motion-2d.md` |
| VHS-style wipe between routes | Route changes | `references/effects/page-transitions.md` |
| Chrome press and sheen hover | Buttons and toggles | `references/effects/microinteractions.md` |

Apply the tokens to `references/components/hero-sections.md`, `references/components/buttons.md`, and `references/components/cards.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Build every gradient from `--brand-primary` and `--brand-accent`; avoid the stock pink-to-purple sunset unless those are the brand colors.
2. Chrome is neutral grey tinted with `--brand-primary`, so it belongs to the brand.
3. Never apply chrome, pixelation, or noise to the brand logo unless the brand allows a campaign variant.
4. Pixel or chrome type goes on headlines and accents; body text stays in `--brand-font-body`.
5. A minimal brand can use one retro element (a chrome headline or a grid floor) instead of the full flavor.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--retro-` prefix.

```css
.retro-theme {
  --retro-sky: linear-gradient(to bottom, color-mix(in oklch, var(--brand-primary) 35%, black), var(--brand-primary) 60%, var(--brand-accent));
  --retro-grid-line: color-mix(in oklch, var(--brand-accent) 70%, transparent);
  --retro-grid-size: 48px;
  --retro-chrome: linear-gradient(to bottom, #fff 0%, color-mix(in oklch, var(--brand-primary) 20%, #c8cad4) 48%, color-mix(in oklch, var(--brand-primary) 35%, #2a2c36) 52%, #f2f3f8 100%);
  --retro-noise-opacity: 0.06;
}

/* Synthwave horizon with a perspective grid floor. Tune perspective and angle per layout. */
.retro-horizon { position: relative; overflow: hidden; min-height: 70vh; background: var(--retro-sky); }
.retro-floor {
  position: absolute;
  inset: 60% -50% 0;
  overflow: hidden; /* keeps the extra row of the drive layer below the horizon */
  transform: perspective(320px) rotateX(65deg);
  transform-origin: 50% 0;
}
.retro-floor::before {
  content: "";
  position: absolute;
  inset: calc(-1 * var(--retro-grid-size)) 0 0;
  background:
    repeating-linear-gradient(to right, var(--retro-grid-line) 0 1px, transparent 1px var(--retro-grid-size)),
    repeating-linear-gradient(to bottom, var(--retro-grid-line) 0 1px, transparent 1px var(--retro-grid-size));
}
/* Endless drive: move exactly one cell, then repeat. Infinite, so it needs a pause control. */
@media (prefers-reduced-motion: no-preference) {
  :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .retro-floor::before {
    animation: retro-drive 1.2s var(--kui-ease-linear) infinite;
  }
  .retro-horizon[data-paused] .retro-floor::before { animation-play-state: paused; }
}
@keyframes retro-drive { to { transform: translateY(var(--retro-grid-size)); } }

/* Chrome text: a solid color first, gradient fill where background-clip: text works. */
.retro-chrome { font-family: var(--brand-font-display); color: var(--brand-on-surface); }
@supports (background-clip: text) or (-webkit-background-clip: text) {
  .retro-chrome {
    background: var(--retro-chrome);
    -webkit-background-clip: text;
    background-clip: text; /* after the shorthand, which resets it */
    color: transparent;
  }
}
@media (forced-colors: active) {
  .retro-chrome { background: none; color: CanvasText; }
}

/* Static grain: one fixed, aria-hidden layer. No blend mode (it would re-composite the viewport on scroll). */
.retro-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: var(--retro-noise-opacity);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
}

/* Pixel flavor: keep sprites crisp and use pixel fonts at whole multiples of their design size. */
.retro-pixel { image-rendering: pixelated; }
```

Y2K chrome and iridescence: use the same `--retro-chrome` ramp on buttons and badges, add a soft inset highlight, and keep translucent "plastic" panels on solid fallbacks (see `references/styles/glassmorphism.md` for the translucency rules).

VHS tracking line: one horizontal band that sweeps down once on load (transform only, `--kui-duration-xl`), never looping and never flashing.

3D synthwave (T3): a low-poly wireframe terrain, a striped emissive sun, fog matching the sky, and a slow forward drift; ship the CSS horizon as the poster. Details in `references/effects/webgl-3d.md`.

Other platforms: gradients and static grain textures port directly; use a pre-rendered grain image instead of runtime noise. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Grid floor: static; no drive.
- Sun shimmer, iridescent sheen, chrome sweep: none; the gradients are static.
- Grain and scanlines: static.
- VHS tracking line and glitch: none.
- Pixel sprites: show a single resting frame.
- 3D terrain: the CSS horizon poster; the canvas is never mounted.
- Route changes: crossfade of 200ms or less, or an instant swap.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Hero | WebGL terrain and sun | CSS horizon with grid drive and pause control | CSS horizon, static grid |
| Grain | Static layer | Static layer | Static layer, or removed on Save-Data |
| Sprites | Stepped animation | Stepped animation | Stepped animation on interaction only |
| Parallax skyline | Multi-layer | Fewer layers | CSS scroll-driven at `--kui-parallax-strength` 0.4 |
| Chrome text | Gradient with a slow sheen | Gradient with a slow sheen | Static gradient |

Cost notes: the perspective floor is a large GPU layer; at T1 keep it static. Never animate `background-position` on large areas; move a pseudo-element with `transform` instead.

## Accessibility

- Contrast (WCAG 1.4.3): measure text against the brightest and darkest band of the gradient behind it. Chrome text has dark and light bands, so measure every band against the backdrop and keep chrome for large display text (3:1 for large text).
- Flashing (WCAG 2.3.1): grain stays static or low contrast; tracking lines and glitches never exceed 3 flashes per second; avoid saturated red flashes.
- Pause (WCAG 2.2.2): the grid drive, sheen loops, and sprite loops longer than 5 s need a visible pause control.
- `forced-colors: active`: chrome text falls back to `CanvasText`; decorative layers hide.
- Readability: pixel and script fonts are for short strings; never for body text, labels, or form fields.
- Grain, grid, and noise layers are `aria-hidden="true"` and `pointer-events: none`.

## Pitfalls

- Mixing all four flavors at once.
- Heavy VHS noise or chromatic fringe over text: subtle means below 8% opacity.
- Chrome text with `color: transparent` and no fallback: invisible where `background-clip: text` is unsupported.
- `mix-blend-mode` on a full-screen grain layer: expensive on every scroll frame.
- An infinite grid drive with no pause control.
