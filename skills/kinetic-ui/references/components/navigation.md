# Navigation

> Keywords: navigation, navbar, top bar, app bar, header, sticky header, hide on scroll, headroom, mega menu, dropdown navigation, drawer, side menu, hamburger, bottom navigation, tab bar, tabs as navigation, breadcrumbs, skip link, aria-current, floating bottom bar, floating nav, notched bottom bar, cutout nav, concentric notch, cradle, protruding circle, V-shaped notch, menú, navegación, barra flotante, muesca, cuna
> Summary: How navigation components behave: top bar, sticky and hide-on-scroll header, mega menu, drawer, bottom navigation, tabs as navigation, breadcrumbs, and skip link, with reduced-motion and low-end rules.

## When to use

| Component | Use for |
| --- | --- |
| Top bar | Every site: brand, primary destinations, utilities (search, account) |
| Sticky header | Long pages where users jump between sections or need persistent actions |
| Hide-on-scroll header | Reading-heavy pages on small screens; reveals on scroll up |
| Mega menu | Sites with many second-level destinations (retail, docs, universities) |
| Drawer | Primary navigation on narrow screens, or secondary navigation in apps |
| Bottom navigation | Mobile apps and app-like sites with 3–5 top destinations |
| Tabs as navigation | Sibling views of one object (Overview, Activity, Settings) |
| Breadcrumbs | Hierarchies three or more levels deep |
| Skip link | Every page with repeated navigation before the main content |

## When not to use

- A hamburger drawer on desktop when the destinations fit in the top bar. Hidden navigation gets used less.
- Hide-on-scroll on pages where the header holds a primary action users need while scrolling (cart, compose).
- Mega menus that open on hover only. Keyboard and touch users cannot open them.
- `role="menu"` for site navigation. It forces application-menu keyboard rules, so use links and disclosure buttons.
- Bottom navigation for more than 5 destinations, or for actions (use a FAB or toolbar).
- Breadcrumbs on flat sites, or as the only navigation.

## How it works

Anatomy: **skip link** → **header** (brand, primary `<nav>`, utilities, menu button) → **mega panel** (grouped links with group headings) → **drawer** (modal `<dialog>`) → **bottom navigation** (icon + label links) → **breadcrumbs** (`<nav>` + ordered list) → **section tabs** (links with an active indicator). Mark the current destination with `aria-current="page"`.

### States

| State | Trigger | Visual change | Duration token | Easing token |
| --- | --- | --- | --- | --- |
| Skip link shown | Keyboard focus | Slides in from above the viewport | `--kui-duration-sm` | `--kui-ease-enter` |
| Header condensed | Page scrolled past 0 | Solid surface, elevation layer fades in | `--kui-duration-sm` | `--kui-ease-standard` |
| Header hidden | Scroll down past the header height | Translates up by its own height | `--kui-duration-md` | `--kui-ease-exit` |
| Header revealed | Any scroll up, or focus inside | Translates back to 0 | `--kui-duration-md` | `--kui-ease-enter` |
| Link hover | Pointer over a link | Underline grows (`scale` X 0 → 1) | `--kui-duration-sm` | `--kui-ease-standard` |
| Mega menu open | Click, Enter, or Space on the trigger | Panel fades in and drops `--kui-distance-sm` | `--kui-duration-md` | `--kui-ease-enter` |
| Mega menu close | Esc, outside click, focus leaves | Panel fades out | `--kui-duration-sm` | `--kui-ease-exit` |
| Drawer open | Menu button | Slides in from the inline-start edge, backdrop fades | `--kui-duration-lg` | `--kui-ease-enter` |
| Drawer close | Esc, close button, backdrop click | Slides out | `--kui-duration-md` | `--kui-ease-exit` |
| Bottom nav select | Tap or Enter | Indicator pill grows behind the icon; icon switches to filled | `--kui-duration-md` | `--kui-ease-standard` |
| Tab indicator move | Activating another section tab | Indicator slides and resizes to the new tab | `--kui-duration-md` | `--kui-ease-standard` |

## Implementation

Skip link (first element in `<body>`):

```html
<a class="skip-link" href="#main">Skip to main content</a>
<main id="main" tabindex="-1">…</main>
```

```css
.skip-link {
  position: fixed; inset-block-start: 0.5rem; inset-inline-start: 0.5rem; z-index: 100;
  padding: 0.75rem 1rem; border-radius: var(--brand-radius);
  background: var(--brand-primary); color: var(--brand-on-primary);
  translate: 0 -200%;
}
.skip-link:focus { translate: 0 0; }
```

Sticky, hide-on-scroll header:

```css
.site-header { position: sticky; inset-block-start: 0; z-index: 10; background: var(--brand-surface); }
.site-header[data-hidden] { translate: 0 -100%; }
html { scroll-padding-block-start: 5rem; }   /* anchors and focused elements clear the header (WCAG 2.4.11) */
@media (prefers-reduced-motion: no-preference) {
  .site-header { transition: translate var(--kui-duration-md) var(--kui-ease-enter); }
  .site-header[data-hidden] { transition-timing-function: var(--kui-ease-exit); }
}
```

```js
const header = document.querySelector('.site-header');
let lastY = scrollY;
let queued = false;
addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    const tier = Number(document.documentElement.dataset.motionTier ?? 1);
    if (Math.abs(y - lastY) > 8) {                    // ignore jitter
      const down = y > lastY && y > header.offsetHeight;
      header.toggleAttribute('data-hidden', tier > 0 && down && !header.contains(document.activeElement));
      lastY = y;
    }
    header.toggleAttribute('data-condensed', y > 0);
    queued = false;
  });
}, { passive: true });
header.addEventListener('focusin', () => header.removeAttribute('data-hidden'));
```

Mega menu, using the disclosure navigation pattern:

```html
<nav aria-label="Main">
  <ul class="nav">
    <li class="nav__item">
      <button type="button" aria-expanded="false" aria-controls="mega-products">Products</button>
      <div id="mega-products" class="mega" hidden>…grouped links with headings…</div>
    </li>
    <li><a href="/pricing" aria-current="page">Pricing</a></li>
  </ul>
</nav>
```

```css
.mega { display: grid; opacity: 1; translate: 0 0; }
.mega[hidden] { display: none; opacity: 0; translate: 0 calc(-1 * var(--kui-distance-sm)); }
@media (prefers-reduced-motion: no-preference) {
  .mega { transition: opacity var(--kui-duration-md) var(--kui-ease-enter), translate var(--kui-duration-md) var(--kui-ease-enter),
    display var(--kui-duration-md) allow-discrete; }
  @starting-style { .mega:not([hidden]) { opacity: 0; translate: 0 calc(-1 * var(--kui-distance-sm)); } }
}
```

```js
for (const item of document.querySelectorAll('.nav__item')) {
  const button = item.querySelector('[aria-expanded]');
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const set = (open) => { button.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { set(false); button.focus(); }
  });
  item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) set(false); });
}
```

Close the other panels when one opens. Optional hover intent: open after ~150 ms of hover and close ~300 ms after the pointer leaves, always in addition to click.

Drawer: a modal `<dialog>` opened with `showModal()`, so focus containment, Esc, and the inert page come for free (`references/components/overlays.md`).

```css
.drawer { margin: 0; inline-size: min(20rem, 85vw); block-size: 100dvh; max-block-size: none; translate: -100% 0; }
.drawer:dir(rtl) { margin-inline-start: auto; translate: 100% 0; }
.drawer[open] { translate: 0 0; }
@starting-style { .drawer[open] { translate: -100% 0; } .drawer[open]:dir(rtl) { translate: 100% 0; } }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .drawer {
    transition: translate var(--kui-duration-lg) var(--kui-ease-enter), overlay var(--kui-duration-lg) allow-discrete, display var(--kui-duration-lg) allow-discrete;
  }
}
```

Bottom navigation: links, never buttons. Always show labels, and respect the safe area.

```html
<nav class="bottom-nav" aria-label="Primary">
  <a href="/" aria-current="page"><svg aria-hidden="true" width="24" height="24"><use href="#i-home"></use></svg><span>Home</span></a>
  <a href="/search"><svg aria-hidden="true" width="24" height="24"><use href="#i-search"></use></svg><span>Search</span></a>
</nav>
```

`.bottom-nav { position: fixed; inset-inline: 0; inset-block-end: 0; padding-block-end: env(safe-area-inset-bottom); }`. Pad the page end by the bar's height.

### Floating bottom bar with a protruding circle and a concentric notch

A variant seen in native apps: the bar floats inset from the screen edges, the active item is a solid circle that pokes above the bar's top edge, and the bar surface is carved around it so the circle looks detached rather than wedged in.

Two rules decide whether this reads as intended or as a broken shape, independent of the platform:

1. **Carve the notch as an arc of the circle concentric with the icon**, not as two mirrored curves (Bézier or otherwise) meeting at a point under the icon. A concentric arc — same center as the icon, radius = `iconRadius + gap` — is, by construction, exactly `gap` away from the icon at every point of its circumference. Two curves meeting at a point only guarantee that distance at the meeting point; everywhere else the gap can pinch toward zero, which reads as a "V" that appears to touch the icon even when the center point is technically clear.

   Geometry, in the bar's local coordinates (`centerX`, `barTop` = y of the bar's top edge, `circleCenterY` = y of the icon circle's center, `cageRadius = iconRadius + gap`):

   ```
   dy = circleCenterY - barTop
   dx = sqrt(cageRadius² - dy²)                       // half-width of the notch at the bar's edge
   leftAngle  = atan2(-dy, -dx)                        // tangent point, left of centerX
   rightAngle = atan2(-dy,  dx)                        // tangent point, right of centerX
   capSweep   = rightAngle - leftAngle                 // the small arc that already pokes above the bar
   sweep      = -(360 - capSweep)                      // sweep the long way, through the bottom
   ```

   Draw a line to `(centerX - dx, barTop)`, an arc of the circle `(center = (centerX, circleCenterY), radius = cageRadius)` from `leftAngle` sweeping `sweep` degrees, then continue the bar's outline from `(centerX + dx, barTop)`. On the web, build the same shape with an SVG `<path>` (`A` arc command) or a `clip-path: path(...)`; in Canvas/Skia-backed APIs (Compose `Path.arcTo`, SwiftUI `Path.addArc`, Flutter `CustomClipper` with `Path.arcTo`) the same two angles and one arc apply directly.

   Clamp `cageRadius` near the bar's rounded corners (`min(cageRadius, centerX - corner, barWidth - corner - centerX)`) instead of distorting the arc into an ellipse, so end items keep a clean circular cutout, just a smaller one.

2. **The notch is invisible without real contrast or elevation.** The cutout only shows whatever is behind the bar. If the bar's surface color is close to the page background (a common case: a white bar on an `#f6f8fa`-ish page), the gap reads as nothing no matter how wide the arc is — widening the notch does not fix a contrast problem. Either keep the bar's surface clearly distinct from the page, or give the bar a real elevation/shadow (native `shadowElevation`/`elevation`, or a CSS `box-shadow`) so the shadow falls through the cutout and makes the cradle read. A flat `Canvas`/SVG fill cannot cast a shadow from an arbitrary path; wrap the same path in a native shape (Compose `Shape` + `graphicsLayer { shadowElevation }`, SwiftUI `.shadow` on a `Path`-backed shape, a Flutter `ClipPath` + `PhysicalShape`) or, on the web, approximate it with `filter: drop-shadow()` on an SVG mask.

Also give the protruding circle enough height that the active item's label has clearance underneath it: if the circle's bottom edge sits close to the bar's bottom padding, the label crowds the circle instead of sitting clearly inside the floating bar.

Tabs as navigation. When each tab is its own URL, use links in a `<nav>` with `aria-current="page"`, not `role="tab"`. Use the APG Tabs pattern only for in-page panels. Move one indicator with `translate` and `scale` rather than `width`:

```js
function moveIndicator(nav, active) {
  const bar = nav.querySelector('.tabs__indicator');      // 100px wide, transform-origin: left
  bar.style.translate = `${active.offsetLeft}px 0`;
  bar.style.scale = `${active.offsetWidth / 100} 1`;
}
```

Breadcrumbs (APG Breadcrumb pattern; separators are CSS, so screen readers skip them):

```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumb">
    <li><a href="/">Home</a></li>
    <li><a href="/guides">Guides</a></li>
    <li><a href="/guides/motion" aria-current="page">Motion</a></li>
  </ol>
</nav>
```

```css
.breadcrumb { display: flex; flex-wrap: wrap; list-style: none; padding: 0; }
.breadcrumb li + li::before {
  content: ""; display: inline-block; block-size: 0.8em; margin-inline: 0.5rem;
  border-inline-end: 1px solid currentColor; rotate: 15deg;
}
```

Native: Flutter `NavigationBar`, `NavigationDrawer`, `TabBar`, `SliverAppBar(floating: true)`; SwiftUI `TabView`, `NavigationStack`, `NavigationSplitView`; Compose `NavigationBar`, `ModalNavigationDrawer`, `TopAppBar` with `TopAppBarDefaults.enterAlwaysScrollBehavior()`. See `references/platforms/`.

## Reduced motion

T0 behavior, exactly:
- Skip link: appears instantly in place, with no slide.
- Header: never hides on scroll (`tier > 0` guard) and stays pinned. The condensed surface change fades in `--kui-duration-sm`.
- Mega menu: opens and closes instantly, or with an opacity fade of `--kui-duration-sm`. No drop, because the distance tokens become 0.
- Drawer: appears instantly with the backdrop. It does not slide, because the transition is guarded by the OS query and `:root:not([data-motion-tier="0"])`.
- Bottom nav and tab indicator: the indicator jumps to the new item. The icon swaps without growth.
- Link underline: shown without growing.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Same as T2. Navigation never needs GPU effects |
| T2 | Hide-on-scroll with JS, sliding tab indicator, spring-feel pill, hover-intent mega menu |
| T1 | CSS transitions for mega menu, drawer, and underline. Hide-on-scroll still runs (one passive listener) but the tab indicator jumps |
| T0 | As in Reduced motion |

Avoid `backdrop-filter` on the sticky header at T1. Use a solid `--brand-surface`.

## Performance budget

- One passive scroll listener, throttled with rAF. Read `scrollY` once per frame. Never animate `height` or `top` of the header.
- Animate `translate` and `opacity` only. The tab indicator uses `translate` and `scale`, never `width` or `left`.
- `backdrop-filter` on a full-width sticky header repaints on every scroll frame. Use it only at T2+, and test on a low-end device.
- The mega menu must not load images on open if that delays the panel. Preload or omit them.

## Accessibility

- Landmarks: `<header>`, `<nav aria-label="…">` with a unique label per nav, `<main>`, `<footer>` (APG **Landmarks**).
- Mega menu: APG **Disclosure (Show/Hide)** pattern (disclosure navigation menu). A button with `aria-expanded` and `aria-controls`. Enter and Space toggle, Esc closes and returns focus to the button, Tab moves through the links.
- Drawer: APG **Dialog (Modal)** pattern via `<dialog>` and `showModal()`. The menu button has an accessible name ("Menu") and `aria-expanded` while the drawer is open.
- In-page tabs: APG **Tabs** pattern (`role="tablist"`, `tab`, `tabpanel`, `aria-selected`, Left/Right arrows, Home/End). Page-level tabs are links with `aria-current="page"`.
- Breadcrumbs: APG **Breadcrumb** pattern. `aria-current="page"` on the last item.
- WCAG: 2.4.1 Bypass Blocks (skip link). 2.4.11 Focus Not Obscured, so a sticky header and bottom bar never cover the focused element (`scroll-padding`). 3.2.3 Consistent Navigation. 2.5.8 target size, 24×24 px minimum and 44×44 on touch.

## Libraries

None needed. Accessible navigation primitives for React: React Aria, Radix UI. In React, Motion `layoutId` can drive a shared tab indicator. Status and caveats: `references/libraries.md`.

## Pitfalls

- A hide-on-scroll header that hides while focus is inside it. Reveal it on `focusin`.
- A sticky header covering anchor targets and focused fields. Set `scroll-padding-block-start`.
- Mega panels that close when the pointer crosses a gap between the trigger and the panel. Remove the gap or add hover intent.
- A drawer built as a `<div>` with no focus containment or Esc. Use `<dialog>`.
- Bottom navigation with icon-only items. Labels are required for recognition.
- `aria-current` missing, so screen-reader users cannot tell where they are.
- A floating circle's notch carved with two curves meeting at a point under the icon. It reads as a "V" that touches the icon even when the center point has clearance; use one arc concentric with the icon instead.
- A floating notched bar whose surface color nearly matches the page background. The notch is invisible regardless of width; fix the contrast or add a real shadow, don't widen the cutout.
