#!/usr/bin/env node
// Installs the kinetic-ui Agent Skill into the skills directory of a supported agent.
// Copies by default so the installed skill survives moving or deleting the clone.
// --link is opt-in for maintainers who want live edits; on Windows it uses a junction,
// which does not require Developer Mode or administrator rights.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SKILL_NAME = 'kinetic-ui';
const SOURCE = path.join(REPO, 'skills', SKILL_NAME);

const AGENTS = {
  opencode: {
    label: 'OpenCode',
    user: () => path.join(os.homedir(), '.config', 'opencode', 'skills'),
    project: (project) => path.join(project, '.opencode', 'skills'),
  },
  claude: {
    label: 'Claude Code',
    user: () => path.join(os.homedir(), '.claude', 'skills'),
    project: (project) => path.join(project, '.claude', 'skills'),
  },
  agents: {
    label: 'Agent Skills convention',
    user: () => path.join(os.homedir(), '.agents', 'skills'),
    project: (project) => path.join(project, '.agents', 'skills'),
  },
};

const HELP = `kinetic-ui installer

Usage:
  node scripts/install.mjs --agent <opencode|claude|agents> [--scope user|project] [--project <dir>] [--link] [--force] [--dry-run]
  node scripts/install.mjs --dest <skills-dir> [--link] [--force] [--dry-run]

Targets (user scope):
  opencode   ~/.config/opencode/skills
  claude     ~/.claude/skills
  agents     ~/.agents/skills

Targets (project scope, under <project>):
  opencode   .opencode/skills
  claude     .claude/skills
  agents     .agents/skills

Options:
  --link     Create a symlink (junction on Windows) instead of copying.
             Use it only while developing the skill.
  --force    Replace an existing install.
  --dry-run  Print the target and the mode without writing.
  --help     Show this help.

Examples:
  node scripts/install.mjs --agent opencode
  node scripts/install.mjs --agent claude --scope project --project ../my-app
  node scripts/install.mjs --dest /opt/company-skills
`;

function fail(message) {
  throw new Error(message);
}

function take(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) fail(`${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const opts = { scope: 'user', link: false, force: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--agent') opts.agent = take(argv, (i += 1), arg);
    else if (arg === '--dest') opts.dest = take(argv, (i += 1), arg);
    else if (arg === '--scope') opts.scope = take(argv, (i += 1), arg);
    else if (arg === '--project') opts.project = take(argv, (i += 1), arg);
    else if (arg === '--link') opts.link = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else fail(`unknown option "${arg}" (try --help)`);
  }
  return opts;
}

function statSafe(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function realpathSafe(target) {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
}

function countFiles(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
  }
  return total;
}

function assertSource() {
  const manifest = path.join(SOURCE, 'SKILL.md');
  if (!fs.existsSync(manifest)) fail(`source not found: ${manifest}`);
  const head = fs.readFileSync(manifest, 'utf8').slice(0, 500);
  if (!new RegExp(`^name:\\s*${SKILL_NAME}\\s*$`, 'm').test(head)) {
    fail(`source manifest does not declare name: ${SKILL_NAME}`);
  }
}

function verifyInstall(target) {
  const manifest = path.join(target, 'SKILL.md');
  if (!fs.existsSync(manifest) || !fs.statSync(manifest).isFile()) {
    fail(`install verification failed: ${manifest} is missing`);
  }
}

function removeExisting(target, state) {
  if (state.isSymbolicLink() || state.isFile()) fs.unlinkSync(target);
  else fs.rmSync(target, { recursive: true, force: true });
}

function installOne({ target, link, force, dryRun }) {
  const state = statSafe(target);
  if (state) {
    const alreadyLinked = link && state.isSymbolicLink() && realpathSafe(target) === realpathSafe(SOURCE);
    if (alreadyLinked) return { action: 'unchanged', target };
    if (dryRun) return { action: 'replace', target };
    if (!force) fail(`${target} already exists; pass --force to replace it`);
    removeExisting(target, state);
  } else if (dryRun) {
    return { action: 'install', target };
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (link) fs.symlinkSync(SOURCE, target, process.platform === 'win32' ? 'junction' : 'dir');
  else fs.cpSync(SOURCE, target, { recursive: true });
  verifyInstall(target);
  return { action: state ? 'replace' : 'install', target };
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }

  if (!opts.agent && !opts.dest) fail('pass --agent <opencode|claude|agents> or --dest <dir>');
  if (opts.agent && opts.dest) fail('--agent and --dest are exclusive');
  if (!['user', 'project'].includes(opts.scope)) fail('--scope must be "user" or "project"');
  if (opts.dest && (opts.scope !== 'user' || opts.project)) {
    fail('--dest cannot be combined with --scope or --project');
  }
  if (opts.agent && !AGENTS[opts.agent]) {
    fail(`unknown agent "${opts.agent}"; use ${Object.keys(AGENTS).join(', ')}, or --dest`);
  }
  if (opts.agent && opts.scope === 'project' && !opts.project) opts.project = process.cwd();
  if (opts.agent && opts.scope === 'user' && opts.project) {
    fail('--project requires --scope project');
  }

  assertSource();
  const base = opts.dest
    ? path.resolve(opts.dest)
    : AGENTS[opts.agent][opts.scope](opts.project ? path.resolve(opts.project) : undefined);
  const target = path.join(base, SKILL_NAME);

  const result = installOne({ target, link: opts.link, force: opts.force, dryRun: opts.dryRun });
  const mode = opts.link ? 'link' : `copy, ${countFiles(SOURCE)} files`;
  const prefix = opts.dryRun
    ? (result.action === 'replace' ? 'Would replace' : 'Would install')
    : result.action === 'unchanged' ? 'Already installed' : 'Installed';
  process.stdout.write(`${prefix} ${SKILL_NAME} (${mode}) -> ${target}\n`);
  if (!opts.dryRun && result.action !== 'unchanged') {
    process.stdout.write('Reload the agent (or restart it) if the skill does not appear.\n');
  }
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
}
