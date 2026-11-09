# Critique

> Keywords: critique, design critique, design review, UI review, design audit, heuristic evaluation, scorecard, severity, severity levels, blocker, major, minor, findings, evidence, screenshot, capture widths, 360, 768, 1440, surface mode, visual audit, contrast audit, keyboard pass, reduced motion check, tier fallback check, second opinion, prioritized fixes, what to fix first, quality review, unverified, re-check, design QA, dead button, unwired control, no script, button does nothing, functional check, source-provable, evaluación de diseño, revisión de diseño, crítica de diseño
> Summary: How to judge an interface with evidence: functional reality check, capture set, surface mode, ten dimensions scored 0–4 with anchors, severity levels, source-provable findings when nothing renders, one-line findings, and a re-check scope.

This file judges a result. It does not build, style, or choose effects; open the implementation files for that. Critique answers one question: given what the user actually sees, what is wrong, how bad is it, and what is the smallest change that fixes it.

One stage of the skill's direction → build → verify → critique loop; the loop itself is `references/workflow/loop.md`.

## When to use

| Situation | Use critique | Why |
| --- | --- | --- |
| A build or redesign just finished | Yes, after the verify pass | The author's last look confirms intent, not result |
| An interface exists and nobody has reviewed it | Yes | The scorecard finds regressions nobody tested |
| After a fix in this loop | Yes, scoped to what changed | Verify proves the fix works; critique proves it broke nothing |
| A single component needs a second opinion | Yes, scoped to that region | One region, one capture, same dimensions |
| Nothing is rendered and nothing can be | Yes, but the verdict is "unverified" | Code is not evidence (`## Evidence rule`) |
| The work is still in mockups | No | Judge the render, not the mockup |

## Evidence rule

Judge what renders. A rule that was written but never observed is a claim, not a finding — except for the closed set of source-provable facts in the table below, which no viewport, state, or browser can change.

| Counts as evidence | Does not count |
| --- | --- |
| Full-page screenshots at the capture widths in `## Procedure` | Source as a substitute for what renders (`## Functional reality check` is the only exception) |
| A screen recording of one real task, 30–60 s | The author's description of the animation |
| Measured numbers: contrast ratio, LCP, INP, CLS, frame time, computed token values, animation counts from `assets/snippets/verify-motion.js` | "Looks good", "feels fast", a design mockup |
| The same capture with `prefers-reduced-motion: reduce` and `data-motion-tier="0..3"` forced | A claim that reduced motion is handled |
| Both themes, if the product ships both | Light theme only, with the dark theme assumed to match |
| Source-provable facts: an unwired control, a rule with no override anywhere, a contrast ratio between two flat colors, an image with no intrinsic size | Any claim about layout, spacing, type rendering, timing, or performance read from source |

Rules:

1. Use the product's real widths, not a resized window that hides overflow. Read the viewport width from the browser, not from the device name.
2. Capture both themes when `prefers-color-scheme` or a theme switch exists; glows, shadows, noise, and borders change with the scheme.
3. Force each motion tier you claim to support and capture the T0 state; a fallback that exists only in code is unverified.
4. If the interface cannot be rendered, say exactly why in one line, mark every rendering-dependent dimension `unverified`, and set the score to `unverified`. Do not turn code reading into a score.
5. Keep captures in one folder with the names from `## Findings format` so a finding can be checked without a second run.
6. `unverified` covers the score, not every claim. A fact that does not change with viewport, state, or browser is provable from the source and belongs in the findings with a `[blocker]`, `[major]`, or `[minor]` label. The closed list: a control with no handler, no script, or no destination; a global rule that removes an affordance with no replacement anywhere in the stylesheet; a contrast ratio computed between two flat colors; an image with no intrinsic size; a declared animation with no `prefers-reduced-motion` block.
7. Name the source-provable findings as such. Never mix them into the score, and never let an unrendered run report only `unverified` when a provable blocker exists.

## Functional reality check

Run this before any visual judgment, rendered or not. A page whose primary action does nothing has no visual quality worth scoring, and this is the one class of defect that a source read proves outright.

| Check | How | Failure means |
| --- | --- | --- |
| The primary action is wired | Find a `<script>`, a form `action`, a real `href`, or an event handler that reaches it | The page cannot complete its own task — blocker |
| Every shown control does something | For each `button`, `a`, and input: handler, destination, or an explicit disabled state | A control that looks active and is inert — blocker on a money path, major elsewhere |
| The state it claims is the state it renders | Toggle handlers versus the markup the user first sees | A control stuck in one state — major |
| Nothing is a dead end | An empty `href="#"`, a `type="button"` with no handler, a form that submits nowhere | Dead end on a task path — blocker |

Report the result as one line per control the first time, then only the failures. Skip the check when the input is a screenshot, a video, or a live URL you already drove.

## Procedure

1. **Functional reality check.** Run `## Functional reality check` from the source, rendered or not. Its failures enter the findings with severity before any capture is scored.
2. **Capture.** Take the full set below at a device pixel ratio of 1, then one 2× crop of the primary action and the smallest body text to judge type rendering.
3. **Name the surface mode.** Product UI, content and commerce, or brand and marketing. The mode sets what is expected and the tier cap; the same empty state is fine on a brand page and a defect in a dashboard.
4. **Score the ten dimensions** against the anchors in `## Scorecard`. Score what the captures show, not what the code intends. Leave an unrendered run unverified.
5. **List findings** in the format from `## Findings format`, one issue per line, sorted by severity.
6. **Fix** blockers first, as `references/workflow/loop.md` orders them; one smallest change per finding, batched only while the batch stays reviewable. Keep every passing element.
7. **Re-check only what changed**, using the scope table below, and re-capture only the affected widths.
8. **Report** with `## Interpreting the score`; hand off per `## Handoff`.

| Capture | Width | What it proves |
| --- | --- | --- |
| C1 phone | 360 CSS px, full page | one column, overflow, thumb reach, target size |
| C2 tablet | 768 CSS px, full page | column change, navigation mode, two-pane behavior |
| C3 desktop | 1440 CSS px, full page | measure, whitespace, hierarchy, hover affordance |
| C4 product breakpoint | the content's real breakpoint, where the layout changes | the layout the work claims to support |
| C5 fold | 360×740 and 1440×900, above the fold | the LCP element and the first impression |
| C6 focus and states | 1440 and 360, keyboard only, plus one task clip | focus order, focus visibility, feedback timing |

| Change made in the fix | Re-capture | Re-score |
| --- | --- | --- |
| Grid, breakpoint, or spacing | C1–C4 | layout and spacing, hierarchy |
| Color, surface, border, or shadow | affected widths, both themes | color and contrast, hierarchy |
| Type scale, weight, or measure | C3 plus the 2× crop | typography, hierarchy |
| An interaction state | C6 plus the task clip | states and feedback, accessibility |
| A delay, easing, or tier gate | C6 with T0 and the changed tier forced | motion, performance |
| A copy string | the width where the string renders | copy, layout and spacing |
| A heading, landmark, or label | C6 keyboard pass | accessibility, hierarchy |

| Surface mode | Signs | Judged against | Tier cap |
| --- | --- | --- | --- |
| Product UI | forms, tables, settings, dashboards | task completion screen by screen | T1, T2 for gesture-heavy |
| Content and commerce | article, feed, catalog, checkout | the reading or buying path and its end | T2 |
| Brand and marketing | hero, campaign, portfolio, launch | the brief's visual world and its one signature moment | up to T3 |

Surface expectations and the motion budget per mode: `references/foundations/ui-patterns.md`.

## Scorecard

Score each dimension 0–4. Use 1 or 3 when the row below and the row above both partly apply, and name in the finding which clauses fail.

| Dimension | 0 | 2 | 4 | Collect |
| --- | --- | --- | --- | --- |
| Hierarchy | Three or more elements compete at one level; the blur test cannot rank them | One primary action is clear, but a secondary block matches its size or weight | Blur test yields the intended order; one primary action per view; only the focal element moves | C3, C5 blur test |
| Layout and spacing | Gaps follow no scale (e.g. 13, 17, 22 px) and the page overflows horizontally at 360 | Spacing inside sections is consistent but section gaps use off-scale values | One spacing scale; gap between groups ≥ 2× the gap inside them; no horizontal scroll at any capture | C1–C4, `scrollWidth` |
| Typography | Body under 16 px, measure over 90 characters, or more than three weights with no roles | Readable body, but line-height under 1.4 or display steps within 1.2× of each other | Visible type steps; body 16–18 px at line-height 1.5; measure 45–75 characters; roles clear | C3, 2× crop |
| Color and contrast | Any body text under 4.5:1, any UI part under 3:1, or meaning carried by color alone | Text passes but muted text, placeholders, or borders fail, or one theme loses a surface edge | Every pair measured and passing in both themes; states carry icon or text as well | C3, C1, both themes |
| States and feedback | Actions show no visible change within 100 ms; empty, error, or loading state missing | Happy path complete; one state missing or feedback later than 400 ms | Rest, hover, press, focus, disabled, loading, empty, error, success all present; busy state in place | C6, task clip |
| Motion | Motion has no named purpose, reduced motion is unhandled, or a loop runs beside text | Purposes named, but timing is off-token or one effect ignores T0 | Every animation names one purpose and uses the motion tokens; T0 exact; interruptible | C6, forced T0 and tiers |
| Copy | Labels use internal jargon; errors state neither cause nor fix | Plain language, but repeated labels ("Learn more" twice) or a heading that misses its content | Every label names the action or object; one name per concept; errors state cause and fix | C1–C3 |
| Accessibility | Keyboard cannot reach an interactive element, focus is invisible, or there is no heading or landmark | Keyboard works, but focus is clipped or obscured, or one control has no accessible name | Keyboard and screen-reader pass; focus never obscured; targets ≥ 24 px, 44 px on touch; reduced motion honored | C6, forced T0 |
| Performance | LCP over 4 s, INP over 500 ms, or CLS over 0.25 caused by the design | In the "needs improvement" band: LCP 2.5–4 s, INP 200–500 ms, or CLS 0.1–0.25 | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; no task over 50 ms during the main interaction at 4× CPU | C5, DevTools traces |
| Distinctiveness | Interchangeable with a template; the layout survives a logo swap | One distinctive element (type, color, or motion) with a default frame around it | The brief's visual world reads at first glance and survives with the logo and images removed, at T0 | C1, C3, stripped capture |

Dimensions are judged independently. A perfect typography score never offsets an unreachable checkout button: see `## Interpreting the score`.

Sources for the checks: `references/foundations/ux-principles.md` (hierarchy, feedback, heuristics), `references/foundations/accessibility-motion.md` (contrast, focus, T0), `references/foundations/performance-tiers.md` (budgets, tier limits).

## Severity

Severity comes from user impact, never from how hard the fix is.

| Level | Definition | Ship decision |
| --- | --- | --- |
| Blocker | A user cannot complete a task, or a group is excluded, or trust is broken on a path that spends money | Stop; fix before any further build |
| Major | A task completes, but slower, with a wrong assumption, or with visible damage to trust | Fix in this pass; name it if it ships |
| Minor | No effect on task, accessibility, or metrics; visible only on comparison | Fix if it is one line; otherwise log it |

| Level | Examples |
| --- | --- |
| Blocker | The recommended plan's CTA sits off screen at 360 px with `scrollWidth` 412 > 360 · Body text measures 3.1:1 against its surface · A dialog traps keyboard focus with no Escape handler · The primary CTA has no handler and the document ships no script, so pressing it does nothing |
| Major | Primary submit gives no feedback for 1.8 s and stays clickable · Hero LCP is 4.1 s because a 3D chunk blocks the poster · Hover-only row actions are unreachable on touch |
| Minor | Section gap is 40 px beside 32 px siblings · Two hovers use different easing curves for the same role · One toast says "Done" where the rest say "Saved" |

Rules:

1. Severity is per finding. A blocker at one capture width blocks the page, even when every other width is clean.
2. Raise one level when the finding sits on the path that spends money, or when it reproduces in both themes, because one defect then reaches twice the people.
3. Never lower a level because the fix is expensive. Cost belongs to the fix plan, not to the severity.
4. `unverified` is a verdict and a dimension state, never a severity.

## Findings format

One issue per line, exactly this shape:

```text
[severity] where — observed — why it matters — fix
```

| Field | Must contain |
| --- | --- |
| `severity` | `blocker`, `major`, or `minor`, from `## Severity` |
| `where` | A selector or a named region plus the capture it is visible in, e.g. `.plan--recommended .cta @ C1`; for a source-provable finding, the selector plus the markup or rule that proves it, e.g. `.hero .cta @ script scan: no `<script>` in document` |
| `observed` | A measurement: pixels, ratio, milliseconds, count, or a named element state. Not an adjective |
| `why it matters` | The user effect in one clause: task lost, group excluded, trust lost, time added |
| `fix` | The smallest concrete change, naming the token or property to use |

Example:

```text
[blocker] .plan--recommended .cta @ C1 — the button starts 38 px below the fold and the grid overflows to scrollWidth 412 on a 360 px viewport — plan selection is unreachable one-handed on a phone — switch the grid to one column under 768 px and keep the recommended plan first
```

A motion finding uses the same shape, with the measurement in `observed`:

```text
[major] .feed > .card @ C6 — 24 cards enter with a 40 ms stagger, so the last card lands at 960 ms while the list is already scrollable — readers wait for content that already exists — cap the total stagger at ~300 ms and stagger groups, not every row
```

Rules:

1. One issue per line. Two fixes in one line cannot be verified separately.
2. Every motion finding names the trigger, the animated property, and the token that should run. "The card animation" is not a finding; "hover on `.card` translates 12 px over 450 ms with `ease-in-out` instead of `--kui-duration-sm` and `--kui-ease-standard`" is.
3. Name the concrete change whenever a subjective word appears. Ban `modern`, `clean`, `pop`, `polished`, `engaging`, and `premium feel` unless the same line states what to change.
4. Every finding cites where it was observed: a capture id, or, for a source-provable fact, the selector plus the markup or rule that proves it.
5. Report only what the captures or the source prove. A suspicion belongs in the next direction pass, not in the findings list.

## Interpreting the score

Never average the ten scores. There is no "7/10", no single percentage, and no letter grade: a blocker in one dimension ends the discussion, and an average hides it.

| Setting | Report |
| --- | --- |
| Any blocker | Verdict `not shippable`; list every blocker first, in impact order |
| No blocker, one or more major | Verdict `shippable with named debt`; list the majors and the dimension they sit in |
| All dimensions ≥ 3, no major | Verdict `shippable`; list the minors as optional |
| Any rendering-dependent dimension unverified | Verdict `unverified`, with the reason; no numeric claim on that dimension |
| Unrendered, with a source-provable blocker | Verdict `unverified`; state in one line that the blocker alone makes it not shippable, and list it first |

Always name, after the verdict:

1. **The weakest dimension**, meaning the lowest score. On a tie, pick the one with the wider user effect, not the smaller fix.
2. **The one highest-leverage fix**, meaning the finding that clears the most findings or the one blocker that blocks the most tasks. Exactly one, so the next pass has a first move.
3. **The score list as ten labelled numbers**, so progress is comparable across passes without being collapsed into a total.

The report body, in order:

```text
Verdict: not shippable (2 blockers, 3 major, 2 minor)
Weakest: layout and spacing, 1
Highest leverage: .plan-grid, one column under 768 px
Scores: hierarchy 2 · layout 1 · typography 3 · color 2 · states 2 · motion 2 · copy 3 · accessibility 2 · performance 1 · distinctiveness 3
```

A re-check reports only the changed dimensions and the verdict. Re-scoring everything after one fix hides which change moved which score.

## Worked example

Surface: brand and marketing (a SaaS pricing page, tier cap T2). Captures: C1, C2, C3, C5, C6, both themes.

```text
[blocker] .plan-grid @ C1 — three cards stay in a three-column grid, scrollWidth 412 on a 360 px viewport, and the recommended plan's CTA is off screen — mobile visitors cannot select the plan the page recommends — stack to one column under 768 px with the recommended plan first
[blocker] .plan--recommended .badge @ C2, dark theme — "Most popular" renders at 2.9:1, `--brand-accent` text on `--brand-surface` — the one label that justifies the higher price is unreadable for low-vision visitors — use `--brand-on-surface` at ≥ 4.5:1, or keep the accent as a border plus an icon
[major] .price @ C3, forced T0 — the price tween still runs 700 ms with `--kui-ease-spring` under `prefers-reduced-motion: reduce`; the number is unreadable while it moves — reduced-motion users get motion they opted out of, on the number everyone reads first — show the final price instantly at T0 and tween only under `no-preference`
[major] .hero-orb @ C5 — the 3D scene mounts at every tier with no poster frame, so at T0 and T1 the hero is a 420 px empty box and LCP waits for the 3D chunk, measured 4.1 s at 4× CPU — low-tier and slow-network visitors pay for decoration before they see the offer — ship a static poster in the HTML and mount the scene only when `data-motion-tier="3"`
[major] #start-trial @ C6 — the button keeps its idle label and stays clickable for 1.8 s after submit, so the clip shows two presses and two signup rows — duplicate trials and a broken first impression — set `aria-disabled` and the busy label within 100 ms, as in `references/components/buttons.md`
[minor] .plan--recommended @ C3 — card padding is 40 px against 32 px on both siblings, with no radius or elevation difference — the wider inset reads as a mistake rather than as emphasis — either use the 32 px step or raise the card with elevation instead
[minor] .plan @ C3 — hover lifts 12 px over 450 ms with `ease-in-out` while the CTA inside resolves in 120 ms — two speeds for one gesture make the card feel detached from its button — move the lift to `--kui-duration-sm` with `--kui-ease-enter`
```

Verdict: `not shippable`. Weakest dimension: layout and spacing at 1 (C1 overflow). Highest-leverage fix: the 360 px grid, because it clears the first blocker and raises hierarchy, spacing, and performance on the LCP element in one change. Unverified: none.

Re-check after that fix:

```text
Re-captured: C1, C5
Verdict: not shippable (1 blocker remains)
Layout and spacing 1 → 3, hierarchy 2 → 3, performance 1 → 2
Still open: .plan--recommended .badge contrast at C2, dark theme
```

The remaining blocker is the badge contrast; the second pass starts there, not from a full re-score.

## What not to critique

| Out of scope | Why | Do instead |
| --- | --- | --- |
| Code style, naming, or file structure | The user never sees it, and it is not a rendered result | Report it only when it causes a rendered defect, such as `transition: all` janking a scroll |
| Taste without evidence | "I would have used blue" is a preference; the brief and the brand tokens decide | Name the token or principle the render breaks |
| Anything the brief did not ask for | Mid-review scope grows the fix and stalls the loop | Record it as a proposal for the next direction pass |
| Mockups, source files, or the build's own summary | They are intent, not result | Capture the render, or mark the dimension unverified |
| A full redesign | A rewrite hides which change fixed which finding and discards work that already passes | One smallest change per finding; keep what passes |
| Performance felt rather than measured | "Feels slow" cannot be re-checked | Measure LCP, INP, CLS, and frame time |
| Content policy the owner supplied (prices, legal text) | Not the designer's decision | Ask the owner; judge only placement and legibility |
| The approved visual world itself | A taste conflict with an approved direction reopens scope mid-loop | Re-open direction with the evidence and a proposal |

Rewriting to fix a finding is a last resort: it resets the evidence and costs a full re-capture. A rewrite needs its own direction pass (`references/workflow/direction.md`) and a new critique.

## Handoff

| Stage | Receives |
| --- | --- |
| Fix | Findings sorted by severity, the verdict, the weakest dimension, the single highest-leverage fix, and the capture set ids |
| Verify | The same findings as test cases, the measured baselines (contrast pairs, LCP, INP, CLS, frame time), the T0 and tier captures, and every dimension marked unverified |
| Report | The ten labelled scores, the verdict, and the re-check scope actually run |

- The fix stage edits; it does not re-decide the visual world. Intent changes go back through `references/workflow/direction.md`.
- The verify stage proves each fix with its own evidence and owns the pass/fail matrix: `references/workflow/verify.md`.
- The loop closes when a re-check returns `shippable`; then the next pass starts from direction, not from critique. The stage order and the artifacts each stage hands over are defined in `references/workflow/loop.md`.
- A critique that ends in `unverified` hands off the reason and the missing capture, not a guess.
- Never hand off a severity without its impact clause, or a dimension without its score; both are what the next stage acts on.
