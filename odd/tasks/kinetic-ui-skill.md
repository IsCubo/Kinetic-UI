# kinetic-ui skill

Objective: a universal Agent Skill (agentskills.io format) for distinctive, accessible, device-aware frontend UX/UI with micro-interactions and advanced effects.
Branch: `feat/kinetic-ui-skill` (from `main`) · Delivery: `single-pr` (new solo repo, no remote yet; push/PR are the user's decision) · Test runner: `node --test tests/` + `node scripts/validate.mjs skills/kinetic-ui`

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
| T1 | S8, S10 | inline | pending | repo scaffold: README, LICENSE, .gitignore |
| T2 | S7, S8, S9 | inline | pending | validator + index builder with node:test RED→GREEN |
| T3 | S1, S7, S8, S9 | inline | pending | SKILL.md router, reference template, tiers, reduced-motion, motion tokens, tier snippet |
| T4 | S2 | delegated (parallel unit) | pending | foundations: UX principles, UI patterns, motion principles, devices |
| T5 | S5 | delegated (parallel unit) | pending | brand intake + emotion-to-style |
| T6 | S3, S7 | delegated (parallel unit) | pending | effects A: micro-interactions, cursor, text, page transitions |
| T7 | S3, S7 | delegated (parallel unit) | pending | effects B: parallax, scroll-driven, depth, 2D, 3D/WebGL |
| T8 | S3 | delegated (parallel unit) | pending | styles: cyberpunk and others |
| T9 | S4, S7 | delegated (parallel unit) | pending | components |
| T10 | S1 | delegated (parallel unit) | pending | platforms: web frameworks, Flutter, SwiftUI, Compose |
| T11 | S6 | inline | pending | library catalog from verified research |
| T12 | S9, S8 | inline | pending | final INDEX, README, opencode-config link, full validation |

Route evidence: T4–T10 meet the Writer trigger (a) — independent units with disjoint edit surfaces, each several files and well over 100 lines, launched together after the T3 contract exists. `SKILL.md`, `references/INDEX.md` and the shared contract files are parent-owned.

## Log

- **L1 (2026-10-22, original request, verbatim):** "¿Podría crear un plugin integrando todo lo que se debe hacer para tener un diseño unico, que resalte, con sus referencias, estilos y demás, para los diferentes dispositivos que existen, teniendo en cuenta patrones de diseño, quiero que ese plugin sea un conjunto universal que pueda ser utilizado por cualquier agente y con cualquier lenguaje, esta skill quiero que esté enfocado en el frontend, priorizando las caracteristicas de un buen diseño ux/ui, basado en microinteraciones, efectos super interesantes también, ya sea como efectos parallax, scroll, de profundidad, 2d, 3d cyberpunk etc, en esa skill debe tener especificado eso, como funciona un componente, y obviamente manteniendo la identidad de marca que se proporcione, si no hay, entonces sugerir en base al tipo de pagina o sentimiento a transmitir, entonces pues sugerir librerias funcionales y probadas para ese tipo de diseños, por ejemplo, conozco uno que es muy utilizado como three.js, entonces tu me dirás si en base a lo que te dije podemos crear un plugin, no lo haremos de una, solo quiero saber si puedes?"
- **L2 (2026-10-22, verbatim):** "Pues ya sabes como quiero la agent skill así que hagamosla, si quieres hacerme preguntas o aportar algunas ideas durante este proyecto de construcción de la agent skill eres bienbenido, y apliquemos lo que me mencionaste tambien eso de prefers-reduced-motion y el fallback para moviles de gama baja y el tema de la estructura y demás, ademas dentro de la agent skill coloquemos como si fuera tipo rag ese decir que haya una referencia para que el agente sepa de una donde buscar sin necesidad de buscar en toda la estructura"
- **L3 (2026-10-22):** The user picked "Repo propio (Recommended)" for the name `kinetic-ui`. Decision: it is a skill (agentskills.io), not a runtime plugin, because only the skill format is portable across agents. The repo layout keeps the installable skill in `skills/kinetic-ui/` and the maintainer tooling (`scripts/`, `tests/`, `odd/`) outside it.
- **L4:** Library research was delegated (read-only, background) to verify versions, licenses, and Baseline status before T7/T10/T11.
- **Next:** T1 → T2 → T3 inline, then launch T4–T10 in parallel.
