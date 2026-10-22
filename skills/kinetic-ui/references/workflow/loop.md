# Workflow loop

> Keywords: workflow, process, direction, build, verify, critique, review loop, design brief, verification report, findings, iterate, definition of done
> Summary: The four-stage loop for any kinetic-ui surface — decide, build, prove, judge — with the artifact each stage produces and the bounded fix cycle between them.

kinetic-ui is not a bag of effects. It is a loop: **direction → build → verify → critique → fix**. Each stage has an artifact, and no stage may claim the next one's job.

## When to use

Every frontend task, from one component to a whole product surface. Scale the artifacts, never skip the stages: a single button needs a two-line brief, not a document; a landing page needs the full brief and a verification report.

## The loop

```text
request
  → 1. direction   decide what success means, the world, the motion thesis
  → 2. build       tokens, lowest tier first, enhance, states, accessibility
  → 3. verify      prove it works: matrix, reduced motion, tiers, performance
  → 4. critique    judge the rendered result: scorecard, severity, findings
  → 5. fix         blockers first, one batch, re-check only what changed
       ↑__________________________|
```

## Stage 1 — Direction

Decide before writing code. The output is a brief: surface mode, visual world, focal motion moment, constraints, and out of scope.

- Full procedure: `references/workflow/direction.md`.
- Small work: three lines in the reply — mode, world, focal moment — and continue.
- Large work: the full brief, kept next to the task or in `DESIGN.md`.
- Do not start building while two of these are undecided: the mode, the world, or the focal moment.

## Stage 2 — Build

Build in this order, because each step constrains the next:

1. Brand tokens (`references/brand/brand-intake.md` or the proposal from `references/brand/emotion-to-style.md`).
2. Motion tokens and tier detection (`assets/tokens/motion.css`, `assets/snippets/motion-tier.js`).
3. The lowest tier that satisfies the brief (T0 behavior included), then enhance per tier.
4. Component states and feedback (`references/components/`).
5. Effects, one at a time, each with its reduced-motion and low-end sections applied (`references/effects/`).
6. Platform specifics last (`references/platforms/`).

Never add a tier-2 or tier-3 effect before its tier-0 and tier-1 behavior exists.

## Stage 3 — Verify

Prove the build, do not describe it. The output is a report with one row per check: PASS, FAIL, or BLOCKED, each with evidence.

- Full matrix: `references/workflow/verify.md`; tool routing and fallbacks: `references/workflow/tooling.md`.
- Run the console audit: `assets/snippets/verify-motion.js`.
- A single blocker fails the stage, whatever the rest of the report says.
- If the artifact cannot be rendered, the stage reports BLOCKED, not PASS.

## Stage 4 — Critique

Judge what a person sees, not what the code says. The output is a scorecard plus findings ordered by severity.

- Full protocol: `references/workflow/critique.md`.
- Evidence is the rendered result at 360, 768, and 1440 px, plus the product's real breakpoint.
- A finding without a location, an observation, and a concrete fix is an opinion, not a finding.
- Distinctiveness is scored against the brief's visual world, not against novelty for its own sake.

## Stage 5 — Fix and re-check

1. Fix every blocker first, in one batch; majors only if the batch stays reviewable.
2. Re-run the verification rows affected by the fix, plus the original finding. Do not re-run the whole matrix for a copy change.
3. Re-critique only the changed region.
4. Two rounds is the cap. If blockers remain after the second round, stop and report them as open decisions; do not polish around a blocker.

## Artifacts

| Stage | Artifact | Lives in |
| --- | --- | --- |
| Direction | Brief: mode, world, focal moment, constraints, out of scope | Reply, task, or `DESIGN.md` |
| Build | Code plus the tokens and tiers it uses | The repository |
| Verify | Check \| Result \| Evidence table | Reply or PR description |
| Critique | Scorecard plus findings by severity | Reply or PR review |
| Fix | The diff plus the re-check rows | The repository |

## Scale

| Work | Direction | Verify | Critique |
| --- | --- | --- | --- |
| One component | 3 lines | States, keyboard, reduced motion, contrast | Findings only |
| One page | Full brief | Full matrix | Full scorecard |
| Product surface | Full brief plus `DESIGN.md` | Full matrix plus performance on a real device | Full scorecard plus a second pass after fixes |

## Definition of done

All four are true:

- The brief exists and the build matches it (or the deviation is stated).
- Every verification row is PASS with evidence, or is an accepted, named exception.
- No blocker findings remain.
- The reduced-motion and tier-0 paths were observed, not assumed.

## Anti-patterns

- **Critique before verify.** Judging polish while the keyboard path is broken rewards the wrong work.
- **Verify from source.** Reading the CSS is not evidence that the motion respects reduced motion in a browser.
- **Loop until perfect.** Two fix rounds, then report; endless polishing hides the real blockers.
- **Direction by adjective.** "Modern", "clean", and "premium" are not a world; name references and an avoid list.
- **Effects before tokens.** Hard-coded durations and distances cannot degrade per tier.
- **A score without a finding.** A number with no located, fixable issue cannot be acted on.

## Handoff

The loop returns one report: the brief used, what was built, the verification table, the findings by severity, and the open decisions. That report is the answer; the code is the evidence.
