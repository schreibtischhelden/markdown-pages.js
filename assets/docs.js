// Documentation theme for markdown-pages.js (see assets/docs.css):
// mobile navigation, search over all pages in menu.json, previous/next
// links, "edit this page" link and highlighting of the current section in
// the sidebar (sections of the current page, data-mdp-menu-toc). Everything is built with DOM APIs (textContent),
// nothing from the Markdown files is inserted as HTML.
(function () {
	'use strict';

	// link target for "edit this page"; set to '' to hide the link
	var EDIT_BASE = 'https://github.com/schreibtischhelden/markdown-pages.js/edit/main/';

	function currentFile() {
		return window.MarkdownPages ? window.MarkdownPages.resolvePage(window.location.search) : null;
	}

	function pages() {
		return window.MarkdownPages.loadMenu().then(function (menu) {
			return menu ? window.MarkdownPages.flattenMenu(menu) : [];
		});
	}

	// ------------------------------------------------------- mobile menu

	document.addEventListener('click', function (event) {
		var toggle = event.target.closest && event.target.closest('#docs-menu-toggle');
		if (toggle) {
			var open = document.body.classList.toggle('docs-nav-open');
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			return;
		}
		// close the menu when a link in it is used or the user clicks outside
		if (document.body.classList.contains('docs-nav-open')
			&& (!event.target.closest('.docs-sidebar') || event.target.closest('.docs-sidebar a'))) {
			document.body.classList.remove('docs-nav-open');
			var button = document.getElementById('docs-menu-toggle');
			if (button) {
				button.setAttribute('aria-expanded', 'false');
			}
		}
	});

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && document.body.classList.contains('docs-nav-open')) {
			document.body.classList.remove('docs-nav-open');
		}
	});

	// ------------------------------------------------ previous / next page

	function renderPager() {
		var pager = document.querySelector('.docs-pager');
		if (!pager) {
			return;
		}
		pages().then(function (list) {
			pager.textContent = '';
			var file = currentFile();
			var index = -1;
			list.forEach(function (page, i) {
				if (page.file === file) {
					index = i;
				}
			});
			if (index < 0) {
				return;
			}
			var ul = document.createElement('ul');
			[[list[index - 1], 'Previous', 'docs-pager-prev', 'prev'],
				[list[index + 1], 'Next', 'docs-pager-next', 'next']].forEach(function (entry) {
				var page = entry[0];
				if (!page || page.file === null) {
					return;
				}
				var li = document.createElement('li');
				li.className = entry[2];
				var a = document.createElement('a');
				a.setAttribute('href', page.href);
				a.setAttribute('rel', entry[3]);
				var small = document.createElement('small');
				small.textContent = entry[1];
				a.appendChild(small);
				a.appendChild(document.createTextNode(page.title));
				li.appendChild(a);
				ul.appendChild(li);
			});
			pager.appendChild(ul);
		});
	}

	// ---------------------------------------------------------- edit link

	function addEditLink() {
		var file = currentFile();
		var main = document.querySelector('main');
		if (!EDIT_BASE || !file || !main || file === '404.md') {
			return;
		}
		var a = document.createElement('a');
		a.className = 'docs-edit';
		a.setAttribute('href', EDIT_BASE + file);
		a.setAttribute('rel', 'noopener noreferrer');
		a.textContent = '✎ Edit this page';
		main.insertBefore(a, main.firstChild);
	}

	// ------------------------------------------ current section spy

	var tocObserver = null;

	function watchToc() {
		if (tocObserver) {
			tocObserver.disconnect();
		}
		var headings = document.querySelectorAll('main h2[id], main h3[id]');
		if (!headings.length || !('IntersectionObserver' in window)) {
			return;
		}
		var visible = {};
		tocObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				visible[entry.target.id] = entry.isIntersecting;
			});
			var active = null;
			for (var i = 0; i < headings.length; i++) {
				if (visible[headings[i].id]) {
					active = headings[i].id;
					break;
				}
			}
			if (active) {
				// looked up each time: the sidebar menu may be filled after <main>
				document.querySelectorAll('.docs-sidebar .mdp-menu-toc a').forEach(function (a) {
					a.classList.toggle('docs-toc-active', decodeURIComponent(a.getAttribute('href').slice(1)) === active);
				});
			}
		}, { rootMargin: '-60px 0px -60% 0px' });
		headings.forEach(function (heading) {
			tocObserver.observe(heading);
		});
	}

	// ------------------------------------------------------------ search

	var index = null;

	// rough Markdown -> plain text, only used for matching and snippets
	function plainText(markdown) {
		return markdown
			.replace(/<[^>]*>/g, ' ')
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/[#>*_`|~-]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function loadIndex() {
		if (!index) {
			index = pages().then(function (list) {
				return Promise.all(list.filter(function (page) {
					return page.file !== null;
				}).map(function (page) {
					return fetch(page.file, { credentials: 'same-origin' }).then(function (response) {
						return response.ok ? response.text() : '';
					}).catch(function () {
						return '';
					}).then(function (markdown) {
						return { title: page.title, section: page.section, href: page.href, text: plainText(markdown) };
					});
				}));
			});
		}
		return index;
	}

	function search(entries, query) {
		var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		return entries.map(function (entry) {
			var title = entry.title.toLowerCase();
			var text = entry.text.toLowerCase();
			var score = 0;
			for (var i = 0; i < terms.length; i++) {
				var inTitle = title.indexOf(terms[i]) >= 0;
				var inText = text.indexOf(terms[i]) >= 0;
				if (!inTitle && !inText) {
					return null;
				}
				score += (inTitle ? 10 : 0) + (inText ? 1 : 0);
			}
			return { entry: entry, score: score, position: text.indexOf(terms[0]) };
		}).filter(Boolean).sort(function (a, b) {
			return b.score - a.score;
		}).slice(0, 8);
	}

	function snippet(text, position, term) {
		if (position < 0) {
			return { before: text.slice(0, 120), match: '', after: '' };
		}
		var start = Math.max(0, position - 50);
		return {
			before: (start > 0 ? '…' : '') + text.slice(start, position),
			match: text.slice(position, position + term.length),
			after: text.slice(position + term.length, position + term.length + 80) + '…',
		};
	}

	function setupSearch() {
		var input = document.getElementById('docs-search-input');
		if (!input || input.dataset.ready) {
			return;
		}
		input.dataset.ready = '1';
		var results = document.createElement('ul');
		results.className = 'docs-search-results';
		results.id = 'docs-search-results';
		results.setAttribute('role', 'listbox');
		results.hidden = true;
		input.setAttribute('aria-controls', results.id);
		input.setAttribute('aria-expanded', 'false');
		input.parentNode.appendChild(results);

		function close() {
			results.hidden = true;
			input.setAttribute('aria-expanded', 'false');
		}

		function show(query) {
			query = query.trim();
			if (query.length < 2) {
				close();
				return;
			}
			loadIndex().then(function (entries) {
				if (input.value.trim() !== query) {
					return; // outdated
				}
				results.textContent = '';
				var hits = search(entries, query);
				if (!hits.length) {
					var empty = document.createElement('li');
					empty.className = 'docs-result-empty';
					empty.textContent = 'No results for "' + query + '"';
					results.appendChild(empty);
				}
				hits.forEach(function (hit, i) {
					var li = document.createElement('li');
					var a = document.createElement('a');
					a.setAttribute('href', hit.entry.href);
					a.setAttribute('role', 'option');
					a.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
					var title = document.createElement('span');
					title.className = 'docs-result-title';
					title.textContent = hit.entry.title;
					a.appendChild(title);
					if (hit.entry.section) {
						var section = document.createElement('span');
						section.className = 'docs-result-section';
						section.textContent = hit.entry.section;
						a.appendChild(section);
					}
					var parts = snippet(hit.entry.text, hit.position, query.split(/\s+/)[0]);
					var text = document.createElement('span');
					text.className = 'docs-result-snippet';
					text.appendChild(document.createTextNode(parts.before));
					if (parts.match) {
						var mark = document.createElement('mark');
						mark.textContent = parts.match;
						text.appendChild(mark);
					}
					text.appendChild(document.createTextNode(parts.after));
					a.appendChild(text);
					li.appendChild(a);
					results.appendChild(li);
				});
				results.hidden = false;
				input.setAttribute('aria-expanded', 'true');
			});
		}

		input.addEventListener('focus', function () {
			loadIndex();
		});
		input.addEventListener('input', function () {
			show(input.value);
		});
		input.addEventListener('keydown', function (event) {
			var options = Array.prototype.slice.call(results.querySelectorAll('a'));
			var selected = options.findIndex(function (a) {
				return a.getAttribute('aria-selected') === 'true';
			});
			if (event.key === 'Escape') {
				close();
				input.blur();
			} else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
				event.preventDefault();
				var next = (selected + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
				options.forEach(function (a, i) {
					a.setAttribute('aria-selected', i === next ? 'true' : 'false');
				});
				options[next].scrollIntoView({ block: 'nearest' });
			} else if (event.key === 'Enter' && options.length) {
				event.preventDefault();
				window.location.href = options[Math.max(0, selected)].href;
			}
		});
		document.addEventListener('click', function (event) {
			if (!event.target.closest('.docs-search')) {
				close();
			}
		});
		// "/" focuses the search like on many documentation sites
		document.addEventListener('keydown', function (event) {
			if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
				event.preventDefault();
				input.focus();
			}
		});
		// the search form never submits
		input.form && input.form.addEventListener('submit', function (event) {
			event.preventDefault();
		});
	}

	// ------------------------------------------------------------- wiring

	document.addEventListener('mdp:rendered', function (event) {
		if (event.detail.region === 'header') {
			setupSearch();
		}
		if (event.detail.region === 'main') {
			addEditLink();
			renderPager();
			watchToc();
		}
	});
})();
