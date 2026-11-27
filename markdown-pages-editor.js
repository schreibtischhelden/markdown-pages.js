/*!
 * markdown-pages-editor.js - optional, lightweight Markdown editor for
 * markdown-pages.js: a textarea with a small toolbar and a live preview that
 * is rendered exactly like the site (Showdown + DOMPurify + forms + menus).
 * No dependencies besides markdown-pages.js, nothing is sent anywhere -
 * the text can be downloaded as a .md file.
 *
 *   <link rel="stylesheet" href="markdown-pages-editor.css">
 *   <script src="markdown-pages.js"></script>
 *   <script src="markdown-pages-editor.js"></script>
 *
 *   var editor = MarkdownPages.editor(element, { value: '# Hello', fileName: 'hello.md' });
 *   editor.getValue();
 *
 * After each preview render a bubbling "mdp:editor-preview" event is
 * dispatched on the preview element (detail: { editor }).
 */
(function (global) {
	'use strict';

	var MarkdownPages = global.MarkdownPages || (global.MarkdownPages = {});

	// ---------------------------------------------------------------------
	// Text commands (pure, unit tested)
	// ---------------------------------------------------------------------
	//
	// A command gets the text and the selection { value, start, end } and
	// returns one edit { from, to, text } plus the new selection
	// { start, end }. Applying a single edit keeps the browser's undo history.

	function lineStart(value, index) {
		return value.lastIndexOf('\n', index - 1) + 1;
	}

	function lineEnd(value, index) {
		var end = value.indexOf('\n', index);
		return end < 0 ? value.length : end;
	}

	/** full lines touched by the selection; a selection ending at the start of a line does not include it */
	function selectedLines(state) {
		var end = state.end > state.start && state.value.charAt(state.end - 1) === '\n' ? state.end - 1 : state.end;
		var from = lineStart(state.value, state.start);
		var to = lineEnd(state.value, end);
		return { from: from, to: to, lines: state.value.slice(from, to).split('\n') };
	}

	/** wraps the selection in before/after, or removes them if they are already there */
	function wrap(state, before, after, placeholder) {
		var value = state.value;
		var selected = value.slice(state.start, state.end);
		var outer = value.slice(state.start - before.length, state.start) === before
			&& value.slice(state.end, state.end + after.length) === after;
		if (outer && state.start >= before.length) {
			return {
				from: state.start - before.length,
				to: state.end + after.length,
				text: selected,
				start: state.start - before.length,
				end: state.end - before.length,
			};
		}
		var inner = selected.length >= before.length + after.length
			&& selected.slice(0, before.length) === before
			&& selected.slice(selected.length - after.length) === after;
		if (inner) {
			var stripped = selected.slice(before.length, selected.length - after.length);
			return { from: state.start, to: state.end, text: stripped, start: state.start, end: state.start + stripped.length };
		}
		var text = selected || placeholder;
		return {
			from: state.start,
			to: state.end,
			text: before + text + after,
			start: state.start + before.length,
			end: state.start + before.length + text.length,
		};
	}

	/** replaces the selected lines with mapLines(lines) and selects them */
	function editLines(state, mapLines) {
		var range = selectedLines(state);
		var text = mapLines(range.lines).join('\n');
		var single = range.lines.length === 1 && state.start === state.end;
		var cursor = single ? range.from + text.length : range.from;
		return { from: range.from, to: range.to, text: text, start: cursor, end: range.from + text.length };
	}

	/** adds a prefix to every selected line, or removes it if all lines have it */
	function prefixLines(state, prefix) {
		return editLines(state, function (lines) {
			var all = lines.every(function (line) {
				return line.slice(0, prefix.length) === prefix;
			});
			return lines.map(function (line) {
				return all ? line.slice(prefix.length) : prefix + line;
			});
		});
	}

	var NUMBERED = /^\d+\.\s/;

	function numberedList(state) {
		return editLines(state, function (lines) {
			var all = lines.every(function (line) {
				return NUMBERED.test(line);
			});
			return lines.map(function (line, index) {
				return all ? line.replace(NUMBERED, '') : (index + 1) + '. ' + line;
			});
		});
	}

	/** cycles the heading level of the selected lines: none -> ## -> ### -> none */
	function heading(state) {
		return editLines(state, function (lines) {
			var level = (/^(#{1,6}) /.exec(lines[0]) || [, ''])[1].length;
			var next = level === 0 ? 2 : level >= 3 ? 0 : level + 1;
			return lines.map(function (line) {
				var text = line.replace(/^#{1,6} /, '');
				return next ? new Array(next + 1).join('#') + ' ' + text : text;
			});
		});
	}

	function link(state) {
		var selected = state.value.slice(state.start, state.end);
		if (/^(https?:\/\/|mailto:|\?|\.\/)\S*$/.test(selected)) {
			// the selection is the address: ask for the text
			return {
				from: state.start,
				to: state.end,
				text: '[link text](' + selected + ')',
				start: state.start + 1,
				end: state.start + 10,
			};
		}
		var text = selected || 'link text';
		var url = 'https://';
		var urlStart = state.start + text.length + 3;
		return {
			from: state.start,
			to: state.end,
			text: '[' + text + '](' + url + ')',
			start: urlStart,
			end: urlStart + url.length,
		};
	}

	/** inline code, or a fenced block when the selection spans lines */
	function code(state) {
		var selected = state.value.slice(state.start, state.end);
		if (selected.indexOf('\n') < 0) {
			return wrap(state, '`', '`', 'code');
		}
		var from = lineStart(state.value, state.start);
		var to = selectedLines(state).to;
		var body = state.value.slice(from, to);
		var text = '```\n' + body + '\n```';
		return { from: from, to: to, text: text, start: from + 4, end: from + 4 + body.length };
	}

	var commands = {
		bold: function (state) { return wrap(state, '**', '**', 'bold text'); },
		italic: function (state) { return wrap(state, '_', '_', 'italic text'); },
		heading: heading,
		link: link,
		code: code,
		quote: function (state) { return prefixLines(state, '> '); },
		list: function (state) { return prefixLines(state, '- '); },
		numbered: numberedList,
	};

	/** applies an edit to a plain string (used by the tests and as fallback) */
	function applyEdit(value, edit) {
		return value.slice(0, edit.from) + edit.text + value.slice(edit.to);
	}

	/** file name for downloads: no folders, no characters that are invalid on common systems, ends in .md */
	function safeFileName(name) {
		var base = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]+/g, '').trim();
		base = base.replace(/^\.+/, '');
		if (!base) {
			base = 'page.md';
		}
		return /\.(md|markdown)$/i.test(base) ? base : base + '.md';
	}

	/**
	 * Gives every id in the preview a prefix and rewrites "#id" links to
	 * match, so preview headings never clash with ids of the host page.
	 */
	function prefixIds(root, prefix) {
		root.querySelectorAll('[id]').forEach(function (element) {
			element.id = prefix + element.id;
		});
		root.querySelectorAll('[for]').forEach(function (element) {
			element.setAttribute('for', prefix + element.getAttribute('for'));
		});
		root.querySelectorAll('a[href^="#"]').forEach(function (element) {
			var target = element.getAttribute('href').slice(1);
			if (target) {
				element.setAttribute('href', '#' + prefix + target);
			}
		});
	}

	// ---------------------------------------------------------------------
	// Browser part
	// ---------------------------------------------------------------------

	var LABELS = {
		toolbar: 'Formatting',
		bold: 'Bold',
		italic: 'Italic',
		heading: 'Heading',
		link: 'Link',
		code: 'Code',
		quote: 'Quote',
		list: 'Bulleted list',
		numbered: 'Numbered list',
		write: 'Write',
		preview: 'Preview',
		split: 'Side by side',
		download: 'Download',
		input: 'Markdown',
		empty: 'Nothing to preview yet.',
	};

	// visible text of the toolbar buttons (the label is the accessible name)
	var GLYPHS = {
		bold: 'B',
		italic: 'I',
		heading: 'H',
		link: 'Link',
		code: '</>',
		quote: '“',
		list: '•',
		numbered: '1.',
	};

	var SHORTCUTS = { b: 'bold', i: 'italic', k: 'link' };
	var MODES = ['write', 'split', 'preview'];
	var counter = 0;

	function element(tag, className, attributes) {
		var node = document.createElement(tag);
		if (className) {
			node.className = className;
		}
		Object.keys(attributes || {}).forEach(function (name) {
			node.setAttribute(name, attributes[name]);
		});
		return node;
	}

	function button(className, text, label) {
		var node = element('button', className, { type: 'button' });
		node.textContent = text;
		if (label && label !== text) {
			node.setAttribute('aria-label', label);
			node.title = label;
		}
		return node;
	}

	/**
	 * Creates an editor.
	 *
	 * @param {Element} target a <textarea> to enhance (it keeps its name, so it
	 *   still works in forms) or a container the editor is appended to
	 * @param {object} [options]
	 *   value       initial text (default: the textarea's value)
	 *   fileName    name for "Download"; without it there is no download button
	 *   mode        'split' (default), 'write' or 'preview'
	 *   storageKey  keep a draft in localStorage under this key
	 *   delay       milliseconds between typing and preview update (default 200)
	 *   labels      overrides for the English button texts (see LABELS)
	 *   onChange    function (value, editor), called after every change
	 */
	function createEditor(target, options) {
		options = options || {};
		var labels = {};
		Object.keys(LABELS).forEach(function (key) {
			labels[key] = (options.labels && options.labels[key]) || LABELS[key];
		});
		var id = 'mdp-editor-' + (++counter);

		var isTextarea = target.tagName === 'TEXTAREA';
		var root = element('div', 'mdp-editor');
		var input = isTextarea ? target : element('textarea', '', { 'aria-label': labels.input });
		if (isTextarea) {
			target.parentNode.insertBefore(root, target);
		} else {
			target.appendChild(root);
		}
		input.classList.add('mdp-editor-input');
		input.id = input.id || id + '-input';
		input.setAttribute('spellcheck', input.getAttribute('spellcheck') || 'true');

		var toolbar = element('div', 'mdp-editor-toolbar', { role: 'toolbar', 'aria-label': labels.toolbar, 'aria-controls': input.id });
		var format = element('div', 'mdp-editor-format');
		Object.keys(commands).forEach(function (name) {
			var node = button('mdp-editor-button mdp-editor-' + name, GLYPHS[name], labels[name]);
			node.setAttribute('data-command', name);
			format.appendChild(node);
		});
		var views = element('div', 'mdp-editor-modes');
		var modeButtons = {};
		MODES.forEach(function (name) {
			var node = button('mdp-editor-mode', labels[name]);
			node.setAttribute('data-mode', name);
			modeButtons[name] = node;
			views.appendChild(node);
		});
		toolbar.appendChild(format);
		toolbar.appendChild(views);
		var downloadButton = null;
		if (options.fileName) {
			downloadButton = button('mdp-editor-download', labels.download);
			toolbar.appendChild(downloadButton);
		}

		var panes = element('div', 'mdp-editor-panes');
		var preview = element('div', 'mdp-editor-preview', { 'aria-live': 'polite', 'aria-label': labels.preview, role: 'region' });
		panes.appendChild(input);
		panes.appendChild(preview);
		root.appendChild(toolbar);
		root.appendChild(panes);

		var initial = options.value !== undefined ? String(options.value) : input.value;
		var draft = readDraft(options.storageKey);
		input.value = draft !== null ? draft : initial;
		var saved = initial;
		var timer = null;
		var mode = null;

		var api = {
			element: root,
			textarea: input,
			preview: preview,
			getValue: function () { return input.value; },
			setValue: function (value) {
				input.value = String(value);
				changed();
			},
			/** marks the current text as saved (isDirty() is false again, the draft is removed) */
			markSaved: function () {
				saved = input.value;
				writeDraft(options.storageKey, null);
			},
			isDirty: function () { return input.value !== saved; },
			setMode: setMode,
			getMode: function () { return mode; },
			render: renderPreview,
			exec: exec,
			download: download,
			focus: function () { input.focus(); },
			destroy: destroy,
		};

		function changed() {
			writeDraft(options.storageKey, input.value !== saved ? input.value : null);
			if (typeof options.onChange === 'function') {
				options.onChange(input.value, api);
			}
			schedule();
		}

		function schedule() {
			if (mode === 'write') {
				return;
			}
			clearTimeout(timer);
			timer = setTimeout(renderPreview, options.delay !== undefined ? options.delay : 200);
		}

		function renderPreview() {
			clearTimeout(timer);
			var ready = global.showdown && global.DOMPurify ? Promise.resolve() : MarkdownPages.ready || Promise.resolve();
			return Promise.resolve(ready).then(function () {
				var markdown = input.value;
				if (!markdown.trim()) {
					preview.innerHTML = '';
					var hint = element('p', 'mdp-editor-empty');
					hint.textContent = labels.empty;
					preview.appendChild(hint);
					return;
				}
				preview.innerHTML = MarkdownPages.toHtml(markdown);
				if (global.showdownForms) {
					global.showdownForms.restoreNames(preview, MarkdownPages.formsOptions);
				}
				var menus = MarkdownPages.applyMenus ? MarkdownPages.applyMenus(preview) : null;
				return Promise.resolve(menus).catch(function () {
					// a missing menu.json only leaves the placeholder empty
				}).then(function () {
					prefixIds(preview, id + '-');
				});
			}).then(function () {
				preview.dispatchEvent(new CustomEvent('mdp:editor-preview', { bubbles: true, detail: { editor: api } }));
			}).catch(function (error) {
				console.error('markdown-pages-editor.js:', error);
			});
		}

		function setMode(next) {
			if (MODES.indexOf(next) < 0 || next === mode) {
				return;
			}
			mode = next;
			root.setAttribute('data-mode', mode);
			MODES.forEach(function (name) {
				modeButtons[name].setAttribute('aria-pressed', name === mode ? 'true' : 'false');
			});
			input.hidden = mode === 'preview';
			preview.hidden = mode === 'write';
			format.querySelectorAll('button').forEach(function (node) {
				node.disabled = mode === 'preview';
			});
			if (mode !== 'write') {
				renderPreview();
			}
		}

		function exec(name) {
			var command = commands[name];
			if (!command || input.disabled || input.readOnly) {
				return;
			}
			var edit = command({ value: input.value, start: input.selectionStart, end: input.selectionEnd });
			input.focus();
			input.setSelectionRange(edit.from, edit.to);
			// execCommand keeps the undo history; setRangeText is the fallback
			var done = false;
			try {
				done = edit.text
					? document.execCommand('insertText', false, edit.text)
					: (edit.from === edit.to || document.execCommand('delete'));
			} catch (e) {
				done = false;
			}
			if (!done || input.value.slice(edit.from, edit.from + edit.text.length) !== edit.text) {
				input.setRangeText(edit.text, edit.from, edit.to, 'end');
				changed();
			}
			input.setSelectionRange(edit.start, edit.end);
		}

		function download(name) {
			var blob = new Blob([input.value], { type: 'text/markdown;charset=utf-8' });
			var url = URL.createObjectURL(blob);
			var anchor = element('a', '', { href: url, download: safeFileName(name || options.fileName) });
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
		}

		function onToolbarClick(event) {
			var node = event.target.closest('button');
			if (!node || node.disabled) {
				return;
			}
			if (node.hasAttribute('data-command')) {
				exec(node.getAttribute('data-command'));
			} else if (node.hasAttribute('data-mode')) {
				setMode(node.getAttribute('data-mode'));
			} else if (node === downloadButton) {
				download();
			}
		}

		function onKeyDown(event) {
			if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
				var name = SHORTCUTS[event.key.toLowerCase()];
				if (name) {
					event.preventDefault();
					exec(name);
				}
			}
		}

		// the preview is only a view: links do not navigate away from unsaved
		// text and forms are neither sent nor seen by the host page's handlers
		function onPreviewClick(event) {
			var anchor = event.target.closest('a[href]');
			if (anchor && anchor.getAttribute('href').charAt(0) !== '#') {
				event.preventDefault();
			}
		}

		function onPreviewSubmit(event) {
			event.preventDefault();
			event.stopPropagation();
		}

		toolbar.addEventListener('click', onToolbarClick);
		input.addEventListener('input', changed);
		input.addEventListener('keydown', onKeyDown);
		preview.addEventListener('click', onPreviewClick);
		preview.addEventListener('submit', onPreviewSubmit);

		function destroy() {
			clearTimeout(timer);
			toolbar.removeEventListener('click', onToolbarClick);
			input.removeEventListener('input', changed);
			input.removeEventListener('keydown', onKeyDown);
			if (isTextarea) {
				input.classList.remove('mdp-editor-input');
				input.hidden = false;
				root.parentNode.insertBefore(input, root);
			}
			root.remove();
		}

		setMode(MODES.indexOf(options.mode) >= 0 ? options.mode : 'split');
		return api;
	}

	function readDraft(key) {
		if (!key) {
			return null;
		}
		try {
			return global.localStorage.getItem(key);
		} catch (e) {
			return null;
		}
	}

	function writeDraft(key, value) {
		if (!key) {
			return;
		}
		try {
			if (value === null) {
				global.localStorage.removeItem(key);
			} else {
				global.localStorage.setItem(key, value);
			}
		} catch (e) {
			// storage full or blocked - the text stays in the editor
		}
	}

	createEditor.commands = commands;
	createEditor.applyEdit = applyEdit;
	createEditor.safeFileName = safeFileName;
	createEditor.labels = LABELS;

	MarkdownPages.editor = createEditor;

	// <textarea data-mdp-editor data-file-name="page.md"> in index.html (not in
	// Markdown) is enhanced automatically
	if (typeof document !== 'undefined') {
		var enhance = function () {
			document.querySelectorAll('textarea[data-mdp-editor]').forEach(function (node) {
				node.removeAttribute('data-mdp-editor');
				createEditor(node, { fileName: node.getAttribute('data-file-name') || undefined, mode: node.getAttribute('data-mode') || undefined });
			});
		};
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', enhance);
		} else {
			enhance();
		}
	}
})(typeof window !== 'undefined' ? window : globalThis);
