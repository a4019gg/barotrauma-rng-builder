# Contributing

## Security rules for DOM rendering

- For all data that can originate from import files (project JSON/XML), user input, localStorage, or external dependencies, **never** use `innerHTML` or HTML string concatenation.
- Use helpers from `core/safe-dom.js` (`createElement`, `appendChildren`, `clearElement`) and set text using `textContent` (via helper `text` option).
- Set attributes only through `setAttribute` (via helper `attrs`) and `dataset` (via helper `dataset`).
- Manual `innerHTML` is only allowed in explicitly reviewed trusted renderers (currently syntax highlighting layers where content is escaped first).

## Security checks

Run before committing:

- `node tools/check-no-unsafe-innerhtml.mjs`
- `node tools/security-smoke-tests.mjs`
- `node tools/check-security-headers.mjs`
