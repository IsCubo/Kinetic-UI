# Lists and collections

> Keywords: list, unordered list, ordered list, data grid, item list, card grid, virtualized list, infinite scroll, content-visibility, aria-setsize, aria-posinset, accordion, show more, pagination, filtering, search filtering, reorderable list, drag reorder, keyboard reorder, empty state, skeleton, loading state, lista, colección
> Summary: How lists, grids, and large collections behave: correct list semantics, virtualized scrolling, accordion and show-more, filtering and reorder motion, with reduced-motion and low-end rules.

## When to use

| Pattern | Use for |
| --- | --- |
| Plain list (`ul`/`ol`) | Unordered or ordered rows that read vertically: filters, settings, transactions |
| Card grid | Comparable items with media or rich content (see `references/components/cards.md`) |
| Virtualized collection | Very long lists (hundreds to thousands of rows) where DOM size would hurt |
| Infinite scroll / show more | Feeds and catalogs where scanning depth beats precise access |
| Accordion | Grouped detail content where one or two sections are open at a time |
| Filterable collection | Searchable/filterable catalog where results change live |
| Reorderable list | Queues, playlists, priorities where order is user-controlled data |

## When not to use

- Virtualization below ~100 rows: complexity for nothing, and the browser already handles real DOM fine.
- Infinite scroll for tasks that need an end or a footer: use pagination or show-more.
- Accordion for content most users must see: hide nothing essential; show it directly.
- Reordering where the order means nothing to the user's next action.
- Carousels for scans and comparisons: see `references/components/carousels-galleries.md`.
- `table` semantics hacked into a card layout. Keep `<table>` for tabular data.

## How it works

Anatomy: **container** (semantic `ul`, `ol`, or `table`) · **rows** (li, each with a primary target and optional secondary actions) · **separators or gaps** · optional **filter controls** (`references/components/inputs-forms.md`) bound to a result count · optional **accordion toggles** · optional **drag handles** with keyboard alternatives · optional **result status** (`role="status"`).

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Rest (idle) | — | Rows at surface with separators; primary target visible | — | — |
| Hover | Pointer over a row (`hover: hover`) | State-layer tint over the row; affordance (chevron) shifts to full opacity | `--kui-duration-xs` | `--kui-ease-standard` |
| Focus-visible | Keyboard focus on a row, row action, or toggle | 2px outline, no motion | none (instant) | — |
| Pressed | `:active` on a row link or action | Scale to `--kui-scale-press` on card-shaped targets; tint only on full-width rows | `--kui-duration-xs` | `--kui-ease-standard` |
| Loading | First fetch, later pages, or refetch | Skeleton rows sized like the final rows (no spinners for list content) | none (instant) | — |
| Empty | No items match or exist | One empty-state block: sentence, one action | `--kui-duration-sm` | `--kui-ease-standard` |
| Error | Fetch fails | Error row with retry; existing items stay | `--kui-duration-sm` | `--kui-ease-standard` |
| Filtering | Query changes | Outgoing rows fade and collapse; incoming rows fade in without restagger | `--kui-duration-md` | `--kui-ease-standard` |
| Open (accordion) | Toggle pressed | Region opens (grid rows 0fr → 1fr), chevron rotates 180° | `--kui-duration-md` | `--kui-ease-enter` |
| Closed (accordion) | Toggle pressed again | Region closes | `--kui-duration-sm` | `--kui-ease-exit` |
| Show more | "Show more" pressed | One batch of rows joins without a full restagger beyond the first few | `--kui-duration-sm` | `--kui-ease-enter` |
| Dragging (reorder) | Row grabbed | Lifted shadow and scale to `--kui-scale-pop`; siblings open a gap | `--kui-duration-sm` | `--kui-ease-spring` |
| Reordered (drop) | Row released | Siblings FLIP into place; focus stays on the moved row | `--kui-duration-md` | `--kui-ease-standard` |

Total on-page entrance stagger caps near 300 ms: stagger groups, then let the tail enter with the last one (`--kui-stagger`).

## Implementation

```html
<ul class="list" role="list"> <!-- role="list" restores semantics Safari drops under list-style: none -->
  <li class="list__row">
    <a class="list__link" href="/trails/9">Rim trail loop</a>
    <span class="list__meta">8 km</span>
    <button class="list__handle" type="button" aria-label="Move Rim trail loop">⠿</button>
  </li>
</ul>
<p class="list__status" role="status" aria-live="polite">18 of 240 results</p>
```

```css
.list { display: grid; gap: 0.25rem; padding: 0; list-style: none; }
.list__row { position: relative; display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem; border-radius: var(--brand-radius); background: var(--brand-surface); }
.list__row::before { content: ""; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit; background: color-mix(in oklab, var(--brand-on-surface) 6%, transparent); opacity: 0;
  transition: opacity var(--kui-duration-xs) var(--kui-ease-standard); }
@media (hover: hover) { .list__row:hover::before { opacity: 1; } }
.list__row:focus-within::after { content: ""; position: absolute; inset: 0;
  border: 2px solid var(--brand-accent); border-radius: inherit; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .list__row { transition: opacity var(--kui-duration-sm) var(--kui-ease-standard); }
}
.list__row { content-visibility: auto; contain-intrinsic-size: auto 64px; } /* cheap first pass at long lists */
```

Filtering (transform-based, no layout animation for the moved rows):

```js
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.dataset.motionTier === '0';

export function applyFilter(list, predicate, status) {
  [...list.children].forEach((row) => {
    const show = predicate(row);
    if (still()) { row.hidden = !show; return; }
    if (!show) {
      row.animate({ opacity: 0 }, { duration: 100 }).finished.then(() => { row.hidden = true; });
    } else if (row.hidden) {
      row.hidden = false;
      row.animate({ opacity: [0, 1] }, { duration: 150, easing: 'ease-out' });
    }
  });
  status.textContent = `${[...list.children].filter((r) => !r.hidden).length} of ${list.children.length} results`;
}
```

Keep moved-row geometry with the FLIP pattern from `references/foundations/motion-principles.md`, or wrap the reorder/filter splice in `document.startViewTransition` for one deterministic morph. Filter wiring and input placement: `references/components/inputs-forms.md`.

Virtualization (the shape; prefer a library for production) — spacer + windowed rows, always labeled with position metadata:

```js
export function windowList(viewport, spacer, rowHeight, renderRow, count, overscan = 6) {
  viewport.appendChild(spacer); spacer.style.height = `${count * rowHeight}px`;
  const render = () => {
    const start = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - overscan);
    const span = Math.ceil(viewport.clientHeight / rowHeight) + overscan * 2;
    viewport.replaceChildren(spacer, ...Array.from({ length: Math.min(span, count - start) },
      (_, k) => renderRow(start + k, count)));
  };
  const frame = () => requestAnimationFrame(render);
  viewport.addEventListener('scroll', frame, { passive: true });
  render();
}

// renderRow(index, count) sets aria-posinset={index+1} and aria-setsize={count} on each row,
// so assistive tech hears position even when only a window is live.
```

Accordion: reuse the disclosure markup from `references/components/cards.md` (button with `aria-expanded` + `aria-controls`, grid-rows opening), one open at a time is a choice, not a requirement. Show-more: append one batch as a single `<button aria-controls>` region; announce appended count in `role="status"`.

Reorder:

```js
export function reorder(list, from, to) {
  const rows = [...list.children];
  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);
  // FLIP settled rows with the motion-principles helper, or wrap the splice in startViewTransition.
  list.replaceChildren(...rows);
  moved.querySelector('.list__link')?.focus();  // focus never leaves the list; keyboard parity below
}
```

Keyboard reorder: "Move up"/"Move down" buttons with visible labels (not only the drag handle), each triggering the same `reorder`. Pointer drag states and lift styling: `references/effects/depth-layers.md`.

Above-the-list guidelines: sticky headers 44 px tall; row min-height 44 px on touch surfaces (`references/foundations/devices-responsive.md`). For frameworks: 1) React filters and virtualization wiring: `references/platforms/web-frameworks.md`; 2) Flutter/Compose/SwiftUI ship virtualized list primitives (`ListView.builder`, `LazyRow`/`LazyColumn`, `List` + `ScrollView`), keep their recycling and add the same aria/announcements: `references/platforms/flutter.md`, `references/platforms/jetpack-compose.md`, `references/platforms/swiftui.md`.

## Reduced motion

T0 behavior, exactly:
- Filtering, show-more, and reorder changes apply instantly: rows appear or disappear with no fade, no collapse, no FLIP.
- Accordion opens/closes instantly (`details`/`summary` do this by default); the chevron flips without rotation.
- Skeleton load still fine (it is not state animation). Empty-state and error messages appear without motion.
- Hover and focus keep their tint and outline; no travel, no scale.
- `content-visibility` windowing and virtualization run unchanged: they are structure, not motion.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2; may add subtle shared-element morphs between the list card and an in-place detail view |
| T2 | Animated filtering (fade + FLIP), animated reorder, accordion open/close, entrance stagger capped at 300 ms |
| T1 | CSS only: hover/focus tints, instant accordion (`details`), instant filter swap. No FLIP, no drag animation, no stagger |
| T0 | As in Reduced motion |

## Performance budget

- `content-visibility: auto` + `contain-intrinsic-size` on rows keeps long lists cheap even without JS virtualization.
- Virtualized lists: recycle DOM, not layout math — one rAF-throttled scroll handler, nothing else per frame; budget ~2× visible rows in DOM.
- Animate `opacity` and `transform` only. Never animate `height`/`max-height` for filtering; collapse via `hidden` + fade, or move geometry with FLIP (transform, compositor-only).
- Stagger entrance by groups: never delay the 60th row; cap total stagger at ~300 ms.
- Skeletons must match final row heights to avoid reflow when data lands (CLS ≤ 0.1).
- Page and virtualize before 1000+ rows hit the DOM; measure with a low-tier profile.

## Accessibility

- Use `ul`, `ol`, or `table` natively; if `display: grid`/`list-style: none` strips list semantics (Safari/WebKit), add `role="list"` back.
- Virtualized rows carry `aria-setsize` (total) and `aria-posinset` (1-based position); keep row focus targets stable across recycle.
- Never move keyboard focus to `<body>` through a scrollTo/recycle: maintain or restore focus to the same logical row; moving focus during scroll without user intent is banned ("focus follows keyboard, not virtualization").
- Accordion follows the APG Disclosure pattern: `<button aria-expanded aria-controls>`, region content reachable, `visibility: hidden` keeps closed content out of tab order.
- Filter results count announced via `role="status"` (4.1.3 Status Messages); the filter input itself manages its own announcements (`references/components/inputs-forms.md`).
- Reordering must work with the keyboard: dedicated move buttons, no pointer-only drag (2.5.1, 2.5.7). Focus stays on the moved row; announce the new position through a live region.
- Hover-only affordances (drag handles, row actions) must also be focus-reachable and visible on touch.
- WCAG: 2.4.7 focus visible; 2.5.8 targets ≥24×24 px (≥44×44 px on coarse pointers); 1.4.3 row text 4.5:1.
- Motion in the row cannot carry meaning alone: pair reorder/gap/scale with the item count change or a textual confirmation.

## Libraries

TanStack Virtual or react-window for virtualization; dnd-kit or SortableJS for drag reorder; content-visibility + `role="status"` alone cover most cases with no dependency. Versions and caveats: `references/libraries.md`.

## Pitfalls

- Removing `list-style` without `role="list"`: screen readers stop announcing the list in Safari.
- Animating row `height` for filter/remove: every frame is layout; fade + `hidden` instead.
- Focus lost to `<body>` on scroll or reorder (recycle without restoring the row).
- `aria-setsize`/`aria-posinset` missing on windowed rows: assistive tech sees only the window and reports the wrong item count.
- Staggering every new batch on show-more: repeated animations fatigue; stagger only a fresh view, once.
- Virtualization below ~100 items, or a virtualized list inside a nested scroll container nobody sized.
- Hover tint left as the only row affordance (fails on touch and for keyboard users).
- Skeletons taller than the real rows: content jumps when data lands.
- Infinite scroll without "Show more" or pagination in tasks that need boundaries; keep a static footer reachable.
- `replaceChildren` nuking focus and scroll position mid-fling: preserve scrollTop or debounce renders.
