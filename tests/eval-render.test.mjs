// Tests for render checks: the eval runner opens an output page in headless Chrome and
// measures it. Browser-backed tests skip when no working Chrome or Chromium is available.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { gradeOutputs, validateEvals } from '../scripts/eval.mjs';
import { withBrowser } from '../skills/kinetic-ui/assets/snippets/capture-frames.mjs';

const NO_BROWSER = /no browser found|browser exited with code|browser printed no DevTools endpoint/;

function page(body, head = '') {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>fixture</title>' +
    `<style>body{margin:0;font:16px system-ui;background:#fafafa;color:#1d1d1f} ${head}</style></head>` +
    `<body>${body}</body></html>`;
}

const renderCase = (check, id = 'measured') => ({ id: 'fixture', assertions: [{ id, text: id, check: { type: 'render', ...check } }] });

/** Grade one fixture page with one render check. Returns the single result, or null when no browser. */
async function grade(html, check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-render-'));
  try {
    fs.writeFileSync(path.join(dir, 'page.html'), html);
    try {
      return await withBrowser(async (browser) => (await gradeOutputs(renderCase(check), dir, { browser }))[0], { timeout: 20000 });
    } catch (error) {
      if (NO_BROWSER.test(error.message)) return null;
      throw error;
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const BTN = 'button{font:inherit;padding:12px 20px;border-radius:10px;border:1px solid #c9c9c9;background:transparent}';
const FILL = '.fill{background:#1a7f4b;color:#fff;border-color:#1a7f4b}';
const SEGMENT = '.seg{display:inline-flex;padding:4px;border-radius:12px;background:#ececec} .seg label{position:relative} ' +
  '.seg input{position:absolute;opacity:0} .seg span{display:block;padding:8px 14px;border-radius:9px}';
const segment = (checkedStyle) => `<style>.seg input:checked + span{${checkedStyle}}</style>` +
  '<div class="seg"><label><input type="radio" name="p" checked><span>Monthly</span></label>' +
  '<label><input type="radio" name="p"><span>Yearly</span></label></div>';

test('render filledActions: a filled selected segment competes with the filled call to action', async (t) => {
  const r = await grade(page(`${segment('background:#1a7f4b;color:#fff')}<button class="fill">Start free</button><button>Compare</button>`, BTN + FILL + SEGMENT),
    { probe: 'filledActions', expect: { filled: { max: 1 } } });
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  assert.match(r.evidence, /filled=2 \(max 1\)/);
  assert.match(r.evidence, /Monthly/);
  assert.match(r.evidence, /Start free/);
});

test('render filledActions: one filled action and a raised light segment pass', async (t) => {
  const r = await grade(page(`${segment('background:#fff;box-shadow:0 1px 2px rgb(0 0 0/.14)')}<button class="fill">Start free</button><button>Compare</button>`, BTN + FILL + SEGMENT),
    { probe: 'filledActions', expect: { filled: { max: 1 } } });
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, true, r.evidence);
  assert.match(r.evidence, /filled=1 \(max 1\)/);
});

const CHIP = '.chip{display:inline-block;padding:2px 8px;border-radius:99px;font-size:13px}';

test('render saturatedHues: a red discount chip beside a green action is a second hue', async (t) => {
  const r = await grade(page('<span class="chip" style="background:#fde8e8;color:#c0392b">Save 33%</span><button class="fill">Start free</button>', BTN + FILL + CHIP),
    { probe: 'saturatedHues', expect: { hues: { max: 1 } } });
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  assert.match(r.evidence, /hues=2 \(max 1\)/);
  assert.match(r.evidence, /Save 33%/);
});

test('render saturatedHues: a chip tinted from the primary keeps one hue', async (t) => {
  const r = await grade(page('<span class="chip" style="background:#e3f3ea;color:#1a7f4b">Save 33%</span><button class="fill">Start free</button>', BTN + FILL + CHIP),
    { probe: 'saturatedHues', expect: { hues: { max: 1 } } });
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, true, r.evidence);
  assert.match(r.evidence, /hues=1 \(max 1\)/);
});

const PLANS = '<section style="display:flex;gap:24px;padding:24px">' +
  ['Free|$0', 'Plus|$9', 'Family|$15'].map((p) => {
    const [name, price] = p.split('|');
    return `<article style="width:260px;padding:20px;border:1px solid #ddd"><h3>${name}</h3><p>${price}/mo</p><button>Choose ${name}</button></article>`;
  }).join('') + '</section>';
const FOLD = { probe: 'optionsAboveFold', expect: { found: { min: 2 }, outside: { max: 0 } } };

test('render optionsAboveFold: a hero that pushes every plan below 900 px fails', async (t) => {
  const r = await grade(page(`<header style="height:960px"><h1>Calm, every day</h1></header>${PLANS}`), FOLD);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  assert.match(r.evidence, /found=3 \(min 2\); outside=3 \(max 0\)/);
});

test('render optionsAboveFold: plans in the first screen pass', async (t) => {
  const r = await grade(page(`<header style="height:120px"><h1>Pricing</h1></header>${PLANS}`), FOLD);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, true, r.evidence);
  assert.match(r.evidence, /found=3 \(min 2\); outside=0 \(max 0\)/);
});

test('render optionsAboveFold: a page with no priced options fails instead of passing empty', async (t) => {
  const r = await grade(page('<h1>About us</h1><button>Contact</button>'), FOLD);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  assert.match(r.evidence, /found=0 \(min 2\)/);
});

const SWITCH = { probe: 'switchLatency', expect: { pricesChangedMs: { max: 50 }, motionMs: { max: 250 } } };
const switchPage = (update, extraCss = '') => page(
  '<div class="seg"><button aria-pressed="true" data-p="m">Monthly</button><button aria-pressed="false" data-p="y">Yearly</button><i class="thumb"></i></div>' +
  '<p class="price">$12/mo</p><p class="price">$20/mo</p>' +
  `<script>
    const prices = { m: ['$12/mo', '$20/mo'], y: ['$9/mo', '$15/mo'] };
    const apply = (p) => document.querySelectorAll('.price').forEach((el, i) => { el.textContent = prices[p][i]; });
    document.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      document.querySelector('.seg').classList.toggle('yearly', b.dataset.p === 'y');
      ${update}
    }));
  </script>`,
  `.seg{position:relative;display:inline-flex} .thumb{position:absolute;left:0;width:80px;height:4px;background:#999;transition:transform 180ms ease} .seg.yearly .thumb{transform:translateX(80px)} ${extraCss}`);

test('render switchLatency: same-frame prices and a 180 ms indicator pass', async (t) => {
  const r = await grade(switchPage("apply(b.dataset.p);"), SWITCH);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, true, r.evidence);
  assert.match(r.evidence, /pricesChangedMs=0 \(max 50\)/);
  assert.match(r.evidence, /Yearly/);
});

test('render switchLatency: prices that wait 300 ms are not instant', async (t) => {
  const r = await grade(switchPage("setTimeout(() => apply(b.dataset.p), 300);"), SWITCH);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  const ms = Number(/pricesChangedMs=(\d+)/.exec(r.evidence)?.[1]);
  assert.ok(ms >= 250 && ms <= 600, r.evidence);
});

test('render switchLatency: a 600 ms transition after the click is too long', async (t) => {
  const r = await grade(switchPage("apply(b.dataset.p); document.body.classList.toggle('swap');",
    '.price{transition:opacity 600ms linear} body.swap .price{opacity:.5}'), SWITCH);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  const ms = Number(/motionMs=(\d+)/.exec(r.evidence)?.[1]);
  assert.ok(ms >= 500 && ms <= 900, r.evidence);
});

test('render switchLatency: a page with no billing period control fails and says so', async (t) => {
  const r = await grade(page('<p class="price">$9/mo</p><button>Buy</button>'), SWITCH);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  assert.match(r.evidence, /no monthly\/yearly control found/);
});

const revealPage = (hidden) => page(
  [1, 2, 3, 4].map((i) => `<section class="reveal" style="height:700px;margin:40px;background:#eee"><h2>Section ${i}</h2></section>`).join('') +
  `<script>
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }));
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  </script>`,
  `.reveal{opacity:0;transform:${hidden};transition:transform 600ms ease,opacity 600ms ease} .reveal.in{opacity:1;transform:none}`);
const SIDE = { probe: 'horizontalEntrances', expect: { maxShiftPx: { max: 24 } } };

test('render horizontalEntrances: sections that slide in from the side fail', async (t) => {
  const r = await grade(revealPage('translateX(-80px)'), SIDE);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, false, r.evidence);
  const px = Number(/maxShiftPx=(\d+)/.exec(r.evidence)?.[1]);
  assert.ok(px >= 40, r.evidence);
});

test('render horizontalEntrances: sections that rise into place pass', async (t) => {
  const r = await grade(revealPage('translateY(16px)'), SIDE);
  if (!r) return t.skip('no working browser');
  assert.equal(r.passed, true, r.evidence);
});

test('render checks fail closed without a page or without a browser', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-render-'));
  try {
    fs.writeFileSync(path.join(dir, 'response.md'), 'No page here.');
    const check = { probe: 'filledActions', expect: { filled: { max: 1 } } };
    const [noPage] = await gradeOutputs(renderCase(check), dir, { unavailable: 'unused' });
    assert.equal(noPage.passed, false);
    assert.match(noPage.evidence, /no HTML output/);

    fs.writeFileSync(path.join(dir, 'page.html'), page('<button>Go</button>'));
    const [noBrowser] = await gradeOutputs(renderCase(check), dir, { unavailable: 'no browser found; pass --chrome' });
    assert.equal(noBrowser.passed, false);
    assert.match(noBrowser.evidence, /render unavailable: no browser found/);

    const mixed = { id: 'fixture', assertions: [
      { id: 'text', text: 'text', check: { type: 'regex', pattern: 'No page here' } },
      { id: 'render', text: 'render', check: { type: 'render', ...check } },
    ] };
    // Text checks still grade, in assertion order, when render checks cannot run.
    const results = await gradeOutputs(mixed, dir, { unavailable: 'x' });
    assert.deepEqual(results.map((x) => [x.id, x.passed]), [['text', true], ['render', false]]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('render checks are validated when the eval pack is read', () => {
  const pack = (check) => ({ cases: [{ id: 'c', prompt: 'p', assertions: [{ id: 'a', check: { type: 'render', ...check } }] }] });
  assert.throws(() => validateEvals(pack({ probe: 'nope', expect: { x: { max: 1 } } })), /unknown probe "nope"/);
  assert.throws(() => validateEvals(pack({ probe: 'filledActions', expect: { colours: { max: 1 } } })), /filledActions has no metric "colours"/);
  assert.throws(() => validateEvals(pack({ probe: 'filledActions', expect: { filled: { most: 1 } } })), /needs a numeric min or max/);
  assert.throws(() => validateEvals(pack({ probe: 'filledActions', viewport: 'wide', expect: { filled: { max: 1 } } })), /viewport must look like 1440x900/);
  assert.doesNotThrow(() => validateEvals(pack({ probe: 'filledActions', expect: { filled: { max: 1 } } })));
});
