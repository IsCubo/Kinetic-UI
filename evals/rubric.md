# Blind review rubric

Score each anonymized answer (A and B) per dimension from 0 to 4. Use `null`
when a dimension does not apply (for example, `typography` for a critique that
contains no design). Judge the deliverable itself, not the vocabulary it uses.
A decisive but unfamiliar approach beats a familiar one that is generic.

| Score | Meaning |
| --- | --- |
| 0 | Absent or harmful |
| 1 | Present but generic or partly wrong |
| 2 | Competent, unremarkable |
| 3 | Strong, specific to the brief |
| 4 | Exceptional and defensible under questioning |

## Dimensions

- `brief-specificity`: the answer commits to concrete choices for this brief
  (audience, references, what to avoid) instead of adjectives like "modern" or
  "clean".
- `visual-world`: palette, type, imagery, and tone belong to one coherent
  world, not a template.
- `hierarchy`: the eye lands on one clear thing first, then the next; density
  fits the surface.
- `typography`: type choices, scale, and rhythm serve the content and the world.
- `color`: palette is intentional, contrast is sufficient, and accent use is
  restrained.
- `motion-purpose`: each motion has a job (feedback, continuity, one focal
  moment), and the page is not decorated with animation.
- `reduced-motion`: the reduced-motion experience is an equivalent design, not
  motion simply switched off.
- `low-end-restraint`: cost is proportional to the device; heavy effects degrade
  or load late instead of shipping to everyone.
- `evidence-honesty`: claims are backed by something observable; what could not
  be checked is stated as unverified instead of presented as passing.

## Procedure

1. Run `node scripts/eval.mjs blind --iteration N`.
2. Open `review/` only. Do not open `blind-key.json` or any `RUN.md`.
3. Copy `review/scores.json` and fill it in. Set `reviewer` to your name.
4. Score every dimension for A and B in each case before looking at the key.
5. Run `node scripts/eval.mjs unblind --iteration N --scores <file>`.

Use at least two independent reviewers when the result will be quoted. Each
reviewer fills in a separate copy and the results are reported side by side.

## Known leakage

Answers produced with the skill often use its vocabulary (tiers, surface modes)
and vendor its snippets. A reviewer may infer which answer is which. Score what
is on the page; if you recognize an answer, say so in `notes` and keep scoring.
