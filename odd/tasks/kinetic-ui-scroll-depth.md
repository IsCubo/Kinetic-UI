# kinetic-ui scroll depth

Objective: add the missing effect — a continuous travel through Z driven by scroll (the "moving forward" immersion), plus its equivalent in every platform the skill targets.
Branch: `feat/3d-depth` · Delivery: `ask-on-risk` · Test runner: `node --test tests/*.test.mjs` + `node scripts/validate.mjs skills/kinetic-ui`

## Specs

- **S31 The effect reference.** "animaciones tipo parallax, scroll, en profundidad, esas animaciones que juegas con el axis z ... al scrollear hacia abajo sientes como si recorrieras hacia adelante, como algo inmersivo". Acceptance: new `references/effects/scroll-depth.md` follows the effects template order with both mandatory sections, and owns: the stage/track/layer anatomy, the two choreography models (stage dolly vs per-layer), pinning with `position: sticky`, depth cues (perspective divide, fog, opacity, blur cost), stop pacing, total scroll length budget, the static fallback stack, and a "which file do I open" table separating it from `references/effects/parallax.md` (plane speed offsets), `references/effects/scroll-driven.md` (timeline plumbing) and `references/effects/depth-layers.md` (perspective and tilt on hover).
- **S32 The runnable asset.** Acceptance: `assets/effects/scroll-depth.js` exports a factory returning `{ start, stop, dispose }`, writes one registered custom property `--kui-z-p` (0..1) on the stage and nothing else, is idempotent, gates work with one IntersectionObserver plus one rAF loop, honours `data-motion-tier` and `prefers-reduced-motion: reduce`, re-arms on the `kui:motiontierchange` event, and leaves no listener or observer behind after `dispose`. No globals, no timers.
- **S33 Equivalents in every platform the skill targets.** "coloquemos eso y sus equivalencias en cada plataforma en la que esta enfocada la skill". Acceptance: one section in each of `references/platforms/web-frameworks.md`, `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`, and in `references/3d/platforms-3d.md` for the engines, each mapping the pattern to that platform's own API (not a CSS recipe repeated in five dialects), naming what to animate, what pins, how reduced motion is honoured, and one caveat about cost or correctness. APIs named must be real; when a writer is unsure of an exact signature it describes the mechanism instead of inventing a name. No library versions outside `references/libraries.md`.
- **S34 Wiring.** Acceptance: `SKILL.md` routes the effect in "Find What You Need"; `docs/authoring.md` manifest lists the new file and asset; `README.md` structure tree includes it; the three sibling effect files gain a one-line pointer row so a reader who lands there is not stranded; `INDEX.md` regenerated.
- **S35 Measurable.** Acceptance: one eval case `scroll-depth-travel` asserting behaviour, not one implementation: z progress or dolly language, pinning, a reduced-motion static fallback, a low-end simplification, depth cues, and at least one per-platform equivalence.

## Shared contract (both writers use these names; do not invent variants)

| Name | Meaning |
| --- | --- |
| Stage | Tall element that sets the scroll length; owns `--kui-z-p` and `overflow: clip` |
| `--kui-z-p` | Progress, registered `@property` number 0..1, set on the stage only |
| Track | Pinned child (`position: sticky`, one viewport high); owns `perspective` (see L4) |
| `--at` | Web-recipe local helper, unitless: progress at which a stop reaches the screen plane, `−z ÷ travel` (see L4) |
| `--kui-z-travel` | Total forward distance in px for the whole stage |
| `--kui-z` | Per-layer resting depth in px; negative is far |
| `--kui-z-speed` | Per-layer multiplier, default 1 — parallax inside the depth axis |
| Stop | One content block placed at a depth, with an entry and an exit |

Rules: leave `--kui-depth` and `--kui-parallax-strength` to `references/effects/parallax.md`; do not animate `top`, `filter` or `box-shadow`; T0 = static stack in normal flow with no perspective, no pinning, no travel; T1 = CSS scroll timeline when `animation-timeline` is supported, static otherwise; T2 = JS progress, at most 3 stops, no blur; T3 = full choreography including fog and overscan layers.

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T34 | S31, S32 | delegated (writer A, sonnet-5-5) | done | `references/effects/scroll-depth.md` (217 lines), `assets/effects/scroll-depth.js` (128 lines) in `8d9c16b` |
| T35 | S33 | delegated (writer B, sonnet-5-5) | done | +18 lines in each of 4 `references/platforms/*.md`, +20 in `references/3d/platforms-3d.md`, in `3ea15c4` |
| T36 | S34, S35 | inline (parent) | done | router row, manifest, README, 3 sibling pointers, eval case `scroll-depth-travel` (12 assertions), index; split across `8d9c16b` and `3ea15c4` |

Risk: none on published behaviour — documentation plus one DOM asset in an unpublished package. T34 and T35 edit disjoint surfaces; the parent owns every other file.

Route evidence: Writer trigger (a). Two independent units after the contract above is fixed: T34 is one effect with its asset (code and docs together), T35 is five platform sections in files T34 never touches. Each is several minutes of work and well over 100 changed lines.

## Log

- **L1 (2026-11-18, original request, verbatim):** "Perfecto, ahora avancemos para las animaciones tipo parallax, scroll, en profundidad, esas animaciones que juegas con el axis z que hacen animaciones de entrada o simulan profundidad, he visto por ejmplo que hacen animaciones que al scrollear hacia abajo sientes como si recorrieras hacia adelante, como algo inmersivo, entonces coloquemos eso y sus equivalencias en cada plataforma en la que esta enfocada la skill"
- **L2 (2026-11-18, existing coverage):** `parallax.md` (218), `scroll-driven.md` (261) and `depth-layers.md` (274) already own plane speed offsets, timeline plumbing and perspective/tilt. None owns continuous travel through Z, so a new effect file is the gap; extending the three would push them past the 250-line target and blur their purpose.
- **L3 (2026-11-18, environment):** no `.atl/skill-registry.md` in the repo, so no project skill index to pass; `cognitive-doc-design` is the only installed skill that applies to reference authoring.
- **L4 (2026-11-18, review decisions):** Accepted two deviations from the first contract. (1) `perspective` moved from the stage to the pinned track: on a tall stage the vanishing point sits in the middle of the whole scroll length and layers drift; writer B's web section said "stage" and was corrected to "pinned track". (2) `--at` added as a web-only unitless helper, because CSS cannot portably divide a length by a length and the opacity ramp needs a number. Corrected writer A's support line: `@property` is Baseline since 2024-07 (Firefox 128 last; verified on MDN and web-features), and `translate` is older, not "since 2024". Added a pitfall: per-layer z on a flat track paints in source order, not by depth. Spot-checked writer B's APIs (`rememberSystemAnimationsEnabled()` exists in the Compose file; `onScrollGeometryChange` iOS 18+, `scrollTransition`/`visualEffect` iOS 17+). The 12 eval assertions pass against the skill's own content and fail against a plain-parallax answer.
- **L5 (2026-11-18, user preference, verbatim):** "si necesitas asignar sub agentes no asignes opus 5.5 ni ningun modelo alto, solo asigna el adecuado tareas simples puedes colocar sonnet 5 con esfuerzo modelado y así"
- **L6 (2026-11-18, verification):** Commits `8d9c16b` (effect, asset, sibling pointers, router, manifest, README, index) and `3ea15c4` (five platform sections, index, eval case). Each validated in an isolated `git worktree`: `OK: 61 files checked`, 45/45 tests. `SKILL.md` body went to ~1012 tokens with the new row; factoring the repeated `references/effects/` prefix brought it back to ~998 (max 1000). The first commit carries an intermediate `INDEX.md` without the platform keyword changes, so it is green on its own. Eval pack: 6 cases / 56 assertions. Not pushed; no pull request.
