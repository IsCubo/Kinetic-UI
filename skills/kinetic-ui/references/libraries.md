# Libraries

> Keywords: libraries, animation library, three.js, react three fiber, gsap, motion, framer motion, lenis, anime.js, pixi, ogl, lottie, dotlottie, rive, auto-animate, tresjs, threlte, postprocessing, tilt, flutter animation, license, versions
> Summary: Verified catalog of proven animation, scroll, 2D, and 3D libraries with license, maintenance status, caveats, and which need and tier each one fits.

Snapshot verified on **2026-10-22** against the npm and pub.dev registries, web-features 3.43.0, and MDN browser-compat-data 8.1.7. Versions move. Before installing, confirm the current version and license in the registry or official docs, and pin the exact version in the lockfile.

## Choose by need

| Need | First choice | Alternatives | Tier |
| --- | --- | --- | --- |
| Hover, press, enter/exit, state changes | Native CSS transitions + `assets/tokens/motion.css` | Web Animations API | T1 |
| Element entry from `display: none` | CSS `@starting-style` | Motion | T1 |
| Scroll-linked reveal or progress | CSS scroll-driven animations with `@supports`, falling back to IntersectionObserver | Motion `scroll()`, GSAP ScrollTrigger | T1–T2 |
| Route or page transitions | View Transitions API | Framework router transitions | T1 |
| Declarative motion in React | Motion (`motion/react`) | — | T2 |
| Complex timelines, SVG morph, split text | GSAP (check its license) | anime.js | T2 |
| Zero-config list, add, and remove transitions | AutoAnimate | Motion layout animations | T2 |
| Smooth scroll | Lenis (T2+ only; native scroll at T0/T1) | — | T2 |
| Designer-made vector animation | dotLottie web, Rive | lottie-web (maintenance risk) | T2 |
| Interactive, stateful character or illustration | Rive | — | T2 |
| 2D GPU scenes and many sprites | PixiJS | Canvas 2D | T2–T3 |
| 3D scenes, product viewers, shaders | three.js | OGL (minimal) | T3 |
| 3D in React / Vue / Svelte | React Three Fiber (+ drei) / TresJS / Threlte | — | T3 |
| 3D post-processing (bloom, glitch, chromatic aberration) | pmndrs `postprocessing` (+ `@react-three/postprocessing`) | three.js `EffectComposer` | T3 |
| Tilt cards | A small custom implementation (see `references/effects/depth-layers.md`) | Atropos, vanilla-tilt (both stale) | T2 |

## Web catalog

| Package | Version (2026-10-22) | License | Last release | Use | Caveats |
| --- | --- | --- | --- | --- | --- |
| `three` | 0.186.1 | MIT | 2026-09 | Core 3D (WebGL; `three/webgpu`, `three/tsl`) | Not semver: any release can break APIs, so pin it. WebGPURenderer tries WebGPU, then falls back to WebGL 2 |
| `@react-three/fiber` | 9.8.2 | MIT | 2026-10 | React renderer for three.js | Requires React `>=19 <19.4` and three `>=0.156`; v10 is still alpha |
| `@react-three/drei` | 10.7.9 | MIT | 2026-09 | Helpers for R3F (controls, loaders, environment) | Requires React 19 and fiber 9 |
| `postprocessing` | 6.39.5 | Zlib | 2026-09 | Effect pipeline for three.js | Requires three `>=0.168 <0.187`, so pin three and postprocessing together |
| `@react-three/postprocessing` | 3.2.2 | MIT | 2026-10 | R3F wrapper for postprocessing | Requires fiber `>=9.7` and postprocessing ^6.36 |
| `gsap` | 3.15.0 | Custom no-charge license (not OSI) | 2026-04 | Timelines, ScrollTrigger, SplitText, Flip, MorphSVG | Free for all users, including the plugins. The license is proprietary: it restricts use in no-code visual animation tools that compete with Webflow. Review it before using GSAP in such a product |
| `motion` | 14.6.0 | MIT | 2026-10 | `motion/react` plus vanilla `animate`, `scroll`, `inView` | Supports React 18/19. `framer-motion` is built from the same repo. Some editor tooling is paid (Motion+) |
| `lenis` | 1.3.27 | MIT | 2026-10 | Smooth scroll | `@studio-freight/lenis` is deprecated; use `lenis`. Never enable it at T0/T1 |
| `animejs` | 4.5.0 | MIT | 2026-06 | General-purpose animation | v4 API: named ESM imports (`import { animate } from 'animejs'`). v5 is in beta |
| `pixi.js` | 8.22.0 | MIT | 2026-10 | 2D GPU renderer | Subpath exports allow tree-shaking |
| `ogl` | 1.0.11 | Unlicense | 2025-01 | Minimal WebGL | Small core; infrequent releases |
| `@lottiefiles/dotlottie-web` | 0.81.0 | MIT | 2026-10 | Lottie and `.lottie` playback (WASM) | Pre-1.0. It fetches a ~500 KB WASM engine from a CDN by default, so self-host it for privacy and offline use |
| `lottie-web` | 5.13.0 | MIT | 2025-05 | Classic Lottie player | No release in about 17 months: maintenance risk. Prefer dotLottie web |
| `@rive-app/canvas` | 2.45.0 | MIT | 2026-10 | Rive state machines | WASM runtime; `@rive-app/canvas-lite` is a lighter variant |
| `@formkit/auto-animate` | 0.10.0 | MIT | 2026-07 | Automatic list and layout transitions | Pre-1.0. Adapters for React, Vue, Preact, Solid, Angular, Nuxt |
| `@tresjs/core` | 5.9.3 | MIT | 2026-10 | Vue + three.js | Requires Vue ≥3.4 |
| `@threlte/core` | 8.6.1 | MIT | 2026-09 | Svelte + three.js | Requires Svelte 5 and three ≥0.172 |
| `atropos` | 2.0.2 | MIT | 2023-07 | 3D tilt/parallax cards | No release in 3+ years: avoid it for new work |
| `vanilla-tilt` | 1.8.1 | MIT | 2023-08 | Tilt cards | No release in 3+ years: avoid it for new work |

## Native and cross-platform

| Platform | Built-in APIs (no package) | Packages | Notes |
| --- | --- | --- | --- |
| Flutter | Implicit animations, `AnimationController`, `Hero`, `AnimatedSwitcher`, `FragmentProgram` shaders | `rive` 0.14.11 (pub.dev, 2026-08; needs Flutter ≥3.28, Dart ≥3.6); `flutter_animate` 4.5.2 | `flutter_animate` has had no release in about 23 months: maintenance risk. Verify the Rive package license before use. See `references/platforms/flutter.md` |
| SwiftUI | `withAnimation`, springs, `matchedGeometryEffect` (iOS 14+), `PhaseAnimator`, `KeyframeAnimator`, `scrollTransition` (iOS 17+) | Rive and Lottie iOS runtimes | See `references/platforms/swiftui.md` |
| Jetpack Compose | `animate*AsState`, `AnimatedVisibility`, `AnimatedContent`, `updateTransition`, `SharedTransitionLayout` | Rive and Lottie Android runtimes | Check whether shared-element APIs are still experimental in your Compose version. See `references/platforms/jetpack-compose.md` |

## Web platform features (no library)

| Feature | Baseline (2026-10-22) | Chrome | Safari | Firefox | Use with |
| --- | --- | --- | --- | --- | --- |
| Scroll-driven animations (`scroll()`, `view()`) | Limited | 115 | 26 | 159 (scheduled 2026-10-27) | `@supports (animation-timeline: view())` and an IntersectionObserver fallback |
| View Transitions, same-document | Newly available | 111 | 18 | 144 | Feature-check `document.startViewTransition` |
| View Transitions, cross-document | Limited | 126 | 18.2 | — | Progressive enhancement only |
| `@starting-style` | Newly available | 117 | 17.5 | 129 | Entry animations |
| `linear()` easing | Widely available | 113 | 17.2 | 112 | `--kui-ease-spring` |
| `prefers-reduced-motion` | Widely available | 74 | 10.1 | 63 | Mandatory everywhere |
| `prefers-reduced-transparency` | Limited | 118 | — | Behind a flag | Glass fallback |
| WebGPU (`navigator.gpu`) | Limited | Desktop; Android 121 | 26 | 141 (Windows) | WebGPURenderer with WebGL 2 fallback |
| `navigator.deviceMemory`, `connection.saveData` | Limited (Chromium only) | Yes | — | — | Tier detection signals only, never assumptions |

## Rules

1. Prefer platform features first (CSS, View Transitions, Web Animations), then the smallest library that does the job. Every library must justify its weight at its tier.
2. Load T3 libraries (three.js, R3F, postprocessing, PixiJS for big scenes) only through a dynamic `import()` after the main content renders.
3. Pin three.js and its ecosystem (fiber, drei, postprocessing) to compatible versions; check peer ranges before upgrading any of them.
4. Treat a package with no release in more than 12 months as a maintenance risk. Prefer an active alternative or a small custom implementation.
5. Check every license against the product's use case. Not every free library is open source: GSAP's license is proprietary.
6. Self-host WASM engines and fonts instead of loading them from third-party CDNs at runtime.
7. Re-verify this table when it is older than six months: query the npm registry (`https://registry.npmjs.org/<package>/latest`) or the library's official docs.
