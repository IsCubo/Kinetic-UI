# Inspecting and configuring a real piece

> Keywords: 360 viewer, product viewer, configurator, orbit controls, zoom to cursor, preset views, exploded view, hotspots, annotations, material variants, khr_materials_variants, dimension overlay, measurement, ar handoff, model-viewer ar, quick look, scene viewer, webxr, turntable, inspection, keyboard orbit, configurador, pieza real, medidas, despiece
> Summary: Interaction design for a real object in 3D: orbit semantics and limits, preset views, exploded and scroll-linked views, hotspots, material variants, real dimension overlays, AR handoff, and the keyboard and photo-set equivalents that keep every answer available without WebGL.

Inspection is a task, not a toy. The user arrives with a question: does it fit, what colour is it, how big is it, what is inside, what does this part do. Every control should answer one of those questions, and every answer must also exist without the 3D view.

Rendering values live in `references/3d/real-object-render.md`; the asset and its variants live in `references/3d/asset-pipeline.md`; the poster and lifecycle contract lives in `references/effects/webgl-3d.md`.

## When to use

| User question | Pattern | Cost |
| --- | --- | --- |
| "What does it look like from my side?" | Orbit plus preset views | One renderer, controls |
| "Which colour or finish?" | Variants on shared geometry | Extra materials and textures |
| "Will it fit here?" | Dimension overlay plus AR | Real measurements, USDZ companion |
| "What is inside or how does it assemble?" | Exploded view plus annotations | Node offsets and labels |
| "Show me the detail" | Zoom limits and macro presets | Higher texel density in the asset |

When not to use:

- A single angle answers the question: ship a still.
- The hero is decoration: `references/effects/webgl-3d.md` covers the poster-first hero; interaction is noise there.
- No measured or variant data: an interactive view that cannot answer the real question is a toy.
- Content inside the scene: specs, price, and forms stay in the DOM.

## Interaction model

| Input | Behavior | Default |
| --- | --- | --- |
| Drag (one pointer) | Orbit around the target | Required; never the only way |
| Wheel / pinch | Dolly toward the target | `minDistance` 1.2× radius, `maxDistance` 4× radius |
| Two-finger drag | Pan | Off unless the exploded view needs it |
| Double-click / double-tap | Reset to the hero preset | Also a visible "Reset view" button |
| Arrow keys | Orbit in 15° steps | When the canvas has focus |
| `+` / `-` | Zoom in and out | Same limits |
| `1`–`5` | Preset views | Announced via a live region |

- Clamp polar angle to roughly 60–100° (0° is the top pole): under-floor angles expose unmodelled geometry and the seam of the ground shadow.
- Limit azimuth when the back is unfinished or the product photo set only covers the front; otherwise let it orbit freely and say so.
- `OrbitControls` with `enableDamping` feels better but requires a frame loop while it settles. Stop the loop after the damping ends, or keep rendering on demand and request frames only while the pointer moves (`update()` returns true while damping continues).
- Set `touch-action` deliberately: `pan-y` keeps page scroll on vertical swipes while horizontal drag orbits; `none` traps the page, so use it only when the scene is the whole screen.
- Do not hijack wheel scrolling before the user engages the scene (click or focus), and never trap the page on mobile.
- No auto-orbit by default. If one ships, it needs a pause control after 5 seconds (WCAG 2.2.2).
- Keep state in the URL when it matters: `?view=side&variant=graphite` makes a configuration shareable and survives reload.

## Preset views and camera choreography

| Preset | Orbit from +Z | Polar from up | Use |
| --- | --- | --- | --- |
| 3/4 hero | −35° | 75° | Default; the product-photo angle |
| Front | 0° | 90° | Dimensions and logo |
| Side | 90° | 90° | Profile and depth |
| Top | 0° | 5° | Plan and layout |
| Detail | target offset | ~80° | Fastener, port, texture |

- Animate preset changes over 400–700 ms with an ease-in-out; under reduced motion, cut.
- Never move the camera and the object at the same time: two motions cancel and the user loses orientation.
- Hold the target at the piece's centre of mass; moving the target during a preset change reads as a camera bug.
- Keep the canvas `aspect-ratio` stable so the preset framing does not change between breakpoints; refit the distance on resize instead of cropping.

## Exploded and scroll-linked views

- Offsets come from the assembly axis in metres (for example 0.12 m per layer), not from percentages of the bounding box: the same numbers then match the drawing.
- Store the exploded state in the DOM (`aria-expanded` on the toggle, a live-region sentence such as "Exploded view, 6 parts"), not only in the scene.
- Reverse the order on collapse and keep the parts' original pivots; a part that returns to the wrong place breaks trust in the diagram.
- Scroll-linked exploded views require a pinned section and a stepper or slider alternative. If scroll is the only input, keyboard and reduced-motion users cannot reach the intermediate states.
- Cap the visible labels at 5–8; more becomes a wall of lines. Group related parts under one label when the drawing allows it.

## Hotspots and annotations

- Anchor labels to part names from the asset (`front_panel`, `battery_door`), not to hardcoded world positions: re-exports move geometry.
- Project the anchor to screen space each frame the scene renders (`vector.project(camera)`), then position a DOM button. DOM labels stay crisp, translate, and are reachable by assistive technology; textures do not.
- Occlusion: raycast from the camera to the anchor and hide or dim the label when geometry is in front. Use `three-mesh-bvh` when there are many rays.
- Keep pointer targets at least 44×44 px; two labels closer than that get a leader line or merge.
- Clicking a hotspot opens a DOM panel; never put paragraphs in the scene.
- Hide labels when zoomed out and show the nearest few; a cluster of 20 markers is worse than none.

## Material and colour variants

- Use `KHR_materials_variants` when the variants are authored once: read the list from `parser.json.extensions.KHR_materials_variants.variants` and resolve each primitive's mapped material with `parser.getDependency('material', index)`.
- Swap materials without reloading the model. Pre-clone the materials for the first few variants, then load the rest on intent (focus or hover on the swatch).
- When the finish changes (gloss to matte), say so in the label and change roughness or clearcoat too; a colour swatch that silently changes the material response is a lie.
- Swatches carry the commercial name and code (RAL, Pantone, manufacturer SKU) in text, with `aria-pressed` on the selected one. Colour alone is not a label.
- The swatch hex is UI colour in sRGB; the material colour is linearised by three. Do not convert twice, and do not sample the swatch from a screenshot.
- If a variant changes dimensions or included parts, update the dimension overlay and the AR model with it.
- Verify each variant against a physical sample under the same lights; a shared environment keeps comparisons fair.

## Dimensions and truth

- Numbers come from the datasheet or CAD, in millimetres; the scene stays in metres. Convert once, at the display boundary.
- Draw dimension lines by projecting two 3D points to screen space and drawing an SVG overlay; the number is data, never measured from pixels.
- Round to the precision the spec uses (412 mm, not 412.37 mm) and show the unit; offer a mm/in toggle when the market needs it.
- If model and datasheet disagree, the datasheet wins and the asset gets fixed (`references/3d/asset-pipeline.md`), never the label.
- AR passes the real scale: send the unscaled model and let the platform place it; a pre-scaled model looks wrong next to a table.

## AR handoff

- `<model-viewer ar ar-modes="webxr scene-viewer quick-look">` covers WebXR, Android Scene Viewer, and iOS Quick Look; iOS needs a USDZ exported from the same master.
- AR is an extra, not the viewer: offer the glb/USDZ link and the photo set for users who cannot or will not use the camera.
- Test scale next to a known object and check materials after USDZ conversion; extensions often flatten.
- Desktop has no AR; never hide the only useful content behind the AR button.

## Implementation

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = Math.PI / 3;   // 60° from the top pole
controls.maxPolarAngle = Math.PI * 0.55;
controls.minDistance = radius * 1.2;
controls.maxDistance = radius * 4;
controls.target.copy(center);
controls.addEventListener('change', requestRender);
// call controls.update() in the render loop; it returns true while damping is still settling.
```

Hotspot projection:

```js
const point = new THREE.Vector3().copy(anchor.position).project(camera);
const x = (point.x * 0.5 + 0.5) * canvas.clientWidth;
const y = (-point.y * 0.5 + 0.5) * canvas.clientHeight;
label.style.transform = `translate(${x}px, ${y}px)`;
```

Mount the scene through `mountSceneWhenAllowed` (see `references/effects/webgl-3d.md`) so tiers, visibility, pause, and disposal are handled once. Dispose `controls` with the scene.

## Reduced motion

- No auto-orbit, no inertia, no camera drift; `enableDamping = false` and preset changes cut instead of tween.
- User-initiated orbit and zoom remain: direct manipulation is not autoplay.
- A scroll-linked exploded view ships a stepper or slider; without it the reduced-motion user cannot see the intermediate states.
- Any automatic motion over 5 seconds needs a pause control; the default is no automatic motion.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Full orbit, presets, variants, hotspots, exploded view |
| T2 | A 4–8 angle still set with the same presets as tabs; variants swap stills; hotspots become a labeled list under the image |
| T1 | A photo set plus the DOM facts and a dimensions table |
| T0 | The poster and the facts |

The fallback is not a downgrade in information: dimensions, variant names, and part labels survive as text and images.

## Performance budget

- Render on demand; damping may need frames, so stop the loop when `controls.update()` stops returning true.
- Project labels only on frames that render, and cache `canvas.getBoundingClientRect()` on resize, not per pointer move.
- Throttle pointer handling to one rAF per gesture; never read layout inside `pointermove`.
- Cap visible hotspots (5–8) and raycast only those; a full-scene ray per marker per frame is wasted GPU and CPU.
- Variant materials cost texture memory: preload two, lazy-load the rest, dispose what is not reused.

## Accessibility

- The canvas gets `role="img"` and a label naming the piece and the current view; an interactive canvas also needs a keyboard path, or the interaction is mouse-only.
- Provide a visible "Reset view", preset buttons, and rotate/zoom buttons: drag must never be the only input (WCAG 2.5.1, 2.5.7).
- Announce view and variant changes in a polite live region; do not trap focus in the scene.
- Keep label backing plates opaque enough for 4.5:1 against every frame; the background changes with the camera.
- Give each hotspot a real button with a text name; a marker without a label is invisible to a screen reader.
- Under forced-colors mode, keep the scene border and replace marker colours with system colours.
- The DOM panel is the source of truth: every fact in the scene is also text.

## Libraries

- `OrbitControls` from the three.js addons; `three-mesh-bvh` for hotspot occlusion at scale; `<model-viewer>` for a viewer with built-in AR.
- React Three Fiber alternatives: `OrbitControls`, `PresentationControls`, and `<Html>` from drei; `references/3d/platforms-3d.md` maps the rest.
- Versions, licences, and peer ranges: `references/libraries.md`.

## Pitfalls

- Damping that never stops: a permanent 60 fps loop for a static piece; stop when `update()` returns false.
- Scroll hijack on a full-width canvas: the page stops scrolling and users leave; engage only after a click or focus.
- Hotspots anchored to world coordinates: the next export moves them; anchor to named parts.
- Markers hidden behind the piece still clickable: raycast occlusion and disable the button, do not just dim it visually.
- Variants that reload the glb: a flash, a fetch, and lost camera state; swap materials instead.
- Colour-only swatches: unusable for colour-blind users and unverifiable for everyone; add name and code.
- Dimension numbers drawn in a texture: unreadable when zoomed, untranslatable, invisible to assistive technology.
- AR as the only path to see the piece: desktop users and older phones get nothing.
- No reset and no zoom limits: users get lost inside the model.
- Click targets under 44 px: unusable on touch.
- Scroll-linked exploded view without a stepper: reduced-motion and keyboard users lose the states.
- A T2 fallback with different facts: the still set drops the variant names or dimensions; parity is part of the fallback.
