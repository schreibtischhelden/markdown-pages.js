
# Writing pages

## Files and URLs

| URL | File |
| :--- | :--- |
| `/` | `README.md` |
| `?page=name` | `pages/name.md` |
| `?name` | `name.md` (next to `index.html`) |
| `?docs=name` | `docs/name.md` – any folder works |
| `?docs=guide/setup` | `docs/guide/setup.md` |

Page names may contain letters, digits, `_`, `-` and `.`. Paths with `..`, hidden files (`.env`), `//` or URL schemes are rejected and show *Page not found*. If a `404.md` exists, it is shown instead of the default message.

The first `# heading` of a page becomes the browser title (`Heading | Site title`).

## Header and footer

`header.md` and `footer.md` are rendered into `<header>` and `<footer>` on every page. Both are optional.

## Markdown options

The [Showdown](https://showdownjs.com/) converter runs with these [options](https://showdownjs.com/docs/available-options/):

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

Change them in your own script before the page is rendered, e.g. `MarkdownPages.showdownOptions.simpleLineBreaks = false;`. The [Markdown showcase](?page=sample-page) shows the result.

## Headings and anchors

Headings get ids like on GitHub: `## Quick start` → `#quick-start`. Link to them with `[text](?page=name#quick-start)`. The table of contents (`{{toc}}` or `<nav data-mdp-toc>`) is built from `h2` and `h3`.

## HTML in Markdown

HTML without a Markdown equivalent can be written directly into the file (figures, buttons, `<details>` …). The generated HTML is **sanitized** with DOMPurify: `<script>`, `<style>`, `<iframe>`, event handlers such as `onclick` and `javascript:` links are removed. Put JavaScript into a script file instead – see [Styles & scripts](?page=theming).

## Placeholders

| Placeholder | Output |
| :--- | :--- |
| `{{menu:main}}`, `{{menu:tree}}`, `{{menu:sub:<id>}}`, `{{menu:current}}` | Navigation from `menu.json`, see [Menu](?page=menu) |
| `{{toc}}` | Table of contents of the current page |
| `:::form` … `:::` | Form, see [Forms](?page=forms) |

Placeholders inside code are left alone.
