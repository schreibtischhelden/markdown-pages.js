
# Forms

{{menu:current}}

Forms can be written directly in Markdown inside a `:::form` block. Forms are provided by the Showdown extension [@schreibtischhelden/showdown-forms](https://github.com/schreibtischhelden/showdown-forms) (vendored in `assets/vendor/showdown-forms/`). markdown-pages.js configures it with `MarkdownPages.formsOptions` (`idPrefix: "mdp-form"`, `dataPrefix: "mdp"`).

## Example

:::form
Name* = ___
E-Mail* = ___:email
Message = [___]:5
Contact via = (x) e-mail () phone
Topics = [x] Support [] Sales [] Other
Country = {Germany, (Austria), ch -> Switzerland}
[[ Send ]]
:::

<p id="form-result" aria-live="polite"></p>

## Syntax

```text
:::form action="https://example.com/submit" method="post"
Name* = ___
E-Mail* = ___:email
Message = [___]:5
Contact via = (x) e-mail () phone
Topics = [x] Support [] Sales [] Other
Country = {Germany, (Austria), ch -> Switzerland}
[[ Send ]]
:::
```

| Line | Field |
| :--- | :--- |
| `Label = ___` | Text input |
| `Label = ___:email` | Input with type `email`, `tel`, `number`, `date`, `time`, `url` or `password` |
| `Label = [___]` / `[___]:5` | Textarea (optional number of rows) |
| `Label = (x) a () b` | Radio buttons, `(x)` is preselected |
| `Label = [x] a [] b` | Checkboxes, `[x]` is checked |
| `Label = {a, (b), v -> Label}` | Select, `(b)` is preselected, `v -> Label` sets a different value |
| `Label* = ...` | Required field |
| `[[ Send ]]` | Submit button |

- The field `name` is the label in lowercase with `_` instead of spaces (`E-Mail` → `e-mail`, `Contact via` → `contact_via`).
- Lines that are not a field are shown as text. Placeholders and Markdown are not processed inside the block.
- `action` may be a relative URL, `http(s):` or `mailto:`; `method` is `get` or `post` (default `post`).

## Sending the data

markdown-pages.js is a static site without a server, so the data has to go somewhere:

- **With `action`** – the browser sends the form to that URL, e.g. a form service or your own endpoint. The Content Security Policy in `index.html` only allows `form-action 'self'`: add the target, e.g. `form-action 'self' https://example.com`.
- **Without `action`** – the form is not sent. Submitting dispatches a `mdp:form-submit` event that your own script can handle:

```javascript
document.addEventListener('mdp:form-submit', function (event) {
	var data = Object.fromEntries(event.detail.data);
	console.log(event.target.id, data);
});
```

This page uses exactly that in `assets/user-scripts.js` to show the submitted values below the form.

## Security

All labels and values are HTML-escaped, the generated form also passes through the sanitizer, `action` URLs with other schemes (`javascript:`, `data:` …) are dropped.

Go back to [Features](?page=features).
