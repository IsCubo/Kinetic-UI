# Real-object asset pipeline

> Keywords: real object, product scan, cad, step, iges, photogrammetry, laser scan, retopology, decimation, uv, baking, texel density, gltf, glb, draco, meshopt, ktx2, basis, uastc, etc1s, pbr maps, lod, instancing, asset budget, glTF validator, optimizacion 3d, objeto real, escaneo, modelo 3d
> Summary: Turns a real object (CAD, scan, photo set, vendor model) into a budgeted, validated, compressed glTF 2.0 `.glb` plus the poster and turntable fallbacks the tiers require.

Decide the asset before the scene. A web-ready real-object model is metre-scaled, Y-up, retopologised, baked to PBR maps, compressed, and validated against a budget. Runtime loading, tiers, and disposal live in `references/effects/webgl-3d.md`; this file only produces the file that scene loads.

## When to use

| You have | You need | Route |
| --- | --- | --- |
| CAD (STEP/IGES) from engineering | A light, photoreal-capable web model | Tessellate, decimate, UV, bake, compress |
| Photo set or phone/turntable capture | A relightable model | Photogrammetry, retopo, de-light albedo, bake, compress |
| Scanner output (laser, structured light) | A clean, small mesh | Retopo, bake scan detail into normal map, compress |
| Vendor glTF/FBX | A budget-compliant file | Audit against `## Budgets`, re-bake only what fails |
| A real piece, no model at all | A fallback that still ships | Matched photo set (T1) or pre-rendered turntable (T2) |

When not to use:

- Flat or decorative depth: use `references/effects/parallax.md` or a still; no model is needed.
- No measured dimensions or datasheet: scale cannot be verified, so do not ship a "true to size" model.
- Source you may not redistribute: stop until the licence for the mesh and textures is confirmed.
- Content that must be read (specs, price, steps): keep it in the DOM, not in the model.

## Source routes

| Source | What you get | Cleanup required | Best for |
| --- | --- | --- | --- |
| Parametric CAD (STEP/IGES), mm, Z-up | Exact surfaces, assembly tree, no UVs, no textures | Tessellate with a coarse tolerance, merge duplicate parts, drop hidden internals, decimate, unwrap UVs, assign PBR materials | Machined, moulded, or assembled products |
| Polygon DCC (Blender, Maya, 3ds Max) | Clean topology, UVs, materials | Apply transforms, fix scale, bake, remove unused data | Hero models built for the web |
| Photogrammetry | Dense noisy mesh, baked-in lighting, holes | Retopo, fill holes, de-light albedo, bake normal, align scale to a measured reference | Organic or worn pieces, no CAD available |
| Laser or structured-light scan | Accurate dense mesh, often no colour | Retopo, bake detail to a normal map, texture from photos | Small precise parts, artefacts, tools |
| Vendor glTF/FBX | Unknown quality | Inspect triangles, calls, textures, units, normals; re-export clean | Fast turnaround when the vendor model is good |

Rules:

- Keep the source file untouched; export a separate web model.
- CAD tessellation and scan density are the main size drivers; decimate before you bake.
- Name the source, the date, and the tool chain in the asset notes so an export can be reproduced.

## Units, axes, pivots

| Item | glTF requirement | CAD / DCC reality | Action |
| --- | --- | --- | --- |
| Unit | 1 unit = 1 metre | CAD is usually mm | Scale by 0.001, then apply scale |
| Up axis | +Y up | CAD and some DCC are Z-up | Rotate -90° about X, then apply rotation |
| Handedness | Right-handed, +Z forward | Varies by tool | Use the exporter's Y-up option; check a lopsided part |
| Pivot | Node origin | Often the CAD world origin | Standing piece: origin at the centre of the base on the floor. Hand-held piece: origin at the rotation centre |
| Transforms | Applied at export | Left on objects | Apply location, rotation, scale before export so the root is identity |
| Names | Stable and meaningful | `Body1`, `Solid23` | Name parts after the bill of materials so hotspots and variants can target them |

Verify the bounding box against the datasheet before export: read the model's width, depth, and height in metres and compare with the real dimensions within the manufacturing tolerance. A mismatch of 10× or 1000× means a unit error; fix it in the model, never by scaling the camera or the scene at runtime. `references/3d/real-object-render.md` covers the runtime scale check.

## Budgets

| Use | Triangles | Draw calls | Textures | Compressed transfer |
| --- | --- | --- | --- | --- |
| Hero close-up | ≤150k | ≤60 | 2k atlas | ≤4 MB |
| Catalog / card (poster default, model on open) | ≤30k | ≤20 | 1k | ≤1.5 MB |
| Mobile AR | ≤100k | Fewest the viewer allows | 1k–2k; check the AR viewer limits in `references/3d/platforms-3d.md` | Keep under the hero figure |
| Pre-rendered turntable (T2) | Not shipped | Not applicable | Not applicable | Video bytes only; tune per frame size |
| T1 poster / photo set | Not shipped | Not applicable | Not applicable | Tune per still; compress with AVIF/WebP |

These are defaults to tune, not limits of the format. Measure the loaded model with `renderer.info` (`render.calls`, `render.triangles`, `memory.textures`, `memory.geometries`) on the first frame, on the weakest target device, and move a budget only with measured evidence. Merge meshes that share a material to cut draw calls.

## Retopology, UV, texel density

- CAD: tessellation explodes on fillets and small radii. Decimate with the DCC's decimate/planar tools or `gltf-transform simplify`, preserving UV seams, material boundaries, and hard edges; keep silhouette-defining curves.
- Normals: mark hard edges where the real part has a crease; smooth shading elsewhere. Never let decimation average normals across a sharp edge.
- Scans and photogrammetry: retopologise to a low-poly cage, then bake the scan detail into the normal map. Do not ship the raw dense mesh.
- UV layout: one atlas per material group (for example painted body, metal, rubber), not one texture per part.
- Seams: hide them on edges and undersides, away from the hero camera angle.
- Texel density: 512–1024 px/m for a hero piece, uniform across the atlas, with a 2048 atlas ceiling. Spend density on the faces the camera approaches; shrink hidden faces.
- Detail goes in the normal map, not in a bigger albedo: fine relief, text embossing, and screws cost bytes once in a linear map.
- No accidental overlapping UVs: overlap breaks baked AO and normals. Overlap only for deliberately mirrored, identical parts.
- Remove internals and hidden faces the camera can never see.

## Bake the maps

| Map | Source | Colour space | Notes |
| --- | --- | --- | --- |
| Base colour | De-lit albedo from the high-poly material or de-lit photos | sRGB | No shadows, highlights, or reflections painted in; photogrammetry must be de-lit before relighting |
| Normal | High-poly detail projected onto the low-poly | Linear | Tangent space, one convention (OpenGL, +Y) matching the glTF consumer; bake with the same tangent basis the exporter uses |
| Roughness | Material roughness value or painted map | Linear | Drives the real material read; pack with metalness and occlusion as a glTF ORM texture if the toolchain supports it |
| Metalness | Mask: 0 dielectric, 1 bare metal | Linear | Avoid mid-values except for worn edges |
| Occlusion | Baked ambient occlusion | Linear | Lives in the occlusion map, never multiplied into the albedo |

Rules:

- Bake high to low with a cage and a ray distance that does not leak onto neighbouring parts.
- Never bake lighting into albedo before dynamic lighting: shadows must come from the scene, not the texture.
- All maps share one UV set; a second UV set only for lightmaps you deliberately use.
- Check each map at 100% in the viewer; a seam or a ray miss is visible at hero scale.
- Substance Painter or KeyShot may author the maps; export in the PBR metallic-roughness convention.

## Compress and package

Ship one binary glTF 2.0 `.glb` with PBR metallic-roughness materials. Textures stay inside the `.glb` unless they are shared across several models.

| Extension | Use | Loader requirement |
| --- | --- | --- |
| `KHR_draco_mesh_compression` | Geometry compression; smallest meshes | Provide the decoder path on `DRACOLoader` |
| `EXT_meshopt_compression` | Geometry and animation compression; fast decode | Provide `MeshoptDecoder` to the loader |
| `KHR_texture_basisu` | KTX2 textures (UASTC or ETC1S) that stay compressed on the GPU | Provide the transcoder path on `KTX2Loader` and call `detectSupport(renderer)` |
| `EXT_texture_webp` | WebP textures; smaller than PNG but decoded to full size in VRAM | Browser WebP support; give a KTX2 route for GPU memory |
| `KHR_materials_clearcoat` | Lacquer, car paint, varnish | Native in GLTFLoader |
| `KHR_materials_transmission` | Glass, thin plastics | Native; costs an extra render pass |
| `KHR_materials_ior` | Index of refraction for glass and gems | Pair with transmission |
| `KHR_materials_variants` | Colour and material options on shared geometry | Native; the configurator reads the variant list |
| `KHR_lights_punctual` | Lights embedded in the file | Avoid for real-object scenes; light in the scene, not the asset |

Choices:

- Draco vs Meshopt: Draco for the smallest static geometry; Meshopt for faster decode, animation, and one decoder path that is smaller to host. Pick one per file, never both on the same primitive.
- UASTC vs ETC1S: UASTC for normal maps and sharp detail (larger, higher quality); ETC1S for albedo and other tolerant maps (smaller, lossier). Resolve per map, not per file.
- Colour space: base colour and emissive are sRGB; normal, roughness, metalness, and occlusion stay linear. Never mark a linear map sRGB when you compress it.

Commands (spellings change between releases; run each tool's `--help` before scripting it):

| Tool | Operation |
| --- | --- |
| `@gltf-transform/cli` | `gltf-transform optimize in.glb out.glb` runs the standard clean-up chain |
| | `gltf-transform simplify in.glb out.glb --ratio 0.5` decimates geometry |
| | `gltf-transform uastc in.glb out.glb` and `gltf-transform etc1s in.glb out.glb` compress textures to KTX2 |
| | `gltf-transform webp in.glb out.glb` converts textures to WebP |
| | `gltf-transform meshopt in.glb out.glb` and `gltf-transform draco in.glb out.glb` compress geometry |
| | `gltf-transform prune in.glb out.glb` removes unused nodes, materials, and textures |
| `gltfpack` (meshoptimizer) | `gltfpack -i in.glb -o out.glb -cc -tc -si 0.5` compresses with Meshopt, KTX2 textures, and simplifies; it implements `EXT_meshopt_compression` |
| `toktx` (KTX-Software) | Encodes a PNG to `.ktx2` with UASTC or ETC1S and mipmaps |
| Blender glTF exporter | Built in: choose `.glb`, apply modifiers, include only used materials, Y-up on |

LOD and instancing:

| Technique | Default | Use |
| --- | --- | --- |
| LOD ratios | LOD0 100%, LOD1 ~50%, LOD2 ~25% of triangles | Only when several instances or a long camera dolly show the piece at different sizes |
| `EXT_mesh_gpu_instancing` | One mesh, many transforms | Repeated fasteners, bolts, cells, and identical parts; cuts draw calls |

## Validation gate

An asset ships only when every row passes.

| Check | Pass condition | How |
| --- | --- | --- |
| Spec compliance | glTF Validator reports 0 errors; read the warnings | Run the validator on the final `.glb`, not on the source |
| Dimensions | Bounding box matches the datasheet within tolerance | Read the bounds in the viewer |
| Texture count and bytes | Within `## Budgets`; no texture above 2048 px | Inspect the file with `gltf-transform` |
| Transfer | Compressed `.glb` within the budget | Check the response size, not the disk size |
| Draw calls and triangles | `renderer.info.render.calls` and `renderer.info.render.triangles` within budget on the first frame | Log after the first rendered frame |
| First-frame time | Poster-to-first-frame measured on the weakest target; record it | `references/foundations/performance-tiers.md` verification steps |
| Silhouette | Differential check: overlay the render from the matched camera on the reference photo; the outline matches | Overlay at 50% opacity; mismatch means scale, pivot, or decimation error |

## Tier fit

| Tier | Deliverable |
| --- | --- |
| T3 | Realtime `.glb` loaded lazily by the scene in `references/effects/webgl-3d.md` |
| T2 | Pre-rendered turntable video or sequence, matched to the `.glb` camera |
| T1 | Matched photo or render set (4–8 views) as stills |
| T0 | The poster, the same piece from the primary camera |

## Reduced motion

Assets carry no motion; reduced motion is a delivery rule.

- Ship the poster and the T2/T1 alternatives in the same deliverable as the `.glb`.
- A turntable video that runs over 5 seconds needs a pause control per `references/foundations/accessibility-motion.md`.
- Never ship a model whose only presentation is an auto-rotating loop.

## Low-end fallback

- The `.glb` is never requested below T3. The poster is the same piece from a matched camera, so swapping between poster and scene does not jump.
- T2: pre-rendered turntable. T1: matched stills. T0: the poster.
- Render the poster, turntable, and stills from the same source model and the same lights so colour and silhouette agree.

## Performance budget

Tie every number to `references/foundations/performance-tiers.md`.

- Transfer: the `.glb` loads after LCP at T3 only; stay within `## Budgets`.
- Texture memory: GPU cost is decoded size, not file size; KTX2 keeps textures compressed on the GPU, and one 2048 atlas beats several 1024 maps.
- Draw calls: merge by material; instance repeated parts.
- Decode time: Draco and Meshopt decode on the CPU, KTX2 transcodes on workers; measure the first frame on a 4× throttled CPU.
- One environment map per scene, shared by every material; do not embed environment maps in the asset.

## Accessibility

- Give every still and the poster a specific `alt` text: object, colour, and angle.
- Put dimensions, weight, and materials in DOM text, not only as labels in the 3D scene.
- Do not carry meaning by colour alone: name colour variants in text and not just swatches.
- Add a text description of the piece next to the viewer for screen-reader and low-bandwidth users.

## Libraries

Names only; versions, licences, and caveats live in `references/libraries.md`.

- Blender: DCC, retopo, baking, and glTF export.
- glTF Transform: optimise, simplify, compress, and inspect `.glb`.
- meshoptimizer / gltfpack: simplify and Meshopt compression.
- KTX-Software / `toktx`: KTX2 encoding.
- glTF Validator: spec conformance.
- Substance Painter and KeyShot: map authoring and offline stills or turntables.

## Pitfalls

- Millimetres exported as metres: the model is 1000× too large; fix the scale and re-export.
- Z-up CAD imported without rotation: the piece lies flat; rotate and apply before export.
- Baked shadows in albedo: they fight dynamic lights and double up; bake AO into the occlusion map only.
- 4k textures on a card: the model downloads and decodes megabytes for a thumbnail; budget by use.
- Uncapped texel density: every part at maximum resolution; set a density and a 2048 atlas ceiling.
- Draco without a decoder path: the loader throws and the poster stays; set the path on `DRACOLoader`.
- KTX2 without a transcoder path: textures never load; set the path and `detectSupport(renderer)` on `KTX2Loader`.
- Mirror-modifier normals flipped: a half of the piece shades inside out; recalculate normals after applying.
- Double-sided materials on solid objects: doubles fill cost and hides inverted faces; use single-sided on closed meshes.
- Over-decimation flattens the silhouette: compare against the reference photo, then raise the ratio on curved parts.
- Non-deterministic exports: re-exports change hashes and bytes; script the export and record the tool versions.
- No poster: T0–T2 users and failed loads see an empty box; render the poster from the same source.
- Unverified mesh licence: scanned or purchased meshes may forbid web redistribution; confirm before shipping.
- Hidden helpers in the scene graph: empties, cameras, cut planes, and placeholders inflate the file and appear in the viewer; prune them.
