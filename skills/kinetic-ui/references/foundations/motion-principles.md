# Motion principles

> Keywords: motion design, animation principles, purpose of motion, easing, ease-in, ease-out, cubic-bezier, duration, timing, choreography, stagger, sequencing, shared element transition, FLIP, follow-through, overlapping action, spring animation, stiffness, damping, mass, damping ratio, Disney principles, squash and stretch, anticipation, arcs, motion personality, motion presets, animation anti-patterns, curvas de animación, coreografía, principios de animación
> Summary: Why and how UI moves: purposes of motion, easing and duration choices mapped to the motion tokens, choreography, springs, the Disney principles that apply to UI, personality presets, and anti-patterns.

Express all motion through the tokens in `assets/tokens/motion.css`. They collapse automatically under reduced motion and T0, so never hard-code durations or curves in components. Tier rules live in `references/foundations/performance-tiers.md`; reduced-motion behavior lives in `references/foundations/accessibility-motion.md`.

## Purposes

Give every animation exactly one purpose from this table. If you cannot name it, remove the animation.

| Purpose | Answers | Example | Default tokens |
| --- | --- | --- | --- |
| Feedback | "Did my action register?" | Press scale, toggle thumb, inline success check | `--kui-duration-xs` to `--kui-duration-sm`, `--kui-ease-standard` |
| Orientation | "Where am I, and where did it go?" | A drawer slides from its edge; back reverses forward | `--kui-duration-md` to `--kui-duration-lg`, `--kui-ease-enter` / `--kui-ease-exit` |
| Focus | "Where should I look?" | Highlight a newly added row or the field with an error | `--kui-duration-sm` to `--kui-duration-md`, one element only |
| Continuity | "Is this the same thing?" | A thumbnail grows into its detail view | `--kui-duration-md` to `--kui-duration-lg`, `--kui-ease-standard` |
| Delight | "Does this feel good?" | A short celebration when a task completes | `--kui-duration-md` to `--kui-duration-xl`; spring only if the personality allows it |
| Brand | "Whose product is this?" | Signature hero choreography, logo motion | `--kui-duration-xl`, personality preset |

Priority runs top to bottom. When performance or attention is tight, cut from the bottom: delight and brand go first, feedback goes last. At T0, feedback stays as color and opacity change; orientation and continuity become instant swaps or short crossfades.

## Easing

| Situation | Token | Why |
| --- | --- | --- |
| Moving between two on-screen positions, resizing, color or opacity change | `--kui-ease-standard` | Quick start, soft settle |
| Element entering the screen or appearing | `--kui-ease-enter` | Decelerates: arrives fast and lands softly |
| Element leaving or being dismissed | `--kui-ease-exit` | Accelerates away and frees attention quickly |
| Scroll-linked motion, progress tied to time or scroll, loops, spinners | `--kui-ease-linear` | The input (scroll position, time) already sets the pace |
| Short playful pop-in, toggle, badge (no gesture) | `--kui-ease-spring` | ~16% overshoot; playful and energetic personalities only |
| Release after a drag, fling, or sheet throw | A real spring (library or native API) | Inherits the gesture's velocity and can be interrupted |

Rules:
- Never use the exit curve on an entrance: an element that starts slowly feels late.
- Never use linear easing for spatial UI moves; it looks mechanical.
- Make exits one duration step shorter than the matching entrance.

## Duration

Choose by size and distance, not by taste. All values below are heuristics; the tokens hold the numbers.

| Change | Size and travel | Enter | Exit |
| --- | --- | --- | --- |
| Press, hover tint, toggle thumb, checkbox | Smaller than ~48 px, travel up to `--kui-distance-sm` | `--kui-duration-xs` | `--kui-duration-xs` |
| Tooltip, chip, icon swap, small fade | Small, travel up to `--kui-distance-md` | `--kui-duration-sm` | `--kui-duration-xs` |
| Menu, dropdown, popover, card expand, toast | Component, travel up to `--kui-distance-lg` | `--kui-duration-md` | `--kui-duration-sm` |
| Dialog, sheet, drawer, side panel | Large surface, a third of the viewport or more | `--kui-duration-lg` | `--kui-duration-md` |
| Page transition, hero sequence (total) | Viewport | `--kui-duration-xl` (upper bound) | `--kui-duration-md` |

- Longer travel needs more time, but sub-linearly: doubling the distance adds one step, not double the time.
- Actions repeated many times per session (list navigation, toggles, keyboard shortcuts) get the shortest token or no motion.
- Nothing in product UI exceeds `--kui-duration-xl`. Content stays interactive while it animates.

Adjust by device class (heuristic):

| Device class | Adjustment |
| --- | --- |
| Watch | One step shorter; `--kui-duration-xs` to `--kui-duration-sm` for almost everything; no `lg` or `xl` |
| Phone | Baseline tokens |
| Tablet, open foldable | Large surfaces travel farther: sheets and side panels may step up one token |
| Laptop and desktop (fine pointer) | One step shorter for menus and hover; pointer users expect snappy UI |
| Ultrawide | Same as desktop; never scale duration with viewport width |
| TV | `--kui-duration-sm` to `--kui-duration-md` for focus moves so motion keeps up with key repeat; `--kui-duration-lg` for page-level changes |
| In-car | `--kui-duration-xs` to `--kui-duration-sm`, feedback only |
| Spatial / XR | Prefer fades and short depth moves at `--kui-duration-md` to `--kui-duration-lg`; never move the viewpoint |

Override token values per context instead of inventing new tokens. Load overrides after `assets/tokens/motion.css` and keep them out of reduced motion and T0:

```css
/* Pointer-first desktop UI: snappier components and surfaces. */
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  :root:not([data-motion-tier="0"]) { --kui-duration-md: 200ms; --kui-duration-lg: 300ms; }
}
```

Device classes and input modes are covered in `references/foundations/devices-responsive.md`.

## Choreography

1. **Lead element.** Pick one element to move first and most: the primary content or the element the user touched. Everything else follows it.
2. **Stagger.** Offset siblings by `--kui-stagger` (40 ms; 20 ms at T1; 0 at T0). Cap the total stagger at ~300 ms: stagger at most about 7 items, then let the rest enter with the last one. Stagger groups in long lists, never every row. Stagger once per view; later updates change in place.
3. **Overlap, don't chain.** Start the next move before the previous one ends (about halfway, heuristic). A strict chain makes the whole sequence feel slow.
4. **Direction.** Elements enter from where they come from and leave toward where they go. Forward follows the reading direction; mirror it in RTL.
5. **Follow-through.** The container lands first; its content settles one stagger step later with `--kui-ease-enter`.

```css
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion-tier="0"]) .stagger > * {
    animation: kui-rise var(--kui-duration-md) var(--kui-ease-enter) both;
    animation-delay: calc(min(var(--i, 0), 7) * var(--kui-stagger));
  }
}
@keyframes kui-rise { from { opacity: 0; transform: translateY(var(--kui-distance-md)); } }
```

Set the index in markup (`style="--i: 2"`). The static state is the visible state, so content shows even if the animation never runs.

**Shared-element continuity.** When an element changes place or size, move that same element (or one that looks identical) from its old box to its new one. Across views, use the View Transitions API (`view-transition-name`) with a crossfade or instant fallback; see `references/effects/page-transitions.md`. Within a view, use FLIP:

```js
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function flip(el, mutate) {
  const first = el.getBoundingClientRect();
  mutate(); // apply the DOM or class change
  const last = el.getBoundingClientRect();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.dataset.motionTier === '0';
  if (still || !last.width || !last.height) return;
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  el.animate([
    { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${first.width / last.width}, ${first.height / last.height})` },
    { transformOrigin: '0 0', transform: 'none' },
  ], { duration: parseFloat(token('--kui-duration-md')), easing: token('--kui-ease-standard') });
}
```

## Springs

A spring has no fixed duration: stiffness, damping, and mass decide how it moves and when it settles.

| Parameter | Raising it makes motion | Guidance |
| --- | --- | --- |
| Stiffness | Faster and snappier | Main speed control |
| Damping | Oscillate less and settle sooner | Set it through the damping ratio |
| Mass | Heavier, slower, with more momentum | Keep it at 1 and tune stiffness instead |

Damping ratio ζ = damping / (2 × √(stiffness × mass)). At ζ = 1 the spring settles with no overshoot; 0.7 to 0.9 adds a slight settle (UI default, heuristic); 0.4 to 0.6 bounces visibly (playful only).

- **Use springs for** gesture releases (drag, fling, swipe to dismiss, bottom sheets), because a spring keeps the gesture's velocity and can be interrupted mid-flight; for pointer followers; for playful toggles and pop-ins.
- **Do not use springs for** precise or data-dense UI, text, errors, destructive actions, long travel (overshooting a far target looks broken), or T0 and T1 (no JS physics at T1).
- **CSS has no physical spring.** `--kui-ease-spring` is a fixed `linear()` curve with ~16% overshoot, no velocity, and no interruption. Use it only for short pops at `--kui-duration-md` to `--kui-duration-lg`; it falls back to `--kui-ease-standard` where `linear()` is unsupported. For real springs, use a motion library (`references/libraries.md`) or a native API.

Native equivalents of the tokens (details in `references/platforms/flutter.md`, `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`):

| Token | Flutter | SwiftUI | Jetpack Compose |
| --- | --- | --- | --- |
| `--kui-ease-standard` | `Cubic(0.2, 0, 0, 1)` | `.timingCurve(0.2, 0, 0, 1, duration: 0.25)` | `CubicBezierEasing(0.2f, 0f, 0f, 1f)` |
| `--kui-ease-enter` | `Cubic(0.05, 0.7, 0.1, 1)` | `.timingCurve(0.05, 0.7, 0.1, 1, duration: 0.25)` | `CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)` |
| `--kui-ease-exit` | `Cubic(0.3, 0, 0.8, 0.15)` | `.timingCurve(0.3, 0, 0.8, 0.15, duration: 0.15)` | `CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)` |
| UI spring (ζ ≈ 0.8) | `SpringDescription.withDampingRatio(mass: 1, stiffness: 300, ratio: 0.8)` | `.spring(response: 0.35, dampingFraction: 0.8)` | `spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessMediumLow)` |

## Disney principles for UI

| Principle | UI translation | Use for | Avoid in |
| --- | --- | --- | --- |
| Squash and stretch | A small scale change on press or landing (`--kui-scale-press`) | Buttons, playful toggles | Text, data, precise UI |
| Anticipation | A brief wind-up before a large move | Brand moments, playful calls to action | Direct feedback: never delay the response to input |
| Staging | One focal action at a time; the rest stays still or dims | Dialogs, onboarding highlights | Screens with competing motion |
| Follow-through and overlapping action | Children settle slightly after their parent | Sheets with content, card expand | Long tails that delay interaction |
| Slow in and slow out | Easing (see the easing table) | Every spatial move | Scroll-linked and looping motion, which stay linear |
| Arcs | Large diagonal moves follow a gentle curve: split X and Y into nested elements with different easings, or use `offset-path` | Shared elements crossing the screen, button-to-sheet morphs | Short moves, where straight is clearer |
| Secondary action | A supporting micro-motion, such as a check drawing inside a success badge | Success states | Anything that steals attention from the primary action |
| Timing | Duration conveys weight: small is fast, large is slower | Everything, through the duration tokens | One duration for every size |
| Exaggeration | Push a move past realism for clarity | Playful and energetic brands, empty-state illustrations | Productivity UI and T0 |
| Solid drawing | Consistent light, shadow, and perspective across layers | Depth and 3D (`references/effects/depth-layers.md`) | Mixed light directions |
| Appeal | Motion personality that matches the brand | The presets below | Personality that contradicts the content's tone |

Straight-ahead versus pose-to-pose is a production technique, not a UI rule; CSS keyframes are pose-to-pose by nature.

## Personality presets

Pick a preset from the brand's emotion (`references/brand/emotion-to-style.md`, or `references/brand/brand-intake.md` when a brand exists). Presets only change token values; components stay unchanged.

| Preset | Fits | `md` / `lg` duration | Easing | Distance and scale | Stagger | Springs | Parallax strength |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Calm | Health, wellness, consumer finance, documentation | 300 ms / 450 ms | Standard and enter only | `--kui-distance-md` 8px; `--kui-scale-pop` 1 | 50ms | No | 0.6 |
| Precise | Dashboards, developer tools, B2B, trading | 200 ms / 300 ms | Standard; fast exits | Default distances; `--kui-scale-press` 0.98; `--kui-scale-pop` 1 | 30ms | No | 0 |
| Energetic | Sports, gaming, events, youth brands | 220 ms / 350 ms | Enter with strong deceleration | `--kui-distance-lg` 48px; `--kui-scale-pop` 1.06 | 40ms | On pop-ins | 1 |
| Playful | Kids, social, creative tools | 300 ms / 450 ms | `--kui-ease-spring` on pops and toggles | `--kui-scale-press` 0.94; `--kui-scale-pop` 1.08 | 50ms | Yes, ζ 0.5 to 0.7 | 1 |
| Luxurious | Fashion, hospitality, premium goods | 350 ms / 500 ms (`xl` stays 600 ms) | Enter with a long, soft tail | `--kui-distance-lg` with slow fades; no pop | 80ms (fewer staggered items) | No | 0.6 |

Apply a preset after `assets/tokens/motion.css`:

```css
/* Preset: calm. */
@media (prefers-reduced-motion: no-preference) {
  /* Durations, easings, distances: skipped at T0. */
  :root:not([data-motion-tier="0"]) {
    --kui-duration-md: 300ms;
    --kui-duration-lg: 450ms;
    --kui-distance-md: 8px;
    --kui-scale-pop: 1;
  }
  /* Stagger and parallax use plain :root, so the T0 and T1 caps in motion.css keep winning. */
  :root {
    --kui-stagger: 50ms;
    --kui-parallax-strength: 0.6;
  }
}
```

## Anti-patterns

| Anti-pattern | Why it hurts | Do instead |
| --- | --- | --- |
| Everything animates on load | No hierarchy, slow first impression | One orchestrated moment with a lead element |
| Fade-and-rise on every section while scrolling | Generic look; delays reading | Reveal only key elements, or nothing |
| Exit curve on entrances | Feels sluggish | `--kui-ease-enter` |
| Animation before feedback | The UI feels broken | Feedback within 100 ms; animate alongside the response |
| Input blocked until an animation ends | Frustrating and slow | Keep content interactive and animations interruptible |
| Long stagger on long lists | Users wait for the last item | Cap the total at ~300 ms; stagger groups |
| Animating `width`, `height`, `top`, `left` | Layout work every frame, jank | `transform` and `opacity`; state the cost when unavoidable |
| Scroll hijacking | Disorientation, broken accessibility | Native scrolling plus `references/effects/scroll-driven.md` |
| Bounce or shake on errors and destructive actions | Trivializes serious moments | A calm color change plus text |
| Endless decorative loops near content | Distraction, battery drain, WCAG 2.2.2 | Stop after a few cycles or offer a pause control |
| Inconsistent directions | Breaks the spatial model | Define directions once and reuse them |
| Meaning carried by motion alone | Lost at T0 | Pair motion with a static cue (text, icon, color) |
