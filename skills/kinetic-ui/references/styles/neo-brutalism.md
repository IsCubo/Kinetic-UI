# Neo-brutalism

> Keywords: neo-brutalism, neubrutalism, brutalist web design, raw grid, thick borders, hard shadow, offset shadow, flat color, loud typography, bold type, color clash, stickers, marquee, ticker, snappy motion, press into shadow, neobrutalismo
> Summary: How to build neo-brutalism (raw grids, thick borders, hard offset shadows, loud type, deliberate clash, snappy motion) on brand tokens without breaking contrast, focus, or pause rules.

## When to use

| Fits | Avoid |
| --- | --- |
| Indie products, creative tools, startups with attitude, portfolios, zines, newsletters, event pages, consumer apps for young audiences | Luxury, healthcare, conservative finance, grief or crisis contexts, dense enterprise data (borders everywhere add noise) |
| Emotions: bold, honest, irreverent, energetic, confident | Emotions: serene, delicate, exclusive, soothing |

It works as a full theme. In product UI, keep it to the shell (cards, buttons, headers) and leave data views calm.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Ink (pure black or the brand's darkest color) for borders, shadows, and text; flat paper surface (`--brand-surface`); two or three flat, saturated blocks (`--brand-primary`, `--brand-accent`, one clash color). No gradients, no blur, no transparency. |
| Typography | Heavy grotesque or display sans at very large sizes with tight leading; optional monospace for metadata. Type is the main graphic. Open-source examples: Archivo (Black, ExtraBold), Space Grotesk, Bricolage Grotesque. Verify each font license before shipping. |
| Shapes | Rectangles; radius 0 or the brand radius; 3–4px borders; hard offset shadows with zero blur; visible grid lines; stickers rotated 2–6°. |
| Texture | Flat. Optional halftone dots or a checker pattern on one block. |
| Iconography | Thick-stroke icons or chunky glyphs; stickers and badges with ink outlines. |
| Clash | Deliberate: one block per view uses the clash color against the primary. Clash is a layout decision, not random color. |
| Motion personality | Snappy, never floaty: `--kui-duration-xs`/`--kui-duration-sm`, `--kui-ease-standard` or `steps()`, no overshoot, no long fades. Elements press into their shadow; sections cut, they do not glide. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Press into shadow, hard toggles | Buttons and cards move onto their offset shadow | `references/effects/microinteractions.md` |
| Marquee ticker, scramble, oversized type reveals | Headers and announcement bars | `references/effects/text-effects.md` |
| Sticker drag, hard snaps, stepped sprites | Playful 2D moments | `references/effects/motion-2d.md` |
| Sticky card stacks, hard section reveals | Scroll structure without easing drift | `references/effects/scroll-driven.md` |
| Hard cut or block wipe between routes | Route changes | `references/effects/page-transitions.md` |
| Sticker or block cursor | Optional, fine pointer only | `references/effects/cursor-pointer.md` |

Apply the tokens to `references/components/buttons.md`, `references/components/cards.md`, and `references/components/navigation.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Map `--brand-primary` and `--brand-accent` to the flat blocks. Soft or pastel brands keep their hue as a solid fill; do not replace it with stock yellow and pink.
2. Ink is the brand's darkest color, or black when the brand has none. Shadows and borders always use ink.
3. Choose the clash color with the brand: a third brand color, or a proposal labeled as such. Never more than one clash color.
4. A grotesque brand face stays; push it to heavier weights and larger sizes. A serif or script brand face goes to headlines only if it survives heavy weights; otherwise use it for the logo and pair a grotesque.
5. Rounded brands keep `--brand-radius` with thick borders; rounded brutalism still works.
6. Voice can get blunter in headlines only if the brand voice allows; action labels stay plain.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--brutal-` prefix. Almost all of this style is T1 CSS.

```css
.brutal-theme {
  --brutal-ink: color-mix(in oklch, var(--brand-on-surface) 85%, black);
  --brutal-border: 3px;
  --brutal-shadow: 6px;
  --brutal-clash: var(--brand-accent);
  background: var(--brand-surface);
  color: var(--brand-on-surface);
  font-family: var(--brand-font-body);
}

/* Raw grid: the gap shows the ink background as grid lines. */
.brutal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: var(--brutal-border);
  border: var(--brutal-border) solid var(--brutal-ink);
  background: var(--brutal-ink);
}
.brutal-grid > * { background: var(--brand-surface); padding: 1.5rem; }

.brutal-card,
.brutal-btn {
  border: var(--brutal-border) solid var(--brutal-ink);
  border-radius: var(--brand-radius);
  box-shadow: var(--brutal-shadow) var(--brutal-shadow) 0 0 var(--brutal-ink);
}
.brutal-btn {
  font: 800 1rem/1 var(--brand-font-display);
  padding: 0.9em 1.4em;
  background: var(--brand-primary);
  color: var(--brand-on-primary);
}
.brutal-btn:focus-visible {
  outline: 3px solid var(--brutal-ink);
  outline-offset: calc(var(--brutal-shadow) + 3px); /* clears the shadow so the ring stays distinct */
}
/* Pressed state at every tier: the shadow snaps away (an instant state change, no travel). */
.brutal-btn:active { box-shadow: 0 0 0 0 var(--brutal-ink); }

@media (prefers-reduced-motion: no-preference) {
  /* T1+: the button slides onto its shadow. box-shadow transitions repaint; fine on small controls only. */
  :root:not([data-motion-tier="0"]) .brutal-btn {
    transition: transform var(--kui-duration-xs) var(--kui-ease-standard), box-shadow var(--kui-duration-xs) var(--kui-ease-standard);
  }
  :root:not([data-motion-tier="0"]) .brutal-btn:active {
    transform: translate(var(--brutal-shadow), var(--brutal-shadow));
  }
}

.brutal-sticker { rotate: -4deg; border: var(--brutal-border) solid var(--brutal-ink); background: var(--brutal-clash); }
```

Marquee ticker: duplicate the content once inside the track and mark the copy `aria-hidden="true"`. It loops forever, so it needs a pause control (WCAG 2.2.2).

```css
.brutal-marquee { overflow: hidden; border-block: var(--brutal-border) solid var(--brutal-ink); }
.brutal-marquee__track { display: flex; width: max-content; gap: 2rem; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .brutal-marquee__track {
    animation: brutal-marquee 24s var(--kui-ease-linear) infinite;
  }
  .brutal-marquee:is(:hover, :focus-within) .brutal-marquee__track,
  .brutal-marquee[data-paused] .brutal-marquee__track { animation-play-state: paused; }
}
@keyframes brutal-marquee { to { transform: translateX(-50%); } }

/* T0: static, wrapped, no duplicate. */
@media (prefers-reduced-motion: reduce) {
  .brutal-marquee__track { flex-wrap: wrap; width: auto; }
  .brutal-marquee__track > [aria-hidden="true"] { display: none; }
}
:root[data-motion-tier="0"] .brutal-marquee__track { flex-wrap: wrap; width: auto; }
:root[data-motion-tier="0"] .brutal-marquee__track > [aria-hidden="true"] { display: none; }
```

Snappy reveals: if a section must animate in, use `steps(3, end)` or `--kui-duration-sm` with `--kui-ease-standard` and `--kui-distance-md`; never long fades or `--kui-ease-spring`.

Other platforms: flat fills, solid borders, and zero-blur offset shadows translate directly; build the press as an offset change. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Press: the shadow snaps to zero on `:active` with no translation; hover changes color instantly.
- Lift on hover: none.
- Marquee: static. Hide the duplicate copy and let the first copy wrap onto multiple lines so all text stays readable.
- Sticker drag and snaps: stickers stay in place; any drag action has a button alternative.
- Section reveals: content is visible immediately.
- Route changes: instant cut (already on-style).

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Buttons and cards | CSS press into shadow | CSS press into shadow | CSS press into shadow |
| Marquee | CSS loop with pause | CSS loop with pause | CSS loop with pause; static if Save-Data |
| Stickers | Draggable with JS physics | Draggable with JS, no physics | Static, rotated |
| Scroll structure | Sticky stacks with JS-choreographed snaps | Sticky stacks with scroll-driven CSS | Sticky stacks, no scroll-linked motion |
| Hero | Oversized type with stepped reveal | Same | Static oversized type |

The style is cheap by nature. Do not add WebGL or particle layers to raise the tier; they fight the flat, honest look.

## Accessibility

- Contrast (WCAG 1.4.3): every text and block pair passes 4.5:1 (3:1 for large text). Clash colors often fail with each other; never put text directly on a clash-on-clash boundary.
- Non-text contrast (WCAG 1.4.11): thick ink borders give controls strong boundaries; keep them on inputs too.
- Focus (WCAG 2.4.7): the focus ring must differ from the permanent border; offset it past the shadow or switch to a contrasting color.
- Flashing (WCAG 2.3.1): no blinking blocks or rapid color swaps; nothing flashes more than 3 times per second.
- Pause (WCAG 2.2.2): marquees and tickers pause on hover, on focus, and through a visible button.
- Readability: loud display type is for headlines; body text stays at a normal weight and size with a 60–75 character measure.
- Rotated stickers carry no essential text; if they do, repeat it in the flow.

## Pitfalls

- Soft blurred shadows: they turn the style into a generic card kit. Shadows have zero blur.
- Floaty motion (long fades, springs): it contradicts the raw personality.
- Everything clashing: with no calm area, nothing stands out.
- Grid lines that ignore content: the visible grid must follow real content groups.
- Marquee without a pause control, or a marquee carrying essential information.
