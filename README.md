
![markdown logo](assets/images/mdp.svg)

# markdown-pages.js – _simple Markdown-based static sites, without the generator_

[![CI](https://github.com/schreibtischhelden/markdown-pages.js/actions/workflows/ci.yml/badge.svg)](https://github.com/schreibtischhelden/markdown-pages.js/actions/workflows/ci.yml) [![CodeQL](https://github.com/schreibtischhelden/markdown-pages.js/actions/workflows/codeql.yml/badge.svg)](https://github.com/schreibtischhelden/markdown-pages.js/actions/workflows/codeql.yml)

Use **markdown-pages.js** to create simple websites from [Markdown](https://www.markdownguide.org/basic-syntax/) files. No site generator, no build process, no installs: client-side JavaScript fetches the Markdown files, converts them to HTML and sanitizes the result. Content files can be edited directly where they are hosted.

**📖 Documentation: [schreibtischhelden.github.io/markdown-pages.js](https://schreibtischhelden.github.io/markdown-pages.js/)** – the documentation is itself a markdown-pages.js site, built from this repository.

## Features

- **No build step** – one `index.html`, `markdown-pages.js` and your `.md` files
- **Self-contained** – Showdown, DOMPurify, Pico CSS and highlight.js are stored in `assets/vendor/`, nothing is loaded from a CDN; kept up to date by Dependabot
- **Secure by default** – page paths are validated, all HTML is sanitized with DOMPurify, a Content Security Policy is included
- **Navigation from JSON** – define the menu once in `menu.json`, insert it with `{{menu:main}}`, `{{menu:tree}}`, `{{menu:sub:<id>}}`, `{{menu:current}}`; plus `{{toc}}` for a table of contents
- **Forms in Markdown** – `:::form` blocks via [showdown-forms](https://github.com/schreibtischhelden/showdown-forms)
- **Documentation theme** – optional layout with sidebar, search, table of contents and previous/next links (used for the documentation)
- **Dark/light mode** and syntax highlighting as optional example scripts

## Quick start

```html
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<link rel="stylesheet" href="assets/user-styles.css">
	<script src="markdown-pages.js"></script>
</head>
<body>
	<header></header>
	<main></main>
	<footer></footer>
	<script src="assets/user-scripts.js"></script>
</body>
</html>
```

Fork this repository (or copy `index.html`, `markdown-pages.js` and `assets/`), write your home page into `README.md` and further pages into `pages/`. A file `pages/sample-page.md` is linked as `?page=sample-page` – **check out the [sample page](?page=sample-page)** (links of this kind work on the rendered site, not on github.com).

## Documentation

| | |
| :--- | :--- |
| **Getting started** | [Quick start](?page=quick-start) · [Deployment](?page=deployment) |
| **Usage** | [Writing pages](?page=writing-pages) · [Menu](?page=menu) · [Forms](?page=forms) · [Styles & scripts](?page=theming) · [Markdown showcase](?page=sample-page) |
| **Reference** | [JavaScript API](?page=api) · [Security](?SECURITY) · [Releases](https://github.com/schreibtischhelden/markdown-pages.js/releases) |
| **Project** | [Development](?page=development) |

On github.com, read the files in [`pages/`](pages/) or the [online documentation](https://schreibtischhelden.github.io/markdown-pages.js/).

## Limitations

- **URL structure** – everything runs client-side in `index.html`, so pages are addressed with a query parameter (`?page=name`) instead of nested paths.
- **Local development** – pages are loaded with `fetch()`, so a local web server is needed (`python -m http.server`).
- **Search engines** – content is rendered in the browser; crawlers that do not run JavaScript only see `index.html`.

## Credits & license

Based on [dandalpiaz/markdown-pages.js](https://github.com/dandalpiaz/markdown-pages.js) by Dan Dalpiaz. MIT License, see [LICENSE](LICENSE). Third-party libraries in `assets/vendor/` keep their own licenses.
