#!/usr/bin/env node
// Validates an Agent Skill directory. Exit codes: 0 valid, 1 errors found, 2 usage error.
import fs from 'node:fs';
import { validate } from './lib/skill.mjs';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('Usage: node scripts/validate.mjs <skill-directory>');
  process.exit(2);
}

const { errors, warnings, checked } = validate(dir);
for (const w of warnings) console.log(w);
for (const e of errors) console.log(e);
if (errors.length) {
  console.log(`FAIL: ${errors.length} error(s) in ${checked} files`);
  process.exit(1);
}
console.log(`OK: ${checked} files checked`);
