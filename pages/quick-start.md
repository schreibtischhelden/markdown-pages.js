
# Quick start

markdown-pages.js turns a folder of Markdown files into a website – without a build step. One `index.html`, the JavaScript file and your `.md` files are all you need.

## 1. Get the files

**Fork or download** [schreibtischhelden/markdown-pages.js](https://github.com/schreibtischhelden/markdown-pages.js). The repository is a complete, working site – this documentation.

| File / folder | Purpose |
| :--- | :--- |
| `index.html` | The only HTML page – loads everything else |
| `markdown-pages.js` | Fetches, converts, sanitizes and renders the Markdown |
| `assets/vendor/` | Showdown, DOMPurify, showdown-forms, highlight.js, Pico CSS – no CDN needed |
| `README.md` | Content of the home page |
| `header.md`, `footer.md` | Optional header and footer |
| `pages/*.md` | Further pages, linked as `?page=name` |
| `menu.json` | Optional navigation, see [Menu](?page=menu) |
| `assets/user-styles.css`, `assets/user-scripts.js` | Optional example styles and scripts (dark mode, highlighting) |
| `assets/docs.css`, `assets/docs.js` | Optional documentation theme used on this site |

## 2. Minimal index.html

```html
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self'">
	<title>My site</title>
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

`markdown-pages.js` loads its libraries from `assets/vendor/` **relative to its own location**, so keep both together.

### Alternative: load from a CDN

Every release is tagged (current: `v2.0.0`, see [Changelog](?CHANGELOG)), so the files can also be loaded from jsDelivr instead of copying them. The libraries are then loaded from the same CDN folder:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/schreibtischhelden/markdown-pages.js@v2.0.0/assets/user-styles.css">
<script src="https://cdn.jsdelivr.net/gh/schreibtischhelden/markdown-pages.js@v2.0.0/markdown-pages.js"></script>
<!-- at the end of <body>: -->
<script src="https://cdn.jsdelivr.net/gh/schreibtischhelden/markdown-pages.js@v2.0.0/assets/user-scripts.js"></script>
```

Always use a fixed version tag, never a branch. With a Content Security Policy, allow the CDN: `script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`. Your Markdown files, `menu.json` etc. are still loaded from your own site.

## 3. Write content

Put the home page into `README.md` and further pages into `pages/`:

```markdown
# My page

Check out the [sample page](?page=sample-page).
```

## 4. Try it locally

Pages are loaded with `fetch()`, which does not work from `file://`. Start any static web server in the folder:

```bash
python -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

> **Tip:** There is no build step – Markdown files can be edited directly where they are hosted, e.g. in the GitHub web editor.
