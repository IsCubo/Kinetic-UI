# Inputs and forms

> Keywords: text field, input, floating label, label, helper text, validation, validation timing, inline error, error message, user-invalid, aria-invalid, password reveal, show password, OTP, one-time code, verification code, file upload, file drop, dropzone, drag and drop upload, multi-step form, wizard, stepper, formulario, campo de texto
> Summary: How text fields and forms behave: anatomy, floating labels, when to validate, inline errors, password reveal, OTP, file drop, and multi-step flows, with reduced-motion and low-end rules.

## When to use

| Pattern | Use when |
| --- | --- |
| Text field, top label | Default for every form, especially long or dense ones |
| Floating label | Space is tight and the form is short (sign-in, search, checkout on mobile) |
| Inline errors | Always. Each error sits under its field and says how to fix it |
| Password reveal | Every password field, sign-up and sign-in |
| OTP field | Verification codes from SMS, email, or an authenticator app |
| File drop | Uploads where users often drag from the desktop (assets, documents) |
| Multi-step form | More than ~7 fields that split into clear groups (shipping → payment → review) |

## When not to use

- Placeholder text as the only label. It disappears on input and usually fails contrast.
- Floating labels in long data-entry forms. The small floated text slows scanning, so use top labels.
- Six separate OTP inputs. They break paste, autofill, and screen-reader reading. Use one input.
- A drop zone without a real `<input type="file">`. Keyboard and touch users cannot drag.
- A multi-step form for a handful of fields. Each step adds a page of friction.
- Shake animations on every error. Reserve them for code-style inputs (OTP, PIN).

## How it works

Anatomy: **label** · **control** (`<input>`) · **helper text** · **error message** (always in the DOM, empty when valid) · optional **affordance** (reveal button, clear button, unit) · optional **counter**. A multi-step form adds a **step indicator**, one **fieldset per step**, and **Back/Next** actions.

### Validation timing

| Moment | Validate | Why |
| --- | --- | --- |
| While typing, before any error | Nothing (live hints such as password rules may update) | Do not report errors before the user finishes |
| Blur with a value | That field | The user finished the field |
| After an error is shown | On every input; clear it the moment it is fixed | Immediate reward for the fix |
| Submit | All fields; focus the first invalid field | Catches required fields never visited |
| Async checks (username taken) | Debounced ~400 ms after typing stops | Avoids request spam and flicker |

CSS-only timing: `:user-invalid` matches only after the user interacts or submits, unlike `:invalid`.

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest | — | 1px border `--brand-muted` | — | — |
| Hover | Pointer over the field | Border darkens | `--kui-duration-xs` | `--kui-ease-standard` |
| Focus | Focus | 2px border `--brand-primary`; floating label moves up and scales to 0.8 | `--kui-duration-sm` | `--kui-ease-standard` |
| Filled | Has a value | Floating label stays up | none (instant) | — |
| Invalid | Blur or submit fails | Error color border; message row opens (grid rows 0fr → 1fr) and fades in | `--kui-duration-md` | `--kui-ease-enter` |
| Fixed | Input clears the error | Message fades out and the row closes | `--kui-duration-sm` | `--kui-ease-exit` |
| Rejected code | Wrong OTP | Two-cycle shake of `--kui-distance-sm` | `--kui-duration-md` | `--kui-ease-standard` |
| Drag over | Files dragged over the zone | Dashed border turns solid, surface tint | `--kui-duration-sm` | `--kui-ease-standard` |
| Uploading | File accepted | Progress fill follows real bytes | per update | `--kui-ease-linear` |
| Step change | Next or Back | Incoming step fades in and slides `--kui-distance-md` from the travel direction | `--kui-duration-md` | `--kui-ease-enter` |

## Implementation

Text field with floating label (label first in the DOM; `placeholder=" "` enables `:placeholder-shown`):

```html
<div class="field">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" required
         placeholder=" " aria-describedby="email-error" data-error="Enter an email like name@example.com">
  <div class="field__error-row"><p id="email-error" class="field__error"></p></div>
</div>
```

```css
.field { position: relative; display: grid; }
.field input {
  padding: 1.4rem 0.75rem 0.5rem; font: 1rem var(--brand-font-body);
  color: var(--brand-on-surface); background: var(--brand-surface);
  border: 1px solid var(--brand-muted); border-radius: var(--brand-radius);
}
.field input:focus { outline: 2px solid var(--brand-primary); outline-offset: -1px; }
.field label {
  position: absolute; inset-block-start: 1rem; inset-inline-start: 0.75rem;
  transform-origin: left top; pointer-events: none; color: var(--brand-on-surface);
}
.field:has(input:focus, input:not(:placeholder-shown)) label { translate: 0 -0.6rem; scale: 0.8; }
.field__error-row { display: grid; grid-template-rows: 0fr; }
.field__error { overflow: hidden; margin: 0; opacity: 0; color: #b3261e; } /* use your status color at 4.5:1 */
.field:has([aria-invalid="true"]) .field__error-row { grid-template-rows: 1fr; }
.field:has([aria-invalid="true"]) .field__error { opacity: 1; }
.field:has([aria-invalid="true"]) input { border-color: #b3261e; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .field label {
    transition: translate var(--kui-duration-sm) var(--kui-ease-standard), scale var(--kui-duration-sm) var(--kui-ease-standard);
  }
  .field__error-row { transition: grid-template-rows var(--kui-duration-md) var(--kui-ease-enter); } /* layout cost: one row */
  .field__error { transition: opacity var(--kui-duration-md) var(--kui-ease-enter); }
}
```

Validation timing (native constraints, custom messages):

```js
const form = document.querySelector('form');
form.noValidate = true;
function check(input) {
  const valid = input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  document.getElementById(`${input.id}-error`).textContent = valid ? '' : (input.dataset.error ?? input.validationMessage);
  return valid;
}
form.addEventListener('focusout', (e) => { if (e.target.matches('input[id]') && e.target.value) check(e.target); });
form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
form.addEventListener('submit', (e) => {
  const fields = [...form.querySelectorAll('input[id][aria-describedby]')];
  const firstInvalid = fields.filter((f) => !check(f))[0];
  if (firstInvalid) { e.preventDefault(); firstInvalid.focus(); }
});
```

Password reveal. Keep a constant label and use `aria-pressed`. Switch back to `password` on submit so browsers offer to save it.

```html
<input id="pw" type="password" autocomplete="current-password" required>
<button type="button" class="field__reveal" aria-controls="pw" aria-pressed="false">Show password</button>
```

```js
const pw = document.getElementById('pw');
const reveal = document.querySelector('[aria-controls="pw"]');
reveal.addEventListener('click', () => {
  const show = reveal.getAttribute('aria-pressed') !== 'true';
  reveal.setAttribute('aria-pressed', String(show));
  pw.type = show ? 'text' : 'password';            // focus stays on the button
});
pw.form.addEventListener('submit', () => { pw.type = 'password'; reveal.setAttribute('aria-pressed', 'false'); });
```

OTP. Use one input, which supports paste, SMS autofill, and screen readers. Draw the boxes with CSS if the design needs them.

```html
<label for="otp">Verification code</label>
<input id="otp" name="otp" class="otp" inputmode="numeric" autocomplete="one-time-code"
       pattern="[0-9]{6}" maxlength="6" required aria-describedby="otp-hint otp-error">
<p id="otp-hint">Enter the 6-digit code sent to your phone. It is checked when all 6 digits are in.</p>
<p id="otp-error" class="field__error"></p>
```

```css
@keyframes otp-shake { 25% { translate: calc(-1 * var(--kui-distance-sm)) 0; } 75% { translate: var(--kui-distance-sm) 0; } }
@media (prefers-reduced-motion: no-preference) {
  .otp[aria-invalid="true"] { animation: otp-shake var(--kui-duration-md) var(--kui-ease-standard) 2; }
}
```

```js
const otp = document.getElementById('otp');
otp.addEventListener('input', () => {
  otp.value = otp.value.replace(/\D/g, '').slice(0, 6);
  if (otp.value.length === 6) otp.form.requestSubmit();   // announced in the hint (WCAG 3.2.2)
});
```

File drop. The native input is the accessible path, and dragging is an enhancement on top of it.

```html
<input id="files" class="visually-hidden" type="file" name="files" multiple accept="image/*,.pdf">
<label for="files" class="drop">Drop files here or <u>choose files</u><br><small>PNG, JPG, or PDF, up to 10 MB each</small></label>
<ul class="drop__list" aria-live="polite"></ul>
```

```js
const zone = document.querySelector('.drop');
const input = document.getElementById('files');
let depth = 0;                                   // dragenter/dragleave also fire for child nodes
zone.addEventListener('dragenter', (e) => { e.preventDefault(); depth += 1; zone.dataset.state = 'over'; });
zone.addEventListener('dragover', (e) => e.preventDefault());
zone.addEventListener('dragleave', () => { depth -= 1; if (depth === 0) delete zone.dataset.state; });
zone.addEventListener('drop', (e) => {
  e.preventDefault(); depth = 0; delete zone.dataset.state;
  input.files = e.dataTransfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));  // one code path for drop and picker
});
```

Show focus on the label with `#files:focus-visible + .drop { outline: 2px solid var(--brand-accent); }`. Use determinate progress per file (`references/components/feedback.md`).

Multi-step forms. Give each step a `<fieldset>` with a heading that has `tabindex="-1"`. Mark the indicator item with `aria-current="step"`. Validate the current step before Next, keep all values when going Back, and end with a review step.

```js
function goTo(steps, from, to) {
  steps[from].hidden = true;
  steps[to].style.setProperty('--dir', to > from ? 1 : -1);
  steps[to].hidden = false;
  steps[to].querySelector('h2').focus();          // announces "Step 2 of 4: Payment"
}
```

```css
.step:not([hidden]) { animation: step-in var(--kui-duration-md) var(--kui-ease-enter); }
@keyframes step-in { from { opacity: 0; translate: calc(var(--dir, 1) * var(--kui-distance-md)) 0; } }
```

Native: Flutter `TextFormField` with `autovalidateMode: AutovalidateMode.onUserInteraction`; SwiftUI `TextField`, `SecureField`, `.textContentType(.oneTimeCode)`; Compose `OutlinedTextField` with `isError` and `supportingText`. See `references/platforms/`.

## Reduced motion

T0 behavior, exactly:
- The floating label snaps to its floated position with no transition. The OS query and `:root:not([data-motion-tier="0"])` both guard it.
- The error message appears with an opacity fade only. Under T0, set its duration to `--kui-duration-sm`, because `--kui-duration-md` stays 250 ms. The grid row opens instantly.
- OTP shake: none. The distance tokens become 0, and the error text plus the border color carry the message.
- Step change: crossfade only (`.step:not([hidden]) { animation-duration: var(--kui-duration-sm); }` under reduce and T0), with no slide.
- Drag-over: the color change stays and the scale is removed.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2 |
| T2 | All states animated; per-file upload progress; direction-aware step slides; optional success check on the final step |
| T1 | CSS only: label float, error row reveal, step fade. JS still runs validation but no JS animation |
| T0 | As in Reduced motion. Every message and state stays, only motion goes |

## Performance budget

- Validation must never block typing: debounce async checks and keep per-keystroke work under ~1 ms.
- `grid-template-rows` animates layout. Keep it to the single error row that changes, never to the whole form.
- No layout-animating label effects (font-size, padding). Use `translate` and `scale` only.
- Uploads: read files in chunks. Never `FileReader` a large file on the main thread just for a preview; use `URL.createObjectURL`.

## Accessibility

- Every control has a programmatic `<label>` (WCAG 1.3.1, 3.3.2). Group related controls in `<fieldset>` and `<legend>`.
- Errors: `aria-invalid="true"` on the field, and the message is linked with `aria-describedby` (3.3.1). Text says how to fix it (3.3.3). Do not rely on color alone (1.4.1).
- On submit with errors, move focus to the first invalid field or to an error summary that links to each field.
- `autocomplete` tokens on personal-data fields (1.3.5): `email`, `current-password`, `new-password`, `one-time-code`.
- Password reveal follows the APG **Button** pattern as a toggle button (`aria-pressed`).
- Multi-step: announce the step change by focusing the step heading, and expose progress with `aria-current="step"`.
- Dragging files is never the only way (2.5.7). The native picker covers keyboard and touch.
- Do not time out forms silently (2.2.1). Warn and allow extending.

## Libraries

No motion library is needed. In React, Motion (`AnimatePresence`, `layout`) can animate step and message changes, and AutoAnimate can animate the file list. Status and caveats: `references/libraries.md`.

## Pitfalls

- Validating on every keystroke from the first character, so "invalid email" shows before the user types the `@`.
- A `hidden` error element referenced by `aria-describedby` still gets read. Keep it present but empty.
- `type="number"` for codes, card numbers, or ZIP codes. It strips leading zeros and adds spinners. Use `inputmode="numeric"`.
- Auto-submitting the OTP without saying so in the hint, or with no Verify button for users who paste slowly.
- Clearing the whole form on a server error. Keep the values and mark only the failing fields.
- Step transitions that move focus to `<body>`. Always focus the new step's heading.
