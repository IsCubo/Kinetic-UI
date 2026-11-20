// Tests for the shipped frame capture tool, exercised through its CLI.
// Browser-backed tests skip when no working Chrome or Chromium is available.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURE = path.join(ROOT, 'skills', 'kinetic-ui', 'assets', 'snippets', 'capture-frames.mjs');
const NO_BROWSER = /no browser found|browser exited with code|browser printed no DevTools endpoint/;

function capture(args, timeout = 60000) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [CAPTURE, ...args], { encoding: 'utf8', timeout });
  return {
    code: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    ms: Date.now() - started,
    pid: result.pid,
  };
}

function withTemp(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-capture-'));
  try {
    return fn(base);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

const svg = (fill) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="${fill}"/></svg>`,
  )}`;

function writePage(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(
    file,
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><title>fixture</title></head>' +
      `<body style="margin:0">${body}</body></html>`,
  );
  return file;
}

function readManifest(outDir) {
  return JSON.parse(fs.readFileSync(path.join(outDir, 'frames.json'), 'utf8'));
}

test('a plain page still writes one frame per step at both default viewports', (t) => {
  withTemp((dir) => {
    const page = writePage(dir, 'plain.html',
      `<h1>Plain</h1><img src="${svg('#353')}" alt="" width="320" height="180"><div style="height:1200px"></div>`);
    const out = path.join(dir, 'frames');
    const r = capture(['--out', out, '--url', page, '--steps', '0,1', '--settle', '50']);
    if (NO_BROWSER.test(r.out)) return t.skip('no working browser');

    assert.equal(r.code, 0, r.out);
    assert.match(r.stdout, /Wrote 4 frames/);
    for (const file of ['plain-360x800-000.png', 'plain-360x800-100.png', 'plain-1440x900-000.png', 'plain-1440x900-100.png']) {
      assert.ok(fs.existsSync(path.join(out, file)), `missing ${file}`);
    }
    const manifest = readManifest(out);
    assert.deepEqual(manifest.captures.map((c) => [c.viewport, c.frames.length, c.failure ?? null]),
      [['360x800', 2, null], ['1440x900', 2, null]]);
    assert.equal(manifest.captures[0].viewportMeta, 'width=device-width, initial-scale=1');
  });
});

test('a lazy image far below the fold does not stall the capture', (t) => {
  withTemp((dir) => {
    const page = writePage(dir, 'lazy.html',
      `<img src="${svg('#335')}" alt="" width="320" height="180">` +
      '<div style="height:8000px"></div>' +
      `<img src="${svg('#533')}" alt="" loading="lazy" width="320" height="180">`);
    const out = path.join(dir, 'frames');
    const r = capture(['--out', out, '--url', page, '--viewport', '360x800', '--steps', '0', '--settle', '50']);
    if (NO_BROWSER.test(r.out)) return t.skip('no working browser');

    assert.equal(r.code, 0, `exit ${r.code} after ${r.ms} ms\n${r.out}`);
    assert.match(r.stdout, /Wrote 1 frames/);
    assert.ok(fs.existsSync(path.join(out, 'lazy-360x800-000.png')));
    const [entry] = readManifest(out).captures;
    assert.equal(entry.frames.length, 1);
    assert.equal(entry.failure, undefined);
  });
});

test('a page that stops answering fails its capture with a clear message instead of hanging', (t) => {
  withTemp((dir) => {
    const page = writePage(dir, 'busy.html',
      '<p>busy</p><script>addEventListener("load", () => setTimeout(() => { for (;;) {} }, 0));</script>');
    const out = path.join(dir, 'frames');
    const r = capture(['--out', out, '--url', page, '--viewport', '360x800', '--steps', '0', '--settle', '50',
      '--timeout', '3000'], 45000);
    if (NO_BROWSER.test(r.out)) return t.skip('no working browser');

    assert.equal(r.code, 1, `exit ${r.code} after ${r.ms} ms\n${r.out}`);
    assert.match(r.stderr, /FAILED busy 360x800: .+ did not answer within 3000 ms/);
    assert.match(r.stdout, /Wrote 0 frames/);
    const [entry] = readManifest(out).captures;
    assert.match(entry.failure, /did not answer within 3000 ms/);
    if (process.platform !== 'win32') {
      assert.equal(chromeProcesses(r.pid), 0, 'Chrome outlived the run');
      assert.equal(fs.existsSync(profileOf(r.pid)), false, 'the Chrome profile was left behind');
    }
  });
});

test('a frozen page does not fail the captures that come after it', (t) => {
  withTemp((dir) => {
    const busy = writePage(dir, 'busy.html',
      '<p>busy</p><script>addEventListener("load", () => setTimeout(() => { for (;;) {} }, 0));</script>');
    const plain = writePage(dir, 'plain.html', `<h1>Plain</h1><img src="${svg('#353')}" alt="" width="320" height="180">`);
    const out = path.join(dir, 'frames');
    const r = capture(['--out', out, '--url', busy, '--url', plain, '--viewport', '360x800', '--steps', '0',
      '--settle', '50', '--timeout', '3000'], 60000);
    if (NO_BROWSER.test(r.out)) return t.skip('no working browser');

    assert.equal(r.code, 1, `exit ${r.code} after ${r.ms} ms\n${r.out}`);
    assert.match(r.stderr, /FAILED busy 360x800: .+ did not answer within 3000 ms/);
    assert.doesNotMatch(r.stderr, /FAILED plain/);
    assert.match(r.stdout, /plain\s+360x800\s+1 frames/);
    assert.match(r.stdout, /Wrote 1 frames/);
    assert.ok(fs.existsSync(path.join(out, 'plain-360x800-000.png')));
    const [first, second] = readManifest(out).captures;
    assert.match(first.failure, /did not answer within 3000 ms/);
    assert.equal(second.failure, undefined);
    assert.equal(second.frames.length, 1);
  });
});

test('errors from a frozen page stay in its own capture entry', (t) => {
  withTemp((dir) => {
    const frozen = writePage(dir, 'frozen.html',
      '<script>console.error("before-freeze"); addEventListener("load", () => setTimeout(() => { for (;;) {} }, 0));</script>');
    const healthy = writePage(dir, 'healthy.html', '<h1>ok</h1>');
    const out = path.join(dir, 'frames');
    const r = capture(['--out', out, '--url', frozen, '--url', healthy, '--viewport', '360x800', '--steps', '0',
      '--settle', '50', '--timeout', '3000'], 60000);
    if (NO_BROWSER.test(r.out)) return t.skip('no working browser');

    assert.equal(r.code, 1, `exit ${r.code} after ${r.ms} ms\n${r.out}`);
    const [first, second] = readManifest(out).captures;
    assert.ok(first.errors.some((e) => e.text === 'before-freeze'), JSON.stringify(first.errors));
    assert.deepEqual(second.errors, []);
    assert.equal(second.frames.length, 1);
  });
});

// The capture names its Chrome profile after its own pid; count the browser processes using it.
function chromeProcesses(pid) {
  const ps = spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' });
  return ps.stdout.split('\n').filter((line) => line.includes(`user-data-dir=${path.join(os.tmpdir(), `kui-capture-${pid}`)}`)).length;
}

const profileOf = (pid) => path.join(os.tmpdir(), `kui-capture-${pid}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(100);
  }
  return check();
}

test('an interrupted capture stops Chrome and removes its profile', { skip: process.platform === 'win32' && 'uses ps' }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-capture-'));
  try {
    const busy = writePage(dir, 'busy.html',
      '<p>busy</p><script>addEventListener("load", () => setTimeout(() => { for (;;) {} }, 0));</script>');
    const child = spawn(process.execPath, [CAPTURE, '--out', path.join(dir, 'frames'), '--url', busy,
      '--viewport', '360x800', '--steps', '0', '--settle', '50'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));

    const started = await waitUntil(() => chromeProcesses(child.pid) > 0 || child.exitCode !== null, 20000);
    if (NO_BROWSER.test(out)) return t.skip('no working browser');
    assert.ok(started && chromeProcesses(child.pid) > 0, `Chrome never started\n${out}`);
    await sleep(1000);

    child.kill('SIGTERM');
    const { code } = await exited;
    assert.equal(code, 143, `exit ${code}\n${out}`);
    assert.ok(await waitUntil(() => chromeProcesses(child.pid) === 0, 5000),
      `${chromeProcesses(child.pid)} Chrome processes outlived the capture`);
    assert.equal(fs.existsSync(profileOf(child.pid)), false, 'the Chrome profile was left behind');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing page stops Chrome and removes its profile after the pages before it', { skip: process.platform === 'win32' && 'uses ps' }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-capture-'));
  try {
    const ok = writePage(dir, 'ok.html', '<h1>ok</h1>');
    const result = spawnSync(process.execPath, [CAPTURE, '--out', path.join(dir, 'frames'), '--url', ok,
      '--url', path.join(dir, 'missing.html'), '--viewport', '360x800', '--steps', '0', '--settle', '50'],
    { encoding: 'utf8', timeout: 60000 });
    const out = `${result.stdout}${result.stderr}`;
    if (NO_BROWSER.test(out)) return t.skip('no working browser');

    assert.equal(result.status, 2, out);
    assert.match(result.stderr, /page not found: .*missing\.html/);
    assert.match(result.stdout, /ok\s+360x800\s+1 frames/);
    assert.ok(await waitUntil(() => chromeProcesses(result.pid) === 0, 5000),
      `${chromeProcesses(result.pid)} Chrome processes outlived the capture`);
    assert.equal(fs.existsSync(profileOf(result.pid)), false, 'the Chrome profile was left behind');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('withBrowser loads a page, evaluates in it, and leaves nothing behind', async (t) => {
  const { withBrowser } = await import(pathToFileURL(CAPTURE).href);
  assert.equal(typeof withBrowser, 'function', 'withBrowser is not exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-ui-capture-'));
  const listeners = () => ['SIGINT', 'SIGTERM', 'SIGHUP', 'exit'].map((e) => process.listenerCount(e));
  const before = listeners();
  try {
    const page = writePage(dir, 'probe.html', '<h1 id="h">Hello</h1><script>console.error("page-said")</script>');
    let result;
    try {
      result = await withBrowser(async (browser) => {
        await browser.load(pathToFileURL(page).href, { width: 1440, height: 900 });
        const thrown = await browser.evaluate('(() => { throw new Error("probe-broke"); })()').then(() => 'resolved', (e) => e.message);
        return {
          title: await browser.evaluate('document.querySelector("#h").textContent'),
          width: await browser.evaluate('innerWidth'),
          later: await browser.evaluate('new Promise((r) => setTimeout(() => r(42), 20))'),
          thrown,
          errors: browser.errors.map((e) => e.text),
        };
      }, { timeout: 10000 });
    } catch (error) {
      if (NO_BROWSER.test(error.message)) return t.skip('no working browser');
      throw error;
    }
    assert.equal(result.title, 'Hello');
    assert.equal(result.width, 1440);
    assert.equal(result.later, 42);
    assert.match(result.thrown, /probe-broke/);
    assert.deepEqual(result.errors, ['page-said']);
    assert.deepEqual(listeners(), before, 'withBrowser left process listeners behind');
    if (process.platform !== 'win32') {
      assert.equal(chromeProcesses(process.pid), 0, 'Chrome outlived withBrowser');
      assert.equal(fs.existsSync(profileOf(process.pid)), false, 'the Chrome profile was left behind');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--timeout rejects values that are not a positive number of ms', () => {
  for (const bad of ['0', '-5', 'soon']) {
    const r = capture(['--out', 'unused', '--url', 'unused.html', '--timeout', bad]);
    assert.equal(r.code, 2, `--timeout ${bad}: ${r.out}`);
    assert.match(r.stderr, /--timeout must be a positive number of ms/);
  }
});
