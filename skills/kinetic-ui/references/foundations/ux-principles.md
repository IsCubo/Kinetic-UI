# UX principles

> Keywords: UX laws, Fitts's law, Hick's law, Jakob's law, Miller's law, chunking, Doherty threshold, Tesler's law, aesthetic-usability effect, peak-end rule, serial position effect, Von Restorff effect, isolation effect, goal-gradient effect, Gestalt, proximity, similarity, common region, common fate, figure-ground, visual hierarchy, system status, feedback, response time, loading state, skeleton, usability heuristics, Nielsen heuristics, cognitive load, leyes de UX, jerarquía visual, carga cognitiva
> Summary: Turns UX laws, Gestalt grouping, visual hierarchy, system-status feedback, usability heuristics, and cognitive load into concrete layout, interaction, and motion decisions.

Apply these principles before choosing any effect. Every row ends in a decision that changes layout, interaction, or motion. When a principle and an effect disagree, keep the principle and cut or soften the effect.

Related files: `references/foundations/motion-principles.md` (purposes, easing, timing), `references/foundations/ui-patterns.md` (pattern choice), `references/foundations/devices-responsive.md` (screens and input modes), `references/foundations/accessibility-motion.md` (reduced motion, WCAG).

## UX laws

| Law | What it says | Interface decision | Motion decision |
| --- | --- | --- | --- |
| Fitts's law | Time to reach a target grows with distance and shrinks with target size | Make primary targets large and put them where the hand or pointer already is: the thumb zone on phones, next to the content they act on with a pointer. Keep destructive actions away from frequent ones | Never move a target while the user aims at it. Animate an inner layer on hover or press and keep the outer element as a stable hit area. Cap hover travel at `--kui-distance-sm` |
| Hick's law | Decision time grows with the number and similarity of choices | Cut and group options, mark one recommended choice, and move rare options behind progressive disclosure | Reveal secondary options only on request. Animate a set of choices as one unit, or stagger it only to suggest a reading order |
| Jakob's law | Users expect your product to work like the products they already know | Keep conventions: logo links home, search and account in the header, platform-native navigation, standard form controls | Reuse platform motion: sheets rise from the bottom, drawers slide from their edge, back reverses forward. Spend novel motion on brand moments, never on navigation |
| Chunking (Miller's law) | Working memory holds few items; grouping raises how much people can handle. Plan for about 4 chunks, not 7 | Split long forms into labeled groups, format long numbers in chunks, keep menus short with headed sections | Stagger groups, not individual items. Move each group as one unit so it reads as one chunk |
| Doherty threshold | People stay engaged when the system responds in under ~400 ms | Use optimistic updates, prefetching, skeletons, and instant local validation | Start visible feedback within 100 ms. Never put animation on the critical path: content is interactive while it animates in, and UI entrances stay at or under `--kui-duration-lg` |
| Tesler's law | Some complexity cannot be removed; either the system or the user carries it | Let the system carry it: smart defaults, autofill, input masks, inferred values (city from postal code) | When the system changes something for the user (autofill, formatting, correction), mark it with a short color fade so the change is noticed and can be undone |
| Aesthetic-usability effect | Attractive interfaces are perceived as easier to use and earn more patience | Invest in type, spacing, and color quality for first impressions and trust | Polish makes testers forgive real problems. Judge motion by task success and time on task, never by "it feels nice" alone |
| Peak-end rule | People remember an experience by its most intense moment and its end | Design the success moment and the last screen of every flow; remove friction at the end (receipt, clear next step) | Spend the motion budget on the peak and the ending; keep the steps between them quiet. Make error moments calm and recoverable, never dramatic |
| Serial position effect | The first and last items in a sequence are remembered best | Put key destinations at the start and end of navigation; end a reading sequence with the call to action | Make the lead element of a choreography the most important one: users remember what moved first |
| Von Restorff effect | The item that differs from its neighbors gets noticed and remembered | Give each view one visually distinct primary action; never rely on color alone (add size, weight, or an icon) | Motion is the strongest isolator. Move only the element that must win attention; when everything moves, nothing stands out |
| Goal-gradient effect | Effort increases as people get closer to a goal | Show progress (steps, checklists, bars) and give an honest head start (a completed sign-up already counts as step 1) | Animate progress forward with `--kui-ease-standard` and mark milestones briefly. Never animate progress backward without saying why |

## Gestalt grouping

| Principle | People perceive | Layout decision | Motion decision |
| --- | --- | --- | --- |
| Proximity | Close items as one group | Make the space between groups clearly larger than the space inside them | Items that animate together must sit together |
| Similarity | Items that look alike as related | Same style means same function; vary style only when function differs | Same role, same motion: every card enters the same way |
| Common region | Items inside one boundary as a group | Use cards, panels, or tinted backgrounds for groups | When a group changes, animate the container, not each child |
| Common fate | Items moving together as one group | Not applicable to static layout | The strongest motion grouping: related items share direction, easing, and timing; unrelated items stay still |
| Continuity | Elements on a line or curve as connected | Align to a grid; show part of the next item to signal horizontal scroll | Move along the path the eye already follows; close gaps smoothly when an item is removed |
| Closure | Incomplete shapes as complete | Let content peek at an edge to signal more | Progress rings and skeletons rely on closure; keep their shapes simple |
| Figure-ground | A foreground figure against a background | Separate overlays with a scrim and elevation | Animate the figure and keep the ground still; the scrim only fades |
| Uniform connectedness | Visually connected elements as related | Connect steps with lines, steppers, or shared backgrounds | Draw a connector once, as the relationship forms (stroke reveal) |
| Prägnanz (simplicity) | The simplest reading of a shape | Prefer simple silhouettes and clear alignment | Prefer straight paths or one gentle arc; avoid paths that change direction |

## Visual hierarchy

Rank the levers from strongest to weakest and use the strong ones sparingly:

| Lever | Strength | Rule |
| --- | --- | --- |
| Motion | Strongest; overrides every static cue | Move only what must win attention, one focal motion at a time |
| Size and scale | Strong | Use a type scale with clear steps; the primary heading is visibly larger, not marginally larger |
| Contrast and weight | Strong | Primary text and actions get the highest contrast; secondary content steps down while still meeting 4.5:1 |
| Color | Medium; fails alone for color-blind users | Reserve `--brand-primary` for the primary action and the active state; pair color with shape, icon, or text |
| Position | Medium | Put the most important content first in reading order: top, then the start side (mirrored in RTL). Text-heavy pages are scanned in an F shape, sparse pages in a Z shape |
| Whitespace | Medium | Isolate the primary element with space; tighten space inside groups |
| Depth (elevation, shadow, blur) | Medium | Raise only what floats above the flow: menus, dialogs, sticky bars |

Rules:
- Keep one primary action per view. When two compete, demote one to secondary styling.
- Run a squint or blur test: the order you see blurred must match the intended order.
- Hierarchy must hold at T0. A static screenshot ranks elements correctly without any motion.
- Keep DOM order equal to visual order so keyboard and screen-reader users get the same hierarchy.

## System status and response time

Users must always know what the system is doing. Choose feedback by the expected wait:

| Expected wait | Perception | Feedback | Motion |
| --- | --- | --- | --- |
| Under 100 ms | Instant | The control changes state directly (pressed, toggled, checked) | `--kui-duration-xs` press or tint |
| 100 ms to 1 s | Noticeable, flow kept | In-place busy state on the control ("Saving…", disabled against double submit) | No loader yet; delay any loader by ~400 ms (heuristic) so it never flashes |
| 1 to 10 s | Attention starts to drift | Skeleton for content with a known layout; an indeterminate indicator otherwise | Slow, low-contrast shimmer or pulse; a static skeleton at T0 |
| Over 10 s | Users switch tasks | Determinate progress with an estimate, a cancel action, and a completion notice | Progress only moves forward; announce completion with a toast |

Also show success in place (not only in a toast), a saved state for autosave, an offline state, and every error next to its cause. Announce asynchronous status to screen readers with a polite live region (`aria-live="polite"`).

Delay a loader so fast responses never flash it:

```css
.loader { animation: kui-loader-in var(--kui-duration-sm) var(--kui-ease-standard) 400ms both; }
@keyframes kui-loader-in { from { opacity: 0; } }
```

## Usability heuristics

The ten classic usability heuristics (Nielsen), each with its review check and the job motion does for it:

| Heuristic | Check | Motion role |
| --- | --- | --- |
| Visibility of system status | Every action shows a result; long work shows progress | Feedback within 100 ms; progress only moves forward |
| Match with the real world | User vocabulary, natural order, familiar metaphors | Motion follows physical expectations: things enter from where they come from, large things move slower |
| User control and freedom | Undo, cancel, back, and close are always available | Animations are interruptible; dismissing mid-animation works; back reverses forward |
| Consistency and standards | Same thing, same name, same place, same look | Same role, same motion: tokens, never ad hoc values |
| Error prevention | Constraints, good defaults, confirmation only for irreversible actions | Hints fade in before submit, at the field that needs them |
| Recognition rather than recall | Options, labels, and recent items stay visible | Keep a panel's origin visible while it opens so users remember where it came from |
| Flexibility and efficiency of use | Shortcuts, bulk actions, saved preferences | Keyboard and repeated actions shorten or skip motion |
| Aesthetic and minimalist design | Every element earns its place | Every animation has one purpose; cut the decorative rest |
| Recognize, diagnose, and recover from errors | Plain message with the cause and the fix | The error appears next to its cause and focus moves to it; shake never replaces text |
| Help and documentation | Contextual help, searchable docs | Help opens in place (popover, side panel) instead of navigating away |

## Cognitive load

| Load type | Source | Action |
| --- | --- | --- |
| Intrinsic | The task itself (comparing plans, configuring a product) | You cannot remove it; split it into steps and show only what the current step needs |
| Extraneous | Presentation: clutter, inconsistent layouts, decorative motion, jargon | Remove it; this is where design wins |
| Germane | Effort spent learning the product's model | Support it with consistent patterns and motion that shows cause and effect |

Rules for motion and load:
- Run one focal motion at a time. Next to it, keep at most about two other elements in motion (heuristic).
- Keep the reading area still while people read: no autoplaying carousels, marquees, or looping backgrounds behind text.
- Same meaning, same motion. Build a small motion vocabulary from the tokens and reuse it everywhere.
- Prefer recognition: keep labels visible, show applied filters as chips, keep the origin of a panel in view.
- Cut decisions with defaults and presets; ask only for what the system cannot infer.
- Introduce one idea at a time on a page reveal: the lead element first, then supporting content.

## Review checklist

1. Each view has one primary action, and it wins the blur test.
2. Every user action gets visible feedback within 100 ms; waits over 1 s show a skeleton or progress.
3. Choices are grouped and limited; rare options sit behind progressive disclosure.
4. Navigation and controls follow platform conventions.
5. Each animation names one purpose from `references/foundations/motion-principles.md`; the rest is removed.
6. The screen still reads correctly at T0, with no motion at all.
