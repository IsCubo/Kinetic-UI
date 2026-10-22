# Verification

> Keywords: verify, verification, audit, evidence, acceptance, test matrix, motion audit, console audit, reduced motion test, motion tier test, Lighthouse, axe, Playwright, contrast, keyboard, accessible name, forced colors, zoom, reflow, CLS, LCP, INP, flash, pause control, verificación, auditar
> Summary: How to prove a built interface works: an evidence rule, a per-area test matrix, the tools and their limits, a runnable console audit, and the reduced-motion, tier, and performance passes that end in a report critique can read.

Verification runs against the artifact the user receives, not the source you wrote. Every check yields a command, a number, or an observation another person could reproduce; anything else is an opinion. The stage sits between build and critique in the loop of direction → build → verify → critique.

## When to use

- After every build or fix, before reporting the work as done.
- After copying an effect or component from this skill into a project: the files ship behavior, not proof of it.
- After a dependency upgrade that touches motion, media, or the build output.
- Before handing off to critique, and again after each critique fix.
- Once per release on a real low-end device when the product targets mobile; emulation cannot prove a phone.
- Twice when the design ships a capped tier: once at the tier your device receives and once at the lowest tier the product claims to support.

Do not use it as a design review. Verification answers "does it work as specified"; critique answers "is it good". Run the passes below first so critique argues about quality, not about broken basics.

## Evidence rule

1. Test the built artifact: the production build or dev server at the deployed asset paths, with tokens and tier detection loaded. If a stub replaced a real dependency, write that down as a limitation.
2. Record one fact per check: the exact command, browser and version, viewport, throttle setting, screenshot name, and the number you read.
3. Numbers beat adjectives. Write "4.6:1", "LCP 1.9 s", "2 flashes/s", "8.4 ms frame time", not "good enough".
4. "Looks fine" is not evidence. "No console errors" is not evidence of behavior.
5. A check you could not run is BLOCKED, never PASS. Name the missing tool or device in the record.
6. Keep browser and OS identical between before and after measurements, otherwise the comparison is noise.
7. Record failures verbatim, including the selector or frame where they occur. A FAIL with no location costs critique a full round.

| Weak evidence | Evidence that holds |
| --- | --- |
| "Animations are smooth" | "Worst frame 14.1 ms at 4× CPU throttle, 60 Hz profile, Chromium 141" |
| "Contrast looks fine" | "Hero caption 4.8:1 at frame 42, the brightest gradient frame" |
| "Keyboard works" | "Tab 1–33 in visual order, no trap; Enter opens the card, Esc closes it" |
| "Reduced motion handled" | "tier `0`, 0 blockers, transform unchanged between scroll 0 and 900 px" |

The spread between those two columns is what critique will spend its first round on.

## Matrix

| Area | How to test | Pass criterion | Record |
| --- | --- | --- | --- |
| Functional states | Force each state with Elements → Styles `:hov`, plus a real hover, click, and tab | Every state the build defines (rest, hover, focus, active, disabled, loading) renders and returns to rest | Screenshot per state |
| Keyboard path | Tab and Shift+Tab from the top; Enter, Space, Esc, arrows inside each widget | Every interactive element reachable in visual order, no trap, focus ring visible and never covered | Tab count to the last control, trapped element if any |
| Accessible name and role | Elements → Accessibility pane per interactive element; `window.kuiVerify()` for the unnamed ones | 100% of focusable elements have a name and a role matching their behavior | List of unnamed or mis-roled elements; empty list is the pass |
| Contrast | DevTools contrast ratio over the busiest frame of glass, gradient, glitch, or video | ≥4.5:1 body text, ≥3:1 large text (≥24 px, or ≥19 px bold) and UI borders and focus rings | Ratio per pair, with the frame sampled |
| Reduced motion | Rendering → Emulate `prefers-reduced-motion: reduce` | The reduced-motion pass below passes item by item | `kuiVerify()` summary plus two screenshots |
| Tier T0–T3 | Set `data-motion-tier` to 0, 1, 2, 3 on `<html>` | The tier pass below passes for each value | Tier, what mounted, what stayed hidden |
| Performance (LCP, INP, CLS) | Lighthouse mobile, throttled, on the built page | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, and no regression against the same build with the effect disabled | The three numbers, before and after |
| Layout 360 / 768 / 1440 | Responsive mode at 360, 768, and 1440 CSS px, portrait and landscape | No horizontal scroll, no clipped or overlapping text, targets ≥24×24 px (≥44 px on touch) | Screenshot per width |
| 200% zoom | Browser zoom 200% at 1280 px wide; 400% at 320 px for reflow (WCAG 1.4.10) | No content loss and no two-axis scrolling on a vertical page | Screenshot plus the scroll axes observed |
| Forced colors | Rendering → Emulate `forced-colors: active` | Borders, focus ring, and state changes stay visible; no meaning carried by color or glow alone | Screenshot of the affected component |
| Media loading | Network panel with throttling: what loads before the LCP marker | No 3D/WebGL chunk, autoplay video, or Lottie file before LCP | Asset names in load order |
| Flash and loop limits | Count opacity or color inversions per second in a screen recording, or in the Animations panel | ≤3 flashes per second (WCAG 2.3.1); every effect past 5 s has a pause control (2.2.2) | Flashes per second, and where the pause control is |
| Pointer alternatives | Use the effect with touch and keyboard only, no hover and no drag | Tilt, drag, magnetic, and cursor effects each have a button or single-pointer alternative | The alternative used |
| Hover-only content | Open every tooltip, menu, and detail panel from the keyboard and on a touch viewport | Nothing is reachable by hover alone; the same content opens on focus or tap | Controls that responded, and how |
| Focus not obscured | Tab through each control with sticky bars, overlays, and parallax layers present | The focused element is never covered or clipped (WCAG 2.4.11) | Element, plus the layer that covered it |

Run the rows in cost order: console audit, reduced motion, tiers, keyboard, layout and zoom, then performance and devices. A cheap FAIL early saves the throttled runs.

Rows that need a recorder, a screen reader, or physical hardware stay in the table as BLOCKED with the reason. Deleting a row to get a clean report is the one thing this matrix exists to prevent.

## Tools

| Tool | Proves | Does not prove |
| --- | --- | --- |
| DevTools Rendering and Emulation | This engine's behavior under an emulated media feature (`prefers-reduced-motion`, `forced-colors`, `prefers-contrast`) right now | Other engines, the real OS setting, assistive technology |
| Lighthouse (mobile) | Lab LCP, CLS, and a TBT-based INP proxy for the loaded page, plus unused JS weight | Field INP, interaction correctness, motion quality |
| axe (extension or CLI) | Rule-detectable failures: names, roles, duplicate ids, label wiring, contrast on flat backgrounds | Motion, focus order, contrast over moving gradients, whether an effect earns its place |
| Playwright | Repeatable scripted passes across widths, engines, and keyboard sequences, with screenshots as artifacts | Real frame rate, screen-reader output, a real device |
| A screen reader (NVDA, JAWS, VoiceOver) | That decorative layers are hidden, canvases carry their text alternative, and state changes are announced | Visual contrast, layout, motion comfort |
| `assets/snippets/verify-motion.js` | Static DOM and computed-style heuristics in one pass on the live page | Interaction order, animation frames, measured fps, whether a name is meaningful |
| One real low-end device | Sustained frame rate, battery, and scrolling under a real touch digitizer | Regressions on other engines; keep the model in the record |

Sample the tool against the built page, not a dev-only route: lazy chunks and tier detection behave differently after a production build.

Playwright earns its cost once a path repeats. A short script with `page.keyboard.press('Tab')` in a loop, one screenshot per width, and a `page.emulateMedia({ reducedMotion: 'reduce' })` run turns three manual passes into one command you can rerun after the next fix. Keep its assertions to binary outcomes; measured performance stays in the Performance panel and on the device.

The browser pass a tool cannot replace: navigate the whole page once with the pointer unplugged and once with the keyboard only. Every finding that survives both is real.

## The console audit

`assets/snippets/verify-motion.js` is a module, so it loads rather than pastes:

1. Copy it into the served project (for example `/verify-motion.js`) and load it with `<script type="module" src="/verify-motion.js"></script>`.
2. Or, from the DevTools console on the same origin: `await import('/verify-motion.js')`. A plain console paste fails on `export`; that is the module boundary, not a bug.
3. It attaches `window.kuiVerify()` once and auto-runs after load. Set `window.__kuiVerifyManual = true` before loading to keep the console quiet until you call it.
4. Call `window.kuiVerify()` again after each state you audit (menu open, hover, forced tier). It returns `{ summary, findings }` and prints a `console.table`.

The summary carries `tier`, `reducedMotion`, `runningAnimations`, `infiniteAnimations`, `longAnimations`, and the blocker, major, and minor counts. Those numbers go straight into the report row for motion.

| Rule | Severity | Means | Blocker |
| --- | --- | --- | --- |
| `missing-motion-tier`, `invalid-motion-tier` | blocker | `<html data-motion-tier>` is absent or not 0–3 | Yes |
| `reduced-motion-animation` | blocker | An animation runs over 200 ms, or forever, while reduced motion is on | Yes |
| `autoplay-audio` | blocker | `video[autoplay]` without `muted` | Yes |
| `reduced-motion-tier` | major | The OS asks for reduced motion but the tier is not 0 | No |
| `infinite-animation` | major | A looping animation with no pause control nearby | No |
| `long-animation` | major | Motion over 5 s with no pause control nearby | No |
| `hidden-cursor` | major | Computed `cursor: none`; the pointer affordance is gone | No |
| `focusable-no-name` | major | A button, link, or input with no name source | No |
| `invalid-tier-attribute` | major | `data-kui-min-tier` or `data-kui-max-tier` outside 0–3 | No |
| `image-no-dimensions` | minor | No width/height attribute and no CSS `aspect-ratio` (CLS risk) | No |
| `permanent-will-change` | minor | `will-change` keeps a layer promoted outside an animation | No |

Looping motion is tolerated as a minor only when the element is decorative (`aria-hidden="true"` on it or an ancestor) and its nearest section holds a pause control, meaning `[data-kui-pause]` or a button labelled pause, stop, or reduce. Page-level controls do not count. The 5 s rule uses the same test.

Read the audit as a lead, not a verdict: it flags a static snapshot of styles, so confirm each finding in the accessibility tree or the Animations panel before writing a fix, and ignore a finding that the code demonstrably handles another way. Any blocker turns the report row into FAIL until it is fixed.

What the audit cannot see, and you still test by hand:

- Travel and parallax distance: it counts animations, it does not measure how far an element moves.
- Focus order, traps, and whether the focus ring is covered.
- Frame rate, long tasks, and layout shift caused by scripts rather than images.
- Contrast over a moving background, and the meaning of a name that exists but says "button".

Use its counts as the motion row's evidence: `runningAnimations` while reduced motion is on must be zero, `infiniteAnimations` must equal the number of loops you intentionally shipped, and `blockers` must be zero before any other pass starts.

## Reduced-motion pass

1. Open Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` and leave it on for the whole pass.
2. Reload, because some effects read the preference once at load.
3. Run `window.kuiVerify()`: expect `reducedMotion: true`, `tier: "0"`, and zero blockers.
4. Scroll the full page, open every menu and overlay, and operate three interactive elements with the keyboard.
5. Assert no travel: `transform` on the animated element has no translation between two scroll positions, and no scroll-linked parallax layer shifts.
6. Assert no autoplay: no `video[autoplay]`, canvas 3D animation, or marquee keeps moving.
7. Assert fades ≤200 ms: Animations panel durations, or computed `transition-duration` at or below `0.2s`, and token values collapse (`--kui-distance-md` computes to `0px`).
8. Assert feedback survives: focus ring, pressed state, menu open/close, loading indicator, and success/error state are all still perceivable. Nothing ends up invisible.

Pass criterion: zero animations over 200 ms, zero travel or parallax on scroll, every state change still visible. Record the `kuiVerify()` summary plus one screenshot per wide and narrow layout.

Flip the OS setting while the page is open as a second run: effects must stop within a frame and must not replay when the page is scrolled.

| Effect | Expected at T0 | Fails when |
| --- | --- | --- |
| Parallax, depth layers, scroll-driven | Static layers; `--kui-parallax-strength` computes to `0` | Any layer moves between scroll positions |
| Custom cursor, magnetic targets | Native cursor back; hover still gives feedback | Pointer invisible, or the target still chases it |
| Text, scramble, glitch effects | Final text static and readable | Characters keep changing after focus |
| Page transitions | Instant swap or a crossfade ≤200 ms | Shared-element travel between routes |
| 3D, WebGL, canvas | One static frame or the poster image | Camera, particles, or the render loop continue |
| Ambient backgrounds | Static gradient | Gradient loop, noise, or particles continue |

## Tier pass

Force the tier after load. In Elements, edit the `data-motion-tier` attribute on `<html>`; or in the console run `document.documentElement.dataset.motionTier = '1'`. Do it after `applyMotionTier()` has run, and re-force after every reload, because the snippet rewrites the attribute on load. A forced value also changes what `assets/tokens/motion.css` shows through the tier utilities.

| Tier | Force | Pass criterion |
| --- | --- | --- |
| T0 | `data-motion-tier="0"` | Same result as the reduced-motion pass: no travel, scale, or parallax, fades ≤200 ms, content readable |
| T1 | `data-motion-tier="1"` | CSS transitions only; no JS animation loop in the Performance panel, no WebGL context, `[data-kui-min-tier="2"]` stays `display: none` |
| T2 | `data-motion-tier="2"` | JS motion and 2D canvas run; no three.js chunk requested; `[data-kui-min-tier="3"]` stays hidden |
| T3 | `data-motion-tier="3"` | The 3D scene mounts, `[data-kui-min-tier="3"]` reverts to visible, `devicePixelRatio` capped at 2, no 3D work before LCP |

Test each effect against the `## Reduced motion` and `## Low-end fallback` sections of its own file, not against what the code happens to do. Then confirm the page is still usable at T0 with the effect removed: content, navigation, and states all intact.

Verify the downgrade path too: on a throttled CPU, `watchFrameRate()` should lower the tier once, write the session cap, and dispatch `kui:motiontierchange` with the new value. Listen for it in the console with `document.addEventListener('kui:motiontierchange', (e) => console.log(e.detail))` and scroll at 6× throttle. A tier that never moves while frames drop means the check is not wired, and the low-end fallback is untested in practice.

## Performance pass

- Performance panel, CPU 4× then 6× slowdown, record a full scroll and one interaction. No long task above 50 ms attributable to motion.
- Frame budget: no frame over 16.7 ms at 60 Hz during the effect, and 8.3 ms when targeting 120 Hz. Under 4× throttle a frame may double; that is only acceptable if `watchFrameRate()` from `assets/snippets/motion-tier.js` drops the tier.
- Core Web Vitals on the built page: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Measure the same build with the effect disabled and record both numbers; effects must not regress them.
- 3D lazy load: no WebGL or three.js chunk before the LCP marker in the Network waterfall, and the chunk appears only when the tier permits it.
- One `requestAnimationFrame` loop: the Frames track goes quiet when the section scrolls out of view or the tab is hidden.
- Animated properties stay on `transform` and `opacity`; `filter`, `clip-path`, and `backdrop-filter` appear only on small areas, verified at 4× throttle.
- One low-end Android run replaces all of the above for a mobile target: record the device model and the fps you saw.
- Read the loading order in the console when the Network panel is too noisy: `performance.getEntriesByType('resource').map((r) => [r.name, Math.round(r.startTime)])` shows each chunk's start relative to navigation.
- Report the throttle setting with every frame number. A frame time without its CPU factor cannot be compared to anything, including your own next run.

## Report template

```md
| Check | Result | Evidence |
| --- | --- | --- |
| Functional states | PASS | Screenshots 01–06; all six states render and return to rest |
| Keyboard path | FAIL | Tab 34 enters the carousel with no exit; Esc does nothing |
| Accessible name and role | PASS | 24 focusables, 0 unnamed in the accessibility tree |
| Contrast | PASS | Worst pair 4.8:1, hero at frame 42 |
| Reduced motion | PASS | tier "0", 0 blockers, no travel on scroll |
| Tier T0–T3 | PASS | T1 hides the 3D mount; T3 mounts after LCP |
| Performance | PASS | LCP 1.9 s, INP 120 ms, CLS 0.02; 4× throttle 14.1 ms worst frame |
| Layout 360/768/1440 | PASS | No horizontal scroll at any width |
| 200% zoom | PASS | Reflows to one column, single scroll axis |
| Forced colors | PASS | Borders and focus ring visible |
| Media loading | PASS | No three.js chunk before LCP |
| Flash and loop limits | BLOCKED | No screen recorder available; pause control present |
```

Allowed values are PASS, FAIL, and BLOCKED. Every row needs an observation, a number, or a file name; a row citing only "ok" is not done. Close with one verdict line:

**Verdict:** FAIL — one blocker (carousel keyboard trap), everything else passes at 360, 768, and 1440 px; no device run yet.

Two habits keep the table honest. First, name the artifact in the Evidence column whenever two builds could differ ("built at `dist/`, Chromium 141, 4× CPU"). Second, when a check passes only because the effect is absent, say so: "0 animations because the hero did not mount at T1" is a different fact from "0 animations and the hero was there".

## Handoff

Critique receives the filled table, the raw `findings` array as JSON (`JSON.stringify(result.findings)`), screenshots at the three widths plus the reduced-motion state, the tier notes, and the list of BLOCKED checks with the reason. Those rows become critique's starting list: do not pre-argue them, and do not mark a blocked check as passing because the design looks right.

Then continue in the planned critique stage, re-enter the build with its fixes, and come back through this file. The companion stages are references/workflow/direction.md, references/workflow/critique.md, and references/workflow/loop.md.

When critique disagrees with a PASS, record both verdicts instead of rerunning the same check to settle it. Verification settles facts; critique settles judgment. The next build needs to know which one it is answering.

Verification is finished when every matrix row is PASS, or when each remaining FAIL and BLOCKED is written down with its evidence and owner. A short honest report with two failures beats a clean one nobody can reproduce.
