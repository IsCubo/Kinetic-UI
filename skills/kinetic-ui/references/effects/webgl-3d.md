# WebGL and 3D scenes

> Keywords: webgl, webgl2, webgpu, three.js, 3d scene, renderer, perspective camera, fov, lighting, key light, environment map, pbr, mesh standard material, product viewer, 360 viewer, configurator, orbit controls, turntable, bloom, postprocessing, r3f, react three fiber, tresjs, threlte, ogl, lazy three, escena 3d
> Summary: Anatomy of a lazy-loaded, tier-gated three.js/WebGL scene with starter camera, lighting, and material values, product and hero use cases, and the honest costs.

Realtime 3D is this skill's most expensive effect: a large lazy chunk, megabytes of assets, a WebGL2 context, and CPU and GPU spent every frame. Ship the poster first, load the scene only at T3, and stay honest about 2D alternatives — much of what gets requested as "3D" is better served by `references/effects/motion-2d.md` or pre-rendered footage.

## When to use

| Product goal | Scene pattern |
| --- | --- |
| 360° product inspection | One model, drag-to-orbit plus button rotation |
| Configurator (colors, materials, parts) | Shared geometry; materials swap per option |
| Launch or hero with real depth | One hero model, environment lighting, pointer-driven camera (fine pointers) |
| Exploded or annotated view | Model plus camera keyframes synced to scroll (T3) |

## When not to use

- Content inside the scene: copy, pricing, forms, and checkout never render in WebGL; what users read stays DOM.
- When 2D is enough: flat planes (`references/effects/parallax.md`), gradient scenes, or a pre-rendered turntable video (`references/effects/motion-2d.md` for Lottie/Rive) cost bytes, not per-frame CPU.
- Where assets cannot fit: uncompressed vendor model dumps (FBX/OBJ with baked textures) blow the budget; if it cannot be compressed to glTF sized for the frame, the effect does not ship.
- Below the fold with low scroll-through: the chunk only pays rent when users reach it.
- Several scenes per page: one WebGL context per page; cards and grids get posters.

## How it works

Scene anatomy:

| Part | Role | Baseline |
| --- | --- | --- |
| Renderer | Owns the WebGL2 context; draws frames | One per page; browsers cap concurrent contexts (~16) |
| Scene | The render graph: objects, lights, camera | A single root |
| Camera | The viewpoint | `PerspectiveCamera`, FOV 30–40° |
| Lights | What materials respond to | One key (directional), one fill (ambient/hemisphere), one shared environment map |
| Materials | Surface response | `MeshStandardMaterial` (PBR); share few instances |
| Geometry | Shape | Shared `BufferGeometry`; load glTF compressed (Draco/Meshopt) |
| Controls | Rotate or zoom the product | Pointer-drag orbit plus a keyboard/button equivalent |
| Frame loop | Renders frames | On demand when static; continuous only while animating, visible, unpaused |

Lazy-load pipeline. assets/effects/webgl-3d.js implements exactly this contract:

| Stage | Guard | What runs |
| --- | --- | --- |
| Static paint | Always | The poster `<img>` carries the content |
| After load + idle | Tier ≥ 3 and no reduced-motion preference | Helper starts watching; still no 3D bytes |
| Scene enters viewport | IntersectionObserver | Dynamic `import()` of the scene chunk — the only place three.js is imported |
| Scene created | Factory returns `{ start, stop, dispose }` | First frame renders; state becomes `running` |
| Offscreen, tab hidden, or user pause | — | `stop()`; the poster waits beneath the canvas |
| Tier drop, context loss, or unmount | — | `dispose()`; state becomes `fallback`; the poster reappears |

Cost reality (the honest limits):

- Download: three.js is a large lazy chunk on top of the model, its textures, and any loader plugins — plan a megabyte-scale budget, spent strictly after LCP.
- GPU memory: framebuffers at render scale, textures, and geometry add up fast; every extra renderer multiplies it.
- Battery and heat: continuous animation on a hero drains mobile batteries in minutes and throttles on mid-range phones.
- Realtime is not always better: a pre-rendered turntable video is fixed bytes with zero per-frame CPU and often looks better — it is the default at T2.

## Implementation

### Poster-first markup

```html
<section class="gl-scene" aria-label="Runner 3D preview">
  <img class="gl-scene__poster" src="runner.avif" alt="Trail runner in coral, studio side view" width="1600" height="1000">
  <canvas class="gl-scene__canvas" role="img" aria-label="Interactive 3D view of the Runner shoe" data-kui-min-tier="3"></canvas>
  <button class="gl-scene__pause" type="button" aria-pressed="false" data-kui-min-tier="3">Pause 3D view</button>
</section>
```

The tier utilities (`assets/tokens/motion.css`) hide the canvas and pause button until T3; the poster is the content at T0–T2.

```css
.gl-scene {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--brand-surface);
  border-radius: var(--brand-radius);
  overflow: clip;
}
.gl-scene__poster,
.gl-scene__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gl-scene__pause {
  position: absolute;
  inset: auto 12px 12px auto;
  visibility: hidden;
  color: var(--brand-on-surface);
  background: color-mix(in oklab, var(--brand-surface) 85%, transparent);
  border: 1px solid color-mix(in oklab, var(--brand-on-surface) 25%, transparent);
  border-radius: var(--brand-radius);
}

/* The canvas exists only at T2/T3 per the tier utilities; state transitions live here too. */
:root:is([data-motion-tier="2"], [data-motion-tier="3"]) .gl-scene__canvas {
  opacity: 0;
  transition: opacity var(--kui-duration-lg) var(--kui-ease-standard);
}
:root:is([data-motion-tier="2"], [data-motion-tier="3"])
  .gl-scene:where([data-kui-scene="running"], [data-kui-scene="paused"]) .gl-scene__canvas { opacity: 1; }
.gl-scene:where([data-kui-scene="running"], [data-kui-scene="paused"]) .gl-scene__pause { visibility: visible; }
```

The helper mirrors its state to `data-kui-scene="idle|loading|running|paused|fallback"` on the host, so the CSS above needs no extra logic. Under reduced motion the canvas never appears, so a fade needs no extra gate to be safe.

### Mount through the skill helper

```js
import { applyMotionTier } from './motion-tier.js';    // assets/snippets/motion-tier.js
import { mountSceneWhenAllowed } from './webgl-3d.js'; // assets/effects/webgl-3d.js

applyMotionTier(); // writes <html data-motion-tier>; re-checks the OS reduced-motion setting

const host = document.querySelector('.gl-scene');
const scene = mountSceneWhenAllowed(host, async (canvas, { dpr, fail }) => {
  const { createProductScene } = await import('./gl-product-scene.js'); // the only chunk importing three
  return createProductScene(canvas, { dpr, fail });
});

const pause = document.querySelector('.gl-scene__pause');
pause.addEventListener('click', () => {
  const resuming = scene.state === 'paused';
  if (resuming) scene.resume(); else scene.pause();
  pause.setAttribute('aria-pressed', String(!resuming));
  pause.textContent = resuming ? 'Pause 3D view' : 'Play 3D view';
});
```

The helper owns visibility, pausing, tier drops, context loss, and disposal. Do not write a second render loop around the same canvas.

### Scene module

```js
import * as THREE from 'three'; // this file is the only module that imports three

export function createProductScene(canvas, { dpr, fail }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.75, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr); // the helper caps it (2 desktop, 1.5 on coarse pointers)
  const sceneRoot = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  camera.position.set(0, 1.5, 6);
  camera.lookAt(0, 0.4, 0);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 3);
  sceneRoot.add(key, new THREE.AmbientLight(0xffffff, 0.4));
  // Load the model here, in this module. On failure call fail(error): the helper keeps the poster.
  //   new THREE.GLTFLoader().loadAsync(url).catch((error) => fail(error));

  const render = () => renderer.render(sceneRoot, camera);

  return {
    start() { renderer.setAnimationLoop(render); },
    stop() { renderer.setAnimationLoop(null); },
    resize(width, height, dprValue) {
      renderer.setPixelRatio(dprValue);
      renderer.setSize(width, height, false); // CSS owns the canvas box
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      sceneRoot.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose?.();
          material.dispose?.();
        }
      });
      renderer.dispose(); // releases the WebGL2 context; GPU memory is not garbage-collected
    },
  };
}
```

For a mostly static product, prefer render-on-demand: render once when mounted, again on pointer movement or resize, instead of `start()`'s continuous loop. Pointer-driven camera drift lives in the render function reading two cached values written by one `pointermove` handler — never a per-frame `getBoundingClientRect`. Drag-to-orbit needs button equivalents (see `## Accessibility`).

### Camera, lights, materials: starter values

| Setting | Starter value | Why |
| --- | --- | --- |
| Camera FOV | 30–40° | Wider than ~50° bends packaging; fisheye reads wrong |
| Camera distance | 1.5–2× the model's largest dimension | Fills the frame without clipping |
| Camera height | Slightly above center, aimed at the model | Eye-level with a nod; matches product photography |
| Key light | Directional, ~45° above and to one side | Defines form; add contact shadows if the ground plane matters |
| Fill | Ambient or hemisphere at low intensity | Keeps unlit sides readable without flattening |
| Environment | One neutral studio map | Metals, glass, and clearcoat need it; share one texture |
| Materials | `MeshStandardMaterial`, roughness 0.3–0.7 | PBR; a handful of shared materials, not one per part |
| Color | Read `--brand-*` once with `getComputedStyle` | Brand colors enter as material colors; never hardcode hexes that drift |

## Reduced motion

Exact T0 behavior:

- The renderer is never initialized: `mountSceneWhenAllowed` checks `prefers-reduced-motion: reduce` on its own, and assets/snippets/motion-tier.js forces T0 when that preference is set. Both must clear before the dynamic `import()` runs, so three.js is never fetched and no WebGL2 context is created.
- The poster image is the entire experience; the canvas and pause control stay hidden through the tier utilities.
- The only allowed motion is a fade of ≤200ms on whole static elements (motion tokens collapse travel and scale to neutral).
- No partial exceptions: no auto-orbit, no camera sway, no "subtle" version of the scene at T0.

## Low-end fallback

| Tier | Behavior | Removed or simplified |
| --- | --- | --- |
| T3 | Full scene; post-processing capped at 1–2 passes; pointer camera drift; pause control | — |
| T2 | Realtime rendering never runs; the poster, or a pre-rendered turntable video/Lottie with a token-scaled fade | Renderer, shaders, post-processing, controls, WebGL context |
| T1 | Static poster with a CSS fade/enter only | Everything above |

Automatic safety nets: assets/snippets/motion-tier.js caps the tier when WebGL2 is unavailable, and `watchFrameRate()` drops one tier on sustained jank. On a drop to T2 the helper disposes the scene (releasing GPU memory and the context) and the poster returns.

## Performance budget

- Chunking: three.js lives in one lazy chunk behind `import()`, loaded after `load` and idle, only at T3. Never imported from the main bundle.
- Render scale: the helper caps `devicePixelRatio` at 2 (1.5 on coarse pointers) and sizes render targets to the visible canvas.
- Geometry: budget by draw calls (≤ ~100 for a hero) and triangles (stay under a few hundred thousand); share buffers; compress to glTF (Draco/Meshopt) and KTX2 textures.
- Textures: reuse them; ≤ 2048px per channel; one shared environment map instead of bespoke maps per object.
- Frame loop: render on demand when the pose is static; continuous only while animating, visible, and unpaused (the helper enforces visibility and pause).
- One renderer per page; post-processing is a full-screen pass per effect, so at most 1–2 passes at T3 and none below.
- Memory: call `dispose()` on geometry, materials, textures, and the renderer on teardown — the skeleton above and the helper both show it; GPU memory is not garbage-collected.
- Verify with 4× CPU throttling and record LCP, INP, and CLS before and after (`references/foundations/performance-tiers.md`).

## Accessibility

- The poster `<img>` describes the product (it is the content at T0–T2). At T3 the canvas is `role="img"` with a text label; a purely decorative scene takes `aria-hidden="true"` instead.
- Motion that runs longer than 5 s automatically (turntable, auto-orbit) needs a visible pause control (WCAG 2.2.2); the helper exposes `pause()`, and the button reflects it with `aria-pressed`.
- Drag-to-orbit must not be the only way to rotate (WCAG 2.5.1, 2.5.7): ship rotation buttons (arrow-step) reachable by keyboard (WCAG 2.1.1).
- No flashes above 3 per second, including strobe and glitch shader passes (WCAG 2.3.1).
- Captions or overlays over the canvas keep 4.5:1 contrast in every frame — lighting moves the background under them (WCAG 1.4.3).
- Keep a 1px border on the scene surface so the region stays visible in forced-colors mode.
- Offer the in-product "Reduce motion" toggle that forces T0, per `references/foundations/accessibility-motion.md`.

## Libraries

- three.js (MIT): pin the exact version — not semver, any release can break APIs. `three/webgpu` (WebGPURenderer) tries WebGPU and falls back to WebGL 2.
- postprocessing (Zlib) for bloom, glitch, and chromatic aberration: requires three `>=0.168 <0.187`, so pin three and postprocessing together.
- React Three Fiber + drei: React `>=19 <19.4`. TresJS for Vue (Vue ≥ 3.4), Threlte for Svelte (Svelte 5, three ≥ 0.172).
- OGL (Unlicense): minimal WebGL when only a shader or two is needed; small core, infrequent releases.
- GSAP timelines are free but not OSI-licensed; a 3D scene rarely needs them.
- Versions, licenses, and caveats: `references/libraries.md`.

## Pitfalls

- Importing three.js at the top level of the entry point: it ships in the main bundle and destroys LCP. One lazy chunk, one importer.
- Creating a renderer per instance (cards, rows): contexts and GPU memory are finite; browsers kill pages around ~16 live contexts. One renderer per page, posters everywhere else.
- Uncapped `devicePixelRatio`: a 4K panel renders 4× the pixels. The helper caps it; custom code must too.
- Missing `resize()` handling: `camera.aspect` stays stale after rotation and the image distorts. The helper's ResizeObserver covers it only if the scene implements `resize`.
- `preserveDrawingBuffer: true` "just in case": it disables optimizations. Only for screenshots, and only when actually needed.
- Uncompressed assets: vendor FBX/OBJ dumps with baked textures are megabytes of download and decode. glTF, compressed, decimated.
- Tearing down without disposing: GPU memory and the context survive JS garbage collection. Traverse and dispose as the skeleton shows.
- Ignoring `webglcontextlost`: without the handler the scene freezes silently. The helper listens and falls back to the poster.
- Post-processing on mid-range hardware: every pass is a full-screen render. T3 only, 1–2 passes.
- Ignoring tier drops: a custom mount must listen for `kui:motiontierchange` and tear down; the helper does this for you.
- Auto-orbit that never pauses: WCAG 2.2.2 needs a pause control for self-running motion over 5 s.
