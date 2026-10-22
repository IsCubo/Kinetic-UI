# Emotion to style

> Keywords: no brand, brand proposal, emotion, mood, feeling, page type, style suggestion, palette direction, typography direction, motion personality, signature effects, tier cap, saas, fintech, fashion, gaming, portfolio, agency, health, education, kids, luxury, nonprofit, developer docs, events, music, sin marca, sentimiento, tipo de página
> Summary: When no brand is provided, maps page type and target emotion to a proposed style, palette, typography, motion personality, tier cap, and signature effects, presented as a proposal for the user to confirm before building.

Use this file only when the user provides no brand material. If any exists (logo, colors, fonts, tokens, Figma), run `references/brand/brand-intake.md` and use this file only to fill the gaps. The result is a proposal, not a brand: present it, wait for confirmation, then build.

## Quick path

1. Confirm that no brand exists. Ask once if the brief is unclear.
2. Name the page type and at most two emotions (primary, secondary).
3. Look up the exact page type × emotion row. If there is none, combine the emotion row with the page-type guardrail.
4. Turn the palette and type hints into the nine `--brand-*` tokens.
5. Run the anti-default check.
6. Fill "Proposal — not a brand", present it, and wait for confirmation.
7. After confirmation, continue with `references/brand/brand-intake.md` from section 3 (scales and contrast).

## Read the brief

| Signal in the brief | Read as |
| --- | --- |
| Product, audience, and the main action (sign up, buy, donate, read) | Page type |
| Adjectives ("serious", "fun", "premium", "edgy") or reference sites | Emotion |
| Neither is stated | Infer both from the subject, and label them inferred in the proposal |

If the emotion cannot be inferred, ask one question: "What should visitors feel in the first five seconds?" Offer the three emotions from this file that best fit the page type.

## Emotion rows (the base)

Font examples are open-source families. Verify each license, its language coverage, and the available weights before use. The Motion column names a preset from `references/foundations/motion-principles.md` (section Personality presets); `references/brand/brand-intake.md` (section 5) lists the `--kui-*` tokens each preset uses.

| Emotion | Style | Palette (OKLCH) | Type direction | Motion | Tier cap | Signature effects |
| --- | --- | --- | --- | --- | --- | --- |
| Trust | `references/styles/editorial.md` | Primary H 200–250, L 0.40–0.50, C 0.08–0.14; neutrals in the primary hue at C ≤ 0.015 | Humanist or neo-grotesque sans, sturdy text weights: IBM Plex Sans, Public Sans, Source Sans 3 | Precise | T2 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Calm | `references/styles/organic-soft.md` | C 0.03–0.08; H 140–200 (sage, sea) or 60–90 (sand); accents L 0.55–0.80; surface L 0.96–0.98 | Humanist sans or open text serif: Nunito Sans, Lora, Literata | Calm | T2 | `references/effects/ambient-backgrounds.md` (slow), `references/effects/microinteractions.md` |
| Energy | `references/styles/neo-brutalism.md` | Primary C 0.18–0.26, H 20–50 or 110–135, L 0.60–0.75; stark surface (L 0.98 or 0.15) | Condensed or extended heavy grotesk: Archivo, Barlow Condensed, Anton | Energetic | T3 | `references/effects/text-effects.md`, `references/effects/motion-2d.md`, `references/effects/scroll-driven.md` |
| Rebellion / futuristic | `references/styles/cyberpunk.md` (alt. `references/styles/retro-futurism.md`) | Dark field L 0.13–0.20, C 0.02–0.05; 1–2 neon accents L 0.75–0.88, C 0.18–0.30 in hues from the subject's world | Techno, extended, or mono display with a plain body sans: Chakra Petch, Space Grotesk, JetBrains Mono | Energetic, plus `--kui-ease-linear` for glitches and scan lines | T3 | `references/effects/text-effects.md`, `references/effects/webgl-3d.md`, `references/effects/cursor-pointer.md` |
| Luxury | `references/styles/minimal-luxury.md` | Near-achromatic, C ≤ 0.02, at the extremes (L 0.14–0.20 and 0.95–0.98); one jewel or metallic accent, C 0.06–0.12, used sparingly | High-contrast serif display with a quiet sans: Bodoni Moda, Cormorant Garamond, Jost | Luxurious | T2 | `references/effects/page-transitions.md`, `references/effects/text-effects.md`, `references/effects/parallax.md` (subtle) |
| Playful | `references/styles/playful-3d.md` | 3–4 hues spaced 90–120° apart, C 0.14–0.22, L 0.70–0.85; ink text at L ≤ 0.30 | Rounded or chunky sans: Nunito, Baloo 2, Fredoka | Playful | T2 | `references/effects/microinteractions.md`, `references/effects/motion-2d.md`, `references/effects/depth-layers.md` |
| Warmth | `references/styles/organic-soft.md` | H 30–80 (tomato, ochre, rose), C 0.08–0.15, L 0.55–0.72; warm-tinted surface L 0.95–0.97, C 0.01–0.02 | Soft serif or humanist sans: Fraunces, Source Serif 4, Nunito Sans | Calm | T2 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Authority | `references/styles/editorial.md` | Deep ink L 0.20–0.35, H 250–270, C 0.03–0.08; one decisive accent (H 20–30, C 0.15–0.20) for emphasis only | Classic text serif or strong grotesk: Source Serif 4, Libre Caslon Text, Libre Franklin | Precise | T1 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Wonder | `references/styles/glassmorphism.md` (alt. `references/styles/retro-futurism.md`) | Night field L 0.15–0.25; luminous accents in 2–3 unrelated hues (for example H 150–170 and 70–85), C 0.12–0.20 | Expressive variable display with a calm body face: Fraunces, Syne, Bricolage Grotesque | Luxurious, plus `--kui-ease-linear` when scroll-linked | T3 | `references/effects/webgl-3d.md`, `references/effects/parallax.md`, `references/effects/depth-layers.md` |

## Page type × emotion

Tuned combinations for the most common pairs. For any other pair, apply "Combine page type × emotion" below.

| Page type | Emotion | Style | Palette direction | Type direction | Motion | Tier cap | Signature effects |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SaaS | Trust | `references/styles/editorial.md` | Ink blue or teal H 200–240; one accent rotated about 150°, C 0.14 | Grotesk with a distinct display weight: Public Sans, Instrument Sans | Precise | T2 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| SaaS | Energy | `references/styles/neo-brutalism.md` | Saturated primary H 25–45 or 120–135 on an L 0.98 surface; ink borders | Extended grotesk: Archivo, Space Grotesk | Energetic | T2 | `references/effects/microinteractions.md`, `references/effects/motion-2d.md` |
| Fintech | Trust | `references/styles/minimal-luxury.md` | Deep green or teal H 160–200, L 0.30–0.45, C 0.06–0.12; gains and losses also shown by sign and icon | Grotesk with tabular figures: IBM Plex Sans, Manrope | Precise | T2 | `references/effects/microinteractions.md`, `references/effects/motion-2d.md` (number and chart changes) |
| Fintech | Authority | `references/styles/editorial.md` | Ink H 250–265 at L 0.25; one accent at H 25 for alerts and emphasis | Text serif headings with a grotesk UI: Source Serif 4, IBM Plex Sans | Precise | T1 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| E-commerce fashion | Luxury | `references/styles/editorial.md` | Achromatic frame, C ≤ 0.01; product photos carry the color; one seasonal accent | Didone display with a quiet sans: Bodoni Moda, Jost | Luxurious | T2 | `references/effects/page-transitions.md`, `references/effects/text-effects.md`, `references/effects/cursor-pointer.md` |
| E-commerce fashion | Rebellion / futuristic | `references/styles/neo-brutalism.md` | One raw accent, C ≥ 0.22, on stark white or black | Condensed heavy grotesk: Anton, Barlow Condensed | Energetic | T2 | `references/effects/text-effects.md`, `references/effects/motion-2d.md` |
| Gaming | Rebellion / futuristic | `references/styles/cyberpunk.md` | Field at L 0.15 in the game's dominant hue; neons sampled from in-game art | Techno display: Chakra Petch, Unbounded | Energetic | T3 | `references/effects/webgl-3d.md`, `references/effects/text-effects.md`, `references/effects/depth-layers.md` |
| Gaming | Wonder | `references/styles/retro-futurism.md` | Horizon gradient between two in-world hues, with film grain | Extended display with a mono: Unbounded, Space Mono | Luxurious | T3 | `references/effects/webgl-3d.md`, `references/effects/parallax.md`, `references/effects/ambient-backgrounds.md` |
| Portfolio | Calm | `references/styles/editorial.md` | Near-neutral, C ≤ 0.02; the work supplies the color | One expressive display with a plain body: Bricolage Grotesque, Literata | Calm | T2 | `references/effects/page-transitions.md`, `references/effects/scroll-driven.md` |
| Portfolio | Rebellion / futuristic | `references/styles/neo-brutalism.md` | Monochrome plus one loud accent | Grotesk with mono details: Space Grotesk, JetBrains Mono | Energetic | T2 | `references/effects/cursor-pointer.md`, `references/effects/text-effects.md`, `references/effects/page-transitions.md` |
| Creative agency | Energy | `references/styles/neo-brutalism.md` | One loud hue, C ≥ 0.22, against L 0.15 or L 0.98 | Extended or variable display: Archivo, Bricolage Grotesque | Energetic | T3 | `references/effects/text-effects.md`, `references/effects/cursor-pointer.md`, `references/effects/scroll-driven.md` |
| Creative agency | Wonder | `references/styles/glassmorphism.md` | Night field with luminous accents taken from the agency's work | Expressive display: Syne, Fraunces | Luxurious | T3 | `references/effects/webgl-3d.md`, `references/effects/ambient-backgrounds.md`, `references/effects/parallax.md` |
| Health | Calm | `references/styles/organic-soft.md` | Sage or sea H 150–190, C 0.04–0.08, surface L 0.97; red only for real alerts | Humanist sans with a large x-height: Nunito Sans, Source Sans 3 | Calm | T1 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Health | Trust | `references/styles/editorial.md` | Teal H 190–210, L 0.40–0.50 | Public Sans with Source Serif 4 | Precise | T1 | `references/effects/microinteractions.md` |
| Education | Warmth | `references/styles/organic-soft.md` | Ochre or tomato H 40–80 with a calm secondary hue | Literata with Nunito Sans | Calm | T2 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` (progress), `references/effects/motion-2d.md` |
| Education | Authority | `references/styles/editorial.md` | Ink H 250–270 with one institutional accent | Libre Caslon Text with Libre Franklin | Precise | T1 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Kids | Playful | `references/styles/playful-3d.md` | 3–4 bright hues, C 0.14–0.20, L 0.72–0.85; ink text | Baloo 2, Fredoka | Playful | T2 | `references/effects/microinteractions.md`, `references/effects/motion-2d.md`, `references/effects/depth-layers.md` |
| Luxury | Luxury | `references/styles/minimal-luxury.md` | Achromatic extremes; one jewel accent (oxblood H 20–30, emerald H 155–165) or a metallic H 80–90, C ≤ 0.10 | Bodoni Moda or Cormorant Garamond with Jost | Luxurious | T2 | `references/effects/page-transitions.md`, `references/effects/parallax.md`, `references/effects/text-effects.md` |
| Nonprofit | Warmth | `references/styles/organic-soft.md` | Warm primary H 30–70; real photography carries the emotion | Fraunces or Source Serif 4 with Nunito Sans | Calm | T2 | `references/effects/scroll-driven.md` (story progress), `references/effects/parallax.md` (light), `references/effects/microinteractions.md` |
| Nonprofit | Trust | `references/styles/editorial.md` | Deep teal or ink with a warm accent reserved for the main action | Source Serif 4 with Public Sans | Precise | T1 | `references/effects/microinteractions.md`, `references/effects/scroll-driven.md` |
| Developer tools / docs | Trust | `references/styles/editorial.md` | Neutral ink with one hue for links and code highlights; light and dark schemes | Grotesk with a code mono: IBM Plex Sans, JetBrains Mono | Precise | T1 | `references/effects/microinteractions.md` |
| Developer tools / docs | Rebellion / futuristic | `references/styles/cyberpunk.md` | Dark field with one neon from the product's domain | Space Grotesk with JetBrains Mono | Precise, plus `--kui-ease-linear` for terminal effects | T2 | `references/effects/text-effects.md`, `references/effects/cursor-pointer.md`, `references/effects/microinteractions.md` |
| Events / music | Energy | `references/styles/retro-futurism.md` | Poster palette: two saturated hues 120–180° apart, C 0.18–0.26 | Unbounded with Anton | Energetic | T3 | `references/effects/text-effects.md`, `references/effects/scroll-driven.md`, `references/effects/motion-2d.md` |
| Events / music | Rebellion / futuristic | `references/styles/cyberpunk.md` | Field and neons sampled from the event's artwork | Chakra Petch with Space Mono | Energetic | T3 | `references/effects/webgl-3d.md`, `references/effects/text-effects.md`, `references/effects/ambient-backgrounds.md` |

## Page-type guardrails

| Page type | Tier ceiling | Guardrail |
| --- | --- | --- |
| SaaS | T2 (T1 inside the product UI) | Motion never delays a task; load demos on interaction |
| Fintech | T2 (T1 in transaction flows) | No playful motion around money; figures settle instantly and use tabular numerals |
| E-commerce fashion | T2 | The product image is the LCP; nothing heavy loads before it |
| Gaming | T3 | Ship a static poster and a skip control for intros |
| Portfolio | T2 (T3 for a single hero) | Effects frame the work and never cover it |
| Creative agency | T3 | One memorable moment; case studies stay readable |
| Health | T1 | No urgency or alarm motion; plain-language content first |
| Education | T2 | Feedback and progress motion only; no decoration during reading or quizzes |
| Kids | T2 | Targets of at least 44 × 44 CSS px; no flashing; no countdown pressure |
| Luxury | T2 | One slow reveal per view; generous whitespace |
| Nonprofit | T2 | The donation path stays fast on low-end phones |
| Developer tools / docs | T1 | Readability and search first; code blocks never animate |
| Events / music | T3 | Dates, tickets, and lineup readable at T0; pause control on looping visuals |

## Combine page type × emotion

1. If the exact row exists, use it.
2. Otherwise, take style, palette, type, motion, and effects from the emotion row. Set the tier cap to the lower of the emotion cap and the page-type ceiling, and apply the guardrail.
3. Replace every effect that needs a higher tier than the cap with its lower-tier variant (each effect's `## Low-end fallback`), or drop it.
4. With two emotions, the primary sets style and palette. The secondary may set only the motion preset or the accent.
5. If the pair is in tension (health × rebellion, kids × luxury), name the tension, propose the page-type-safe option, and ask one question.
6. The tier cap is a ceiling: device tiers and `prefers-reduced-motion` still lower it (`references/foundations/performance-tiers.md`, `references/foundations/accessibility-motion.md`).

## From hints to tokens

| Token | How to set it from the row |
| --- | --- |
| `--brand-primary` | Middle of the row's hue range at its L and C; clamp C to the sRGB gamut |
| `--brand-on-primary` | White or near-black, whichever reaches 4.5:1 on primary |
| `--brand-accent` | The row's accent, or the primary hue rotated 120–180° |
| `--brand-surface` | L 0.97–0.99 in the primary hue at C ≤ 0.015, or the row's dark field |
| `--brand-on-surface` | Same hue, C ≤ 0.02; L ≤ 0.25 on light surfaces, L ≥ 0.92 on dark ones |
| `--brand-muted` | Same hue; L about 0.50 on light surfaces or about 0.70 on dark ones, verified at 4.5:1 |
| `--brand-font-display` | First example in the type direction, with a metric-close fallback |
| `--brand-font-body` | The display family when it reads well at body sizes; otherwise the paired body face |
| `--brand-radius` | From the style file's visual language. If it gives none: editorial 2–6px; organic-soft 12–20px; playful-3d 16px or pill; neo-brutalism and minimal-luxury 0–2px |

## Avoid generic AI defaults

| Default | Why it fails | Do instead |
| --- | --- | --- |
| One default sans for everything, on every project | The identity disappears and the page reads as a template | Take type from the row; let the display face carry the personality; use at most two families |
| Purple-to-blue gradient hero | The most recognizable generated-UI tell; it says nothing about the subject | Take hues from the subject's world; keep any gradient within the row's hues |
| Cards inside cards | Nested containers flatten hierarchy and waste space | Use one container level; group with spacing, rules, and the type scale |
| Identical rounded cards with the same soft shadow | Every block gets equal weight | Vary containers by content role; let radius and elevation follow hierarchy |
| Fade-and-slide-up on every section | Scattered motion reads as generated and costs performance | One orchestrated moment per view; otherwise motion answers user actions |
| Cream background with a terracotta accent, or near-black with one acid-green accent | Common defaults that ignore the subject | Use them only when the subject itself calls for them, and say why |

Self-check: if you would propose the same result for a different page type, change one axis (palette, type, or layout) and state what changed.

## Proposal — not a brand

Present this template to the user and wait for confirmation before building:

```markdown
## Proposal — not a brand

No brand was provided, so this is a proposed identity based on the page type and the feeling to convey. Confirm it or change any line before I build.

- Page type: <type>
- Emotion: <primary> (secondary: <emotion or none>), <stated by you | inferred from "<quote from the brief>">
- Style: <style name>, because <one reason tied to the subject>

| Token | Proposed value | Role |
| --- | --- | --- |
| `--brand-primary` | oklch(<L> <C> <H>), <hex> | Primary actions |
| `--brand-on-primary` | | Text on primary (<ratio>:1) |
| `--brand-accent` | | Highlights, focus, signature effects |
| `--brand-surface` | | Background |
| `--brand-on-surface` | | Body text (<ratio>:1) |
| `--brand-muted` | | Secondary text (<ratio>:1) |
| `--brand-font-display` | <family>, <fallbacks> | Headlines (license to verify) |
| `--brand-font-body` | <family>, <fallbacks> | Body and UI |
| `--brand-radius` | <value> | Corners |

- Motion: <preset>; tokens <list>; tier cap <T1, T2, or T3>
- Signature effects: <1–3 effects>, each with its reduced-motion behavior
- Defaults avoided: <what was deliberately not done>
- To confirm: <1–3 questions, for example "Is there an existing logo or color we must keep?">

Reply "confirm", or tell me what to change.
```

## After confirmation

1. Copy `assets/tokens/brand-tokens.template.json` into the project, fill each `$value`, and set `$extensions.kinetic-ui.origin` to `proposed`.
2. Write the nine `--brand-*` tokens in CSS (or the platform theme).
3. Continue with `references/brand/brand-intake.md` sections 3 to 9, treating the confirmed proposal as the brand.
4. If the user later provides real brand material, discard the proposal and run the brand intake from the start.
