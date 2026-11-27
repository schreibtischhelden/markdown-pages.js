// Unit tests for the table of contents of markdown-pages.js: hidden
// headings, live mode and the page sections below the current menu item.
// A minimal fake DOM keeps the tests free of dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../markdown-pages.js', import.meta.url), 'utf8');

// plain copy so deepEqual does not compare objects across vm realms
const plain = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------------------
// Fake DOM: just enough for buildToc, fillMenus and watchToc
// ---------------------------------------------------------------------------

function matchesCompound(element, selector) {
	const tag = /^[a-z0-9]+/i.exec(selector);
	if (tag && element.tagName !== tag[0].toUpperCase()) {
		return false;
	}
	const tokens = /\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g;
	let token;
	while ((token = tokens.exec(selector))) {
		if (token[1] && !element.className.split(/\s+/).includes(token[1])) {
			return false;
		}
		if (token[2] && (!element.hasAttribute(token[2]) || (token[3] !== undefined && element.getAttribute(token[2]) !== token[3]))) {
			return false;
		}
	}
	return true;
}

class FakeElement {
	constructor(tag) {
		this.tagName = tag.toUpperCase();
		this.attributes = new Map();
		this.childNodes = [];
		this.parentNode = null;
		this.text = '';
	}
	get id() { return this.getAttribute('id') || ''; }
	set id(value) { this.setAttribute('id', value); }
	get className() { return this.getAttribute('class') || ''; }
	set className(value) { this.setAttribute('class', value); }
	get hidden() { return this.hasAttribute('hidden'); }
	set hidden(value) { if (value) { this.setAttribute('hidden', ''); } else { this.removeAttribute('hidden'); } }
	setAttribute(name, value) { this.attributes.set(name, String(value)); }
	getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
	hasAttribute(name) { return this.attributes.has(name); }
	removeAttribute(name) { this.attributes.delete(name); }
	get children() { return this.childNodes; }
	get firstChild() { return this.childNodes[0] || null; }
	get nextSibling() {
		const siblings = this.parentNode ? this.parentNode.childNodes : [];
		return siblings[siblings.indexOf(this) + 1] || null;
	}
	appendChild(child) { return this.insertBefore(child, null); }
	insertBefore(child, reference) {
		child.remove();
		const index = reference ? this.childNodes.indexOf(reference) : -1;
		if (index < 0) {
			this.childNodes.push(child);
		} else {
			this.childNodes.splice(index, 0, child);
		}
		child.parentNode = this;
		return child;
	}
	remove() {
		if (this.parentNode) {
			this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1);
			this.parentNode = null;
		}
	}
	get textContent() { return this.text + this.childNodes.map((child) => child.textContent).join(''); }
	set textContent(value) {
		this.childNodes.forEach((child) => { child.parentNode = null; });
		this.childNodes = [];
		this.text = String(value);
	}
	matches(selector) { return selector.split(',').some((part) => matchesCompound(this, part.trim())); }
	closest(selector) {
		for (let node = this; node; node = node.parentNode) {
			if (node.matches(selector)) {
				return node;
			}
		}
		return null;
	}
	querySelectorAll(selector) {
		const result = [];
		const walk = (node) => node.childNodes.forEach((child) => {
			if (child.matches(selector)) {
				result.push(child);
			}
			walk(child);
		});
		walk(this);
		return result;
	}
	querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

/** h('h2', { id: 'a' }, 'Title', h('span')) */
function h(tag, attributes = {}, ...children) {
	const element = new FakeElement(tag);
	Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value === true ? '' : value));
	children.forEach((child) => {
		if (typeof child === 'string') {
			element.text += child;
		} else {
			element.appendChild(child);
		}
	});
	return element;
}

/** loads markdown-pages.js with a fake document, timers and MutationObserver */
function load(...body) {
	const document = h('#document', {}, h('html', {}, h('body', {}, ...body)));
	document.createElement = (tag) => new FakeElement(tag);
	document.createTreeWalker = () => ({ nextNode: () => false });
	const timers = new Map();
	let nextTimer = 1;
	const observers = [];
	const sandbox = {
		URLSearchParams,
		URL,
		console,
		document,
		NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
		setTimeout: (fn) => { timers.set(nextTimer, fn); return nextTimer++; },
		clearTimeout: (id) => { timers.delete(id); },
		MutationObserver: class {
			constructor(callback) { this.callback = callback; observers.push(this); }
			observe(target, options) { this.target = target; this.options = options; }
		},
	};
	vm.createContext(sandbox);
	vm.runInContext(source, sandbox);
	return {
		MarkdownPages: sandbox.MarkdownPages,
		document,
		sandbox,
		observers,
		timers,
		flush() {
			const pending = [...timers.values()];
			timers.clear();
			pending.forEach((fn) => fn());
		},
	};
}

/** text of the links in a list, nested lists as arrays */
function outline(ul) {
	if (!ul) {
		return [];
	}
	return ul.children.flatMap((li) => {
		const nested = li.children.find((child) => child.tagName === 'UL');
		return nested ? [li.children[0].textContent, outline(nested)] : [li.children[0].textContent];
	});
}

/** a page like configui's source.md: flat headings, sections hidden at runtime */
function samplePage() {
	return h('main', {},
		h('h1', { id: 'source' }, 'Source'),
		h('h2', { id: 'general' }, 'General'),
		h('h3', { id: 'name' }, 'Name'),
		h('h2', { id: 'feed', hidden: true }, 'Feed'),
		h('h3', { id: 'feed-url', hidden: true }, 'Feed URL'),
		h('h2', { id: 'filters' }, 'Filters'),
		h('h3', {}, 'No id'),
		h('section', { hidden: true }, h('h2', { id: 'ical' }, 'iCal'), h('h3', { id: 'ical-url' }, 'iCal URL')),
		h('h2', { id: 'output' }, 'Output'));
}

// ---------------------------------------------------------------------------
// 1. hidden headings
// ---------------------------------------------------------------------------

test('tocEntries skips hidden headings, headings inside [hidden] and headings without id', () => {
	// Arrange
	const { MarkdownPages } = load();
	const main = samplePage();

	// Act
	const entries = plain(MarkdownPages.tocEntries(main.querySelectorAll('h2, h3'), main));

	// Assert
	assert.deepEqual(entries, [
		{ id: 'general', title: 'General', children: [{ id: 'name', title: 'Name', children: [] }] },
		{ id: 'filters', title: 'Filters', children: [] },
		{ id: 'output', title: 'Output', children: [] },
	]);
});

test('tocEntries moves a visible h3 up when its h2 is hidden', () => {
	// Arrange
	const { MarkdownPages } = load();
	const main = h('main', {},
		h('h2', { id: 'a' }, 'A'),
		h('h2', { id: 'b', hidden: true }, 'B'),
		h('h3', { id: 'b1' }, 'B1'),
		h('h3', { id: 'b2' }, 'B2'));

	// Act
	const entries = plain(MarkdownPages.tocEntries(main.querySelectorAll('h2, h3'), main));

	// Assert
	assert.deepEqual(entries.map((entry) => entry.id), ['a', 'b1', 'b2']);
});

test('isHidden only looks at ancestors below the root', () => {
	// Arrange
	const { MarkdownPages } = load();
	const heading = h('h2', { id: 'a' });
	const main = h('main', {}, h('div', {}, heading));
	h('div', { hidden: true }, main);

	// Act + Assert
	assert.equal(MarkdownPages.isHidden(heading, main), false);
	main.children[0].hidden = true;
	assert.equal(MarkdownPages.isHidden(heading, main), true);
});

test('buildToc lists only visible headings and hides an empty table of contents', () => {
	// Arrange
	const nav = h('nav', { 'data-mdp-toc': true });
	const { MarkdownPages, document } = load(nav, samplePage());

	// Act
	MarkdownPages.buildToc();

	// Assert
	assert.deepEqual(outline(nav.children[0]), ['General', ['Name'], 'Filters', 'Output']);
	assert.equal(nav.children[0].children[0].children[0].getAttribute('href'), '#general');
	assert.equal(nav.hidden, false);

	// Act: every heading hidden
	document.querySelector('main').querySelectorAll('h2, h3').forEach((heading) => { heading.hidden = true; });
	MarkdownPages.buildToc();

	// Assert
	assert.equal(nav.hidden, true);
	assert.deepEqual(outline(nav.children[0]), []);
});

// ---------------------------------------------------------------------------
// 3. sections below the current menu item
// ---------------------------------------------------------------------------

/** markup as built by fillMenus for data-mdp-menu="tree" */
function treeMenu(attributes = {}) {
	return h('nav', { 'data-mdp-menu': 'tree', 'data-mdp-menu-toc': true, ...attributes },
		h('ul', {},
			h('li', {}, h('a', { href: '.' }, 'Home')),
			h('li', { class: 'mdp-menu-item-current' },
				h('a', { href: '?page=source', 'aria-current': 'page' }, 'Source'),
				h('ul', {}, h('li', {}, h('a', { href: '?page=source-help' }, 'Help'))))));
}

test('buildToc puts the page sections below the current menu item, before its subpages', () => {
	// Arrange
	const menu = treeMenu();
	const { MarkdownPages } = load(menu, samplePage());
	const current = menu.querySelector('li.mdp-menu-item-current');

	// Act
	MarkdownPages.buildToc();

	// Assert
	assert.equal(current.children.length, 3);
	assert.equal(current.children[0].textContent, 'Source');
	assert.equal(current.children[1].className, 'mdp-menu-toc');
	assert.deepEqual(outline(current.children[1]), ['General', ['Name'], 'Filters', 'Output']);
	assert.deepEqual(outline(current.children[2]), ['Help']);
});

test('buildToc replaces the page sections of the menu on every call', () => {
	// Arrange
	const menu = treeMenu();
	const { MarkdownPages, document } = load(menu, samplePage());
	MarkdownPages.buildToc();

	// Act
	document.querySelector('main').querySelector('h2[id="filters"]').hidden = true;
	MarkdownPages.buildToc();

	// Assert
	assert.equal(menu.querySelectorAll('ul.mdp-menu-toc').length, 1);
	assert.deepEqual(outline(menu.querySelector('ul.mdp-menu-toc')), ['General', ['Name'], 'Output']);

	// Act: no visible headings left
	document.querySelector('main').querySelectorAll('h2, h3').forEach((heading) => { heading.hidden = true; });
	MarkdownPages.buildToc();

	// Assert
	assert.equal(menu.querySelector('ul.mdp-menu-toc'), null);
});

test('buildToc leaves menus without data-mdp-menu-toc alone', () => {
	// Arrange
	const menu = treeMenu();
	menu.removeAttribute('data-mdp-menu-toc');
	const { MarkdownPages } = load(menu, samplePage());

	// Act
	MarkdownPages.buildToc();

	// Assert
	assert.equal(menu.querySelector('ul.mdp-menu-toc'), null);
});

test('applyMenus adds the page sections when the menu is filled after <main>', async () => {
	// Arrange
	const nav = h('nav', { 'data-mdp-menu': 'tree', 'data-mdp-menu-toc': true });
	const { MarkdownPages, sandbox } = load(h('aside', {}, nav), samplePage());
	sandbox.location = { href: 'https://example.test/?page=source', origin: 'https://example.test', search: '?page=source', hash: '' };
	const menuJson = JSON.stringify({ main: [{ title: 'Home', href: '.' }, { title: 'Source', page: 'source' }] });
	sandbox.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(menuJson) });

	// Act
	await MarkdownPages.applyMenus(nav.parentNode);

	// Assert
	const current = nav.querySelector('li.mdp-menu-item-current');
	assert.equal(current.children[0].textContent, 'Source');
	assert.deepEqual(outline(current.querySelector('ul.mdp-menu-toc')), ['General', ['Name'], 'Filters', 'Output']);
});

// ---------------------------------------------------------------------------
// 2. live mode
// ---------------------------------------------------------------------------

test('watchToc does nothing without data-mdp-toc-live', () => {
	// Arrange
	const { MarkdownPages, observers } = load(h('nav', { 'data-mdp-toc': true }), samplePage());

	// Act + Assert
	assert.equal(MarkdownPages.watchToc(), false);
	assert.equal(observers.length, 0);
});

test('watchToc observes <main> for hidden changes and added or removed nodes, once', () => {
	// Arrange
	const { MarkdownPages, document, observers } = load(h('nav', { 'data-mdp-toc': true, 'data-mdp-toc-live': true }), samplePage());

	// Act
	assert.equal(MarkdownPages.watchToc(), true);
	assert.equal(MarkdownPages.watchToc(), true);

	// Assert
	assert.equal(observers.length, 1);
	assert.equal(observers[0].target, document.querySelector('main'));
	assert.deepEqual(plain(observers[0].options), { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
});

test('a live menu with data-mdp-menu-toc also starts the observer', () => {
	// Arrange
	const { MarkdownPages, observers } = load(treeMenu({ 'data-mdp-toc-live': true }), samplePage());

	// Act + Assert
	assert.equal(MarkdownPages.watchToc(), true);
	assert.equal(observers.length, 1);
});

test('a live table of contents is rebuilt once, after the changes have settled', () => {
	// Arrange
	const nav = h('nav', { 'data-mdp-toc': true, 'data-mdp-toc-live': true });
	const menu = treeMenu();
	const { MarkdownPages, document, observers, timers, flush } = load(nav, menu, samplePage());
	MarkdownPages.buildToc();
	MarkdownPages.watchToc();
	const main = document.querySelector('main');

	// Act: configui shows the feed section and hides the filters section
	main.querySelector('h2[id="feed"]').hidden = false;
	main.querySelector('h3[id="feed-url"]').hidden = false;
	observers[0].callback([{ target: main.querySelector('h2[id="feed"]') }]);
	main.querySelector('h2[id="filters"]').hidden = true;
	observers[0].callback([{ target: main.querySelector('h2[id="filters"]') }]);

	// Assert: debounced, nothing rebuilt yet
	assert.equal(timers.size, 1);
	assert.deepEqual(outline(nav.children[0]), ['General', ['Name'], 'Filters', 'Output']);

	// Act
	flush();

	// Assert
	assert.deepEqual(outline(nav.children[0]), ['General', ['Name'], 'Feed', ['Feed URL'], 'Output']);
	assert.deepEqual(outline(menu.querySelector('ul.mdp-menu-toc')), ['General', ['Name'], 'Feed', ['Feed URL'], 'Output']);
});

test('a live table of contents ignores its own changes and unchanged headings', () => {
	// Arrange: {{toc}} inside <main>, so rebuilding it is a mutation of <main>
	const nav = h('nav', { 'data-mdp-toc': true, 'data-mdp-toc-live': true });
	const main = samplePage();
	main.insertBefore(nav, main.firstChild);
	const { MarkdownPages, observers, timers, flush } = load(main);
	MarkdownPages.buildToc();
	MarkdownPages.watchToc();
	const list = nav.children[0];

	// Act: mutation inside the table of contents
	observers[0].callback([{ target: nav }, { target: list }]);

	// Assert
	assert.equal(timers.size, 0);

	// Act: unrelated change, headings stay the same
	observers[0].callback([{ target: main.children[1] }]);
	flush();

	// Assert: the list was not rebuilt
	assert.equal(nav.children[0], list);
});
