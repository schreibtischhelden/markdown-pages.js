
# Styles & scripts

markdown-pages.js only renders content – the look comes from the CSS you choose.

## Default styles

`assets/user-styles.css` imports [Pico CSS](https://picocss.com/) 2 from `assets/vendor/pico/` and adds a few adjustments (header, figures, contrast). Pico styles plain HTML, which suits Markdown output; other [classless CSS frameworks](https://dohliam.github.io/dropin-minimal-css/) work too.

Pico 2 uses `--pico-*` variables:

```css
:root {
    --pico-primary: #13b1e5;
    --pico-font-size: 18px;
}
```

## Example scripts

`assets/user-scripts.js` contains:

- **Dark/light mode** – a button with `id="light-toggle"` (e.g. in `header.md`) switches the theme and remembers the choice; the default follows the system setting.
- **Syntax highlighting** with highlight.js from `assets/vendor/highlightjs/`, with a light and a dark theme.
- **Current page** – marks the link to the current page in a hand-written header navigation.
- A handler for forms without `action` (`mdp:form-submit`), used on the [Forms](?page=forms) page.

Scripts react to the `mdp:rendered` event instead of timeouts:

```javascript
document.addEventListener('mdp:rendered', function (event) {
	if (event.detail.region === 'main') {
		// the page content is in the DOM now
	}
});
```

Inline handlers (`onclick="…"`) do not work – the sanitizer removes them and the Content Security Policy blocks them. Use `addEventListener` in a script file.

## Documentation theme

This site uses the optional documentation theme `assets/docs.css` + `assets/docs.js`, a layout in the style of documentation sites such as [docs.paperless-ngx.com](https://docs.paperless-ngx.com/):

- top bar with logo, search, theme toggle and repository link (`header.md`)
- navigation on the left from `menu.json` (`<nav data-mdp-menu="tree" data-mdp-menu-toc>` in `index.html`), with the sections of the current page below its menu item and the visible section highlighted
- previous/next links and an "Edit this page" link (`EDIT_BASE` in `docs.js`)
- full-text search over all pages in `menu.json` – press `/` to focus it
- mobile navigation below 960px

To reuse it, copy `index.html`, `header.md`, `assets/docs.css` and `assets/docs.js` and adapt texts and links.

## CSS classes

| Selector | Element |
| :--- | :--- |
| `.mdp-menu`, `.mdp-menu-main`, `.mdp-menu-tree`, `.mdp-menu-sub`, `.mdp-menu-current` | Generated menus |
| `.mdp-menu-item-current`, `.mdp-menu-item-active`, `[aria-current="page"]` | Current page and its parents |
| `.mdp-toc` | Generated table of contents |
| `.mdp-menu-toc` | Sections of the current page inside a menu (`data-mdp-menu-toc`) |
| `.figure-left`, `.figure-right`, `.img-left`, `.img-right` | Floating figures and images (`user-styles.css`) |
