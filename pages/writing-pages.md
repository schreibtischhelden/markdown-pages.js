
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

## Markdown syntax

Pages are written in Markdown as described in the [Markdown Guide](https://markdownguide.offshoot.io/): all of the [basic syntax](https://markdownguide.offshoot.io/basic-syntax/) and the [extended syntax](https://markdownguide.offshoot.io/extended-syntax/) work. The [Markdown showcase](?page=sample-page) shows every element.

| Extended syntax | Markdown |
| :--- | :--- |
| Tables, fenced code blocks, strikethrough | as on GitHub |
| Task lists | `- [ ] open`, `- [x] done` |
| Footnotes | `Text[^1]` and somewhere `[^1]: The note.` – indent further paragraphs by four spaces. Notes are numbered in order of use and listed at the end of the page |
| Heading ids | `### Title {#custom-id}` – without it the id is generated, see [below](#headings-and-anchors) |
| Definition lists | `Term` and in the next line `: Definition` |
| Highlight | `==text==` |
| Subscript, superscript | `H~2~O`, `X^2^` (no spaces inside) |
| Emoji | `:smile:` |

The extended syntax that Showdown does not support itself (footnotes, definition lists, highlight, sub- and superscript) is added by markdown-pages.js. Set `MarkdownPages.extendedSyntax = [];` in your own script to switch it off.

### Hacks

For what Markdown cannot do, the Markdown Guide collects [hacks](https://markdownguide.offshoot.io/hacks/). They work here because HTML is allowed (see [HTML in Markdown](#html-in-markdown)): underline with `<ins>`, `&nbsp;` indents, `<center>` or `<p style="text-align:center">`, colours with `style` or `<font>`, comments with `[comment]: #`, admonitions as blockquotes with emoji, `<img width>`, `<figure>` captions, `target="_blank"` links (they get `rel="noopener noreferrer"`), HTML entities, `<br>` and lists in table cells, and a table of contents from heading links – or simply `{{toc}}`.

Embedded videos are the exception: `<iframe>` is removed by the sanitizer, so use the hack's image link to the video instead.

## Markdown options

The [Showdown](https://showdownjs.com/) converter runs with these [options](https://showdownjs.com/docs/available-options/):

```javascript
MarkdownPages.showdownOptions = {
  tables: true,
  emoji: true,
  ghCompatibleHeaderId: true,
  customizedHeaderId: true, // "### Title {#id}"
  simpleLineBreaks: true,
  strikethrough: true,
  tasklists: true,
  parseImgDimensions: true,
  ellipsis: false, // keeps "..." in text and link URLs
};
```

Change them in your own script before the page is rendered, e.g. `MarkdownPages.showdownOptions.simpleLineBreaks = false;`. The [Markdown showcase](?page=sample-page) shows the result.

## Headings and anchors

Headings get ids like on GitHub: `## Quick start` → `#quick-start`. A custom id is set with `## Quick start {#start}`. Link to them with `[text](?page=name#quick-start)`. The table of contents (`{{toc}}` or `<nav data-mdp-toc>`) is built from `h2` and `h3`.

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
