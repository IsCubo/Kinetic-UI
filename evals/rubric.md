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

## What counts as evidence

Score the rendered page, not the description of it. Capture frames first, then
judge. Prose that promises a composition is not evidence that the composition
exists; an answer that never rendered cannot earn above 2 on `impact`,
`motion-fidelity` or `3d-fidelity`, and `evidence-honesty` scores whether it said
so plainly.

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
- `impact`: the first screen stops the eye and holds it. One clear focal point,
  real craft in the composition, and attention earned by the content rather than
  by noise or scale. Score the frame at 0%, not the prose around it.
- `motion-fidelity`: the motion feels like the brief asked for — pace, weight and
  direction of travel — and the key scroll positions stay composed. A midpoint
  that ghosts, washes out or loses its content scores low however smooth the code
  is. Score the frames against the words the brief used.
- `3d-fidelity`: the requested object is recognisable and correctly proportioned
  against the stated dimensions, sits in believable light and shadow, and its
  material reads as the material asked for. A generic blob in the right palette
  scores 1; a plausible but wrong silhouette scores 2 at most.
- `reduced-motion`: the reduced-motion experience is an equivalent design, not
  motion simply switched off.
- `low-end-restraint`: cost is proportional to the device; heavy effects degrade
  or load late instead of shipping to everyone.
- `evidence-honesty`: claims are backed by something observable; what could not
  be checked is stated as unverified instead of presented as passing.

## Procedure

1. Run `node scripts/eval.mjs blind --iteration N`.
2. Capture the frames before scoring:
   `node scripts/capture-frames.mjs --out review/frames --url review/<case>/A/index.html --url review/<case>/B/index.html --reduced-motion`
   Add `--chrome <path>` when the browser is not in a usual location. A page
   that renders blank or unscrolled is a finding, not a capture failure: say so
   in `notes`.
3. Open `review/` only. Do not open `blind-key.json` or any `RUN.md`.
4. Copy `review/scores.json` and fill it in. Set `reviewer` to your name.
5. Score every dimension for A and B in each case before looking at the key.
   Score `impact`, `motion-fidelity` and `3d-fidelity` from the PNGs; if a page
   could not be rendered, set those dimensions to `null` and say why.
6. Run `node scripts/eval.mjs unblind --iteration N --scores <file>`.

Use at least two independent reviewers when the result will be quoted. Each
reviewer fills in a separate copy and the results are reported side by side.

## Known leakage

Answers produced with the skill often use its vocabulary (tiers, surface modes)
and vendor its snippets. A reviewer may infer which answer is which. Score what
is on the page; if you recognize an answer, say so in `notes` and keep scoring.
