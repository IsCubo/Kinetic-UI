// Keywords: motion tier, device capability, low-end detection, reduced motion, save-data, deviceMemory, fps downgrade, progressive enhancement
// Summary: Detects the motion tier (T0–T3) from user preferences and device signals, exposes it as data-motion-tier, and downgrades once on sustained jank.
//
// Usage (ES module, framework-agnostic):
//   import { applyMotionTier, watchFrameRate } from './motion-tier.js';
//   const { tier } = applyMotionTier();            // sets <html data-motion-tier="0..3">
//   if (tier >= 3) import('./hero-3d.js');         // load heavy effects only when allowed
//   watchFrameRate();                              // call while the main animation runs
// Listen for changes: document.addEventListener('kui:motiontierchange', (e) => e.detail.tier)

const CAP_KEY = 'kui-motion-tier-cap';
const EVENT = 'kui:motiontierchange';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function readCap() {
  try {
    const raw = window.sessionStorage.getItem(CAP_KEY);
    const cap = raw === null ? 3 : Number(raw);
    return Number.isInteger(cap) && cap >= 0 && cap <= 3 ? cap : 3;
  } catch {
    return 3; // storage blocked (privacy mode): no persisted cap
  }
}

function writeCap(cap) {
  try {
    window.sessionStorage.setItem(CAP_KEY, String(cap));
  } catch {
    // ignore: the cap still applies for this page view
  }
}

function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // release the probe context immediately
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the highest motion tier the current user and device allow.
 * T0 reduced · T1 essential (CSS only) · T2 enhanced (JS motion) · T3 immersive (GPU/3D).
 * @param {{ maxTier?: 0|1|2|3 }} [options] maxTier caps the result (e.g. a design that never needs 3D).
 */
export function detectMotionTier({ maxTier = 3 } = {}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 1; // SSR: render the CSS tier
  if (window.matchMedia?.(REDUCED_QUERY).matches) return 0;

  let tier = 3;
  const saveData = navigator.connection?.saveData === true; // Chromium only
  const memory = navigator.deviceMemory; // GiB, Chromium only; undefined in Safari/Firefox
  const cores = navigator.hardwareConcurrency; // Safari clamps to 4 or 8, so only very low values are a signal

  if (saveData) tier = Math.min(tier, 1);
  if (typeof memory === 'number') {
    if (memory <= 2) tier = Math.min(tier, 1);
    else if (memory <= 4) tier = Math.min(tier, 2);
  }
  if (typeof cores === 'number' && cores <= 2) tier = Math.min(tier, 1);
  if (tier === 3 && !supportsWebGL2()) tier = 2;

  return Math.min(tier, maxTier, readCap());
}

function setTier(root, tier, reason) {
  const previous = root.dataset.motionTier;
  root.dataset.motionTier = String(tier);
  if (previous !== String(tier)) {
    root.dispatchEvent(new CustomEvent(EVENT, { bubbles: true, detail: { tier, previous: previous === undefined ? null : Number(previous), reason } }));
  }
}

/**
 * Writes the detected tier to `data-motion-tier` on `root` and keeps it in sync with the OS reduced-motion setting.
 * @returns {{ tier: number, dispose: () => void }}
 */
export function applyMotionTier({ root = document.documentElement, maxTier = 3 } = {}) {
  const tier = detectMotionTier({ maxTier });
  setTier(root, tier, 'detect');
  const mql = window.matchMedia?.(REDUCED_QUERY);
  const onChange = () => setTier(root, detectMotionTier({ maxTier }), 'reduced-motion-change');
  mql?.addEventListener?.('change', onChange);
  return { tier, dispose: () => mql?.removeEventListener?.('change', onChange) };
}

/**
 * Samples frame rate once while visible; if the average stays under `minFps`, lowers the tier by one
 * and persists that cap for the session. Bounded: one sample window per call, never loops.
 * @returns {Promise<{ fps: number, downgraded: boolean }>}
 */
export function watchFrameRate({ root = document.documentElement, sampleMs = 1000, minFps = 45 } = {}) {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined' || document.visibilityState !== 'visible') {
      resolve({ fps: NaN, downgraded: false });
      return;
    }
    let frames = 0;
    let start = 0;
    const step = (now) => {
      if (!start) start = now; // first callback anchors the window
      else frames += 1;
      if (now - start < sampleMs) {
        requestAnimationFrame(step);
        return;
      }
      const fps = (frames * 1000) / (now - start);
      const current = Number(root.dataset.motionTier ?? detectMotionTier());
      const downgraded = document.visibilityState === 'visible' && fps < minFps && current > 1;
      if (downgraded) {
        writeCap(current - 1);
        setTier(root, current - 1, 'low-fps');
      }
      resolve({ fps, downgraded });
    };
    requestAnimationFrame(step);
  });
}
