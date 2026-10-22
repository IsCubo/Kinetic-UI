# Glassmorphism

> Keywords: glassmorphism, glass, frosted glass, backdrop-filter, blur, saturate, translucency, translucent panel, acrylic, vibrancy, material, glass UI, prefers-reduced-transparency, backdrop-filter fallback, vidrio esmerilado, cristal
> Summary: How to build frosted-glass surfaces on brand tokens with readable edges and text, solid fallbacks for reduced transparency or missing backdrop-filter, and blur budgets for low-end devices.

## When to use

| Fits | Avoid |
| --- | --- |
| Navigation bars, sheets, menus, and media controls over imagery; dashboards with a vivid backdrop; music, photo, weather, and travel apps; product heroes over brand gradients | Long-form reading, dense tables and forms, plain white or flat backgrounds (nothing to blur, so glass reads as grey), low-end-first markets with large blurred areas |
| Emotions: light, airy, modern, calm focus, premium tech | Emotions: raw, rugged, nostalgic, loud |

Glass is a layer, not a page. Use it for surfaces that float above rich content.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Backdrop: where brand color lives (brand gradient, blobs, photography). Glass tint: brand surface at partial alpha. Edge highlight: light line on the top and left. Edge shade: soft dark shadow below. Text: solid `--brand-on-surface`, never translucent. |
| Layers | At most three depths: backdrop, glass, floating glass (popover, toast). Each higher layer gets a more opaque tint. Never nest glass inside glass. |
| Typography | Clean neo-grotesque or humanist sans at regular to semibold weights; thin weights dissolve over busy backdrops. Open-source examples: Manrope, Plus Jakarta Sans, Figtree. Verify each font license before shipping. |
| Shapes | `--brand-radius` (often generous), pill controls, 1px borders. |
| Texture | Optional static noise on the glass to hide gradient banding. |
| Iconography | Filled or duotone icons with medium stroke so they survive the blur behind them. |
| Motion personality | Smooth and soft: panels fade and scale in from `--kui-scale-press`, light sheen on hover, backdrop drifts slowly. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Gradient blobs and mesh backdrops | The color the glass refracts; static at T0 | `references/effects/ambient-backgrounds.md` |
| Stacked depth planes | Backdrop, glass, and floating layers | `references/effects/depth-layers.md` |
| Backdrop slower than glass | Subtle parallax between layers | `references/effects/parallax.md` |
| Pointer-tracked highlight | Specular spot follows the pointer, T2+ | `references/effects/cursor-pointer.md` |
| Hover sheen, press, toggle | Light feedback on glass controls | `references/effects/microinteractions.md` |
| Sheet and dialog morphs | Glass panels expand from their trigger | `references/effects/page-transitions.md` |

Apply the glass surface to `references/components/navigation.md`, `references/components/overlays.md`, and `references/components/cards.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Put brand color in the backdrop: blobs or gradients built from `--brand-primary` and `--brand-accent`.
2. Tint the glass with `--brand-surface`, not with the saturated primary. A primary-tinted text surface gives unpredictable contrast over a moving backdrop.
3. Dark brands get dark glass (dark surface at higher alpha, faint highlight); light brands get light glass.
4. Keep `--brand-radius`. A sharp-cornered brand keeps sharp glass.
5. Flat or minimal brands: use quiet glass only on overlays and the navigation bar, and keep the rest solid.
6. Keep brand fonts; raise the body weight one step if the brand face is light.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--glass-` prefix. Build solid first, then add glass where it is supported, wanted, and affordable.

```css
.glass-theme {
  --glass-blur: 10px; /* safe default before the tier is known */
  --glass-saturate: 160%;
  --glass-tint: color-mix(in oklch, var(--brand-surface) 68%, transparent);
  --glass-solid: color-mix(in oklch, var(--brand-surface) 94%, var(--brand-primary));
  --glass-edge: color-mix(in oklch, white 45%, transparent);
  --glass-shade: color-mix(in oklch, black 20%, transparent);
}

/* 1. Solid by default: correct everywhere, including browsers without backdrop-filter. */
.glass-panel {
  background: var(--glass-solid);
  color: var(--brand-on-surface);
  border: 1px solid var(--glass-edge);
  border-radius: var(--brand-radius);
  box-shadow: inset 0 1px 0 var(--glass-edge), 0 12px 32px -12px var(--glass-shade);
}

/* 2. Glass where supported. Older Safari needs the -webkit- property. */
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass-panel {
    background: var(--glass-tint);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  }
  :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .glass-panel { --glass-blur: 18px; }
  /* Large surfaces (sheets, full-screen overlays) stay solid below T2. */
  :root:not([data-motion-tier="2"], [data-motion-tier="3"]) .glass-panel--large {
    background: var(--glass-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

/* 3. The user asked for less transparency or more contrast: solid again. */
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass-panel {
    background: var(--glass-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
@media (forced-colors: active) {
  .glass-panel { background: Canvas; color: CanvasText; border-color: CanvasText; }
}

/* Entrance: fade plus a small scale; the scale token collapses to 1 under reduced motion. */
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .glass-panel[data-state="open"] {
    animation: glass-in var(--kui-duration-md) var(--kui-ease-enter);
  }
}
@keyframes glass-in { from { opacity: 0; transform: scale(var(--kui-scale-press)); } }
```

Tint rule: choose the tint alpha so text passes contrast over both the lightest and the darkest part of the backdrop. Start near 65–75% for panels with body text; go down to 35–45% only for panels holding large text or icons.

Other platforms (details in the platform files):
- Flutter: `BackdropFilter` with `ImageFilter.blur`, wrapped in `ClipRRect` so only the panel area is blurred. See `references/platforms/flutter.md`.
- SwiftUI: prefer system materials (`.ultraThinMaterial` and siblings); they adapt to the Reduce Transparency setting. See `references/platforms/swiftui.md`.
- Jetpack Compose: `Modifier.blur` blurs the element's own content, not what is behind it. For a true backdrop blur, pick a library from `references/libraries.md` or use a translucent solid surface. See `references/platforms/jetpack-compose.md`.

## Reduced motion

Glass itself is static, so it stays at T0. Exact T0 behavior:

- Panel entrance and exit: opacity fade of `--kui-duration-sm` or less, no scale.
- Backdrop blobs and gradients: frozen in their resting position.
- Pointer-tracked highlight and hover sheen: removed; hover and focus change the border or tint instantly.
- Parallax between backdrop and glass: none; layers scroll together.
- Sheet and dialog morphs: crossfade of 200ms or less.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Blur radius | 18px | 18px | 10px on small surfaces only |
| Large glass (sheets, overlays) | Glass | Glass | Solid `--glass-solid` |
| Backdrop | WebGL or animated gradient blobs | CSS blob drift with a pause control | Static gradient |
| Pointer highlight | Yes | Yes | No |
| Sticky glass header over scrolling content | Glass | Glass, height kept small | Solid or near-solid tint |

Cost model: `backdrop-filter` samples and blurs everything behind the element whenever that content changes. A glass header over scrolling content, video, or an animated backdrop re-blurs on every frame, and cost grows with blurred area and radius. Never animate the blur radius. Profile with CPU throttling before shipping glass over moving content.

## Accessibility

- Contrast (WCAG 1.4.3): text on glass keeps 4.5:1 (3:1 for large text) against the tint composited over the busiest backdrop frame. Blur alone does not guarantee contrast.
- Edges (WCAG 1.4.11): interactive glass controls need a boundary with 3:1 against the surroundings. A 45% white edge may not reach it over light backdrops; raise the border opacity or darken it until it does.
- `prefers-reduced-transparency`: support is limited (Chromium), so the solid default and the `@supports` gate must carry users everywhere else.
- `forced-colors: active`: fall back to system colors with visible borders.
- Flashing (WCAG 2.3.1): backdrops must not pulse brightness; nothing flashes more than 3 times per second.
- Focus: focus rings sit outside the glass or use a solid color, never a translucent one.

## Pitfalls

- Glass over a flat background: it just looks grey. Give it something to refract.
- Ancestors with `opacity` below 1, `filter`, `mask`, `clip-path`, or their own `backdrop-filter` can limit what a child blur samples; keep glass out of such containers.
- Semi-transparent text or icons on glass: contrast drops in every frame.
- Full-screen blur on low-end phones: scrolling stutters.
- Forgetting the solid fallback: unsupported browsers show text over a raw, unblurred backdrop.
