# kinetic-ui skill

Objective: a universal Agent Skill (agentskills.io format) for distinctive, accessible, device-aware frontend UX/UI with micro-interactions and advanced effects.
Branch: `feat/kinetic-ui-skill` (from `main`) · Delivery: `single-pr` (new solo repo, no remote yet; push/PR are the user's decision) · Test runner: `node --test tests/*.test.mjs` + `node scripts/validate.mjs skills/kinetic-ui`

## Specs

- **S1 Universal.** "quiero que ese plugin sea un conjunto universal que pueda ser utilizado por cualquier agente y con cualquier lenguaje". Acceptance: the skill follows the agentskills.io specification (`name` matches the directory, lowercase-hyphen, `description` ≤1024 chars, `SKILL.md` <500 lines, references one hop from `SKILL.md`). Guidance is framework-agnostic first, with per-platform sections (web, Flutter, SwiftUI, Jetpack Compose).
- **S2 Frontend UX/UI and patterns.** "esta skill quiero que esté enfocado en el frontend, priorizando las caracteristicas de un buen diseño ux/ui", "teniendo en cuenta patrones de diseño", "para los diferentes dispositivos que existen". Acceptance: foundations cover UX principles, UI design patterns, and responsive/device adaptation (input modes, screen classes).
- **S3 Micro-interactions and effects.** "basado en microinteraciones, efectos super interesantes también, ya sea como efectos parallax, scroll, de profundidad, 2d, 3d cyberpunk etc, en esa skill debe tener especificado eso". Acceptance: one reference file per effect family (micro-interactions, parallax, scroll-driven, depth, 2D, 3D/WebGL, …) and style files (cyberpunk, …).
- **S4 Component behavior.** "como funciona un componente". Acceptance: component files describe anatomy, states, timing, and micro-interactions.
- **S5 Brand identity.** "obviamente manteniendo la identidad de marca que se proporcione, si no hay, entonces sugerir en base al tipo de pagina o sentimiento a transmitir". Acceptance: a brand-intake procedure for a provided brand, plus an emotion/page-type → style mapping when there is none.
- **S6 Libraries.** "sugerir librerias funcionales y probadas para ese tipo de diseños, por ejemplo, conozco uno que es muy utilizado como three.js". Acceptance: a library catalog with verified package names, licenses, and caveats (sources cited, dated).
- **S7 Accessibility and low-end devices.** "apliquemos lo que me mencionaste tambien eso de prefers-reduced-motion y el fallback para moviles de gama baja". Acceptance: every effect and component file has mandatory `## Reduced motion` and `## Low-end fallback` sections, enforced by the validator; motion tiers T0–T3 with a detection snippet.
- **S8 Structure.** "y el tema de la estructura y demás". Acceptance: the proposed structure — short `SKILL.md` router, `references/`, `assets/`, a fixed reference template, and a validator.
- **S9 RAG-like index.** "dentro de la agent skill coloquemos como si fuera tipo rag ese decir que haya una referencia para que el agente sepa de una donde buscar sin necesidad de buscar en toda la estructura". Acceptance: an intent routing table in `SKILL.md` plus `references/INDEX.md`, a keyword catalog generated from each file's `Keywords` line. The validator fails when the index is stale or a path is missing.
- **S10 Location.** The user chose "Repo propio (Recommended)" with the proposed name `kinetic-ui` at `~/projects/kinetic-ui`.
- **Assumptions (not yet confirmed by the user):** A1 the skill content is in English; A2 license Apache-2.0; A3 `metadata.author` is `IsCubo`.

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | S8, S10 | inline | done | repo scaffold: README, LICENSE, .gitignore — `0c2aac5` |
| T2 | S7, S8, S9 | inline | done | validator + index builder: RED 14/14 fail → GREEN 14/14 pass |
| T3 | S1, S7, S8, S9 | inline | done | SKILL.md router, reference template, tiers, reduced-motion, motion tokens, tier snippet |
| T4 | S2 | delegated (parallel unit) | done | foundations: UX, UI patterns, motion, devices — `5708261` |
| T5 | S5 | delegated (parallel unit) | done | brand intake + emotion-to-style + token template — `d160f94` |
| T6 | S3, S7 | delegated (parallel unit) | partial | micro-interactions `7967e0d`; cursor/text/page-transitions/ambient in flight |
| T7 | S3, S7 | delegated (parallel unit) | partial | parallax, scroll-driven, depth `7967e0d`; 2D/WebGL in flight |
| T8 | S3 | delegated (parallel unit) | done | eight styles, 1363 lines — `3523a42` |
| T9 | S4, S7 | delegated (parallel unit) | partial | buttons, cards, forms, navigation `882b285`; overlays/feedback/selection/carousels/hero/lists in flight |
| T10 | S1 | delegated (parallel unit) | done | web frameworks, Flutter, SwiftUI, Compose — `1bd7631` |
| T11 | S6 | inline | done | library catalog from verified research — `a1bee06` |
| T12 | S9, S8 | inline | pending | final INDEX, README, opencode-config link, full validation |

Route evidence: T4–T10 meet the Writer trigger (a) — independent units with disjoint edit surfaces, each several files and well over 100 lines, launched together after the T3 contract exists. `SKILL.md`, `references/INDEX.md` and the shared contract files are parent-owned.

## Log

- **L1 (2026-10-22, original request, verbatim):** "¿Podría crear un plugin integrando todo lo que se debe hacer para tener un diseño unico, que resalte, con sus referencias, estilos y demás, para los diferentes dispositivos que existen, teniendo en cuenta patrones de diseño, quiero que ese plugin sea un conjunto universal que pueda ser utilizado por cualquier agente y con cualquier lenguaje, esta skill quiero que esté enfocado en el frontend, priorizando las caracteristicas de un buen diseño ux/ui, basado en microinteraciones, efectos super interesantes también, ya sea como efectos parallax, scroll, de profundidad, 2d, 3d cyberpunk etc, en esa skill debe tener especificado eso, como funciona un componente, y obviamente manteniendo la identidad de marca que se proporcione, si no hay, entonces sugerir en base al tipo de pagina o sentimiento a transmitir, entonces pues sugerir librerias funcionales y probadas para ese tipo de diseños, por ejemplo, conozco uno que es muy utilizado como three.js, entonces tu me dirás si en base a lo que te dije podemos crear un plugin, no lo haremos de una, solo quiero saber si puedes?"
- **L2 (2026-10-22, verbatim):** "Pues ya sabes como quiero la agent skill así que hagamosla, si quieres hacerme preguntas o aportar algunas ideas durante este proyecto de construcción de la agent skill eres bienbenido, y apliquemos lo que me mencionaste tambien eso de prefers-reduced-motion y el fallback para moviles de gama baja y el tema de la estructura y demás, ademas dentro de la agent skill coloquemos como si fuera tipo rag ese decir que haya una referencia para que el agente sepa de una donde buscar sin necesidad de buscar en toda la estructura"
- **L3 (2026-10-22):** The user picked "Repo propio (Recommended)" for the name `kinetic-ui`. Decision: it is a skill (agentskills.io), not a runtime plugin, because only the skill format is portable across agents. The repo layout keeps the installable skill in `skills/kinetic-ui/` and the maintainer tooling (`scripts/`, `tests/`, `odd/`) outside it.
- **L4:** Library research was delegated (read-only, background) to verify versions, licenses, and Baseline status before T7/T10/T11.
- **L5:** Research returned (npm/pub.dev registries, web-features 3.43.0, BCD 8.1.7, 2026-10-22). GitHub was unreachable, so repo activity is unverified. Key facts: GSAP 3.15 is free but not OSI-licensed; atropos/vanilla-tilt/lottie-web/flutter_animate are stale (17+ months); deviceMemory and saveData are Chromium-only; postprocessing needs three <0.187; scroll-driven animations are Baseline Limited (Firefox 159 due 2026-10-27).
- **L6 (T2):** Gotcha — in Node 22, `node --check file.js` silently passes ESM syntax errors. The validator now parses JS via stdin with `--input-type=module --check`. Node 22 also rejects a directory argument in `node --test`; use a glob.
- **L7 (T3):** The contract has landed: SKILL.md (~818 tokens, description 216 chars), performance-tiers, accessibility-motion, motion.css, motion-tier.js, and docs/authoring.md (template, invariants, manifest). The validator passes everything except 17 `links` errors that point to planned files; T4–T10 must clear them. The assess for f6e2a4a returned medium/under_budget, so it stays pending in the slice.
- **L8:** T4–T10 were launched as 7 parallel writers. The run was interrupted when the work moved to the background. Only `references/components/buttons.md` (T9) and `references/styles/cyberpunk.md` (T8) were written; both are complete (202 lines each, all template sections, validator clean apart from cross-unit links). The same writer sessions were resumed in the background to finish their remaining files.
- **Next:** wait for T4–T10, check each diff against its surface, write T11 (libraries) inline meanwhile, then T12.
- **L9 (T4, T5, T8):** Three units landed and were committed after a path check: `5708261` foundations (734 lines), `d160f94` brand (472 lines), `3523a42` styles (1363 lines). Two contract changes were accepted into `docs/authoring.md`: derived brand scales as project-local suffixes (`--brand-primary-700`), and the motion personalities defined in T4. A latent bug was fixed in `448eda2`: `--kui-duration-md` (250 ms) was not collapsed under reduced motion or tier 0, breaking the ≤200 ms fade rule.
- **L10 (2026-10-22, user correction, verbatim):** "Hermano continua, pero con otros modelos porque ya se me acabaron los creditos". Anthropic credits are exhausted. The four remaining units were relaunched on free providers (`opencode/deepseek-v4.1-flash-free`, `opencode/glm-5.3-flash-free`) with the same prompts, surfaces, and verification commands.
- **L11:** The parent committed the units that were already complete: `7967e0d` effects (micro-interactions, parallax, scroll-driven, depth + `assets/effects/scroll-driven.css`), `882b285` components (buttons, cards, forms, navigation), `1bd7631` platforms (all four). `assets/effects/webgl-3d.js` stays uncommitted with its incomplete unit T7.
- **L12:** Remaining work: 6 effect files and 6 component files in flight, then `INDEX.md`, README, the OpenCode skills link, and full validation.
