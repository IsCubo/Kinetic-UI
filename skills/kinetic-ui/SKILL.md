---
name: kinetic-ui
description: "Trigger: frontend UI direction, micro-interactions, motion, parallax, scroll, 3D product renders, glTF, visual styles, brand identity, components, critique, verification. Decides, builds with tiers and reduced motion, verifies, and critiques."
license: Apache-2.0
metadata:
  author: IsCubo
  version: "0.1.0"
---

# kinetic-ui

## Activation Contract

Load for frontend work that needs a distinctive look or motion: micro-interactions, components, scroll, parallax, depth, 2D/3D effects, visual styles, brand-driven UI, animation libraries, real-piece 3D rendering, or judging an existing interface. Not for backend-only tasks.

## Hard Rules

1. Every effect honors `prefers-reduced-motion`: implement its `## Reduced motion` section. Never ship motion without it.
2. Every effect has a motion tier (T0–T3, `references/foundations/performance-tiers.md`) and its `## Low-end fallback`. Build the lowest tier first.
3. Animate `transform` and `opacity` by default. Load 3D lazily after the main content renders; a real piece renders in metres from measured dimensions and the material spec, with one environment map, matching PBR values, a contact shadow, and colour management that keeps the brand colour.
4. Keep the provided brand as tokens; without one, propose a style with `references/brand/emotion-to-style.md` and label it a proposal.
5. Motion must serve feedback, orientation, hierarchy, or delight; drop motion that hurts readability or performance.
6. Nothing flashes more than 3 times per second; motion longer than 5 s needs a pause control.
7. Library facts come from `references/libraries.md`; confirm current versions in official docs before installing.
8. Verify the rendered result and critique it before calling the work done; source alone is not evidence, except the source-provable facts `references/workflow/critique.md` lists.

## Find What You Need

Search `INDEX.md` by keyword; open only the listed file.

| Need | Open |
| --- | --- |
| Tiers, budgets, low-end devices | `references/foundations/performance-tiers.md` |
| Reduced motion, WCAG | `references/foundations/accessibility-motion.md` |
| UX laws, hierarchy, UI patterns | `references/foundations/ux-principles.md`, `references/foundations/ui-patterns.md` |
| Easing, timing, choreography | `references/foundations/motion-principles.md` |
| Devices, breakpoints, input modes | `references/foundations/devices-responsive.md` |
| Brand given / no brand | `references/brand/brand-intake.md` / `references/brand/emotion-to-style.md` |
| Direction, verify, critique, tooling | `references/workflow/direction.md`, `references/workflow/verify.md`, `references/workflow/critique.md`, `references/workflow/tooling.md` |
| Micro-interactions | `references/effects/microinteractions.md` |
| Cursor, text, ambient backgrounds | `references/effects/cursor-pointer.md`, `references/effects/text-effects.md`, `references/effects/ambient-backgrounds.md` |
| Parallax, scroll, depth, Z travel | In `references/effects/`: `parallax.md`, `scroll-driven.md`, `depth-layers.md`, `scroll-depth.md` |
| 2D, 3D, page transitions | `references/effects/motion-2d.md`, `references/effects/webgl-3d.md`, `references/effects/page-transitions.md` |
| Real piece 3D: render, glTF, configurator, platforms | `references/3d/` (see `INDEX.md`) |
| Icons, logos, illustrations, SVG craft | `references/effects/svg-graphics.md` |
| Styles, components, platforms, libraries | `references/styles/`, `references/components/`, `references/platforms/`, `references/libraries.md` |
| Tokens, tiers, 3D starter | `assets/tokens/motion.css`, `assets/snippets/motion-tier.js`, `assets/snippets/three-product-scene.js` |

## Execution Steps

1. Follow `references/workflow/loop.md`: direction, build, verify, critique.
2. Direction: `references/workflow/direction.md` — mode, visual world, focal motion moment.
3. Build tokens and tier detection first, lowest tier first, effects and components through `INDEX.md`.
4. Verify with `references/workflow/verify.md`, the tools in `references/workflow/tooling.md`, and `assets/snippets/verify-motion.js`; then critique with `references/workflow/critique.md`.

## Output Contract

Report the brief, each effect with its tiers, libraries added and why, the verification table, findings by severity, and open decisions.
