#!/usr/bin/env node
// Regenerates <skill>/INDEX.md from each file's Keywords/Summary header.
// With --check, only reports whether INDEX.md is current (exit 1 when stale) and writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { buildIndex, INDEX_FILE } from './lib/skill.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const dir = args.find((a) => !a.startsWith('--'));
if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('Usage: node scripts/build-index.mjs <skill-directory> [--check]');
  process.exit(2);
}

const target = path.join(dir, INDEX_FILE);
const next = buildIndex(dir);
const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;

if (check) {
  if (current === next) {
    console.log(`OK: ${INDEX_FILE} is current`);
    process.exit(0);
  }
  console.log(`STALE: ${INDEX_FILE} differs; run node scripts/build-index.mjs ${dir}`);
  process.exit(1);
}

fs.writeFileSync(target, next);
console.log(`WROTE: ${target}`);
