// Portable test entry: Windows npm does not expand globs, so `node --test tests/*.test.mjs`
// silently runs zero tests there. Resolve the files here and pass explicit paths.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(join(root, 'tests'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => join('tests', name));

if (files.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
