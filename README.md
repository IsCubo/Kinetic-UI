# kinetic-ui

A universal [Agent Skill](https://agentskills.io) for distinctive, accessible, device-aware frontend UX/UI: micro-interactions, motion, parallax, scroll-driven effects, depth, 2D/3D, visual styles, component behavior, brand identity, and proven libraries.

Works with any agent that reads the agent-skills format (OpenCode, Claude Code, and others). No runtime, no dependencies, no build step: plain Markdown, CSS, and vanilla JS.

## What it solves

Most UI work fails in the same three places: motion that ignores `prefers-reduced-motion`, effects that melt low-end phones, and visual direction that defaults to the same generic landing page. This skill makes the agent answer all three before writing code:

- **Reduced motion is not optional.** Every effect and component file carries a `## Reduced motion` section with its exact tier-0 behavior, enforced by the validator.
- **Every effect has a budget.** Motion tiers T0–T3 (`references/foundations/performance-tiers.md`) decide what runs on a low-end phone, and each file states its `## Low-end fallback`.
- **Brand first, style second.** A provided brand maps into nine `--brand-*` tokens; with no brand, the agent proposes a style from page type and intended emotion, and labels it a proposal.

## Install

Copy or link the skill directory into the skills folder your agent reads.

```bash
# OpenCode / Claude Code style (user scope)
ln -s "$PWD/skills/kinetic-ui" ~/.config/opencode/skills/kinetic-ui
ln -s "$PWD/skills/kinetic-ui" ~/.claude/skills/kinetic-ui
```

Project scope: copy `skills/kinetic-ui` into `<project>/.agents/skills/` or `<project>/.claude/skills/`. The skill is self-contained; the maintainer folders (`scripts/`, `tests/`, `docs/`, `odd/`) are not needed at runtime.

## Use

Ask for the outcome, not the file. The skill activates on frontend work that needs a distinctive look or motion:

> "Build a pricing page with a cyberpunk feel, but keep our brand blue and make it usable on a low-end Android."

The agent then reads `SKILL.md`, follows its intent routing, and opens only the files it needs through `INDEX.md` (keyword catalog generated from each file's header).

## Structure

```text
skills/kinetic-ui/
  SKILL.md                    router: hard rules, intent routes, execution steps
  INDEX.md                    generated keyword index
  references/
    foundations/              UX laws, UI patterns, motion, devices, tiers, accessibility
    brand/                    brand intake, emotion-to-style proposal
    effects/                  micro-interactions, cursor, text, page transitions,
                              ambient, parallax, scroll, depth, 2D, 3D/WebGL
    styles/                   cyberpunk, glassmorphism, neo-brutalism, editorial,
                              minimal luxury, retro-futurism, organic soft, playful 3D
    components/               buttons, forms, cards, navigation, overlays, feedback,
                              selection controls, carousels, heroes, lists
    platforms/                web frameworks, Flutter, SwiftUI, Jetpack Compose
    libraries.md              verified catalog: names, licenses, caveats, dates
  assets/
    tokens/motion.css         duration, easing, distance, and scale tokens
    tokens/brand-tokens.template.json
    snippets/motion-tier.js   detection and tier application
    effects/                  effect-specific CSS/JS
```

## Motion tiers

| Tier | Meaning | What ships |
| --- | --- | --- |
| T0 | Reduced motion | Fades ≤200 ms, no travel, no parallax, no autoplay |
| T1 | CSS only | Transitions, keyframes, scroll timelines where supported |
| T2 | JS motion | Springs, choreography, pointer-linked effects |
| T3 | GPU / 3D | WebGL, shaders, heavy scenes, loaded lazily |

`assets/snippets/motion-tier.js` sets `<html data-motion-tier>` from capability and runtime frame rate; `assets/tokens/motion.css` collapses distances and scales at T0.

## Maintain

Requires Node 18+ (developed on Node 22).

```bash
npm run index      # regenerate INDEX.md from file headers
npm run validate   # frontmatter, headers, mandatory sections, paths, JS syntax, index freshness
npm test           # validator test suite
```

Every reference file starts with `> Keywords:` and `> Summary:` lines; the index is generated from them, and validation fails when it is stale.

## License

Apache-2.0. Copyright 2026 IsCubo.
