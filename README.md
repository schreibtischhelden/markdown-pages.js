
![markdown logo](assets/images/mdp.svg)

# markdown-pages.js – _simple Markdown-based static sites, without the generator_

_`Last Updated: 3/30/2026`_ [`edit`](https://github.com/dandalpiaz/markdown-pages/edit/main/README.md) <button id="light-toggle" aria-label="switch to light mode">🌗</button>

Use **markdown-pages.js** to create simple websites using [Markdown](https://www.markdownguide.org/basic-syntax/) files for page content. No site generator necessary - no build process, installs, etc. Client-side JavaScript fetches the Markdown files and handles the conversion to HTML. Content files can be edited directly where they are hosted! Check out the **[GitHub ![GitHub Logo](assets/images/github.png) repository](https://github.com/dandalpiaz/markdown-pages)**!

## Table of Contents

- [Quick Start](#quick-start)
- [Markdown Options](#markdown-options)
- [Menu](#menu)
- [Forms](#forms)
- [Deployment](#deployment)
- [User Styles & Scripts](#user-styles--scripts)
- [Third-Party Libraries](#third-party-libraries)
- [Limitations](#limitations)

## Quick Start

To use the library, simply add the JavaScript file in the `<head>` section of your `index.html` file and create empty `<header>`, `<main>`, and `<footer>` elements.

```html
<!doctype html>
<html lang="en">
<head>
  <!-- load main JS file -->
  <script src="https://cdn.jsdelivr.net/gh/dandalpiaz/markdown-pages.js@1.0.6/markdown-pages.min.js"></script>

  <!-- load optional user styles -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dandalpiaz/markdown-pages.js@1.0.6/assets/user-styles.min.css">
</head>
<body>
	<header></header>
	<main></main>
	<footer></footer>

	<!-- load optional user scripts -->
	<script src="https://cdn.jsdelivr.net/gh/dandalpiaz/markdown-pages.js@1.0.6/assets/user-scripts.min.js"></script>
</body>
</html>
```

Start from a fork of [markdown-pages.js](https://github.com/dandalpiaz/markdown-pages), or, use the CDN link like the snippet above. The library will use the `README.md` file for the homepage content. Optionally, a `header.md` and `footer.md` file can be created to populate those sections. Other pages can be stored in a `pages` directory. For example, a file at `pages/sample-page.md` can be linked to as follows:

```markdown
Check out the [sample page](?page=sample-page)
```

**Check out the [sample page](?page=sample-page)** (link will work on the rendered site, not github.com).

_Note: if you need to use HTML elements that don't have a Markdown equivalent, you can add the HTML in the Markdown file. It is kept by the converter, but sanitized with [DOMPurify](https://github.com/cure53/DOMPurify): scripts, `<style>`, `<iframe>`, event handlers like `onclick` and `javascript:` links are removed. See [SECURITY.md](SECURITY.md)._

## Markdown Options

The library uses the [Showdown JS](https://showdownjs.com/) converter which provides some extra options for how the Markdown content will be converted. The following [Showdown options](https://showdownjs.com/docs/available-options/) are active for this library:

```javascript
MarkdownPages.showdownOptions = {
  tables: true,
  emoji: true,
  ghCompatibleHeaderId: true,
  simpleLineBreaks: true,
  strikethrough: true,
  tasklists: true,
  parseImgDimensions: true,
};
```

The options can be changed from your own script before the page is rendered (`MarkdownPages.showdownOptions.emoji = false;`). After each region (`main`, `header`, `footer`) is rendered, a `mdp:rendered` event is dispatched on `document`.

## Menu

The navigation can be defined once in a `menu.json` file and inserted with placeholders: `{{menu:main}}` (main menu, see `header.md`), `{{menu:sub:<id>}}` (submenu of one main menu item) and `{{menu:current}}` (submenu of the section the current page belongs to). `menu.json` is only loaded when a page contains a placeholder. The file is optional: if it is missing or invalid, the hand-written navigation marked with `data-mdp-menu-fallback` is used as before. See the **[menu documentation](?page=menu)** (`pages/menu.md`).

## Forms

Forms can be written in Markdown inside a `:::form` block, e.g. `Name* = ___`, `Message = [___]`, `Topics = [x] Support [] Sales`, `Country = {DE, (AT)}` and `[[ Send ]]` for the button. Forms without `action` are not sent but dispatch a `mdp:form-submit` event for your own script. See the **[forms documentation](?page=forms)** (`pages/forms.md`).

## Deployment

The library can be used anywhere that web files are hosted — a traditional server, an object storage bucket like AWS s3, etc. Part of the aim of this project was to avoid the dependency of a static site generator, but [GitHub Pages](https://docs.github.com/en/pages/quickstart) remains a convenient option to host static files. [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) also offers no-cost static file hosting.

## User Styles & Scripts

The example site includes styles from the [Pico CSS](https://picocss.com/) framework and some custom styles via a `user-styles.css` file. This and [other classless CSS frameworks](https://dohliam.github.io/dropin-minimal-css/) work well with Markdown content. The example site also includes a dark/light mode toggle and code syntax highlighting via a `user-scripts.js` file.

## Third-Party Libraries

All third-party libraries are stored in the repository under `assets/vendor/` – the site does not load anything from external CDNs. The versions are defined in `package.json`:

| Library | Used for | Folder |
| :--- | :--- | :--- |
| [Showdown](https://showdownjs.com/) | Markdown → HTML conversion | `assets/vendor/showdown/` |
| [DOMPurify](https://github.com/cure53/DOMPurify) | Sanitizing the generated HTML | `assets/vendor/dompurify/` |
| [Pico CSS](https://picocss.com/) | Base styles | `assets/vendor/pico/` |
| [highlight.js](https://highlightjs.org/) | Code syntax highlighting | `assets/vendor/highlightjs/` |

**Updates** are handled by [Dependabot](https://docs.github.com/en/code-security/dependabot) (`.github/dependabot.yml`): it opens a weekly pull request that bumps `package.json`, and the `Dependencies` workflow regenerates `assets/vendor/` and pushes the result to the same pull request. To update manually (requires Node.js):

```bash
npm install --ignore-scripts
npm run vendor
```

Never edit files in `assets/vendor/` by hand – the `Dependencies` workflow fails if they don't match `package.json`. Node.js is only needed for updating the libraries; the site itself still has no build step.

## Limitations

- **URL Structure** – since all work is done on the client side with the `index.html` file, a nested URL structure (e.g. /directory1/directory2/page) is not possible. Instead pages are referenced by a query parameter (/?page=file-name).
- **Local Development** – since the site uses XMLHttpRequest to grab content, a local web server will be needed if you want to test things locally, e.g. `python -m http.server`. However, editing hosted files directly is part of the convenience/fun. 
- **Custom layouts** – Markdown used in this way is fairly linear, so custom layouts won't be possible without adding additional HTML in the pages.
