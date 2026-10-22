#!/usr/bin/env node
// Hides the installed kinetic-ui skill from every known agent skills directory
// so an eval baseline starts without it, and restores the copies from a manifest.
//
// This is local isolation, not a sandbox. It removes the advertised skill and
// moves the installed copies; it cannot stop a determined agent from reading the
// repository source. For a causal claim, run the baseline in a disposable
// profile or container outside the repository.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENTS, SKILL_NAME } from './lib/agents.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const DEFAULT_WORKSPACE = path.join(REPO, 'evals', 'workspace');
const MANIFEST_NAME = '.isolated-skills.json';

const HELP = `kinetic-ui eval isolation

Usage:
  node scripts/eval-isolate.mjs status [--home DIR] [--project DIR] [--workspace DIR] [--json]
  node scripts/eval-isolate.mjs hide [--home DIR] [--project DIR] [--workspace DIR] [--yes] [--dry-run]
  node scripts/eval-isolate.mjs restore [--workspace DIR] [--dry-run]

Commands:
  status   Show every known kinetic-ui install and the hide manifest.
  hide     Move every installed copy to <skills-dir>/.kinetic-ui.disabled and
           record it in <workspace>/.isolated-skills.json. Requires --yes.
  restore  Move every recorded copy back and delete the manifest.

Options:
  --home DIR       Home directory for user-scope paths (default: current home).
                   Use a disposable profile for a stricter baseline.
  --project DIR    Project directory for project-scope paths (default: cwd).
  --workspace DIR  Where the manifest lives (default: evals/workspace).
  --yes            Confirm hide. Without it, hide prints the plan and exits 1.
  --dry-run        Print the actions without moving anything.
  --json           status as JSON.
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    home: os.homedir(),
    project: process.cwd(),
    workspace: DEFAULT_WORKSPACE,
    yes: false,
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--home' || arg === '--project' || arg === '--workspace') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--home') opts.home = path.resolve(value);
      if (arg === '--project') opts.project = path.resolve(value);
      if (arg === '--workspace') opts.workspace = path.resolve(value);
    } else if (arg === '--yes') {
      opts.yes = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return opts;
}

function manifestPath(opts) {
  return path.join(opts.workspace, MANIFEST_NAME);
}

function display(target, home) {
  const normalized = path.resolve(target);
  if (normalized === home) return '~';
  if (normalized.startsWith(`${home}${path.sep}`)) return `~${normalized.slice(home.length)}`;
  return normalized;
}

function discover(opts) {
  const found = [];
  const seen = new Set();
  for (const [agent, scopes] of Object.entries(AGENTS)) {
    for (const scope of ['user', 'project']) {
      const base = scopes[scope](scope === 'user' ? opts.home : opts.project);
      const target = path.join(base, SKILL_NAME);
      if (seen.has(target)) continue;
      seen.add(target);
      let kind = 'missing';
      let linkTarget = null;
      try {
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink()) {
          kind = 'symlink';
          linkTarget = fs.readlinkSync(target);
        } else if (stat.isDirectory()) {
          kind = 'directory';
        } else {
          kind = 'file';
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      found.push({ agent, scope, target, kind, linkTarget });
    }
  }
  return found;
}

function readManifest(opts) {
  const file = manifestPath(opts);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || !Array.isArray(data.entries)) throw new Error(`invalid manifest: ${file}`);
  for (const entry of data.entries) {
    if (
      typeof entry.target !== 'string' ||
      typeof entry.backup !== 'string' ||
      !path.isAbsolute(entry.target) ||
      !path.isAbsolute(entry.backup)
    ) {
      throw new Error(`manifest has a relative or invalid path; refusing: ${file}`);
    }
  }
  return data;
}

function saveManifest(opts, data) {
  fs.mkdirSync(opts.workspace, { recursive: true });
  fs.writeFileSync(manifestPath(opts), `${JSON.stringify(data, null, 2)}\n`);
}

function cmdStatus(opts) {
  const entries = discover(opts);
  const manifest = readManifest(opts);
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          manifest: manifestPath(opts),
          hidden: manifest !== null,
          entries,
          manifest_entries: manifest?.entries ?? [],
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log('kinetic-ui installs:');
  for (const entry of entries) {
    const state = entry.kind === 'missing' ? 'missing' : entry.kind;
    const link = entry.linkTarget ? ` -> ${entry.linkTarget}` : '';
    console.log(`  ${state.padEnd(10)} ${display(entry.target, opts.home)}${link}`);
  }
  console.log('');
  if (manifest) {
    const suffix = manifest.complete === false ? ' (incomplete hide; run restore)' : '';
    console.log(`Hidden copies: ${manifest.entries.length}${suffix}`);
    console.log(`Manifest: ${display(manifestPath(opts), opts.home)}`);
    console.log('Run restore before reinstalling or using the installed skill.');
  } else {
    console.log('Hidden copies: none');
    console.log(`Manifest: ${display(manifestPath(opts), opts.home)}`);
  }
}

function rollback(moved) {
  const errors = [];
  for (const entry of [...moved].reverse()) {
    try {
      fs.renameSync(entry.backup, entry.target);
    } catch (error) {
      errors.push(`${entry.target}: ${error.message}`);
    }
  }
  return errors;
}

function cmdHide(opts) {
  const existing = readManifest(opts);
  if (existing) {
    fail(`already hidden: ${display(manifestPath(opts), opts.home)}\nRun restore first.`);
  }
  const found = discover(opts).filter((entry) => entry.kind !== 'missing');
  if (found.length === 0) {
    console.log('No installed kinetic-ui copies found. The baseline is already clean.');
    return;
  }
  const plan = found.map((entry) => ({
    ...entry,
    backup: path.join(path.dirname(entry.target), `.${SKILL_NAME}.disabled`),
  }));
  for (const entry of plan) {
    if (fs.existsSync(entry.backup)) {
      fail(`backup already exists: ${display(entry.backup, opts.home)}\nResolve it before hiding.`);
    }
  }
  if (opts.dryRun) {
    console.log('Would hide:');
    for (const entry of plan) {
      console.log(`  ${display(entry.target, opts.home)} -> ${display(entry.backup, opts.home)}`);
    }
    return;
  }
  if (!opts.yes) {
    fail('hide moves installed skills; pass --yes to confirm.\nUse --dry-run to see the plan.');
  }
  const manifest = {
    created_at: new Date().toISOString(),
    home: opts.home,
    project: opts.project,
    complete: false,
    entries: [],
  };
  try {
    for (const entry of plan) {
      fs.renameSync(entry.target, entry.backup);
      manifest.entries.push(entry);
      saveManifest(opts, manifest);
    }
    manifest.complete = true;
    saveManifest(opts, manifest);
  } catch (error) {
    const errors = rollback(manifest.entries);
    const stillHidden = manifest.entries.filter((entry) => fs.existsSync(entry.backup) && !fs.existsSync(entry.target));
    if (stillHidden.length > 0) {
      manifest.entries = stillHidden;
      manifest.complete = false;
      saveManifest(opts, manifest);
    } else {
      try {
        fs.rmSync(manifestPath(opts), { force: true });
      } catch (rmError) {
        // The move/rollback state is already settled; leave the manifest path alone on cleanup failure.
      }
    }
    const detail = errors.length > 0 ? `\nRollback errors:\n- ${errors.join('\n- ')}` : '';
    fail(`hide failed: ${error.message}${detail}\nRun status, then restore.`);
  }
  console.log(`Hidden ${manifest.entries.length} installed cop${manifest.entries.length === 1 ? 'y' : 'ies'}:`);
  for (const entry of manifest.entries) {
    console.log(`  ${display(entry.target, opts.home)} -> ${display(entry.backup, opts.home)}`);
  }
  console.log('');
  console.log('Start a fresh agent process; a running session keeps its old skill list.');
  console.log('Run the with-skill sessions from the snapshot and the without-skill sessions now.');
  console.log(`Restore with: node scripts/eval-isolate.mjs restore --workspace "${opts.workspace}"`);
}

function cmdRestore(opts) {
  const manifest = readManifest(opts);
  if (!manifest) {
    fail(`nothing to restore: ${display(manifestPath(opts), opts.home)}`);
  }
  if (manifest.entries.length === 0) {
    fs.rmSync(manifestPath(opts));
    console.log('Manifest had no entries; removed.');
    return;
  }
  const remaining = [];
  const errors = [];
  for (const entry of manifest.entries) {
    if (fs.existsSync(entry.target)) {
      errors.push(`target already exists: ${display(entry.target, opts.home)} (backup kept at ${display(entry.backup, opts.home)})`);
      remaining.push(entry);
      continue;
    }
    if (!fs.existsSync(entry.backup)) {
      errors.push(`backup missing: ${display(entry.backup, opts.home)} (target ${display(entry.target, opts.home)})`);
      remaining.push(entry);
      continue;
    }
    if (opts.dryRun) {
      console.log(`Would restore ${display(entry.target, opts.home)}`);
      continue;
    }
    try {
      fs.renameSync(entry.backup, entry.target);
      console.log(`Restored ${display(entry.target, opts.home)}`);
    } catch (error) {
      errors.push(`restore failed for ${display(entry.target, opts.home)}: ${error.message}`);
      remaining.push(entry);
    }
  }
  if (opts.dryRun) {
    if (errors.length > 0) {
      fail(`restore would fail for ${errors.length} entr${errors.length === 1 ? 'y' : 'ies'}:\n- ${errors.join('\n- ')}`);
    }
    return;
  }
  if (remaining.length > 0) {
    saveManifest(opts, { ...manifest, entries: remaining });
    fail(`restore incomplete (${remaining.length} left):\n- ${errors.join('\n- ')}`);
  }
  try {
    fs.rmSync(manifestPath(opts));
  } catch (rmError) {
    fail(`restored copies but could not remove the manifest: ${rmError.message}`);
  }
  console.log(`Restored ${manifest.entries.length} cop${manifest.entries.length === 1 ? 'y' : 'ies'}. Manifest removed.`);
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
  if (command === 'status') return cmdStatus(opts);
  if (command === 'hide') return cmdHide(opts);
  if (command === 'restore') return cmdRestore(opts);
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
