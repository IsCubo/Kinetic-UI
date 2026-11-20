// Probes for render checks: each one measures a loaded page through a withBrowser session
// and resolves to { metrics: { name: number }, detail: string }. A metric the probe could not
// measure is null, and the check that expects it fails.
//
// Colour and geometry are read from computed styles and layout boxes, so the numbers describe
// what a person sees, not the source. Rules that hold "per view" (one filled action, one
// accent hue) are measured in every screen down the page and report the busiest one.

/** Shared in-page helpers, installed once per page as window.__kuiProbe. */
const LIB = `(() => {
  if (window.__kuiProbe) return window.__kuiProbe;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // Any CSS colour (oklch, color(), named) to 8-bit sRGB through the canvas.
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrast = (x, y) => {
    const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  const oklch = ({ r, g, b }) => {
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return { C: Math.hypot(A, Bb), h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  const inFirstScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  // The colour behind an element: the nearest mostly opaque ancestor background, else white.
  const behind = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c.a >= 0.5) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.value || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 28);
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const PRICE = /[$€£¥₹]\\s?\\d|\\d[\\d.,]*\\s?(?:€|£|USD|EUR|MXN|COP)\\b/;
  // The innermost elements whose text holds a price, so "$" and "9" split across spans still count.
  const priceElements = () => [...document.querySelectorAll('body *')].filter((el) =>
    PRICE.test(el.textContent) && ![...el.children].some((c) => PRICE.test(c.textContent)));
  const ACTION = 'button, [role=button], a[href], input[type=submit], input[type=button]';
  const inView = (r) => {
    const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    return r.width > 0 && r.height > 0 && w * h >= 0.5 * r.width * r.height;
  };
  // Shared area of two boxes, relative to the smaller one.
  const overlap = (a, b) => {
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return (w * h) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  };
  return (window.__kuiProbe = { rgba, contrast, oklch, visible, inFirstScreen, inView, overlap, behind, label, ownText, PRICE, priceElements, ACTION });
})()`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait after each scroll for entrance animations to finish before a view is measured. */
const VIEW_SETTLE_MS = 1000;

/**
 * Scroll down half a screen at a time and measure each view with `expression`, which
 * resolves to { count, items }. Resolves to the busiest view and the scroll offset it was at.
 */
async function busiestView(browser, expression) {
  const max = await browser.evaluate('Math.max(0, document.documentElement.scrollHeight - innerHeight)');
  const step = Math.max(200, Math.round((await browser.evaluate('innerHeight')) * 0.5));
  let best = null;
  for (let y = 0; ; y += step) {
    const at = Math.min(y, max);
    await browser.evaluate(`(async () => {
      scrollTo(0, ${at});
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    if (at > 0) await sleep(VIEW_SETTLE_MS);
    const view = await browser.evaluate(expression);
    if (!best || view.count > best.count) best = { ...view, at };
    if (at >= max) break;
  }
  return best;
}

/**
 * A filled action is a strong fill (3:1 or more against what is behind it, or a gradient) the
 * size of a control, lying on an interactive element: the button itself, the checked span in
 * a label, or a sliding indicator under the selected segment.
 */
const FILLED_VIEW = `(() => {
  const k = ${LIB};
  const INTERACTIVE = k.ACTION + ', input, label, select, summary, [role=radio], [role=tab], [role=switch], ' +
    '[role=option], [aria-pressed], [aria-selected], [aria-checked]';
  const controls = [...document.querySelectorAll(INTERACTIVE)]
    .filter((el) => k.visible(el))
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter((c) => k.inView(c.box));
  // Boxes that can carry a fill: every element, plus the absolutely positioned ::before and
  // ::after of a positioned element (a common way to draw a segmented control's indicator).
  const surfaces = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!k.visible(el)) continue;
    const cs = getComputedStyle(el);
    surfaces.push({ box: el.getBoundingClientRect(), style: cs, behind: () => k.behind(el) });
    if (cs.position === 'static') continue;
    const host = el.getBoundingClientRect();
    for (const which of ['::before', '::after']) {
      const ps = getComputedStyle(el, which);
      if (ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') continue;
      if (ps.position !== 'absolute' || Number(ps.opacity) <= 0.05) continue;
      const [w, h, left, top] = [ps.width, ps.height, ps.left, ps.top].map(parseFloat);
      if (![w, h, left, top].every(Number.isFinite)) continue;
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x = host.left + parseFloat(cs.borderLeftWidth) + left + m.m41;
      const y = host.top + parseFloat(cs.borderTopWidth) + top + m.m42;
      // The pseudo-element paints over its host, so the host's own background is what is behind it.
      const hostBg = k.rgba(cs.backgroundColor);
      surfaces.push({ box: new DOMRect(x, y, w, h), style: ps, behind: () => (hostBg.a >= 0.5 ? hostBg : k.behind(el)) });
    }
  }
  const fills = [];
  for (const { box, style: cs, behind } of surfaces) {
    if (box.height < 16 || box.height > 120 || box.width < 24 || box.width > 640) continue;
    if (!k.inView(box)) continue;
    const bg = k.rgba(cs.backgroundColor);
    if (!(cs.backgroundImage.includes('gradient') || (bg.a >= 0.5 && k.contrast(bg, behind()) >= 3))) continue;
    // The fill must sit on a control and not dwarf it: a dark card around a text link is not a filled action.
    const area = box.width * box.height;
    const control = controls.find((c) => k.overlap(c.box, box) >= 0.5 && area <= 3 * c.box.width * c.box.height);
    if (!control || fills.some((f) => k.overlap(f.box, box) > 0.8)) continue;
    fills.push({ box, name: k.label(control.el) || control.el.tagName.toLowerCase() });
  }
  return { count: fills.length, items: fills.map((f) => f.name) };
})()`;

/** The most filled actions in any one view of the page. */
async function filledActions(browser) {
  const view = await busiestView(browser, FILLED_VIEW);
  return {
    metrics: { filled: view.count },
    detail: view.count ? `${view.items.join(', ')} (view at ${view.at}px)` : 'no filled action',
  };
}

/**
 * Distinct hues in one view: colours of OKLCH chroma 0.05 or more (a muted brand green counts,
 * a pale tint or a tinted grey does not), grouped when closer than 40 degrees, across
 * backgrounds, text and thick borders.
 */
const HUES_VIEW = `(() => {
  const k = ${LIB};
  const seen = [];
  const add = (color, el, where) => {
    const c = k.rgba(color);
    if (c.a < 0.5) return;
    const o = k.oklch(c);
    if (o.C >= 0.05) seen.push({ h: o.h, where: (k.label(el) || el.tagName.toLowerCase()) + ' ' + where });
  };
  for (const el of document.querySelectorAll('body, body *')) {
    const box = el.getBoundingClientRect();
    if (!k.visible(el) || !(el === document.body || k.inView(box))) continue;
    const cs = getComputedStyle(el);
    if (box.width * box.height >= 200) add(cs.backgroundColor, el, 'background');
    if (k.ownText(el)) add(cs.color, el, 'text');
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs['border' + side + 'Width']) >= 2) add(cs['border' + side + 'Color'], el, 'border');
    }
  }
  if (!seen.length) return { count: 0, items: [] };
  seen.sort((a, b) => a.h - b.h);
  // On the hue circle, every gap wider than 40 degrees separates two clusters.
  const clusters = [[seen[0]]];
  for (let i = 1; i < seen.length; i++) {
    if (seen[i].h - seen[i - 1].h > 40) clusters.push([]);
    clusters[clusters.length - 1].push(seen[i]);
  }
  if (clusters.length > 1 && seen[0].h + 360 - seen[seen.length - 1].h <= 40) clusters[0].push(...clusters.pop());
  return { count: clusters.length, items: clusters.map((c) => Math.round(c[0].h) + '° ' + c[0].where) };
})()`;

/** The most distinct saturated hues in any one view of the page. */
async function saturatedHues(browser) {
  const view = await busiestView(browser, HUES_VIEW);
  return {
    metrics: { hues: view.count },
    detail: view.count ? `${view.items.join(', ')} (view at ${view.at}px)` : 'no saturated colour',
  };
}

/** Option cards (the smallest blocks holding a price and an action) and how many end below the first screen. */
async function optionsAboveFold(browser) {
  return browser.evaluate(`(() => {
    const k = ${LIB};
    scrollTo(0, 0);
    const cards = new Set();
    for (const price of k.priceElements()) {
      if (!k.visible(price)) continue;
      for (let n = price.parentElement; n && n !== document.body; n = n.parentElement) {
        const actions = [...n.querySelectorAll(k.ACTION)].filter(k.visible);
        if (!actions.length) continue;
        if (n.getBoundingClientRect().width <= innerWidth * 0.9 || innerWidth < 600) cards.add(n);
        break;
      }
    }
    // Keep the innermost cards: a section that wraps three plans is not a fourth plan.
    const options = [...cards].filter((c) => ![...cards].some((d) => d !== c && c.contains(d)));
    const report = options.map((card) => {
      const bottom = Math.max(...[...card.querySelectorAll(k.ACTION)].filter(k.visible).map((a) => a.getBoundingClientRect().bottom));
      const name = k.label(card.querySelector('h1, h2, h3, h4, strong') || card);
      return { name, bottom: Math.round(bottom), outside: bottom > innerHeight };
    });
    return {
      metrics: { found: report.length, outside: report.filter((o) => o.outside).length },
      detail: report.map((o) => o.name + ' action ends at ' + o.bottom + 'px').join(', ') || 'no priced option with an action',
    };
  })()`);
}

/**
 * Click the other billing period, then time two things: when the shown prices change, and
 * when every finite animation the click started has ended.
 */
async function switchLatency(browser) {
  return browser.evaluate(`(async () => {
    const k = ${LIB};
    scrollTo(0, 0);
    // No boundary after the word: a badge set flush after it reads "YearlySave 25%".
    const PERIOD = /\\b(year|annual|month|anual|mensual)/i;
    const YEAR = /year|annual|anual/i;
    const nameOf = (el) => el.matches('input')
      ? [...(el.labels ?? [])].map((l) => l.textContent).join(' ') + ' ' + (el.getAttribute('aria-label') ?? '')
      : el.getAttribute('aria-label') || el.textContent || '';
    const controls = [...document.querySelectorAll(
      'button, [role=radio], [role=tab], [role=switch], [role=button], input[type=radio], input[type=checkbox]',
    )].filter((el) => PERIOD.test(nameOf(el)) && k.visible(el.matches('input') && el.labels?.[0] ? el.labels[0] : el));
    if (!controls.length) return { metrics: { pricesChangedMs: null, motionMs: null }, detail: 'no monthly/yearly control found' };
    const selected = (el) => el.matches('input') ? el.checked
      : ['aria-pressed', 'aria-checked', 'aria-selected'].some((a) => el.getAttribute(a) === 'true');
    const target = controls.find((el) => !selected(el) && YEAR.test(nameOf(el)))
      ?? controls.find((el) => !selected(el)) ?? controls.find((el) => YEAR.test(nameOf(el))) ?? controls[0];
    // Only the prices a person can see: a CSS-only switch keeps both sets in the DOM.
    const prices = () => k.priceElements().filter(k.visible).map((el) => el.textContent.replace(/\\s+/g, ' ').trim()).join(' | ');
    const finite = (a) => a.effect?.getComputedTiming().endTime !== Infinity;
    const before = prices();
    const known = new Set(document.getAnimations());
    const started = new Set();
    const collect = () => { for (const a of document.getAnimations()) if (!known.has(a) && finite(a)) started.add(a); };
    const t0 = performance.now();
    target.click();
    let changedAt = prices() !== before ? 0 : null;
    collect();
    let lastBusy = t0;
    while (performance.now() - t0 < 3000) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      if (changedAt === null && prices() !== before) changedAt = now - t0;
      collect();
      if ([...started].some((a) => a.playState === 'running' || a.pending)) lastBusy = now;
      else if (changedAt !== null && now - lastBusy > 120) break;
    }
    return {
      metrics: {
        pricesChangedMs: changedAt === null ? null : Math.round(changedAt),
        motionMs: Math.round(lastBusy - t0),
      },
      detail: 'clicked "' + nameOf(target).replace(/\\s+/g, ' ').trim().slice(0, 24) + '"; ' +
        (changedAt === null ? 'prices never changed' : before.slice(0, 40) + ' -> ' + prices().slice(0, 40)),
    };
  })()`);
}

/** Sample the side position of blocks as they enter the viewport and again after they settle. */
const SAMPLE = `(() => {
  const all = [...document.querySelectorAll('body *')];
  const out = [];
  for (let i = 0; i < all.length && out.length < 400; i++) {
    const r = all[i].getBoundingClientRect();
    if (r.height < 60 || r.width < 120 || r.bottom <= 0 || r.top >= innerHeight) continue;
    out.push([i, r.left, (all[i].getAttribute('aria-label') || all[i].textContent || all[i].tagName).replace(/\\s+/g, ' ').trim().slice(0, 28)]);
  }
  return out;
})()`;

/** The largest sideways move of any block while it enters the viewport during a scroll down. */
async function horizontalEntrances(browser) {
  const max = await browser.evaluate('Math.max(0, document.documentElement.scrollHeight - innerHeight)');
  const step = Math.max(200, Math.round((await browser.evaluate('innerHeight')) * 0.6));
  let worst = { shift: 0, name: '' };
  for (let y = 0; ; y += step) {
    const target = Math.min(y, max);
    const early = await browser.evaluate(`(async () => {
      scrollTo(0, ${target});
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return ${SAMPLE};
    })()`);
    await sleep(900);
    const late = new Map((await browser.evaluate(SAMPLE)).map(([i, left]) => [i, left]));
    for (const [i, left, name] of early) {
      if (!late.has(i)) continue;
      const shift = Math.abs(late.get(i) - left);
      if (shift > worst.shift) worst = { shift, name };
    }
    if (target >= max) break;
  }
  return {
    metrics: { maxShiftPx: Math.round(worst.shift) },
    detail: worst.shift ? `${worst.name} moved ${Math.round(worst.shift)}px sideways` : 'no sideways movement',
  };
}

export const PROBES = {
  filledActions: { metrics: ['filled'], run: filledActions },
  saturatedHues: { metrics: ['hues'], run: saturatedHues },
  optionsAboveFold: { metrics: ['found', 'outside'], run: optionsAboveFold },
  switchLatency: { metrics: ['pricesChangedMs', 'motionMs'], run: switchLatency },
  horizontalEntrances: { metrics: ['maxShiftPx'], run: horizontalEntrances },
};
