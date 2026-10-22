---
name: kinetic-ui
description: "Trigger: micro-interactions, motion, animation, parallax, scroll effects, 3D/WebGL, depth, cyberpunk or other visual styles, brand identity, UI components. Builds distinctive, accessible, device-aware frontend UX/UI."
license: Apache-2.0
metadata:
  author: IsCubo
  version: "0.1.0"
---

# kinetic-ui

## Activation Contract

Load for frontend work that needs a distinctive look or motion on any framework or platform: micro-interactions, component behavior, scroll, parallax, depth, 2D/3D effects, visual styles, brand-driven UI, or choosing an animation library. Not for backend-only tasks.

## Hard Rules

1. Every effect honors `prefers-reduced-motion`: implement its `## Reduced motion` section. Never ship motion without it.
2. Every effect has a motion tier (T0–T3, `references/foundations/performance-tiers.md`) and its `## Low-end fallback`. Build the lowest tier first, then enhance.
3. Animate `transform` and `opacity` by default. Load 3D/WebGL lazily, after the main content renders.
4. Keep the provided brand (colors, type, radius, voice) as tokens. Without a brand, propose one with `references/brand/emotion-to-style.md` and label it a proposal.
5. Motion must serve feedback, orientation, hierarchy, or delight; drop motion that hurts readability or performance.
6. Nothing flashes more than 3 times per second; motion longer than 5 s needs a pause control.
7. Take library facts from `references/libraries.md` and confirm current versions in official docs before installing.

## Find What You Need

Search `INDEX.md` for a keyword (e.g. "glitch", "magnetic", "sticky") and open only the listed file.

| Need | Open |
| --- | --- |
| Tiers, budgets, low-end devices | `references/foundations/performance-tiers.md` |
| Reduced motion, WCAG | `references/foundations/accessibility-motion.md` |
| UX laws, hierarchy, UI patterns | `references/foundations/ux-principles.md`, `references/foundations/ui-patterns.md` |
| Easing, timing, choreography | `references/foundations/motion-principles.md` |
| Devices, breakpoints, input modes | `references/foundations/devices-responsive.md` |
| Brand given / no brand | `references/brand/brand-intake.md` / `references/brand/emotion-to-style.md` |
| Micro-interactions | `references/effects/microinteractions.md` |
| Cursor, text, ambient backgrounds | `references/effects/cursor-pointer.md`, `references/effects/text-effects.md`, `references/effects/ambient-backgrounds.md` |
| Parallax, scroll, depth | `references/effects/parallax.md`, `references/effects/scroll-driven.md`, `references/effects/depth-layers.md` |
| 2D, 3D, page transitions | `references/effects/motion-2d.md`, `references/effects/webgl-3d.md`, `references/effects/page-transitions.md` |
| Visual styles (cyberpunk, glass…) | `references/styles/` |
| Component behavior | `references/components/` |
| Framework or platform | `references/platforms/` |
| Libraries | `references/libraries.md` |
| Tokens, tier detection | `assets/tokens/motion.css`, `assets/snippets/motion-tier.js` |

## Execution Steps

1. Identify the surface (brand page or product UI), audience, platform, and stack.
2. Resolve identity: brand intake, or a proposed style from emotion and page type.
3. Choose effects and components through `INDEX.md`; read only those files.
4. Add the motion tokens and tier detection before building effects.
5. Build the lowest tier first, enhance per tier, and add each reduced-motion variant.
6. Verify reduced motion, CPU-throttled low-end behavior, keyboard access, contrast, and mobile plus desktop sizes.

## Output Contract

Report the identity used (given or proposed), each effect with its tiers, libraries added and why, reduced-motion and fallback behavior, and the checks run.
