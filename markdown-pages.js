/*!
 * markdown-pages.js - simple Markdown-based static sites, without the generator
 *
 * Loads README.md (or the page selected by the query string), header.md and
 * footer.md, converts them with Showdown and sanitizes the result with
 * DOMPurify before it is inserted into <main>, <header> and <footer>.
 *
 * After each region is rendered a "mdp:rendered" event is dispatched on
 * document (detail: { region: "main" | "header" | "footer", page: "..." }).
 */
(function (global) {
	'use strict';

	var MarkdownPages = {};

	// ---------------------------------------------------------------------
	// Page resolution (pure, unit tested)
	// ---------------------------------------------------------------------

	// one path segment: letters, digits, "_", "-", "." - no leading dot,
	// so "..", ".git" etc. are rejected
	var SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;

	function isSafePath(path) {
		if (typeof path !== 'string' || path.length === 0 || path.length > 200) {
			return false;
		}
		return path.split('/').every(function (segment) {
			return SEGMENT.test(segment);
		});
	}

	/**
	 * Maps the query string to a Markdown file relative to index.html.
	 *   (none)            -> README.md
	 *   ?page=foo         -> pages/foo.md
	 *   ?foo              -> foo.md
	 *   ?docs=foo         -> docs/foo.md
	 * Returns null when the requested path is not allowed. Only relative,
	 * same-directory paths are produced: no "//host", "https:", "..", etc.
	 */
	function resolvePage(search) {
		var params = new URLSearchParams(search || '');
		var first = params.entries().next().value;
		if (!first) {
			return 'README.md';
		}
		var key = first[0];
		var value = first[1];
		if (value && value.slice(-3) === '.md') {
			value = value.slice(0, -3);
		}
		if (key.slice(-3) === '.md') {
			key = key.slice(0, -3);
		}

		var path;
		if (key && !value) {
			path = key;
		} else if (key === 'page' && value) {
			path = 'pages/' + value;
		} else if (key && value) {
			path = key + '/' + value;
		} else {
			return 'README.md';
		}
		return isSafePath(path) ? path + '.md' : null;
	}

	MarkdownPages.isSafePath = isSafePath;
	MarkdownPages.resolvePage = resolvePage;

	// ---------------------------------------------------------------------
	// Conversion + sanitizing
	// ---------------------------------------------------------------------

	MarkdownPages.showdownOptions = {
		tables: true,
		emoji: true,
		ghCompatibleHeaderId: true,
		simpleLineBreaks: true,
		strikethrough: true,
		tasklists: true,
		parseImgDimensions: true,
	};

	// Showdown extensions (by name) registered by add-ons, e.g. forms
	MarkdownPages.extensions = [];

	// extra DOMPurify settings, add-ons may extend these
	MarkdownPages.sanitizeConfig = {
		ADD_ATTR: ['target'],
		FORBID_TAGS: ['style'],
	};

	var purifyConfigured = false;

	function configurePurify(DOMPurify) {
		if (purifyConfigured) {
			return;
		}
		purifyConfigured = true;
		// links opening a new window must not get access to window.opener
		DOMPurify.addHook('afterSanitizeAttributes', function (node) {
			if (node.tagName === 'A' && node.getAttribute('target')) {
				node.setAttribute('rel', 'noopener noreferrer');
			}
		});
	}

	function toHtml(markdown) {
		var converter = new global.showdown.Converter({ extensions: MarkdownPages.extensions });
		Object.keys(MarkdownPages.showdownOptions).forEach(function (key) {
			converter.setOption(key, MarkdownPages.showdownOptions[key]);
		});
		var html = converter.makeHtml(markdown);
		configurePurify(global.DOMPurify);
		return global.DOMPurify.sanitize(html, MarkdownPages.sanitizeConfig);
	}

	MarkdownPages.toHtml = toHtml;

	// ---------------------------------------------------------------------
	// Browser runtime
	// ---------------------------------------------------------------------

	function loadScript(src) {
		return new Promise(function (resolve, reject) {
			var script = document.createElement('script');
			script.src = src;
			script.onload = resolve;
			script.onerror = function () {
				reject(new Error('could not load ' + src));
			};
			document.head.appendChild(script);
		});
	}

	function fetchText(path) {
		// resolve against the page and refuse anything that leaves the origin
		var url = new URL(path, global.location.href);
		if (url.origin !== global.location.origin) {
			return Promise.resolve(null);
		}
		return fetch(url.href, { credentials: 'same-origin' }).then(function (response) {
			return response.ok ? response.text() : null;
		});
	}

	function render(selector, markdown, page) {
		var element = document.querySelector(selector);
		if (!element) {
			return;
		}
		element.innerHTML = toHtml(markdown);
		document.dispatchEvent(new CustomEvent('mdp:rendered', {
			detail: { region: selector, page: page },
		}));
	}

	function renderMain(page) {
		var request = page ? fetchText(page) : Promise.resolve(null);
		return request.then(function (markdown) {
			if (markdown !== null) {
				return markdown;
			}
			page = '404.md';
			return fetchText('404.md').then(function (notFound) {
				return notFound !== null ? notFound : '# Page not found\n\nThe requested page does not exist.';
			});
		}).then(function (markdown) {
			render('main', markdown, page);
			var h1 = document.querySelector('main h1');
			if (h1) {
				document.title = h1.textContent + ' | ' + document.title;
			}
			var hash = global.location.hash.substring(1);
			try {
				hash = decodeURIComponent(hash);
			} catch (e) {
				// keep the raw hash if it is not valid percent-encoding
			}
			var target = hash && document.getElementById(hash);
			if (target) {
				target.scrollIntoView();
			}
		});
	}

	function renderRegion(file, selector) {
		return fetchText(file).then(function (markdown) {
			if (markdown) {
				render(selector, markdown, file);
			}
		});
	}

	function start() {
		// resolve vendored libraries relative to this file, so it also works
		// when markdown-pages.js is loaded from another directory or a CDN
		var base = new URL('.', document.currentScript.src);
		var vendor = function (path) {
			return new URL('assets/vendor/' + path, base).href;
		};
		MarkdownPages.baseUrl = base.href;

		MarkdownPages.ready = Promise.all([
			loadScript(vendor('showdown/showdown.min.js')),
			loadScript(vendor('dompurify/purify.min.js')),
		]).then(function () {
			var onDom = document.readyState === 'loading'
				? new Promise(function (resolve) { document.addEventListener('DOMContentLoaded', resolve); })
				: Promise.resolve();
			return onDom;
		}).then(function () {
			return Promise.all([
				renderMain(resolvePage(global.location.search)),
				renderRegion('header.md', 'header'),
				renderRegion('footer.md', 'footer'),
			]);
		}).catch(function (error) {
			console.error('markdown-pages.js:', error);
		});
	}

	global.MarkdownPages = MarkdownPages;

	if (typeof document !== 'undefined' && document.currentScript) {
		start();
	}
})(typeof window !== 'undefined' ? window : globalThis);
