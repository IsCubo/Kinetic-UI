# A requested piece with no model

> Keywords: procedural 3d, model from description, lathe, lathe geometry, extrude, extrude geometry, tube geometry, bevel, rounded box, silhouette, real dimensions, metres, measured versus invented, tamper, mug, handle, product without glTF, pieza 3d, modelar desde cero
> Summary: How to build the object a brief names when no glTF exists: read how the real thing is made, pick the primitive that matches that construction, keep metres and a measured/invented table, protect the silhouette, and prove the result against a frame.

When the brief names a real object and no mesh arrives with it, the object is not missing: its dimensions and its manufacturing method are the model. Build the construction, not an impression of it.

## When to use

| Situation | Open |
| --- | --- |
| The brief names a real piece and no asset exists | This file |
| A glTF, CAD export or scan exists already | `references/3d/real-object-render.md` |
| An asset exists but is too heavy or wrong-scaled | `references/3d/asset-pipeline.md` |
| The piece needs hotspots, variants or a configurator | `references/3d/inspection-configurator.md` |
| The piece is cloth, food, foliage or a face | Not this file: those read as blobs when generated. Use a scan or a photo, and say so. |

## Read the object before you model it

The construction decides the primitive. Picking by shape family is the difference between a tamper and a chess piece.

| Family | Real examples | Build with | The trap |
| --- | --- | --- | --- |
| Turned, axially symmetric | Tamper, mug body, bottle, lamp base, knob, bolt, wheel rim | `LatheGeometry` from a profile of `(radius, height)` points | The silhouette is the profile: too few points and the edge is faceted, not round |
| Prismatic with a rounded face | Phone, remote, tray, sign, packaging | `ExtrudeGeometry` with bevel, or `RoundedBoxGeometry` from `three/addons` | A sharp edge reads as CGI instantly; every real edge has a radius |
| Bent tube | Handle, cable, frame, rim, spout | `TubeGeometry` along a `CatmullRomCurve3` | Radius is in metres and segments scale with curve length, not with the object |
| Assembled from parts | Mug with a handle, lamp with a stem, tool with a grip | Two geometries, overlapping, never a boolean | Boolean union is slow and often breaks; overlap them and let the render hide the seam |
| Soft or organic | Bag, food, garment, plant | Out of scope here | A procedural version reads as a balloon; declare the substitution |

## Dimensions: measured, inferred, invented

Keep one table beside the code, in metres, and carry it into the answer.

| Source | Example | How it is treated |
| --- | --- | --- |
| Given in the brief | "58 mm tamper" | Measured: use it, and say it came from the brief |
| A real standard | ISO/IEC 7810 card: 85.60 × 53.98 × 0.76 mm | Measured, cited as the standard, not as the brief |
| Derived from the object's job | A mug body that must hold 350 ml | Inferred: state the derivation, not just the number |
| Chosen for proportion | Handle thickness when nothing is specified | Invented: name it as invented and keep it consistent across parts |

Three rules:

- One unit is one metre, everywhere, including the camera and the light positions (`references/3d/real-object-render.md`).
- Ratios beat absolute guesses: if the diameter is known and the height is not, hold the real object's ratio and say which one you held.
- Never ship a piece without printing its bounding box; a scale error is invisible on screen and obvious in the box.

Useful real references, all in metres: espresso tamper basket 58 mm (51 and 53 also exist), mug body 80 mm diameter × 95 mm, phone body about 70 × 150 × 8 mm, credit card 85.60 × 53.98 × 0.76 mm, USB-C plug shell 8.25 × 2.40 mm, A4 sheet 210 × 297 mm.

## Silhouette before detail

An object is recognised by its outline and its negative space long before it is recognised by its texture.

- Draw the profile or the perimeter first and look at it flat: if the outline alone is not the object, no material will fix it.
- Keep the negative space honest: the gap inside a handle, the opening of a spout, the shadow under a lip.
- Round every hard edge by 1–3 mm unless the object is a cutting edge or a machined face; that single habit removes most of the CGI look.
- Detail is a budget, not a goal: chamfers and bevels at the silhouette beat micro-scratches in the texture.

## A tamper, built from its construction

```js
import { LatheGeometry, Vector2 } from 'three';

// Profile in metres, read bottom to top: base radius, base fillet, body, grip, crown.
const profile = [
  [0.000, 0.000], [0.0270, 0.000], [0.0288, 0.0018], // 58 mm base with a 1.8 mm fillet
  [0.0290, 0.0060], [0.0250, 0.0090],                 // step up from the rim
  [0.0185, 0.0120], [0.0175, 0.0700],                 // stem, held between the fingers
  [0.0210, 0.0740], [0.0225, 0.0820],                 // crown
  [0.0150, 0.0870], [0.0000, 0.0875],
];
const points = profile.map(([radius, height]) => new Vector2(radius, height));
const geometry = new LatheGeometry(points, 96); // 96 around: silhouette stays smooth at 1440 px
```

The whole object is 87.5 mm tall and 58 mm across the base, and the numbers that were invented — stem height and crown shape — are the ones the answer must name. A machined aluminium version needs `metalness: 1`, a roughness around 0.35 and a visible chamfer; a polished one drops roughness to about 0.15 and adds clearcoat.

## Verify the piece, not the code

1. Print the bounding box and compare it with the table: `new Box3().setFromObject(mesh).getSize(new Vector3())`.
2. Capture three frames — front, three-quarter and top — with `assets/snippets/capture-frames.mjs`, and look at them before adding detail.
3. Run the recognition test: with the text hidden, can the object be named from the three-quarter frame alone? If not, the silhouette is wrong, and more material work will not help.
4. Check the light and shadow: a piece with no contact shadow floats (`references/3d/real-object-render.md`).
5. State which dimensions were measured, inferred and invented, and what the piece cannot do (for example, no interior bore).

## Reduced motion

- The camera holds still by default. A turntable is motion: honour `prefers-reduced-motion` and the tier, and offer the front view as the resting state.
- With reduced motion on, drop the idle rotation and keep one framed still; a drag to orbit may stay, because it is user-driven.
- Never autoplay a spin to show the object off.

## Low-end fallback

| Tier | What renders | What is dropped |
| --- | --- | --- |
| T3 | The piece with its material, environment and contact shadow | Nothing beyond the layer cap |
| T2 | The same piece, fewer lathe and tube segments, no clearcoat | Anisotropy, fine bevels, extra environment detail |
| T1 | A pre-rendered still of the piece, or the procedural mesh at low segments | The render loop |
| T0 | The still, or a labelled photograph of the object | Camera movement, orbit |

## Performance budget

- Segments come from the on-screen size, not from habit: a 96-segment lathe is free at 600 px and wasteful at 80 px.
- One piece per scene is the norm; an assembly above about 40 000 triangles needs a reason.
- Import the primitive you need, not a modelling library: `LatheGeometry` and `ExtrudeGeometry` ship with three.
- Textures follow the piece's size on screen; a 4K map on a 200 px object is memory for nothing.

## Accessibility

- The canvas carries a text alternative that names the object and its dimensions; the surrounding copy must make sense without the render.
- Any control that orbits or zooms is reachable by keyboard, with visible focus, and announces the new view.
- Do not make comprehension depend on the 3D: the pieces and their names appear as text as well.

## Libraries

- three.js ships every primitive named here: `LatheGeometry`, `ExtrudeGeometry`, `TubeGeometry`, `Shape`, `Path`, `CatmullRomCurve3`, `Box3`.
- `RoundedBoxGeometry` and `RoomEnvironment` live in `three/addons`, not in the core entry point.
- Facts, maintenance status and licences: `references/libraries.md`.

## Pitfalls

- Building the object's surface before its construction: a tamper modelled as a cylinder with a sphere on top reads as a chess pawn.
- Mixing units: a profile in millimetres fed to a camera in metres produces an invisible speck or a building-sized object.
- Faceted silhouettes from too few lathe segments, or from a profile with two points where the real object has a fillet.
- Sharp edges everywhere: the eye reads them as geometry, not as material.
- Naming an invented dimension as if the brief gave it; the next round then "corrects" a number that was never a requirement.
- Bolting parts together with a boolean when overlapping them renders the same and costs a fraction.
- Adding texture detail to rescue a wrong silhouette: the recognition test fails for shape reasons, and no roughness map fixes shape.
