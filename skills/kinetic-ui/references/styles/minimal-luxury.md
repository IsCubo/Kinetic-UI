# Minimal luxury

> Keywords: minimal luxury, luxury, premium, high-end, quiet luxury, elegant, refined, whitespace, negative space, slow motion, precise motion, subtle reveal, image reveal, premium imagery, fashion, jewelry, hospitality, lujo, minimalista, elegante
> Summary: How to build minimal luxury (whitespace, refined type, slow and precise motion, subtle reveals, premium imagery) on brand tokens without hurting LCP, contrast, or reduced motion.

## When to use

| Fits | Avoid |
| --- | --- |
| Fashion, jewelry, watches, hospitality, real estate, premium automotive, cosmetics, architecture studios, fine dining, private banking | Discount retail, urgent promotions, dense catalogs with filters, kids' products |
| Emotions: exclusive, calm confidence, refined, timeless, sensual | Emotions: loud, playful, frantic, rebellious |

Luxury is expressed through what is left out. Every element on screen must earn its place.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Near-monochrome from `--brand-surface` and `--brand-on-surface`; `--brand-muted` for secondary text; `--brand-accent` at tiny scale only (a hairline, one link state). Imagery carries color. Metallic or gold only when it comes from the brand assets, never as a stock gradient. |
| Typography | Refined display serif with strong stroke contrast, set light or regular at large sizes, or a wide geometric sans. Body at 16–18px with generous line-height. Letter-spacing only on the wordmark and very short navigation labels. Open-source examples: Cormorant, Bodoni Moda, Gilda Display (display); Jost, Hanken Grotesk (sans). Verify each font license before shipping. |
| Layout | Whitespace as a material: large, consistent spacing steps; few elements per screen; asymmetric placement; one large image per view with a quiet caption. |
| Shapes | Sharp corners or the brand radius; decorative 1px hairlines at low contrast. |
| Texture | Photography and material close-ups only; no noise, glow, or gradients. |
| Iconography | Thin line icons, used sparingly; prefer words. |
| Motion personality | Slow, precise, deliberate. Long decelerating curves (`--kui-ease-enter`), the longer durations (`--kui-duration-lg`, `--kui-duration-xl`), small distances (`--kui-distance-sm`, `--kui-distance-md`), generous stagger. No spring, no bounce, nothing fast or looping. One thing moves at a time. |

Slowness comes from long deceleration tails and stagger, not from durations above `--kui-duration-xl`.

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Image unveil and line reveals tied to scroll | The main storytelling device | `references/effects/scroll-driven.md` |
| Masked line-by-line headline reveal | The opening moment | `references/effects/text-effects.md` |
| Slow crossfade, shared product image | Route changes and gallery to detail | `references/effects/page-transitions.md` |
| Image drift inside its frame | Very low strength, hero only | `references/effects/parallax.md` |
| Underline draw, hover image swap | Quiet feedback | `references/effects/microinteractions.md` |
| Minimal custom cursor | Optional, fine pointer only, never hides the system cursor's function | `references/effects/cursor-pointer.md` |

Apply the tokens to `references/components/hero-sections.md`, `references/components/carousels-galleries.md`, and `references/components/navigation.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Luxury brands usually have strict guidelines: follow logo clear space, exact colors, and approved photography crops before any style choice.
2. Brand display face for headlines, brand body face for text. If the brand face is heavy, set it lighter and larger instead of swapping it.
3. If the brand guidelines define motion (durations, curves), they override these defaults; map them onto the `--kui-*` tokens.
4. A non-luxury brand can borrow this style as "quiet premium": keep its palette, reduce elements per screen, and slow the motion.
5. The accent stays tiny. A saturated brand primary goes into one image-free block per page at most.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--luxury-` prefix.

```css
.luxury-theme {
  --luxury-gutter: clamp(1.5rem, 6vw, 8rem);
  --luxury-section: clamp(6rem, 18vh, 14rem);
  --luxury-line: color-mix(in oklch, var(--brand-on-surface) 18%, transparent);
  background: var(--brand-surface);
  color: var(--brand-on-surface);
  font: 400 1rem/1.75 var(--brand-font-body);
}
.luxury-theme :is(h1, h2) {
  font: 300 clamp(2.5rem, 1.25rem + 4.5vw, 5.5rem)/1.05 var(--brand-font-display);
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.luxury-section { padding: var(--luxury-section) var(--luxury-gutter); }
.luxury-rule { border: 0; border-top: 1px solid var(--luxury-line); }

/* Image unveil tied to scroll. Unsupported browsers show the image as-is. */
.luxury-reveal { overflow: hidden; }
.luxury-reveal img { display: block; width: 100%; height: auto; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) :is(.luxury-reveal, .luxury-reveal img) {
      animation-duration: auto;
      animation-timing-function: var(--kui-ease-enter);
      animation-fill-mode: both;
      animation-timeline: view();
      animation-range: entry 10% cover 40%;
    }
    :root:not([data-motion-tier="0"]) .luxury-reveal img { animation-name: luxury-settle; }
    /* The clip-path unveil repaints, so it starts at T2. */
    :root:is([data-motion-tier="2"], [data-motion-tier="3"]) .luxury-reveal { animation-name: luxury-unveil; }
  }
}
@keyframes luxury-unveil { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
@keyframes luxury-settle { from { transform: scale(var(--kui-scale-pop)); } }

/* Navigation and standalone links: the underline draws slowly. */
.luxury-nav-link {
  text-decoration: none;
  background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 0% 1px;
}
.luxury-nav-link:is(:hover, :focus-visible) { background-size: 100% 1px; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .luxury-nav-link {
    transition: background-size var(--kui-duration-lg) var(--kui-ease-enter); /* repaints a 1px strip: cheap */
  }
}

/* Inline links in running text keep a visible underline at rest (WCAG 1.4.1). */
.luxury-theme p a { text-decoration: underline 1px; text-underline-offset: 0.25em; }
```

The `clip-path` unveil repaints the image every frame of the reveal; run one at a time. For many images in a grid, use the transform-only `luxury-settle` and skip the unveil.

Premium imagery:
- Art-direct with `<picture>` and `<source media>`; serve AVIF or WebP with a fallback.
- Give every image `width` and `height` (no layout shift); lazy-load below the fold; set `fetchpriority="high"` on the hero image.
- Never start the hero (LCP) image hidden or delayed. If it animates, it settles from `--kui-scale-pop` while fully visible.
- Use consistent light, crop, and color grading across the page; one mediocre image breaks the effect.

Other platforms: use long decelerating curves and the platform's reduce-motion setting. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Image unveil and settle: none; images are fully visible at their final size.
- Headline line reveal: none; the headline is visible at first paint.
- Image drift: none.
- Route and gallery transitions: crossfade of 200ms or less, no shared-element travel.
- Underline draw: the underline appears instantly on hover and focus.
- Custom cursor: removed; the system cursor is used.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Image reveals | Scroll-linked unveil plus settle | Scroll-linked unveil plus settle | Settle only (transform), or static where `animation-timeline` is unsupported |
| Headline | Masked line reveal (JS split) | Masked line reveal (JS split) | Single fade-and-rise with `--kui-distance-sm` (CSS) |
| Hero image | Low-strength drift | Low-strength drift | Static |
| Transitions | Shared-element View Transitions | Crossfade | Crossfade |
| Hero video | Muted loop with poster and pause control | Poster, video on tap | Poster image |

Luxury rarely needs T3. Spend the budget on image quality and fast loading, not on WebGL.

## Accessibility

- Contrast (WCAG 1.4.3): light weights and muted grey text fail easily. Keep body and caption text at 4.5:1; use light display weights only at large sizes (3:1 for large text).
- Links (WCAG 1.4.1): inline links keep an underline; color alone is not enough.
- Focus (WCAG 2.4.7): visible focus ring in `--brand-on-surface` or the accent; minimal styling never removes it.
- Flashing (WCAG 2.3.1): no flashing in video or transitions; nothing flashes more than 3 times per second.
- Pause (WCAG 2.2.2): background or hero video that plays longer than 5 s needs a pause control.
- Readability: small, widely tracked text is hard to read; keep tracked labels to a few words.
- Images that carry meaning have alt text; decorative ones use `alt=""`.

## Pitfalls

- Slow motion on functional UI: menus, filters, and forms still use `--kui-duration-sm` to `--kui-duration-md`.
- Fading in the LCP hero image or headline: it delays the paint LCP measures.
- Too much whitespace on mobile: scale spacing with `clamp()` so content still starts above the fold.
- Stock gold gradients and generic marble textures.
- Tracked all-caps on every label: reserve it for the wordmark and short navigation.
