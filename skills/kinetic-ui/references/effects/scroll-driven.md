# Scroll-driven animation

> Keywords: scroll-driven animation, scroll animation, animation-timeline, scroll(), view(), animation-range, view-timeline, timeline-scope, reveal on scroll, scroll progress bar, reading progress, sticky storytelling, scrollytelling, pinning, horizontal scroll section, IntersectionObserver fallback, GSAP ScrollTrigger, Motion scroll, Lenis, smooth scroll, animación con scroll
> Summary: How to link animation to scroll with CSS scroll and view timelines, reveal content, show reading progress, pin a story, build horizontal sections, fall back with IntersectionObserver, and decide when to use GSAP ScrollTrigger, Motion, or Lenis.

Scroll position becomes the clock: the user controls speed and direction, so the motion feels earned. Start with CSS timelines inside `@supports`, design the unsupported state as the final visible state, and add libraries only for what CSS cannot do.

## When to use

- Reveal a section once as it enters, subtly and at section level.
- Reading progress on long articles and docs.
- Scrollytelling: a pinned visual that changes while text steps scroll past.
- A horizontal gallery or timeline inside a vertical page.
- Feeding scroll progress to a canvas or 3D scene (`references/effects/webgl-3d.md`).

## When not to use

- To gate content. Nothing may start invisible unless the browser can reveal it.
- Product UI, tables, forms, and settings pages.
- Scroll-jacking: changing scroll speed or direction, or snapping the page with `mandatory`.
- The same fade-up on every block; it reads as a template, not a choice.
- Pinned stories longer than about three viewports without a skip link.

## How it works

| Concept | What it is | Use for |
| --- | --- | --- |
| `scroll()` | Anonymous scroll progress timeline: `scroll(root block)`, `scroll(nearest inline)` | Page progress, scroller backgrounds |
| `view()` | Anonymous view progress timeline: the element's own visibility in its nearest scroller | Reveals |
| `view-timeline` / `scroll-timeline` | Named timeline (`--name`) declared on a subject or scroller; descendants reference it | Parallax planes, pinned stories |
| `timeline-scope` | Hoists a named timeline to an ancestor so siblings can use it | Steps driving a sibling stage |
| `animation-range` | The part of the timeline mapped to 0–100% of the keyframes | Tuning start and end |

Range names: `cover` (first pixel enters → last pixel leaves), `contain` (fully inside, or fully covering the viewport when taller), `entry`, `exit`, `entry-crossing`, `exit-crossing`. Example: `animation-range: entry 10% cover 35%`.

Timing rules: use `linear` timing (easing lives in the keyframes if needed), fill mode `both`, and a non-zero duration such as `1ms`; durations scale to the range. The `animation` shorthand resets `animation-timeline`, so declare the timeline after it.

Support: Limited availability as of 2026-10 (Chrome 115, Safari 26, Firefox 159 due 2026-10-27). The `@supports (animation-timeline: view())` fallback is mandatory. IntersectionObserver is Widely available.

| Need | CSS (T1+) | Without timelines | Library (T2+) |
| --- | --- | --- | --- |
| Reveal on enter | `view()` reveal | IntersectionObserver toggles a class | Not needed |
| Reading progress | `scroll(root block)` bar | Hide the bar | Not needed |
| Pinned story, discrete steps | `position: sticky` + IntersectionObserver | Same | Not needed |
| Pinned sequence, scrubbed and timed | Sticky + named `view-timeline` | Steps only | GSAP ScrollTrigger (`pin`, `scrub`, `snap`, callbacks) |
| Horizontal section | Sticky + named timeline + `translateX` | Native horizontal scroller | GSAP (`pin` + `containerAnimation`) |
| Scroll value in JS | Not available | Not available | Motion `scroll()` callback or ScrollTrigger `onUpdate` |
| Smooth/inertial scroll | Never by default | Native scroll | Lenis, T2+ only |

## Implementation

### Reveal and progress (CSS, T1+)

Load `assets/tokens/motion.css` and `assets/effects/scroll-driven.css`, then add classes:

```html
<div class="kui-scroll-progress" aria-hidden="true"></div>
<section class="kui-reveal">…</section>
<section class="kui-reveal kui-reveal--fade" style="--kui-reveal-range: entry 0% entry 100%">…</section>
```

The core rule inside the asset:

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) .kui-reveal {
      animation: kui-reveal 1ms linear both;
      animation-timeline: view();
      animation-range: var(--kui-reveal-range, entry 10% cover 35%);
    }
  }
}
```

### IntersectionObserver fallback (T1+, no timelines)

Only content below the fold is ever hidden, and only after JS runs, so a script failure leaves everything visible. The asset styles `data-kui-reveal`.

```js
export function revealFallback(selector = '.kui-reveal') {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motionTier === '0';
  if (CSS.supports('animation-timeline: view()') || reduced) return () => {};
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.kuiReveal = 'shown';
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const el of document.querySelectorAll(selector)) {
    if (el.getBoundingClientRect().top < innerHeight) continue; // already on screen: never hide it
    el.dataset.kuiReveal = 'pending';
    io.observe(el);
  }
  return () => io.disconnect();
}
```

### Sticky storytelling (T1+)

The stage sticks; text steps scroll normally; an observer swaps frames. Frame 1 carries `data-active` in the HTML so the no-JS state is complete.

```html
<section class="kui-story">
  <div class="kui-story__stage" aria-hidden="true">
    <img class="kui-story__frame" data-frame="1" data-active src="step-1.avif" alt="">
    <img class="kui-story__frame" data-frame="2" src="step-2.avif" alt="">
  </div>
  <ol class="kui-story__steps">
    <li class="kui-story__step" data-step="1">…</li>
    <li class="kui-story__step" data-step="2">…</li>
  </ol>
</section>
```

```css
.kui-story { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; view-timeline: --kui-story block; }
.kui-story__stage { position: sticky; top: 0; align-self: start; block-size: 100svh; display: grid; } /* align-self: a stretched grid item cannot stick */
.kui-story__frame { grid-area: 1 / 1; inline-size: 100%; block-size: 100%; object-fit: contain; opacity: 0; transition: opacity var(--kui-duration-lg) var(--kui-ease-standard); }
.kui-story__frame[data-active] { opacity: 1; }
.kui-story__step { min-block-size: 80svh; display: grid; align-content: center; }
@media (width < 48rem) {
  .kui-story { grid-template-columns: 1fr; }
  .kui-story__stage { block-size: 45svh; }
  /* Text cards scroll over the sticky stage; only the card gets a surface, never the whole step. */
  .kui-story__step > * { position: relative; z-index: 1; padding: 1rem; background: var(--brand-surface); border-radius: var(--brand-radius); }
}
```

```js
export function storySteps(story) {
  const frames = story.querySelectorAll('.kui-story__frame');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const frame of frames) frame.toggleAttribute('data-active', frame.dataset.frame === entry.target.dataset.step);
    }
  }, { rootMargin: '-45% 0px -45% 0px' }); // a band across the middle of the viewport
  story.querySelectorAll('.kui-story__step').forEach((step) => io.observe(step));
  return () => io.disconnect();
}
```

A scrubbed progress line for the story can reuse the asset's keyframes: `animation: kui-scroll-progress 1ms linear both; animation-timeline: --kui-story; animation-range: contain 0% contain 100%;`.

### Horizontal section (T1+ where supported)

The base is a native horizontal scroller; the pinned version applies only with timeline support and motion allowed.

```css
/* <section class="kui-hscroll" aria-label="Product timeline"><div class="kui-hscroll__sticky">
     <ul class="kui-hscroll__track" tabindex="0">…</ul></div></section>   (a labelled section is a region) */
.kui-hscroll__track { display: flex; gap: 2rem; overflow-x: auto; scroll-snap-type: x proximity; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion-tier="0"]) .kui-hscroll { block-size: 300svh; view-timeline: --kui-hscroll block; } /* ≈ track width */
    :root:not([data-motion-tier="0"]) .kui-hscroll__sticky { position: sticky; top: 0; block-size: 100svh; overflow: clip; container-type: inline-size; display: grid; align-items: center; }
    :root:not([data-motion-tier="0"]) .kui-hscroll__track {
      overflow: visible; inline-size: max-content;
      animation: kui-hscroll 1ms linear both;
      animation-timeline: --kui-hscroll;
      animation-range: contain 0% contain 100%;
    }
  }
}
@keyframes kui-hscroll { to { transform: translateX(calc(-100% + 100cqi)); } }
```

Mirror the keyframe (`translateX(calc(100% - 100cqi))`) for `dir="rtl"`.

### Libraries: GSAP, Motion, Lenis (T2+)

Gate every library on the tier and let `gsap.matchMedia()` revert on preference changes. Use either the CSS pinned section or GSAP for one section, never both.

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

if (Number(document.documentElement.dataset.motionTier) >= 2) {
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const track = document.querySelector('.kui-hscroll__track');
    gsap.to(track, {
      x: () => -(track.scrollWidth - document.documentElement.clientWidth),
      ease: 'none',
      scrollTrigger: { trigger: '.kui-hscroll', pin: true, scrub: true, end: () => `+=${track.scrollWidth}`, invalidateOnRefresh: true },
    });
  });
}
```

Scroll value for JS consumers (Motion): `const cancel = scroll((progress) => scene.setProgress(progress), { target: section, offset: ['start end', 'end start'] });`

Smooth scroll never runs at T0/T1 and never replaces native behavior:

```js
import Lenis from 'lenis';

let lenis = null;
function syncSmoothScroll() {
  const allowed = Number(document.documentElement.dataset.motionTier) >= 2;
  if (allowed && !lenis) lenis = new Lenis({ autoRaf: true, anchors: true, allowNestedScroll: true });
  if (!allowed && lenis) { lenis.destroy(); lenis = null; }
}
syncSmoothScroll();
document.addEventListener('kui:motiontierchange', syncSmoothScroll);
```

## Reduced motion

Exact T0 behavior:

- Reveals: content renders in its final state; the CSS block does not apply and `revealFallback()` returns without marking anything pending.
- Reading progress: kept. It is a progress indicator and moves no content.
- Sticky story: the stage stays sticky and frames swap with an opacity crossfade of `--kui-duration-lg` (200ms under reduced motion); no travel or scale.
- Horizontal section: the native horizontal scroller with `scroll-snap-type: x proximity`; no pinning.
- GSAP and Motion sequences are not registered; Lenis is never created, or is destroyed on `kui:motiontierchange`; `scroll-behavior: auto`.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Everything in T2; scroll progress may drive a WebGL scene | — |
| T2 | CSS timelines where supported; IntersectionObserver elsewhere; GSAP or Motion for scrubbed sequences and JS values; Lenis only on brand pages that ask for it | Lenis off by default |
| T1 | CSS timelines where supported; IntersectionObserver class toggles elsewhere; pinned horizontal section only with CSS support, otherwise the native scroller; native scrolling | GSAP, Motion, Lenis, and every per-frame JS handler |

## Performance budget

- Keyframes animate `transform` and `opacity`; engines can run these scroll-driven animations off the main thread. `clip-path`, `filter`, `background-position`, and layout properties repaint every frame: limit them to small areas.
- No scroll event handlers at T1. At T2, use one library-managed handler, not one per element.
- Reveal sections, not every list item; keep any stagger under about 300ms in total.
- Reserve image and embed sizes so reveals and pinning cause no CLS; call `ScrollTrigger.refresh()` after late layout changes such as web fonts.
- Lenis adds a per-frame loop: measure INP and battery on a low-end device before keeping it.

## Accessibility

- Content never depends on the animation: unsupported browsers, no-JS, crawlers, and find-in-page see the final state.
- Keyboard scrolling (Space, Page Down, arrows), find-in-page, and anchor links keep native behavior at every tier (WCAG 2.1.1).
- Native horizontal scrollers get `tabindex="0"` inside a labelled region (`<section aria-label="…">`) so keyboard users can reach and scroll them.
- Pinned horizontal tracks hide translated items off-screen: keep them free of focusable controls, or on `focusin` scroll the page to the item's position (`references/foundations/accessibility-motion.md`, WCAG 2.4.11).
- Add a skip link past long pinned stories. The decorative progress bar stays `aria-hidden="true"`.

## Libraries

- Native CSS scroll timelines and IntersectionObserver first.
- GSAP ScrollTrigger for pinning, scrubbed timelines, snapping, and callbacks; check its license terms first.
- Motion `scroll()` for scroll values in vanilla JS or React.
- Lenis for opt-in smooth scroll at T2+.
- Versions, licenses, and caveats: `references/libraries.md`.

## Pitfalls

- `animation-timeline` declared before the `animation` shorthand is reset to `auto`; the element animates on time instead of scroll.
- `overflow: hidden` on an ancestor makes it the scroller for `view()` and breaks `position: sticky`; use `overflow: clip`.
- `100vh` jumps with mobile browser toolbars; use `svh` for pinned stages.
- Hiding reveals with `opacity: 0` outside `@supports` leaves content invisible in unsupported browsers.
- Running the CSS pinned section and a GSAP pin on the same element: measurements fight and the page jumps.
- GSAP `pin` on an element that is also animated throws off its measurements; animate children of the pinned element.
- A fixed `300svh` height that ignores the track width makes horizontal sections too fast or too slow; adjust per content.
