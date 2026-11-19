# Rendering a real object in three.js

> Keywords: photoreal product render, real object, three.js, metre scale, focal length, fov, camera match, product photography, environment map, hdri, pmrem, room environment, pbr, metalness, roughness, clearcoat, transmission, sheen, anisotropy, contact shadow, tone mapping, neutral tone mapping, agx, aces, colour management, srgb, texel density, render on demand, producto real, render 3d, fidelidad, pieza real
> Summary: How to make a real piece read as itself in three.js: measured scale, a camera matched to product photography, one environment plus key/fill/rim, PBR values per material, a contact shadow, colour management, and a readback checklist that catches the usual "it looks CGI" failures.

three.js gives you a renderer, not a photographer. Realism is decided by five things before the first pixel: scale, camera, light, material values, and the colour pipeline. Get one wrong and no post-processing rescues it; get all five right and a 60k-triangle model reads as the product.

This file owns rendering. The asset itself (sources, retopology, compression) is `references/3d/asset-pipeline.md`; interaction is `references/3d/inspection-configurator.md`; the lazy-load, poster, and disposal contract is `references/effects/webgl-3d.md`.

## When to use

| Goal | What the render must be true about |
| --- | --- |
| Product hero or catalog image | Proportions, finish, and colour of the shipped item |
| Configurator | Every variant renders as the physical sample, not a tinted approximation |
| Inspection of a piece | Angles and details legible at the zoom the user reaches |
| Exploded or annotated view | Part relationships and real dimensions |
| Before-and-after or comparison | Same camera, lens, and light across states |

When not to use:

- Stylised or abstract 3D: that is a visual world, use `references/styles/playful-3d.md` and the direction stage.
- Decorative depth behind content: `references/effects/parallax.md` or `references/effects/depth-layers.md` cost a fraction.
- No measured source: a render that invents size or finish is a defect in commerce, not a taste choice. Use photography, or build the piece from its real construction and name which dimensions were invented (`references/3d/procedural-piece.md`).
- Copy, price, or controls inside the scene: they stay in the DOM.

## Real inputs before code

| Input | Why it decides | Source |
| --- | --- | --- |
| Dimensions in mm | Scale, camera distance, AR, dimension overlays | Datasheet or CAD |
| Material spec: substrate, finish, colour code | Albedo, metalness, roughness, clearcoat, sheen | Sample or spec sheet (RAL, Pantone, manufacturer) |
| Reference photos from the same angle | Camera match and readback | Studio or vendor photography |
| Lighting environment | Reflections, shadow softness, mood | Studio, overcast, interior |
| Colour tolerance | Tone mapping and exposure choices | Brand or merchandising owner |

State the tolerance before rendering: "within ΔE 2 of the sample under D65" changes the pipeline; "looks close" does not.

## Scale: one unit is one metre

- Author in metres (glTF's unit). A 412 mm piece is `0.412`. Never compensate for a wrong export by scaling the scene or the camera: fix the asset.
- Camera `near` around `0.01` and `far` around `50–100` for a hand-held piece. `near` at `0.0001` with `far` at `1000` destroys depth precision: shadow acne and z-fighting appear.
- Sanity check after load: if the bounding box exceeds 10 m or is under 1 mm, the export is almost certainly in millimetres or centimetres. Fail loudly and keep the poster.
- Ground the piece: bottom at `y = 0`, centred in x/z, so the contact shadow and the floor agree.
- Keep the pivot meaningful (base centre, or rotation centre for a hand-held piece) and document it in the asset notes.

## Camera matched to product photography

Photographers compress a product with long lenses; a wide FOV stretches the near edge, which is why 3D pieces often look "off" before anything else is checked.

`fov = 2 · atan(sensorHeight / (2 · focal))`, with a 24 mm full-frame sensor height:

| Focal (full frame) | Vertical FOV | Read |
| --- | --- | --- |
| 35 mm | 37.8° | Environmental, slight stretch at the edges |
| 50 mm | 27.0° | Standard product; safe default |
| 85 mm | 16.1° | Compression, premium catalog look |
| 100 mm | 13.7° | Maximum compression; tight framing |

- Use 16–30° vertical for a real piece; above 40° the object reads wide-angle.
- Distance from the bounding sphere: `distance = radius / sin(fov / 2)`, then add 15–30% padding. Fit on the tighter of vertical and horizontal FOV, or a tall piece crops on portrait screens.
- Aim at the centre of mass, not the origin, and place the camera slightly above centre (product photos look down a few degrees).
- Preset views: 3/4 hero, front, side, top, and one detail. Change one thing per transition.
- Engineering views are orthographic; hero views are perspective. Mixing them in one scene confuses the read.
- To align with a reference photo, move the camera with `camera.setViewOffset` instead of shifting the model; the render then shares the photo's frame.
- In a page hero the piece is the subject of the first frame: the canvas is full-bleed behind the copy, the piece fills at least half the viewport height at 1440 px, and it never sits in a bordered card beside a larger headline. Controls float over the scene.

## Light like a studio

One environment map does most of the work. Without it, metals and glass are black or flat, and every material looks like plastic.

| Light | Role | Starter values | Cost |
| --- | --- | --- | --- |
| Environment (HDRI or `RoomEnvironment` through `PMREMGenerator`) | Reflections and ambient realism | `scene.environment`, `environmentIntensity` 0.6–1.2 | One texture, shared by all materials |
| Key (directional) | Form and the main shadow | Position 45° up and to one side, intensity 1.5–3 | One shadow map |
| Fill (hemisphere or ambient) | Keeps the shadow side readable | Intensity 0.2–0.5 | Cheap |
| Rim (directional, behind) | Separates the piece from the background | Intensity 0.8–1.5 | Cheap |
| Contact shadow | Proves the piece touches a surface | Shadow-only plane or a radial gradient | One small plane |

Rules:

- One shadow-casting light. Fit its orthographic shadow camera to the bounding sphere (`left/right/top/bottom` around the radius) and set `normalBias` to a few millimetres; a loose shadow camera gives blocky or detached shadows.
- The contact shadow is not optional. A piece without one floats, and floating is the single most common realism failure in product 3D.
- Control `backgroundIntensity` or use a solid brand surface; a visible HDRI behind the product competes with it.
- If the piece is glass, add a large soft source behind it so the transmission has something to refract; glass in a void is invisible.
- Keep lights out of the asset file (`KHR_lights_punctual`): light belongs to the scene, so the same model works on a different page.

## Materials that read as the real material

| Material | Metalness | Roughness | Add | Trap |
| --- | --- | --- | --- | --- |
| Painted plastic | 0 | 0.35–0.55 | Clearcoat 0–0.4 when gloss | Metalness 0.2 "to make it pop" reads as dirty metal |
| Bare aluminium | 1 | 0.25–0.4 | Anisotropy for brushed grain | Mid metalness with no environment map |
| Brushed steel | 1 | 0.3–0.5 | Anisotropy ~0.6 along the brush direction | Isotropic highlights that look like plastic chrome |
| Polished chrome | 1 | 0.02–0.08 | Nothing; the environment is the material | No environment map: black mirror |
| Glass | 0 | 0.02–0.1 | `transmission` 1, `thickness` in metres, `ior` 1.5 | Transmission without thickness or IOR reads as frosted film |
| Rubber | 0 | 0.7–0.95 | Fine normal map | Glossy patches from a wrong roughness map |
| Leather | 0 | 0.5–0.7 | Sheen 0.2–0.4, normal map | Uniform roughness: real leather varies |
| Fabric | 0 | 0.8–1 | Sheen 0.4–0.8 with sheen roughness | Metalness above 0 kills the weave read |
| Lacquered wood | 0 | 0.3–0.6 | Clearcoat 1, clearcoat roughness 0.05–0.15 | Clearcoat over an albedo with baked highlights |

- Albedo carries colour only: no shadows, highlights, or reflections. Baked lighting in the texture fights every dynamic light.
- Metalness is near 0 or near 1. The exception is worn edges, and those belong in a mask, not a uniform value.
- Roughness maps matter more than albedo for realism: they break up highlights the way a real finish does. A constant roughness across a whole piece is a tell.
- `MeshPhysicalMaterial` covers clearcoat, transmission, sheen, iridescence, and anisotropy. Each adds shader cost; use it on the parts that need it, standard materials elsewhere.
- `material.envMapIntensity` tunes one material's share of the environment; use it to balance a dark part without changing the lights.
- Keep the normal map's detail scale honest: ridges that are 2 mm on the real part must not read as 2 cm.

## Colour management and tone mapping

The renderer works in linear colour; the screen is sRGB. Colour textures (albedo, emissive) are tagged sRGB; data textures (normal, roughness, metalness, occlusion) stay linear. Tag them wrong and the piece is washed out or muddy.

| Tone mapping | Use | Trade-off |
| --- | --- | --- |
| `NeutralToneMapping` | Product and configurator: faithful brand colour | Slightly flatter highlights; the right default for commerce |
| `AgXToneMapping` | Lifestyle or editorial with strong highlights | Filmic roll-off; verify the brand colour |
| `ACESFilmicToneMapping` | Cinematic contrast | Desaturates and shifts hues; never for colour matching |
| None / Linear | Albedo and data checks | Clipped highlights and a flat look |

- Set `renderer.outputColorSpace = SRGBColorSpace` (default) and keep colour management enabled. Do not "fix" a dark render by raising albedo: raise exposure first.
- `toneMappingExposure` 0.8–1.2 is the single global knob. Moving exposure per scene breaks consistency across a catalog.
- With `EffectComposer`, end the chain with `OutputPass` so tone mapping and colour conversion happen exactly once. Without it, post-processing output is too dark or double-converted.
- Compare the rendered colour with a physical sample under the same white point, or with the sRGB hex from the brand guide; a colour picked on an uncalibrated display is not evidence.
- Dark brand colours crush first. Check the darkest and lightest brand values on the actual background, not on a neutral grey.

## Render loop and image quality

- Render on demand: once after load, after a camera change, after a variant swap, after a resize. A static piece needs no 60 fps loop; the skill helper already pauses it offscreen.
- Cap DPR at 2 (1.5 on coarse pointers). Antialias only when DPR is below ~1.75; above that, MSAA buys nothing and costs fill rate.
- Post-processing is optional: AO deepens crevices, bloom only for emissive details, depth of field only for macro shots. One or two passes at T3, always with `OutputPass` last. Product photography is usually deep focus, so a fake blur can make it less truthful.
- Check for shadow acne, peter-panning, edge shimmer on thin parts, banding in gradients, clipped highlights on metal, and a missing contact shadow. These six cover most "it looks CGI" reports.
- Capture a still from the same preset for the poster; poster, turntable, and scene must share camera, lens, and lights.

## Photoreal readback checklist

| Symptom | Cause | Fix |
| --- | --- | --- |
| The piece floats | No contact shadow | Shadow-only plane, or a soft radial gradient under the base |
| Looks like plastic | Missing environment, or wrong metalness/roughness | Environment map; metalness 0 or 1; roughness map |
| Flat and dead | One light, no rim | Add fill and rim; raise environment slightly |
| Too wide, distorted | FOV above 40° | 16–30° vertical; step back and fit |
| Brand colour off | ACES, exposure, or a double sRGB conversion | Neutral tone mapping; check texture tagging |
| Edges shimmer | Aliasing or oversized normal map | Raise DPR, enable antialias, soften the normal |
| Reflections show a room | `RoomEnvironment` visible in chrome | Use a studio HDRI or a plain graded environment |
| Glass invisible | No thickness, IOR, or background to refract | Set thickness/IOR; add a bright source behind |
| Everything is uniformly glossy | One roughness value | Roughness map; vary by part |
| Reads "clean CGI" | Zero imperfection | Subtle roughness variation, AO, micro-normal; keep it honest to the sample |

## Implementation

```js
import { createProductScene } from './three-product-scene.js'; // assets/snippets/three-product-scene.js

const scene = await createProductScene(canvas, {
  url: '/models/runner.glb', // metres, Y-up, compressed per references/3d/asset-pipeline.md
  dpr: Math.min(devicePixelRatio, 2),
  fail: () => host.dataset.kuiScene = 'fallback',
});
```

The snippet sets the colour pipeline, builds a PMREM studio environment, fits the camera from the bounding sphere, adds key/fill/rim plus a contact shadow, warns when the asset is not in metres, and returns the `{ start, stop, resize, dispose }` contract that `references/effects/webgl-3d.md` mounts. Add `DRACOLoader`, `KTX2Loader`, and `MeshoptDecoder` there when the asset uses compression.

## Reduced motion

- A still render is already the reduced-motion experience: no camera drift, no idle orbit, no auto-turntable.
- If an auto-turntable ships at T3, it needs a visible pause control after 5 seconds, and reduced motion starts paused at the hero angle.
- User-initiated rotation stays available: direct manipulation is not autoplay.
- Preset transitions become cuts; fades stay ≤200 ms.

## Low-end fallback

| Tier | Behavior |
| --- | --- |
| T3 | Live scene, render on demand, 1–2 post passes, DPR capped |
| T2 | Pre-rendered stills or a turntable from the same camera; no renderer, no WebGL context |
| T1 | A matched photo set (4–8 angles) with the same labels |
| T0 | The poster plus the DOM facts |

The fallback must be pixel-consistent with the live scene: same lens, same lights, same background, or the swap is visible.

## Performance budget

- Draw calls and triangles per `references/3d/asset-pipeline.md`; merge by material and instance repeated parts.
- One environment map per scene, shared by every material; never one per part.
- Shadow map 1024–2048 per casting light; one caster.
- Render only when something changed; log `renderer.info.render.calls` once on the first frame.
- Transmission and clearcoat are extra passes or shader paths: limit them to the parts that have glass or lacquer.

## Accessibility

- The canvas is `role="img"` with a label naming the piece and the view; a decorative scene is `aria-hidden="true"`.
- Real facts (dimensions, material, colour name) live in DOM text next to the viewer, not only in the render.
- Every brand-colour variant has a name and a code; a swatch alone carries meaning by colour only.
- Keep a 1px border or a distinct surface behind the scene so it stays visible in forced-colors mode.
- Provide the poster as the alternative for screen readers and low bandwidth, with specific alt text: object, colour, angle.

## Libraries

- three.js core and its addons (`GLTFLoader`, `PMREMGenerator`, `RoomEnvironment`, `OutputPass`); versions, licences, and peer ranges in `references/libraries.md`.
- React Three Fiber and drei wrap the same values; `references/3d/platforms-3d.md` maps each ecosystem.
- Authoring tools (Blender, Substance, KeyShot) are named in `references/3d/asset-pipeline.md`.

## Pitfalls

- Millimetres in a metre scene: the camera fits inside the model or the piece fills the frame edge to edge; check the bounding box before styling anything.
- FOV 45–60° "because it fits": the piece looks stretched and small; step back with a longer lens.
- No contact shadow: the product floats and every other fix is wasted.
- One key light and no environment: metals read black, plastic reads like clay.
- ACES on a brand colour: the product ships a different colour than the render; use Neutral and verify against the sample.
- Baking shadows into albedo: dynamic lights double them and the piece looks dirty from every angle.
- `toneMappingExposure` used per component: a catalog with inconsistent exposure looks like different products.
- Post-processing without `OutputPass`: everything is dark or washed out, and the team blames the textures.
- A visible HDRI background: the studio room competes with the product; control `backgroundIntensity` or use a solid.
- Continuous 60 fps for a static piece: battery and fan noise for no visual gain; render on demand.
- A poster rendered from a different angle: the swap jumps and users think the page glitched.
- Rendering a "true to size" claim with an unverified asset: fix the asset, never the copy.
