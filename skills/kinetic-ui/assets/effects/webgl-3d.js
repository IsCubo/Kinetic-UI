// Keywords: webgl mount helper, 3d scene lifecycle, lazy three.js, mount when visible, pause offscreen, visibilitychange, dispose, webglcontextlost, poster fallback, T3 gate, prefers-reduced-motion
// Summary: Framework-agnostic ESM helper that mounts a user-supplied 3D scene only at motion tier T3, after page load and while visible, pauses it offscreen or hidden, and disposes it safely.
//
// Usage (the scene module is the only place that imports three.js):
//   import { applyMotionTier } from './motion-tier.js';            // assets/snippets/motion-tier.js
//   import { mountSceneWhenAllowed } from './webgl-3d.js';
//   applyMotionTier();
//   const handle = mountSceneWhenAllowed(document.querySelector('.kui-scene'), async (canvas, { dpr, fail }) => {
//     const { createHeroScene } = await import('./hero-scene.js'); // lazy chunk, fetched only when allowed
//     return createHeroScene(canvas, { dpr, fail });                // must return { start, stop, dispose, resize? }
//   });
//   pauseButton.addEventListener('click', () => handle.pause());   // WCAG 2.2.2 for scenes that run longer than 5 s
//   handle.dispose();                                              // on route change or unmount
//
// The host gets data-kui-scene="idle|loading|running|paused|fallback". Keep the poster in the HTML and
// show the canvas only for "running" and "paused" (see references/effects/webgl-3d.md).
// Reduced motion is checked here on its own: the loader never imports the scene chunk, and therefore
// never fetches three.js, unless data-motion-tier allows T3 AND prefers-reduced-motion does not match.

const TIER_EVENT = 'kui:motiontierchange';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function readTier(root) {
  const tier = Number(root.dataset.motionTier);
  return Number.isInteger(tier) ? tier : -1; // unknown until applyMotionTier() runs: do not mount
}

function afterLoadAndIdle(callback) {
  const idle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(callback, { timeout: 2000 });
    else window.setTimeout(callback, 300);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

function isScene(value) {
  return Boolean(value) && ['start', 'stop', 'dispose'].every((key) => typeof value[key] === 'function');
}

/**
 * Mounts a 3D scene inside `host` only while the motion tier, visibility, and page state allow it.
 * @param {HTMLElement} host Element holding the poster and a <canvas> (one is appended if missing).
 * @param {(canvas: HTMLCanvasElement, context: { dpr: number, fail: (error?: unknown) => void }) => any} createScene
 *   Factory that returns (or resolves to) { start(), stop(), dispose(), resize?(width, height, dpr) }.
 *   Call `fail(error)` for unrecoverable problems (for example WebGPU device loss); the poster returns.
 * @param {{ root?: HTMLElement, minTier?: number, maxDpr?: number, rootMargin?: string, onError?: (error: unknown) => void }} [options]
 * @returns {{ pause(): void, resume(): void, dispose(): void, readonly state: string }}
 */
export function mountSceneWhenAllowed(host, createScene, options = {}) {
  if (typeof window === 'undefined' || !host) return { pause() {}, resume() {}, dispose() {}, state: 'idle' };

  const {
    root = document.documentElement,
    minTier = 3,
    maxDpr = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2,
    rootMargin = '200px 0px',
    onError = (error) => console.warn('[kinetic-ui] 3D scene unavailable; keeping the poster.', error),
  } = options;

  const canvas = host.querySelector('canvas') ?? host.appendChild(document.createElement('canvas'));
  let scene = null;
  let generation = 0; // bumps on every teardown so late-resolving scenes are discarded
  let loading = false;
  let ready = false;
  let inView = false;
  let running = false;
  let userPaused = false;
  let contextLost = false;
  let failed = false;
  let disposed = false;

  const dpr = () => Math.min(window.devicePixelRatio || 1, maxDpr);
  const reduced = () => Boolean(window.matchMedia?.(REDUCED_QUERY)?.matches); // independent of the tier attribute
  const allowed = () => ready && !failed && !disposed && !reduced() && readTier(root) >= minTier;

  function updateState() {
    let state = 'idle';
    if (failed || contextLost) state = 'fallback';
    else if (running) state = 'running';
    else if (scene) state = 'paused';
    else if (loading) state = 'loading';
    host.dataset.kuiScene = state;
  }

  function resize() {
    if (!scene?.resize) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width > 0 && height > 0) scene.resize(Math.round(width), Math.round(height), dpr());
  }

  function teardown() {
    generation += 1;
    loading = false;
    if (scene) {
      if (running) scene.stop();
      scene.dispose();
    }
    scene = null;
    running = false;
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    teardown();
    updateState();
    onError(error);
  }

  async function mount() {
    const id = ++generation;
    loading = true;
    updateState();
    try {
      const created = await createScene(canvas, { dpr: dpr(), fail: (error) => { if (id === generation) fail(error); } });
      if (id !== generation) {
        created?.dispose?.(); // torn down (tier drop, dispose) while loading
        return;
      }
      if (!isScene(created)) throw new TypeError('createScene must return { start, stop, dispose }');
      scene = created;
      loading = false;
      resize();
      sync();
    } catch (error) {
      if (id === generation) {
        loading = false;
        fail(error);
      }
    }
  }

  function sync() {
    if (!allowed()) {
      teardown();
    } else if (!scene) {
      if (inView && !loading) mount();
    } else {
      const shouldRun = inView && !userPaused && !contextLost && document.visibilityState === 'visible';
      if (shouldRun && !running) {
        scene.start();
        running = true;
      } else if (!shouldRun && running) {
        scene.stop();
        running = false;
      }
    }
    updateState();
  }

  const onContextLost = (event) => {
    event.preventDefault(); // allows the browser to restore the context
    contextLost = true;
    sync();
  };
  const onContextRestored = () => {
    contextLost = false;
    sync();
  };
  const onPageVisibility = () => sync();
  const onTierChange = () => sync();
  const onReducedChange = () => sync();

  const visibility = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    sync();
  }, { rootMargin });
  const sizing = new ResizeObserver(resize);
  const reducedQuery = window.matchMedia?.(REDUCED_QUERY);

  visibility.observe(host);
  sizing.observe(canvas);
  document.addEventListener('visibilitychange', onPageVisibility);
  root.addEventListener(TIER_EVENT, onTierChange);
  reducedQuery?.addEventListener?.('change', onReducedChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  updateState();
  afterLoadAndIdle(() => {
    if (disposed) return;
    ready = true;
    sync();
  });

  return {
    pause() {
      userPaused = true;
      sync();
    },
    resume() {
      userPaused = false;
      sync();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      teardown();
      visibility.disconnect();
      sizing.disconnect();
      document.removeEventListener('visibilitychange', onPageVisibility);
      root.removeEventListener(TIER_EVENT, onTierChange);
      reducedQuery?.removeEventListener?.('change', onReducedChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      updateState();
    },
    get state() {
      return host.dataset.kuiScene;
    },
  };
}
