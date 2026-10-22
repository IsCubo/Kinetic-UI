# Tooling bridge

> Keywords: tooling, tools, capability check, available tools, Playwright MCP, Chrome DevTools MCP, browser automation, screenshot, DOM snapshot, accessibility tree, console, network, Lighthouse, axe, performance trace, CPU throttle, responsive, forced colors, reduced motion emulation, fallback, BLOCKED, evidence, artifact, herramienta, puente
> Summary: How to discover which verification tools the runtime actually exposes, choose the strongest capability for each check, run it with a stable invocation, and record BLOCKED instead of inventing evidence when none is available.

The matrix in `references/workflow/verify.md` names what to prove. This file names what to prove it with. Tool availability belongs to the runtime and the machine, not to the interface: check it before the first row and record the answer. A missing tool changes the evidence status, never the pass criterion.

## When to use

- At the start of every verify pass, before the first matrix row.
- When a check is about to become "looks fine" because the obvious tool is absent.
- When the runtime exposed a new MCP server, browser, or CLI and you need to know which checks it unlocks.
- When a report claims a screenshot, a Lighthouse score, or an axe pass and no artifact exists.
- When a tool is present but cannot see the thing being tested: contrast over a gradient, a real screen reader, a real phone.

## Selection order

Use the first tier that can produce reproducible evidence for the specific check:

1. A native capability of the current runtime: built-in browser, screenshot, device emulation.
2. An MCP server the runtime exposes: Playwright MCP, Chrome DevTools MCP.
3. A project CLI or script: `lighthouse`, `axe`, a Playwright test, `assets/snippets/verify-motion.js`.
4. A manual browser with OS tools: DevTools panels, a screen recorder, a screen reader.
5. BLOCKED, with the missing capability named.

Do not pick a weaker tier because it is already open. Do not treat a tool's presence as proof: the artifact is the proof.

## Capability map

Tool names differ across server versions. Match the capability and the artifact, not the exact string.

| Capability | Preferred | Look for | Fallback | BLOCKED when |
| --- | --- | --- | --- | --- |
| Load, render, screenshot | Playwright MCP | `browser_navigate`, `browser_take_screenshot`, `browser_snapshot` | Chrome DevTools MCP `navigate_page`, `take_screenshot`, `take_snapshot`; a native browser; manual browser plus OS screenshot | Nothing can load the built page |
| DOM and computed styles | Playwright MCP | `browser_evaluate` | Chrome DevTools MCP `evaluate_script`; the DevTools console | No scriptable page and no console |
| Accessibility tree | Chrome DevTools MCP | `take_snapshot` | Playwright role and aria snapshot; DevTools Accessibility pane | No tree and no DOM access |
| Keyboard path | Playwright MCP | `browser_press_key` in a loop | Chrome DevTools MCP `press_key`; a manual Tab pass | No browser and no way to send keys |
| Console and network | Playwright MCP | `browser_console_messages`, network requests | Chrome DevTools MCP `list_console_messages`, `list_network_requests`; DevTools panels | No browser console access |
| Responsive widths | Playwright MCP | `browser_resize` | Chrome DevTools MCP `resize_page`; DevTools responsive mode | No viewport control |
| Reduced motion | Playwright | `page.emulateMedia({ reducedMotion: 'reduce' })` | DevTools Rendering → Emulate CSS media feature; Chrome DevTools MCP media emulation if exposed | No media emulation; a tier-0 run is not a substitute |
| Forced colors | Playwright | `page.emulateMedia({ forcedColors: 'active' })` | DevTools Rendering → forced-colors | No emulation |
| Contrast | axe | `@axe-core/cli` or `@axe-core/playwright` | DevTools color picker; computed styles plus a contrast formula | Gradient, video, or glass where no tool samples the real frame |
| Rule-based accessibility | axe | axe CLI or Playwright integration | Lighthouse accessibility category | No axe and no Lighthouse |
| Lab performance | Lighthouse | `npx lighthouse ...` | Chrome DevTools MCP performance trace; DevTools Performance panel | No Chrome and no trace tool |
| Frame time and INP | Chrome DevTools MCP | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` | DevTools Performance panel; `requestAnimationFrame` sampling for frame time | No browser; rAF sampling does not prove INP |
| Real device | None | A physical phone | Emulation is not a device | A mobile-target claim with no device |
| Screen reader | None | NVDA, JAWS, VoiceOver | The accessibility tree is not AT output | An announcement claim with no AT |

If a server exposes a capability not listed here, use it when it produces a reproducible artifact. If it produces a summary with no input and no artifact, it is not evidence.

## Invocations that are stable

### Playwright

Use an existing Playwright install; do not add a dependency just for one verification pass.

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
await page.goto('http://localhost:3000');
await page.screenshot({ path: '360-reduced.png', fullPage: true });
await browser.close();
```

The same page can run the console audit:

```js
const result = await page.evaluate(async () => {
  const mod = await import('/assets/snippets/verify-motion.js');
  return mod.verifyMotion();
});
```

`emulateMedia` proves the media query path in that engine. Label it emulated; it does not prove the operating-system setting or another browser.

### axe

```bash
npx @axe-core/cli http://localhost:3000 --exit
```

The CLI needs Chrome and a matching driver. If it fails to start, use the Playwright integration inside an existing test:

```js
import { AxeBuilder } from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa'])
  .analyze();
```

Read both `violations` and `incomplete`. Contrast over a gradient, video, or translucent surface often lands in `incomplete`; that is BLOCKED, not a pass.

### Lighthouse

```bash
npx lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices \
  --output=json --output-path=./lighthouse.json \
  --chrome-flags="--headless=new"
```

Measure a production build served over a local URL, not a dev server with hot reload. Read the numbers directly:

```bash
node -e "const r=require('./lighthouse.json'); console.log({lcp:r.audits['largest-contentful-paint'].numericValue, cls:r.audits['cumulative-layout-shift'].numericValue, tbt:r.audits['total-blocking-time'].numericValue})"
```

Lighthouse's total blocking time is a lab proxy. It is not field INP; report it as TBT.

## Evidence record

Add the tool layer to the verify report without replacing it:

| Check | Tool | Input | Observation | Artifact |
| --- | --- | --- | --- | --- |
| Contrast | axe plus DevTools | `/pricing`, 1440 px | 4.1:1 on `.muted` | `axe.json`, `contrast.png` |
| Reduced motion | Playwright | 360 px, `reducedMotion: reduce` | transform unchanged, scroll 0 → 900 px | `360-reduced.png` |
| Performance | Lighthouse | production build, mobile | LCP 1.9 s, CLS 0.02, TBT 140 ms | `lighthouse.json` |

Every row names the input and the artifact. A row with a tool name and no artifact is a claim, not a check.

## Failure modes

- The MCP server is listed but the page is unreachable: fix the URL or the server, then rerun. Do not record PASS from the server being connected.
- A screenshot exists but the DOM was never inspected: visual claims only. Pair it with a snapshot or `browser_evaluate`.
- axe returns `incomplete` for contrast over a gradient: BLOCKED, not PASS. Sample the brightest and darkest frames manually, and say which frames you sampled.
- Lighthouse runs against a dev server: the numbers describe the dev server, not the product. Rebuild and rerun.
- Playwright media emulation is treated as the OS setting: label it emulated and do not claim it covers other engines or assistive technology.
- The accessibility tree is treated as screen-reader output: it proves names and roles, not announcement order or verbosity.
- An emulated phone is treated as a low-end device: frame rate, thermals, and touch latency remain unproven.
- A tool's output contains tokens, cookies, or private URLs: redact before attaching it, and keep artifacts in the run directory rather than the repository.

## Handoff

Return to the matrix in `references/workflow/verify.md` with a capability map: one line per check naming the tool, the input, the artifact, and any BLOCKED reason. Pass the artifacts and the BLOCKED list to `references/workflow/critique.md`; critique must not upgrade a missing artifact to a pass. When a capability is missing, the options are install or authorize it, or accept BLOCKED — never invent the observation.

The companion stages are `references/workflow/direction.md`, `references/workflow/verify.md`, `references/workflow/critique.md`, and `references/workflow/loop.md`.
