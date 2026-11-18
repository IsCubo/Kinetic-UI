// Keywords: scroll depth, z-axis travel, scroll progress, --kui-z-p, custom property, IntersectionObserver, requestAnimationFrame, sticky stage, motion tier, prefers-reduced-motion, dispose
// Summary: Framework-agnostic ESM controller that writes scroll progress (0..1) to --kui-z-p on a stage element while it is visible, honours the motion tier and reduced motion, and cleans up fully on dispose.
//
// Usage (use it where CSS scroll timelines are unsupported; see references/effects/scroll-depth.md):
//   import { applyMotionTier } from '../snippets/motion-tier.js';   // sets <html data-motion-tier="0..3">
//   import { createScrollDepth } from './scroll-depth.js';
//   applyMotionTier();
//   const depth = createScrollDepth(document.querySelector('.kui-zdepth'));
//   if (!CSS.supports('animation-timeline: view()')) depth.start();  // one writer per stage: CSS or this
//   depth.dispose();                                                 // on route change or unmount
//
// The only DOM write is stage.style.setProperty('--kui-z-p', value). All choreography stays in CSS.
// Work runs only at motion tier 2 or 3 (an unset tier counts as not allowed) and only without
// prefers-reduced-motion: reduce. Any other state is a no-op that holds no observer, listener or frame.

const PROP = '--kui-z-p';
const TIER_EVENT = 'kui:motiontierchange';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Creates a controller for one stage. Nothing happens until start().
 * @param {HTMLElement} stage The tall element that owns --kui-z-p (the sticky track is its child).
 * @param {{ length?: number }} [options]
 *   length: pinned scroll distance in px, i.e. stage height minus the pinned track height.
 *   Default: measured every frame as stage height minus window.innerHeight. Pass it when the track
 *   height is not 100vh or when mobile toolbars resizing the viewport make the measured value drift.
 * @returns {{ start: () => void, stop: () => void, dispose: () => void }}
 *   start/stop are idempotent. stop() freezes the last value; dispose() also clears the property.
 */
export function createScrollDepth(stage, { length } = {}) {
  const noop = () => {};
  if (typeof document === 'undefined' || !stage) return { start: noop, stop: noop, dispose: noop };

  const root = document.documentElement;
  const reduced = window.matchMedia(REDUCED_QUERY);
  let started = false;
  let disposed = false;
  let observer = null;
  let visible = false;
  let frame = 0;
  let last = '';

  const allowed = () => !reduced.matches && Number(root.dataset.motionTier) >= 2;

  function progress() {
    const rect = stage.getBoundingClientRect();
    const span = length > 0 ? length : rect.height - window.innerHeight;
    if (!(span > 0)) return 0;
    return Math.min(1, Math.max(0, -rect.top / span));
  }

  function write() {
    const value = String(Math.round(progress() * 1000) / 1000); // 3 decimals: no pointless style churn
    if (value === last) return;
    last = value;
    stage.style.setProperty(PROP, value);
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    write();
  }

  function sync() {
    if (visible && !frame) frame = requestAnimationFrame(tick);
    else if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function onIntersect(entries) {
    visible = entries[entries.length - 1].isIntersecting;
    if (!visible) write(); // settle on exactly 0 or 1 so re-entry starts from the right end
    sync();
  }

  function arm() {
    if (observer || typeof IntersectionObserver !== 'function') return;
    observer = new IntersectionObserver(onIntersect);
    observer.observe(stage);
  }

  function disarm(clear) {
    if (observer) observer.disconnect();
    observer = null;
    visible = false;
    sync();
    if (clear) {
      last = '';
      stage.style.removeProperty(PROP);
    }
  }

  // Tier or preference changed: re-evaluate. Leaving the allowed state clears the value,
  // because the CSS falls back to the static stack and must not see a stale progress.
  function refresh() {
    if (disposed || !started) return;
    if (allowed()) arm();
    else disarm(true);
  }

  function start() {
    if (disposed || started) return;
    started = true;
    reduced.addEventListener('change', refresh);
    document.addEventListener(TIER_EVENT, refresh);
    refresh();
  }

  function stop() {
    if (!started) return;
    started = false;
    reduced.removeEventListener('change', refresh);
    document.removeEventListener(TIER_EVENT, refresh);
    disarm(false);
  }

  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    last = '';
    stage.style.removeProperty(PROP);
  }

  return { start, stop, dispose };
}
