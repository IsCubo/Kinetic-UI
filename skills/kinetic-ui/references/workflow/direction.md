# Direction

> Keywords: direction, brief, pre-build, surface mode, persuade, operate, read, experience, visual world, motion thesis, focal moment, continuity, feedback, motion budget, constraints, out of scope, audience, open questions, worked example, fintech, onboarding, red flags, handoff, build stage, verify stage, critique stage, loop
> Summary: The decision stage that runs before any UI implementation: resolve surface mode, visual world, motion thesis, and constraints into a one-page brief that the build stage implements and the verify and critique stages check against.

Direction decides what the work must achieve and what it must never do. The build stage chooses components and effects from these decisions; it does not invent them. Write the brief, have it confirmed, then build. This file decides; it does not build.

## When to use

| Situation | Action |
| --- | --- |
| Before building any UI in this skill | Run Steps 1–4 and fill The brief. No effect is chosen before the brief is complete. |
| A vague request ("make it modern", "make it pop") | The vague word is a missing input. Run Steps 1–4 from the evidence available, put the word in Open questions, and ask the one blocking question. |
| The user leads with a style ("I want cyberpunk") | Run Steps 1–4 anyway. The style is a Visual world candidate that must survive the mode and content checks in Step 2, or it is dropped. |
| A design file exists (Figma, mockups) | Still run Steps 1–4. A design states appearance, not success. Extract Mode, constraints, and the Avoid list from it. |

## Inputs

If input is missing, infer from surface, audience, and subject, label the inference in the brief, and keep working. Ask at most one blocking question, batched: "Which surfaces, who uses them, and what should a first-time visitor feel in the first five seconds?" Always offer three candidate Modes from Step 1, each with the emotion that fits it, so the answer is a selection, not free text. If the answer never arrives, take the inference you labeled and say so in the build report.

## Step 1 — Surface mode

One mode dominates the surface. Its definition of success is the single test the build and critique stages use.

| Mode | Success | Motion role | Density | Typical surfaces | Tier ceiling |
| --- | --- | --- | --- | --- | --- |
| Persuade | The visitor decides and acts: sign-up, purchase, donation, share happens on this page | Brand and Focus carry the page: one orchestrated moment, delight second, feedback on the action | Low: one message per viewport, one action per screen | Landing page, campaign, product launch, event page | T3, lazily loaded |
| Operate | The task completes correctly in the fewest actions; time-on-task and error rate drop | Feedback and Orientation only: motion answers actions, never precedes or delays them | High: many controls within reach | Dashboard, forms, settings, tables, checkout, onboarding wizards | T2; T1 in money and destructive paths |
| Read | The reader finishes and can retell the content; scroll depth and completion matter, not clicks | Focus and Orientation at section entries, then stillness; reading progress is a permitted constant | Medium: one measure per view, secondary voices quiet | Articles, documentation, case studies, annual reports | T2 |
| Experience | The user stays, explores, and returns; the environment itself is the product | Brand and Delight: one continuous, choreographed world, plus gesture-driven feedback | Low to medium: space over content | Games, galleries, 3D product viewers, interactive stories, WebGL scenes | T3, with a static poster and a skip control |

Rules a reviewer can check:

- Name one dominant Mode per brief. A second Mode runs only inside a delimited zone — checkout inside a Persuade page, a hero inside an Operate app — and that zone gets its own motion roles.
- The Mode sets the tier ceiling. Steps below can lower it, never raise it.
- When two Modes claim dominance, the surface is two products split across one URL. Split the brief or scope one part out.
- Motion roles and the tier names above map to `references/foundations/motion-principles.md` (purposes) and `references/foundations/performance-tiers.md` (T0–T3). Relative surfaces per device follow `references/foundations/devices-responsive.md`.

## Step 2 — Visual world

Resolve identity first, from evidence:

| Evidence | Path |
| --- | --- |
| Brand material exists (logo, palette, fonts, tokens, Figma) | `references/brand/brand-intake.md`: tokens are fixed; styles and effects adapt to them |
| Nothing provided | `references/brand/emotion-to-style.md`: page type × emotion gives style, palette, type, motion personality, and the tier cap; the result is labeled a proposal until confirmed |

Then name the world in one sentence. The sentence names the subject and its moment — "a ledger you can trust at 2 a.m.", "a rally stage at dawn" — never a style ("a dark neon site") and never an adjective pair ("clean and modern"). Tests:

- Two different subjects must produce two different sentences. If yours fits both, it is generic and fails.
- From the sentence alone a stranger can guess the palette temperature, type weight, and motion speed. If they cannot, add the missing axis in the same sentence.

Add 2–3 concrete references: named sites, films, posters, books, or physical objects the world draws from, each with what to take from it ("pull the ledger numerals from the Bloomberg terminal in Margin Call; take the ink-green field from the Monzo card"). Categories ("modern SaaS landing pages") are not references.

The Avoid list needs at least three entries: at least one from the generic-default table in `references/brand/emotion-to-style.md` (section "Avoid generic AI defaults" — purple-to-blue gradient hero, fade-and-rise on every section, cards inside cards, and the like), and at least one subject-specific refusal ("no celebration animation on money values"). If your Avoid list would pass unchanged for a different subject, add the subject-specific entry.

## Step 3 — Motion thesis

A thesis is one sentence of choreography for the whole surface, built from four decisions. A generic fade-and-rise or scroll reveal is not a thesis: if the focal moment could be pasted into a different product with only a color changed, it is decoration — tie it to this subject's data, content, or the defining action instead.

| Element | Decide | Passes when |
| --- | --- | --- |
| Focal moment | The one scene that gets choreography: which element, what it says or shows, when it happens, what changes | It carries the Mode's message, and a screenshot of the end state tells the same story so T0 loses nothing |
| Continuity | The named element or transition that carries identity between views | You can point at it: "the product card becomes the detail header", "the row slides into the detail sheet" |
| Feedback | The response per interactive class (press, select, submit, error, success) and its ceiling | Every class is named with a token scale response (`--kui-duration-xs` to `--kui-duration-md`), and response intent lands within 100 ms per `references/foundations/motion-principles.md` |
| Budget | How many animated moments per view, counted in moments, not effects | The count fits the Mode's tier ceiling and the page-type guardrails in `references/brand/emotion-to-style.md`; at T0 only feedback and progress survive |

Priority when the budget is tight is fixed, from the purpose ranking: cut Delight, then Brand, then Continuity, then Focus; Feedback goes last (or is left to `references/foundations/accessibility-motion.md`). Never balance an over-budget moment by adding another.

## Step 4 — Constraints

Constraints turn taste into commitments. Every constraint row must be checkable by looking at the build.

| Constraint | Decide | Record in the brief as |
| --- | --- | --- |
| Devices | Platforms shipped, smallest supported viewport, dominant input mode | "Mobile web and desktop; 360 CSS px floor; touch-first with keyboard parity" |
| Tiers | The design's tier cap already set by Mode and guardrails, plus the T0 contract — what remains without motion | "Cap T2, T1 in the flow; at T0 the stepper, totals, and errors are fully present, no count-up" |
| Performance | The LCP element by name, and what may not load before it; the JS motion budget tier | "Hero image is LCP; T3 assets lazy-load after it per `references/foundations/performance-tiers.md`" |
| Accessibility | Reduced-motion behavior per moment, contrast commitments, keyboard and focus rules, pause control for anything over 5 s or looping | "Motion pause control; error = color + icon + text, never shake alone" |
| Content | Which copy and data are real versus placeholder, and their volume | "Onboarding copy final; balances are licensed sample data, max 3 accounts" |
| Out of scope | Explicit refusals the build may not implement even if it could | "No WebGL, no ambient background loop, no sound, no custom illustration" |

Rules:

- "Low priority" is not a constraint. Either name what the build must not make, or delete the line.
- Out of scope entries are checkable: a reviewer can grep or look and say if the refusal was broken.
- Content that does not exist yet is recorded as placeholder with its shape, never as "we'll fill it later".

## The brief

Copy this template. Every field is one line. A field you cannot fill becomes an Open questions entry, never an empty line or a vague adjective.

```markdown
# Brief — <surface name>

- Surface: <what is being built, in one line with platform and viewport floor>
- Audience: <who uses it, including device class and frequency of use>
- Mode: <Persuade | Operate | Read | Experience, plus any delimited zone>
- Visual world: <the one-sentence world; brand given or proposal, labeled>
- Avoid: <≥ 3 entries: ≥ 1 generic default, ≥ 1 subject-specific>
- Focal moment: <the one choreographed scene: element, message, timing, end state>
- Continuity: <the named element or transition that carries identity between views>
- Feedback: <response per interactive class with its duration-token ceiling>
- Motion budget: <animated moments per view; what remains at T0>
- Components: <patterns from references/foundations/ui-patterns.md, by pattern name>
- Effects: <candidate effects from the style row, each with its tier>
- Tiers: <cap for the surface, cap for zones, and the T0 contract>
- Out of scope: <checkable refusals>
- Open questions: <unresolved inputs, max 3, each with the current default>
```

Field rules the critique stage enforces: Components lists pattern names from `references/foundations/ui-patterns.md`, not invented widgets. Effects are the style row's signature effects and reference files, not free-association names. Open questions always carries a current default, so the build can proceed if nobody answers.

## Worked example

Fintech onboarding: a signed-up user must connect a bank account and leave with working balances. Note how the page-type guardrail binds: no playful motion around money, figures settle as tabular numerals, T1 inside the flow.

```markdown
# Brief — Fintech onboarding (web app, mobile web at 360 px)

- Surface: 3-step onboarding wizard plus a first-load dashboard confirmation
- Audience: First-time retail users on mid-range Android phones, opening once a day
- Mode: Operate; the dashboard confirmation is a delimited Persuade zone
- Visual world: "A ledger you can trust at 2 a.m." — proposed identity:
  minimal-luxury adaptation, deep teal field, tabular grotesk figures, one
  amber accent reserved for states (not sent yet)
- Avoid: Purple-to-blue gradient hero; any celebration animation on a money
  value; cards inside cards; cream-and-terracotta default; identical rounded
  cards with the same shadow
- Focal moment: When the account connection completes, the checklist row's
  check draws in once and the progress meter advances; the only choreographed
  moment in the flow
- Continuity: The connected account row from step 2 reappears as the dashboard
  header card on first load (shared element, crossfade fallback)
- Feedback: Press = `--kui-duration-xs` scale-up to 0.98 with color; input
  errors on blur = color + icon + text at `--kui-duration-sm`, no shake; submit
  = in-place busy state, no double submit
- Motion budget: 1 focal moment + 3 feedback classes per step; at T0 stepper,
  balances (settled, tabular), and errors are fully present, no draw-in
- Components: Wizard, inline validation, setup checklist, KPI cards
- Effects: Micro interactions (check draw, meter, button states), page
  transition into the dashboard — all T1-safe variants
- Tiers: Surface cap T2, flow cap T1; T0 contract as stated under budget
- Out of scope: WebGL, ambient background loops, sound, autoplay tour
  carousel, custom icon set
- Open questions: Demo data real or mocked? (default: mocked, max 3
  accounts); dark scheme at launch? (default: light only); iOS parity in v1?
  (default: no)
```

## Red flags

| Red flag | Why it fails | Correction |
| --- | --- | --- |
| Three focal moments ("hero reveal + parallax sections + closing celebration") | Attention splits; the page reads as generated and the budget burns on decoration | One focal moment; demote the rest to feedback or drop them |
| Style chosen before content ("it looks premium") | The style cannot survive the Mode and content checks, so it gets deleted after the build | Re-run Step 2 with the subject first; adopt a style that survives |
| Motion as decoration ("it just makes it feel alive") | Purposeless motion is dead weight at T0 and the first thing the critique cuts | Name the purpose from `references/foundations/motion-principles.md` or delete the effect |
| T3 on the default path | Low-end and reduced-motion users get a blocked first paint instead of content | Default path stays at or under the Mode's ceiling; T3 loads lazily after LCP, behind a poster |
| The brief names an effect as the focal moment ("a WebGL scene") | An effect is an implementation choice, not a message; the build needs direction, not a library tip | Describe the message and end state; the build picks the effect |
| No Avoid list, only aspirations | Generic AI defaults walk straight back in | At least one generic default and one subject-specific refusal |
| Fields filled with adjectives ("modern, clean, engaging") | Not checkable, so verify and critique cannot judge anything | Replace each adjective with a testable statement or an Open questions entry |
| Out of scope left empty | The build fills silence with its own scope, and review has no baseline | List checkable refusals, even if the list is short |
| Motion budget counted in effects ("5 animations") | Effects stack until the surface over-animates and the cap is breached | Count moments per view and hold the total against the guardrail |

## Handoff

Pass to the build stage, verbatim:

1. This brief, every field filled, with inferences labeled where they are not confirmed.
2. The resolved identity: the token output of `references/brand/brand-intake.md`, or the confirmed proposal from `references/brand/emotion-to-style.md`.
3. The tier cap and preset from Steps 1–3, restated so the build cannot re-litigate them.

Then the loop continues outside this file:

| Next | File |
| --- | --- |
| Implement the brief | Build stage: components and effects per the brief, lowest tier first |
| Check the build against the brief's constraints | `references/workflow/verify.md`, running `assets/snippets/verify-motion.js` |
| Judge the result against the brief's intent | `references/workflow/critique.md` |
| Fix cycles between verify and critique | `references/workflow/loop.md` |

Rules for the handoff:

- The build stage may reduce the tier cap or cut effects to respect budget and reduced motion. It may not add a Mode, a focal moment, or an out-of-scope item.
- Every deviation from the brief the build cannot satisfy is reported as "brief says X, constraint Y blocks it" — never silently resolved.
- A brief with unresolved Open questions still gates the build: current defaults are carried as labeled assumptions, and the output contract states them.

If the built surface fails the brief, fix the surface first. If it fails the brief twice, the brief was wrong: revise it through Steps 1–4 and route the affected work through the loop again.
