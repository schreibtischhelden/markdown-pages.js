# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- `assets/vendor/` — third-party libraries stored in the repository, no external CDN requests anymore
- `package.json`, `scripts/vendor.mjs` — library versions and script to regenerate `assets/vendor/`
- `.github/dependabot.yml` — weekly updates for the vendored libraries and GitHub Actions
- `.github/workflows/dependencies.yml` — regenerates `assets/vendor/` on Dependabot PRs,
  fails on other PRs when `assets/vendor/` is out of sync with `package.json`
- `.github/workflows/codeql.yml` — CodeQL analysis for JavaScript and workflows

### Changed
- Showdown updated from 1.9.1 to 2.1.0
- highlight.js updated from 11.4.0 / 11.11.1 (styles) to 11.12.0
- Pico CSS updated from 1.4.4 to 2.1.1
  `assets/user-styles.css` uses the new `--pico-*` variables;
  content width on wide screens kept at the previous 1130px
