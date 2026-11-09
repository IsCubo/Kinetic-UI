#!/usr/bin/env node
// Maintainer evals for the kinetic-ui skill.
//
// This runner deliberately does not call a model. `init` prepares one isolated
// with_skill and one without_skill run per case, each with a RUN.md the operator
// hands to a fresh session. `grade` reads the outputs and applies the assertions
// in evals/evals.json. That keeps the harness agent-agnostic and lets a human
// inspect every run before trusting a number.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const EVALS_FILE = path.join(REPO, 'evals', 'evals.json');
const SKILL_DIR = path.join(REPO, 'skills', 'kinetic-ui');
const DEFAULT_WORKSPACE = path.join(REPO, 'evals', 'workspace');
const TEXT_EXT = new Set(['.md', '.txt', '.html', '.css', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.svg']);
const VARIANTS = ['with_skill', 'without_skill'];
export const DIMENSIONS = [
  'brief-specificity',
  'visual-world',
  'hierarchy',
  'typography',
  'color',
  'motion-purpose',
  'reduced-motion',
  'low-end-restraint',
  'evidence-honesty',
];

const HELP = `kinetic-ui evals

Usage:
  node scripts/eval.mjs init [--iteration N] [--workspace DIR] [--force]
  node scripts/eval.mjs list
  node scripts/eval.mjs grade [--iteration N] [--workspace DIR]
  node scripts/eval.mjs blind [--iteration N] [--workspace DIR] [--seed N] [--force]
  node scripts/eval.mjs unblind [--iteration N] [--workspace DIR] [--scores FILE | --preferences FILE]

Commands:
  init    Create <workspace>/iteration-N with a skill snapshot, one
          with_skill and one without_skill run per case, and a RUN.md for each.
  list    Print the eval cases and their assertion counts.
  grade   Grade every outputs/ directory and write grading.json per run plus
          benchmark.json for the iteration. Missing runs are reported, not invented.

  blind   Copy each case's two outputs to review/<case>/A and B in random order
          and keep the key in blind-key.json, outside review/. See evals/rubric.md.
  unblind Read the filled scores, map A/B back to variants, and write
          review-<reviewer>.json plus a human_review section in benchmark.json.

Options:
  --iteration N   Iteration number (default 1).
  --seed N        Make the A/B assignment reproducible (blind only).
  --scores FILE   Scores file (default review/scores.json; unblind only).
  --preferences FILE  Per-case winner (A, B, or tie) instead of 0-4 scores.
  --workspace DIR Workspace root (default evals/workspace).
  --force         Replace an existing iteration on init.
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { iteration: 1, workspace: DEFAULT_WORKSPACE, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--preferences') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('--preferences requires a value');
      opts.preferences = path.resolve(value);
    } else if (arg === '--scores') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('--scores requires a value');
      opts.scores = path.resolve(value);
    } else if (arg === '--seed') {
      const value = argv[++i];
      if (!value || !/^\d+$/.test(value)) throw new Error('--seed must be a non-negative integer');
      opts.seed = Number(value);
    } else if (arg === '--iteration' || arg === '--workspace') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--iteration') {
        if (!/^[1-9]\d*$/.test(value)) throw new Error('--iteration must be a positive integer');
        opts.iteration = Number(value);
      } else {
        opts.workspace = path.resolve(value);
      }
    } else if (arg === '--force') {
      opts.force = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return opts;
}

export function readEvals() {
  const data = JSON.parse(fs.readFileSync(EVALS_FILE, 'utf8'));
  if (!data || !Array.isArray(data.cases) || data.cases.length === 0) {
    throw new Error(`no cases in ${EVALS_FILE}`);
  }
  const ids = new Set();
  for (const testCase of data.cases) {
    if (!testCase.id || !testCase.prompt || !Array.isArray(testCase.assertions) || testCase.assertions.length === 0) {
      throw new Error(`case needs id, prompt, and assertions: ${JSON.stringify(testCase.id)}`);
    }
    if (ids.has(testCase.id)) throw new Error(`duplicate case id: ${testCase.id}`);
    ids.add(testCase.id);
    const assertionIds = new Set();
    for (const assertion of testCase.assertions) {
      if (!assertion.id || !assertion.check) {
        throw new Error(`assertion needs id and check in ${testCase.id}`);
      }
      if (assertionIds.has(assertion.id)) {
        throw new Error(`duplicate assertion id in ${testCase.id}: ${assertion.id}`);
      }
      assertionIds.add(assertion.id);
      if (assertion.check.type === 'regex' || assertion.check.type === 'fileExists') {
        try {
          new RegExp(assertion.check.pattern, assertion.check.flags ?? 'i');
        } catch (error) {
          throw new Error(`invalid regex in ${testCase.id}/${assertion.id}: ${error.message}`);
        }
      }
    }
  }
  return data;
}

function iterationDir(opts) {
  return path.join(opts.workspace, `iteration-${opts.iteration}`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

export function collectText(dir) {
  if (!fs.existsSync(dir)) return { text: '', files: [] };
  const files = walk(dir)
    .filter((file) => TEXT_EXT.has(path.extname(file).toLowerCase()))
    .map((file) => path.relative(dir, file))
    .sort();
  const text = files
    .map((rel) => `\n\n--- ${rel} ---\n\n${fs.readFileSync(path.join(dir, rel), 'utf8')}`)
    .join('');
  return { text, files };
}

function matchCheck(check, text, files) {
  if (!check || typeof check.type !== 'string') throw new Error('assertion check needs a type');
  switch (check.type) {
    case 'regex': {
      if (typeof check.pattern !== 'string') throw new Error('regex check needs a pattern');
      const re = new RegExp(check.pattern, check.flags ?? 'i');
      const match = text.match(re);
      return {
        passed: Boolean(match),
        evidence: match ? `matched ${re}` : `no match for ${re}`,
      };
    }
    case 'contains': {
      if (typeof check.value !== 'string') throw new Error('contains check needs a value');
      const found = text.toLowerCase().includes(check.value.toLowerCase());
      return { passed: found, evidence: found ? `found "${check.value}"` : `missing "${check.value}"` };
    }
    case 'notContains': {
      if (typeof check.value !== 'string') throw new Error('notContains check needs a value');
      const found = text.toLowerCase().includes(check.value.toLowerCase());
      return { passed: !found, evidence: found ? `unexpected "${check.value}"` : `"${check.value}" is absent` };
    }
    case 'fileExists': {
      if (typeof check.pattern !== 'string') throw new Error('fileExists check needs a pattern');
      const re = new RegExp(check.pattern, check.flags ?? 'i');
      const matched = files.filter((file) => re.test(file));
      return {
        passed: matched.length > 0,
        evidence: matched.length > 0 ? `matched file(s): ${matched.join(', ')}` : `no output file matches ${re}`,
      };
    }
    default:
      throw new Error(`unknown check type: ${check.type}`);
  }
}

export function gradeText(testCase, text, files) {
  return testCase.assertions.map((assertion) => {
    const result = matchCheck(assertion.check, text, files);
    return {
      id: assertion.id,
      text: assertion.text,
      passed: result.passed,
      evidence: result.evidence,
    };
  });
}

export function summarize(results) {
  const passed = results.filter((result) => result.passed).length;
  return {
    passed,
    total: results.length,
    pass_rate: results.length === 0 ? 0 : Math.round((passed / results.length) * 1000) / 1000,
  };
}

function localizePrompt(testCase, inputs) {
  let prompt = testCase.prompt;
  const originals = testCase.files ?? [];
  for (let i = 0; i < originals.length && i < inputs.length; i++) {
    prompt = prompt.split(originals[i]).join(inputs[i]);
  }
  return prompt;
}

function runInstructions(testCase, variant, snapshot, inputs) {
  const prompt = localizePrompt(testCase, inputs);
  const lines = [`# Eval run: ${testCase.id} — ${variant}`, '', '## Task', '', prompt, ''];
  if (inputs.length > 0) {
    lines.push('## Input files', '', ...inputs.map((file) => `- \`${file}\` (inside this run directory)`), '');
  }
  lines.push('## Skill', '');
  if (variant === 'with_skill') {
    lines.push(
      `Read \`${path.join(snapshot, 'SKILL.md')}\` and follow it. Read only files inside \`${snapshot}\` that it routes you to, plus any input files listed above. Do not read the globally installed skill or the rest of this repository.`,
    );
  } else {
    lines.push(
      'Do not load the kinetic-ui skill or any other skill. Answer from your own knowledge and judgment. Do not read the repository; use only the input files listed above.',
    );
  }
  lines.push(
    '',
    '## Output',
    '',
    'Write your complete response to `outputs/response.md`. Put every code file you produce in `outputs/` as well.',
    '',
    'Anything you build must open as-is in a browser: one self-contained `.html` file per screen or demo, with its CSS and JS inline, and no local reference you did not ship. Do not deliver `.tsx`, `.jsx`, `.vue`, `.svelte`, or any source that needs a compile step as your only artifact; if you show component code, also ship the working `.html` preview.',
    '',
    'Do not read `evals/evals.json` or any other grading material. Do not write outside this run directory.',
    '',
  );
  return lines.join('\n');
}

function copyInputs(testCase, dir) {
  const files = testCase.files ?? [];
  if (files.length === 0) return [];
  const inputDir = path.join(dir, 'inputs');
  fs.mkdirSync(inputDir, { recursive: true });
  return files.map((rel) => {
    const source = path.resolve(REPO, rel);
    if (!fs.existsSync(source)) throw new Error(`missing input file: ${rel}`);
    const base = path.basename(source);
    const target = path.join(inputDir, base);
    if (fs.existsSync(target)) {
      throw new Error(`duplicate input basename in ${testCase.id}: ${base}`);
    }
    const stat = fs.statSync(source);
    if (stat.isDirectory()) fs.cpSync(source, target, { recursive: true });
    else fs.copyFileSync(source, target);
    return target;
  });
}

function cmdInit(opts) {
  const data = readEvals();
  const iter = iterationDir(opts);
  if (fs.existsSync(iter)) {
    if (!opts.force) fail(`iteration already exists: ${iter}\nUse --force to replace it.`);
    fs.rmSync(iter, { recursive: true, force: true });
  }
  fs.mkdirSync(iter, { recursive: true });
  const snapshot = path.join(iter, 'skill-snapshot');
  fs.cpSync(SKILL_DIR, snapshot, { recursive: true });
  let runs = 0;
  for (const testCase of data.cases) {
    for (const variant of VARIANTS) {
      const dir = path.join(iter, testCase.id, variant);
      fs.mkdirSync(path.join(dir, 'outputs'), { recursive: true });
      const inputs = copyInputs(testCase, dir);
      fs.writeFileSync(path.join(dir, 'RUN.md'), runInstructions(testCase, variant, snapshot, inputs));
      runs++;
    }
  }
  console.log(`Prepared ${runs} runs in ${iter}`);
  console.log(`Snapshot: ${snapshot}`);
  console.log(`Next: give each RUN.md to a fresh session, then run:`);
  console.log(`  node scripts/eval.mjs grade --iteration ${opts.iteration}`);
}

function cmdList() {
  const data = readEvals();
  const total = data.cases.reduce((sum, testCase) => sum + testCase.assertions.length, 0);
  console.log(`${data.cases.length} cases, ${total} assertions`);
  console.log('');
  for (const testCase of data.cases) {
    const prompt = testCase.prompt.length > 84 ? `${testCase.prompt.slice(0, 81)}...` : testCase.prompt;
    console.log(`${testCase.id.padEnd(24)} ${String(testCase.assertions.length).padStart(2)}  ${prompt}`);
  }
}

function cmdGrade(opts) {
  const data = readEvals();
  const iter = iterationDir(opts);
  if (!fs.existsSync(iter)) fail(`no iteration at ${iter}\nRun init first.`);

  const benchmark = {
    skill_name: data.skill_name,
    iteration: opts.iteration,
    generated_at: new Date().toISOString(),
    cases: {},
    run_summary: {},
  };
  const totals = {
    with_skill: { passed: 0, total: 0, graded: 0 },
    without_skill: { passed: 0, total: 0, graded: 0 },
  };
  const rows = [];

  for (const testCase of data.cases) {
    const row = { id: testCase.id };
    benchmark.cases[testCase.id] = {};
    for (const variant of VARIANTS) {
      const dir = path.join(iter, testCase.id, variant);
      const outputs = path.join(dir, 'outputs');
      let record;
      if (!fs.existsSync(outputs)) {
        record = { status: 'missing', passed: 0, total: testCase.assertions.length, pass_rate: 0, results: [] };
      } else {
        const { text, files } = collectText(outputs);
        if (files.length === 0) {
          record = { status: 'empty', passed: 0, total: testCase.assertions.length, pass_rate: 0, results: [] };
        } else {
          const results = gradeText(testCase, text, files);
          record = { status: 'graded', ...summarize(results), results };
          totals[variant].passed += record.passed;
          totals[variant].total += record.total;
          totals[variant].graded++;
        }
      }
      benchmark.cases[testCase.id][variant] = record;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'grading.json'),
        `${JSON.stringify({ case: testCase.id, variant, ...record }, null, 2)}\n`,
      );
      row[variant] = record.status === 'graded' ? `${record.passed}/${record.total}` : record.status;
    }
    rows.push(row);
  }

  const withSkill = totals.with_skill;
  const withoutSkill = totals.without_skill;
  benchmark.run_summary.with_skill = {
    ...withSkill,
    pass_rate: withSkill.total === 0 ? 0 : Math.round((withSkill.passed / withSkill.total) * 1000) / 1000,
  };
  benchmark.run_summary.without_skill = {
    ...withoutSkill,
    pass_rate: withoutSkill.total === 0 ? 0 : Math.round((withoutSkill.passed / withoutSkill.total) * 1000) / 1000,
  };
  benchmark.run_summary.delta =
    withSkill.graded > 0 && withoutSkill.graded > 0
      ? {
          pass_rate:
            Math.round(
              (benchmark.run_summary.with_skill.pass_rate - benchmark.run_summary.without_skill.pass_rate) * 1000,
            ) / 1000,
        }
      : null;
  fs.writeFileSync(path.join(iter, 'benchmark.json'), `${JSON.stringify(benchmark, null, 2)}\n`);

  const width = Math.max(4, ...rows.map((row) => row.id.length));
  console.log(`Iteration ${opts.iteration} — ${iter}`);
  console.log('');
  console.log(`${'case'.padEnd(width)}  ${'with_skill'.padEnd(12)}  without_skill`);
  for (const row of rows) {
    console.log(`${row.id.padEnd(width)}  ${String(row.with_skill).padEnd(12)}  ${row.without_skill}`);
  }
  console.log('');
  const summary = benchmark.run_summary;
  const fmt = (value) => (value.graded === 0 ? 'not graded' : `${value.passed}/${value.total} (${Math.round(value.pass_rate * 100)}%)`);
  console.log(`with_skill:    ${fmt(summary.with_skill)}`);
  console.log(`without_skill: ${fmt(summary.without_skill)}`);
  if (summary.with_skill.graded > 0 && summary.without_skill.graded > 0) {
    const delta = Math.round(summary.delta.pass_rate * 100);
    console.log(`delta:         ${delta >= 0 ? '+' : ''}${delta} percentage points`);
  }
  console.log('');
  console.log(`Wrote ${path.join(iter, 'benchmark.json')}`);
}

function makeCoin(seed) {
  if (seed === undefined) return () => crypto.randomInt(2) === 1;
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 >= 0.5;
  };
}

function hasOutputs(iter, caseId, variant) {
  return collectText(path.join(iter, caseId, variant, 'outputs')).files.length > 0;
}

function cmdBlind(opts) {
  const data = readEvals();
  const iter = iterationDir(opts);
  if (!fs.existsSync(iter)) fail(`no iteration at ${iter}\nRun init first.`);
  const review = path.join(iter, 'review');
  const keyFile = path.join(iter, 'blind-key.json');
  if (fs.existsSync(review) || fs.existsSync(keyFile)) {
    if (!opts.force) fail(`review already exists: ${review}\nUse --force to replace it; existing scores are lost.`);
    fs.rmSync(review, { recursive: true, force: true });
    fs.rmSync(keyFile, { force: true });
  }
  const coin = makeCoin(opts.seed);
  const key = { created_at: new Date().toISOString(), seed: opts.seed ?? null, cases: {} };
  const template = { reviewer: '', cases: {} };
  const skipped = [];
  fs.mkdirSync(review, { recursive: true });
  for (const testCase of data.cases) {
    if (!VARIANTS.every((variant) => hasOutputs(iter, testCase.id, variant))) {
      skipped.push(testCase.id);
      continue;
    }
    const withFirst = coin();
    const assignment = withFirst
      ? { A: 'with_skill', B: 'without_skill' }
      : { A: 'without_skill', B: 'with_skill' };
    const caseDir = path.join(review, testCase.id);
    for (const label of ['A', 'B']) {
      fs.cpSync(path.join(iter, testCase.id, assignment[label], 'outputs'), path.join(caseDir, label), {
        recursive: true,
      });
    }
    const inputSource = path.join(iter, testCase.id, 'with_skill', 'inputs');
    let inputs = [];
    if (fs.existsSync(inputSource)) {
      fs.cpSync(inputSource, path.join(caseDir, 'inputs'), { recursive: true });
      inputs = (testCase.files ?? []).map((file) => path.join(caseDir, 'inputs', path.basename(file)));
    }
    fs.writeFileSync(path.join(caseDir, 'PROMPT.md'), `# Prompt\n\n${localizePrompt(testCase, inputs)}\n`);
    key.cases[testCase.id] = assignment;
    const blank = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, null]));
    template.cases[testCase.id] = { A: { ...blank }, B: { ...blank }, notes: '' };
  }
  if (Object.keys(key.cases).length === 0) {
    fs.rmSync(review, { recursive: true, force: true });
    fail('no case has outputs for both variants; run the sessions first.');
  }
  fs.copyFileSync(path.join(REPO, 'evals', 'rubric.md'), path.join(review, 'RUBRIC.md'));
  fs.writeFileSync(path.join(review, 'scores.json'), `${JSON.stringify(template, null, 2)}\n`);
  fs.writeFileSync(keyFile, `${JSON.stringify(key, null, 2)}\n`);
  console.log(`Blind review ready: ${review}`);
  console.log(`Cases: ${Object.keys(key.cases).length}${skipped.length ? ` (skipped, missing outputs: ${skipped.join(', ')})` : ''}`);
  console.log('Open only review/. Do not open blind-key.json or any RUN.md before scoring.');
  console.log(`When done: node scripts/eval.mjs unblind --iteration ${opts.iteration} --scores <file>`);
}

function unblindPreferences(opts, iter, key) {
  if (!fs.existsSync(opts.preferences)) fail(`no preferences at ${opts.preferences}`);
  const input = JSON.parse(fs.readFileSync(opts.preferences, 'utf8'));
  const errors = [];
  if (typeof input.reviewer !== 'string' || input.reviewer.trim() === '') errors.push('reviewer is empty');
  const perCase = {};
  const tally = { with_skill: 0, without_skill: 0, tie: 0, decided_by_default: 0 };
  for (const [caseId, assignment] of Object.entries(key.cases)) {
    const entry = input.cases?.[caseId];
    if (!entry) {
      errors.push(`missing case ${caseId}`);
      continue;
    }
    if (!['A', 'B', 'tie'].includes(entry.winner)) {
      errors.push(`${caseId}: winner must be "A", "B", or "tie"`);
      continue;
    }
    const basis = entry.basis ?? 'design';
    if (!['design', 'default'].includes(basis)) {
      errors.push(`${caseId}: basis must be "design" or "default"`);
      continue;
    }
    const winner = entry.winner === 'tie' ? 'tie' : assignment[entry.winner];
    tally[winner] += 1;
    if (basis === 'default') tally.decided_by_default += 1;
    perCase[caseId] = { winner, basis, note: entry.note ?? '' };
  }
  for (const caseId of Object.keys(input.cases ?? {})) {
    if (!key.cases[caseId]) errors.push(`unknown case ${caseId}`);
  }
  if (errors.length > 0) fail(`preferences are not valid:\n- ${errors.join('\n- ')}`);

  const result = { reviewer: input.reviewer.trim(), mode: 'preference', per_case: perCase, summary: tally };
  const slug = result.reviewer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reviewer';
  fs.writeFileSync(path.join(iter, `review-${slug}.json`), `${JSON.stringify(result, null, 2)}\n`);
  const benchmarkFile = path.join(iter, 'benchmark.json');
  if (fs.existsSync(benchmarkFile)) {
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));
    benchmark.human_review = {
      ...(benchmark.human_review ?? {}),
      [result.reviewer]: { mode: 'preference', per_case: perCase, summary: tally },
    };
    fs.writeFileSync(benchmarkFile, `${JSON.stringify(benchmark, null, 2)}\n`);
  }
  const width = Math.max(4, ...Object.keys(perCase).map((id) => id.length));
  console.log(`Reviewer: ${result.reviewer} (preference per case)`);
  console.log('');
  for (const [caseId, entry] of Object.entries(perCase)) {
    const flag = entry.basis === 'default' ? '  [by default, not on design]' : '';
    console.log(`${caseId.padEnd(width)}  ${entry.winner}${flag}`);
  }
  console.log('');
  console.log(
    `with_skill ${tally.with_skill}  without_skill ${tally.without_skill}  tie ${tally.tie}  (decided by default: ${tally.decided_by_default})`,
  );
  console.log(`Wrote review-${slug}.json${fs.existsSync(benchmarkFile) ? ' and benchmark.json human_review' : ''}`);
}

function cmdUnblind(opts) {
  const iter = iterationDir(opts);
  const keyFile = path.join(iter, 'blind-key.json');
  if (!fs.existsSync(keyFile)) fail(`no blind key at ${keyFile}\nRun blind first.`);
  const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (opts.preferences) return unblindPreferences(opts, iter, key);
  const scoresFile = opts.scores ?? path.join(iter, 'review', 'scores.json');
  if (!fs.existsSync(scoresFile)) fail(`no scores at ${scoresFile}`);
  const scores = JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
  const errors = [];
  if (typeof scores.reviewer !== 'string' || scores.reviewer.trim() === '') errors.push('reviewer is empty');
  const perCase = {};
  for (const [caseId, assignment] of Object.entries(key.cases)) {
    const entry = scores.cases?.[caseId];
    if (!entry) {
      errors.push(`missing case ${caseId}`);
      continue;
    }
    perCase[caseId] = {};
    for (const label of ['A', 'B']) {
      const row = entry[label] ?? {};
      const values = [];
      for (const dimension of Object.keys(row)) {
        if (!DIMENSIONS.includes(dimension)) errors.push(`${caseId}/${label}: unknown dimension ${dimension}`);
      }
      for (const dimension of DIMENSIONS) {
        const value = row[dimension];
        if (value === null || value === undefined) continue;
        if (!Number.isInteger(value) || value < 0 || value > 4) {
          errors.push(`${caseId}/${label}/${dimension}: ${JSON.stringify(value)} is not an integer 0-4`);
        } else {
          values.push(value);
        }
      }
      if (values.length === 0) errors.push(`${caseId}/${label}: no dimension scored`);
      const mean = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0;
      perCase[caseId][assignment[label]] = { mean, scored: values.length };
    }
  }
  if (errors.length > 0) fail(`scores are not valid:\n- ${errors.join('\n- ')}`);

  const summary = {};
  for (const variant of VARIANTS) {
    const means = Object.values(perCase).map((entry) => entry[variant].mean);
    summary[variant] = Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 100) / 100;
  }
  summary.delta = Math.round((summary.with_skill - summary.without_skill) * 100) / 100;
  const slug = scores.reviewer.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reviewer';
  const result = { reviewer: scores.reviewer.trim(), per_case: perCase, summary };
  fs.writeFileSync(path.join(iter, `review-${slug}.json`), `${JSON.stringify(result, null, 2)}\n`);

  const benchmarkFile = path.join(iter, 'benchmark.json');
  if (fs.existsSync(benchmarkFile)) {
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));
    benchmark.human_review = { ...(benchmark.human_review ?? {}), [result.reviewer]: { per_case: perCase, summary } };
    fs.writeFileSync(benchmarkFile, `${JSON.stringify(benchmark, null, 2)}\n`);
  }

  const width = Math.max(4, ...Object.keys(perCase).map((id) => id.length));
  console.log(`Reviewer: ${result.reviewer} (mean score 0-4)`);
  console.log('');
  console.log(`${'case'.padEnd(width)}  ${'with_skill'.padEnd(11)}  without_skill`);
  for (const [caseId, entry] of Object.entries(perCase)) {
    console.log(`${caseId.padEnd(width)}  ${String(entry.with_skill.mean).padEnd(11)}  ${entry.without_skill.mean}`);
  }
  console.log('');
  console.log(`with_skill: ${summary.with_skill}  without_skill: ${summary.without_skill}  delta: ${summary.delta >= 0 ? '+' : ''}${summary.delta}`);
  console.log(`Wrote review-${slug}.json${fs.existsSync(benchmarkFile) ? ' and benchmark.json human_review' : ''}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  let opts;
  try {
    opts = parseArgs(rest);
  } catch (error) {
    fail(`${error.message}\n\n${HELP}`);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }
  if (command === 'init') return cmdInit(opts);
  if (command === 'list') return cmdList(opts);
  if (command === 'grade') return cmdGrade(opts);
  if (command === 'blind') return cmdBlind(opts);
  if (command === 'unblind') return cmdUnblind(opts);
  fail(`unknown command: ${command}\n\n${HELP}`);
}

const isMain =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    fail(`error: ${error.message}`);
  }
}
