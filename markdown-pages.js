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
	// Menu (menu.json) - pure part, unit tested
	// ---------------------------------------------------------------------
	//
	// menu.json:
	// { "main": [
	//     { "title": "Home", "href": "." },
	//     { "title": "Docs", "id": "docs", "page": "docs", "children": [
	//         { "title": "Install", "page": "install" } ] },
	//     { "title": "GitHub", "href": "https://github.com/..." } ] }
	//
	// Placeholders (in any Markdown file, also header.md / footer.md):
	//   {{menu:main}}       top-level items of the main menu
	//   {{menu:sub:<id>}}   children of the main menu item with that id
	//   {{menu:current}}    children of the main menu item that contains the current page

	MarkdownPages.menuUrl = 'menu.json';

	var PLACEHOLDER = /\{\{\s*menu:(main|current|sub:([A-Za-z0-9_-]+))\s*\}\}/g;
	var SAFE_HREF = /^(https?:|mailto:|[^:]*$)/i; // absolute http(s)/mailto, or no scheme at all
	var MAX_DEPTH = 5;

	function slug(text) {
		return String(text).toLowerCase().trim()
			.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	/** href of a menu item, or null if it has no valid target */
	function menuItemHref(item) {
		if (typeof item.page === 'string') {
			var page = item.page.replace(/\.md$/, '');
			return isSafePath(page) ? '?page=' + page : null;
		}
		if (typeof item.href === 'string') {
			var href = item.href.trim();
			// "//host" would be protocol-relative, control characters are never valid
			if (/^\/\//.test(href) || /[\u0000-\u001f\u007f]/.test(href)) {
				return null;
			}
			return SAFE_HREF.test(href) ? href : null;
		}
		return null;
	}

	/** Markdown file a menu item points to (for "current page"), or null */
	function menuItemFile(item) {
		var href = menuItemHref(item);
		if (href === null) {
			return null;
		}
		if (href === '.' || href === './' || href === '' || href === 'index.html' || href === './index.html') {
			return 'README.md';
		}
		if (href.charAt(0) === '?') {
			return resolvePage(href);
		}
		return null;
	}

	/**
	 * Validates and normalises the parsed menu.json. Invalid entries are
	 * dropped instead of breaking the whole menu.
	 */
	function normalizeMenu(data) {
		function items(list, depth) {
			if (!Array.isArray(list) || depth > MAX_DEPTH) {
				return [];
			}
			return list.reduce(function (result, raw) {
				if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string' || !raw.title.trim()) {
					return result;
				}
				var item = {
					title: raw.title.trim(),
					id: typeof raw.id === 'string' && /^[A-Za-z0-9_-]+$/.test(raw.id)
						? raw.id
						: slug(typeof raw.page === 'string' ? raw.page : raw.title),
					href: menuItemHref(raw),
					file: menuItemFile(raw),
					children: items(raw.children, depth + 1),
				};
				if (item.href !== null || item.children.length) {
					result.push(item);
				}
				return result;
			}, []);
		}
		return { main: items(data && data.main, 0) };
	}

	function containsFile(item, file) {
		return item.file === file || item.children.some(function (child) {
			return containsFile(child, file);
		});
	}

	/**
	 * Returns the list of items to show for a placeholder:
	 *   "main", "current" or "sub:<id>"
	 */
	function menuItemsFor(menu, kind, currentFile) {
		if (kind === 'main') {
			return menu.main;
		}
		var parent = null;
		if (kind === 'current') {
			parent = menu.main.filter(function (item) {
				return containsFile(item, currentFile);
			})[0];
		} else if (kind.indexOf('sub:') === 0) {
			var id = kind.slice(4);
			parent = menu.main.filter(function (item) {
				return item.id === id;
			})[0];
		}
		return parent ? parent.children : [];
	}

	MarkdownPages.normalizeMenu = normalizeMenu;
	MarkdownPages.menuItemsFor = menuItemsFor;

	// ---------------------------------------------------------------------
	// Menu - DOM part
	// ---------------------------------------------------------------------

	var menuPromise = null;

	function loadMenu() {
		if (!menuPromise) {
			menuPromise = fetchText(MarkdownPages.menuUrl).then(function (text) {
				if (text === null) {
					console.warn('markdown-pages.js: ' + MarkdownPages.menuUrl + ' not found');
					return normalizeMenu(null);
				}
				return normalizeMenu(JSON.parse(text));
			}).catch(function (error) {
				console.error('markdown-pages.js: invalid ' + MarkdownPages.menuUrl, error);
				return normalizeMenu(null);
			});
		}
		return menuPromise;
	}

	/** builds <ul> with DOM APIs only - titles are never parsed as HTML */
	function buildList(items, currentFile, nested) {
		var ul = document.createElement('ul');
		items.forEach(function (item) {
			var li = document.createElement('li');
			var label;
			if (item.href !== null) {
				label = document.createElement('a');
				label.setAttribute('href', item.href);
				if (/^https?:/i.test(item.href)) {
					label.setAttribute('rel', 'noopener noreferrer');
				}
			} else {
				label = document.createElement('span');
			}
			label.textContent = item.title;
			if (item.file !== null && item.file === currentFile) {
				label.setAttribute('aria-current', 'page');
				li.className = 'mdp-menu-item-current';
			} else if (containsFile(item, currentFile)) {
				li.className = 'mdp-menu-item-active';
			}
			li.appendChild(label);
			if (nested && item.children.length) {
				li.appendChild(buildList(item.children, currentFile, nested));
			}
			ul.appendChild(li);
		});
		return ul;
	}

	/**
	 * Replaces {{menu:...}} placeholders in text nodes (outside of code) with
	 * <nav data-mdp-menu="..."> elements, then fills all such elements.
	 */
	function applyMenus(root) {
		var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: function (node) {
				return node.parentNode.closest('code, pre, script, style, textarea')
					? NodeFilter.FILTER_REJECT
					: NodeFilter.FILTER_ACCEPT;
			},
		});
		var textNodes = [];
		while (walker.nextNode()) {
			PLACEHOLDER.lastIndex = 0;
			if (PLACEHOLDER.test(walker.currentNode.nodeValue)) {
				textNodes.push(walker.currentNode);
			}
		}

		textNodes.forEach(function (node) {
			var fragment = document.createDocumentFragment();
			var text = node.nodeValue;
			var last = 0;
			text.replace(PLACEHOLDER, function (match, kind, id, offset) {
				fragment.appendChild(document.createTextNode(text.slice(last, offset)));
				var nav = document.createElement('nav');
				nav.setAttribute('data-mdp-menu', kind);
				fragment.appendChild(nav);
				last = offset + match.length;
				return match;
			});
			fragment.appendChild(document.createTextNode(text.slice(last)));
			var parent = node.parentNode;
			// a paragraph that only holds the placeholder is replaced entirely
			if (parent.tagName === 'P' && parent.childNodes.length === 1 && !text.replace(PLACEHOLDER, '').trim()) {
				parent.replaceWith(fragment);
			} else {
				parent.replaceChild(fragment, node);
			}
		});

		var navs = root.querySelectorAll('[data-mdp-menu]');
		if (!navs.length) {
			return Promise.resolve();
		}
		return loadMenu().then(function (menu) {
			var currentFile = resolvePage(global.location.search);
			navs.forEach(function (nav) {
				var kind = nav.getAttribute('data-mdp-menu');
				var items = menuItemsFor(menu, kind, currentFile);
				nav.className = 'mdp-menu mdp-menu-' + kind.split(':')[0];
				if (!nav.hasAttribute('aria-label')) {
					nav.setAttribute('aria-label', kind === 'main' ? 'Main menu' : 'Submenu');
				}
				nav.textContent = '';
				if (items.length) {
					nav.appendChild(buildList(items, currentFile, kind !== 'main'));
				} else {
					nav.hidden = true;
				}
			});
		});
	}

	MarkdownPages.applyMenus = applyMenus;

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
		return applyMenus(element).catch(function (error) {
			console.error('markdown-pages.js: menu', error);
		}).then(function () {
			document.dispatchEvent(new CustomEvent('mdp:rendered', {
				detail: { region: selector, page: page },
			}));
		});
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
