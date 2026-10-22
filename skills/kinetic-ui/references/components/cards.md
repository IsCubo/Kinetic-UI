# Cards

> Keywords: card, static card, interactive card, clickable card, whole-card link, block link, card hover, hover lift, elevation, tilt card, 3D tilt, hover depth, expandable card, accordion card, disclosure, shared element, card to detail, container transform, view transitions, tarjeta
> Summary: How cards behave: static versus interactive cards, the whole-card link pattern, hover depth and tilt, expandable cards, and shared-element card-to-detail transitions, with reduced-motion and low-end rules.

## When to use

| Card type | Use for |
| --- | --- |
| Static | Grouping related content that is not itself an action (a stat, a quote, a spec) |
| Interactive (whole-card link) | A preview that leads to one destination (article, product, project) |
| Tilt / hover depth | One featured row on a brand or portfolio page, fine pointer only |
| Expandable | Previews with optional detail the user reads in place (plan features, itinerary) |
| Shared-element card-to-detail | Galleries and catalogs where the card image becomes the detail page hero |

## When not to use

- Do not cut every section into identical cards. Use cards for repeated, comparable items, and plain layout for everything else.
- Do not wrap a card in `<a>` when it contains other links or buttons. Nested interactive elements are invalid HTML.
- Do not add tilt to data dashboards, forms, or cards with dense text. It hurts reading.
- Do not use an expandable card for content most users need. Show that content directly.
- Do not use shared-element morphs when the card and the detail page share no visual element.

## How it works

Anatomy: **container** (`<article>`) · **media** (fixed aspect ratio) · **heading** with the **primary link** · **meta** · **body** · optional **secondary actions** (stacked above the link overlay) · optional **disclosure toggle** and **expanded region** · **elevation layer** (pseudo-element that carries the shadow).

Whole-card link pattern: the heading link's `::after` covers the card (`position: absolute; inset: 0`), so the whole surface is clickable while the accessible name stays the heading text. Secondary actions sit above the overlay with `position: relative; z-index: 1`.

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest | — | Surface, optional border | — | — |
| Hover (interactive) | Pointer over the card (`hover: hover`) | Lifts `--kui-distance-sm`; elevation layer opacity 0 → 1 | `--kui-duration-md` | `--kui-ease-standard` |
| Focus-visible | Keyboard focus on the primary link | Outline drawn on the overlay around the whole card | none (instant) | — |
| Pressed | `:active` | Scale to `--kui-scale-press` | `--kui-duration-xs` | `--kui-ease-standard` |
| Tilting | Pointer moves over a tilt card | Rotates up to ±6° toward the pointer, highlight follows | per frame | — |
| Tilt release | Pointer leaves | Returns flat | `--kui-duration-lg` | `--kui-ease-spring` |
| Expanding | Toggle activated | Region opens (grid rows 0fr → 1fr), chevron rotates 180° | `--kui-duration-md` | `--kui-ease-enter` |
| Collapsing | Toggle activated again | Region closes | `--kui-duration-sm` | `--kui-ease-exit` |
| Card → detail | Primary link activated | Card image morphs into the detail hero; the rest crossfades | `--kui-duration-lg` | `--kui-ease-standard` |

## Implementation

```html
<article class="card">
  <img class="card__media" src="rim-trail.avif" alt="" width="640" height="400" loading="lazy">
  <div class="card__body">
    <h3 class="card__title"><a href="/trails/rim-loop">Rim trail loop</a></h3>
    <p>8 km, moderate, about 3 hours</p>
    <button class="card__action" type="button" aria-pressed="false">Save<span class="visually-hidden"> Rim trail loop</span></button>
  </div>
</article>
```

```css
.card {
  position: relative; isolation: isolate; display: grid;
  border-radius: var(--brand-radius);
  background: var(--brand-surface); color: var(--brand-on-surface);
}
.card__media { inline-size: 100%; block-size: auto; aspect-ratio: 16 / 10; object-fit: cover;
  border-radius: var(--brand-radius) var(--brand-radius) 0 0; }
.card__title a { color: inherit; text-decoration: none; }
.card__title a::after { content: ""; position: absolute; inset: 0; border-radius: var(--brand-radius); }
.card__title a:focus-visible { outline: none; }
.card__title a:focus-visible::after { outline: 2px solid var(--brand-accent); outline-offset: 2px; }
.card__action { position: relative; z-index: 1; }          /* stays clickable above the overlay */
.card::before {                                             /* elevation layer: fade it, never animate box-shadow */
  content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit; opacity: 0;
  box-shadow: 0 12px 32px color-mix(in oklab, var(--brand-on-surface) 22%, transparent);
}
@media (hover: hover) {
  .card:hover { translate: 0 calc(-1 * var(--kui-distance-sm)); }
  .card:hover::before { opacity: 1; }
}
.card:active { scale: var(--kui-scale-press); }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: translate var(--kui-duration-md) var(--kui-ease-standard), scale var(--kui-duration-xs) var(--kui-ease-standard); }
  .card::before { transition: opacity var(--kui-duration-md) var(--kui-ease-standard); }
}
```

Tilt (T2+, fine pointer). It writes `transform`, which composes with the `translate` lift. Layered depth inside the card, glare, and the tuned curves are in `references/effects/depth-layers.md`.

```js
export function tilt(card, maxDeg = 6) {
  const allowed = matchMedia('(hover: hover) and (pointer: fine)').matches
    && Number(document.documentElement.dataset.motionTier) >= 2;
  if (!allowed) return;
  let frame = 0;
  card.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${(-y * maxDeg).toFixed(2)}deg) rotateY(${(x * maxDeg).toFixed(2)}deg)`;
    });
  });
  card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); card.style.transform = ''; });
}
```

For the spring release, add `transform var(--kui-duration-lg) var(--kui-ease-spring)` to the card's transition list. Set it only on tilt cards, so ordinary cards stay cheap.

Expandable card. Use `<details>`/`<summary>` for zero-JS (it opens instantly). Use a disclosure button when you want the open/close motion:

```html
<button class="card__toggle" type="button" aria-expanded="false" aria-controls="plan-pro-more">Show all features</button>
<div class="card__more" id="plan-pro-more"><div>…</div></div>
```

```css
.card__more { display: grid; grid-template-rows: 0fr; visibility: hidden; }
.card__more > div { overflow: hidden; }
.card__toggle[aria-expanded="true"] + .card__more { grid-template-rows: 1fr; visibility: visible; }
@media (prefers-reduced-motion: no-preference) {
  .card__more { transition: grid-template-rows var(--kui-duration-md) var(--kui-ease-enter), visibility var(--kui-duration-md); }
}
```

```js
document.addEventListener('click', (e) => {
  const t = e.target.closest('.card__toggle');
  if (t) t.setAttribute('aria-expanded', String(t.getAttribute('aria-expanded') !== 'true'));
});
```

`visibility: hidden` keeps collapsed content out of the tab order. Transitioning `visibility` keeps the content visible until the collapse ends.

Shared-element card-to-detail (same-document). Name only the clicked card's image, and give the detail hero image `view-transition-name: card-media` in CSS. Cross-document (MPA) setup and the crossfade fallback are in `references/effects/page-transitions.md`.

```js
const shouldAnimate = () => !matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.motionTier !== '0';
export async function openDetail(card, renderDetail) {
  if (!document.startViewTransition || !shouldAnimate()) { renderDetail(); return; }
  const media = card.querySelector('.card__media');
  media.style.viewTransitionName = 'card-media';      // names must be unique: set it on one card only
  const transition = document.startViewTransition(() => {
    media.style.viewTransitionName = '';
    renderDetail();                                    // the detail hero carries view-transition-name: card-media
  });
  await transition.finished;
}
```

```css
::view-transition-group(card-media) { animation-duration: var(--kui-duration-lg); animation-timing-function: var(--kui-ease-standard); }
```

Native: Flutter `Card` + `InkWell`, `OpenContainer` (animations package) for card-to-detail; SwiftUI `matchedGeometryEffect`; Compose `Card(onClick = …)` and `SharedTransitionLayout`. See `references/platforms/`.

## Reduced motion

T0 behavior, exactly:
- Hover: no lift, because `--kui-distance-sm` becomes 0. The elevation layer still fades in, but at `--kui-duration-sm` (override the `--kui-duration-md` transition under reduce and T0).
- Press: no scale, because `--kui-scale-press` becomes 1.
- Tilt: never attached. The card stays flat, and hover shows only the elevation fade.
- Expand and collapse: the region opens instantly. The chevron changes without rotating.
- Card to detail: an instant swap, with no morph or crossfade. `openDetail` skips `startViewTransition`.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | T2 plus optional pointer-driven glare or depth layers from `references/effects/depth-layers.md` |
| T2 | Tilt on featured cards, spring release, shared-element morph, animated expand |
| T1 | CSS only: hover lift, elevation fade, press scale, grid-row expand. Card-to-detail uses a View Transitions crossfade with no named elements |
| T0 | As in Reduced motion |

## Performance budget

- Animate `translate`, `scale`, `transform`, and `opacity` only. A `box-shadow` transition repaints every frame, so fade the elevation layer instead.
- One rAF-throttled `pointermove` per tilt card, attached only on fine pointers. Never tilt every card in a long grid.
- Set `will-change: transform` only while tilting. Remove it on `pointerleave`.
- `grid-template-rows` animates layout. Keep expandable content short and animate one card at a time.
- Reserve media space with `width`/`height` or `aspect-ratio` (CLS ≤ 0.1). Lazy-load offscreen card images.
- Long grids: `content-visibility: auto` (`references/components/lists-collections.md`).

## Accessibility

- There is no APG card pattern. Use `<article>` with a heading and one primary link. The link text is the card's accessible name.
- Keyboard: Tab reaches the primary link, then each secondary action. Enter follows the link. Never put `role="button"` or `tabindex` on the card itself.
- Expandable cards follow the APG **Disclosure (Show/Hide)** pattern: a `<button>` with `aria-expanded` and `aria-controls`.
- The focus outline must surround the whole card and never be clipped (WCAG 2.4.7). Avoid `overflow: hidden` on the card; clip only the media.
- Tilt is decoration and needs no alternative. The card works fully without it (2.5.1).
- Shared-element morphs must leave focus on the detail page's heading or main content after navigation.
- Keep text contrast at 4.5:1 over media overlays at the hover state too (1.4.3).

## Libraries

None needed. For tilt, prefer a small custom implementation (`references/effects/depth-layers.md`) over the stale tilt packages. In React, Motion `layout` and `layoutId` handle shared elements, and GSAP Flip works anywhere. Status and caveats: `references/libraries.md`.

## Pitfalls

- The overlay link blocks text selection inside the card. Keep selectable text (prices, codes) above the overlay, or accept the trade-off.
- `overflow: hidden` on the card clips the focus outline and the lift shadow.
- Two elements with the same `view-transition-name` abort the transition. Name one card at a time.
- Images without dimensions shift the grid as they load.
- Tilt left on touch devices, where it fights scrolling.
- Expandable content still reachable by Tab while collapsed. Use `visibility: hidden` or `hidden`, never just height 0.
