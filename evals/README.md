# kinetic-ui evals

Measure whether the skill changes agent behavior. The pack checks protocol
compliance — does the agent classify the surface, plan reduced motion, use the
motion tiers, and verify — not taste. Visual quality still needs a blind human
review.

## Cases

| ID | What it tests |
| --- | --- |
| `vague-landing` | A brief before code: surface mode, visual world, avoid list, one focal moment, T0/T1, verification. |
| `operate-dashboard` | Operate mode: density and scanability, keyboard/focus, restraint, T0, verification. |
| `flawed-pricing-critique` | A static critique of a deliberately flawed page: located findings, severity, verdict, honesty when rendering is unavailable. |
| `low-end-3d` | Parallax and 3D on a low-end phone and under reduced motion: fallbacks, `data-motion-tier`, performance budget, verification. |

`evals/fixtures/flawed-pricing/index.html` is intentionally broken. Do not copy
it as a template. It contains an infinite pulse with no reduced-motion variant,
low-contrast muted text, an icon button with no accessible name, removed focus
outlines, an image without intrinsic dimensions, `cursor: none`, and a permanent
`will-change`.

## Quick start

Requires Node 18+ and an agent runtime that can start a fresh session.

```bash
node scripts/eval.mjs list
node scripts/eval.mjs init                 # iteration 1
```

`init` snapshots `skills/kinetic-ui` into
`evals/workspace/iteration-1/skill-snapshot/` and writes eight runs:

```text
evals/workspace/iteration-1/
  skill-snapshot/
  vague-landing/
    with_skill/RUN.md
    with_skill/outputs/
    without_skill/RUN.md
    without_skill/outputs/
  ...
```

Hand each `RUN.md` to a fresh session. The run writes its full response to
`outputs/response.md` and puts any code files in `outputs/` too. Then:

```bash
node scripts/eval.mjs grade --iteration 1
```

`grade` writes `grading.json` per run and one `benchmark.json` for the
iteration. A second iteration uses `init --iteration 2`; the first workspace
stays intact for comparison.

## Isolation rules

- One fresh context per run. Do not reuse a conversation.
- With skill: read only the snapshot named in `RUN.md`. Do not load the
  globally installed skill.
- Without skill: do not load kinetic-ui or any other skill. The globally
  installed skill may still be advertised to the agent, so the instruction is
  explicit. This is a harness limitation, not a property of the pack.
- Do not show the agent `evals.json`, the assertions, or a previous grading
  result.
- Do not let two runs share a workspace. Each run owns its directory and writes
  nowhere else.

## Assertions

Assertions live in `evals/evals.json` and run over every text file in
`outputs/` (`.md`, `.txt`, `.html`, `.css`, `.js`, `.ts`, `.tsx`, `.jsx`,
`.json`, `.svg`). Four check types:

| Type | Fields | Passes when |
| --- | --- | --- |
| `regex` | `pattern`, optional `flags` | The pattern matches anywhere in the text. |
| `contains` | `value` | The text contains the value, case-insensitive. |
| `notContains` | `value` | The text does not contain the value. |
| `fileExists` | `pattern` | At least one output filename matches the pattern. |

Each assertion has a stable `id` and a human-readable `text`. Add cases and
assertions to `evals.json`, not to the runner.

## Grading

`grading.json`:

```json
{
  "case": "vague-landing",
  "variant": "with_skill",
  "status": "graded",
  "passed": 7,
  "total": 7,
  "pass_rate": 1,
  "results": [
    { "id": "brief-mode", "text": "Names a surface mode", "passed": true, "evidence": "matched /.../" }
  ]
}
```

Statuses:

- `graded`: outputs were found and every assertion was evaluated.
- `empty`: the outputs directory exists but has no text files.
- `missing`: the outputs directory does not exist.

`benchmark.json` aggregates only graded runs. Missing and empty runs are
reported in their case but excluded from the totals. `delta` is `null` unless
both variants have at least one graded case.

## Interpreting the result

- High with-skill, low baseline: evidence the skill changes behavior.
- Equal scores: the assertions are too easy, the baseline already follows the
  protocol, or the prompt does not create the pressure the case needs. Tighten
  the case before celebrating.
- Lower with-skill: a skill defect or a harness problem. Read the run; do not
  average it away.
- The number is a floor. Read the outputs. For visual work, run a blind human
  side-by-side and record the verdict separately.

## Limits

- Four cases and 29 assertions are a smoke test, not a benchmark.
- Regex assertions are blunt. A bad answer that uses the right words can pass.
- Free models give a floor, not a ceiling. A strong model may hide a weak skill.
- Rendering tools are not assumed. The critique case accepts an `unverified`
  verdict when the agent cannot render the page; the code-level findings still
  count.
- The pack measures the skill's protocol, not the quality of a specific
  implementation. Do not use it as a release gate without human review.

## Adding a case

1. Add an object to `cases` in `evals/evals.json` with `id`, `title`, `prompt`,
   `expected_output`, `files`, and `assertions`.
2. Use a prompt that creates real pressure: vague input, a hard constraint, or a
   flawed artifact. Do not name the skill or its sections.
3. Write assertions that a correct protocol answer satisfies but a generic
   answer does not. Prefer 5–8 per case.
4. Run `node scripts/eval.mjs list` and `node scripts/test.mjs`.
