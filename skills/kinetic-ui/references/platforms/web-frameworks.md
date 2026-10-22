# Web frameworks

> Keywords: react, next.js, nextjs, vue, nuxt, svelte, sveltekit, angular, astro, islands, vanilla js, ssr, hydration, client component, use client, useEffect cleanup, onMounted, onMount, afterNextRender, dispose, unmount, react three fiber, tresjs, threlte, motion, gsap, frameworks web
> Summary: How to wire the motion tokens, the tier snippet, and effects into vanilla JS, React/Next.js, Vue/Nuxt, Svelte/SvelteKit, Angular, and Astro without SSR or lifecycle bugs.

Effects in this skill are framework-agnostic: CSS tokens plus `assets/snippets/motion-tier.js`. A framework only decides **when** an effect mounts and **how** it is cleaned up. Keep that split.

## Shared contract

| Concept | Web primitive | Where it lives |
| --- | --- | --- |
| Tiers T0–T3 | `<html data-motion-tier="0..3">`, set by `applyMotionTier()` | `assets/snippets/motion-tier.js`, `references/foundations/performance-tiers.md` |
| Tier changes | `kui:motiontierchange` event on `document` (`e.detail.tier`) | Same snippet |
| Motion tokens | `--kui-duration-*`, `--kui-ease-*`, `--kui-distance-*`, `--kui-scale-*`, `--kui-stagger`, `--kui-parallax-strength` | `assets/tokens/motion.css`, imported once globally |
| Tier visibility | `data-kui-min-tier="N"` / `data-kui-max-tier="N"` | `assets/tokens/motion.css` |
| Brand tokens | `--brand-*` custom properties on `:root` | Global stylesheet; see `references/brand/brand-intake.md` |

Read a token as a number when a JS library needs one:

```js
export const token = (name) =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
// token('--kui-duration-md') -> 250 (ms) · token('--kui-distance-md') -> 12 (px)
// Motion and GSAP take seconds: token('--kui-duration-md') / 1000
// Cubic-bezier easings map 1:1 to arrays: --kui-ease-standard -> [0.2, 0, 0, 1]
```

Read tokens after `applyMotionTier()` runs, and again after `kui:motiontierchange`: reduced motion and T0 rewrite distances and scales to neutral values.

## Lifecycle rules (every framework)

1. **No animation work during SSR.** Never touch `window`, `document`, `matchMedia`, canvas, or WebGL on the server. Server HTML is T1: static layout, posters, CSS transitions only.
2. **Hydrate first, upgrade second.** The first client render must match the server (T1). Call `applyMotionTier()` once, at the app root, in the client-only hook. Then re-render with the real tier.
3. **Every mount has a cleanup.** Cancel animations, kill timelines, disconnect observers, remove listeners, call the snippet's `dispose()`.
4. **Dispose GPU resources on unmount.** For plain three.js: `geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `renderer.dispose()`. Framework 3D wrappers do most of this; verify custom resources.
5. **Load by tier.** `if (tier >= 2) await import('./motion-chunk.js')`; T3 scenes load only after the main content renders.
6. **Stop on downgrade.** Listen for `kui:motiontierchange` and tear down effects above the new tier.
7. **Gate JS-driven motion in JS.** CSS media queries do not stop Web Animations API, Motion, GSAP, or Svelte transitions. Check the tier or reduced-motion flag before starting them.

## Framework map

| Framework | Reduced-motion / tier hook | Animation options | 3D wrapper | Client-only mount → cleanup |
| --- | --- | --- | --- | --- |
| Vanilla JS | `matchMedia('(prefers-reduced-motion: reduce)')`, `applyMotionTier()` | CSS + tokens, Web Animations API, Motion (vanilla `animate`), GSAP, anime.js | three.js directly | Module script → `dispose()`, `AbortController.abort()` |
| React / Next.js | `useReducedMotion()` (Motion), `<MotionConfig reducedMotion="user">`, `useMotionTier()` below | Motion (`motion/react`), GSAP, AutoAnimate | React Three Fiber (+ drei) | `useEffect` → returned cleanup |
| Vue / Nuxt | `usePreferredReducedMotion()` (VueUse), `useReducedMotion()` (Motion for Vue) | `<Transition>` + tokens, Motion for Vue, GSAP, AutoAnimate | TresJS | `onMounted` → `onBeforeUnmount` |
| Svelte / SvelteKit | `prefersReducedMotion.current` from `svelte/motion` | `svelte/transition`, `svelte/motion` (`Spring`, `Tween`), Motion, GSAP | Threlte | `onMount` → returned cleanup, or `$effect` teardown |
| Angular | `matchMedia` inside `afterNextRender` | `animate.enter` / `animate.leave` + CSS tokens, Motion, GSAP | No official wrapper: three.js directly | `afterNextRender` → `DestroyRef.onDestroy` |
| Astro | `client:media="(prefers-reduced-motion: no-preference)"`; `<ClientRouter />` disables its transitions under reduced motion | CSS + tokens, any island framework above | The island framework's wrapper | `<script>` runs once → re-apply on `astro:after-swap` |

Library facts (versions, peer ranges, licenses) live in `references/libraries.md`. React Three Fiber, TresJS, and Threlte each require a recent major of their framework; check that file before installing.

## Vanilla JS

```html
<link rel="stylesheet" href="/css/motion.css" />
<script type="module">
  import { applyMotionTier, watchFrameRate } from '/js/motion-tier.js';

  const { tier } = applyMotionTier({ maxTier: 3 }); // design cap; a dashboard would pass 1
  if (tier >= 3) {
    const { mountHero } = await import('/js/hero-3d.js');
    const unmount = mountHero(document.querySelector('[data-hero-canvas]'));
    watchFrameRate(); // one bounded sample while the scene runs
    document.addEventListener('kui:motiontierchange', (e) => {
      if (e.detail.tier < 3) unmount(); // fall back to the poster (data-kui-max-tier="2")
    });
  }
</script>
```

Use one `AbortController` per effect and pass `{ signal }` to every `addEventListener`, so a single `abort()` removes all listeners.

## React and Next.js

```tsx
'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { applyMotionTier } from '@/lib/motion-tier.js'; // copy of the skill snippet

const subscribe = (onChange: () => void) => {
  document.addEventListener('kui:motiontierchange', onChange);
  return () => document.removeEventListener('kui:motiontierchange', onChange);
};
const getTier = () => Number(document.documentElement.dataset.motionTier ?? 1);

export function useMotionTier(): number {
  return useSyncExternalStore(subscribe, getTier, () => 1); // server + hydration render T1
}

export function MotionTierRoot() {
  useEffect(() => applyMotionTier().dispose, []); // returns the cleanup
  return null;
}
```

- Render `<MotionTierRoot />` once in the root layout. Wrap the app in `<MotionConfig reducedMotion="user">` so Motion components drop transform and layout animation under reduced motion while keeping opacity.
- `useSyncExternalStore` uses the server snapshot during hydration, then re-renders with the client tier: no hydration mismatch.
- If an inline script sets `data-motion-tier` before hydration (to avoid a flash), add `suppressHydrationWarning` to `<html>`.
- Server Components never animate. Put effects in files marked `'use client'`.
- Load 3D client-only, from a client component:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { useMotionTier } from './motion-tier-hooks';

const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false });

export function Hero() {
  const tier = useMotionTier();
  return (
    <section className="hero">
      <img src="/hero-poster.avif" alt="" data-kui-max-tier="2" />
      {tier >= 3 && <HeroScene />}
    </section>
  );
}
```

In React Three Fiber, use `<Canvas dpr={[1, 2]} frameloop={tier >= 3 ? 'always' : 'demand'}>`. It disposes objects it created on unmount; pass `dispose={null}` only for cached assets you dispose yourself.

## Vue and Nuxt

```ts
// composables/useMotionTier.ts
import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useMotionTier() {
  const tier = ref(1); // SSR and the first client render use T1
  const sync = () => { tier.value = Number(document.documentElement.dataset.motionTier ?? 1); };
  onMounted(() => { sync(); document.addEventListener('kui:motiontierchange', sync); });
  onBeforeUnmount(() => document.removeEventListener('kui:motiontierchange', sync));
  return tier;
}
```

- Nuxt: apply the tier once in a client-only plugin, `plugins/motion-tier.client.ts`, calling `applyMotionTier()` inside `defineNuxtPlugin`.
- Vue `<Transition>` and `<TransitionGroup>` are driven by CSS classes, so token-based CSS degrades under reduced motion with no extra code.
- Wrap 3D in `<ClientOnly>` (or a `.client.vue` component) and mount `<TresCanvas render-mode="on-demand">` only when `tier >= 3`.

## Svelte and SvelteKit

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';

  // distance = --kui-distance-md, duration = --kui-duration-md
  let { open, children, distance = 12 }: { open: boolean; children: Snippet; distance?: number } = $props();
</script>

{#if open}
  <div transition:fly={{ y: prefersReducedMotion.current ? 0 : distance, duration: 250 }}>
    {@render children()}
  </div>
{/if}
```

- Call `applyMotionTier()` in the root `+layout.svelte` inside `onMount(() => applyMotionTier().dispose)`. `onMount` and `$effect` never run on the server.
- Svelte transitions run on the Web Animations API, so a global CSS reduced-motion rule does not affect them. Always pass reduced values from `prefersReducedMotion.current` or the tier.
- Threlte: `<Canvas renderMode="on-demand" dpr={[1, 2]}>` and mount it only at T3.

## Angular

```ts
import { DestroyRef, Injectable, afterNextRender, inject, signal } from '@angular/core';
import { applyMotionTier } from './motion-tier.js';

@Injectable({ providedIn: 'root' })
export class MotionTier {
  readonly tier = signal(1); // server render and hydration use T1

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => { // browser only; skipped on the server
      const { tier, dispose } = applyMotionTier();
      this.tier.set(tier);
      const sync = (e: Event) => this.tier.set((e as CustomEvent<{ tier: number }>).detail.tier);
      document.addEventListener('kui:motiontierchange', sync);
      destroyRef.onDestroy(() => { dispose(); document.removeEventListener('kui:motiontierchange', sync); });
    });
  }
}
```

- `@angular/animations` is deprecated. Use `animate.enter="kui-enter"` / `animate.leave="kui-leave"` with CSS classes that use the `--kui-*` tokens.
- three.js: create the renderer in `afterNextRender`, dispose it in `DestroyRef.onDestroy`. In zone-based apps, run the render loop inside `NgZone.runOutsideAngular` so frames do not trigger change detection.

## Astro

```astro
<script>
  import { applyMotionTier } from '../lib/motion-tier.js';

  applyMotionTier(); // bundled scripts run once per full page load
  // <ClientRouter /> replaces <html> attributes on each navigation: restore the tier.
  document.addEventListener('astro:after-swap', () => applyMotionTier());
</script>
```

- Static Astro output is already T1. Hydrate motion islands with `client:visible` (below the fold) or `client:idle`.
- `client:media="(prefers-reduced-motion: no-preference)"` never hydrates the island for reduced-motion users: its server HTML is the T0 version, so make that HTML complete.
- Re-run effect setup on `astro:page-load`; tear it down on `astro:before-swap`.

## Reduced motion

- CSS: token-based transitions collapse automatically (`assets/tokens/motion.css`). Do nothing else for CSS-only effects.
- JS: before starting any JS animation, check `document.documentElement.dataset.motionTier !== '0'` or the framework hook in the map above. At T0, apply the end state at once, or fade ≤200ms with no travel.
- Libraries: Motion `reducedMotion="user"` keeps opacity and drops transforms; GSAP registers animations inside `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; 3D renders one static frame and stops the loop.
- Route transitions: Astro's `<ClientRouter />` already swaps without animation; for the View Transitions API, see `references/effects/page-transitions.md`.
- Offer the in-product "Reduce motion" toggle from `references/foundations/accessibility-motion.md`; it sets T0 for every framework above.

## Low-end fallback

| Tier | What each framework ships |
| --- | --- |
| T1 | Server HTML plus CSS transitions and posters. No motion library chunk, no canvas. React/Vue/Svelte/Angular render the same markup; Astro ships no island JS for decoration |
| T2 | Lazy chunk with the motion library (Motion, GSAP, AutoAnimate), Lottie/Rive, 2D canvas. Loaded after hydration |
| T3 | Lazy 3D chunk (R3F / TresJS / Threlte / three.js) after LCP, `dpr` capped at 2, on-demand rendering when idle |

- Run `watchFrameRate()` once while the heaviest effect plays; it lowers the tier for the session, and the `kui:motiontierchange` handler unmounts what the new tier forbids.
- Keep the fallback in the markup (`data-kui-max-tier`), never behind JS: if a chunk fails to load, the page is still complete.
- Pause loops offscreen and in hidden tabs; see `references/foundations/performance-tiers.md` for budgets.

## Pitfalls

- Reading `window` at module top level breaks SSR in Next.js, Nuxt, SvelteKit, Angular SSR, and Astro.
- Detecting the tier during render makes server and client markup differ: hydration errors and layout flashes.
- Effects without cleanup leak listeners and WebGL contexts on client-side navigation; browsers cap live WebGL contexts.
- Importing three.js in a shared layout puts it in the main bundle; keep it behind a dynamic import.
- Smooth-scroll libraries at T0/T1 break native scrolling and accessibility; enable them at T2+ only.
