# Page transitions

> Keywords: page transition, route transition, view transitions api, view-transition-name, cross-document transition, same-document transition, shared element transition, page swap, crossfade, wipe, slice wipe, vhs wipe, bfcache, scroll restoration, focus management, route announcement, transición de página, cambio de ruta
> Summary: How to animate route changes with the View Transitions API and a FLIP fallback, including shared elements, style wipes, exact reduced-motion behavior, and the focus and scroll rules.

A page transition explains that the new screen is the same product and where the old content went. It runs between two stable pages, never in place of rendering them: the destination must be usable the moment it arrives.

## When to use

| Fits | Pattern | Tier |
| --- | --- | --- |
| Marketing site, brand page, or portfolio between static routes | Cross-document crossfade | T1 |
| Gallery index to detail, card to article | Shared element on one image or title | T1 |
| SPA or router-driven app | Same-document transition around the route commit | T2 |
| A style that names its own transition (hard cut, slice wipe, VHS wipe) | `clip-path` wipe on the new snapshot | T1 |
| Multi-step flow where continuity matters (onboarding, checkout review) | Crossfade only, no shared element | T1 |

## When not to use

- Forms with unsaved input, payment steps, and destructive confirmations. A transition that delays the result reads as hesitation.
- Search results, keyboard-driven lists, and docs navigation where the user navigates several times a minute: keep the swap under 200 ms or use none.
- Cross-origin navigation. The API needs same-origin documents; a link to another site cannot be animated.
- When scroll restoration or focus cannot be kept correct. Losing the reading position costs more than the transition gains.
- As a load-time cover for a slow page. Prefetch and render faster instead.
- Any transition longer than `--kui-duration-xl`, or one that plays on every click including back and forward.
- Reduced-motion users: never a shared element, never a wipe.

## How it works

| Mechanism | Scope | Support | Notes |
| --- | --- | --- | --- |
| `@view-transition { navigation: auto }` | Cross-document, same origin | Limited | Both documents must opt in |
| `document.startViewTransition(update)` | Same-document | Newly available | Returns `ready`, `updateCallbackDone`, `finished` |
| `pageswap` / `pagereveal` | Cross-document lifecycle | Limited | Name the outgoing and incoming shared element here |
| FLIP with the Web Animations API | In-page moves | All | Fallback for shared elements inside one document |
| Framework router transitions | SPA | All | Same rules, different hooks |

Lifecycle, in order:

| Step | Hook | Do |
| --- | --- | --- |
| Leaving | `pageswap` or the click | Set `view-transition-name` on the one outgoing element |
| Snapshot | Browser | Keep the page visually stable; no layout shifts in this frame |
| Arriving | `pagereveal` | Name the matching incoming element, set `data-nav` for direction |
| Update | `updateCallbackDone` | Render the new route; keep it synchronous and fast |
| Animate | `::view-transition-old/new/group` | Crossfade or wipe with the motion tokens |
| Settle | `finished` | Move focus, restore scroll, announce the route |

Timing:

| Change | Duration | Easing |
| --- | --- | --- |
| Outgoing snapshot | `--kui-duration-sm` | `--kui-ease-exit` |
| Incoming snapshot | `--kui-duration-md` | `--kui-ease-enter` |
| Shared element travel | `--kui-duration-lg` | `--kui-ease-standard` |
| Style wipe | `--kui-duration-lg` | `--kui-ease-standard` |
| Hard cap for the whole transition | `--kui-duration-xl` | — |

## Implementation

### Cross-document crossfade (T1)

Add the opt-in to both documents, then shorten the default 250 ms crossfade to the tokens:

```css
@view-transition { navigation: auto; }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"])::view-transition-old(root) {
    animation: kui-page-out var(--kui-duration-sm) var(--kui-ease-exit) both;
  }
  :root:not([data-motion-tier="0"])::view-transition-new(root) {
    animation: kui-page-in var(--kui-duration-md) var(--kui-ease-enter) both;
  }
}
@keyframes kui-page-out { to { opacity: 0; } }
@keyframes kui-page-in { from { opacity: 0; } }
```

No JS is required, and browsers without support navigate normally.

### Shared element (T1)

```css
.card__media { view-transition-name: none; }                    /* never leave it on every card */
.card[data-transition="active"] .card__media,
.detail__media { view-transition-name: card-media; }            /* exactly one per snapshot */
```

```js
// Cross-document: name the element that will travel, just before leaving.
window.addEventListener('pageswap', (event) => {
  if (!event.viewTransition || !event.activation?.entry) return;
  const card = document.querySelector(`[data-key="${event.activation.entry.url}"]`);
  card?.setAttribute('data-transition', 'active');
});
window.addEventListener('pagereveal', (event) => {
  if (!event.viewTransition) return;
  const type = performance.getEntriesByType('navigation')[0]?.type;
  document.documentElement.dataset.nav = type === 'back_forward' ? 'back' : 'forward';
});
```

Set the name on click or in `pageswap`, never permanently: a named element is snapshotted on every navigation. More than one element with the same name aborts the whole transition.

### Same-document route change (T2)

```js
export async function routeWithTransition(render) {
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    || Number(root.dataset.motionTier ?? 1) === 0;
  if (still || !document.startViewTransition) { render(); return; }

  const transition = document.startViewTransition(render);
  await transition.updateCallbackDone;      // content is live now; never await `finished` first
  document.querySelector('main')?.focus({ preventScroll: true });
}
```

`render()` must update the DOM synchronously, keep the same layout skeleton, and not fetch inside the callback. To abort (double click, cancelled navigation), call `transition.skipTransition()`.

### Style wipe (T1, one signature per product)

```css
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"])::view-transition-old(root) { animation: none; }
  :root:not([data-motion-tier="0"])::view-transition-new(root) {
    animation: kui-wipe var(--kui-duration-lg) var(--kui-ease-standard) both;
  }
}
@keyframes kui-wipe { from { clip-path: inset(0 0 0 100%); } }
```

The old snapshot must stop animating (`animation: none`) or the two layers fight and the wipe looks like a double exposure. Mirror the direction for back navigation (`inset(0 100% 0 0)`) via `data-nav="back"`.

### Focus, scroll, and announcement

```js
export function settleRoute(main) {
  main.focus({ preventScroll: true });                       // <main tabindex="-1">
  const status = document.getElementById('route-status');
  if (status) status.textContent = document.title;           // polite announcement
  if (history.scrollRestoration === 'manual') window.scrollTo(0, 0);
}
```

Leave `history.scrollRestoration` at its default unless you restore positions yourself: browsers already restore back and forward correctly, and overriding it breaks them.

Framework notes: Next.js and React Router wrap the commit in `document.startViewTransition`; Nuxt and SvelteKit expose navigation hooks; Astro's `<ClientRouter />` enables cross-document transitions and disables them under reduced motion itself. See `references/platforms/web-frameworks.md`. Native equivalents: Flutter `Hero` and `PageRouteBuilder`, SwiftUI `matchedGeometryEffect` and `NavigationTransition`, Compose `SharedTransitionLayout`; see `references/platforms/flutter.md`, `references/platforms/swiftui.md`, and `references/platforms/jetpack-compose.md`.

## Reduced motion

Exact T0 behavior:

| Path | T0 |
| --- | --- |
| Cross-document | `@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }`: a normal instant navigation, no crossfade, no wipe |
| Same-document | `startViewTransition` is never called; the router renders directly and the page swaps at once |
| Shared element | Removed: the same image appears in its new position with no travel or morph |
| Style wipe | Removed; the incoming page is simply there |
| Focus, scroll, title, announcement | Identical to the animated path |
| Fallback when a transition still runs | Only the token-collapsed crossfade, ≤200 ms, no shared element |

No transition may hide the incoming page at T0, and the back button must feel immediate. A 200 ms crossfade is the ceiling, not a target.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Cross-document and same-document transitions, one shared element, one style wipe, prefetched next route | Nothing beyond the one-name cap |
| T2 | Crossfade plus one shared element, same-document via the API | Style wipe, prefetch beyond the next likely link |
| T1 | Cross-document crossfade only, where supported; plain instant navigation otherwise | Wipe, shared elements, JS-driven transitions |
| T0 | As in Reduced motion | Everything above |

On Save-Data, skip prefetch and keep the crossfade; never load a transition library to replace a native feature the browser already ships.

## Performance budget

- Both snapshots are rasterized: keep the transition on `opacity`, `clip-path`, and `transform`. Animating `filter: blur()` on a root snapshot repaints the full viewport every frame.
- Name one or two elements, not a gallery. Each name is an extra snapshot and a memory cost proportional to its box.
- Total transition time stays at or under `--kui-duration-xl`; target `--kui-duration-md` for product navigation.
- The destination must render before the animation is awaited: never block content on `transition.finished`.
- Prefetch the next route at T2+ with `rel="prefetch"` or speculation rules; at T1 rely on HTTP caching.
- Keep the server response cacheable. `Cache-Control: no-store` disables bfcache, so back navigation re-renders and the transition replays instead of restoring instantly.
- Verify INP during navigation: the click handler must return before the snapshot work, and the render callback must stay under one frame of scripting.

## Accessibility

- Move focus to the new `<main tabindex="-1">` or `<h1>` and announce the route in a `role="status"` region; the URL change alone is silent for screen readers (WCAG 4.1.3, 2.4.3).
- Update `document.title` and the current item in the navigation (`aria-current="page"`); back and forward must restore the previous state.
- The transition never traps focus, never steals a keypress, and never requires a second activation to reach the new page (WCAG 2.1.1, 2.4.7).
- A wipe covers the viewport mid-frame: keep text off the moving edge, keep the panel opaque, and never let contrast drop during the sweep (WCAG 1.4.3).
- No strobing or rapid alternation; a wipe is one pass, well under 3 flashes per second (WCAG 2.3.1).
- Motion follows `prefers-reduced-motion` in both CSS and JS, and the in-product "Reduce motion" toggle forces T0 (WCAG 2.3.3). See `references/foundations/accessibility-motion.md`.
- A skip link, the focus ring, and `position: sticky` headers survive the swap; test with the keyboard only.

## Libraries

Native View Transitions first; FLIP for in-page moves, as described in `references/foundations/motion-principles.md`. Motion (`AnimatePresence`, `layoutId`) and GSAP `Flip` cover SPA route and list transitions; AutoAnimate handles in-list swaps. Framework routers already provide the hooks. Versions, licenses, and caveats: `references/libraries.md`. Depth-based swaps are covered in `references/effects/depth-layers.md`.

## Pitfalls

- The same `view-transition-name` on two elements: the whole transition aborts and only the root crossfade remains. Prefix names per item and remove them after the transition.
- A permanent `view-transition-name` on every card: each navigation snapshots a large box and memory climbs.
- Awaiting `transition.finished` before rendering: a blank page for the length of the animation.
- Async work inside the update callback (a fetch, a route loader): the snapshot freezes on the old content and the transition looks broken.
- Forgetting the no-API path, or wrapping `startViewTransition` in a `try` that leaves the route unrendered.
- Animating `clip-path` on a layer that also crossfades: two effects on one snapshot read as a glitch, not a wipe.
- Scroll restoration set to `manual` without a restore step: every route starts at the top, including back.
- A transition on form submit or after a POST: it hides the validation result and invites double submission.
- Reduced motion handled only in CSS while the router still calls `startViewTransition`: the JS path keeps animating.
- `Cache-Control: no-store` on HTML: bfcache is lost and back navigation replays the transition from scratch.
