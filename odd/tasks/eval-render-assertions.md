# Eval render assertions

Objective: let the eval runner measure the rendered page instead of searching the answer's words. Branch `feat/render-assertions`; delivery: work-unit commits, verified, then merged to `main` (the user's standing preference, "pasemos a main"). Test runner: `node scripts/test.mjs` (`node:test`).

## Specs

- **S1 Render checks in the runner.** "Cambiar las aserciones frágiles por chequeos sobre la página renderizada." "el grader puede medir la página renderizada en vez de buscar palabras". Acceptance: `evals.json` accepts a `render` check that opens a case's HTML output in headless Chrome at a stated viewport, runs a named probe, compares the measured value with the expectation, and puts the measured value in the evidence. With no HTML output or no working browser the check fails, and the evidence says why; it never passes silently. The browser session comes from the shipped capturer, so launch, timeouts and cleanup live in one place.
- **S2 Filled buttons.** "cuántos botones llenos hay". Acceptance: a probe counts the filled actions in the first screen. Assumption: an action is filled when its background contrasts at least 3:1 with the page behind it. `motion-by-feel` asserts at most one at 1440x900, from the skill rule "one primary action per view" and the three judges' "jerarquia de foco".
- **S3 Label colour.** "qué color tiene una etiqueta". Acceptance: a probe counts the distinct saturated hues in the first screen, across filled backgrounds and the text of short labels. Assumption: saturated means OKLCH chroma 0.08 or more, and hues closer than 40° count as one. `motion-by-feel` asserts at most one, from S12 of `kinetic-ui-visual-quality.md` ("One accent, one meaning").
- **S4 Plans above the fold.** "si los planes caen bajo el pliegue". Acceptance: a probe finds the option cards, meaning the smallest blocks that hold a price and an action, and reports how many have their action inside the first 1440x900 screen. `motion-by-feel` asserts that at least two options are found and that every one is inside.
- **S5 Replace the fragile assertions.** "Tres de las siete aserciones de `motion-by-feel` necesitaron corrección después de ver los resultados, porque buscan palabras, no comportamiento." Acceptance:
  - `instant-toggle` becomes a render check: after a click on the other billing period, the prices change within 50 ms, and every animation the click starts ends within 250 ms.
  - `replaces-side-slide` becomes a render check: while the page scrolls, no block moves sideways by more than 24 px as it enters.
  - Assumption: `metre-scale` (`piece-from-description`) stays a text check, because WebGL scene units cannot be observed from the DOM.
- **S6 History stays honest.** Acceptance: iterations that have outputs are regraded, and every score change is logged post hoc in `evals/README.md`, following the existing convention.
- **S7 Docs.** Acceptance: the check-type table in `evals/README.md` documents `render` and its probes.

## Tasks

- T1 — the capturer exposes a reusable browser session (`withBrowser`) and `captureAll` runs on it (S1). Route: inline. Status: done (`34f41c9`); RED: withBrowser not exported; GREEN 9/9; differential identical in normal, reduced-motion and frozen runs.
- T2 — `render` check type, the probe library and fixture tests, one passing and one failing page per probe (S1–S5). Route: inline. Status: pending.
- T3 — migrate `motion-by-feel`, add the S2–S4 checks, regrade, write the post hoc log and the docs (S5–S7). Route: inline. Status: pending.
- T4 — independent verification, then merge to `main`. Route: delegated verifier. Status: pending.

Route evidence: T1 to T3 depend on each other (T2 needs T1's API, and T3 needs T2's probes), so no writer trigger applies.

## Log

- **L1 (2026-11-20, user, verbatim):** "hagale, y solucionemos la advertencia" — then "continua", accepting this step as proposed: "**Aserciones de comportamiento (paso 4).** Ahora que el navegador funciona, el grader puede medir la página renderizada en vez de buscar palabras: cuántos botones llenos hay, qué color tiene una etiqueta, si los planes caen bajo el pliegue." The original proposal, also accepted ("si, empecemos en ese ordenn"): "**4. Cambiar las aserciones frágiles por chequeos sobre la página renderizada.** Tres de las siete aserciones de `motion-by-feel` necesitaron corrección después de ver los resultados, porque buscan palabras, no comportamiento. Con el capturador se pueden medir cosas reales: cuántos botones llenos hay, qué color tiene una etiqueta, si los planes caen debajo del pliegue."
- **L2 (2026-11-20, mapping):** `scripts/eval.mjs` grades synchronously, using `regex`, `contains`, `notContains` and `fileExists` over the concatenated output text (`matchCheck`, `gradeText`, `cmdGrade`). `evals.json` holds 69 regex and 2 fileExists checks. The README's post hoc log names three fragile assertions: `metre-scale`, `instant-toggle` and `replaces-side-slide`. The capturer (`skills/kinetic-ui/assets/snippets/capture-frames.mjs`) exports only `run`, while its launch, guard, timeouts and tab handling are internal.
