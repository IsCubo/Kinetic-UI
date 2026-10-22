// Tests for the portable skill installer, exercised through its CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL = path.join(ROOT, 'scripts', 'install.mjs');
const SOURCE = path.join(ROOT, 'skills', 'kinetic-ui');

function run(...args) {
  const r = spawnSync(process.execPath, [INSTALL, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-install-'));
}

function withTemp(fn) {
  const base = tempDir();
  try {
    fn(base);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

test('installer: --help lists the user targets and contains no absolute maintainer path', () => {
  const r = run('--help');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /~\/\.config\/opencode\/skills/);
  assert.match(r.out, /~\//);
  assert.equal(r.out.includes(os.homedir()), false);
});

test('installer: copy installs SKILL.md and INDEX.md and no maintainer folders', () => {
  withTemp((base) => {
    const dest = path.join(base, 'skills');
    const r = run('--dest', dest);
    assert.equal(r.code, 0, r.out);
    const target = path.join(dest, 'kinetic-ui');
    assert.ok(fs.existsSync(path.join(target, 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(target, 'INDEX.md')));
    assert.equal(fs.existsSync(path.join(target, 'scripts')), false);
    assert.equal(fs.existsSync(path.join(target, 'tests')), false);
  });
});

test('installer: a second copy refuses without --force', () => {
  withTemp((base) => {
    const dest = path.join(base, 'skills');
    assert.equal(run('--dest', dest).code, 0);
    const second = run('--dest', dest);
    assert.equal(second.code, 1);
    assert.match(second.out, /--force/);
  });
});

test('installer: --force replaces an existing install', () => {
  withTemp((base) => {
    const dest = path.join(base, 'skills');
    assert.equal(run('--dest', dest).code, 0);
    const target = path.join(dest, 'kinetic-ui');
    fs.writeFileSync(path.join(target, 'SKILL.md'), 'stale');
    const r = run('--dest', dest, '--force');
    assert.equal(r.code, 0, r.out);
    assert.equal(
      fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'),
      fs.readFileSync(path.join(SOURCE, 'SKILL.md'), 'utf8'),
    );
  });
});

test('installer: --link creates a symlink that resolves to the source', { skip: process.platform === 'win32' }, () => {
  withTemp((base) => {
    const dest = path.join(base, 'skills');
    const r = run('--dest', dest, '--link');
    assert.equal(r.code, 0, r.out);
    const target = path.join(dest, 'kinetic-ui');
    assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(target), fs.realpathSync(SOURCE));
  });
});

test('installer: --dry-run writes nothing', () => {
  withTemp((base) => {
    const dest = path.join(base, 'skills');
    const r = run('--dest', dest, '--dry-run');
    assert.equal(r.code, 0, r.out);
    assert.equal(fs.existsSync(dest), false);
  });
});

test('installer: unknown agent fails and names the accepted values', () => {
  const r = run('--agent', 'nope');
  assert.equal(r.code, 1);
  assert.match(r.out, /unknown agent/);
  assert.match(r.out, /opencode/);
});

test('installer: project scope resolves under the given project', () => {
  withTemp((base) => {
    const project = path.join(base, 'app');
    const r = run('--agent', 'opencode', '--scope', 'project', '--project', project);
    assert.equal(r.code, 0, r.out);
    assert.ok(fs.existsSync(path.join(project, '.opencode', 'skills', 'kinetic-ui', 'SKILL.md')));
  });
});

test('installer: user scope resolves from the current home', () => {
  const r = run('--agent', 'opencode', '--dry-run');
  assert.equal(r.code, 0, r.out);
  const expected = path.join(os.homedir(), '.config', 'opencode', 'skills', 'kinetic-ui');
  assert.ok(r.out.includes(expected), `expected ${expected} in: ${r.out}`);
});

test('installer: --agent and --dest are mutually exclusive', () => {
  const r = run('--agent', 'opencode', '--dest', '/tmp/somewhere');
  assert.equal(r.code, 1);
  assert.match(r.out, /exclusive/);
});
