# kinetic-ui 3D depth

Objective: deepen the skill's 3D coverage around rendering a real-life piece with Three.js on the web, and map every other platform to its own 3D library and language.
Branch: `feat/3d-depth` (from `main`) · Delivery: `ask-on-risk` · Test runner: `node --test tests/*.test.mjs` + `node scripts/validate.mjs skills/kinetic-ui`

## Specs

- **S25 Three.js for a real piece, end to end.** "enfoquemonos más en el tema de diseño en 3D enfocadonos en Three js y renderizado 3D de cualquier pieza de la vida real". Acceptance: a new `references/3d/` reference covers measured scale (1 unit = 1 m), camera-to-product-photography matching (focal length ↔ FOV), one environment map plus key/fill/rim, PBR values that read as the real material, contact shadow and reflection strategy, colour management and tone mapping, a photoreal readback checklist, and the mandatory `## Reduced motion` / `## Low-end fallback` sections. Ships a runnable `assets/snippets/three-product-scene.js` that auto-frames a metre-scale asset, warns on a unit mismatch, and disposes GPU memory.
- **S26 Real object to web asset.** Acceptance: `references/3d/asset-pipeline.md` covers CAD, photogrammetry and scan sources; units/axes/pivots (glTF metres, Y-up, +Z forward); triangle, draw-call, texture and byte budgets; retopo, UV and texel density; baking (de-lit albedo, normal, roughness, AO); glTF 2.0 extensions (`KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_texture_basisu`, `KHR_materials_variants`); tool commands; and a validation gate (glTF Validator 0 errors, `renderer.info`).
- **S27 Inspecting and configuring a real piece.** Acceptance: `references/3d/inspection-configurator.md` covers orbit/pan/zoom semantics and constraints, preset views, exploded and scroll-linked views, hotspot projection and occlusion, material and variant switching, dimension overlays sourced from real measurements, AR handoff, keyboard equivalents, and a T1/T2 photo-set fallback.
- **S28 Each platform in its own library and language.** "Three js para web, y las demás para su respectiva libreria o lenguaje de programación". Acceptance: `references/3d/platforms-3d.md` routes web (three.js, WebGPURenderer/TSL, React Three Fiber + drei, Babylon.js, `<model-viewer>` + AR), engines (Unity, Unreal, Godot), native (RealityKit/SceneKit, Filament/SceneView, `flutter_scene`, `model_viewer_plus`), and offline stills/turntables (Blender, KeyShot) with the correct API surface per ecosystem, the glTF interchange contract, and what each importer loses.
- **S29 Router and gates.** Acceptance: `SKILL.md` gains one hard rule for real-world 3D truth and rows in "Find What You Need"; `docs/authoring.md` manifest lists `references/3d/`; `references/effects/webgl-3d.md` hands depth to the new folder without duplicating it; `references/libraries.md` carries the 3D tooling facts with a verified date; `INDEX.md` regenerated; `npm run validate` and `npm test` pass.
- **S30 Measurable.** Acceptance: one eval case for a photoreal real-object product render with assertions that test behaviour (scale, colour management, environment, contact shadow, compressed glTF, tiers, verification), not one implementation.

- **Assumptions:** A4 the new folder is `references/3d/` (the existing `references/effects/webgl-3d.md` stays the scene/lazy-load/tier contract). A5 facts are verified at the versions recorded in `references/libraries.md`; engines are named without version numbers.

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T28 | S25 | inline | done | `references/3d/real-object-render.md` (215 lines) in `452d892` |
| T29 | S26 | delegated (writer) | done | `references/3d/asset-pipeline.md` (219 lines) in `452d892` |
| T30 | S27 | inline | done | `references/3d/inspection-configurator.md` (187 lines) in `452d892` |
| T31 | S28 | delegated (writer) | done | `references/3d/platforms-3d.md` (240 lines) in `452d892` |
| T32 | S25 | inline | done | `assets/snippets/three-product-scene.js` (235 lines) in `452d892` |
| T33 | S29, S30 | inline | done | `452d892` (libraries, index) and `2a88162` (router, authoring, webgl-3d handoff, eval case, tests, readme) |

Risk: none on the skill content itself (documentation plus one browser snippet in an unpublished package). T29/T31 delegated writers touch exactly one new file each; the parent owns `SKILL.md`, `references/libraries.md`, `references/effects/webgl-3d.md`, `evals/evals.json`, `docs/authoring.md`, and `INDEX.md`.

Route evidence: T29 and T31 meet the Writer trigger (a): two independent units with disjoint edit surfaces, each a full reference file well over 100 lines, launched together after the shared template and fact sheet exist.

## Log

- **L28 (2026-11-18, original request, verbatim):** "Listo, mejoremos mucho más la skill, enfoquemonos más en el tema de diseño en 3D enfocadonos en Three js y renderizado 3D de cualquier pieza de la vida real, Three js para web, y las demás para su respectiva libreria o lenguaje de programación"
- **L29 (2026-11-18, verified facts):** npm registry `latest` at this date: `three` 0.187.0 (MIT), `@babylonjs/core` 9.37.1 (Apache-2.0), `@google/model-viewer` 4.4.0 (Apache-2.0), `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, `postprocessing` 6.39.6, `@gltf-transform/cli` 4.5.1, `meshoptimizer` 1.3.0, `gltf-validator` 2.0.0-dev.3.10. In `three@0.187.0` source: `NeutralToneMapping`, `AgXToneMapping`, `ACESFilmicToneMapping`, `outputColorSpace`, `scene.environmentIntensity`, `three/addons/environments/RoomEnvironment.js`, `three/addons/postprocessing/OutputPass.js`, and GLTFLoader support for `KHR_materials_variants`, `EXT_meshopt_compression`, `KHR_texture_basisu`, `KHR_draco_mesh_compression`, `KHR_materials_clearcoat`, `KHR_materials_transmission` all confirmed. `<model-viewer>` 4.4.0 ships `tone-mapping` with `neutral` and `agx`. pub.dev: `flutter_scene` 0.24.3 (2026-10), `model_viewer_plus` 1.10.0 (2025-11), `three_js` 0.3.0 (2026-05), `flutter_gl` 0.0.21 (2022-10, stale).
- **L30 (2026-11-18, decision):** Four focused references under `references/3d/` instead of growing `webgl-3d.md`: the effect file keeps the runtime contract (poster, lazy chunk, tiers, dispose) and the new folder owns depth. The user's request names both the web focus and the per-platform coverage, so one file per concern is the smallest structure that stays under the 250-line authoring target.
- **L31 (2026-11-18, verification):** Commits `452d892` (3D references, snippet, library catalog, INDEX) and `2a88162` (router, authoring manifest, WebGL handoff, eval case, tests, README). Each commit was validated in an isolated `git worktree` at that tree: `node scripts/validate.mjs skills/kinetic-ui` → `OK: 59 files checked`, and `node --test tests/*.test.mjs` → 43/43 pass. The first split attempt (references without `libraries.md`) failed `index-fresh`, because `INDEX.md` embeds the catalog header, so the catalog and its index moved into the same commit. The eval pack now holds 5 cases / 44 assertions; `tests/eval.test.mjs` reads those counts from `evals/evals.json`. Feature is complete but not pushed, and no pull request was opened.
