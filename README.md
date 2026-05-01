# barotrauma-rng-builder
A powerful visual editor for creating and balancing complex RNG-based scripted events (loot boxes, random rewards, encounters) in Barotrauma — with real-time probabilities, D3 tree visualization, and one-click XML export.

UNSTABLE! DONT USE!

## Acknowledgements

The initial implementation of the codebase was generated using the neural network **Grok 4.1 (Beta)**.  
Code refactoring and recommendations for improving the project structure and architecture were provided by the neural network **Qwen3-Coder**.  
Conceptual feature proposals and enhancement ideas were contributed by the neural network **ChatGPT** (model selection may vary).

## Architecture direction: unified event graph

The editor now targets a single internal graph model for all authoring flows.

### Operation modes

* **Basic** keeps the existing streamlined workflow: binary RNG plus action nodes, with advanced structures hidden from the UI.
* **Intermediate** unlocks multi-branch RNG, weighted branching, and nested `Event` containers.
* **Advanced** exposes the full graph surface, including `EventSet` containers and deeper Barotrauma-style nesting.

These modes only change **what the UI exposes**. They do **not** create separate save formats or separate XML pipelines.

### Unified node model

The graph is now designed around a shared node schema:

* `rng`
  * stores only `branches[]` as nested children source
  * stores explicit `mode: "weight" | "probability"` on the node
* `event`
  * generic execution-order container for actions and nested RNG
* `eventSet`
  * meta-layer container for Barotrauma event scheduling attributes
* action nodes
  * `spawn`, `creature`, `affliction`
  * structured so additional action/check/trigger node types can be added later without changing the core traversal model

### Project JSON format

The persisted `.baro-rng.json` now uses a minimal runtime-oriented schema:

* root event nodes are stored in `events[].rootNodes` (instead of `model`)
* UI-only state is grouped in `ui` (`ui.currentEventIndex`)
* all node ids are exported as unique strings (`rng_1`, `spawn_2`, ...)
* RNG nodes no longer duplicate nested children at node root (`children.success/failure` removed)
* RNG branches no longer use `kind` and keep only `id`, `value`, `children`

## Security hardening

- Untrusted render paths must use `core/safe-dom.js` and `textContent`-based rendering.
- Import flows (project JSON and XML) are normalized with strict ID/type/string sanitization.
- `index.html` includes CSP and a vendored local `d3` runtime (`vendor/d3.v7.min.js`) to avoid CDN/SRI outages.
- Local checks:
  - `node tools/check-no-unsafe-innerhtml.mjs`
  - `node tools/security-smoke-tests.mjs`
  - `node tools/check-security-headers.mjs`
