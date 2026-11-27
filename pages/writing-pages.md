
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
  ellipsis: false, // keeps "..." in text and link URLs
};
```

Change them in your own script before the page is rendered, e.g. `MarkdownPages.showdownOptions.simpleLineBreaks = false;`. The [Markdown showcase](?page=sample-page) shows the result.

## Headings and anchors

Headings get ids like on GitHub: `## Quick start` → `#quick-start`. Link to them with `[text](?page=name#quick-start)`. The table of contents (`{{toc}}` or `<nav data-mdp-toc>`) is built from `h2` and `h3`.

## Table of contents

`{{toc}}` or `<nav data-mdp-toc></nav>` lists the `h2` and `h3` headings of the page as nested anchor links. It is built after `<main>` has been rendered. Headings without an id, headings with the `hidden` attribute and headings inside a `[hidden]` element are left out; an `h3` whose `h2` is hidden moves up a level.

Pages whose scripts show or hide sections after rendering can either call `MarkdownPages.buildToc()` themselves or switch on live mode:

```html
<nav data-mdp-toc data-mdp-toc-live></nav>
```

In live mode a `MutationObserver` watches `<main>` (the `hidden` attribute and added or removed elements) and rebuilds the table of contents shortly after the changes have settled (`MarkdownPages.tocDelay`, 50 ms). Changes inside the table of contents and menus are ignored, and nothing is rebuilt when the visible headings stay the same. Live mode is opt-in; pages without `data-mdp-toc-live` start no observer. The `<nav>` can be written as HTML into a page (`{{toc}}` itself cannot carry the attribute) or placed in `index.html`.

To show the sections in the sidebar menu instead, see [Menu](?page=menu#sections-of-the-current-page).

## HTML in Markdown

HTML without a Markdown equivalent can be written directly into the file (figures, buttons, `<details>` …). The generated HTML is **sanitized** with DOMPurify: `<script>`, `<style>`, `<iframe>`, event handlers such as `onclick` and `javascript:` links are removed. Put JavaScript into a script file instead – see [Styles & scripts](?page=theming).

## Placeholders

| Placeholder | Output |
| :--- | :--- |
| `{{menu:main}}`, `{{menu:tree}}`, `{{menu:sub:<id>}}`, `{{menu:current}}` | Navigation from `menu.json`, see [Menu](?page=menu) |
| `{{toc}}` | Table of contents of the current page, see [above](#table-of-contents) |
| `:::form` … `:::` | Form, see [Forms](?page=forms) |

Placeholders inside code are left alone.
