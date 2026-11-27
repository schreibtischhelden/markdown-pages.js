# Editor

markdown-pages.js can show a lightweight Markdown editor: a text field with a configurable toolbar and a live preview. The editor is the package [@schreibtischhelden/markdown-editor](https://github.com/schreibtischhelden/markdown-editor) (vendored in `assets/vendor/markdown-editor/`). `MarkdownPages.editor()` connects it to the site, so the preview is rendered exactly like a page – Showdown with the same options, DOMPurify, [forms](?page=forms) and [menu placeholders](?page=menu).

Nothing is sent anywhere: the text can be downloaded as a `.md` file or read with `getValue()`. Use it for tools that produce Markdown in the browser, e.g. a configuration UI that lets people write the pages of their site.

## Example

<div id="editor-demo"></div>

## Include it

The editor is not loaded by default. Add its two files to `index.html`, the script after `markdown-pages.js`:

```html
<link rel="stylesheet" href="assets/vendor/markdown-editor/markdown-editor.css">
<script src="markdown-pages.js"></script>
<script src="assets/vendor/markdown-editor/markdown-editor.js"></script>
```

Then create an editor from a script (scripts in Markdown files are removed by the sanitizer):

```javascript
var editor = MarkdownPages.editor(document.getElementById('my-editor'), {
	value: '# Imprint\n\n…',
	fileName: 'imprint.md',
});
```

The first argument is a container the editor is appended to, or an existing `<textarea>`, which is enhanced and keeps its `name`.

## Configuration

All options of [markdown-editor](https://github.com/schreibtischhelden/markdown-editor#options) can be used. `MarkdownPages.editorOptions` holds defaults for every editor of the site:

```javascript
// only these buttons, German texts, no "Write only" mode
MarkdownPages.editorOptions = {
	toolbar: ['bold', 'italic', 'heading', '|', 'link', 'list'],
	modes: ['split', 'preview'],
	labels: { bold: 'Fett', italic: 'Kursiv', heading: 'Überschrift', preview: 'Vorschau', split: 'Nebeneinander', download: 'Herunterladen' },
};
```

| Option | Default | Description |
| :--- | :--- | :--- |
| `toolbar` | `bold`, `italic`, `heading`, `link`, `code`, `quote`, `list`, `numbered` | Buttons in this order, `'\|'` is a separator, `false` for none. Also available: `strikethrough`, `tasks`, `rule` |
| `commands` | – | Own commands for the toolbar |
| `modes`, `mode` | all, `'split'` | `'write'`, `'split'` (side by side), `'preview'`; one mode hides the switcher |
| `fileName`, `download` | – | File name for the *Download* button; `download: false` hides it |
| `storageKey` | – | Keeps an unsaved draft in `localStorage` |
| `shortcuts` | `true` | <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>B</kbd>, <kbd>I</kbd>, <kbd>K</kbd> for the buttons in the toolbar |
| `labels` | English | Button texts |
| `onChange`, `afterRender` | – | Callbacks |
| `render` | site renderer | Only set it to use a different renderer |

The returned object has `getValue()`, `setValue()`, `isDirty()`, `markSaved()`, `download()`, `setMode()`, `render()`, `exec()`, `focus()` and `destroy()` – see the [package documentation](https://github.com/schreibtischhelden/markdown-editor#methods).

## Preview

- The preview uses `MarkdownPages.toHtml()`, so it is sanitized like every page; form fields get their names back and menu placeholders are filled.
- Ids in the preview get a prefix, so headings of the edited text never clash with ids of the page around the editor.
- Links in the preview do not navigate away from unsaved text, and forms in the preview are not submitted – the page's `mdp:form-submit` handlers do not see them.
- After every update a `markdown-editor:preview` event bubbles from the preview element – `user-scripts.js` uses it to highlight code blocks:

```javascript
document.addEventListener('markdown-editor:preview', highlightCode);
```

## Styling

The stylesheet uses Pico CSS variables when they exist. Adapt it with CSS variables:

```css
.markdown-editor {
	--markdown-editor-height: 30rem;
	--markdown-editor-active: #2f3e4e;
	--markdown-editor-active-text: #fff;
}
```
