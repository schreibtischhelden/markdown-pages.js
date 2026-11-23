
# Development

## Repository layout

| Path | Content |
| :--- | :--- |
| `markdown-pages.js` | The library |
| `assets/vendor/` | Vendored third-party libraries – **generated, never edit by hand** |
| `assets/user-*`, `assets/docs.*` | Example styles/scripts and the documentation theme |
| `README.md`, `pages/`, `menu.json`, `header.md`, `footer.md` | This documentation |
| `tests/` | Unit tests (`node --test`) |
| `scripts/vendor.mjs` | Copies the libraries from `node_modules` to `assets/vendor/` |
| `.github/` | Dependabot and workflows |

## Third-party libraries

| Library | Used for | Folder |
| :--- | :--- | :--- |
| [Showdown](https://showdownjs.com/) | Markdown → HTML | `assets/vendor/showdown/` |
| [DOMPurify](https://github.com/cure53/DOMPurify) | Sanitizing the generated HTML | `assets/vendor/dompurify/` |
| [showdown-forms](https://github.com/schreibtischhelden/showdown-forms) | Forms (`:::form`) | `assets/vendor/showdown-forms/` |
| [Pico CSS](https://picocss.com/) | Base styles | `assets/vendor/pico/` |
| [highlight.js](https://highlightjs.org/) | Syntax highlighting | `assets/vendor/highlightjs/` |

The versions are pinned in `package.json`. The site never loads anything from a CDN.

### Updating

[Dependabot](https://docs.github.com/en/code-security/dependabot) opens a weekly pull request that bumps `package.json`. The **Dependencies** workflow then regenerates `assets/vendor/` and pushes the result into the same pull request. On all other pull requests the workflow fails if `assets/vendor/` does not match `package.json`.

Manually (Node.js ≥ 20):

```bash
npm install --ignore-scripts
npm run vendor
```

Node.js is only needed for updates and tests – the site itself has no build step.

## Tests

```bash
npm test
```

The tests cover page resolution and path validation, menu handling, heading ids and the forms integration. They need no dependencies.

## Continuous integration

| Workflow | Runs |
| :--- | :--- |
| `CI` | `npm test` |
| `Dependencies` | Vendor sync / check, see above |
| `CodeQL` | Security analysis of JavaScript and workflows (weekly and on every pull request) |

All actions are pinned to commit SHAs; Dependabot keeps them up to date.

## Contributing

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(menu): …`, `fix(security): …`).
- Every change gets an entry under `[Unreleased]` in [CHANGELOG.md](?CHANGELOG).
- Report security issues privately, see [Security](?SECURITY).
