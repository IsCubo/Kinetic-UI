# Selection controls

> Keywords: selection control, checkbox, radio button, radio group, switch, toggle, segmented control, slider, range input, chips, filter chip, choice chip, tag, pill, tri-state, indeterminate, select all, bulk selection, aria-pressed, role=switch, aria-checked, keyboard selection, casilla de verificación, botón de opción, interruptor, control segmentado, deslizador
> Summary: How selection controls behave: checkbox, radio group, switch, segmented control, slider, and chips, with state timing, keyboard rules, and reduced-motion and low-end behavior.

## When to use

| Control | Use for |
| --- | --- |
| Checkbox | Zero or more independent options, one consent, or "select all" over a list |
| Indeterminate checkbox | The parent of a partially selected set (bulk actions) |
| Radio group | Exactly one of 2–7 mutually exclusive options that all stay visible |
| Switch | An on/off setting that applies immediately, with no Save step |
| Segmented control | 2–5 mutually exclusive views or values that fit side by side |
| Slider | An approximate value on a familiar scale (volume, price cap, zoom, text size) |
| Filter chips | Multi-select filters where the active set must stay visible |

## When not to use

- A switch for a value submitted with the form. A switch promises immediate effect; use a checkbox.
- A radio group for more than ~7 options, or for page-level views. Use a select, or tabs (`references/components/navigation.md`).
- A segmented control with long labels or more than 5 segments, especially on narrow screens. Fall back to a select.
- A slider for an exact number (price, quantity, year). Use a number input, or pair the two.
- Chips as navigation: a chip filters or selects, it never changes the page.
- `role="switch"` on a submitted checkbox, or `aria-pressed` on anything that also has `role="switch"`. Hiding the native input with `display: none` loses focus, keyboard support, and the accessible name.

## How it works

Anatomy: **control** (native input, 24×24 CSS px minimum, in a 44×44 row on touch) · **indicator** (box, dot, thumb, or segment surface) · **label** (always visible and part of the hit area) · optional **helper or error text** · for groups: **fieldset** with **legend**. Chips are buttons with an optional **check icon** and, for tags, a **remove control**.

### States

| State | Trigger | Visual change | Duration token |
| --- | --- | --- | --- |
| Rest | — | `--brand-surface` fill with a `--brand-muted` border at 3:1 | — |
| Hover | Pointer over the row (`hover: hover` only) | Row tint 0 → 0.08; indicator border darkens | `--kui-duration-xs` |
| Focus-visible | Tab to the control | 2px ring, 2px offset, shown instantly | none (instant) |
| Pressed | `:active` | Indicator scales to `--kui-scale-press`; row tint 0.12 | `--kui-duration-xs` |
| Checked / selected | Click, Enter, or Space | Box fills `--brand-primary`, check appears, thumb moves | `--kui-duration-sm` |
| Indeterminate | Parent of a partial set | Horizontal dash replaces the check | `--kui-duration-xs` |
| Disabled | `disabled`, or `aria-disabled` | Muted fill and text; no hover or press | none (instant) |
| Error | `aria-invalid="true"` on the control or group | Accent border, icon, and message together | `--kui-duration-sm` |
| Saving (switch) | Toggle triggers a request | Thumb takes a pending tint; `aria-busy="true"` | `--kui-duration-xs` |
| Saved (switch) | Request resolves | Pending tint clears; a status line confirms | `--kui-duration-sm` |
| Reverted (switch) | Request fails | Thumb returns to the previous end; message explains | `--kui-duration-md` |
| Dragging (slider) | Pointer down and move | Thumb grows to `--kui-scale-pop`; value bubble shows | `--kui-duration-xs` |
| Selected (chip) | Click, Enter, or Space | Fill switches to `--brand-primary`, check icon appears | `--kui-duration-sm` |
| Removing (tag) | Remove control | Chip fades and scales to `--kui-scale-press`, then leaves | `--kui-duration-sm` |

## Implementation

Checkbox and radio with `appearance: none`. Style the native input itself; never a fake box beside a hidden one.

```html
<label class="choice">
  <input class="choice__input" type="checkbox" name="topics" value="motion">
  <span>Motion</span>
</label>

<fieldset class="choice-group">
  <legend>Delivery</legend>
  <label class="choice">
    <input class="choice__input" type="radio" name="ship" value="standard" checked>
    <span>Standard, 3–5 days</span>
  </label>
  <label class="choice">
    <input class="choice__input" type="radio" name="ship" value="express">
    <span>Express, next day</span>
  </label>
</fieldset>
```

```css
.choice { display: flex; align-items: center; gap: 0.625rem; min-block-size: 44px; cursor: pointer; }
.choice__input {
  appearance: none; flex: none; display: grid; place-content: center; margin: 0;
  inline-size: 24px; block-size: 24px; border: 1px solid var(--brand-muted);
  background: var(--brand-surface); border-radius: calc(var(--brand-radius) / 2);
}
.choice__input[type="radio"] { border-radius: 50%; }
.choice__input::after { content: ""; opacity: 0; }
.choice__input[type="checkbox"]::after { inline-size: 60%; block-size: 30%; translate: 0 -10%;
  border: 2px solid var(--brand-on-primary); border-block-start: 0; border-inline-end: 0; rotate: -45deg; }
.choice__input[type="radio"]::after { inline-size: 50%; block-size: 50%; border-radius: 50%; background: var(--brand-on-primary); }
.choice__input:checked { background: var(--brand-primary); border-color: var(--brand-primary); }
.choice__input:checked::after { opacity: 1; }
.choice__input:indeterminate::after { inline-size: 60%; block-size: 2px; border: 0; rotate: 0; opacity: 1;
  background: var(--brand-on-primary); }
.choice__input:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
.choice:has(.choice__input:disabled) { opacity: 0.5; cursor: not-allowed; }
@media (hover: hover) { .choice:hover .choice__input:not(:checked, :disabled) { border-color: var(--brand-on-surface); } }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .choice__input { transition: background-color var(--kui-duration-xs) var(--kui-ease-standard),
    border-color var(--kui-duration-xs) var(--kui-ease-standard), scale var(--kui-duration-xs) var(--kui-ease-standard); }
  .choice__input::after { transition: opacity var(--kui-duration-xs) var(--kui-ease-standard); }
  .choice__input:active { scale: var(--kui-scale-press); }
}
```

Switch. `role="switch"` on a checkbox keeps the native keyboard model and announces on/off correctly.

```html
<label class="choice">
  <input class="switch" type="checkbox" role="switch" name="notify" data-endpoint="/api/notify">
  <span>Email me about replies</span>
</label>
<p class="visually-hidden" role="status" id="switch-status"></p>
```

```css
.switch { appearance: none; flex: none; position: relative; margin: 0;
  inline-size: 44px; block-size: 24px; border: 1px solid var(--brand-muted);
  border-radius: calc(var(--brand-radius) * 2); background: color-mix(in oklab, var(--brand-muted) 45%, var(--brand-surface)); }
.switch::after { content: ""; position: absolute; inset-block-start: 1px; inset-inline-start: 1px;
  inline-size: 20px; block-size: 20px; border-radius: 50%; background: var(--brand-surface);
  box-shadow: 0 1px 2px color-mix(in oklab, var(--brand-on-surface) 30%, transparent); translate: 0 0; }
.switch:checked { background: var(--brand-primary); border-color: var(--brand-primary); }
.switch:checked::after { translate: 100% 0; background: var(--brand-on-primary); }
.switch:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .switch::after { transition: translate var(--kui-duration-sm) var(--kui-ease-standard); }
}
```

`translate: 100%` is the thumb's own width, so the travel stays correct at any track size without a hard-coded distance.

```js
const status = document.getElementById('switch-status');
document.addEventListener('change', async (event) => {
  const input = event.target.closest('input[role="switch"][data-endpoint]');
  if (!input) return;
  const previous = !input.checked;
  input.setAttribute('aria-busy', 'true');
  try {
    const res = await fetch(input.dataset.endpoint, { method: 'PUT', body: JSON.stringify({ on: input.checked }) });
    if (!res.ok) throw new Error(String(res.status));
    status.textContent = input.checked ? 'Notifications on' : 'Notifications off';
  } catch {
    input.checked = previous;                     // revert, then say why
    status.textContent = 'Not changed. Check your connection and try again.';
  } finally { input.removeAttribute('aria-busy'); }
});
```

Segmented control. Radios in a group; the raised surface marks the checked item. The sliding surface is a T2 enhancement measured once per change.

```html
<fieldset class="segmented">
  <legend class="visually-hidden">View</legend>
  <label><input type="radio" name="view" value="list" checked><span>List</span></label>
  <label><input type="radio" name="view" value="grid"><span>Grid</span></label>
</fieldset>
```

```css
.segmented { display: inline-flex; gap: var(--kui-distance-sm); margin: 0; padding: var(--kui-distance-sm);
  border: 1px solid var(--brand-muted); border-radius: var(--brand-radius); }
.segmented label { position: relative; display: flex; }
.segmented input { position: absolute; inset: 0; margin: 0; opacity: 0; }
.segmented span { padding: 0.4rem 1rem; border-radius: calc(var(--brand-radius) - var(--kui-distance-sm)); }
.segmented input:checked + span { background: var(--brand-primary); color: var(--brand-on-primary); }
.segmented input:focus-visible + span { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .segmented span { transition: background-color var(--kui-duration-sm) var(--kui-ease-standard),
    color var(--kui-duration-sm) var(--kui-ease-standard); }
}
```

Slider. The native range input with `accent-color` is the cheapest correct path: it keeps the keyboard map and forced-colors support. Style the track only when the design demands it, keep a visible value, and update that output in the `input` handler at most once per frame.

```html
<label for="size">Text size</label>
<input id="size" class="slider" type="range" min="12" max="24" step="1" value="16" aria-describedby="size-value">
<output id="size-value" for="size">16 px</output>
```

```css
.slider { inline-size: 100%; accent-color: var(--brand-primary); }
.slider:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 4px; }  /* ring outside the track */
.slider::-webkit-slider-thumb { inline-size: 24px; block-size: 24px; }   /* 24px target, per engine */
.slider::-moz-range-thumb { inline-size: 24px; block-size: 24px; border: 0; }
```

Chips. Filter chips are toggle buttons with `aria-pressed`; removable tags carry a name that says "Remove".

```html
<div class="chip-row" role="group" aria-label="Dietary filters">
  <button class="chip" type="button" aria-pressed="true">Vegan<span class="chip__check" aria-hidden="true"></span></button>
  <button class="chip" type="button" aria-pressed="false">Gluten free<span class="chip__check" aria-hidden="true"></span></button>
</div>
<button class="chip" type="button" aria-label="Remove filter: Under $50">Under $50<span aria-hidden="true">×</span></button>
```

```css
.chip { display: inline-flex; align-items: center; gap: 0.4rem; min-block-size: 32px; padding-inline: 0.75rem;
  border: 1px solid var(--brand-muted); border-radius: calc(var(--brand-radius) * 2);
  background: var(--brand-surface); color: var(--brand-on-surface); }
.chip[aria-pressed="true"] { background: var(--brand-primary); border-color: var(--brand-primary); color: var(--brand-on-primary); }
.chip__check { inline-size: 0.5rem; block-size: 0.25rem; border: 2px solid currentColor; border-block-start: 0; border-inline-end: 0; rotate: -45deg; scale: 0; }
.chip[aria-pressed="true"] .chip__check { scale: 1; }
.chip:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .chip, .chip__check { transition: background-color var(--kui-duration-sm) var(--kui-ease-standard),
    color var(--kui-duration-sm) var(--kui-ease-standard), scale var(--kui-duration-sm) var(--kui-ease-standard); }
  .chip:active { scale: var(--kui-scale-press); }
}
```

Bulk selection: after every change, set `parent.checked = allSelected` and `parent.indeterminate = some && !all`. `indeterminate` is a property, so an HTML attribute does nothing.

Framework notes: in React, keep native inputs controlled (`checked` plus `onChange`) and reach for React Aria `useCheckbox`, `useSwitch`, or `useSlider` only when custom markup is unavoidable. Native: Flutter `Checkbox`, `RadioListTile`, `Switch`, `SegmentedButton`, `Slider`, `FilterChip`; SwiftUI `Toggle`, `Picker(.segmented)`, `Slider`; Compose `Checkbox`, `RadioButton`, `Switch`, `SegmentedButton`, `Slider`, `FilterChip`. See `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

T0 behavior, exactly:
- Checkbox and radio: the box fills and the check or dot appears with an opacity fade of `--kui-duration-xs`. No scale, no draw-on.
- Switch and segmented control: the thumb jumps to the other end and the raised surface moves instantly, with no travel. Fill and position still carry the state.
- Slider: the thumb does not grow while dragging, and the fill updates without easing. The value output stays live.
- Chips: selection swaps color and shows the check in `--kui-duration-xs`; a removed tag disappears at once and the row reflows one time.
- Error, saving, and focus states: color, icon, and text change in `--kui-duration-xs` or instantly, and the focus ring is never animated. Nothing pulses.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. Selection controls never need GPU effects |
| T2 | Sliding segmented surface, thumb scale while dragging, chip removal collapse, drawn check on one featured control |
| T1 | CSS only: color and opacity transitions, thumb `translate`, press scale. No measured indicator |
| T0 | As in Reduced motion |

## Performance budget

- Animate `translate`, `scale`, `opacity`, and `background-color` on the indicator only. The switch thumb moves with `translate` so it stays on the compositor; a `left` transition repaints the row every frame.
- Delegate listeners on the container for long checkbox lists. If you use `content-visibility`, keep the focused row rendered.
- Slider: write the value output in the `input` handler, at most once per frame. Never measure the track on every pointer move.
- Bulk selection: update `indeterminate` in one pass after the change, not once per row.

## Accessibility

- Use native inputs, always. `div role="checkbox"` requires re-implementing Space, focus, and the accessible name.
- Every control needs a programmatic label; a wrapping `<label>` also gives the 44 px row target. Minimum target is 24×24 CSS px (WCAG 2.5.8), and the focus ring must stay visible on the 24 px input even when the drawn indicator is larger.
- Groups: `<fieldset>` with `<legend>` for radios and related checkboxes. Radio keyboard: Tab enters and leaves the group once, arrows move and select, and native radios do this as long as every radio shares one `name`.
- Switch: `role="switch"` on the checkbox; Space toggles it and Enter does not, matching platform expectations.
- Chips: `aria-pressed="true|false"` for filter chips, kept in sync with the visible state. A removable tag's accessible name includes "Remove".
- Slider: the native input provides arrows, Home, End, Page Up, and Page Down. Label it, describe the current value, and never make it the only way to set a precise number (2.5.7).
- Contrast: unchecked border and switch track at 3:1 against the surface (1.4.11); a checked state also carries a check or a thumb position, never color alone (1.4.1).
- Disabled controls are not focusable; when the value still matters, use `aria-disabled="true"` and keep it in the tab order. Errors go in text, linked with `aria-describedby`, with one group-level message on the fieldset.

## Libraries

None needed. In React, React Aria and Radix UI provide accessible switch, slider, and segmented primitives; a headless checkbox library is unnecessary. Status and caveats: `references/libraries.md`.

## Pitfalls

- Hiding the input with `display: none` or `visibility: hidden`. Nothing is focusable and screen readers see no control.
- Setting `indeterminate` as an HTML attribute (it is a property), or radios without a shared `name`, so arrows do not move and more than one can be checked.
- A switch for a saved form value, so the UI claims the change already applied, or a slider with no visible value and no steps.
- A chip whose accessible name reads "Vegan times" because the removal glyph is not hidden, or a group that re-renders on each change so focus drops mid-selection.
- Animating the thumb or the segmented surface with `left` or `width` instead of `translate`.
- `aria-pressed` on a switch, or `role="switch"` plus `aria-checked` on the same element.
