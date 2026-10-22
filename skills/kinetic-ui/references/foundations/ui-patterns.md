# UI patterns

> Keywords: UI patterns, design patterns, navigation, bottom navigation, tab bar, tabs, navigation drawer, navigation rail, sidebar, breadcrumbs, command palette, onboarding, coach marks, product tour, setup checklist, forms, wizard, stepper, inline validation, inline edit, search, autocomplete, autosuggest, filters, faceted search, filter chips, sort, empty state, progressive disclosure, accordion, popover, data table, master-detail, bulk actions, dashboard, KPI cards, checkout, cart, notifications, toast, snackbar, banner, badge, settings, error recovery, undo, retry, offline, 404 page, hero, gallery, patrones de diseño, patrones UI
> Summary: Catalog of UI design patterns with when to use each, the job motion does in it, and the component file that defines its behavior, plus per-device adaptation and selection rules.

Choose the pattern from the user's task, not from looks. Then open the linked component file for anatomy, states, and timing. "Motion role" uses the purposes defined in `references/foundations/motion-principles.md`: feedback, orientation, focus, continuity, delight, brand. The principles behind these choices live in `references/foundations/ux-principles.md`.

At T0 every motion role below becomes an instant change or a fade of 200 ms or less (`references/foundations/accessibility-motion.md`). The pattern must still work without motion.

## Navigation

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Top navigation bar | Desktop sites with up to about 7 top-level sections | Orientation: the active indicator slides to the new item at `--kui-duration-sm` | `references/components/navigation.md` |
| Bottom navigation bar | Phone apps with 3 to 5 equally important, frequent destinations | Feedback on tap; destinations crossfade with no lateral travel, because siblings have no direction | `references/components/navigation.md` |
| Navigation rail or sidebar | Tablet and desktop apps with many sections or long working sessions | Orientation: expand as an overlay with `transform`; animating `width` costs layout, so limit it to one element at `--kui-duration-md` or less | `references/components/navigation.md` |
| Modal drawer | Secondary destinations on phones, or more than 5 destinations | Continuity: slides from the edge it belongs to with `--kui-ease-enter`; the scrim only fades | `references/components/navigation.md`, `references/components/overlays.md` |
| Tabs | Switching between sibling views of the same object | Orientation: the indicator slides; content crossfades or shifts `--kui-distance-sm` in the tab's direction | `references/components/navigation.md` |
| Breadcrumbs | Hierarchies three or more levels deep, mostly desktop | Feedback only: hover and focus tint | `references/components/navigation.md` |
| Command palette | Keyboard-first and power-user apps with many actions | Feedback: opens at `--kui-duration-sm`; results update instantly with no entrance animation | `references/components/overlays.md`, `references/components/inputs-forms.md` |

## Onboarding

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Contextual onboarding | The default: teach a feature at the moment it is needed | Focus: one short highlight on the new control, at most twice; a static badge at T0 | `references/components/feedback.md` |
| Setup checklist | The product needs configuration before it delivers value | Delight with goal gradient: the check and the progress meter animate on completion | `references/components/feedback.md`, `references/components/selection-controls.md` |
| Coach marks or tour | A redesign or a non-obvious gesture; keep it to about 3 steps (heuristic) | Focus: the spotlight scrim fades and the tooltip anchors to its target | `references/components/overlays.md` |
| Welcome carousel | Rarely: brand storytelling that users can skip at any time | Brand: slide transitions started by the user, never autoplay | `references/components/carousels-galleries.md` |

## Forms

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Single-column form with inline validation | Most data entry | Feedback: validate on blur; the error text fades in below the field without shifting other fields unexpectedly | `references/components/inputs-forms.md` |
| Multi-step form (wizard) | Long forms with natural sections, or when later steps depend on earlier answers | Orientation: forward steps move in the reading direction and back reverses; the stepper shows progress | `references/components/inputs-forms.md`, `references/components/feedback.md` |
| Inline edit | Editing single values in place (tables, profile fields) | Continuity: the value turns into an input in place, with no layout jump | `references/components/inputs-forms.md` |
| Choice controls (radio, checkbox, switch, segmented control) | Choosing among a few known options | Feedback: the check or thumb moves at `--kui-duration-xs` to `--kui-duration-sm` | `references/components/selection-controls.md` |
| Primary and secondary actions | Every form ends in an action | Feedback: press scale `--kui-scale-press`; the button shows its busy state in place | `references/components/buttons.md` |

## Search and filter

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Search with suggestions | Large catalogs and known-item search | Feedback: suggestions appear with no entrance delay; matched text is highlighted | `references/components/inputs-forms.md`, `references/components/lists-collections.md` |
| Faceted filters | Many attributes to narrow by (commerce, data, listings) | Orientation: results crossfade at `--kui-duration-sm`; counts update in place | `references/components/selection-controls.md`, `references/components/lists-collections.md` |
| Filter chips | A few common filters whose state must stay visible | Feedback: chip select state; a removed chip collapses smoothly | `references/components/selection-controls.md` |
| Sort | Lists with more than one meaningful order | Continuity: reorder with FLIP when about 20 items or fewer are visible (heuristic); otherwise swap instantly | `references/components/lists-collections.md` |

## Empty states

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| First-use empty state | No data exists yet | Brand: one quiet illustration entrance; the call to action is the focus | `references/components/feedback.md`, `references/components/buttons.md` |
| No results | A search or filter returned nothing | Feedback only, no celebration: offer "Clear filters" and suggestions | `references/components/feedback.md` |
| Cleared state | The user finished every item (inbox zero, all tasks done) | Delight: a short peak-end celebration, once | `references/components/feedback.md` |

## Progressive disclosure

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Accordion or disclosure | Optional detail, FAQs, long groups of settings | Continuity: the panel expands in place; height animation costs layout, so expand one panel at a time at `--kui-duration-md` | `references/components/lists-collections.md` |
| Show more | Long text or lists in previews | Continuity: expand in place and keep the scroll position | `references/components/cards.md`, `references/components/lists-collections.md` |
| Popover or tooltip | Supplementary information on demand | Feedback: fades and scales slightly from its anchor at `--kui-duration-sm`; also opens on keyboard focus | `references/components/overlays.md` |
| Advanced options | Rare settings that most users never need | Orientation: options reveal directly under their toggle | `references/components/selection-controls.md` |

## Data tables

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Sortable table with sticky header | Comparing many records across many attributes | Feedback only: row hover tint and sort icon rotation; rows never animate in | `references/components/lists-collections.md` |
| Row expand or master-detail | A record needs detail without leaving the list | Continuity: the detail opens from its row (shared element) | `references/components/lists-collections.md`, `references/components/overlays.md` |
| Bulk selection | Acting on many records at once | Feedback: an action bar slides in from the nearest edge once one row is selected | `references/components/selection-controls.md`, `references/components/lists-collections.md` |

## Dashboards

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| KPI cards and charts | Monitoring and at-a-glance status | Focus: animate only values that changed (number tween at `--kui-duration-lg` or less, brief tint); charts draw once on first load, not on every refresh | `references/components/cards.md`, `references/components/feedback.md` |
| Time range and filters | Exploring trends | Continuity: data crossfades while axes and layout stay still | `references/components/selection-controls.md` |

## Checkout

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Cart review | Before payment | Feedback: totals tween on quantity change; a removed item collapses and offers undo | `references/components/lists-collections.md`, `references/components/buttons.md` |
| Guest-first checkout (single page or stepped) | Any purchase flow; never force account creation first | Orientation: the stepper shows progress; motion stays minimal near payment fields | `references/components/inputs-forms.md`, `references/components/feedback.md` |
| Payment submit | The final, irreversible action | Feedback: the button shows progress in place and blocks double submit; success morphs into a check | `references/components/buttons.md` |
| Order confirmation | The end of the flow | Delight: the peak-end moment, played once; a static check at T0 | `references/components/feedback.md` |

## Notifications

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Toast or snackbar | Brief confirmation of a user action, optionally with undo | Feedback: enters from the nearest edge with `--kui-ease-enter`; stays at least ~5 s (heuristic) and pauses on hover and focus | `references/components/feedback.md` |
| Inline banner | Persistent status that concerns the current page | Focus: reserve its space or insert it above content without moving what the user is reading | `references/components/feedback.md` |
| Badge | Count of unseen items | Feedback: pops with `--kui-scale-pop` when the count changes, never on page load | `references/components/feedback.md` |
| Notification center | A history of events | Orientation: the panel opens from its trigger | `references/components/overlays.md`, `references/components/lists-collections.md` |

## Settings

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Grouped settings list | App preferences that apply immediately | Feedback: the switch thumb moves and a "Saved" status appears | `references/components/selection-controls.md`, `references/components/lists-collections.md` |
| Save-or-cancel settings form | Changes that must apply together (billing, security) | Feedback: a sticky save bar appears once the form has changes | `references/components/inputs-forms.md`, `references/components/buttons.md` |

## Error recovery

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Inline field error | Invalid input | Feedback: color, icon, and text together; a shake may only add to them and never runs at T0 | `references/components/inputs-forms.md` |
| Undo | Reversible destructive actions; prefer it over a confirmation dialog | Continuity: the removed item collapses, and undo restores it to its place | `references/components/feedback.md` |
| Confirmation dialog | Irreversible, high-impact actions only | Focus: the dialog fades and scales in, the scrim fades, focus moves to the safe action | `references/components/overlays.md` |
| Retry and offline state | Network or service failures | Feedback: calm status text and a retry button with a busy state; no looping alarm motion | `references/components/feedback.md`, `references/components/buttons.md` |
| Error page (404, 500) | Dead ends | Brand: one quiet brand moment is fine; always offer search and a way home | `references/components/hero-sections.md`, `references/components/buttons.md` |

## Landing and browsing

| Pattern | Use when | Motion role | Component file |
| --- | --- | --- | --- |
| Hero section | Landing and campaign pages | Brand: the page's one orchestrated moment | `references/components/hero-sections.md` |
| Card grid or feed | Browsing mixed items | Continuity: a card opens into its detail; no entrance animation on every card | `references/components/cards.md`, `references/components/lists-collections.md` |
| Media gallery and lightbox | Browsing images or video | Continuity: the lightbox grows from the thumbnail; swiping has button alternatives | `references/components/carousels-galleries.md` |

## Adapt patterns per device

| Pattern | Phone | Tablet or open foldable | Desktop | TV |
| --- | --- | --- | --- | --- |
| Primary navigation | Bottom bar (3 to 5 items) | Navigation rail | Top bar or sidebar | Side rail or top row, driven by focus |
| Filters | Bottom sheet with an apply button | Side sheet | Persistent sidebar | Overlay panel |
| Data table | Stacked cards, or priority columns with horizontal scroll | Table showing priority columns | Full table | Avoid; use lists of tiles |
| Dialog | Full-screen sheet | Centered dialog | Centered dialog | Centered dialog with focus kept inside |
| Master-detail | Push to a new screen | Side by side | Side by side | Push, with back returning focus to the row |
| Hover-revealed actions | Always visible, or in an overflow menu | Visible on hover and focus when a trackpad is present | Visible on hover and focus | Visible on focus |

Device classes, input modes, and target sizes are in `references/foundations/devices-responsive.md`.

## Selection rules

| Prefer | Over | Because |
| --- | --- | --- |
| Undo | A confirmation dialog for reversible actions | Undo keeps the flow; dialogs get dismissed without being read |
| Contextual onboarding | A welcome carousel | It teaches at the moment of need; carousels get skipped |
| Visible navigation on desktop | A hamburger menu | Hidden navigation is discovered and used less |
| Validation on blur | Validation only on submit, or on every keystroke | Errors surface early without nagging mid-typing |
| A "Load more" button or pagination | Infinite scroll on pages with useful footers | The footer and the user's position stay reachable |
| Skeletons for known layouts | Spinners for page content | Skeletons show structure and shorten the perceived wait |
| Error text with an icon | Color or shake alone | It works for color-blind users and at T0 |
| Carousels the user advances | Autoplay | Autoplay over 5 s needs a pause control (WCAG 2.2.2) and users lose their place |

## Motion budget by surface

| Surface | Typical patterns | Tier cap (`references/foundations/performance-tiers.md`) |
| --- | --- | --- |
| Product UI | Forms, tables, settings, dashboards | T1, T2 for gesture-heavy apps |
| Content and commerce | Feeds, galleries, checkout | T2 |
| Brand and marketing | Hero, landing, campaign pages | Up to T3, lazily loaded |

Effects that implement these motion roles: `references/effects/microinteractions.md`, `references/effects/page-transitions.md`, `references/effects/scroll-driven.md`.
