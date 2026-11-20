// Keywords: frame capture, screenshots, render check, visual verification, devtools protocol, scroll frames, reduced motion capture, composition check, blank frame, capturas, verificación visual
// Summary: Renders a local page and saves PNG frames at chosen scroll fractions with a frames.json holding the scroll position, --kui-* values, viewport meta and page errors, so a build can be looked at instead of described.
//
// Usage (copy into the project, Node 22+; no npm dependency):
//   node capture-frames.mjs --out frames/ --url page.html
//   node capture-frames.mjs --out frames/ --url demo.html --viewport 360x800 \
//     --steps 0,0.25,0.5,0.75,1 --reduced-motion
//
// Needs a Chrome or Chromium binary: pass --chrome, set CHROME_PATH, or let it search
// the usual install locations. Exit codes: 0 frames written, 1 a capture failed, 2 usage.
// Interrupting the run (Ctrl-C) stops Chrome and removes its temporary profile.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const USAGE = `Usage: node scripts/capture-frames.mjs --out <dir> --url <page> [options]

  --out <dir>          Where PNG frames and frames.json go (required)
  --url <page>         Local page path or URL; repeat for several pages
  --chrome <path>      Browser binary; default CHROME_PATH or an auto-detected install
  --viewport <WxH>     Repeatable; default 360x800 and 1440x900
  --steps <csv>        Scroll fractions 0..1; default 0,0.25,0.5,0.75,1
  --settle <ms>        Wait after each scroll before the shot; default 400
  --timeout <ms>       Longest wait for one browser call before that capture fails; default 30000
  --reduced-motion     Also capture a prefers-reduced-motion: reduce pass
  --name <prefix>      File prefix; default the page file name without extension`;

const EXIT_USAGE = 2;
const EXIT_FAILED = 1;

/** Parse argv into the option bag this script understands. */
function parseArgs(argv) {
  const opts = { urls: [], viewports: [], steps: null, settle: 400, timeout: 30000, reducedMotion: false };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) fail(`${flag} needs a value`);
      return next;
    };
    if (flag === '--out') opts.out = value();
    else if (flag === '--url') opts.urls.push(value());
    else if (flag === '--chrome') opts.chrome = value();
    else if (flag === '--name') opts.name = value();
    else if (flag === '--viewport') opts.viewports.push(...value().split(',').map(parseViewport));
    else if (flag === '--steps') opts.steps = value().split(',').map(Number);
    else if (flag === '--settle') opts.settle = Number(value());
    else if (flag === '--timeout') opts.timeout = Number(value());
    else if (flag === '--reduced-motion') opts.reducedMotion = true;
    else if (flag === '--help' || flag === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else fail(`unknown option ${flag}`);
  }
  if (!opts.out) fail('--out is required');
  if (!opts.urls.length) fail('--url is required');
  if (!opts.viewports.length) opts.viewports = [parseViewport('360x800'), parseViewport('1440x900')];
  if (!opts.steps) opts.steps = [0, 0.25, 0.5, 0.75, 1];
  for (const step of opts.steps) {
    if (!Number.isFinite(step) || step < 0 || step > 1) fail(`--steps values must be 0..1, got ${step}`);
  }
  if (!Number.isFinite(opts.settle) || opts.settle < 0) fail('--settle must be a positive number of ms');
  if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) fail('--timeout must be a positive number of ms');
  return opts;
}

function fail(message) {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(EXIT_USAGE);
}

function parseViewport(text) {
  const m = /^(\d+)x(\d+)$/.exec(text.trim());
  if (!m) fail(`--viewport must look like 360x800, got ${text}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

/** Find a browser binary: explicit flag, env var, then the usual install locations; null if none. */
function findChrome(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
    const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
    if (fs.existsSync(cache)) {
      for (const dir of fs.readdirSync(cache)) {
        if (!dir.startsWith('chromium')) continue;
        const base = path.join(cache, dir);
        for (const sub of ['chrome-linux64/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome']) {
          candidates.push(path.join(base, sub));
        }
      }
    }
  }
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

const NO_BROWSER = 'no browser found; pass --chrome <path> or set CHROME_PATH';

function resolveChrome(explicit) {
  const found = findChrome(explicit);
  if (!found) fail(NO_BROWSER);
  return found;
}

/** Resolve one --url value into what Chrome should navigate to. */
function resolveUrl(raw) {
  if (/^[a-z]+:/i.test(raw)) return { url: raw, name: path.basename(new URL(raw).pathname) || 'page' };
  const abs = path.resolve(raw);
  if (!fs.existsSync(abs)) fail(`page not found: ${raw}`);
  return { url: pathToFileURL(abs).href, name: path.basename(abs, path.extname(abs)) };
}

/**
 * Open a WebSocket and give back a request/response helper plus the events it saw.
 * Each call rejects after timeoutMs, so a page that stops answering fails its capture
 * instead of stalling every capture after it.
 */
async function connect(wsUrl, timeoutMs) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('could not open the DevTools socket')), { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result ?? {});
      return;
    }
    for (const fn of listeners.get(msg.method) ?? []) fn(msg.params ?? {}, msg.sessionId);
  });
  return {
    send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} did not answer within ${timeoutMs} ms`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
    on(method, fn) {
      listeners.set(method, [...(listeners.get(method) ?? []), fn]);
    },
    waitFor(method, sessionId, timeoutMs = 20000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
        const fn = (params, sid) => {
          if (sid !== sessionId) return;
          clearTimeout(timer);
          listeners.set(method, (listeners.get(method) ?? []).filter((f) => f !== fn));
          resolve(params);
        };
        listeners.set(method, [...(listeners.get(method) ?? []), fn]);
      });
    },
    close: () => ws.close(),
  };
}

const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];

/**
 * Remove Chrome's profile. Its child processes can still write into it for a moment after
 * the browser exits, and rmSync's own retries only retry the final rmdir, so one late write
 * leaves the folder for good: repeat the whole removal, every 200 ms for up to 5 s.
 */
function removeProfile(profileDir) {
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
  // Still held (Windows can lock it): leave it for the OS temp cleaner.
}

/**
 * Stop Chrome and drop its profile if the run ends early. A signal or a process.exit()
 * skips `finally`, so without this guard Chrome and its profile outlive the run.
 */
function guard(child, profileDir) {
  const release = () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    removeProfile(profileDir);
  };
  const onSignal = (signal) => {
    release();
    process.exit(128 + os.constants.signals[signal]);
  };
  process.on('exit', release);
  for (const signal of SIGNALS) process.on(signal, onSignal);
  return {
    release,
    dispose() {
      process.off('exit', release);
      for (const signal of SIGNALS) process.off(signal, onSignal);
    },
  };
}

/** Launch the browser and return it with the DevTools endpoint it printed. */
async function launch(chrome, profileDir) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    '--force-color-profile=srgb',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ];
  if (process.getuid?.() === 0) args.unshift('--no-sandbox');
  const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const guarded = guard(child, profileDir);
  const endpoint = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error(`browser printed no DevTools endpoint\n${buffer}`)), 20000);
    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      const tail = buffer.trim().split('\n').slice(-3).join('\n');
      reject(new Error(
        `browser exited with code ${code} before it was ready` +
        `${tail ? `:\n${tail}` : ''}\n` +
        'If the loader complains about shared libraries, install them or point --chrome at a working browser.',
      ));
    });
  }).catch((cause) => {
    guarded.release();
    guarded.dispose();
    throw cause;
  });
  return { child, endpoint, guarded };
}

/** Read the page state a reviewer needs next to the pixels. */
const READ_STATE = `(() => {
  const cs = getComputedStyle(document.documentElement);
  const vars = {};
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (name.startsWith('--kui-')) vars[name] = cs.getPropertyValue(name).trim();
  }
  return {
    scrollY: Math.round(window.scrollY),
    max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    vars,
  };
})()`;

/** Scroll to a fraction of the page and let two frames land so scroll-linked work settles. */
const scrollTo = (step) => `(async () => {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo(0, Math.round(max * ${step}));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
})()`;

/**
 * Wait for fonts and decoded images, so a frame is not captured mid-swap. A lazy image
 * outside the load distance never starts loading, so its decode() never settles: skip
 * those, and bound both waits so one stuck promise cannot stall the capture.
 */
const ready = (boundMs) => `(async () => {
  const within = (p) => Promise.race([p, new Promise((r) => setTimeout(r, ${boundMs}))]);
  await within(document.fonts.ready);
  const started = [...document.images].filter((img) => img.complete || img.loading !== 'lazy');
  await within(Promise.allSettled(started.map((img) => img.decode())));
  return true;
})()`;

const padPct = (step) => String(Math.round(step * 100)).padStart(3, '0');

/** Open a blank tab, attach to it, and enable the domains a capture reads. */
async function openTab(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);
  return { targetId, sessionId };
}

/**
 * Run `fn` with one headless browser, then close it, with the same launch, per-call timeout
 * and cleanup as a capture run. Resolves to what `fn` returns. The browser `fn` receives:
 *   load(url, { width, height }, { reducedMotion, settle })  navigate; wait for fonts and images
 *   evaluate(expression)  the value of an expression or promise; rejects if the page throws
 *   screenshot()          a PNG Buffer of the viewport
 *   replaceTab()          a fresh tab, after a page stopped answering and wedged this one
 *   errors                what the page complained about; assign a new array to start over
 */
export async function withBrowser(fn, { chrome, timeout = 30000 } = {}) {
  const binary = chrome ?? findChrome();
  if (!binary) throw new Error(NO_BROWSER);
  const profileDir = path.join(os.tmpdir(), `kui-capture-${process.pid}`);
  const { child, endpoint, guarded } = await launch(binary, profileDir);
  let cdp;

  try {
    cdp = await connect(endpoint, timeout);
    let tab = await openTab(cdp);
    const browser = {
      errors: [],
      async load(url, viewport, { reducedMotion = false, settle = 0 } = {}) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: false,
        }, tab.sessionId);
        await cdp.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
        }, tab.sessionId);
        const loaded = cdp.waitFor('Page.loadEventFired', tab.sessionId);
        await cdp.send('Page.navigate', { url }, tab.sessionId);
        await loaded;
        await cdp.send('Runtime.evaluate', {
          expression: ready(Math.min(5000, Math.floor(timeout / 2))),
          awaitPromise: true,
        }, tab.sessionId);
        await new Promise((r) => setTimeout(r, settle));
      },
      // strict: false keeps a capture going when the page throws inside a read.
      async evaluate(expression, { strict = true } = {}) {
        const response = await cdp.send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        }, tab.sessionId);
        const thrown = response.exceptionDetails;
        if (strict && thrown) throw new Error(`page threw: ${thrown.exception?.description ?? thrown.text}`);
        return response.result?.value;
      },
      async screenshot() {
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: false,
        }, tab.sessionId);
        return Buffer.from(shot.data, 'base64');
      },
      async replaceTab() {
        await cdp.send('Target.closeTarget', { targetId: tab.targetId }).catch(() => {});
        tab = await openTab(cdp);
      },
    };

    // Everything the page complained about, newest last. Recorded, never fatal.
    cdp.on('Runtime.exceptionThrown', (params) => {
      const detail = params.exceptionDetails;
      browser.errors.push({ type: 'exception', text: detail?.exception?.description ?? detail?.text ?? 'unknown' });
    });
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error' && params.type !== 'warning') return;
      const text = (params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ');
      browser.errors.push({ type: params.type, text });
    });
    cdp.on('Log.entryAdded', (params) => {
      if (params.entry?.level !== 'error') return;
      browser.errors.push({ type: 'log', text: params.entry.text });
    });

    return await fn(browser);
  } finally {
    cdp?.close();
    child.kill();
    const exited = await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve(true);
      const timer = setTimeout(() => resolve(false), 3000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    // A Chrome that ignores the polite stop for 3 s is stopped hard, so it never outlives the run.
    if (!exited) child.kill('SIGKILL');
    guarded.dispose();
    removeProfile(profileDir);
  }
}

async function captureAll(opts, chrome) {
  const outDir = path.resolve(opts.out);
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), chrome, steps: opts.steps, captures: [] };
  let failures = 0;

  await withBrowser(async (browser) => {
    for (const raw of opts.urls) {
      const page = resolveUrl(raw);
      const prefix = opts.name ? path.basename(opts.name, path.extname(opts.name)) : page.name;
      for (const viewport of opts.viewports) {
        const passes = opts.reducedMotion ? [false, true] : [false];
        for (const reduced of passes) {
          const label = `${viewport.width}x${viewport.height}`;
          const entry = { url: page.url, viewport: label, reducedMotion: reduced, frames: [], errors: [] };
          browser.errors = entry.errors;
          const started = Date.now();
          try {
            await browser.load(page.url, viewport, { reducedMotion: reduced, settle: opts.settle });
            // A missing viewport meta is the page's defect, not the capture's: record it so
            // the reviewer knows the layout below is not what a phone would show.
            entry.viewportMeta = await browser.evaluate(
              'document.querySelector("meta[name=viewport]")?.content ?? null',
              { strict: false },
            );

            for (const step of opts.steps) {
              await browser.evaluate(scrollTo(step), { strict: false });
              await new Promise((r) => setTimeout(r, opts.settle));
              const state = await browser.evaluate(READ_STATE, { strict: false });
              const shot = await browser.screenshot();
              const file = `${prefix}-${label}-${padPct(step)}${reduced ? '-rm' : ''}.png`;
              fs.writeFileSync(path.join(outDir, file), shot);
              entry.frames.push({ file, step, ...state });
            }
            console.log(`${file_line(prefix, label, reduced)} ${entry.frames.length} frames, ${Date.now() - started} ms`);
          } catch (cause) {
            failures += 1;
            entry.failure = cause.message;
            console.error(`FAILED ${prefix} ${label}${reduced ? ' (reduced motion)' : ''}: ${cause.message}`);
            // A page that stopped answering keeps its tab wedged, and the next capture would
            // fail in it too: give the next capture a fresh one.
            await browser.replaceTab();
          }
          manifest.captures.push(entry);
        }
      }
    }
  }, { chrome, timeout: opts.timeout });

  fs.writeFileSync(path.join(outDir, 'frames.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${manifest.captures.reduce((n, c) => n + c.frames.length, 0)} frames to ${outDir}`);
  return failures;
}

function file_line(prefix, label, reduced) {
  return `${prefix.padEnd(24)} ${label.padEnd(10)}${reduced ? ' reduce-motion' : '              '}`;
}

/** Run the capture from a CLI entry point. Resolves to the number of failed captures. */
export async function run(argv = process.argv) {
  const options = parseArgs(argv);
  const chrome = resolveChrome(options.chrome);
  return captureAll(options, chrome);
}

// Run only when this file is the entry point, so a host script can import `run` instead.
const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  run()
    .then((failures) => process.exit(failures ? EXIT_FAILED : 0))
    .catch((cause) => {
      console.error(cause.stack ?? cause.message);
      process.exit(EXIT_FAILED);
    });
}
