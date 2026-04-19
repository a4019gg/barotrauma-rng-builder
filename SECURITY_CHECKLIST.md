# Security regression checklist

## Manual smoke flow

- [ ] Import `.baro-rng.json` project (valid file).
- [ ] Import XML via file and via textarea.
- [ ] Open tree view and inspect node metadata panel.
- [ ] Run simulation and verify result table rendering.
- [ ] Open About/Import modals and close them.
- [ ] Ensure no injected HTML/JS is executed from imported IDs/params.

## Automated checks

- [ ] `node tools/check-no-unsafe-innerhtml.mjs`
- [ ] `node tools/security-smoke-tests.mjs`
- [ ] `node tools/check-security-headers.mjs`
