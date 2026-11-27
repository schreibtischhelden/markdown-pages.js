
# JavaScript API

`markdown-pages.js` exposes a global `MarkdownPages` object. Set options from a script that runs **before** the libraries have loaded (e.g. directly after `markdown-pages.js` in `<head>`).

## Options

| Property | Default | Description |
| :--- | :--- | :--- |
| `showdownOptions` | see [Writing pages](?page=writing-pages#markdown-options) | Options passed to the Showdown converter |
| `sanitizeConfig` | `{ ADD_ATTR: ['target'], FORBID_TAGS: ['style'] }` | Extra [DOMPurify settings](https://github.com/cure53/DOMPurify#can-i-configure-dompurify) – e.g. `ADD_TAGS: ['iframe']` for trusted embeds |
| `extensions` | forms extension | Showdown extensions (objects) used for every conversion |
| `menuUrl` | `'menu.json'` | Location of the menu file |
| `homeUrl` | `'README.md'` | Markdown file of the home page, relative to `index.html` – e.g. `'profile/README.md'` to show a README from a git submodule. Must be a relative `.md` path without `..`, otherwise `README.md` is used. Links and images in that file are still resolved relative to `index.html` |
| `formsOptions` | `{ idPrefix: 'mdp-form', dataPrefix: 'mdp' }` | Options for [showdown-forms](https://github.com/schreibtischhelden/showdown-forms) |

```javascript
MarkdownPages.showdownOptions.simpleLineBreaks = false;
MarkdownPages.sanitizeConfig.ADD_TAGS = ['iframe'];
```

## Events

| Event | Target | `detail` |
| :--- | :--- | :--- |
| `mdp:rendered` | `document` | `{ region, page }` – `region` is `'main'`, `'header'` or `'footer'`, `page` the file (`'pages/x.md'`); after a region was rendered (menus and table of contents included) |
| `mdp:form-submit` | the form (bubbles) | `{ data: FormData }` – a form without `action` was submitted |
| `markdown-pages-editor:preview` | the editor's preview element (bubbles) | `{ editor }` – the preview of an [editor](?page=editor) was updated |

## Properties and functions

| Name | Description |
| :--- | :--- |
| `ready` | Promise, resolved when all regions are rendered |
| `baseUrl` | URL of the folder that contains `markdown-pages.js` |
| `resolvePage(search)` | Maps a query string to a Markdown file (`'?page=x'` → `'pages/x.md'`), `null` if not allowed |
| `isSafePath(path)` | Checks a relative page path |
| `toHtml(markdown)` | Converts and sanitizes Markdown, returns HTML |
| `loadMenu()` | Promise with the normalised `menu.json`, `null` if missing or invalid |
| `flattenMenu(menu)` | All linked menu items in order (`title`, `href`, `file`, `section`) |
| `normalizeMenu(data)`, `parseMenu(text)`, `menuItemsFor(menu, kind, file)` | Menu helpers, see [Menu](?page=menu) |
| `applyMenus(root)` | Replaces menu placeholders below `root` and fills them |
| `buildToc()` | Fills all `[data-mdp-toc]` elements from the headings in `<main>` |
| `isSafeHeadingId(id)` | Whether a heading id is kept by the sanitizer hook |
| `setupForms(showdownForms)`, `formsExtension` | Forms integration |
| `editor(target, options)`, `editorOptions` | [Markdown editor](?page=editor) with a preview rendered like the site – needs `assets/vendor/markdown-pages-editor/markdown-pages-editor.js` |

## Example: open external links in a new tab

```javascript
document.addEventListener('mdp:rendered', function (event) {
	if (event.detail.region !== 'main') {
		return;
	}
	document.querySelectorAll('main a[href^="https://"]').forEach(function (link) {
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
	});
});
```
