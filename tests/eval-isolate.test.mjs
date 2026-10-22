// Tests for the local eval isolation tool, exercised through its CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISOLATE = path.join(ROOT, 'scripts', 'eval-isolate.mjs');

function run(...args) {
  const result = spawnSync(process.execPath, [ISOLATE, ...args], { encoding: 'utf8' });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

function withTemp(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-isolate-'));
  try {
    fn(base);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

function setup(base) {
  const home = path.join(base, 'home');
  const project = path.join(base, 'project');
  const workspace = path.join(base, 'workspace');
  const targets = [
    path.join(home, '.config', 'opencode', 'skills', 'kinetic-ui'),
    path.join(home, '.claude', 'skills', 'kinetic-ui'),
    path.join(project, '.opencode', 'skills', 'kinetic-ui'),
  ];
  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), `# ${target}\n`);
  }
  return { home, project, workspace, targets };
}

function statusJson(opts) {
  const result = run(
    'status',
    '--home',
    opts.home,
    '--project',
    opts.project,
    '--workspace',
    opts.workspace,
    '--json',
  );
  assert.equal(result.code, 0, result.out);
  return JSON.parse(result.out);
}

test('eval isolation: status reports every known install, present or missing', () => {
  withTemp((base) => {
    const opts = setup(base);
    const status = statusJson(opts);
    assert.equal(status.hidden, false);
    assert.equal(status.entries.length, 6);
    assert.equal(status.entries.filter((entry) => entry.kind !== 'missing').length, 3);
    assert.equal(status.entries.find((entry) => entry.target === opts.targets[0]).kind, 'directory');
    assert.equal(status.manifest_entries.length, 0);
  });
});

test('eval isolation: hide refuses without --yes and moves nothing', () => {
  withTemp((base) => {
    const opts = setup(base);
    const result = run(
      'hide',
      '--home',
      opts.home,
      '--project',
      opts.project,
      '--workspace',
      opts.workspace,
    );
    assert.equal(result.code, 1);
    assert.match(result.out, /pass --yes/);
    for (const target of opts.targets) assert.equal(fs.existsSync(target), true);
    assert.equal(fs.existsSync(path.join(opts.workspace, '.isolated-skills.json')), false);
  });
});

test('eval isolation: hide and restore round-trip every copy', () => {
  withTemp((base) => {
    const opts = setup(base);
    const hidden = run(
      'hide',
      '--home',
      opts.home,
      '--project',
      opts.project,
      '--workspace',
      opts.workspace,
      '--yes',
    );
    assert.equal(hidden.code, 0, hidden.out);
    for (const target of opts.targets) {
      assert.equal(fs.existsSync(target), false);
      assert.equal(fs.existsSync(path.join(path.dirname(target), '.kinetic-ui.disabled')), true);
    }
    const status = statusJson(opts);
    assert.equal(status.hidden, true);
    assert.equal(status.manifest_entries.length, 3);

    const restored = run('restore', '--workspace', opts.workspace);
    assert.equal(restored.code, 0, restored.out);
    for (const target of opts.targets) {
      assert.equal(fs.existsSync(target), true);
      assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), `# ${target}\n`);
      assert.equal(fs.existsSync(path.join(path.dirname(target), '.kinetic-ui.disabled')), false);
    }
    assert.equal(fs.existsSync(path.join(opts.workspace, '.isolated-skills.json')), false);
  });
});

test('eval isolation: hide refuses a second hide and restore refuses an empty manifest', () => {
  withTemp((base) => {
    const opts = setup(base);
    assert.equal(
      run(
        'hide',
        '--home',
        opts.home,
        '--project',
        opts.project,
        '--workspace',
        opts.workspace,
        '--yes',
      ).code,
      0,
    );
    const second = run(
      'hide',
      '--home',
      opts.home,
      '--project',
      opts.project,
      '--workspace',
      opts.workspace,
      '--yes',
    );
    assert.equal(second.code, 1);
    assert.match(second.out, /already hidden/);
    assert.equal(run('restore', '--workspace', opts.workspace).code, 0);
    const empty = run('restore', '--workspace', opts.workspace);
    assert.equal(empty.code, 1);
    assert.match(empty.out, /nothing to restore/);
  });
});

test('eval isolation: dry-run reports the plan without moving or writing', () => {
  withTemp((base) => {
    const opts = setup(base);
    const result = run(
      'hide',
      '--home',
      opts.home,
      '--project',
      opts.project,
      '--workspace',
      opts.workspace,
      '--dry-run',
    );
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /Would hide/);
    for (const target of opts.targets) assert.equal(fs.existsSync(target), true);
    assert.equal(fs.existsSync(path.join(opts.workspace, '.isolated-skills.json')), false);
  });
});

test('eval isolation: a symlink install is restored as a symlink', (t) => {
  withTemp((base) => {
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    const workspace = path.join(base, 'workspace');
    const source = path.join(base, 'source-skill');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# source\n');
    const link = path.join(home, '.config', 'opencode', 'skills', 'kinetic-ui');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    try {
      fs.symlinkSync(source, link, 'dir');
    } catch {
      t.skip('symlinks unavailable on this platform');
      return;
    }

    const hidden = run('hide', '--home', home, '--project', project, '--workspace', workspace, '--yes');
    assert.equal(hidden.code, 0, hidden.out);
    assert.equal(fs.existsSync(link), false);

    const restored = run('restore', '--workspace', workspace);
    assert.equal(restored.code, 0, restored.out);
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
    assert.equal(fs.readlinkSync(link), source);
  });
});
