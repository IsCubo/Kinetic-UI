# Performance tiers

> Keywords: motion tier, T0, T1, T2, T3, low-end device, low-end fallback, progressive enhancement, performance budget, frame budget, deviceMemory, save-data, webgl fallback, jank, battery
> Summary: Defines the four motion tiers, how to detect them, what each tier may run, the performance budgets, and how to degrade on low-end devices.

Every effect in this skill declares its tiers and a `## Low-end fallback`. Build the lowest tier first and enhance upward, never the reverse.

## The tiers

| Tier | Name | Who gets it | Allowed | Not allowed |
| --- | --- | --- | --- | --- |
| T0 | Reduced | `prefers-reduced-motion: reduce`, or the user disabled motion in the product | Instant state changes; opacity and color fades ≤200ms; focus rings; progress indicators | Travel, scale, rotation, parallax, scroll-linked transforms, autoplay video or 3D camera moves |
| T1 | Essential | Default first paint; Save-Data; low-memory or low-core devices; SSR | CSS transitions and keyframes on `transform`/`opacity`; CSS scroll-driven animations where supported; reduced-strength parallax | JS animation loops, smooth-scroll hijacking, canvas/WebGL |
| T2 | Enhanced | Mid and high-end devices | Everything in T1, plus JS motion libraries, choreographed sequences, smooth scroll, 2D canvas, Lottie/Rive | Full WebGL scenes, post-processing |
| T3 | Immersive | High-end devices with WebGL2 | Everything in T2, plus three.js/WebGL/WebGPU scenes, shaders, particles, post-processing | Blocking first paint or the main content on any of it |

A design may cap its tier: a dashboard rarely needs more than T1, and a marketing hero may use T3.

## Detection

Use `assets/snippets/motion-tier.js` (`applyMotionTier()` sets `<html data-motion-tier="0..3">`). Signals and their reach:

| Signal | Effect | Support |
| --- | --- | --- |
| `prefers-reduced-motion: reduce` | Force T0 | All modern browsers |
| `navigator.connection.saveData` | Cap at T1 | Chromium only |
| `navigator.deviceMemory` ≤2 GB → T1, ≤4 GB → T2 | Cap | Chromium only (undefined elsewhere) |
| `navigator.hardwareConcurrency` ≤2 | Cap at T1 | All; Safari clamps to 4 or 8, so treat only very low values as a signal |
| WebGL2 context unavailable | Cap at T2 | All |
| Measured fps under 45 during the main animation | Lower one tier, persist for the session | All (`watchFrameRate()`) |

Rules:
- Missing signals mean "unknown", not "low-end". Safari and Firefox expose neither `deviceMemory` nor `saveData`, so they rely on the frame-rate check.
- Never infer tier from user agent strings or screen size alone. A small screen is not a slow device.
- On the server (SSR), render T1 markup. Upgrade on the client after hydration.
- Give users an in-product "Reduce motion" toggle that forces T0 alongside the OS setting.

## Budgets

| Budget | Target |
| --- | --- |
| Frame time | 16.7 ms per frame at 60 Hz (8.3 ms at 120 Hz); keep animation JS well under that |
| Core Web Vitals (good) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; effects must not regress them |
| Animated properties | `transform`, `opacity` by default; `filter`, `clip-path`, and `backdrop-filter` only on small areas and verified on a low-end device |
| JS for motion (heuristic) | T1: 0 KB · T2: keep motion libraries small and tree-shaken · T3: a lazy chunk loaded after LCP |
| 3D render scale | Cap `devicePixelRatio` at 2 (1.5 on mobile); size render targets to the visible canvas |
| Concurrent loops | One `requestAnimationFrame` loop per page; pause it when offscreen (`IntersectionObserver`) or hidden (`visibilitychange`) |

## Low-end fallback

How each tier degrades when the device cannot sustain it:

| Feature | T3 | T2 | T1 | T0 |
| --- | --- | --- | --- | --- |
| Hero scene | WebGL scene | Pre-rendered video or Lottie | Static image with CSS fade/scale-in | Static image |
| Parallax | Multi-layer, scroll-linked | Fewer layers via JS | CSS scroll-driven with `--kui-parallax-strength` 0.4 | None |
| Smooth scroll | Library smooth scroll | Library smooth scroll | Native scrolling | Native scrolling, `scroll-behavior: auto` |
| Particles/ambient | GPU particles | 2D canvas, few particles | CSS gradient animation (slow) | Static gradient |
| Page transitions | View Transitions with shared elements | View Transitions crossfade | View Transitions crossfade | Instant swap |

Implementation rules:
- Ship the fallback in the HTML (poster image, static layout). Mount the enhanced layer on top only when the tier allows it (`data-kui-min-tier`, `data-kui-max-tier` in `assets/tokens/motion.css`).
- Load heavy code conditionally: `if (tier >= 3) import('./scene.js')`. Never bundle three.js into the main chunk.
- Keep content readable and interactive at T0; effects decorate content, they never carry it.
- Respect battery: stop loops when idle, avoid continuous animation behind static content.

## Verification

1. DevTools → Performance: CPU 4× (or 6×) slowdown; confirm no long tasks during scroll and stable frame rate.
2. DevTools → Rendering: emulate `prefers-reduced-motion: reduce` and confirm the T0 behavior.
3. Test on one real low-end Android device when the product targets mobile.
4. Record LCP, INP, and CLS before and after adding effects.
