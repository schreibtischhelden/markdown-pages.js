
// Optional example scripts: dark/light mode toggle, syntax highlighting and
// highlighting of the current page in the header navigation.
// Everything runs after markdown-pages.js dispatches "mdp:rendered", so no
// inline event handlers (onclick=...) are needed in the Markdown files.

// resolve vendored libraries relative to this file (assets/)
var userScriptsBaseUrl = new URL('.', document.currentScript.src);

// set syntax highlighting theme based on light or dark mode
function setHighlightTheme(mode) {
	var link = document.getElementById('highlight-styles');
	if (mode == "light") {
		link.href = new URL('vendor/highlightjs/stackoverflow-light.min.css', userScriptsBaseUrl).href;
	}
	if (mode == "dark") {
		link.href = new URL('vendor/highlightjs/vs2015.min.css', userScriptsBaseUrl).href;
	}
}

function getMode() {
	try {
		var mode = localStorage.getItem("mode");
		if (mode == "light" || mode == "dark") {
			return mode;
		}
	} catch (e) {
		// storage blocked (private mode etc.) - fall back to system setting
	}
	return window.matchMedia('(prefers-color-scheme: light)').matches ? "light" : "dark";
}

function applyMode(mode) {
	document.documentElement.setAttribute("data-theme", mode);
	try {
		localStorage.setItem("mode", mode);
	} catch (e) {
		// ignore
	}
	setHighlightTheme(mode);
	var button = document.getElementById("light-toggle");
	if (button) {
		button.setAttribute("aria-pressed", mode == "light" ? "true" : "false");
	}
}

// toggle between light and dark mode
function toggleLight() {
	applyMode(getMode() == "light" ? "dark" : "light");
}

// bold the link for the current page in the header
function boldCurrentPage() {
	var params = new URLSearchParams(window.location.search);
	var page = params.get('page');
	if (page) {
		var links = document.querySelectorAll('header p a');
		links.forEach(function(link) {
			if (link.getAttribute('href').includes('page=' + page)) {
				link.style.fontWeight = 'bold';
				link.setAttribute('aria-current', 'page');
			}
		});
	} else if (params.size == 0) {
		var homeLink = document.querySelector('header p a[href="."]');
		if (homeLink) {
			homeLink.style.fontWeight = 'bold';
			homeLink.setAttribute('aria-current', 'page');
		}
	}
}

function highlightCode() {
	if (window.hljs) {
		document.querySelectorAll('pre code:not(.hljs)').forEach(function (block) {
			window.hljs.highlightElement(block);
		});
	}
}

// light/dark toggle button (id="light-toggle") - event delegation instead of onclick
document.addEventListener('click', function (event) {
	if (event.target.closest && event.target.closest('#light-toggle')) {
		toggleLight();
	}
});

// react to rendered Markdown regions
document.addEventListener('mdp:rendered', function (event) {
	if (event.detail.region == 'header') {
		boldCurrentPage();
	}
	applyMode(getMode());
	highlightCode();
});

// set up on page load
(function () {
	var main = document.querySelector('main');
	main.className = "container";
	// add ID to main element for skip link
	main.id = "main";

	var hljsScript = document.createElement('script');
	hljsScript.src = new URL('vendor/highlightjs/highlight.min.js', userScriptsBaseUrl).href;
	hljsScript.onload = highlightCode;
	document.head.appendChild(hljsScript);

	var hlcss = document.createElement('link');
	hlcss.rel = 'stylesheet';
	hlcss.id = 'highlight-styles';
	document.head.appendChild(hlcss);

	applyMode(getMode());
})();

// demo for pages/forms.md: show the values of forms without "action"
document.addEventListener('mdp:form-submit', function (event) {
	var output = document.getElementById('form-result');
	if (!output) {
		return;
	}
	var values = [];
	event.detail.data.forEach(function (value, key) {
		values.push(key + ': ' + value);
	});
	output.textContent = 'Submitted (not sent anywhere) – ' + values.join(', ');
});

// demo for pages/editor.md: a Markdown editor (needs assets/vendor/markdown-pages-editor/markdown-pages-editor.js)
document.addEventListener('mdp:rendered', function (event) {
	var container = document.getElementById('editor-demo');
	if (event.detail.region !== 'main' || !container || !window.MarkdownPages.editor) {
		return;
	}
	window.MarkdownPages.editor(container, {
		fileName: 'example.md',
		value: '# Example page\n\nWrite **Markdown** here – the preview on the right is rendered like this site.\n\n- [ ] a task\n- a [link](?page=quick-start)\n\n```js\nconsole.log("hello");\n```\n\n:::form\nName = ___\n[[ Send ]]\n:::\n',
	});
});

// highlight code blocks in editor previews
document.addEventListener('markdown-pages-editor:preview', highlightCode);
