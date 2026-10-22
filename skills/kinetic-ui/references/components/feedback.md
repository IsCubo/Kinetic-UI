# Feedback

> Keywords: feedback, toast, snackbar, notification, banner, inline validation, error message, error summary, loading, spinner, skeleton, shimmer, placeholder, progress bar, progress ring, determinate, indeterminate, optimistic ui, empty state, no results, inbox zero, error recovery, retry, offline, undo, stale data, badge, retroalimentación, notificación, estado vacío
> Summary: How status feedback behaves: toasts, inline validation, loading and skeletons, progress, empty states, and error recovery, with timing, announcement, and reduced-motion and low-end behavior.

## When to use

| Pattern | Use for |
| --- | --- |
| Toast | Confirming an action the user just took, optionally with Undo; it must not need a reply |
| Inline banner | Page-level status that persists: offline, read-only mode, trial ending |
| Inline validation | A field or group whose value needs a correction, next to the control |
| Error summary | A submit that failed in several fields; it links to each one |
| Skeleton | Loading a layout you already know (list, table, detail page) |
| Spinner | A short unknown wait inside one control or a small region |
| Progress bar | Work whose size is known, an operation over ~3 s, or a multi-step job |
| Empty state | No data yet, no results, or everything cleared |
| Error recovery | A failed request with a retry, and any destructive action worth an Undo |
| Badge | A count of unseen items on an icon or tab |

## When not to use

- A toast for a field error, or for anything the user must read and act on. Put it inline and keep it.
- A toast for a failure with no other trace. It disappears before a slow reader sees it.
- A skeleton when the layout is unknown or the wait is under ~300 ms: it flashes and it lies.
- A page spinner where a skeleton fits. Structure shortens perceived time.
- A progress bar that fakes, rewinds, or restarts from zero on retry.
- An empty state that is really an error. Say what failed. Never use shake, bounce, or confetti for errors and destructive confirmations.
- A badge showing `0`, or animating on page load.

## How it works

Anatomy: **status region** (persistent container in the DOM) · **message** (icon, text, optional action) · optional **timer** and **progress line** · for validation: **control**, **message row**, **error icon** · for loading: **placeholder blocks** that match the real content's box · for progress: **track** and **fill** · for empty and error states: **illustration or icon**, **heading**, **one sentence**, **one action**.

### States

| State | Trigger | Visual change | Duration token |
| --- | --- | --- | --- |
| Toast entering | An action pushed a message | Fades in and rises `--kui-distance-md` from the nearest edge | `--kui-duration-md` |
| Toast resting | — | Static card; the dismiss timer runs | — |
| Toast paused | Pointer over it, focus inside, or tab hidden | Progress line stops; the timer stops | none (instant) |
| Hover (toast action) | Pointer over Undo or dismiss (`hover: hover`) | Action tint 0 → 0.08; the timer pauses too | `--kui-duration-xs` |
| Focus-visible | Tab into a toast or banner action | 2px ring on the action, shown instantly | none (instant) |
| Toast leaving | Timer end, dismiss, Esc, or Undo | Fades out and returns `--kui-distance-sm`; Undo also restores the item in place | `--kui-duration-sm` |
| Validation invalid | Blur with a value, or submit | Message row opens; border, icon, and text change together | `--kui-duration-md` |
| Validation fixed | The input becomes valid | Message fades out and the row closes | `--kui-duration-sm` |
| Skeleton shown | Request starts | Blocks at the real sizes with one sweep | `--kui-duration-xl` (loop) |
| Skeleton resolved | Data arrives | Blocks crossfade into content, boxes unchanged | `--kui-duration-sm` |
| Progress determinate | Bytes or steps known | Fill advances via `scaleX` with real progress | per update |
| Progress indeterminate | Duration unknown | A short bar travels the track and repeats | `--kui-duration-xl` (loop) |
| Success (progress complete) | Task finishes | Fill completes, then the bar fades to a check | `--kui-duration-md` |
| Empty, first use | Nothing exists and no filter is set | Illustration and action fade in once | `--kui-duration-md` |
| Empty, no results | Filters exclude everything | Message replaces the list; no entrance animation | none (instant) |
| Error | Request fails | Calm text, icon, and Retry; the layout does not jump | `--kui-duration-sm` |
| Retrying | Retry pressed | The button takes its busy state in place | `--kui-duration-sm` |

## Implementation

Toast. Keep one live region in the DOM from the start; insert messages into it.

```html
<div class="toasts" id="toasts" role="status" aria-live="polite"></div>
```

```js
const region = document.getElementById('toasts');
export function toast({ text, action, label = 'Undo', timeout = 6000 }) {
  while (region.children.length >= 3) region.firstElementChild.remove();   // cap the stack
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<p class="toast__text"></p><button class="toast__action" type="button"></button>
    <button class="toast__close" type="button" aria-label="Dismiss">×</button><span class="toast__timer"></span>`;
  el.querySelector('.toast__text').textContent = text;
  const act = el.querySelector('.toast__action');
  act.hidden = !action;
  act.textContent = label;
  el.querySelector('.toast__timer').style.animationDuration = `${timeout}ms`;
  const close = () => {
    if (el.hasAttribute('data-leaving')) return;
    el.dataset.leaving = '';
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);          // fallback when animations are off
  };
  let left = timeout, started = performance.now(), id = setTimeout(close, left);
  const pause = () => { clearTimeout(id); left -= performance.now() - started; el.dataset.paused = ''; };
  const resume = () => { delete el.dataset.paused; started = performance.now(); id = setTimeout(close, left); };
  for (const type of ['pointerenter', 'focusin']) el.addEventListener(type, pause);
  for (const type of ['pointerleave', 'focusout']) el.addEventListener(type, resume);
  act.addEventListener('click', () => { action?.(); close(); });
  el.querySelector('.toast__close').addEventListener('click', close);
  region.append(el);
  return el;
}
```

```css
.toast { position: relative; overflow: hidden; display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem; border-radius: var(--brand-radius);
  background: var(--brand-on-surface); color: var(--brand-surface); }
.toast__action, .toast__close { min-inline-size: 24px; min-block-size: 24px; }
.toast__timer { position: absolute; inset-block-end: 0; inset-inline-start: 0; block-size: 2px; inline-size: 100%;
  background: var(--brand-accent); transform-origin: left; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .toast { animation: toast-in var(--kui-duration-md) var(--kui-ease-enter); }
  .toast__timer { animation: toast-drain 6s var(--kui-ease-linear) forwards; } /* 6s = the timer, not motion */
  .toast[data-paused] .toast__timer { animation-play-state: paused; }
  .toast[data-leaving] { animation: toast-out var(--kui-duration-sm) var(--kui-ease-exit) forwards; }
}
@keyframes toast-in { from { opacity: 0; translate: 0 var(--kui-distance-md); } }
@keyframes toast-out { to { opacity: 0; translate: 0 var(--kui-distance-sm); } }
@keyframes toast-drain { to { scale: 0 1; } }
```

Validation. The message row always exists and stays empty when valid, so `aria-describedby` never dangles (`references/components/inputs-forms.md`).

```html
<div class="field">
  <label for="email">Email</label>
  <input id="email" type="email" name="email" autocomplete="email" aria-describedby="email-error" aria-invalid="false">
  <div class="field__error" id="email-error"><p role="alert"></p></div>
</div>
```

```css
.field__error { display: grid; grid-template-rows: 0fr; color: var(--brand-on-surface); }
.field__error > p { overflow: hidden; margin: 0; }
.field[data-invalid] .field__error { grid-template-rows: 1fr; }
.field[data-invalid] input { border-color: var(--brand-accent); }
@media (prefers-reduced-motion: no-preference) {
  .field__error { transition: grid-template-rows var(--kui-duration-md) var(--kui-ease-enter); }
}
```

Animate one row, never the whole form: `grid-template-rows` is layout work. The message names the fix ("Enter an email like name@example.com"), not just the rule.

Loading. Prefer a skeleton when the layout is known, and delay any indicator by ~300 ms so fast responses never flash.

```html
<section class="inbox" aria-busy="true" aria-labelledby="inbox-title">
  <h2 id="inbox-title">Inbox</h2>
  <ul class="inbox__list">
    <li class="skeleton" style="--i: 0" aria-hidden="true"></li>
    <li class="skeleton" style="--i: 1" aria-hidden="true"></li>
  </ul>
</section>
```

```css
.skeleton { position: relative; overflow: hidden; block-size: 4rem; margin-block-end: 0.5rem;
  border-radius: var(--brand-radius); background: color-mix(in oklab, var(--brand-muted) 22%, var(--brand-surface)); }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .skeleton::after {
    content: ""; position: absolute; inset: 0; translate: -100% 0;
    background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-surface) 65%, transparent), transparent);
    animation: skeleton-sweep calc(2 * var(--kui-duration-xl)) var(--kui-ease-linear) infinite;
    animation-delay: calc(min(var(--i, 0), 4) * var(--kui-stagger));
  }
}
@keyframes skeleton-sweep { to { translate: 100% 0; } }
```

Progress. Fill with `scaleX` on a composited layer; never animate `width`.

```html
<div class="progress" role="progressbar" aria-labelledby="upload-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
  <span class="progress__fill" style="--p: 0"></span>
</div>
<p id="upload-label">Uploading 3 of 8 files</p>
<p class="visually-hidden" role="status" id="upload-status"></p>
```

```css
.progress { block-size: 6px; border-radius: 3px; overflow: hidden;
  background: color-mix(in oklab, var(--brand-muted) 30%, var(--brand-surface)); }
.progress__fill { display: block; block-size: 100%; border-radius: inherit; background: var(--brand-primary);
  transform-origin: left; scale: var(--p) 1; }
@media (prefers-reduced-motion: no-preference) {
  .progress__fill { transition: scale var(--kui-duration-sm) var(--kui-ease-linear); }
  .progress[data-indeterminate] .progress__fill { inline-size: 30%; scale: 1;
    animation: progress-sweep calc(2 * var(--kui-duration-xl)) var(--kui-ease-linear) infinite; }
}
@keyframes progress-sweep { from { translate: -100% 0; } to { translate: 340% 0; } }
```

```js
const bar = document.querySelector('.progress');
export function setProgress(fraction, note) {           // call at 25, 50, 75, 100 %, not per byte
  bar.style.setProperty('--p', fraction);
  bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  if (note) document.getElementById('upload-status').textContent = note;
}
```

Empty state. One heading, one sentence that says why it is empty, one action. Never reuse "no data yet" copy for "no results".

```html
<section class="empty">
  <h2>No invoices yet</h2>
  <p>Invoices you create appear here, with their status and due date.</p>
  <a class="btn btn--primary" href="/invoices/new">Create your first invoice</a>
</section>
```

The no-results variant says which filter excluded everything and offers "Clear filters" before any suggestion. Error recovery keeps entered data, names the cause in plain words, and offers Retry with a `role="alert"` banner; an Undo beats a confirmation dialog for reversible actions.

```js
addEventListener('offline', () => toast({ text: 'You are offline. Changes are saved on this device.' }));
addEventListener('online', () => toast({ text: 'Back online. Syncing 2 changes.', timeout: 5000 }));
```

Framework notes: in React, render the toast stack through a portal and animate entries with Motion `AnimatePresence`; `useOptimistic` and `useTransition` give pending states without local flags. Native: Flutter `ScaffoldMessenger` with `SnackBar`, `CircularProgressIndicator`, `LinearProgressIndicator`; SwiftUI `.redacted(reason: .placeholder)` for skeletons and `ProgressView`; Compose `SnackbarHost`, `CircularProgressIndicator`, `LinearProgressIndicator`. See `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

T0 behavior, exactly:
- Toast: fades in and out in place at `--kui-duration-sm`. No rise and no slide; the timer and pause-on-hover still work.
- Undo: the item returns instantly and the list reflows once, with no collapse animation.
- Inline validation: the message fades in, the row opens instantly. Color, icon, and text still change together.
- Skeleton: static blocks at the real sizes, no sweep. `aria-busy` still announces loading.
- Spinner and indeterminate progress: a static partial ring or bar; the busy text and `aria-valuetext="Working"` carry the meaning.
- Progress determinate: the fill steps to the new value with no easing; numbers stay live.
- Empty state and error: the illustration appears with no entrance motion, and the error shows no shake or pulse. Icon, text, and Retry are identical to T3.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. Feedback never needs GPU work, and a blurred or glowing toast is not worth the paint |
| T2 | Animated toast stack and reflow, skeleton sweep with per-block stagger, tweened progress numbers, illustration entrance |
| T1 | CSS only: toast fade and rise, CSS skeleton sweep, `scaleX` progress. No JS animation loops |
| T0 | As in Reduced motion |

## Performance budget

- Toast: one `setTimeout` per visible toast, capped at 3. Never poll with `setInterval`; pausing must clear the timer.
- Skeleton: blocks paint from `background` only, one keyframe per page. Stagger with `--kui-stagger`, capped at ~200 ms total. The sweep repeats while loading and stops at T0, when the tab is hidden, and when data arrives. Empty-state art is inline SVG under ~10 KB or lazy imagery with reserved dimensions.
- Progress: write `scaleX` on a composited layer, batch updates to at most 4 per second, and update ARIA in 10 % steps or coarser.
- Inline messages: `grid-template-rows` costs layout. Animate one row for one field, never a list of rows. Keep the validation check under ~1 ms per keystroke and debounce async checks (~400 ms).

## Accessibility

- Toasts: `role="status"` (polite) for confirmations; `role="alert"` only for failures that interrupt. Keep the live region in the DOM before the first message or nothing is announced (WCAG 4.1.3). Pause on hover and focus, allow about 5 s, always provide a dismiss button (2.2.1), and place the stack where it never covers the focused element (2.4.11).
- Never carry meaning in color alone: error states need an icon and text (1.4.1). Text at 4.5:1, icons and borders at 3:1 (1.4.3, 1.4.11).
- Skeletons: `aria-busy="true"` on the region, placeholder blocks `aria-hidden="true"`, and announce completion once by replacing the content.
- Progress: `role="progressbar"` with an accessible name; `aria-valuenow` only when determinate, `aria-valuetext` when it is not. Never announce every percentage.
- Validation: `aria-invalid="true"` plus `aria-describedby` to the message; on submit failure focus the error summary or the first invalid field (3.3.1, 3.3.3).
- Empty states: a real heading and a real link or button, 24×24 CSS px minimum target (44 recommended), never an illustration alone. Error recovery keeps the input, names the failing request plainly, puts Retry first, and stops auto-retry with backoff.
- Reduced motion keeps every state change: only travel, sweep, and pulse are removed.

## Libraries

No motion library is required. In React, Motion `AnimatePresence` handles toast exit and AutoAnimate handles list restore after Undo. Native containers ship with the platform. Status and caveats: `references/libraries.md`.

## Pitfalls

- Creating the live region together with the message, so nothing is announced, or a toast that steals focus and sits over the form it just complained about. Keep one persistent region.
- Skeleton blocks that differ in size from the content, so everything jumps on resolve (CLS).
- A spinner on a 200 ms request, or a skeleton on a 100 ms one.
- A progress bar that jumps to 90 % and stalls, resets to 0 on retry, or a live region updated every frame.
- "Success!" with no object. Say what changed: "Invoice sent to Ana", and never clear the form on a server error; keep every value and mark only the failing fields.
