// Tests for the shipped frame capture tool, exercised through its CLI.
// Browser-backed tests skip when no working Chrome or Chromium is available.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  });
});

test('--timeout rejects values that are not a positive number of ms', () => {
  for (const bad of ['0', '-5', 'soon']) {
    const r = capture(['--out', 'unused', '--url', 'unused.html', '--timeout', bad]);
    assert.equal(r.code, 2, `--timeout ${bad}: ${r.out}`);
    assert.match(r.stderr, /--timeout must be a positive number of ms/);
  }
});
