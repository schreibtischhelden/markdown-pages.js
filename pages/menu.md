
# Menu

{{menu:current}}

The navigation is defined once in a `menu.json` file next to `index.html` and inserted into any Markdown file (including `header.md` and `footer.md`) with placeholders.

## menu.json

```json
{
	"main": [
		{ "title": "Home", "href": "." },
		{ "title": "Sample page", "page": "sample-page" },
		{
			"title": "Docs",
			"id": "docs",
			"page": "docs",
			"children": [
				{ "title": "Install", "page": "install" },
				{ "title": "Usage", "href": "?docs=usage" }
			]
		},
		{ "title": "GitHub", "href": "https://github.com/schreibtischhelden/markdown-pages.js" }
	]
}
```

| Field | Required | Description |
| :--- | :--- | :--- |
| `title` | yes | Link text (plain text, HTML is not interpreted) |
| `page` | one of `page` / `href` | Page in the `pages/` folder, `"install"` → `?page=install` |
| `href` | one of `page` / `href` | Any link: relative (`.`, `?docs=usage`) or `http(s):` / `mailto:` – other schemes are ignored |
| `id` | no | Name for `{{menu:sub:<id>}}`, defaults to `page` or the title in lowercase with dashes |
| `children` | no | Submenu items (same fields, max. 5 levels) |

Items without a valid `page` / `href` and without children are skipped.

## Placeholders

Write the placeholder on its own line (it replaces the paragraph) or inline:

| Placeholder | Output |
| :--- | :--- |
| `{{menu:main}}` | Top-level items of the main menu (typically in `header.md`) |
| `{{menu:tree}}` | The whole menu with all levels as nested list – e.g. a grouped documentation navigation |
| `{{menu:sub:<id>}}` | Submenu of the main menu item with that `id`, e.g. `{{menu:sub:docs}}` |
| `{{menu:current}}` | Submenu of the main menu item that contains the current page – shown on the item's own page and all its subpages, hidden elsewhere |

Placeholders inside code (`` `...` `` or code blocks) are not replaced. Instead of a placeholder, an element like `<nav data-mdp-menu="sub:docs"></nav>` can be used.

## Without menu.json (fallback)

`menu.json` is optional. If it is missing, cannot be loaded or is invalid (no valid JSON or no `"main"` array), the error is caught, the placeholders are removed and the previous, hand-written navigation is used – a note is logged to the browser console.

Mark the hand-written navigation with `data-mdp-menu-fallback`. It is shown only when no menu could be loaded and removed otherwise:

```html
{{menu:main}}

<p role="navigation" data-mdp-menu-fallback>
    <a href=".">Home</a> • 
    <a href="?page=sample-page">sample page</a>
</p>
```

`header.md` of this site works exactly like that.

## Styling

The link of the current page gets `aria-current="page"`, its list item the class `mdp-menu-item-current`, parent items the class `mdp-menu-item-active`. The menus have the classes `mdp-menu` and `mdp-menu-main` / `mdp-menu-tree` / `mdp-menu-sub` / `mdp-menu-current` for styling.

Go back to [Features](?page=features).
