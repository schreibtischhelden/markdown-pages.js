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
	// Forms (Showdown extension) - syntax inspired by showdown-forms
	// ---------------------------------------------------------------------
	//
	// :::form action="https://example.com/submit" method="post"
	// Name* = ___
	// E-Mail* = ___:email
	// Message = [___]:5
	// Contact via = (x) e-mail () phone
	// Topics = [x] Support [] Sales
	// Country = {Germany, (Austria), ch -> Switzerland}
	// [[ Send ]]
	// :::
	//
	// Every value ends up in an attribute or text node and is HTML-escaped.
	// Without "action" the form is not sent anywhere: submitting dispatches a
	// "mdp:form-submit" event on the form (detail: { data: FormData }).

	var INPUT_TYPES = ['text', 'email', 'tel', 'number', 'date', 'time', 'url', 'password'];
	var FORM_BLOCK = /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)|(^|\n):::form([^\n]*)\n([\s\S]*?)\n:::[ \t]*(?=\n|$)/g;
	var formCounter = 0;

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function fieldName(label) {
		return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '') || 'field';
	}

	function parseFormAttributes(text) {
		var attrs = {};
		// fixed keywords instead of (\w+) keep the regex linear (CodeQL js/polynomial-redos)
		text.replace(/\b(action|method)\s?=\s?"([^"]*)"/gi, function (match, key, value) {
			attrs[key.toLowerCase()] = value.trim();
			return match;
		});
		var result = {};
		if (attrs.action) {
			var action = attrs.action;
			if (!/^\/\//.test(action) && !/[\u0000-\u001f\u007f]/.test(action) && SAFE_HREF.test(action)) {
				result.action = action;
			}
		}
		result.method = /^(get|post)$/i.test(attrs.method || '') ? attrs.method.toLowerCase() : 'post';
		return result;
	}

	function renderField(rawLabel, required, value, formId, index) {
		var label = rawLabel.trim();
		var name = fieldName(label);
		var id = formId + '-' + index;
		var req = required ? ' required' : '';
		var labelText = escapeHtml(label) + (required ? ' <span aria-hidden="true">*</span>' : '');
		var match;

		// text input: ___ or ___:email
		if ((match = /^___(?::([a-z]+))?$/.exec(value))) {
			var type = INPUT_TYPES.indexOf(match[1]) >= 0 ? match[1] : 'text';
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<input type="' + type + '" id="' + id + '" name="' + escapeHtml(name) + '" data-mdp-name="' + escapeHtml(name) + '"' + req + '>';
		}

		// textarea: [___] or [___]:5
		if ((match = /^\[___\](?::(\d{1,2}))?$/.exec(value))) {
			var rows = match[1] ? Math.max(1, parseInt(match[1], 10)) : 4;
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<textarea id="' + id + '" name="' + escapeHtml(name) + '" data-mdp-name="' + escapeHtml(name) + '" rows="' + rows + '"' + req + '></textarea>';
		}

		// radio buttons: (x) one () two
		if (/^\(x?\)/.test(value)) {
			return renderChoices('radio', /\((x?)\)\s*([^()]+)/g, value, labelText, name, id, req);
		}

		// checkboxes: [x] one [] two
		if (/^\[x?\]/.test(value)) {
			// "required" on every checkbox would force all of them - only mark the group
			return renderChoices('checkbox', /\[(x?)\]\s*([^[\]]+)/g, value, labelText, name, id, '');
		}

		// select: {a, (b), value -> Label}
		if ((match = /^\{(.+)\}$/.exec(value))) {
			var options = match[1].split(',').map(function (option) {
				option = option.trim();
				var selected = /^\(.*\)$/.test(option);
				if (selected) {
					option = option.slice(1, -1).trim();
				}
				var parts = option.split('->');
				var optValue = parts[0].trim();
				var optLabel = (parts.length > 1 ? parts.slice(1).join('->') : parts[0]).trim();
				return '<option value="' + escapeHtml(optValue) + '"' + (selected ? ' selected' : '') + '>'
					+ escapeHtml(optLabel) + '</option>';
			}).join('');
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<select id="' + id + '" name="' + escapeHtml(name) + '" data-mdp-name="' + escapeHtml(name) + '"' + req + '>' + options + '</select>';
		}

		return null;
	}

	function renderChoices(type, pattern, value, labelText, name, id, req) {
		var html = '<fieldset><legend>' + labelText + '</legend>';
		var i = 0;
		value.replace(pattern, function (match, checked, text) {
			var optionId = id + '-' + (i++);
			var optionText = text.trim();
			html += '<label for="' + optionId + '">'
				+ '<input type="' + type + '" id="' + optionId + '" name="' + escapeHtml(name) + '" data-mdp-name="' + escapeHtml(name) + '" value="'
				+ escapeHtml(optionText) + '"' + (checked ? ' checked' : '') + req + '> '
				+ escapeHtml(optionText) + '</label>';
			return match;
		});
		return html + '</fieldset>';
	}

	function renderForm(attrText, body) {
		var formId = 'mdp-form-' + (++formCounter);
		var attrs = parseFormAttributes(attrText);
		var html = '<form id="' + formId + '" method="' + attrs.method + '"'
			+ (attrs.action ? ' action="' + escapeHtml(attrs.action) + '"' : ' data-mdp-form="local"') + '>';
		body.split('\n').forEach(function (line, index) {
			line = line.trim();
			if (!line) {
				return;
			}
			// string operations instead of regexes with nested whitespace
			// quantifiers keep parsing linear (CodeQL js/polynomial-redos)
			if (line.length > 4 && line.slice(0, 2) === '[[' && line.slice(-2) === ']]') {
				var buttonText = line.slice(2, -2).trim();
				if (buttonText) {
					html += '<button type="submit">' + escapeHtml(buttonText) + '</button>';
					return;
				}
			}
			var rendered = null;
			var separator = line.indexOf('=');
			if (separator > 0) {
				var label = line.slice(0, separator).trim();
				var required = label.slice(-1) === '*';
				if (required) {
					label = label.slice(0, -1).trim();
				}
				var value = line.slice(separator + 1).trim();
				if (label && value) {
					rendered = renderField(label, required, value, formId, index);
				}
			}
			// anything else is shown as plain (escaped) text
			html += rendered !== null && rendered !== undefined ? rendered : '<p>' + escapeHtml(line) + '</p>';
		});
		return html + '</form>';
	}

	MarkdownPages.formsExtension = {
		type: 'lang',
		filter: function (text) {
			return text.replace(/\r\n?/g, '\n').replace(FORM_BLOCK, function (match, pre1, fence, pre2, attrs, body) {
				if (fence) {
					return match; // leave fenced code blocks untouched
				}
				return (pre2 || '') + '\n' + renderForm(attrs, body) + '\n\n';
			});
		},
	};
	MarkdownPages.extensions.push(MarkdownPages.formsExtension);
	MarkdownPages.renderForm = renderForm;

	/**
	 * DOMPurify removes name attributes that equal a form/document property
	 * (e.g. name="name", "action") to prevent DOM clobbering. For fields
	 * generated by the forms extension the name was derived from the label
	 * and is restricted to letters, digits, "_" and "-", so it is restored
	 * from data-mdp-name. Only form fields are affected, which cannot clobber
	 * document or window properties.
	 */
	function restoreFormNames(root) {
		root.querySelectorAll('form input[data-mdp-name], form textarea[data-mdp-name], form select[data-mdp-name]')
			.forEach(function (field) {
				var name = field.getAttribute('data-mdp-name');
				if (/^[\p{L}\p{N}_-]+$/u.test(name)) {
					field.setAttribute('name', name);
				}
				field.removeAttribute('data-mdp-name');
			});
	}

	// forms without action: never navigate away, hand the data to user scripts
	if (typeof document !== 'undefined') {
		document.addEventListener('submit', function (event) {
			var form = event.target;
			if (form && form.getAttribute && form.getAttribute('data-mdp-form') === 'local') {
				event.preventDefault();
				form.dispatchEvent(new CustomEvent('mdp:form-submit', {
					bubbles: true,
					detail: { data: new FormData(form) },
				}));
			}
		});
	}

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
		var result = String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
		// trim dashes without a regex (avoids polynomial backtracking on "----...")
		var start = 0;
		var end = result.length;
		while (start < end && result.charAt(start) === '-') {
			start++;
		}
		while (end > start && result.charAt(end - 1) === '-') {
			end--;
		}
		return result.slice(start, end);
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

	/**
	 * Parses the text of menu.json. Throws if it is not valid JSON or has no
	 * "main" array, so the caller can fall back to the hand-written navigation.
	 */
	function parseMenu(text) {
		var data = JSON.parse(text);
		if (!data || typeof data !== 'object' || !Array.isArray(data.main)) {
			throw new Error('"main" must be an array');
		}
		return normalizeMenu(data);
	}

	MarkdownPages.normalizeMenu = normalizeMenu;
	MarkdownPages.parseMenu = parseMenu;
	MarkdownPages.menuItemsFor = menuItemsFor;

	// ---------------------------------------------------------------------
	// Menu - DOM part
	// ---------------------------------------------------------------------

	var menuPromise = null;

	function loadMenu() {
		if (!menuPromise) {
			// menu.json is optional: any failure (missing file, network error,
			// invalid JSON or structure) resolves to null -> fallback navigation
			menuPromise = Promise.resolve().then(function () {
				return fetchText(MarkdownPages.menuUrl);
			}).then(function (text) {
				if (text === null) {
					throw new Error(MarkdownPages.menuUrl + ' not found');
				}
				return parseMenu(text);
			}).catch(function (error) {
				console.info('markdown-pages.js: no menu, using fallback navigation (' + error.message + ')');
				return null;
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
			if (menu === null) {
				// no usable menu.json: drop the placeholders, keep the hand-written navigation
				navs.forEach(function (nav) {
					nav.remove();
				});
				return;
			}
			// menu.json loaded: hand-written navigation marked as fallback is replaced
			root.querySelectorAll('[data-mdp-menu-fallback]').forEach(function (element) {
				element.remove();
			});
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
		restoreFormNames(element);
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
