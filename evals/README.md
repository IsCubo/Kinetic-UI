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
outlines, an image without width/height attributes, `cursor: none`, and a permanent
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
`outputs/response.md` and puts any code files in `outputs/` too. Anything the
run builds must open as-is in a browser: one self-contained `.html` with inline
CSS and JS, no compile step. A `.tsx`-only answer cannot be reviewed, so it
loses the design lane by default. Before the first session, choose an isolation
level below; for the local level, hide installed copies now and restore after
the last run. Then:

```bash
node scripts/eval.mjs grade --iteration 1
```

`grade` writes `grading.json` per run and one `benchmark.json` for the
iteration. A second iteration uses `init --iteration 2`; the first workspace
stays intact for comparison.

## Isolation levels

The without-skill baseline is only causal when the agent cannot load the skill.
Pick the strongest level you can afford.

### 1. Disposable profile or container (strict)

Run each variant in a fresh OS profile or container with no kinetic-ui
installed. For the with-skill run, install only the snapshot from
`evals/workspace/iteration-N/skill-snapshot/`; for the without-skill run, install
nothing. Copy the run directory and its `inputs/` into the profile so no path
points back to this repository. This is the only level that supports a
publishable causal claim.

### 2. Local hide/restore (quick)

Move every known installed copy out of the agent skills directories:

```bash
node scripts/eval-isolate.mjs status
node scripts/eval-isolate.mjs hide --yes
# start fresh agent processes and run the sessions
node scripts/eval-isolate.mjs restore
```

`hide` moves each copy to `.kinetic-ui.disabled` in the same directory and
writes a manifest at `evals/workspace/.isolated-skills.json`; `restore` puts
every copy back, including symlinks. Hide before **both** variants: the
with-skill run reads the snapshot named in its `RUN.md`, and the without-skill
run starts with no skill installed. A running session keeps its old skill list,
so start a new process after hiding.

This is not a sandbox. It removes the advertised skill and moves the installed
copies, but a determined agent can still read `skills/kinetic-ui` in this
repository. For a claim you will publish, use level 1.

### 3. Advisory instruction (weak)

The `RUN.md` tells the without-skill run not to load any skill. Use it only for
exploration. The runtime may still advertise a globally installed skill, so the
baseline is not clean enough for a delta.

### All levels

- One fresh context per run. Do not reuse a conversation.
- Do not show the agent `evals.json`, the assertions, or a previous grading
  result.
- Each run owns its directory and writes nowhere else. Inputs are copied into
  `inputs/`, and the prompt is rewritten to point there.
- Keep the runtime, model, and date next to the iteration; a delta without them
  is not reproducible.

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

## Blind review (quality)

Assertions check protocol vocabulary; they cannot say whether a design is good.
The blind lane measures that separately and never mixes with the pass rate.

```bash
node scripts/eval.mjs blind --iteration 1      # review/<case>/A and B, random order
# fill review/scores.json following evals/rubric.md, then:
node scripts/eval.mjs unblind --iteration 1 --scores <file>
```

`blind` copies the two outputs of every case that has both variants into
`review/`, assigns them to A and B by a random draw (`--seed N` makes it
reproducible), and writes the key to `blind-key.json` outside `review/`. The
reviewer opens only `review/`, scores nine dimensions from 0 to 4 (`null` when
a dimension does not apply), and runs `unblind`. It rejects scores outside 0-4,
unknown dimensions, a missing reviewer name, and any answer with no scored
dimension. Results go to `review-<reviewer>.json` and to a `human_review` section
in `benchmark.json`. Use two independent reviewers when you will quote the
result; each fills a separate copy of `scores.json`.

When a reviewer cannot score every dimension, `unblind --preferences FILE` takes
one winner per case (`A`, `B`, or `tie`) with an optional `basis` of `design`
(default) or `default` and a `note`. Use `default` when the other answer could
not be evaluated, for example a `.tsx` that does not open without a build; the
summary counts those separately so they are not read as design wins. Preferences
carry no scores, so they say which answer a person preferred, not by how much.

Blinding is imperfect. Answers made with the skill use its vocabulary and vendor
its snippets, so a reviewer can often tell which is which. `rubric.md` says to
score the page, not the vocabulary, and to note when you recognized an answer.

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

- Four cases and 33 assertions are a smoke test, not a benchmark. Each cell is a
  single run, so variance is unmeasured.
- Assertions changed after seeing iteration 1 must be logged as post hoc. The
  `3d-fallback` pattern was widened from "3D/WebGL" to the effect ("tilt"),
  because a valid CSS-tilt answer was penalized; the baseline result for that
  assertion did not change. Two critique assertions were added later
  (`dead-controls`, `competing-claims`) because the fixture shipped no script at
  all and two competing badges, and no assertion covered either; the blind human
  reviewer preferred the baseline, which had found both. Regraded: the critique
  case ties at 9/11, so the aggregate rose to 29/31 against 16/31.
- Two more critique assertions were added post hoc (`message-clarity`,
  `price-label`) after the user kept the baseline's coverage of content clarity
  and asked for the skill to match it without losing rigor. Regrading iteration 2
  with them split the case: the baseline scored 12/13 because it had already
  found both, and the skill scored 11/13 because it had noticed the generic hero
  and then declined to score it — its own "the owner's call" rule. The rule in
  `references/workflow/critique.md` changed, and a focused `iteration-3` run of
  the critique case on `claude-sonnet-5-5` medium then scored 13/13, reporting
  the missing offer, the missing billing period, and the smallest change for
  each while leaving the wording to the owner. The aggregate for iteration 2 is
  therefore 29/33 against 17/33, and that pair is not comparable to iteration 1:
  the assertions changed under both variants.
- Regex assertions are blunt. A bad answer that uses the right words can pass.
- Free models give a floor, not a ceiling. A strong model may hide a weak skill.
- Local hide/restore removes installed copies but not the repository source; a
  publishable delta needs a disposable profile or container.
- Rendering tools are not assumed. The critique case accepts an `unverified`
  verdict when the agent cannot render the page; the source-provable findings
  still count, and since the critique page gained a functional reality check, an
  inert control is a blocker even with no render.
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
