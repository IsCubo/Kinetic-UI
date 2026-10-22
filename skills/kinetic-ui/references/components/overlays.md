# Overlays

> Keywords: overlay, modal, dialog, dialog element, showModal, scrim, backdrop, drawer, side panel, off-canvas, bottom sheet, action sheet, popover, tooltip, command palette, command menu, spotlight, focus trap, focus restore, inert, top layer, esc to close, light dismiss, dismissible, diálogo, ventana modal, panel lateral
> Summary: How overlays behave: modal dialog, drawer, bottom sheet, popover, tooltip, and command palette, with open and close timing, focus rules, and reduced-motion and low-end behavior.

## When to use

| Overlay | Use for |
| --- | --- |
| Modal dialog | A decision or short task that must finish before the page continues (confirm, rename, pay) |
| Alert dialog | One irreversible or high-impact confirmation (delete account, discard changes) |
| Drawer | Secondary navigation, filters, or a detail panel on narrow screens |
| Bottom sheet | Mobile choices, filters, and short forms that belong to the bottom edge (thumb reach) |
| Popover | Supplementary controls or options anchored to a trigger (filters, share, date pick) |
| Tooltip | A short label or hint for an icon-only control, on hover and keyboard focus |
| Command palette | Keyboard-first navigation and actions in apps with many commands |

## When not to use

- A modal for information the user can read in place. Use an inline banner or a details region.
- A dialog for a long multi-step form. Use a page or a sheet that keeps the flow visible.
- A tooltip for the only label of a control, for touch-only flows, or for text the user must copy.
- A popover for site navigation on desktop. Use a disclosure menu in the top bar (`references/components/navigation.md`).
- A bottom sheet for a destructive action that needs a deliberate read, or two overlays at once: close the first before opening the second, or the return path is lost.
- Hover-only appearance. Every overlay needs a click, Enter, or Space path.

## How it works

Anatomy: **trigger** (stores the return focus target) · **top layer** (dialog or popover element, above all page content) · **scrim** (`::backdrop` for modals) · **panel** (surface, `--brand-radius`, optional drag handle) · **header** (title, optional close button) · **body** · **actions**. A tooltip adds an **anchor** and a **description id**; a command palette adds an **input** and a **result listbox**.

### States

| State | Trigger | Visual change | Duration token |
| --- | --- | --- | --- |
| Closed | — | Element absent from the top layer; no scrim | — |
| Opening (dialog) | `showModal()` | Panel fades in, rises `--kui-distance-md`, and scales from `--kui-scale-press`; scrim fades in | `--kui-duration-lg` |
| Opening (drawer) | `showModal()` | Panel slides in from its inline-start edge; scrim fades in | `--kui-duration-lg` |
| Opening (bottom sheet) | `showModal()` | Panel slides up one step of `--kui-distance-lg`; scrim fades in | `--kui-duration-lg` |
| Opening (popover) | Click, Enter, or Space | Panel fades in and offsets `--kui-distance-sm` from the anchor | `--kui-duration-md` |
| Opening (tooltip) | Hover intent, or keyboard focus | Label fades in next to the anchor, with no offset | `--kui-duration-sm` |
| Resting | — | Static panel, static scrim, content interactive | — |
| Hover (item) | Pointer over a row (`hover: hover`) | Row state layer 0 → 0.08 | `--kui-duration-xs` |
| Pressed | `:active` on a panel control | Scale to `--kui-scale-press` | `--kui-duration-xs` |
| Focus-visible | Tab into the panel | 2px ring inset from the panel edge, shown instantly | none (instant) |
| Dragging (sheet) | Pointer down on the handle, then move | Panel follows the pointer 1:1; scrim fades toward 0 | per frame |
| Released (sheet) | Pointer up past ~30% of height or a fast flick | Continues closed, or springs back to resting | `--kui-duration-md` |
| Selected (palette option) | Arrow keys | The active row tint and `aria-selected` move instantly | none (instant) |
| Busy (palette) | Query in flight | Static progress line under the input; rows keep their last state | `--kui-duration-sm` |
| Empty (palette) | No results | Result rows replaced by one message | none (instant) |
| Closing | Esc, close button, backdrop click, light dismiss | Reverse of opening, one step shorter, exit easing | `--kui-duration-md` |

Give the panel a visible frame from the first frame: the scrim and the panel land together, never one before the other.

## Implementation

Modal dialog. Use the native element so focus containment, Esc, `inert` background, and the top layer come from the platform.

```html
<dialog class="dialog" id="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
  <h2 id="confirm-title">Delete this project?</h2>
  <p id="confirm-desc">The project and its 12 files are removed. This cannot be undone.</p>
  <form class="dialog__actions" method="dialog">
    <button class="btn btn--secondary" type="submit" value="cancel" autofocus>Keep project</button>
    <button class="btn btn--primary" type="submit" value="delete">Delete project</button>
  </form>
</dialog>
```

```css
html:has(dialog[open]) { overflow: hidden; }          /* no scroll behind the scrim */
html { scrollbar-gutter: stable; }                    /* no layout shift when it locks */

.dialog {
  inline-size: min(32rem, calc(100vw - 2rem));
  padding: 1.5rem; border: 0; border-radius: var(--brand-radius);
  background: var(--brand-surface); color: var(--brand-on-surface); opacity: 1; translate: 0 0; scale: 1;
}
.dialog::backdrop { background: color-mix(in oklab, var(--brand-on-surface) 44%, transparent); opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .dialog {
    transition: opacity var(--kui-duration-lg) var(--kui-ease-enter),
      translate var(--kui-duration-lg) var(--kui-ease-enter),
      scale var(--kui-duration-lg) var(--kui-ease-enter),
      overlay var(--kui-duration-lg) allow-discrete,
      display var(--kui-duration-lg) allow-discrete;
  }
  :root:not([data-motion-tier="0"]) .dialog:not([open]) {
    opacity: 0; translate: 0 var(--kui-distance-md); scale: var(--kui-scale-press);
    transition-duration: var(--kui-duration-md); transition-timing-function: var(--kui-ease-exit);
  }
  @starting-style { .dialog[open] { opacity: 0; translate: 0 var(--kui-distance-md); scale: var(--kui-scale-press); } }

  .dialog::backdrop { opacity: 0; transition: opacity var(--kui-duration-md) var(--kui-ease-standard); }
  .dialog[open]::backdrop { opacity: 1; }
  @starting-style { .dialog[open]::backdrop { opacity: 0; } }
}
```

`allow-discrete` on `display` and `overlay` is what makes the exit transition run at all. Without `@starting-style`, the entry has no first frame.

```js
const dialog = document.getElementById('confirm');
const opener = document.querySelector('[data-opens="confirm"]');
opener.addEventListener('click', () => dialog.showModal());
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'delete') deleteProject();
  // The browser returns focus to the invoker; restore it yourself if that element is gone.
  if (!opener.isConnected) document.querySelector('main h1')?.focus();
});
```

Drawer and bottom sheet are the same element with a different box. A drawer hugs the inline-start edge and spans the block axis; a sheet hugs the block-end edge and never exceeds ~85% of the viewport.

```css
.drawer {
  margin: 0; inset-block: 0; inset-inline-start: 0;
  inline-size: min(20rem, 85vw); block-size: 100dvh; max-block-size: none; padding-block-end: env(safe-area-inset-bottom);
}
.drawer:dir(rtl) { inset-inline-start: auto; inset-inline-end: 0; }

.sheet {
  margin: auto auto 0; inline-size: min(40rem, 100vw); max-block-size: 85dvh;
  border-end-start-radius: 0; border-end-end-radius: 0; padding-block-end: calc(1rem + env(safe-area-inset-bottom));
}
.sheet__handle { block-size: 44px; display: grid; place-items: center; touch-action: none; }
.sheet__handle::before { content: ""; inline-size: 2.5rem; block-size: 4px; border-radius: 2px; background: var(--brand-muted); }
```

Sheet drag stays a progressive enhancement. Track `pointermove`, write `translate` on the panel, and on `pointerup` close past ~30% of the panel height or when the release velocity exceeds ~0.5 px/ms; otherwise release back. Keep the close button and Esc as the always-available path (WCAG 2.5.7).

Popover. The Popover API gives light dismiss, the top layer, and Esc for free; keep `aria-expanded` in sync on the trigger.

```html
<button class="btn btn--secondary" type="button" popovertarget="filters" aria-controls="filters">Filters</button>
<div class="popover" id="filters" popover="auto" role="group" aria-label="Filters">
  <fieldset><legend>Size</legend>…</fieldset>
</div>
```

```css
.popover {
  margin: 0; padding: 1rem; border: 0; border-radius: var(--brand-radius);
  background: var(--brand-surface); color: var(--brand-on-surface);
  box-shadow: 0 12px 32px color-mix(in oklab, var(--brand-on-surface) 18%, transparent); opacity: 1; translate: 0 0;
}
.popover:not(:popover-open) { opacity: 0; translate: 0 calc(-1 * var(--kui-distance-sm)); }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .popover {
    transition: opacity var(--kui-duration-md) var(--kui-ease-enter), translate var(--kui-duration-md) var(--kui-ease-enter),
      overlay var(--kui-duration-md) allow-discrete, display var(--kui-duration-md) allow-discrete;
  }
  @starting-style { .popover:popover-open { opacity: 0; translate: 0 calc(-1 * var(--kui-distance-sm)); } }
}
```

```js
const trigger = document.querySelector('[popovertarget="filters"]');
const panel = document.getElementById('filters');
const sync = () => trigger.setAttribute('aria-expanded', String(panel.matches(':popover-open')));
panel.addEventListener('toggle', sync);
sync();
```

Anchoring: CSS anchor positioning (`anchor-name`, `position-anchor`, `anchor()`) is the cheap path behind `@supports (anchor-name: --x)`; otherwise place the panel with `getBoundingClientRect()` and flip it when it would overflow, on open and on resize only.

Tooltip. Show on hover after a short intent delay and on keyboard focus immediately; hide on Esc, blur, or pointer leave.

```html
<button class="btn btn--icon" type="button" aria-describedby="tt-archive" data-tip="tt-archive">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#i-archive"></use></svg>
  <span class="visually-hidden">Archive</span>
</button>
<div id="tt-archive" class="tooltip" role="tooltip" hidden>Shortcut: A</div>
```

```js
const setTip = (trigger, show) => { document.getElementById(trigger.dataset.tip).hidden = !show; };
for (const trigger of document.querySelectorAll('[data-tip]')) {
  let timer;
  trigger.addEventListener('pointerenter', () => { timer = setTimeout(() => setTip(trigger, true), 400); });
  trigger.addEventListener('pointerleave', () => { clearTimeout(timer); setTip(trigger, false); });
  trigger.addEventListener('focus', () => { clearTimeout(timer); setTip(trigger, true); });
  trigger.addEventListener('blur', () => { clearTimeout(timer); setTip(trigger, false); });
  trigger.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTip(trigger, false); });
}
```

Command palette. A modal dialog that holds one combobox and one listbox. Results never animate in; only the panel does.

```html
<dialog class="dialog palette" id="palette" aria-labelledby="palette-title">
  <h2 id="palette-title" class="visually-hidden">Command palette</h2>
  <input class="palette__input" role="combobox" aria-label="Search commands" aria-controls="palette-list"
         aria-expanded="true" aria-autocomplete="list" aria-activedescendant="" autocomplete="off" placeholder="Search">
  <ul class="palette__list" id="palette-list" role="listbox" aria-label="Commands"></ul>
</dialog>
```

Arrow keys move `aria-activedescendant` and `aria-selected`; Enter runs the active option and closes; Esc closes through the dialog. Debounce remote search ~150 ms and announce the count in a `role="status"` line.

Framework notes: in React, React Aria (Dialog, Popover, Tooltip) or Radix UI supply the focus and dismiss wiring; do not re-implement a focus trap. Native: Flutter `showDialog`, `showModalBottomSheet`, `showMenu`, `Tooltip`; SwiftUI `.sheet`, `.popover`, `.alert`; Compose `Dialog`, `ModalBottomSheet`, `DropdownMenu`, `TooltipBox`. See `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

T0 behavior, exactly:
- Dialog: the panel and scrim appear in the same frame. Keep an opacity fade of `--kui-duration-sm` if you want softness; remove travel and scale.
- Drawer: no edge slide. The panel appears at its final position with the scrim.
- Bottom sheet: appears in place. Drag remains direct manipulation, but the release snaps instead of travelling.
- Popover: appears instantly under its trigger, with no offset. Light dismiss and Esc still work.
- Tooltip: appears instantly on hover intent and focus, with no drift.
- Command palette: opens instantly with no scale. Result rows update in place with no entrance animation.
- Scrim: solid from the first frame; no fade.
- The exit is symmetric: everything disappears at once, no reverse travel.
- Focus is placed and restored exactly as at T3. The state change survives; only motion goes.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. Overlays never need GPU effects, and a blurred scrim is not worth the readback |
| T2 | Velocity-aware sheet drag, JS-animated scrim opacity, anchor-positioned popover with flip, palette row hover tracking |
| T1 | CSS only: dialog, drawer, sheet, and popover transition in CSS; sheet drag disabled; the popover is placed once on open and on resize, never per scroll frame |
| T0 | As in Reduced motion |

## Performance budget

- Animate `opacity`, `translate`, and `scale` on the panel. Never animate `block-size` or `inset-block-end` for a sheet; move it with `translate`.
- One modal at a time. Each scrim is a full-viewport paint, and two stacked scrims double it for no gain.
- `backdrop-filter: blur()` on a full-screen scrim forces a full-screen readback every frame the panel moves. Use a solid scrim; allow blur only on a small panel, at T2+.
- Paint the scrim and panel in one frame before running content work: open the dialog first, then hydrate or fetch inside it.
- Virtualize palette results past ~100 rows and debounce remote queries (~150 ms). Keep the local filter pass under ~2 ms per keystroke.
- A tooltip must not measure layout on every pointer move. Position it once on show, and again on `resize`.

## Accessibility

- Modal dialog: native `<dialog>` with `showModal()` gives the APG **Dialog (Modal)** behavior, including focus containment, Esc, an inert background, and the top layer. Add `aria-modal="true"` only when you hand-roll the panel.
- Name every panel with `aria-labelledby` (its heading) and describe it with `aria-describedby` when the body carries the decision. Focus the first meaningful control, not the close button; for destructive dialogs focus the safe action.
- Restore focus to the invoker on close. If the invoker was removed, move focus to the nearest heading or main landmark (WCAG 2.4.3).
- Esc closes every overlay: dialogs, popovers, sheets, tooltips, and the palette (2.1.2, no keyboard trap). Backdrop click is never the only dismiss path.
- Tooltip: `role="tooltip"` plus `aria-describedby`. It is never the accessible name, it must be dismissible with Esc (1.4.13), it stays while the pointer is over it, and it holds no interactive content.
- Command palette: APG **Combobox** with a listbox popup, `aria-activedescendant` on the input, and `aria-selected` on exactly one option. Announce the result count politely.
- Targets: 24×24 CSS px minimum, 44×44 recommended; give the sheet handle a 44 px tall row even if the bar drawn inside is 4 px.
- Contrast: panel text 4.5:1, panel border or edge 3:1 against the scrim (1.4.11), and the focus ring 3:1 against both the panel and the scrim. Keep the ring inside the panel padding so nothing clips it (2.4.11).
- Reduced motion must preserve the appearance, the dismissal paths, and the focus result.

## Libraries

None required: `<dialog>`, the Popover API, and `role="tooltip"` cover every overlay here. In React, React Aria, Radix UI, and Headless UI provide tested primitives; focus-trap packages are unnecessary once you use `<dialog>`. Status and caveats: `references/libraries.md`.

## Pitfalls

- Removing the panel on close before the exit transition ends, or animating `display` without `allow-discrete` and `@starting-style`, so the exit never runs.
- Adding `aria-hidden="true"` to the page while a modal is open. `showModal()` already makes it inert, and double-hiding breaks focus.
- The page scrolling behind the sheet. Lock with `html:has(dialog[open])` and keep `scrollbar-gutter: stable`.
- A popover clipped by a transformed or `overflow: hidden` ancestor. Top-layer popovers escape it; a positioned fallback does not.
- Tooltips on touch: they stick after a tap or never appear. Rely on the visible label and show the tip on focus.
- Autofocus landing on the destructive button.
- Opening the palette on a keystroke that also types into the page input. Check `event.defaultPrevented` and the modifier set.
- A form closed by a backdrop click with typed data and no confirmation.
