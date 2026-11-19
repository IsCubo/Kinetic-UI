// Tests for the motion tokens: the spring curves must keep the overshoot the references promise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'skills', 'kinetic-ui', 'assets', 'tokens', 'motion.css'), 'utf8');

/** Values of a `linear()` easing declared for `name`, without the optional percentage stops. */
function linearPoints(name) {
  const match = CSS.match(new RegExp(`${name}:\\s*linear\\(([^)]*)\\)`));
  assert.ok(match, `${name} is declared as a linear() curve`);
  return match[1].split(',').map((stop) => Number.parseFloat(stop.trim().split(/\s+/)[0]));
}

test('tokens: --kui-ease-spring keeps its documented ~16% overshoot', () => {
  const points = linearPoints('--kui-ease-spring');
  assert.equal(points[0], 0);
  assert.equal(points.at(-1), 1);
  const overshoot = Math.max(...points) - 1;
  assert.ok(overshoot > 0.14 && overshoot < 0.18, `overshoot ${overshoot.toFixed(3)}`);
});

test('tokens: --kui-ease-spring-gentle settles with a 4-6% overshoot and no second bounce', () => {
  const points = linearPoints('--kui-ease-spring-gentle');
  assert.equal(points[0], 0);
  assert.equal(points.at(-1), 1);
  const overshoot = Math.max(...points) - 1;
  assert.ok(overshoot >= 0.035 && overshoot <= 0.06, `overshoot ${overshoot.toFixed(3)}`);
  const peak = points.indexOf(Math.max(...points));
  assert.ok(points.slice(peak).every((value) => value >= 0.995), 'never dips visibly below rest after the peak');
});

test('tokens: browsers without linear() fall back for both springs', () => {
  const fallback = CSS.match(/@supports not \(transition-timing-function: linear\(0, 1\)\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fallback, 'the @supports fallback block exists');
  assert.match(fallback[1], /--kui-ease-spring:\s*var\(--kui-ease-standard\)/);
  assert.match(fallback[1], /--kui-ease-spring-gentle:\s*var\(--kui-ease-enter\)/);
});
