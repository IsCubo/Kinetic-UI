// Tests for the skill validator and index builder, exercised through their CLIs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALIDATE = path.join(ROOT, 'scripts', 'validate.mjs');
const BUILD_INDEX = path.join(ROOT, 'scripts', 'build-index.mjs');

function run(script, ...args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const SKILL_MD = `---
name: demo-skill
description: "Trigger: demo. Demo skill for validator tests."
license: Apache-2.0
metadata:
  author: tester
  version: "0.1.0"
---

# Demo

Look up keywords in \`INDEX.md\`. Parallax lives in [parallax](references/effects/parallax.md).
`;

const PARALLAX_MD = `# Parallax

> Keywords: parallax, depth on scroll
> Summary: Layers move at different speeds to suggest depth.

## Reduced motion

Render layers static.

## Low-end fallback

Use a single static image.
`;

// Builds a minimal valid skill in a fresh temp dir; `edit` mutates files before indexing.
function makeSkill({ edit, skipIndex = false } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-test-'));
  const dir = path.join(base, 'demo-skill');
  const files = {
    'SKILL.md': SKILL_MD,
    'references/effects/parallax.md': PARALLAX_MD,
    'assets/snippets/tier.js': '// Keywords: tier, detection\n// Summary: Detects a motion tier.\nexport const tier = () => 1;\n',
  };
  if (edit) edit(files);
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  if (!skipIndex) {
    const r = run(BUILD_INDEX, dir);
    assert.equal(r.code, 0, `build-index failed: ${r.out}`);
  }
  return { dir, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

function expectError(rule, edit, { mutateAfterIndex } = {}) {
  const s = makeSkill({ edit });
  try {
    if (mutateAfterIndex) mutateAfterIndex(s.dir);
    const r = run(VALIDATE, s.dir);
    assert.equal(r.code, 1, `expected exit 1, got ${r.code}: ${r.out}`);
    assert.match(r.out, new RegExp(`ERROR \\[${rule}\\]`));
    return r.out;
  } finally {
    s.cleanup();
  }
}

test('valid skill passes with exit 0', () => {
  const s = makeSkill();
  try {
    const r = run(VALIDATE, s.dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^OK: \d+ files checked/m);
  } finally {
    s.cleanup();
  }
});

test('frontmatter: name must match the skill directory', () => {
  expectError('frontmatter', (f) => { f['SKILL.md'] = f['SKILL.md'].replace('name: demo-skill', 'name: other-skill'); });
});

test('frontmatter: description longer than 1024 chars fails', () => {
  expectError('frontmatter', (f) => { f['SKILL.md'] = f['SKILL.md'].replace(/description: .*/, `description: "${'x'.repeat(1025)}"`); });
});

test('frontmatter: missing metadata.version fails', () => {
  expectError('frontmatter', (f) => { f['SKILL.md'] = f['SKILL.md'].replace(/  version: .*\n/, ''); });
});

test('required-sections: effect without "## Reduced motion" fails and names the file', () => {
  const out = expectError('required-sections', (f) => {
    f['references/effects/parallax.md'] = PARALLAX_MD.replace('## Reduced motion', '## Calm mode');
  });
  assert.match(out, /references\/effects\/parallax\.md/);
  assert.match(out, /## Reduced motion/);
});

test('required-sections: effect without "## Low-end fallback" fails', () => {
  const out = expectError('required-sections', (f) => {
    f['references/effects/parallax.md'] = PARALLAX_MD.replace('## Low-end fallback', '## Other');
  });
  assert.match(out, /## Low-end fallback/);
});

test('header: reference file without a Keywords line fails', () => {
  expectError('header', (f) => { f['references/effects/parallax.md'] = PARALLAX_MD.replace(/> Keywords: .*\n/, ''); });
});

test('links: SKILL.md pointing to a missing reference fails', () => {
  const out = expectError('links', (f) => { f['SKILL.md'] += '\nSee `references/effects/missing.md`.\n'; });
  assert.match(out, /references\/effects\/missing\.md/);
});

test('body-size: SKILL.md body over the token budget fails', () => {
  expectError('body-size', (f) => { f['SKILL.md'] += `\n${'word '.repeat(1200)}\n`; });
});

test('index-fresh: a file added after indexing makes the index stale', () => {
  expectError('index-fresh', undefined, {
    mutateAfterIndex: (dir) => fs.writeFileSync(path.join(dir, 'references/effects/tilt.md'),
      PARALLAX_MD.replace('# Parallax', '# Tilt').replace('parallax, depth on scroll', 'tilt')),
  });
});

test('js-syntax: an invalid JavaScript asset fails', () => {
  expectError('js-syntax', (f) => { f['assets/snippets/tier.js'] += '\nexport const broken = (;\n'; });
});

test('build-index: lists every indexed file with its keywords, paths relative to the skill root', () => {
  const s = makeSkill();
  try {
    const index = fs.readFileSync(path.join(s.dir, 'INDEX.md'), 'utf8');
    assert.match(index, /`references\/effects\/parallax\.md`/);
    assert.match(index, /parallax, depth on scroll/);
    assert.match(index, /`assets\/snippets\/tier\.js`/);
    assert.doesNotMatch(index, /SKILL\.md`/);
  } finally {
    s.cleanup();
  }
});

test('build-index --check: exit 0 when fresh, exit 1 when stale, without rewriting', () => {
  const s = makeSkill();
  try {
    assert.equal(run(BUILD_INDEX, s.dir, '--check').code, 0);
    fs.writeFileSync(path.join(s.dir, 'references/effects/tilt.md'), PARALLAX_MD.replace('# Parallax', '# Tilt'));
    const before = fs.readFileSync(path.join(s.dir, 'INDEX.md'), 'utf8');
    const r = run(BUILD_INDEX, s.dir, '--check');
    assert.equal(r.code, 1, r.out);
    assert.equal(fs.readFileSync(path.join(s.dir, 'INDEX.md'), 'utf8'), before);
  } finally {
    s.cleanup();
  }
});

test('missing skill directory argument exits 2 with usage', () => {
  const r = run(VALIDATE);
  assert.equal(r.code, 2);
  assert.match(r.out, /Usage:/);
});
