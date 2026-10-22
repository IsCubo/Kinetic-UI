# Brand intake

> Keywords: brand intake, brand identity, brand guidelines, style guide, logo, clear space, palette, brand colors, typography, brand fonts, font pairing, tone of voice, design system, design tokens, figma, oklch, tint, shade, color scale, contrast pairs, motion personality, brand adaptation, identidad de marca, manual de marca
> Summary: Procedure for a provided brand: inventory its assets, extract the shared brand tokens, derive accessible OKLCH scales and contrast pairs, map brand attributes to motion tokens, and adapt any style or effect without breaking the brand.

Use this file when the user provides any brand material. With no brand material at all, use `references/brand/emotion-to-style.md` instead. Treat the brand as fixed input: styles and effects adapt to it, never the reverse. Only accessibility overrides it (section 8).

## Quick path

1. Inventory the brand and record each item as given, derived, or assumed.
2. Extract the nine shared tokens into CSS and a project copy of `assets/tokens/brand-tokens.template.json`.
3. Derive OKLCH tint and shade scales; verify every contrast pair.
4. Set typography from the brand fonts; pair a second family only to close a gap.
5. Map brand attributes to one motion preset and its `--kui-*` token choices.
6. List the non-negotiables (logo, marks, exact colors).
7. Adapt the chosen style and effects to the tokens.
8. Resolve accessibility conflicts, fill the output block, and show it to the user before building.

## 1. Inventory

| Item | Look for | Feeds | If missing |
| --- | --- | --- | --- |
| Logo | SVG master; mark-only, wordmark, mono, and reversed variants; clear-space and minimum-size rules | Asset list, non-negotiables | Ask for the SVG. Never trace or redraw a raster logo without approval |
| Palette | Primary, secondary, neutrals as screen values (hex, RGB, OKLCH). Pantone and CMYK are print values | `--brand-primary`, `--brand-accent`, `--brand-surface`, `--brand-muted` | Sample from the logo or live site; mark as assumed |
| Typography | Families, weights, roles, web license, font files | `--brand-font-display`, `--brand-font-body` | Ask about the license; use a metric-close open-source face marked as assumed |
| Imagery | Photo style, illustration, crops, allowed and forbidden treatments | Texture and effect choices | Use neutral placeholders; no stock clichés |
| Iconography | Icon set, stroke width, corner style, filled or outlined | Icon choice, `--brand-radius` hint | Choose a set that matches the logo's stroke and corners |
| Voice | 3–5 tone adjectives, words to use and avoid | Microcopy, motion personality | Infer from existing copy; mark as assumed |
| Existing motion | Motion guidelines, product animations, video idents, animated logo | Motion personality (section 5) | Derive from the voice adjectives |
| Design system | Components, spacing scale, radius, elevation, states | `--brand-radius`, component states | Derive radius from logo and icon corners |
| Tokens | CSS custom properties, theme files, token JSON, framework theme config | Alias onto the shared tokens | None |
| Figma | Color styles, variables, text styles, modes (light/dark) | Values per mode | Ask for exported variables, not screenshots |

Rules:
- Ask once, in one batched message, only for items that block work (palette, fonts, logo). Continue with the rest marked as assumed.
- When sources disagree (guide PDF, Figma, shipped code), ask which is current. Until answered, use the newest source and note the conflict.
- Use only material the user shares or the project already contains. Never read credentials or private files to find brand assets.

## 2. Extract into the shared tokens

| Token | Brand source | Rule |
| --- | --- | --- |
| `--brand-primary` | Main brand color, the one on primary actions | Keep the exact given value |
| `--brand-on-primary` | Text and icons on primary | White, near-black, or a primary step that reaches 4.5:1 |
| `--brand-accent` | Secondary or highlight color | One accent; other brand colors stay illustration colors |
| `--brand-surface` | Page background | Brand neutral, or a primary tint at C ≤ 0.015 |
| `--brand-on-surface` | Main text color | 4.5:1 minimum; aim for 7:1 for long reading |
| `--brand-muted` | Secondary text, captions, dividers | 4.5:1 on surface when it carries text |
| `--brand-font-display` | Headline family plus fallbacks | Brand font first (section 4) |
| `--brand-font-body` | Body family plus fallbacks | Brand font, or the pairing from section 4 |
| `--brand-radius` | Button and card corners in the brand system | Else derive from logo and icon corners |

If the project already has tokens, alias them instead of renaming them: `--brand-primary: var(--color-primary);`. Never create a second name for any of the nine tokens.

```css
:root {
  --brand-primary: oklch(0.474 0.085 167); /* given: #1E6B52 */
  --brand-on-primary: oklch(1 0 0);        /* 6.4:1 on primary */
  --brand-accent: oklch(0.776 0.148 69);   /* given: #F2A33A */
  /* surface, on-surface, muted, fonts, radius follow the same pattern */
}
```

Write the same values into the project copy of `assets/tokens/brand-tokens.template.json`: OKLCH in `components`, the sRGB fallback in `hex`, and `$extensions.kinetic-ui.origin` set to given, derived, or assumed. Canvas and WebGL code reads the `hex` field, because those APIs do not read CSS variables and may not parse `oklch()`.

For dark mode, define a second set under `@media (prefers-color-scheme: dark)` or the project's theme switch: re-derive surface, on-surface, and muted, keep the primary hue, and verify every pair again. On other platforms, generate the theme from the JSON (Flutter `ThemeData`, SwiftUI color assets, Compose `MaterialTheme`): see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## 3. Scales and contrast (OKLCH)

Derive 11 steps per brand color:
1. Convert the color to OKLCH and keep its hue H. Set each step's L from the table and scale C by the factor.
2. Clamp to the sRGB gamut by lowering C only. Never move L or H to fit.
3. Replace the step with the closest L by the exact brand value. Example: primary L 0.474 replaces step 700.
4. Yellows and oranges turn olive or brown at constant hue. For steps 700 and darker, shift H a few degrees toward red and check visually.

| Step | L | C × brand C | Typical use |
| --- | --- | --- | --- |
| 50 | 0.97 | 0.15 | Tinted surface |
| 100 | 0.94 | 0.25 | Hover or selected surface |
| 200 | 0.88 | 0.45 | Subtle fills; borders on dark |
| 300 | 0.80 | 0.70 | Decoration; accent text on dark |
| 400 | 0.71 | 0.90 | Primary on dark surfaces |
| 500 | 0.62 | 1.00 | Icons and graphics on light (3:1) |
| 600 | 0.54 | 1.00 | Text and filled buttons on light (about 4.5:1) |
| 700 | 0.46 | 0.90 | Hover, pressed, links on light |
| 800 | 0.38 | 0.75 | Pressed; strong emphasis |
| 900 | 0.29 | 0.55 | Raised dark surface |
| 950 | 0.21 | 0.40 | Dark surface |

Treat the steps as project-local values. If the project needs them as variables, suffix the source token (`--brand-primary-700`); components still use the nine shared tokens as their API. For one-off states, mix at runtime instead: `color-mix(in oklch, var(--brand-primary), black 12%)`.

Contrast is the WCAG 2 ratio on the final sRGB values; OKLCH L only approximates it. Rough guide: on white, text needs L ≤ about 0.55 and UI parts L ≤ about 0.65; on black, text needs L ≥ about 0.60 and UI parts L ≥ about 0.50. Large text (at least 24px regular or 18.66px bold) needs 3:1. Verify these pairs in every color scheme:

| Pair | Minimum | WCAG |
| --- | --- | --- |
| `--brand-on-primary` on `--brand-primary` | 4.5:1 | 1.4.3 |
| `--brand-on-surface` on `--brand-surface` | 4.5:1 (aim for 7:1 for body text) | 1.4.3 |
| `--brand-muted` on `--brand-surface` | 4.5:1 as text; 3:1 as a border that identifies a control | 1.4.3, 1.4.11 |
| `--brand-primary` on `--brand-surface` | 4.5:1 as link or text; 3:1 as icon, fill boundary, or focus ring | 1.4.3, 1.4.11 |
| `--brand-accent` on `--brand-surface` | 3:1 for graphics; 4.5:1 when it carries text | 1.4.11, 1.4.3 |
| Focus indicator against adjacent colors | 3:1 | 1.4.11, 2.4.7 |
| Text over effects (gradient, glass, video) | 4.5:1 at the busiest frame | `references/foundations/accessibility-motion.md` |

## 4. Typography

| Situation | Action |
| --- | --- |
| Display and body faces given, both licensed for web | Use both. Add no third family |
| One family with a full weight range | Use it for both tokens; build hierarchy with size, weight, and width |
| Display face fails at body sizes (thin, decorative, low x-height) | Keep it for large text only; pair a body face |
| Missing glyphs for the content language (for example ñ, ¿, á) | Pair a body face with full coverage and a similar x-height |
| No web license, or the font is desktop-only | Ask the user. Meanwhile, use a metric-close open-source face marked as assumed |
| The brand specifies system fonts | Use a robust system stack; do not upgrade it for taste |

Pairing rules: contrast the structure (for example geometric display with humanist body), match proportions (x-height, width), use at most two families, and verify each license. Never swap a brand font for one you prefer.

Loading: add a metric-adjusted local fallback (`size-adjust`, `ascent-override`) so the font swap does not shift layout (CLS). Animating weight or width (`font-variation-settings`) triggers layout and paint; keep it to short display text and state its cost (`references/effects/text-effects.md`).

## 5. Motion personality

Map the brand's voice adjectives (or its existing motion) to one preset. The presets (Calm, Precise, Energetic, Playful, Luxurious), their token values, and the safe override CSS live in `references/foundations/motion-principles.md` (section Personality presets). This table picks the preset and the tokens each interaction uses.

| Brand attributes | Preset | Token choices | Tier cap |
| --- | --- | --- | --- |
| Trustworthy, precise, institutional, utilitarian | Precise | `--kui-duration-xs` and `--kui-duration-sm` for feedback; `--kui-ease-standard`; `--kui-distance-sm`; no spring | T1 |
| Calm, caring, natural, warm | Calm | `--kui-duration-md` and `--kui-duration-lg`; `--kui-ease-enter`; `--kui-distance-sm` | T2 |
| Premium, elegant, quiet | Luxurious | `--kui-duration-lg` and `--kui-duration-xl` for reveals; `--kui-ease-enter`; `--kui-distance-lg` with slow fades; no `--kui-scale-pop` | T2 |
| Friendly, playful, young | Playful | `--kui-ease-spring` on pops and toggles; `--kui-scale-press`; `--kui-scale-pop`; `--kui-stagger` | T2 |
| Bold, energetic, sporty | Energetic | `--kui-duration-xs` and `--kui-duration-sm`; `--kui-ease-enter`; `--kui-distance-lg`; `--kui-scale-pop` | T3 |
| Technical, futuristic, edgy | Energetic (Precise for tools) | The preset's tokens plus `--kui-ease-linear` for scan lines, glitches, and scroll-linked motion | T3 |
| Imaginative, immersive, storytelling | Luxurious | `--kui-duration-xl` for the hero sequence; `--kui-ease-linear` when scroll-linked; layers driven by `--kui-parallax-strength` | T3 |

Rules:
- Existing brand motion guidelines win over this table. Map their values to the nearest preset, then tune them with the override pattern in `references/foundations/motion-principles.md`.
- The tier cap is a ceiling. Devices and user preferences still lower it (`references/foundations/performance-tiers.md`).
- Never redefine `--kui-*` tokens on a plain `:root` in a brand stylesheet. It loads after `assets/tokens/motion.css` and cancels the reduced-motion collapse. Use only the scoped preset pattern.

## 6. Non-negotiables

| Rule | Apply as |
| --- | --- |
| Logo clear space | Keep the brand-defined clear space free of text, effects, cursor followers, particles, and parallax layers. If the guide does not define it, ask. Until then, reserve the wordmark's cap height on every side and mark it as assumed |
| Minimum size | Never render the logo below the brand minimum. On small screens, switch to the mark-only variant only if the brand approves it |
| No recoloring of brand marks | Use only approved color variants. No gradients, glows, glitch color splits, `hue-rotate`, blend modes, filters, or style palettes on the logo |
| No distortion | No stretching, skewing, rotation, 3D tilt, perspective, splitting the mark into parallax layers, or text effects on the wordmark |
| Logo motion | Animate the logo only with an approved animated version. Otherwise move or fade it as one unit (for example in a page transition) |
| Exact brand colors | `--brand-primary` keeps the given value. Derived steps never replace it next to the logo or in brand marks |
| Brand fonts | Substitute only for license or coverage gaps, and mark the substitute as assumed |
| Legal marks | Keep ™, ®, and required disclaimers visible and readable |

## 7. Adapt a style or effect to the brand

The style supplies structure, texture, shape, and motion grammar. The brand supplies color, type, radius, and voice.

| Layer | From the style | From the brand |
| --- | --- | --- |
| Color | Roles (dark field, neon glow, glass tint) | Values: each role maps to a `--brand-*` token or a derived step |
| Type | Treatment (scale, tracking, weight contrast) | Families: `--brand-font-display`, `--brand-font-body` |
| Shape | Decorative frames, clipped corners, borders | `--brand-radius` on interactive components |
| Texture | Scanlines, grain, noise, glass | Tinted with brand hues at low alpha |
| Motion | Effect grammar (glitch, float, snap) | Preset and tokens from section 5 |
| Copy | Microcopy flavor | Brand voice wins |

Steps:
1. Open the style file and list its color roles; its `## Brand adaptation` section gives the mapping. Map every role to a token or step, and never import the style's default palette.
2. Keep the brand fonts and `--brand-radius` on buttons, inputs, and cards. Express the style through type treatment and decorative frames only.
3. Re-verify contrast for every new pair (glows, glass, text over effects), then check the non-negotiables.

Example: cyberpunk (`references/styles/cyberpunk.md`) for a fictional brand with primary `#1E6B52` (deep green) and accent `#F2A33A` (amber):

| Cyberpunk role | Default look | Brand rendering | Contrast |
| --- | --- | --- | --- |
| Dark field | Blue-black | Primary step 950, `oklch(0.21 0.034 167)` | Base |
| Main neon | Magenta | `--brand-accent` | 8.4:1 on the field |
| Second neon | Cyan | Primary step 400, `oklch(0.71 0.076 167)` | 7.1:1 on the field |
| Glitch split | Red and cyan channels | Accent and primary 400, at most 3 flashes per second | Decorative only |
| Display type | Techno face | `--brand-font-display` with wider tracking and a heavier weight | Text uses step 50 (16:1) |
| Clipped corners | On every element | Decorative frames only; buttons keep `--brand-radius` | Not applicable |

Render the neon glow from the token, not a new color: `text-shadow: 0 0 0.35em color-mix(in oklch, var(--brand-accent) 60%, transparent)`.

The same procedure applies to `references/styles/glassmorphism.md`, `references/styles/neo-brutalism.md`, `references/styles/editorial.md`, `references/styles/minimal-luxury.md`, `references/styles/retro-futurism.md`, `references/styles/organic-soft.md`, and `references/styles/playful-3d.md`.

Brand hooks per effect family:

| Effect | Brand hook |
| --- | --- |
| `references/effects/microinteractions.md` | States use `--brand-primary` and its steps; focus rings reach 3:1 |
| `references/effects/cursor-pointer.md` | Followers use `--brand-accent` and stay out of the logo clear space |
| `references/effects/text-effects.md` | Only on `--brand-font-display` headlines, never on the wordmark |
| `references/effects/ambient-backgrounds.md` | Gradients and particles from primary and accent steps at low chroma |
| `references/effects/page-transitions.md` | Overlays use `--brand-primary`; the logo moves as one unit |
| `references/effects/webgl-3d.md` | Material and light colors come from the token JSON `hex` fields |

## 8. Conflicts: accessibility wins

When the brand and accessibility conflict, accessibility wins. Propose the closest compliant variant and explain it. Change L first, then C, and keep H, because hue carries brand recognition. Apply the variant only where the failure occurs, and keep the exact brand value everywhere else.

| Conflict | Closest compliant variant |
| --- | --- |
| White label on primary fails 4.5:1 | Try a near-black label first. Otherwise darken the fill to the nearest passing step, on text-bearing buttons only |
| Accent fails as text on light (`#F2A33A` reaches 2.1:1 on white) | Use the accent as a fill under dark text (10:1). For accent-colored text, use L 0.55 (`#9D6306`, 5.0:1) |
| Muted gray too light for text | Lower L until it reaches 4.5:1. Keep the light value for dividers that carry no meaning |
| Thin display face at small sizes | Limit it to large text; use a heavier weight or the body face elsewhere |
| Meaning conveyed by color alone (red/green states) | Add an icon, text, or pattern (WCAG 1.4.1) |
| Brand sting flashes or loops | At most 3 flashes per second; add a pause control past 5 s; show a static frame at T0 |
| Text over brand photography | Add a scrim until text reaches 4.5:1 in the busiest region |
| Brand removes focus outlines | Restore a visible focus ring at 3:1 using `--brand-primary` or `--brand-on-surface` |

Explain each change with this sentence:

> `<token>` `<given value>` reaches `<x>`:1 on `<background>`; WCAG `<criterion>` needs `<y>`:1. Proposed: `<variant>` (same hue, L `<from>` → `<to>`), reaching `<z>`:1, used for `<where>`. The original value stays for `<where>`.

## 9. Output block

Fill this block in and show it to the user before building:

```markdown
## Brand intake: <brand name>

- Sources: <files the user provided>; missing: <items still needed>
- Assumptions: <each assumed value and why>

| Token | Value (OKLCH) | Hex | Origin | Note |
| --- | --- | --- | --- | --- |
| `--brand-primary` | | | given / derived / assumed | |
| `--brand-on-primary` | | | | ratio on primary |
| `--brand-accent` | | | | |
| `--brand-surface` | | | | |
| `--brand-on-surface` | | | | ratio on surface |
| `--brand-muted` | | | | ratio on surface |
| `--brand-font-display` | | n/a | | license verified? |
| `--brand-font-body` | | n/a | | license and coverage verified? |
| `--brand-radius` | | n/a | | |

- Scales: primary 50–950 and accent 50–950, with the anchored brand step
- Contrast: every pair from section 3 with its ratio and pass or fail
- Typography: <display> and <body>; pairing reason, or "none needed"
- Motion: <preset>; tokens <list>; tier cap <T1, T2, or T3>
- Non-negotiables: clear space <rule>; minimum size <rule>; approved logo variants <list>
- Style and effects: <style> adapted as <role mapping>; effects <list> with their brand hooks
- Accessibility adjustments: <conflict, variant, ratio, where used>
- Open questions: <blocking questions only>
```
