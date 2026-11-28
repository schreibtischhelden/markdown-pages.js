
# Use in other projects

To build several sites with markdown-pages.js, **do not fork or copy** this repository. It contains this documentation as well, and every project replaces exactly those files (`README.md`, `pages/`, `menu.json` …) – a sync would constantly conflict.

Instead, each project contains only its own content and includes markdown-pages.js as a **Git submodule**. Dependabot then opens a pull request in the project whenever markdown-pages.js changes.

## Example project

A documentation site `example-docs` – everything except `lib/markdown-pages/` belongs to the project:

```text
example-docs/
├── .github/
│   └── dependabot.yml        ← updates the submodule
├── .gitmodules               ← created by git submodule add
├── .nojekyll                 ← for GitHub Pages
├── lib/
│   └── markdown-pages/       ← submodule: this repository
├── index.html                ← loads the library from lib/markdown-pages/
├── README.md                 ← home page
├── header.md
├── footer.md
├── menu.json
└── pages/
    ├── install.md
    └── usage.md
```

### 1. Add the submodule

```bash
git submodule add https://github.com/schreibtischhelden/markdown-pages.js lib/markdown-pages
git commit -m "chore: add markdown-pages.js as submodule"
```

Use the `https://` URL – GitHub Pages and other hosts can only fetch public submodules over HTTPS.

### 2. index.html

The paths point into the submodule. `markdown-pages.js` and `user-scripts.js` load their vendored libraries relative to their own location, the Markdown files and `menu.json` are loaded relative to `index.html` – the project's own files:

```html
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">
	<title>Example docs</title>
	<link rel="stylesheet" href="lib/markdown-pages/assets/user-styles.css">
	<script src="lib/markdown-pages/markdown-pages.js"></script>
</head>
<body>
	<header></header>
	<main></main>
	<footer></footer>
	<script src="lib/markdown-pages/assets/user-scripts.js"></script>
</body>
</html>
```

Own styles or scripts go into the project (e.g. `assets/site.css`) and are loaded after the ones from the submodule. Never edit files inside `lib/markdown-pages/` – they are overwritten by the next update.

### 3. Content

`README.md`, `header.md`, `footer.md`, `menu.json` and `pages/*.md` are written as described in [Writing pages](?page=writing-pages) and [Menu](?page=menu):

```json
{
	"main": [
		{ "title": "Home", "href": "." },
		{ "title": "Install", "page": "install" },
		{ "title": "Usage", "page": "usage" }
	]
}
```

### 4. Dependabot

`.github/dependabot.yml` in the project:

```yaml
version: 2
updates:
  - package-ecosystem: gitsubmodule
    directory: /
    schedule:
      interval: weekly
    commit-message:
      prefix: chore(deps)
```

Dependabot checks the submodule weekly and opens a pull request that moves it to the latest commit on `main` of markdown-pages.js. Check the [release notes](https://github.com/schreibtischhelden/markdown-pages.js/releases) and the preview, then merge.

> **Forks:** In a forked repository, Dependabot only runs after it has been enabled once (GitHub shows a notice on the Actions/Insights pages). A newly created repository needs no extra step.

### 5. Publish

Publish the project as described in [Deployment](?page=deployment) – with an empty `.nojekyll` file in the root. GitHub Pages (*Deploy from a branch*) checks out public submodules automatically. With a custom workflow, check out with `submodules: true`:

```yaml
- uses: actions/checkout@v7
  with:
    submodules: true
```

## Working with the submodule

| Task | Command |
| :--- | :--- |
| Clone a project including the submodule | `git clone --recurse-submodules <url>` |
| Fetch the submodule after a plain clone or pull | `git submodule update --init` |
| Update manually to the latest `main` | `git submodule update --remote lib/markdown-pages` |
| Pin to a release | `git -C lib/markdown-pages checkout v2.1.0`, then commit |

The project always uses exactly the commit recorded in it – an update only happens when a pull request (or a manual update) is merged.

## Documentation theme

The theme of this site can be used as well: load `lib/markdown-pages/assets/docs.css` and use the layout of [index.html](https://github.com/schreibtischhelden/markdown-pages.js/blob/main/index.html) with `header.md` as a template. Copy `assets/docs.js` into the project, because `EDIT_BASE` (the "Edit this page" link) points to this repository – set it to your repository or to `''`.

## Alternatives

| Way | Updates |
| :--- | :--- |
| Git submodule (above) | Dependabot pull request for every new commit on `main` |
| CDN with a fixed version (`…@v2.1.0`, see [Quick start](?page=quick-start#alternative-load-from-a-cdn)) | Manual – change the version in `index.html` |
| Copy of the files | Manual – copy again |
