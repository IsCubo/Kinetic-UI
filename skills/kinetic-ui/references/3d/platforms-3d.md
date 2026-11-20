# 3D platforms and libraries

> Keywords: 3d platform, unity 3d, unreal, godot, blender, babylon.js, react three fiber, model-viewer, realitykit, scenekit, filament, sceneview, flutter 3d, impeller, usdz, gltf import, offline render, turntable, motor 3d, unreal engine, diorama, three.js, webgpu, tsl, flutter_scene, model_viewer_plus, ar, keyshot, interchange
> Summary: Routes each 3D goal to its platform and library (three.js, React Three Fiber, Babylon.js, model-viewer, Unity, Unreal, Godot, RealityKit, Filament, flutter_scene, offline renders), with the glTF interchange contract and what each importer loses.

Use three.js for a real piece on the web; use each other platform's own library and language everywhere else. One glTF master travels between them; the web runtime contract (poster, lazy chunk, tiers, dispose) stays in `references/effects/webgl-3d.md` and is not repeated here. Versions, licences, and sizes live only in `references/libraries.md`. Decide first whether the piece needs interaction: if not, render offline; if yes, use the platform the product already ships on.

## How to choose

| Goal | Platform | Library | Honest cost |
| --- | --- | --- | --- |
| Marketing or product page on the web | Web | three.js | Lazy chunk plus megabyte-scale assets; needs a developer who knows PBR and disposal |
| 3D inside a React app | Web (React) | React Three Fiber + drei | three.js cost plus the React layer; pin fiber, drei, and three together |
| Large web app or game-like scene with GUI/inspector needs | Web | Babylon.js | Bigger core than three.js; pays off only when you use the engine features |
| One product with AR, no build step | Web | `<model-viewer>` | One web component; limited custom interaction; iOS AR needs a USDZ file |
| iOS app | Apple | RealityKit (SceneKit for legacy code) | Apple-only; USDZ authoring; small team skill gap for Swift 3D |
| Android app | Android | Filament, or SceneView on top | Native PBR quality; ARCore and Compose wiring is your work |
| Flutter app | Flutter | `flutter_scene`; `model_viewer_plus` for a quick viewer | Impeller-based and young; the viewer is a WebView with different tradeoffs |
| A game or desktop app | Engine | Unity, Unreal, or Godot | Engine-sized install and a team that knows the editor; Unreal is the heaviest |
| Stills and turntables | Offline | Blender Cycles, KeyShot, Marmoset | Render time and storage; zero runtime cost, no interaction |

## Web: three.js

The default for a rendered real piece. Depth (scale, lighting, PBR values, colour management, readback) lives in `references/3d/real-object-render.md`; the lazy-load and dispose contract lives in `references/effects/webgl-3d.md`; a runnable starter is `assets/snippets/three-product-scene.js`.

| Concern | API surface |
| --- | --- |
| Core | `WebGLRenderer`, `Scene`, `PerspectiveCamera` |
| Materials | `MeshStandardMaterial` by default; `MeshPhysicalMaterial` for clearcoat, transmission, sheen |
| Lighting | `PMREMGenerator` + a studio environment (`RoomEnvironment` from the addons, or an HDR), `scene.environmentIntensity` |
| Colour | `renderer.outputColorSpace`, `NeutralToneMapping` or `AgXToneMapping` (`ACESFilmicToneMapping` shifts hues; test before using) |
| Loading | `GLTFLoader` + `DRACOLoader`, `KTX2Loader`, `MeshoptDecoder` |
| Post | `EffectComposer` + `OutputPass` last, only when a pass is needed (T3, 1–2 passes) |
| WebGPU | `three/webgpu` (`WebGPURenderer` + TSL) tries WebGPU and falls back to WebGL 2 |

- One renderer per page, one lazy module, dispose everything on teardown.
- Host the Draco, Basis, and Meshopt decoders yourself and set their paths explicitly.
- Treat `three/webgpu` as opt-in: test its WebGL 2 fallback on a real mid-range phone first.

## Web: React Three Fiber

Use it when the page is already a React app and scene state follows component state. It is a declarative renderer over three.js, not a different engine.

| Need | API |
| --- | --- |
| Root | `<Canvas>` (one per page) |
| Model | `useGLTF`, preloaded with `useGLTF.preload` |
| Lighting | `<Environment>`, `<Stage>` for a fast studio setup |
| Grounding | `<ContactShadows>` |
| Camera | `<OrbitControls>` with min/max polar and distance limits |
| Hotspots | `<Html>` anchored to a 3D point; keep labels as DOM text |

- React peer requirement: React 19 (fiber 9 line). Pin fiber, drei, and three together; a loose range breaks on the next minor.
- Static scene: set `frameloop="demand"` and call `invalidate()` on interaction; a continuous loop burns battery for nothing.
- Wrap the model in `<Suspense>` with the poster as the fallback; call `useGLTF.preload` once the tier allows 3D.
- Keep fast-changing values (hover, scroll) in refs or `useFrame`, not React state. Dispose on unmount and clear unused `useGLTF` cache entries.

## Web: Babylon.js

Engine-first alternative. Pick it when you need a full engine (GUI layer, inspector, physics, node materials) rather than one scene. Pick three.js for a single hero model.

| Concern | API surface |
| --- | --- |
| Core | `Engine`, `Scene`, `ArcRotateCamera` |
| Materials | `PBRMaterial` (metallic-roughness maps from glTF) |
| Loading | glTF/glb loaders; `KTX2Decoder` for KTX2 textures |
| Lighting | A prefiltered `.env` environment texture, built once from an HDR |
| Review | Inspector for scene debugging; Sandbox for asset review before wiring code |
| Annotations | Babylon GUI for in-scene labels; keep real copy in the DOM |

- The core is larger than three.js: import only the modules you use and lazy-load the chunk behind the poster.
- Review every asset in the Sandbox first; if it looks wrong there, the glTF is wrong. Call `scene.dispose()` and `engine.dispose()` on teardown.

## Web: model-viewer and AR

The no-build path: one web component, one product, optional AR. Use three.js instead when interaction must be custom (configurators, hotspots tied to app state, scroll-linked views).

```html
<model-viewer
  src="runner.glb" ios-src="runner.usdz" poster="runner.avif"
  alt="Trail runner in coral, studio side view"
  camera-controls auto-rotate
  environment-image="studio.hdr" exposure="1" shadow-intensity="0.8"
  tone-mapping="neutral"
  ar ar-modes="webxr scene-viewer quick-look">
</model-viewer>
```

| Attribute | Role |
| --- | --- |
| `src`, `ios-src` | glb for the web and Android; USDZ for iOS Quick Look |
| `poster` | Static image shown before load; the T2 fallback |
| `camera-controls`, `auto-rotate` | Orbit input; auto-rotate needs a pause path (`## Reduced motion`) |
| `environment-image`, `exposure`, `shadow-intensity` | Lighting and grounding |
| `tone-mapping` | `neutral` for faithful brand colour, `agx` for a filmic roll-off |
| `ar`, `ar-modes` | Enables AR and orders the modes tried |

- iOS AR needs the USDZ companion, exported from the same master; check materials on a device. Load the component lazily, after the tier check.

## Engines

Use an engine when the 3D is the product (a game, a desktop tool, a kiosk), not a page section. Each engine renders through its own PBR pipeline; rebuild materials there.

### Unity

| Topic | Decision |
| --- | --- |
| Pipeline | URP with Lit materials; Shader Graph for custom surfaces |
| glTF at runtime | glTFast |
| Delivery and textures | Addressables for downloadable assets; ASTC on mobile, ETC2 as the Android fallback |
| WebGL build | Large download plus decompression cost; set the compression format your host serves and measure startup |
| CAD and materials | Unity Industry tooling or PiXYZ for CAD import; test the material conversion on one asset first |

### Unreal

| Topic | Decision |
| --- | --- |
| CAD | Datasmith imports CAD and keeps hierarchy and metadata |
| glTF | Import through Interchange; verify materials after import |
| Realtime | Nanite for dense geometry, Lumen for global illumination |
| Stills and turntables | Path Tracer with Movie Render Queue |
| Browser reach | Pixel Streaming sends rendered frames to a browser; you pay for servers and latency |
| Fit | Too heavy for a landing page; use it for configurators backed by a streaming budget, or for offline renders |

### Godot 4

| Topic | Decision |
| --- | --- |
| glTF | Built-in editor import; `GLTFDocument` and `GLTFState` load files at runtime |
| Materials | `StandardMaterial3D` for PBR |
| Lighting | `WorldEnvironment` with a sky, plus reflection probes for local reflections |
| Web export | Supported; check threading and hosting headers before you commit (`## Pitfalls`) |
| Fit | Small engine; good for an app or an indie product viewer |

## Native

Use the platform's own 3D library and language; do not wrap a WebView around three.js unless the web build already exists and is the product. UI integration lives in `references/platforms/swiftui.md`, `references/platforms/jetpack-compose.md`, and `references/platforms/flutter.md`.

### Apple: RealityKit and SceneKit

| Topic | Decision |
| --- | --- |
| Format | USDZ; convert and inspect with Reality Converter |
| View | `RealityView` in SwiftUI, `ModelEntity` for each piece |
| Materials and light | `PhysicallyBasedMaterial`; image-based lighting through an environment resource |
| SceneKit | Legacy path; keep for existing code, start new work in RealityKit |
| AR | Real-world scale matters: author in metres, then check the size next to a known object |

### Android: Filament and SceneView

| Topic | Decision |
| --- | --- |
| Filament | Renders glTF with KTX2 textures natively; ships its own model viewer for review |
| SceneView | Wraps Filament for Compose and View, and adds ARCore support |
| Look | PBR plus image-based lighting (IBL); destroy engine and assets with the host lifecycle |

### Flutter: flutter_scene

| Option | Use | Tradeoff |
| --- | --- | --- |
| `flutter_scene` | Impeller-based 3D with glTF import, drawn inside the Flutter render tree, no WebView | Young API; verify it on your target devices and Flutter channel |
| `model_viewer_plus` | Quick viewer and AR | Runs `<model-viewer>` in a WebView: extra memory, no native widget compositing |
| `flutter_gl`, `three_dart` | Avoid for new work | Maintenance risk; verify recent releases before choosing |

Check the current state of each package in `references/libraries.md`. Impeller is the renderer under all of it.

## Offline stills and turntables

| Tool | Use |
| --- | --- |
| Blender Cycles | Stills and turntables; use the AgX view transform for natural roll-off |
| KeyShot, Marmoset | Fast product stills from CAD or a scanned asset |

- Turntable: render 36–72 frames around the vertical axis; encode to AVIF stills for a frame scrubber or to WebM for a clip (T2).
- Choose a still or turntable over realtime when the piece does not need interaction: fixed bytes, better light, zero per-frame CPU.

## The interchange contract

glTF 2.0 PBR metallic-roughness is the only sane interchange between tools and platforms.

| Rule | Value |
| --- | --- |
| Units | Metres |
| Axes | Y-up, +Z forward |
| Materials | Metallic-roughness PBR plus KHR extensions (clearcoat, transmission, variants) |
| Compression | Draco or Meshopt for geometry; KTX2 for textures, per `references/3d/asset-pipeline.md` |
| Apple exception | USDZ is derived from the same master for Quick Look and RealityKit |

Every importer loses something:

- Clearcoat and transmission often flatten outside three.js and Babylon.js; test them in the target.
- CAD tessellation quality varies by tool and settings; inspect silhouettes on curved parts.
- Material graphs (Blender nodes, Shader Graph, Unreal materials) do not transfer; only baked PBR maps do.
- Rebuild materials in the target from reference photos, not from the exporting tool's preview.
- Keep the master source (CAD or `.blend`) and the reference photos; re-test every export in the target.

## Reduced motion

| Platform | Behavior |
| --- | --- |
| Web | Follow the tier system: reduced motion forces T0, so no renderer starts and the poster stays; see `references/foundations/performance-tiers.md` |
| Native (Apple, Android, Flutter) | Honour the OS reduce-motion setting: stop auto-rotation and camera moves, hold a static pose |

- Never auto-orbit without a pause control; stills are the universal fallback.

## Low-end fallback

| Platform | T3 realtime | T2 | T1 |
| --- | --- | --- | --- |
| Web three.js, R3F, Babylon.js | Live scene | Pre-rendered turntable or poster | Still |
| `<model-viewer>` | Live viewer with AR | Viewer with `poster` and tap-to-load | Poster image |
| Apple | RealityKit view | Rendered turntable frames | Still |
| Android | Filament or SceneView | Rendered turntable frames | Still |
| Flutter | `flutter_scene` | `model_viewer_plus` with a poster, or turntable frames | Still |
| Engines | Full scene | Lower quality preset | Still or video |

Tier definitions and detection: `references/foundations/performance-tiers.md`.

## Accessibility

- Give the canvas a label (`aria-label` with `role="img"`) that names the product and the view; keep every real fact (price, dimensions, material) as a DOM text alternative next to the viewer.
- Provide keyboard rotation (arrow keys or buttons) and zoom; drag is never the only input.
- Offer an AR alternative link (the USDZ or glb file, or a photo set) for users who cannot use the camera.
- Caption any narrated turntable and expose a pause control.
- Native: label the 3D view and honour OS reduce-motion; see `references/foundations/accessibility-motion.md`.

## Pitfalls

- Choosing an engine for a landing page: engine runtimes cost far more than one three.js scene; use an engine only when the 3D is the product.
- An importer silently flattening PBR: clearcoat, transmission, or roughness maps vanish with no error; compare against reference photos after every import.
- Scale and axis mismatch: a Z-up or centimetre export arrives tiny, huge, or rotated; check metres and Y-up at export and in the target.
- USDZ losing materials: conversions can drop extensions; open the USDZ in Quick Look on a device.
- Missing Draco or KTX2 decoder paths: the model fails to decode with an empty scene; host the decoders and set their paths.
- WebGL context limits: browsers cap live contexts; one renderer per page, posters elsewhere.
- R3F re-rendering the scene per state change: put fast values in refs, use `frameloop="demand"`, and keep the model in its own component.
- Babylon.js bundle size: import only the modules used, lazy-load the chunk, and compare against three.js before you commit.
- Godot web threading: threaded web exports need specific hosting headers; test on your real host, not only locally.
- AR scale: a model authored without real dimensions looks wrong on the table; author in metres and test next to a known object.
- Using a stale Flutter GL package: `flutter_gl` has had no recent release; prefer `flutter_scene`.
- Treating a turntable video as an interactive viewer: users cannot inspect, zoom, or configure it; label it as a preview and offer a real viewer when inspection matters.
