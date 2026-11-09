// Tests for the maintainer eval runner and grader, exercised through its CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIMENSIONS, gradeText } from '../scripts/eval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVAL = path.join(ROOT, 'scripts', 'eval.mjs');

function run(...args) {
  const result = spawnSync(process.execPath, [EVAL, ...args], { encoding: 'utf8' });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

function withTemp(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-eval-'));
  try {
    fn(base);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

test('eval: list prints every case and its assertion count', () => {
  const result = run('list');
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /4 cases, \d+ assertions/);
  for (const id of ['vague-landing', 'operate-dashboard', 'flawed-pricing-critique', 'low-end-3d']) {
    assert.match(result.out, new RegExp(id));
  }
});

test('eval: gradeText applies regex, contains, notContains, and fileExists checks', () => {
  const testCase = {
    assertions: [
      { id: 'regex', text: 'regex', check: { type: 'regex', pattern: 'target\\s+word' } },
      { id: 'contains', text: 'contains', check: { type: 'contains', value: 'Reduced Motion' } },
      { id: 'not', text: 'not', check: { type: 'notContains', value: 'parallax' } },
      { id: 'file', text: 'file', check: { type: 'fileExists', pattern: '\\.html$' } },
    ],
  };
  const passing = gradeText(testCase, 'Target word. Reduced motion.', ['outputs/page.html']);
  assert.deepEqual(passing.map((result) => result.passed), [true, true, true, true]);

  const failing = gradeText(testCase, 'parallax everywhere', []);
  assert.deepEqual(failing.map((result) => result.passed), [false, false, false, false]);
});

test('eval: init writes a snapshot, both variants, and a RUN.md per run', () => {
  withTemp((base) => {
    const result = run('init', '--workspace', base, '--iteration', '1');
    assert.equal(result.code, 0, result.out);
    const iter = path.join(base, 'iteration-1');
    assert.equal(fs.existsSync(path.join(iter, 'skill-snapshot', 'SKILL.md')), true);

    const runFiles = [];
    for (const id of ['vague-landing', 'operate-dashboard', 'flawed-pricing-critique', 'low-end-3d']) {
      for (const variant of ['with_skill', 'without_skill']) {
        const dir = path.join(iter, id, variant);
        assert.equal(fs.existsSync(path.join(dir, 'outputs')), true);
        const file = path.join(dir, 'RUN.md');
        assert.equal(fs.existsSync(file), true);
        runFiles.push(file);
      }
    }
    assert.equal(runFiles.length, 8);

    const withSkill = fs.readFileSync(path.join(iter, 'vague-landing', 'with_skill', 'RUN.md'), 'utf8');
    assert.match(withSkill, /skill-snapshot/);
    assert.match(withSkill, /SKILL\.md/);
    assert.doesNotMatch(withSkill, /Names a surface mode/);

    const withoutSkill = fs.readFileSync(path.join(iter, 'vague-landing', 'without_skill', 'RUN.md'), 'utf8');
    assert.match(withoutSkill, /Do not load the kinetic-ui skill/);

    const critiqueRun = path.join(iter, 'flawed-pricing-critique', 'with_skill');
    const copied = path.join(critiqueRun, 'inputs', 'index.html');
    assert.equal(fs.existsSync(copied), true);
    assert.equal(
      fs.readFileSync(copied, 'utf8'),
      fs.readFileSync(path.join(ROOT, 'evals', 'fixtures', 'flawed-pricing', 'index.html'), 'utf8'),
    );
    const critiqueRunFile = fs.readFileSync(path.join(critiqueRun, 'RUN.md'), 'utf8');
    assert.match(critiqueRunFile, new RegExp(copied.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(critiqueRunFile, /evals[\\/]fixtures/);
    assert.match(critiqueRunFile, /open as-is in a browser/);
    assert.match(critiqueRunFile, /self-contained `\.html`/);
    assert.match(withoutSkill, /open as-is in a browser/);
  });
});

test('eval: init refuses to replace an iteration without --force and accepts --force', () => {
  withTemp((base) => {
    assert.equal(run('init', '--workspace', base).code, 0);
    const refused = run('init', '--workspace', base);
    assert.equal(refused.code, 1);
    assert.match(refused.out, /already exists/);
    const forced = run('init', '--workspace', base, '--force');
    assert.equal(forced.code, 0, forced.out);
  });
});

test('eval: grade writes per-run grading and an aggregate benchmark', () => {
  withTemp((base) => {
    assert.equal(run('init', '--workspace', base, '--iteration', '1').code, 0);
    const outputs = path.join(base, 'iteration-1', 'vague-landing', 'with_skill', 'outputs');
    fs.writeFileSync(
      path.join(outputs, 'response.md'),
      [
        'Mode: Persuade',
        'Visual world: editorial coffee packaging. Avoid: generic SaaS gradients.',
        'Focal moment: the first pour, once.',
        'prefers-reduced-motion: fades only, no travel.',
        'T0: static poster.',
        'T1: CSS fade.',
        'PASS: brief present. BLOCKED: no rendered screenshot.',
      ].join('\n'),
    );

    const result = run('grade', '--workspace', base, '--iteration', '1');
    assert.equal(result.code, 0, result.out);

    const grading = JSON.parse(
      fs.readFileSync(path.join(base, 'iteration-1', 'vague-landing', 'with_skill', 'grading.json'), 'utf8'),
    );
    assert.equal(grading.status, 'graded');
    assert.equal(grading.passed, 7);
    assert.equal(grading.total, 7);

    const benchmark = JSON.parse(fs.readFileSync(path.join(base, 'iteration-1', 'benchmark.json'), 'utf8'));
    assert.equal(benchmark.run_summary.with_skill.graded, 1);
    assert.equal(benchmark.run_summary.with_skill.passed, 7);
    assert.equal(benchmark.run_summary.without_skill.graded, 0);
    assert.equal(benchmark.run_summary.delta, null);
    assert.equal(benchmark.cases['low-end-3d'].with_skill.status, 'empty');
  });
});

function walkNames(dir) {
  const names = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    names.push(entry.name);
    if (entry.isDirectory()) names.push(...walkNames(path.join(dir, entry.name)));
  }
  return names;
}

function seedRuns(base) {
  assert.equal(run('init', '--workspace', base, '--iteration', '1').code, 0);
  const iter = path.join(base, 'iteration-1');
  for (const variant of ['with_skill', 'without_skill']) {
    fs.writeFileSync(
      path.join(iter, 'vague-landing', variant, 'outputs', 'response.md'),
      `answer from ${variant}\n`,
    );
  }
  return iter;
}

test('eval blind: anonymizes the pair, keeps the key outside review, and is reproducible by seed', () => {
  withTemp((base) => {
    const iter = seedRuns(base);
    const first = run('blind', '--workspace', base, '--iteration', '1', '--seed', '7');
    assert.equal(first.code, 0, first.out);
    assert.match(first.out, /skipped, missing outputs/);

    const review = path.join(iter, 'review');
    const leaked = walkNames(review).filter((name) => /with_skill|without_skill/.test(name));
    assert.deepEqual(leaked, []);
    assert.equal(fs.existsSync(path.join(review, 'vague-landing', 'A', 'response.md')), true);
    assert.equal(fs.existsSync(path.join(review, 'vague-landing', 'PROMPT.md')), true);
    assert.equal(fs.existsSync(path.join(review, 'blind-key.json')), false);

    const key = JSON.parse(fs.readFileSync(path.join(iter, 'blind-key.json'), 'utf8'));
    const { A, B } = key.cases['vague-landing'];
    assert.deepEqual([A, B].sort(), ['with_skill', 'without_skill']);
    assert.match(fs.readFileSync(path.join(review, 'vague-landing', 'A', 'response.md'), 'utf8'), new RegExp(A));

    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '7').code, 1);
    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '7', '--force').code, 0);
    const again = JSON.parse(fs.readFileSync(path.join(iter, 'blind-key.json'), 'utf8'));
    assert.deepEqual(again.cases, key.cases);
  });
});

test('eval blind: fails when no case has outputs for both variants', () => {
  withTemp((base) => {
    assert.equal(run('init', '--workspace', base, '--iteration', '1').code, 0);
    const result = run('blind', '--workspace', base, '--iteration', '1');
    assert.equal(result.code, 1);
    assert.match(result.out, /no case has outputs/);
  });
});

test('eval unblind: maps scores back to variants and merges them into the benchmark', () => {
  withTemp((base) => {
    const iter = seedRuns(base);
    assert.equal(run('grade', '--workspace', base, '--iteration', '1').code, 0);
    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '3').code, 0);
    const key = JSON.parse(fs.readFileSync(path.join(iter, 'blind-key.json'), 'utf8'));
    const winner = key.cases['vague-landing'].A === 'with_skill' ? 'A' : 'B';
    const loser = winner === 'A' ? 'B' : 'A';

    const scoresFile = path.join(iter, 'review', 'scores.json');
    const scores = JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
    scores.reviewer = 'Test Reviewer';
    for (const dimension of DIMENSIONS) {
      scores.cases['vague-landing'][winner][dimension] = 4;
      scores.cases['vague-landing'][loser][dimension] = 1;
    }
    scores.cases['vague-landing'][loser].typography = null;
    fs.writeFileSync(scoresFile, JSON.stringify(scores));

    const result = run('unblind', '--workspace', base, '--iteration', '1');
    assert.equal(result.code, 0, result.out);
    const review = JSON.parse(fs.readFileSync(path.join(iter, 'review-test-reviewer.json'), 'utf8'));
    assert.equal(review.per_case['vague-landing'].with_skill.mean, 4);
    assert.equal(review.per_case['vague-landing'].without_skill.mean, 1);
    assert.equal(review.per_case['vague-landing'].without_skill.scored, DIMENSIONS.length - 1);
    assert.equal(review.summary.delta, 3);
    const benchmark = JSON.parse(fs.readFileSync(path.join(iter, 'benchmark.json'), 'utf8'));
    assert.equal(benchmark.human_review['Test Reviewer'].summary.delta, 3);
  });
});

test('eval unblind: rejects an empty reviewer, an out-of-range score, and unknown dimensions', () => {
  withTemp((base) => {
    const iter = seedRuns(base);
    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '3').code, 0);
    const scoresFile = path.join(iter, 'review', 'scores.json');
    const scores = JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
    scores.cases['vague-landing'].A.color = 5;
    scores.cases['vague-landing'].B.sparkle = 2;
    fs.writeFileSync(scoresFile, JSON.stringify(scores));
    const result = run('unblind', '--workspace', base, '--iteration', '1');
    assert.equal(result.code, 1);
    assert.match(result.out, /reviewer is empty/);
    assert.match(result.out, /not an integer 0-4/);
    assert.match(result.out, /unknown dimension sparkle/);
    assert.match(result.out, /no dimension scored/);
    assert.equal(fs.existsSync(path.join(iter, 'review-reviewer.json')), false);
  });
});

test('eval rubric: documents every dimension the scorer accepts', () => {
  const rubric = fs.readFileSync(path.join(ROOT, 'evals', 'rubric.md'), 'utf8');
  for (const dimension of DIMENSIONS) assert.match(rubric, new RegExp(`\`${dimension}\``));
});

test('eval unblind --preferences: maps winners to variants and flags default wins', () => {
  withTemp((base) => {
    const iter = seedRuns(base);
    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '3').code, 0);
    const key = JSON.parse(fs.readFileSync(path.join(iter, 'blind-key.json'), 'utf8'));
    const file = path.join(base, 'prefs.json');
    fs.writeFileSync(
      file,
      JSON.stringify({
        reviewer: 'Pref Reviewer',
        cases: { 'vague-landing': { winner: 'A', basis: 'default', note: 'B did not render' } },
      }),
    );
    const result = run('unblind', '--workspace', base, '--iteration', '1', '--preferences', file);
    assert.equal(result.code, 0, result.out);
    const review = JSON.parse(fs.readFileSync(path.join(iter, 'review-pref-reviewer.json'), 'utf8'));
    assert.equal(review.per_case['vague-landing'].winner, key.cases['vague-landing'].A);
    assert.equal(review.summary.decided_by_default, 1);
    assert.equal(review.summary[key.cases['vague-landing'].A], 1);
  });
});

test('eval unblind --preferences: rejects a bad winner, a bad basis, an unknown case, and no reviewer', () => {
  withTemp((base) => {
    seedRuns(base);
    assert.equal(run('blind', '--workspace', base, '--iteration', '1', '--seed', '3').code, 0);
    const file = path.join(base, 'prefs.json');
    fs.writeFileSync(
      file,
      JSON.stringify({ reviewer: '', cases: { 'vague-landing': { winner: 'C' }, nope: { winner: 'A' } } }),
    );
    const result = run('unblind', '--workspace', base, '--iteration', '1', '--preferences', file);
    assert.equal(result.code, 1);
    assert.match(result.out, /reviewer is empty/);
    assert.match(result.out, /winner must be/);
    assert.match(result.out, /unknown case nope/);
    fs.writeFileSync(
      file,
      JSON.stringify({ reviewer: 'x', cases: { 'vague-landing': { winner: 'A', basis: 'vibes' } } }),
    );
    const basis = run('unblind', '--workspace', base, '--iteration', '1', '--preferences', file);
    assert.equal(basis.code, 1);
    assert.match(basis.out, /basis must be/);
  });
});
