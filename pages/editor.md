# Editor

`markdown-pages-editor.js` is an optional, lightweight Markdown editor: a text field with a small toolbar and a live preview. The preview is rendered exactly like the site – Showdown with the same options, DOMPurify, [forms](?page=forms) and [menu placeholders](?page=menu). It has no dependencies besides `markdown-pages.js`, and nothing is sent anywhere: the text can be downloaded as a `.md` file or read with `getValue()`.

Use it for tools that produce Markdown in the browser, e.g. a configuration UI that lets people write the pages of their site and download them.

## Example

<div id="editor-demo"></div>

## Include it

The editor is not loaded by default. Add its two files after `markdown-pages.js`:

```html
<link rel="stylesheet" href="markdown-pages-editor.css">
<script src="markdown-pages.js"></script>
<script src="markdown-pages-editor.js"></script>
```

Then create an editor from a script (scripts in Markdown files are removed by the sanitizer):

```javascript
var editor = MarkdownPages.editor(document.getElementById('my-editor'), {
	value: '# Imprint\n\n…',
	fileName: 'imprint.md',
});
```

The first argument is a container the editor is appended to, or an existing `<textarea>`, which is enhanced and keeps its `name` – so it still works in a form. In `index.html`, `<textarea data-mdp-editor data-file-name="page.md"></textarea>` is enhanced automatically.

## Options

| Option | Default | Description |
| :--- | :--- | :--- |
| `value` | the textarea's text | Initial text |
| `fileName` | – | File name for the *Download* button; without it there is no button |
| `mode` | `'split'` | `'split'` (text and preview side by side, stacked on narrow screens), `'write'` or `'preview'` |
| `storageKey` | – | Keeps an unsaved draft in `localStorage` under this key, so a reload does not lose it |
| `delay` | `200` | Milliseconds between typing and the preview update |
| `labels` | English | Button texts, e.g. `{ bold: 'Fett', preview: 'Vorschau', download: 'Herunterladen' }` – see `MarkdownPages.editor.labels` for all keys |
| `onChange` | – | `function (value, editor)`, called after every change |

## Toolbar and shortcuts

| Button | Shortcut | Result |
| :--- | :--- | :--- |
| **B** | <kbd>Ctrl</kbd>+<kbd>B</kbd> | `**bold**` – again to remove |
| _I_ | <kbd>Ctrl</kbd>+<kbd>I</kbd> | `_italic_` |
| H | | Heading: none → `##` → `###` → none |
| Link | <kbd>Ctrl</kbd>+<kbd>K</kbd> | `[text](https://)` with the address selected |
| `</>` | | `` `code` ``, a fenced block if several lines are selected |
| “ • 1. | | Quote, bulleted and numbered list for all selected lines – again to remove |

On macOS, <kbd>⌘</kbd> works instead of <kbd>Ctrl</kbd>. The commands keep the browser's undo history.

## Methods

`MarkdownPages.editor()` returns an object:

| Name | Description |
| :--- | :--- |
| `getValue()`, `setValue(text)` | Read or replace the text |
| `isDirty()`, `markSaved()` | Whether the text changed since it was loaded or last marked as saved; `markSaved()` also removes the draft |
| `download([fileName])` | Downloads the text as a `.md` file (the name is reduced to a plain file name) |
| `setMode(mode)`, `getMode()` | Switch between `'write'`, `'split'` and `'preview'` |
| `render()` | Updates the preview now, returns a Promise |
| `exec(command)` | Runs a toolbar command: `bold`, `italic`, `heading`, `link`, `code`, `quote`, `list`, `numbered` |
| `focus()`, `destroy()` | Focus the text field; remove the editor (an enhanced textarea is put back) |
| `element`, `textarea`, `preview` | The DOM elements |

After every preview update an `mdp:editor-preview` event bubbles from the preview element (`detail: { editor }`) – e.g. to highlight code blocks:

```javascript
document.addEventListener('mdp:editor-preview', function (event) {
	event.target.querySelectorAll('pre code').forEach(function (block) {
		hljs.highlightElement(block);
	});
});
```

## Preview and security

- The preview uses `MarkdownPages.toHtml()`, so it is sanitized like every page.
- Ids in the preview get a prefix (`mdp-editor-1-…`), so headings of the edited text never clash with ids of the page around the editor.
- Links in the preview do not navigate away from unsaved text, and forms in the preview are not submitted – the page's own `mdp:form-submit` handlers do not see them.
- Downloads are created in the browser (`Blob`), nothing is uploaded.

## Styling

The editor uses Pico CSS variables when they exist and otherwise the surrounding text colour. Adapt it with CSS variables on `.mdp-editor`:

```css
.mdp-editor {
	--mdp-editor-height: 30rem;
	--mdp-editor-border: #ccc;
	--mdp-editor-active: #2f3e4e;
	--mdp-editor-active-text: #fff;
}
```
