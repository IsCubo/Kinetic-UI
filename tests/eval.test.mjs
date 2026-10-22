// Tests for the maintainer eval runner and grader, exercised through its CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gradeText } from '../scripts/eval.mjs';

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
