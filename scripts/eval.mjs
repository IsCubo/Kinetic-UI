#!/usr/bin/env node
// Maintainer evals for the kinetic-ui skill.
//
// This runner deliberately does not call a model. `init` prepares one isolated
// with_skill and one without_skill run per case, each with a RUN.md the operator
// hands to a fresh session. `grade` reads the outputs and applies the assertions
// in evals/evals.json. That keeps the harness agent-agnostic and lets a human
// inspect every run before trusting a number.

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

const HELP = `kinetic-ui evals

Usage:
  node scripts/eval.mjs init [--iteration N] [--workspace DIR] [--force]
  node scripts/eval.mjs list
  node scripts/eval.mjs grade [--iteration N] [--workspace DIR]

Commands:
  init    Create <workspace>/iteration-N with a skill snapshot, one
          with_skill and one without_skill run per case, and a RUN.md for each.
  list    Print the eval cases and their assertion counts.
  grade   Grade every outputs/ directory and write grading.json per run plus
          benchmark.json for the iteration. Missing runs are reported, not invented.

Options:
  --iteration N   Iteration number (default 1).
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
    if (arg === '--iteration' || arg === '--workspace') {
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

function runInstructions(testCase, variant, snapshot, inputs) {
  let prompt = testCase.prompt;
  const originals = testCase.files ?? [];
  for (let i = 0; i < originals.length && i < inputs.length; i++) {
    prompt = prompt.split(originals[i]).join(inputs[i]);
  }
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
