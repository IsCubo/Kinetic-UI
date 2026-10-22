# Editorial

> Keywords: editorial design, magazine layout, long-form, article, typography, typographic hierarchy, serif, display type, drop cap, pull quote, grid, full-bleed image, scroll storytelling, scrollytelling, reading progress, restrained motion, diseño editorial, revista
> Summary: How to build an editorial, magazine-style layout (typographic hierarchy, large display type, asymmetric grids, scroll storytelling) on brand tokens with restrained, reading-safe motion.

## When to use

| Fits | Avoid |
| --- | --- |
| Long-form stories, publications, journalism, case studies, annual reports, cultural institutions, brand storytelling, essays in portfolios | Task-heavy product UI, dashboards, checkout flows, short transactional pages |
| Emotions: thoughtful, credible, cultured, authoritative, intimate | Emotions: hyper, playful-chaotic, futuristic |

Content leads; layout and motion serve the reading.

## Visual language

| Element | Rule |
| --- | --- |
| Palette roles | Paper (`--brand-surface`) and ink (`--brand-on-surface`); one accent (`--brand-accent`) for links, rules, and pull quotes; photography and illustration carry most of the color. Take the paper tone from the brand instead of defaulting to cream. |
| Typography | Display serif with strong contrast, or a characterful grotesque, for headlines; a text serif or humanist sans for body. Large scale steps between levels (ratio 1.333 to 1.618), optical sizing on, body measure 60–75 characters, serif body line-height around 1.6. Open-source examples: Fraunces, Playfair Display, Instrument Serif (display); Source Serif 4, Literata, Newsreader (text). Verify each font license before shipping. |
| Layout | Asymmetric grid with named lines, wide margins, full-bleed images that break the grid, pull quotes in the margin, captions and bylines as a quiet secondary voice. |
| Shapes | Hairline rules only where they separate content. No cards. |
| Texture | Photography and illustration; no decorative noise or glow. |
| Iconography | Minimal; prefer words. |
| Motion personality | Restrained: one orchestrated moment per view (headline or hero image), then stillness while the reader reads. Scroll storytelling only where the narrative needs it. |

## Signature effects

| Effect | Role in this style | File |
| --- | --- | --- |
| Sticky scrollytelling, reading progress, section reveals | Narrative steps and orientation | `references/effects/scroll-driven.md` |
| Line-by-line headline reveal | The single opening moment | `references/effects/text-effects.md` |
| Subtle hero image drift | One full-bleed image, low strength | `references/effects/parallax.md` |
| Shared-image transition from index to article | Continuity between list and story | `references/effects/page-transitions.md` |
| Link underline and hover states | Quiet feedback in running text | `references/effects/microinteractions.md` |

Apply the tokens to `references/components/hero-sections.md`, `references/components/navigation.md`, and `references/components/lists-collections.md`.

## Brand adaptation

Run `references/brand/brand-intake.md` first. Without a brand, take a proposal from `references/brand/emotion-to-style.md` and label it a proposal.

1. Brand fonts first: `--brand-font-display` for headlines, `--brand-font-body` for text. A sans-only brand sets headlines in its heaviest or widest cut; add a text serif only with brand approval.
2. Paper is `--brand-surface` and ink is `--brand-on-surface`; the accent marks links and pull quotes only.
3. Keep the brand voice in the editorial structure: headline, deck (standfirst), byline, captions.
4. A colorful brand puts its color into section openers and full-bleed blocks, not into running text.
5. Respect logo clear space in the masthead; never set the logo in the display face.

## Implementation

Load `assets/tokens/motion.css` and run `assets/snippets/motion-tier.js` first. Style-specific variables use the `--editorial-` prefix.

```css
.editorial {
  --editorial-measure: 66ch;
  --editorial-h1: clamp(2.75rem, 1.75rem + 4vw, 6rem);
  --editorial-h2: clamp(1.75rem, 1.35rem + 1.6vw, 3rem);
  background: var(--brand-surface);
  color: var(--brand-on-surface);
  font: 400 1.125rem/1.6 var(--brand-font-body);
}
.editorial :is(h1, h2) {
  font-family: var(--brand-font-display);
  font-optical-sizing: auto;
  line-height: 1.05;
  text-wrap: balance;
}
.editorial h1 { font-size: var(--editorial-h1); }
.editorial h2 { font-size: var(--editorial-h2); }
.editorial p { max-width: var(--editorial-measure); text-wrap: pretty; }

/* Grid with named lines: text sits in "content", images can go "full". */
.editorial-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] minmax(0, var(--editorial-measure))
    [content-end] minmax(1rem, 1fr) [full-end];
}
.editorial-grid > * { grid-column: content; }
.editorial-grid > .editorial-bleed { grid-column: full; }

/* Drop cap: float fallback, initial-letter where supported. */
.editorial-dropcap::first-letter {
  float: left;
  font: 700 3.4em/0.85 var(--brand-font-display);
  margin-inline-end: 0.08em;
  color: var(--brand-accent);
}
@supports (initial-letter: 3) or (-webkit-initial-letter: 3) {
  .editorial-dropcap::first-letter {
    float: none;
    font-size: inherit;
    line-height: inherit;
    -webkit-initial-letter: 3;
    initial-letter: 3;
  }
}

/* Reading progress: a progress indicator, so it stays at every tier. */
.editorial-progress {
  position: fixed;
  inset: 0 0 auto;
  height: 3px;
  background: var(--brand-accent);
  transform-origin: 0 50%;
  transform: scaleX(0);
}
@supports (animation-timeline: scroll()) {
  .editorial-progress { animation: editorial-progress auto linear both; animation-timeline: scroll(root); }
}
@keyframes editorial-progress { to { transform: scaleX(1); } }

/* The one orchestrated moment: the headline rises once. */
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .editorial-reveal {
    animation: editorial-rise var(--kui-duration-xl) var(--kui-ease-enter) both;
  }
}
@keyframes editorial-rise { from { opacity: 0; transform: translateY(var(--kui-distance-md)); } }
```

Where `animation-timeline` is unsupported, hide `.editorial-progress` or drive it with a passive scroll listener at T2.

Scrollytelling: a sticky figure beside scrolling steps. Steps are plain text blocks; the figure changes state. Markup: `.editorial-story` holds the figure, then one wrapper with every `.editorial-story__step` (each with `data-step`).

```css
.editorial-story { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 26rem); gap: 4rem; }
.editorial-story__figure { position: sticky; top: 10vh; height: 80vh; }
@media (max-width: 48rem) {
  .editorial-story { grid-template-columns: 1fr; }
  .editorial-story__figure { top: 0; height: 45vh; }
  .editorial-story__step { position: relative; background: var(--brand-surface); padding: 1rem; }
}
```

```js
const figure = document.querySelector('.editorial-story__figure');
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) figure.dataset.step = entry.target.dataset.step;
  }
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('.editorial-story__step').forEach((step) => io.observe(step));
```

Style each `[data-step]` state of the figure with an opacity crossfade (`--kui-duration-lg`, `--kui-ease-standard`). Use `--kui-distance-*` for any movement so T0 removes it.

Other platforms: the same hierarchy applies; use the platform's dynamic type scale so headlines grow with user settings. See `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

- Headline reveal: none; the headline is visible at first paint.
- Scrollytelling: the figure swaps states with an opacity fade of 200ms or less; no zoom, pan, or travel.
- Hero image drift: none; the image is static.
- Reading progress bar: stays (it is a progress indicator).
- Index-to-article transition: crossfade of 200ms or less, or an instant swap.
- Link hover: color change only.

## Low-end fallback

| Feature | T3 | T2 | T1 |
| --- | --- | --- | --- |
| Opening moment | Headline line reveal plus hero image drift | Headline line reveal | Headline rise (CSS) |
| Scrollytelling | Figure with animated charts or video states | Figure with crossfaded states | Figure with crossfaded image states (CSS, toggled by the observer) |
| Hero image | Low-strength parallax | Low-strength parallax | CSS scroll-driven drift (`--kui-parallax-strength` is 0.4 at T1), or static |
| Route change | View Transitions with a shared image | Same | Crossfade |

T3 adds nothing heavy by default; spend the budget on fast image loading instead.

## Accessibility

- Contrast (WCAG 1.4.3): body text at 4.5:1 or more; captions and bylines too, even when quieter. Text over full-bleed images needs a scrim or a solid panel.
- Reading order (WCAG 1.3.2, 2.4.3): grid placement must not reorder content away from the DOM order; pull quotes repeat text, so mark decorative duplicates `aria-hidden="true"`.
- Resize text (WCAG 1.4.4): fluid sizes mix `rem` with `vw` so zoom still scales them; never size text in `vw` alone.
- Headings form a real outline (`h1` to `h3`), not sizes chosen by look.
- Flashing (WCAG 2.3.1): no flashing in charts or video states; nothing flashes more than 3 times per second.
- Scrollytelling: every step's information is in text, not only in the figure.

## Pitfalls

- Animating every section: it breaks the reading rhythm. One moment per view.
- Scroll hijacking or snap-scrolling long text.
- Measures over 80 characters, or body text in the display face.
- Delaying the headline or hero image that is the LCP element; measure LCP before and after the reveal.
- The cream paper, serif, and rust accent default: use the brand palette.
- Sticky figures that cover text or focused links on small screens.
