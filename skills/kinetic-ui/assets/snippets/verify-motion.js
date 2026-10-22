// Keywords: verification, motion audit, console audit, reduced motion check, motion tier check, infinite animation, pause control, long animation, autoplay audio, will-change, CLS, accessible name, focusable, DevTools
// Summary: Browser audit that returns { summary, findings } for motion tier, reduced motion, looping or long animations, autoplay media, layout-shift and naming risks.
//
// HEURISTIC AUDIT of the loaded DOM and its computed styles. It is not a replacement for manual
// keyboard testing, a screen-reader pass, contrast sampling at the busiest frame, or frame-rate
// measurement on a real low-end device.
//
// Load it as a module (the `export` keyword makes it module-only, so a plain console paste fails):
//   <script type="module" src="/verify-motion.js"></script>
//   await import('/verify-motion.js')          // same-origin, from the DevTools console
// Then call window.kuiVerify(). It auto-runs once after load unless window.__kuiVerifyManual is true
// before loading. It never mutates the DOM and never throws.

const FADE_LIMIT_MS = 200; // longest motion tolerated while reduced motion is on
const LONG_ANIMATION_MS = 5000; // WCAG 2.2.2: autostarting motion past 5 s needs a pause control
const TIER_VALUES = new Set(['0', '1', '2', '3']);
const MAX_PER_RULE = 8; // cap repeats so an animation-heavy page stays readable
const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"])';

function styleOf(el) {
  try { return el ? getComputedStyle(el) : null; } catch { return null; }
}

function visible(el) {
  const s = styleOf(el);
  return !s || (s.display !== 'none' && s.visibility !== 'hidden');
}

function label(el) {
  if (!el || !el.tagName) return '(document)';
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
  return `${tag}${el.id ? `#${el.id}` : cls ? `.${cls}` : ''}`;
}

// Shallow naming check: it finds whether a name source exists, not whether the name is
// meaningful. A screen-reader pass in the accessibility tree confirms intent.
function hasAccessibleName(el) {
  if ((el.getAttribute('aria-label') || '').trim()) return true;
  if ((el.getAttribute('title') || '').trim()) return true;
  const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
  if (ids.some((id) => (document.getElementById(id)?.textContent || '').trim())) return true;
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  const imgAlt = el.querySelector('img[alt]');
  const hasText = Boolean(text) || Boolean(imgAlt && (imgAlt.getAttribute('alt') || '').trim()) || Boolean(el.querySelector('svg title, svg [aria-label]'));
  if (el.tagName.toLowerCase() !== 'input') return hasText;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  if (type === 'image') return Boolean((el.getAttribute('alt') || '').trim());
  if (type === 'submit' || type === 'reset' || type === 'button') return Boolean((el.value || '').trim());
  if (el.labels && el.labels.length > 0) return true; // <label for> or a wrapping label
  return false; // a placeholder alone is not an accessible name
}

function isDecorative(el) {
  if (!el || typeof el.closest !== 'function') return false;
  return el.getAttribute('aria-hidden') === 'true' || Boolean(el.closest('[aria-hidden="true"]'));
}

// One simple pause rule: an element with data-kui-pause, or a button labelled pause, stop or
// reduce, inside the animated element's nearest section. Page-level controls do not count.
function hasPauseControlNearby(el) {
  const scope = (el.closest && el.closest('section, article, dialog, [data-kui-section]')) || document.body;
  if (!scope) return false;
  if (scope.querySelector('[data-kui-pause]')) return true;
  return Array.from(scope.querySelectorAll('button, [role="button"]')).some((b) =>
    /pause|stop|reduce/i.test(`${b.textContent || ''} ${b.getAttribute('aria-label') || ''}`));
}

export function verifyMotion() {
  const findings = [];
  const add = (severity, rule, detail, element) => {
    if (findings.filter((f) => f.rule === rule).length >= MAX_PER_RULE) return;
    findings.push(element ? { severity, rule, detail, element } : { severity, rule, detail });
  };

  const root = document.documentElement;
  const tierAttr = root.getAttribute('data-motion-tier');
  let reduced = false;
  try { reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* no matchMedia */ }

  if (tierAttr === null) add('blocker', 'missing-motion-tier', 'No data-motion-tier on <html>; declare a tier with applyMotionTier().', root);
  else if (!TIER_VALUES.has(tierAttr.trim())) add('blocker', 'invalid-motion-tier', `data-motion-tier="${tierAttr}"; expected 0, 1, 2 or 3.`, root);
  else if (reduced && tierAttr.trim() !== '0') add('major', 'reduced-motion-tier', `OS asks for reduced motion but data-motion-tier is ${tierAttr}; the preference must win with tier 0.`, root);

  let animations = [];
  try { animations = typeof document.getAnimations === 'function' ? document.getAnimations() : []; } catch { animations = []; }

  let infinite = 0;
  let long = 0;
  for (const anim of animations) {
    const el = anim.effect && anim.effect.target;
    let timing = {};
    try { timing = anim.effect && anim.effect.getComputedTiming ? anim.effect.getComputedTiming() : {}; } catch { timing = {}; }
    const duration = typeof timing.duration === 'number' ? timing.duration : 0;
    const endless = timing.iterations === Infinity || timing.endTime === Infinity;
    if (reduced && anim.playState === 'running' && (endless || duration > FADE_LIMIT_MS)) {
      add('blocker', 'reduced-motion-animation', `${label(el)} still animates for ${Math.round(duration)} ms with prefers-reduced-motion: reduce; only fades up to ${FADE_LIMIT_MS} ms may run.`, el);
    }
    if (endless) {
      infinite += 1;
      const tolerated = isDecorative(el) && hasPauseControlNearby(el);
      const tail = tolerated ? 'decorative with a pause control nearby' : 'add a pause/stop control (WCAG 2.2.2) or stop it while offscreen';
      add(tolerated ? 'minor' : 'major', 'infinite-animation', `${label(el)} loops forever (${Math.round(duration)} ms per cycle); ${tail}.`, el);
    } else if (duration > LONG_ANIMATION_MS) {
      long += 1;
      const pausable = hasPauseControlNearby(el);
      const tail = pausable ? 'a pause control is nearby' : 'motion past 5 s needs a pause control (WCAG 2.2.2)';
      add(pausable ? 'minor' : 'major', 'long-animation', `${label(el)} runs ${Math.round(duration)} ms; ${tail}.`, el);
    }
  }

  try {
    for (const el of document.querySelectorAll('body *')) {
      const s = styleOf(el);
      if (!s || !visible(el)) continue;
      if (s.cursor === 'none') add('major', 'hidden-cursor', `${label(el)} sets cursor: none; confirm a visible replacement cursor and keyboard parity, or restore it.`, el);
      if (s.willChange && s.willChange !== 'auto') add('minor', 'permanent-will-change', `${label(el)} keeps will-change: ${s.willChange}; promote only while animating, then reset it.`, el);
    }
  } catch { /* skip: selector or computed-style unavailable */ }

  try {
    for (const video of document.querySelectorAll('video[autoplay]')) {
      if (!video.hasAttribute('muted') && video.muted !== true) {
        add('blocker', 'autoplay-audio', `${label(video)} autoplays with sound; add muted or start playback from a user action (WCAG 1.4.2).`, video);
      }
    }
    for (const img of document.querySelectorAll('img')) {
      const s = styleOf(img);
      const hasRatio = Boolean(s && s.aspectRatio && s.aspectRatio !== 'auto');
      if (!visible(img) || hasRatio || img.hasAttribute('width') || img.hasAttribute('height')) continue;
      add('minor', 'image-no-dimensions', `${label(img)} has no width/height attribute and no CSS aspect-ratio; it can shift layout (CLS).`, img);
    }
  } catch { /* skip */ }

  try {
    for (const el of document.querySelectorAll(FOCUSABLE)) {
      if (el.disabled || !visible(el) || (el.closest && el.closest('[inert]'))) continue;
      if (!hasAccessibleName(el)) add('major', 'focusable-no-name', `${label(el)} is focusable with no accessible name; add text, aria-label or a wired <label>.`, el);
    }
  } catch { /* skip */ }

  try {
    for (const attr of ['data-kui-min-tier', 'data-kui-max-tier']) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const value = (el.getAttribute(attr) || '').trim();
        if (!TIER_VALUES.has(value)) add('major', 'invalid-tier-attribute', `${label(el)} has ${attr}="${value}"; expected 0, 1, 2 or 3.`, el);
      }
    }
  } catch { /* skip */ }

  const count = (severity) => findings.filter((f) => f.severity === severity).length;
  const summary = {
    tier: tierAttr,
    reducedMotion: reduced,
    runningAnimations: animations.length,
    infiniteAnimations: infinite,
    longAnimations: long,
    blockers: count('blocker'),
    majors: count('major'),
    minors: count('minor'),
    total: findings.length,
  };
  return { summary, findings };
}

function report(result) {
  const { summary, findings } = result;
  try {
    console.group('kinetic-ui motion audit');
    console.table(summary);
    for (const f of findings) console.log(`[${f.severity}] ${f.rule}: ${f.detail}`, f.element || '');
    const verdict = summary.blockers > 0 ? 'BLOCKED' : summary.majors > 0 ? 'NEEDS WORK' : 'PASS';
    console.log(`${verdict}: ${summary.blockers} blocker(s), ${summary.majors} major, ${summary.minors} minor`);
    console.groupEnd();
  } catch { /* console unavailable: the return value still carries the result */ }
  return result;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Attach once: reloading the file must not wrap the first wrapper again.
  if (typeof window.kuiVerify !== 'function') window.kuiVerify = () => report(verifyMotion());
  const autoRun = () => {
    try { if (!window.__kuiVerifyManual) window.kuiVerify(); } catch { /* never break the audited page */ }
  };
  if (document.readyState === 'complete') setTimeout(autoRun, 0); // let the first paint settle
  else window.addEventListener('load', autoRun, { once: true });
}
