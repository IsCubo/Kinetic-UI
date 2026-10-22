# Micro-interactions

> Keywords: micro-interaction, microinteraction, microinteracciones, feedback, press, hover, toggle switch, like button, heart burst, checkbox draw, input focus, validation, error shake, success check, copy to clipboard, add to cart, cart badge, pull to refresh, skeleton shimmer, count-up, number animation, underline draw, haptics
> Summary: Anatomy of a micro-interaction (trigger, rules, feedback, loops and modes) and a token-based CSS catalog of common ones, each linked to its component file.

A micro-interaction is one small task with one feedback moment. It confirms that something happened and what changed. Build the static state first, then add motion that the tokens and tiers can remove.

## When to use

- Confirm that an action registered: press, toggle, like, copy, add to cart.
- Show a state change the user must notice: a validation result, a new count, content loading.
- Teach an affordance once, then step back (a pull hint, a first-use pulse).

## When not to use

- High-frequency work (grid editing, typing, keyboard shortcuts): keep feedback instant and static.
- Decoration without a state change. If nothing changed, nothing moves.
- Hiding latency. Actions over ~1 s need progress (`references/components/feedback.md`), not a longer animation.
- Never hold back the result of an action until an animation ends.

## How it works

| Part | Question | Rule |
| --- | --- | --- |
| Trigger | What starts it? | A user input (press, hover, focus, gesture) or a system event (data arrived, error, count changed) |
| Rules | What may happen next? | Define the states first (idle → busy → done or error); ignore repeat triggers while busy |
| Feedback | How is it perceived? | Visual change plus a non-motion cue (color, icon, text); haptics on native; sound only when opted in |
| Loops and modes | What happens over time? | Repeats are shorter or skipped; loops stop when the state settles; a mode change (edit, offline) restyles once |

Timing (`references/foundations/motion-principles.md`):
- Start feedback within 100 ms of input: `--kui-duration-xs`.
- Routine feedback: `--kui-duration-xs` to `--kui-duration-md`. Celebrations (like burst, added to cart): up to `--kui-duration-lg`, once.
- Arrive with `--kui-ease-enter`, leave with `--kui-ease-exit`. Keep `--kui-ease-spring` for playful brands.
- Fades that must survive T0 use `--kui-duration-xs` or `--kui-duration-sm` (≤200ms).

## Implementation

Load `assets/tokens/motion.css` and call `applyMotionTier()` from `assets/snippets/motion-tier.js`. Write the T0-safe state first: the state change plus color or opacity fades. Put travel, bursts, and loops behind the motion gate `@media (prefers-reduced-motion: no-preference)` + `:root:not([data-motion-tier="0"])`. An unset tier (no JS yet) counts as T1.

| Interaction | T1 feedback | Min tier | Component |
| --- | --- | --- | --- |
| Press | `scale` to `--kui-scale-press`, darker fill | T1 | `references/components/buttons.md` |
| Hover | Lift by `--kui-distance-sm`, shadow fades in, link underline draws | T1 | `references/components/cards.md`, `references/components/buttons.md` |
| Toggle | Thumb slides, track color fades | T1 | `references/components/selection-controls.md` |
| Like / heart burst | Icon pops, ring bursts once, fill turns accent | T1 | `references/components/buttons.md` |
| Checkbox draw | Check stroke draws in | T1 | `references/components/selection-controls.md` |
| Input focus | Focus ring plus an underline that grows | T1 | `references/components/inputs-forms.md` |
| Validation | Error: shake ≤ `--kui-distance-sm`, color, icon, message. Success: check and color | T1 | `references/components/inputs-forms.md` |
| Copy to clipboard | Icon swaps to a check, label says "Copied", polite announcement | T1 | `references/components/buttons.md`, `references/components/feedback.md` |
| Add to cart | Label says "Added", cart badge pops; thumbnail flies to the cart at T2 | T1 | `references/components/buttons.md`, `references/components/navigation.md` |
| Pull to refresh | Indicator follows the pull, then spins until done | T1 | `references/components/lists-collections.md` |
| Skeleton shimmer | Highlight sweeps across placeholders | T1 | `references/components/feedback.md` |
| Number count-up | Value counts to its target once when visible | T2 | `references/components/cards.md` |

### Press, hover, underline

```css
/* Press: the individual scale property composes with a magnetic translate. */
.kui-press { transition: scale var(--kui-duration-xs) var(--kui-ease-standard), background-color var(--kui-duration-xs) linear; }
.kui-press:active { scale: var(--kui-scale-press); background-color: color-mix(in oklab, var(--brand-primary), black 12%); }

/* Hover lift: fade a pseudo-element that carries the shadow; never transition box-shadow. */
.kui-lift { position: relative; isolation: isolate; transition: translate var(--kui-duration-sm) var(--kui-ease-standard); }
.kui-lift::after {
  content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit; pointer-events: none;
  box-shadow: 0 12px 32px color-mix(in oklab, var(--brand-on-surface) 18%, transparent);
  opacity: 0; transition: opacity var(--kui-duration-sm) var(--kui-ease-standard);
}
.kui-lift:focus-visible::after { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .kui-lift:hover { translate: 0 calc(-1 * var(--kui-distance-sm)); }   /* 0 at T0 via the token */
  .kui-lift:hover::after { opacity: 1; }
}

/* Link underline draw */
.kui-link { background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-link { background-size: 0% 1px; transition: background-size var(--kui-duration-md) var(--kui-ease-enter); }
  :root:not([data-motion-tier="0"]) .kui-link:is(:hover, :focus-visible) { background-size: 100% 1px; }
}
```

The underline animates `background-size` (paint on one line of text, acceptable). At T0 the underline is always visible.

### Toggle, checkbox, like

```html
<button class="kui-switch" type="button" role="switch" aria-checked="false" aria-labelledby="notif-label">
  <span class="kui-switch__thumb" aria-hidden="true"></span>
</button>
<label class="kui-check"><input type="checkbox">
  <svg viewBox="0 0 16 16" aria-hidden="true"><path pathLength="1" d="M3 8.5l3.2 3L13 4.5"/></svg> Remember me</label>
<button class="kui-like" type="button" aria-pressed="false" aria-label="Like">
  <svg class="kui-like__icon" aria-hidden="true" width="24" height="24"><use href="#icon-heart"></use></svg>
  <span class="kui-like__ring" aria-hidden="true"></span>
</button>
```

```css
.kui-switch { --w: 2.75rem; --h: 1.5rem; inline-size: var(--w); block-size: var(--h); padding: 3px; border: 0; border-radius: 999px;
  background: var(--brand-muted); transition: background-color var(--kui-duration-sm) linear; }
.kui-switch__thumb { display: block; block-size: 100%; aspect-ratio: 1; border-radius: 50%; background: var(--brand-surface); }
.kui-switch[aria-checked="true"] { background: var(--brand-primary); }
.kui-switch[aria-checked="true"] .kui-switch__thumb { translate: calc(var(--w) - var(--h)) 0; }

.kui-check { position: relative; display: inline-flex; gap: 0.5rem; align-items: center; }
.kui-check input { position: absolute; opacity: 0; }
.kui-check svg { inline-size: 1.25rem; border: 2px solid currentColor; border-radius: 4px; fill: none; stroke: var(--brand-on-primary); stroke-width: 2.5; }
.kui-check input:focus-visible + svg { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
.kui-check input:checked + svg { background: var(--brand-primary); border-color: var(--brand-primary); }
.kui-check path { stroke-dasharray: 1; stroke-dashoffset: 1; }
.kui-check input:checked + svg path { stroke-dashoffset: 0; }

.kui-like { position: relative; color: var(--brand-on-surface); transition: color var(--kui-duration-sm) linear; }
.kui-like[aria-pressed="true"] { color: var(--brand-accent); }
.kui-like__ring { position: absolute; inset: -30%; border: 2px solid var(--brand-accent); border-radius: 50%; opacity: 0; pointer-events: none; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-switch__thumb { transition: translate var(--kui-duration-sm) var(--kui-ease-spring); }
  :root:not([data-motion-tier="0"]) .kui-check path { transition: stroke-dashoffset var(--kui-duration-sm) var(--kui-ease-enter); }
  :root:not([data-motion-tier="0"]) .kui-like[aria-pressed="true"] .kui-like__icon { animation: kui-pop var(--kui-duration-md) var(--kui-ease-standard); }
  :root:not([data-motion-tier="0"]) .kui-like[aria-pressed="true"] .kui-like__ring { animation: kui-ring var(--kui-duration-lg) var(--kui-ease-enter); }
}
/* 5x the pop delta: 1.2 with default tokens, 1 at T0. */
@keyframes kui-pop { 40% { scale: calc(1 + (var(--kui-scale-pop) - 1) * 5); } }
@keyframes kui-ring { from { opacity: 0.8; scale: 0.5; } to { opacity: 0; scale: 1.3; } }
```

Toggle JS: `btn.setAttribute('aria-checked', String(btn.getAttribute('aria-checked') !== 'true'))`. The burst plays only when the state turns on, never on un-like.

### Focus and validation

```css
.kui-field { position: relative; }
.kui-field input:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
.kui-field::after { content: ""; position: absolute; inset: auto 0 0; block-size: 2px; background: var(--brand-primary);
  opacity: 0; scale: 0 1; transition: opacity var(--kui-duration-sm) linear; }
.kui-field:focus-within::after { opacity: 1; scale: 1 1; }
.kui-field[data-state="error"] input { border-color: var(--field-error, #b3261e); }     /* map to your status colors */
.kui-field[data-state="success"] input { border-color: var(--field-success, #1b7f3b); }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-field::after { transition: opacity var(--kui-duration-sm) linear, scale var(--kui-duration-md) var(--kui-ease-enter); }
  :root:not([data-motion-tier="0"]) .kui-field[data-state="error"] { animation: kui-shake var(--kui-duration-lg) var(--kui-ease-standard); }
}
/* Amplitude is exactly --kui-distance-sm (4px); it becomes 0 at T0. */
@keyframes kui-shake {
  20%, 60% { translate: calc(-1 * var(--kui-distance-sm)) 0; }
  40%, 80% { translate: var(--kui-distance-sm) 0; }
}
```

Shake on submit or blur, never per keystroke. Set `aria-invalid="true"` and link the message with `aria-describedby`. Success reuses the checkbox draw path inside the field.

### Copy, add to cart, count-up

```js
// Copy: swap icon and label, announce, restore after 2 s. Report failure in words.
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(codeEl.textContent);
    copyBtn.dataset.copied = 'true'; label.textContent = 'Copied'; status.textContent = 'Copied to clipboard';
  } catch {
    status.textContent = 'Copy failed. Select the text and copy it manually.';
  }
  setTimeout(() => { copyBtn.dataset.copied = 'false'; label.textContent = 'Copy'; status.textContent = ''; }, 2000);
});

// Cart badge: set data-bump to replay the pop; clear it when the animation ends.
badge.addEventListener('animationend', () => badge.removeAttribute('data-bump'));
function setCartCount(n) { badge.textContent = String(n); badge.toggleAttribute('data-bump', true); }

// Count-up (T2): the HTML holds the final value, so no-JS, T0, and T1 show it as is.
export function countUp(el) {
  const to = Number(el.dataset.to);
  const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kui-duration-xl')) || 600;
  const fmt = new Intl.NumberFormat(document.documentElement.lang || undefined);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = fmt.format(Math.round(to * (1 - (1 - t) ** 3)));   // ease-out cubic
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

```css
.kui-copy__icons { display: grid; }
.kui-copy__icons > * { grid-area: 1 / 1; transition: opacity var(--kui-duration-sm) linear; }
.kui-copy .is-done, .kui-copy[data-copied="true"] .is-copy { opacity: 0; }
.kui-copy[data-copied="true"] .is-done { opacity: 1; }
.kui-badge, .kui-countup { font-variant-numeric: tabular-nums; }   /* digits keep their width */
.kui-countup { display: inline-block; min-inline-size: var(--digits, 4ch); }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-copy[data-copied="true"] .is-done,
  :root:not([data-motion-tier="0"]) .kui-badge[data-bump] { animation: kui-pop var(--kui-duration-md) var(--kui-ease-standard); }
}
```

Start `countUp` from an `IntersectionObserver`, once, only when `data-motion-tier` is 2 or 3. Fly-to-cart (T2): animate a clone of the product thumbnail with `el.animate()` on `transform` and `opacity` toward the cart icon, then remove it.

### Pull to refresh and skeleton

```css
.kui-ptr { overscroll-behavior-y: contain; }        /* custom scroll containers only; documents keep native refresh */
.kui-ptr__indicator { opacity: var(--pull, 0); }
.kui-ptr[data-state="refreshing"] .kui-ptr__indicator { opacity: 1; }
.kui-skeleton { position: relative; overflow: hidden; border-radius: var(--brand-radius);
  background: color-mix(in oklab, var(--brand-on-surface) 8%, var(--brand-surface)); }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .kui-ptr__indicator { rotate: calc(var(--pull, 0) * 270deg); }
  :root:not([data-motion-tier="0"]) .kui-ptr[data-state="refreshing"] .kui-ptr__indicator { animation: kui-spin 0.8s var(--kui-ease-linear) infinite; }
  :root:not([data-motion-tier="0"]) .kui-skeleton::after {
    content: ""; position: absolute; inset: 0; translate: -100% 0;
    background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-surface) 55%, transparent), transparent);
    animation: kui-shimmer 1.5s var(--kui-ease-linear) 3;     /* loop period; stops after 3 sweeps */
  }
}
@keyframes kui-spin { to { rotate: 1turn; } }
@keyframes kui-shimmer { to { translate: 100% 0; } }
```

Pull JS: on `touchmove` while `scrollTop === 0`, set `--pull` to `Math.min(distance / 80, 1)`. On release at 1, set `data-state="refreshing"` and announce "Refreshing" in a `role="status"` region. Also offer a Refresh button. Mark loading regions `aria-busy="true"` and replace skeletons with content in one swap.

Platform notes: Flutter `AnimatedScale`, `AnimatedSwitcher`, `HapticFeedback.selectionClick()`, and `MediaQuery.disableAnimationsOf(context)` for T0. SwiftUI `.symbolEffect(.bounce, value:)`, `.sensoryFeedback(.success, trigger:)`, and `@Environment(\.accessibilityReduceMotion)`. Compose `animateFloatAsState`, `updateTransition`, `LocalHapticFeedback`. Details: `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`, `references/platforms/web-frameworks.md`.

## Reduced motion

T0 behavior, exactly. With the gate and tokens above this needs no extra CSS:

| Interaction | T0 |
| --- | --- |
| Press | Fill darkens in `--kui-duration-xs`; no scale |
| Hover | Shadow fades in; no lift. Underlines stay visible |
| Toggle | Thumb jumps; track color fades in `--kui-duration-sm` |
| Like | Fill turns accent in `--kui-duration-sm`; no pop, no ring |
| Checkbox | Check appears at once with the filled box |
| Focus | Ring at once; underline fades in, does not grow |
| Validation | No shake. Border color, icon, and message appear |
| Copy | Icons crossfade in `--kui-duration-sm`; label and announcement unchanged |
| Add to cart | Badge number updates; no pop, no flying thumbnail |
| Pull to refresh | Indicator fades with the pull; "Refreshing" text instead of a spin |
| Skeleton | Static placeholder; no shimmer |
| Count-up | Final value at once |

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. A micro-interaction never mounts WebGL |
| T2 | Everything in T1 plus JS: count-up, fly-to-cart clone, list add/remove with FLIP (AutoAnimate), particle burst for the like (≤12 elements) |
| T1 | CSS only: every recipe above; count-up shows the final value; add to cart pops the badge only |
| T0 | As in Reduced motion |

## Performance budget

- Paint feedback in the first frame after input. Set the state attribute first; defer heavy work until after the next paint so INP stays ≤200 ms.
- Animate `transform` (including `scale`, `translate`, `rotate`) and `opacity`. Stated exceptions: `stroke-dashoffset` on a 20px icon, `background-size` on one underline, `background-color` on small controls.
- Never `transition: all`; never transition `box-shadow` (fade a pseudo-element).
- Skeletons: stop the shimmer after a few sweeps; many placeholders share one sweep rather than one loop each.
- No permanent `will-change` on lists of buttons.

## Accessibility

- Native elements first: `<button>`, `<input type="checkbox">`. Switches use `role="switch"` + `aria-checked`; like uses `aria-pressed` with a constant label.
- Status changes (copied, added, refreshing, errors on submit) go to a `role="status"` region (WCAG 4.1.3).
- Never color alone: add an icon or text (1.4.1). Error messages are linked with `aria-describedby`.
- Every hover effect also appears on `:focus-visible` (2.4.7). Focus rings appear instantly.
- Icon buttons are at least 24×24 CSS px (2.5.8); 44×44 on touch.
- Pull to refresh has a button alternative (2.5.1). Haptics are never the only cue.

## Libraries

Motion: vanilla `press()`, `hover()`, and `animate()`; in React, `motion/react` with `whileTap`, `whileHover`, and `<MotionConfig reducedMotion="user">`. AutoAnimate for list add, remove, and reorder. anime.js v4 (`animate`, `stagger` as named imports) and GSAP for sequenced celebrations. Rive or Lottie for designer-made animated icons; check their maintenance status first. Names only here; facts in `references/libraries.md`.

## Pitfalls

- Validation shake on every keystroke reads as an alarm. Shake once, on submit or blur.
- Celebrations that replay on re-render or remount. Tie them to the state change, not to mounting.
- Sticky `:hover` after a tap on touch screens. Gate hover with `(hover: hover)`.
- Optimistic like or cart state without a rollback and a message on failure.
- Double submit while "Adding". Ignore repeat triggers while busy; use `aria-disabled`.
- Count-up on values that change live (prices, balances) confuses. Animate the first reveal only.
- A spinner for actions under ~300 ms flickers. Delay it (`references/components/buttons.md`).
