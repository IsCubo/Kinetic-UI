# Carousels and galleries

> Keywords: carousel, slider, slideshow, gallery, image gallery, media viewer, lightbox, zoom modal, coverflow, 3D carousel, scroll snap, pagination, dots, arrows, swipe, drag to scroll, autoplay, pause autoplay, touch paging, carousel keyboard, carousel aria, carrusel, galería
> Summary: How carousels, galleries, and lightboxes behave: scroll-snap paging, controls and pagination, drag and autoplay, the lightbox dialog, coverflow depth, and touch behavior, with reduced-motion and low-end rules.

## When to use

| Pattern | Use for |
| --- | --- |
| Scroll-snap carousel | A bounded, ordered set of equal items (featured products, testimonials, onboarding steps) shown one or a few at a time |
| Gallery with thumbnails | Photo sets where the user picks what to see next (product shots, portfolio, lightbox previews) |
| Lightbox | A full-size view of one image over the dimmed page, with keyboard and zoom controls |
| Coverflow / depth carousel | A short, purely visual set where depth adds appeal; at most one per page, fine pointer or touch, T2+ |
| Auto-rotating carousel | Only optional, decorative content, never more than a few slides, always with a visible pause |

## When not to use

- More than about 8 items, or when users need to compare and scan: use a grid (`references/components/lists-collections.md`).
- Content that must be read without hover or swipe. Anything important hidden off-screen gets few views; carousels are skimmed, not studied.
- Long text inside slides. A paged article is worse than a scrolled one.
- When 3 static items already fit the row: fewer patterns, fewer moving parts.
- Forms, dashboards, and data-dense UI, where a fling or a mis-swipe is an accident waiting to happen.
- Autoplay for content people are reading. Advance only when it is genuinely optional, or not at all.

## How it works

Anatomy: **track** (a scroll container with snap points) · **slides** (equal aspect ratio, explicit dimensions) · **previous/next controls** (buttons at least 24×24 px, 44×44 on touch) · **pagination indicator** (dots or a fraction) · optional **autoplay timer with a visible pause control** · optional **thumbnails** · optional shared **lightbox dialog**. Build paging on native CSS scroll snap; JavaScript adds controls, autoplay, lightbox, and depth only.

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest (idle) | — | Slides rest at snap points; the active dot is filled | — | — |
| Hover (controls) | Pointer over the carousel (`hover: hover`) | Prev/next rise by `--kui-distance-sm` and fade to full opacity | `--kui-duration-sm` | `--kui-ease-enter` |
| Focus-visible | Keyboard focus on a control, dot, or the track | 2px outline, no motion | none (instant) | — |
| Pressed | `:active` on a control or a slide link | Scale to `--kui-scale-press` | `--kui-duration-xs` | `--kui-ease-standard` |
| Dragging | Pointer or touch moves the track | Track follows the pointer 1:1, transitions suspended | none (immediate) | — |
| Settling | Pointer released after a drag | Native momentum snapping takes over; programmatic moves use `scroll-behavior: smooth` | `--kui-duration-md` (programmatic only) | `--kui-ease-standard` |
| Autoplay tick | Timer fires while no pointer hover, no focus inside, tab visible | Track glides to the next slide; dots update | `--kui-duration-md` | `--kui-ease-standard` |
| Paused | Hover, focus inside, hidden tab, or the Pause control | Timer stops; the pause control reflects the state | none (instant) | — |
| Coverflow depth shift | Active slide changes (scroll, control, or key) | Neighbouring slides rotate up to ±12° and dim with distance | `--kui-duration-md` | `--kui-ease-standard` |
| Slide loading | Image source pending | Brand-surface placeholder holds the exact slide box (no layout shift) | none (instant) | — |
| Lightbox open | Thumbnail or slide activated | `<dialog>` fades in over a dimmed backdrop | `--kui-duration-md` | `--kui-ease-enter` |
| Lightbox closed | Esc, close button, or outside click | Dialog fades out; focus returns to the opener | `--kui-duration-sm` | `--kui-ease-exit` |
| Empty | No slides | One empty slide with a sentence and an action | `--kui-duration-sm` | `--kui-ease-standard` |
| Media error | Image fails to load | Slide keeps its box and shows a fallback with a retry action | none (instant) | — |

## Implementation

```html
<section class="carousel" role="region" aria-roledescription="carousel" aria-label="Featured projects">
  <ul class="carousel__track" tabindex="0">
    <li class="carousel__slide" aria-roledescription="slide" aria-label="1 of 4">
      <img src="project-1.avif" alt="Dashboard redesign" width="1200" height="800"
           loading="eager" fetchpriority="high" decoding="async">
    </li>
    <li class="carousel__slide" aria-roledescription="slide" aria-label="2 of 4">
      <img src="project-2.avif" alt="Booking flow" width="1200" height="800"
           loading="lazy" fetchpriority="low" decoding="async">
    </li>
  </ul>
  <div class="carousel__nav">
    <button class="carousel__btn" type="button" data-dir="-1" aria-label="Previous slide">‹</button>
    <button class="carousel__btn" type="button" data-dir="1" aria-label="Next slide">›</button>
    <button class="carousel__pause" type="button" aria-pressed="false" aria-label="Pause autoplay">⏸</button>
  </div>
</section>
```

```css
.carousel__track {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.carousel__slide { scroll-snap-align: center; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .carousel__track { scroll-behavior: smooth; }
}
.carousel__btn { position: relative; opacity: 0.55; }
.carousel__btn:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
@media (hover: hover) {
  .carousel:hover .carousel__btn { opacity: 1; translate: 0 0; }
  .carousel__btn { translate: 0 var(--kui-distance-sm);
    transition: translate var(--kui-duration-sm) var(--kui-ease-enter), opacity var(--kui-duration-sm) var(--kui-ease-standard); }
}
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .carousel__btn:active { scale: var(--kui-scale-press); }
}
```

```js
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.dataset.motionTier === '0';

// One slide per page. Multi-slide pages: snap to the nearest slide offset instead of clientWidth steps.
export function slideTo(carousel, next) {
  const slides = [...carousel.querySelectorAll('.carousel__slide')];
  const target = slides[Math.max(0, Math.min(next, slides.length - 1))];
  target.scrollIntoView({
    behavior: still() ? 'instant' : 'smooth',
    block: 'nearest', inline: 'center',
  }); // T0: instant jump, no glide.
}

// Autoplay: never while pointed, focused, hidden, paused, or at T0. Announce nothing.
export function autoplay(carousel, pauseBtn, everyMs = 6000) {
  if (still()) return; // No autoplay under reduced motion.
  let timer = 0;
  const tick = () => {
    const slides = [...carousel.querySelectorAll('.carousel__slide')];
    const i = Math.round(carousel.querySelector('.carousel__track').scrollLeft / carousel.clientWidth);
    slideTo(carousel, (i + 1) % slides.length);
  };
  const set = (on) => { clearInterval(timer); timer = on ? setInterval(tick, everyMs) : 0; };
  carousel.addEventListener('pointerenter', () => set(false));
  carousel.addEventListener('pointerleave', () => set(pauseBtn.getAttribute('aria-pressed') !== 'true'));
  carousel.addEventListener('focusin', () => set(false));
  carousel.addEventListener('focusout', () => set(pauseBtn.getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('visibilitychange', () => document.hidden && set(false));
  pauseBtn.addEventListener('click', () => {
    const paused = pauseBtn.getAttribute('aria-pressed') === 'true';
    pauseBtn.setAttribute('aria-pressed', String(!paused));
    set(!paused);
  });
  set(true);
}
```

Lightbox as a native dialog: `showModal()` gives focus trapping and Esc for free; arrows navigate; keep scrollbars stable by padding the body or letting it scroll behind.

```js
const lightbox = document.querySelector('.lightbox');
document.addEventListener('click', (e) => {
  const opener = e.target.closest('.carousel__slide img, .thumb');
  if (!opener) return;
  lightbox.querySelector('img').src = opener.dataset.full;
  lightbox.querySelector('img').alt = opener.alt;
  lightbox.showModal(); // focus moves in; Esc closes; focus returns to the opener on close
});
```

Coverflow (T2+, JS transforms on neighbours of the active slide). Disabled outside `prefers-reduced-motion: no-preference` and `motionTier >= 2`; rAF-throttled, and it composes no transition over the fling — it re-computes from scroll position. Layered depth guidance: `references/effects/depth-layers.md`. Reduce parallax on touch-first devices: `references/foundations/devices-responsive.md`.

Data-saver galleries: honor `(prefers-reduced-data: reduce)` by loading only the first image and leaving the rest as labeled placeholders until the user interacts.

Framework notes: in React, mount the carousel in an effect and re-check the tier/reduced-motion guards whenever config changes; wiring lives in `references/platforms/web-frameworks.md`. Native apps map to `PageView` with a `snapMode` controller (Flutter), `TabView` with `.page` style (SwiftUI), and `HorizontalPager` (Compose); see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`.

## Reduced motion

T0 behavior, exactly:
- Navigation jumps instantly: `slideTo` calls with `behavior: 'instant'`, autoplay never starts, no autoplay timer is set.
- Hover does not move the controls (distance collapses to 0); their opacity step still runs under the 200 ms cap.
- Settling: the track stops where the finger leaves it plus native snap to the nearest slide, with no scripted glide.
- Lightbox: the dialog appears with at most a 200 ms opacity fade (the tokens cap `--kui-duration-md` at 200 ms under reduce and T0), no scale or travel; closing likewise.
- Coverflow: never attached. All slides render flat in the filmstrip.
- The pause control, keyboard controls, and dots work unchanged.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Coverflow with layered depth and drift; WebGL-style carousel variants from `references/effects/depth-layers.md` |
| T2 | Coverflow transforms, animated programmatic scroll, autoplay with pause, lightbox crossfade |
| T1 | CSS only: scroll snap and native momentum, instant jump on control press (no `scroll-behavior: smooth` animation loop), controls fade, lightbox shows with a short opacity step. No autoplay, no coverflow |
| T0 | As in Reduced motion |

## Performance budget

- Let scroll snap do the paging in the compositor; never re-implement paging with `transform` math or scroll hijacking.
- One rAF-throttled, `{ passive: true }` scroll handler at most (active-dot tracking, coverflow depth). Nothing else per frame.
- Offscreen slides: `content-visibility: auto` with `contain-intrinsic-size` matching the slide box; images `loading="lazy"`, `fetchpriority="low"`, `decoding="async"`, and explicit `width`/`height` (CLS ≤ 0.1, no jump when a slide loads). Only the first visible slide may use `fetchpriority="high"`.
- `will-change` or a compositor hint on the track only while dragging; remove it on release.
- Never transition `left`/`top` or reflow the track during a drag.
- Pause autoplay whenever `document.hidden` (it burns battery in background tabs).

## Accessibility

- Carousel container: `role="region"` + `aria-roledescription="carousel"` + a distinct `aria-label`. Each slide: `aria-roledescription="slide"` and a human-readable position label ("1 of 4"); the heading inside the slide names the content.
- The track is a scrollable region: give it `tabindex="0"` so keyboard users can pan with arrow keys. Prev/next buttons keep focus on the button after activation; focus never follows the slides on autoplay or control use.
- Slides not on the current page must not be Tab-reachable: `content-visibility: auto` keeps them out of the accessibility tree, otherwise set `inert` on them.
- Autoplay longer than 5 s needs a visible pause control that lands on a stable hit area (WCAG 2.2.2). Pause on hover, on focus-within, and in hidden tabs; restart sensibly on return.
- Lightbox: use `<dialog>` + `showModal()`. Focus moves to the dialog on open, Esc and the close button dismiss it, arrows navigate images, and focus returns to the opener thumbnail. The backdrop dims the page without locking scroll surprises (test mobile rubber-banding).
- Icon-only controls need `aria-label`; hit areas ≥24×24 px, 44×44 on touch targets (`references/foundations/devices-responsive.md`).
- Dots as buttons with `aria-label="Go to slide 2"` and an `aria-current="true"` state; they must be operable by Enter/Space, not pointer-only.
- Nothing depends on swipe alone: buttons and keys do the same job (WCAG 2.5.1).

## Libraries

Embla, Swiper, or Splide for carousels; PhotoSwipe or GLightbox for lightboxes; plain CSS scroll snap covers most cases with no library. three.js only for T3 WebGL stages. Versions, sizes, and licensing: `references/libraries.md`.

## Pitfalls

- Autoplay without a pause control, with "pause" only on hover (touch users get nothing), or restarting instantly on mouseleave.
- `scroll-snap-type: mandatory` plus `overflow: hidden` wrappers: the snap container must be the one that scrolls.
- Focus lost to `<body>` when the active slide scrolls out. Use `inert`/`content-visibility` for hidden slides, never `tabindex="-1"` removal on live elements.
- Setting `scroll-behavior: smooth` globally and expecting it to reach `scrollIntoView({ behavior })` overrides — the option wins, hence the `still()` guard in the snippet.
- Coverflow on touch: depth transforms fight the fling. Gate it to T2+ and consider fine pointer only.
- Re-staging `scroll-snap` with JS `setInterval` scroll math: duplicate snapping logic drifts on zoom and resize.
- Lazy-loading without explicit dimensions: every load shifts the track and the dots.
- The lightbox image updates `src` but keeps the previous image proportions; set the `width`/`height` attributes per image.
