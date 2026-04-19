# Rendering security audit (innerHTML / template-based render)

## Source classification

- **Trusted**: static localization keys, hardcoded UI chrome, syntax-highlighted XML where source is escaped before token wrappers.
- **Untrusted**: project import JSON, XML import attributes/tags, user-entered event IDs/params, persisted UI state from `localStorage`.

## Findings summary

| File | Pattern | Data source | Risk class | Status |
|---|---|---|---|---|
| `ui/ui-controller.js` (`renderEvents`) | `innerHTML` with `event.id` + attributes | User input + imported project JSON | **Untrusted** | ✅ Replaced with `safe-dom` + `textContent` |
| `ui/ui-controller.js` (`renderSimulationResults`) | `innerHTML` rows with `result` values | Derived from model/imported data | **Untrusted** | ✅ Replaced with `safe-dom` + `textContent` |
| `modules/tree/tree-service.js` (`renderInspector`) | `innerHTML` with `node.type`/`node.id` | Imported/user-edited graph nodes | **Untrusted** | ✅ Replaced with `safe-dom` + `textContent` |
| `modules/io/project-io.js` | No render, import deserialization | Project JSON import | **Untrusted input path** | ✅ Added strict normalization/whitelist |
| `modules/io/xml-import.js` | No render, XML parse -> model | XML import | **Untrusted input path** | ✅ Added strict normalization/cleanup |
| `ui/ui-controller.js` (`syncXmlHighlight`) | `innerHTML` with escaped content + controlled wrappers | Escaped XML text area content | Trusted escaped renderer | ⚠️ Allowed by explicit exception |
| `modules/xml/xml-viewer-service.js` | `innerHTML` with generated markup | XML viewer generated layer | Trusted escaped renderer | ⚠️ Kept; monitored by script allowlist |

## Enforcement

- Added `tools/check-no-unsafe-innerhtml.mjs` for protected paths.
- Added smoke tests for import payload normalization.
- Added SRI/CSP presence check for `index.html`.
