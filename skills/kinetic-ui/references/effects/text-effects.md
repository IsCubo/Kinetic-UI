# Text effects

> Keywords: text effects, kinetic typography, split text, line reveal, masked reveal, text mask, gradient text, chrome text, glitch text, RGB split, scramble text, decode text, typewriter, marquee ticker, variable font animation, staggered letters, kinetic type, tipografía cinética, efectos de texto
> Summary: How to reveal, scramble, gradient, glitch, and type headline text on brand fonts with finite timing, preserved selection and screen-reader access, and exact per-tier behavior.

Text effects treat type as the surface: it arrives, resolves, or shifts. They belong to display type held for a second or two, never to the words people must read, select, and copy all day.

## When to use

| Fits | Technique | Tier |
| --- | --- | --- |
| Brand hero or section opener, one per view | Masked block reveal, optional line stagger | T1 |
| HUD, terminal, or cyberpunk headline | Scramble, decode, or typewriter, once on first view | T2 |
| Retro-futurist logo lockup or short label | Static chrome gradient, glitch on hover only | T1 |
| Announcement bar with a short repeated message | Marquee with a pause control | T1 |
| Editorial opening line | Line-by-line mask reveal, at most three lines | T1 |

## When not to use

- Body copy, form labels, help text, errors, prices, and table data. Motion there delays reading and breaks scanning.
- Text the user must select, copy, or translate mid-animation; never animate a paragraph the user can drag-select.
- More than one text effect per view, or a different effect on every heading.
- The brand wordmark: use the supplied logo asset, never a re-set or animated version.
- Any per-character split of a sentence, and any effect that flashes more than 3 times per second (WCAG 2.3.1).
- Text that carries meaning only through the effect; it must read correctly at T0 and without JS.
- Content that changes live (counters, balances, timestamps): animate the first reveal only.

## How it works

| Technique | Mechanism | Animated properties | Cost |
| --- | --- | --- | --- |
| Block reveal | `clip-path` inset plus a short `translate` on the heading | `clip-path`, `opacity`, `transform` | One composited layer |
| Line stagger | Block-span lines, `clip-path` per line, delay `--kui-stagger` | Same, per line | One layer per line |
| Gradient or chrome | `background-clip: text` with `--brand-*` stops | Static paint | Repaint on resize |
| Glitch | Two `aria-hidden` ghosts over the real text, sliced by `clip-path` | `clip-path`, `transform`, `opacity` | Paint on a small area |
| Scramble | JS swaps glyphs in place until the final string lands | Text content | Main-thread string writes |
| Typewriter | `clip-path` from full inset to none, `steps()` | `clip-path` | One layer, no reflow |
| Marquee | One track translated by `translate3d`, content duplicated once | `transform` | One composited layer |
| Variable font | `font-variation-settings` interpolated by JS or CSS | Layout, paint | Expensive: display only |

Entrances use `--kui-ease-enter` with `--kui-duration-lg` to `--kui-duration-xl`; exits one step shorter. Glyph flicker is display-only and always finite:

| Effect | Cycles | Duration | Flashes per second |
| --- | --- | --- | --- |
| Glitch | 3 | `--kui-duration-lg` each | ~2.5 |
| Scramble | 1 pass | `--kui-duration-xl` | Glyph churn, no luminance flash |
| Typewriter | 1 pass | `calc(var(--kui-duration-xl) * 2)` | Caret only, ≤2 |
| Marquee | Continuous | `calc(var(--kui-duration-xl) * 33)` ≈ 20s per loop | None; pause required |

Derive long durations by multiplying a token instead of hard-coding seconds. A 20 s loop becomes `calc(var(--kui-duration-xl) * 33)`: one source of truth, and the value collapses with the tokens.

## Implementation

### Masked reveal and line stagger (T1)

```html
<h1 class="kui-reveal">Depth is a promise<br>the layout keeps</h1>
<h2 class="kui-reveal-lines">
  <span class="kui-reveal-lines__line" style="--textfx-i: 0">One idea,</span>
  <span class="kui-reveal-lines__line" style="--textfx-i: 1">held still.</span>
</h2>
```

```css
.kui-reveal, .kui-reveal-lines__line { display: block; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) :is(.kui-reveal[data-inview="true"],
    .kui-reveal-lines__line) { animation: kui-reveal var(--kui-duration-lg) var(--kui-ease-enter) both; }
  :root:not([data-motion-tier="0"]) .kui-reveal-lines__line {
    animation-delay: calc(min(var(--textfx-i, 0), 3) * var(--kui-stagger)); }   /* token stagger */
}
@keyframes kui-reveal {
  from { opacity: 0; clip-path: inset(0 0 100% 0); transform: translateY(var(--kui-distance-md)); }
}
```

The static state is the visible state: no JS, no `data-inview`, and T0 all show the finished heading. Line-split headings are announced as separate lines by screen readers, so keep them to three short display lines and never split body text.

### Gradient and chrome text (T1, static)

```css
.kui-gradient-text {
  background: linear-gradient(100deg, var(--brand-primary), var(--brand-accent));
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
  padding-block-end: 0.08em;            /* descenders are clipped by background-clip */
}
@media (forced-colors: active) {
  .kui-gradient-text { background: none; color: CanvasText; }   /* otherwise it disappears */
}
```

Every gradient stop must reach 4.5:1 against the surface on its own. A chrome look is the same recipe with `--brand-muted` and `--brand-surface` as highlight stops.

### Glitch (T1, finite)

```html
<h2 class="kui-glitch">
  <span class="kui-glitch__ghost" aria-hidden="true">Signal lost</span>Signal lost<span
    class="kui-glitch__ghost kui-glitch__ghost--alt" aria-hidden="true">Signal lost</span>
</h2>
```

```css
.kui-glitch { position: relative; }
.kui-glitch__ghost {
  position: absolute; inset: 0; pointer-events: none; color: var(--brand-accent); opacity: 0;
}
.kui-glitch__ghost--alt { color: var(--brand-primary); }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-glitch {
    animation: kui-glitch var(--kui-duration-lg) var(--kui-ease-linear) 3 both;
  }
}
@keyframes kui-glitch {
  0%, 100% { transform: none; }
  25% { transform: translateX(calc(-1 * var(--kui-distance-sm))); }
  50%, 75% { transform: translate(var(--kui-distance-sm), var(--kui-distance-sm)); }
}
```

Three cycles of `--kui-duration-lg` finish in about 1.2 s, and the ghost opacity changes at most twice per cycle: under the 3-flashes limit. Never loop a glitch, and never put it behind more than one short line.

### Scramble and typewriter (T2)

```js
const GLYPHS = '#%&@$*+=<>/';
const token = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

export function scramble(el) {
  if (Number(document.documentElement.dataset.motionTier ?? 1) < 2) return () => {};
  const final = el.textContent, start = performance.now(), duration = token('--kui-duration-xl');
  el.setAttribute('aria-hidden', 'true');                 // the sr-only copy carries the meaning
  let frame = 0;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const keep = Math.floor(final.length * t);
    el.textContent = final.slice(0, keep)
      + [...final.slice(keep)].map((ch) => (ch === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
    frame = t < 1 ? requestAnimationFrame(step) : 0;
    if (t >= 1) el.textContent = final;
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
```

Always pair the animated node with a real copy in the accessibility tree (`<span class="sr-only">Signal lost</span>` before the animated span). Run it once per element, on first view, from an `IntersectionObserver`; skip it while the user has a text selection.

```css
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-type {   /* clip-path needs a block box */
    display: block; animation: kui-type calc(var(--kui-duration-xl) * 2) steps(var(--textfx-chars, 24), end) both; }
  :root:not([data-motion-tier="0"]) .kui-type::after {
    content: "_"; animation: kui-caret var(--kui-duration-xl) var(--kui-ease-linear) 6; }   /* six blinks */
}
@keyframes kui-type { from { clip-path: inset(0 100% 0 0); } }
@keyframes kui-caret { 50% { opacity: 0; } }
```

Because the full string occupies its final space, the typewriter never reflows the page. At T0 the block is inside the gate, so the full text and no caret render.

### Marquee with a pause control (T1)

```html
<div class="kui-marquee">
  <p class="kui-marquee__track"><span>Free shipping over 80</span>
    <span aria-hidden="true">Free shipping over 80</span></p>
  <button class="kui-marquee__toggle" type="button" aria-pressed="false">Pause ticker</button>
</div>
```

```css
.kui-marquee { display: flex; gap: 1rem; overflow: clip; align-items: center; }
.kui-marquee__track { display: flex; margin: 0; flex: none; white-space: nowrap; }
.kui-marquee__track > * { padding-inline-end: 2rem; }   /* equal halves, so -50% loops seamlessly */
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-marquee__track {
    animation: kui-marquee calc(var(--kui-duration-xl) * 33) var(--kui-ease-linear) infinite;
  }
  .kui-marquee[data-paused="true"] .kui-marquee__track { animation-play-state: paused; }
}
@media (prefers-reduced-motion: reduce) { .kui-marquee__toggle { display: none; } }
:root[data-motion-tier="0"] .kui-marquee__toggle { display: none; }   /* nothing to pause */
@keyframes kui-marquee { to { transform: translate3d(-50%, 0, 0); } }
```

```js
const toggle = document.querySelector('.kui-marquee__toggle');
toggle.addEventListener('click', () => {
  const play = toggle.getAttribute('aria-pressed') === 'true';   // currently paused
  toggle.setAttribute('aria-pressed', String(!play));
  toggle.closest('.kui-marquee').dataset.paused = String(!play);
  toggle.textContent = play ? 'Pause ticker' : 'Play ticker';
});
```

The duplicate is `aria-hidden`, so the message is announced once. The control is a real button, reachable by keyboard, and stays visible while the loop runs.

Framework notes: run `scramble` from a mount effect that returns its cleanup (`useEffect`, `onMounted`, `$effect`) and skip it on the server; see `references/platforms/web-frameworks.md`. GSAP SplitText, anime.js `text.split`, and Motion `stagger()` are the JS options; see `references/libraries.md`. Native platforms build the same effects with the platform's own type APIs: Flutter `AnimatedSwitcher` and `TweenAnimationBuilder<TextStyle>`, SwiftUI `.contentTransition(.numericText())` and `PhaseAnimator`, Compose `AnimatedContent`; see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

| Technique | T0 |
| --- | --- |
| Block and line reveal | Heading fully visible, no clip, no travel, no stagger; an opacity fade of `--kui-duration-sm` is the only allowed change |
| Gradient and chrome | Static gradient kept: color is not motion |
| Glitch | Ghosts hidden, base text in `--brand-on-surface`; no transform |
| Scramble | Final string at once; no glyph churn, no `aria-hidden` on the visible node |
| Typewriter | Full text at once, caret hidden, no `steps()` |
| Marquee | Static row showing the full message; the pause button is not rendered |
| Variable font | One static weight |

No text effect may hide content at T0, and no effect may leave a caret, ghost, or clip that a user cannot clear.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Same as T2; text effects never mount WebGL | Nothing beyond the one-effect-per-view cap |
| T2 | Reveal, line stagger, gradient, glitch, scramble, typewriter, marquee with pause | Variable font animation, >3 staggered lines |
| T1 | Reveal, line stagger, gradient, glitch, marquee with pause | Scramble and typewriter, both JS-driven |
| T0 | As in Reduced motion | Everything above |

## Performance budget

- Animate `clip-path`, `opacity`, and `transform` on display text only. Never animate `font-size`, `letter-spacing`, `line-height`, or `width`: each one reflows the paragraph.
- `font-variation-settings` interpolation triggers layout and paint on every frame. Cap it to a single short display line, state the cost in the code comment, and never do it on body text.
- Split text into at most three lines or about 40 words. Every split node is a layout and accessibility cost.
- `background-clip: text` repaints on resize and on any ancestor change; keep the gradient static and small.
- `text-shadow` and `filter: drop-shadow` per glyph are paint-heavy: one short label at most.
- Glitch ghosts must be `position: absolute` so they never contribute layout, and glitch must stop after 3 cycles.
- Marquee: one `translate3d` track, `will-change: transform`, paused when offscreen or hidden.

## Accessibility

- Selection and copy keep working: real text nodes, no `user-select: none`, no per-character spans, no `::before` copies carrying the only text.
- Exactly one copy of each string in the accessibility tree: animated or duplicated nodes are `aria-hidden="true"` and a plain copy stands in. Never a live region around scrambling text; it would announce every glyph.
- Text must survive 200% zoom and 400% reflow (WCAG 1.4.4, 1.4.10): use `em`, `rem`, and `ch`, and never a fixed-height mask that clips ascenders or accents.
- Contrast holds at every frame of the effect: 4.5:1 for body text, 3:1 for large display type (WCAG 1.4.3). Gradient stops are checked individually.
- Nothing flashes more than 3 times per second (WCAG 2.3.1). Glitch cycles are counted, not estimated.
- Any motion over 5 s has a pause control (WCAG 2.2.2): the marquee ships with one, and long reveals stay under `--kui-duration-xl`.
- Provide the in-product "Reduce motion" toggle that forces T0, as described in `references/foundations/accessibility-motion.md`.

## Libraries

Native CSS first: `clip-path`, `background-clip`, `steps()`, and `translate3d` cover all but scramble and variable-font effects. GSAP `SplitText` (check its license) and anime.js `text.split` handle line and word splitting; Motion `stagger()` sequences lines. Fonts, versions, and license facts: `references/libraries.md`. For animated headlines inside a rendered scene, pick the renderer from `references/libraries.md` and keep the type in the DOM above it.

## Pitfalls

- Per-character spans: screen readers announce letters, copy produces broken text, and translation tools mangle the string.
- `background-clip: text` with `color: transparent` and no forced-colors fallback: the heading vanishes in high-contrast mode.
- A gradient whose light stop sits on a light surface: 2:1 contrast on half the headline.
- `overflow: hidden` on line masks clips descenders, accents, and enlarged text at 200% zoom.
- A width-based typewriter reflows the paragraph on every glyph; `clip-path` over the final layout does not.
- Scramble left mid-pass after a tab switch or a route change: a heading stuck on glyph noise.
- Marquee without a pause control, or a pause control that is only hover-based and unreachable by keyboard.
- Marquee or glitch left running without a pause: seizure risk, battery drain, and text that never settles.
