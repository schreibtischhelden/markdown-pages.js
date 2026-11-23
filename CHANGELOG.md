# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- `assets/vendor/showdown-forms/` — forms extension `@schreibtischhelden/showdown-forms` 1.0.0
  (Git commit `ee19e5c` until it is published on npm), replaces the inline forms code
- `assets/vendor/` — third-party libraries stored in the repository, no external CDN requests anymore
- `package.json`, `scripts/vendor.mjs` — library versions and script to regenerate `assets/vendor/`
- `.github/dependabot.yml` — weekly updates for the vendored libraries and GitHub Actions
- `.github/workflows/dependencies.yml` — regenerates `assets/vendor/` on Dependabot PRs,
  fails on other PRs when `assets/vendor/` is out of sync with `package.json`
- `.github/workflows/codeql.yml` — CodeQL analysis for JavaScript and workflows
- `.github/workflows/ci.yml`, `tests/` — unit tests for page resolution (`npm test`)
- `menu.json` — navigation defined as JSON, inserted with the placeholders
  `{{menu:main}}`, `{{menu:sub:<id>}}` and `{{menu:current}}`;
  documented in `pages/menu.md`, `header.md` uses `{{menu:main}}`;
  `menu.json` is optional – if it is missing or invalid, the hand-written
  navigation marked with `data-mdp-menu-fallback` is used as before
- Forms in Markdown (`:::form` blocks, via [showdown-forms](https://github.com/schreibtischhelden/showdown-forms)):
  text/email/… inputs, textarea, radio buttons, checkboxes, select, submit button,
  required fields; all values HTML-escaped, `action` restricted to relative,
  `http(s):` and `mailto:` URLs; forms without `action` dispatch `mdp:form-submit`;
  documented in `pages/forms.md`
- `markdown-pages.js` — `mdp:rendered` event after each rendered region,
  configurable `MarkdownPages.showdownOptions` and `MarkdownPages.sanitizeConfig`

### Changed
- `markdown-pages.js` — `MarkdownPages.formsExtension` is now the extension array of showdown-forms
  (available after the libraries are loaded), `MarkdownPages.renderForm` was removed –
  use `showdownForms.render(body, MarkdownPages.formsOptions)`; new `MarkdownPages.formsOptions`
- A missing page renders `404.md` (or a default message) instead of redirecting to the non-existent `404.html`
- `assets/user-scripts.js` — highlighting and current-page marker run after rendering instead of fixed timeouts
- Showdown updated from 1.9.1 to 2.1.0
- highlight.js updated from 11.4.0 / 11.11.1 (styles) to 11.12.0
- Pico CSS updated from 1.4.4 to 2.1.1
  `assets/user-styles.css` uses the new `--pico-*` variables;
  content width on wide screens kept at the previous 1130px

### Security
- `markdown-pages.js` — the query string can no longer load Markdown from other hosts
  (e.g. `?//attacker.example/x`), which allowed cross-site scripting;
  page paths are restricted to relative paths without `..`, hidden files or URL schemes,
  and every fetch must stay on the same origin
- `markdown-pages.js` — generated HTML is sanitized with DOMPurify 3.5.0 (new vendored library)
  before it is inserted; links with `target` get `rel="noopener noreferrer"`
- `index.html` — Content Security Policy and referrer policy added
- `assets/user-scripts.js` — dark/light toggle uses an event listener instead of inline `onclick`
  (inline handlers are removed by the sanitizer and blocked by the CSP)
- `SECURITY.md` — threat model, protections and deployment recommendations
