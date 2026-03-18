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
  * stores a `branches[]` array rather than hardcoding success/failure in the core model
  * still preserves legacy binary compatibility for existing saved data
* `event`
  * generic execution-order container for actions and nested RNG
* `eventSet`
  * meta-layer container for Barotrauma event scheduling attributes
* action nodes
  * `spawn`, `creature`, `affliction`
  * structured so additional action/check/trigger node types can be added later without changing the core traversal model

### Compatibility goals

* Existing binary RNG graphs remain loadable.
* Legacy `success` / `failure` data is normalized into the unified branch model.
* XML export still emits the same simple `<RandomEvent>` structure for basic binary trees.
* Multi-branch RNG exports by compiling branch arrays into chained `<RandomEvent>` blocks so the XML path remains compatible with Barotrauma's current structure.
