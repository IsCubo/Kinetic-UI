# Buttons

> Keywords: button, primary button, secondary button, ghost button, text button, icon button, FAB, floating action button, toggle button, aria-pressed, loading button, spinner button, success state, magnetic button, press feedback, state layer, botón
> Summary: How buttons behave: variants, anatomy, state timing, press, loading and toggle feedback, and the magnetic variant, with reduced-motion and low-end rules.

## When to use

| Variant | Use for |
| --- | --- |
| Primary | The one main action of a view or region ("Save changes", "Place order") |
| Secondary | Alternatives next to a primary ("Save draft") |
| Ghost / text | Low-emphasis actions in toolbars, cards, and dense UI |
| Icon | Compact, repeated actions with a widely known icon (close, delete, more) |
| FAB | The single most frequent creation action on a mobile screen ("New message") |
| Toggle | A pressed/unpressed tool state (Bold, Mute, Favorite) |
| Loading | Async actions that can take longer than ~300 ms |
| Magnetic | One brand or hero CTA on fine-pointer devices; pure delight |

## When not to use

- Navigation to another URL: use `<a href>` styled as a button. Buttons act, links go.
- On/off settings that apply immediately: use a switch (`references/components/selection-controls.md`).
- More than one primary button per region, or more than one FAB per screen.
- A FAB for destructive or secondary actions, or on desktop layouts with room for a labeled button.
- Magnetic motion in forms, dense product UI, or touch-only devices.
- Operations longer than ~10 s: show progress instead (`references/components/feedback.md`).

## How it works

Anatomy: **container** (hit area ≥24×24 CSS px, 44×44 on touch) · **label** · optional **leading/trailing icon** · **state layer** (pseudo-element tint for hover/press) · **focus ring** · **loading slot** (spinner stacked in the label's cell so the width never jumps).

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest | — | Base fill, border, label | — | — |
| Hover | Pointer enters (`hover: hover` only) | State layer opacity 0 → 0.08 | `--kui-duration-xs` | `--kui-ease-standard` |
| Pressed | `:active` / pointerdown | Scale to `--kui-scale-press`, state layer 0.12 | `--kui-duration-xs` | `--kui-ease-standard` |
| Released | Pointer up | Scale back to 1 | `--kui-duration-sm` | `--kui-ease-enter` (playful brands: `--kui-ease-spring`) |
| Focus-visible | Keyboard focus | 2px outline, 2px offset, appears instantly | none (instant) | — |
| Disabled | `disabled` or `aria-disabled="true"` | Muted colors, no hover/press | none (instant) | — |
| Loading | Async start | Label fades out, spinner fades in, width locked | `--kui-duration-sm` | `--kui-ease-standard` |
| Success | Async resolves | Check icon pops (`--kui-scale-pop`), label returns after ~1.5 s | `--kui-duration-md` | `--kui-ease-spring` |
| Toggled on | Click, Enter, or Space | Fill switches to `--brand-primary`, icon swaps | `--kui-duration-sm` | `--kui-ease-standard` |
| FAB enter/exit | Screen load / scroll direction | Scale from `--kui-scale-press` + fade; extended FAB collapses its label on scroll down | `--kui-duration-md` | `--kui-ease-enter` / `--kui-ease-exit` |
| Magnetic pull | Pointer near the CTA | Button translates toward the pointer, capped at ~12px | per frame | — |
| Magnetic release | Pointer leaves | Returns to rest | `--kui-duration-md` | `--kui-ease-spring` |

Give feedback within one frame of pointerdown: the press state must never wait for the action's work.

## Implementation

```html
<button class="btn btn--primary" type="button">Save changes</button>
<button class="btn btn--ghost" type="button">Cancel</button>
<button class="btn btn--icon" type="button" aria-label="Delete draft">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#icon-trash"></use></svg>
</button>
<button class="btn btn--toggle" type="button" aria-pressed="false">Bold</button>
<button class="btn btn--primary" type="submit" data-busy-label="Saving" data-done-label="Saved">
  <span class="btn__label">Save</span>
  <span class="btn__spinner" aria-hidden="true"></span>
</button>
<p id="btn-status" class="visually-hidden" role="status"></p>
```

```css
.btn {
  position: relative; isolation: isolate;
  display: inline-grid; place-items: center;
  min-block-size: 44px; padding-inline: 1.25rem;
  border: 1px solid transparent; border-radius: var(--brand-radius);
  font: 600 1rem/1 var(--brand-font-body); cursor: pointer;
}
.btn > * { grid-area: 1 / 1; }                 /* label and spinner share one cell */
.btn--primary { background: var(--brand-primary); color: var(--brand-on-primary); }
.btn--secondary { background: transparent; color: var(--brand-primary); border-color: currentColor; }
.btn--ghost, .btn--icon, .btn--toggle { background: transparent; color: var(--brand-on-surface); }
.btn--icon { min-inline-size: 44px; padding: 0; }
.btn[aria-pressed="true"] { background: var(--brand-primary); color: var(--brand-on-primary); }
.btn::before {                                 /* state layer */
  content: ""; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit; background: currentColor; opacity: 0; pointer-events: none;
}
@media (hover: hover) { .btn:hover::before { opacity: 0.08; } }
.btn:active::before { opacity: 0.12; }
.btn:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }

.btn__spinner {
  inline-size: 1.1em; aspect-ratio: 1; opacity: 0;
  border: 2px solid currentColor; border-inline-end-color: transparent; border-radius: 50%;
}
.btn[data-state="loading"] .btn__label { opacity: 0; }
.btn[data-state="loading"] .btn__spinner { opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
  .btn { transition: scale var(--kui-duration-sm) var(--kui-ease-enter); }
  .btn:active { scale: var(--kui-scale-press); transition-duration: var(--kui-duration-xs); }
  .btn::before, .btn__label, .btn__spinner { transition: opacity var(--kui-duration-xs) var(--kui-ease-standard); }
  :root:not([data-motion-tier="0"]) .btn[data-state="loading"] .btn__spinner {
    animation: btn-spin 0.8s var(--kui-ease-linear) infinite;   /* loop period, not a state duration */
  }
}
@keyframes btn-spin { to { rotate: 1turn; } }
```

```js
// Loading: keep focus on the button, block repeats, announce start and result.
const status = document.getElementById('btn-status');
export async function runWithLoading(button, task) {
  if (button.dataset.state === 'loading') return;
  const slow = setTimeout(() => {               // skip the spinner for fast actions
    button.dataset.state = 'loading';
    status.textContent = button.dataset.busyLabel ?? 'Working';
  }, 300);
  button.setAttribute('aria-disabled', 'true');
  try {
    await task();
    status.textContent = button.dataset.doneLabel ?? 'Done';
  } catch {
    status.textContent = 'Not saved. Check your connection and try again.';
  } finally {
    clearTimeout(slow);
    delete button.dataset.state;
    button.removeAttribute('aria-disabled');
  }
}

// Toggle: flip aria-pressed; the label never changes.
document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.btn--toggle');
  if (toggle) toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true'));
});
```

Magnetic variant (T2+, fine pointer only). Use the individual `translate` property so it composes with the press `scale`. The full effect, strength curves, and cursor followers live in `references/effects/cursor-pointer.md`.

```js
export function magnetic(el, { strength = 0.3, max = 12 } = {}) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine || Number(document.documentElement.dataset.motionTier) < 2) return;
  let box;
  el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });
  el.addEventListener('pointermove', (e) => {
    const clamp = (v) => Math.max(-max, Math.min(max, v * strength));
    el.style.translate = `${clamp(e.clientX - box.left - box.width / 2)}px ${clamp(e.clientY - box.top - box.height / 2)}px`;
  });
  el.addEventListener('pointerleave', () => { el.style.translate = ''; });
}
```

Framework notes: in React with Motion, use `whileTap={{ scale: 0.97 }}` inside `<MotionConfig reducedMotion="user">`. Native equivalents: Flutter `FilledButton`, `OutlinedButton`, `TextButton`, `IconButton`, `FloatingActionButton`; SwiftUI `Button` with `.buttonStyle(.borderedProminent)` or `.bordered`, `Toggle` with `.toggleStyle(.button)`; Compose `Button`, `OutlinedButton`, `TextButton`, `IconToggleButton`, `FloatingActionButton`. See `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`.

## Reduced motion

T0 behavior, exactly:
- Press: no scale (the tokens set `--kui-scale-press` to 1). The state layer still changes opacity in `--kui-duration-xs`.
- Loading: no rotation. The spinner shows as a static partial ring and the live region announces the busy label.
- Success: the check icon and the "Saved" label appear with an opacity fade of `--kui-duration-sm`. No pop.
- Toggle: color and icon change instantly or fade in `--kui-duration-xs`.
- FAB: fades in and out. No scale, and the label does not collapse on scroll.
- Magnetic: disabled. The button never moves.
- The focus ring always appears instantly.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. Buttons never need GPU effects. |
| T2 | Magnetic CTA, spring release, success morph (label → check → label), FAB hide on scroll |
| T1 | CSS only: state layer, press scale, CSS spinner, toggle color. No magnetic and no JS-driven motion |
| T0 | As in Reduced motion |

## Performance budget

- Animate `scale`, `translate`, and `opacity` only. Never transition `box-shadow` on many buttons; fade a pseudo-element that carries the shadow instead.
- Paint press feedback in the first frame. Defer heavy handlers (`await` a microtask or `scheduler.yield()` where available) so INP stays ≤200 ms.
- Magnetic: read `getBoundingClientRect()` once on pointerenter, not on every move. Attach it to at most one or two CTAs per page.
- Never use `transition: all`.

## Accessibility

- Follow the WAI-ARIA APG **Button** pattern. Use a native `<button>`: Enter and Space activate it, with no extra key handling.
- Toggle buttons use `aria-pressed="true|false"` and keep a constant label. Never change both the label and the pressed state.
- Icon buttons need an accessible name (`aria-label` or visually hidden text). Give them a tooltip on hover and focus (`references/components/overlays.md`).
- While loading, use `aria-disabled="true"` rather than `disabled`, because `disabled` drops keyboard focus to `<body>`. Announce the busy and done states in a `role="status"` region (WCAG 4.1.3).
- WCAG: 2.4.7 focus visible, with a 3:1 ring on ghost buttons too. 2.5.8 target size, at least 24×24 px. 1.4.3 label contrast, 1.4.11 border contrast for secondary buttons.
- A FAB must not cover content or the focused element (2.4.11). Pad the scroll container's end by the FAB's height.
- Magnetic motion is decoration. Keyboard focus never moves the button.

## Libraries

Motion (`whileTap`, `MotionConfig`) and GSAP (`quickTo` for a magnetic follow) are optional. Plain CSS covers every state except magnetic. Versions and caveats: `references/libraries.md`.

## Pitfalls

- A `<div onclick>` instead of `<button>`. It has no keyboard support, no role, and no focus.
- The label swaps to a spinner and the button shrinks. Stack both in one grid cell.
- A spinner on actions that finish in under 300 ms flickers. Delay it, as in the snippet.
- Hover styles stick on touch devices. Wrap them in `@media (hover: hover)`.
- The magnetic offset moves the hit area away from a slow pointer. Cap it at ~12px.
- `transform` set by JS overwrites the CSS press `scale`. Use the individual `translate` and `scale` properties.
