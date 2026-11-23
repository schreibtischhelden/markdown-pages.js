// Unit tests for the menu.json handling of markdown-pages.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../markdown-pages.js', import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { normalizeMenu, parseMenu, menuItemsFor } = sandbox.MarkdownPages;

// plain copy so deepEqual does not compare objects across vm realms
const plain = (value) => JSON.parse(JSON.stringify(value));

const menu = normalizeMenu({
	main: [
		{ title: 'Home', href: '.' },
		{ title: 'Docs', id: 'docs', page: 'docs', children: [
			{ title: 'Install', page: 'install' },
			{ title: 'Usage', href: '?docs=usage' },
		] },
		{ title: 'Blog', page: 'blog', children: [{ title: 'First post', page: 'first-post' }] },
	],
});

test('normalizeMenu builds links and ids', () => {
	// Act
	const docs = menu.main[1];

	// Assert
	assert.equal(menu.main[0].file, 'README.md');
	assert.equal(docs.href, '?page=docs');
	assert.equal(docs.file, 'pages/docs.md');
	assert.equal(docs.children[1].file, 'docs/usage.md');
	assert.equal(menu.main[2].id, 'blog');
});

test('menuItemsFor returns the top level for "main"', () => {
	assert.deepEqual(plain(menuItemsFor(menu, 'main', 'README.md')).map((i) => i.title), ['Home', 'Docs', 'Blog']);
});

test('menuItemsFor returns the children of an item for "sub:<id>"', () => {
	assert.deepEqual(plain(menuItemsFor(menu, 'sub:docs', 'README.md')).map((i) => i.title), ['Install', 'Usage']);
	assert.deepEqual(plain(menuItemsFor(menu, 'sub:unknown', 'README.md')), []);
});

test('menuItemsFor "current" follows the current page and its subpages', () => {
	assert.deepEqual(plain(menuItemsFor(menu, 'current', 'pages/docs.md')).map((i) => i.title), ['Install', 'Usage']);
	assert.deepEqual(plain(menuItemsFor(menu, 'current', 'pages/install.md')).map((i) => i.title), ['Install', 'Usage']);
	assert.deepEqual(plain(menuItemsFor(menu, 'current', 'pages/first-post.md')).map((i) => i.title), ['First post']);
	assert.deepEqual(plain(menuItemsFor(menu, 'current', 'README.md')), []);
});

test('normalizeMenu drops unsafe or invalid entries', () => {
	// Arrange
	const input = { main: [
		{ title: 'js', href: 'javascript:alert(1)' },
		{ title: 'js2', href: ' JaVaScRiPt:alert(1)' },
		{ title: 'tab', href: 'java\tscript:alert(1)' },
		{ title: 'data', href: 'data:text/html,<script>alert(1)</script>' },
		{ title: 'proto-relative', href: '//evil.example/x' },
		{ title: 'traversal', page: '../secret' },
		{ title: '' , page: 'empty-title' },
		{ page: 'no-title' },
		'not an object',
		null,
		{ title: 'ok', href: 'https://example.com' },
		{ title: 'mail', href: 'mailto:info@example.com' },
	] };

	// Act
	const result = plain(normalizeMenu(input).main).map((i) => i.title);

	// Assert
	assert.deepEqual(result, ['ok', 'mail']);
});

test('normalizeMenu keeps titles as plain text', () => {
	// titles are inserted with textContent - they must not be altered here
	const result = normalizeMenu({ main: [{ title: '<img src=x onerror=alert(1)>', page: 'a' }] });
	assert.equal(result.main[0].title, '<img src=x onerror=alert(1)>');
});

test('normalizeMenu tolerates missing or malformed data', () => {
	assert.deepEqual(plain(normalizeMenu(null)), { main: [] });
	assert.deepEqual(plain(normalizeMenu({ main: 'x' })), { main: [] });
});

test('parseMenu accepts a valid menu.json', () => {
	// Act
	const result = plain(parseMenu('{"main":[{"title":"Home","href":"."}]}'));

	// Assert
	assert.equal(result.main[0].title, 'Home');
});

test('parseMenu throws on invalid menu.json so the fallback navigation is used', () => {
	const invalid = ['', '{ "main": [ broken', 'null', '[]', '{"main": "x"}', '{"menu": []}'];
	invalid.forEach((text) => assert.throws(() => parseMenu(text), undefined, text));
});

test('ids are derived from titles without leading or trailing dashes', () => {
	const result = normalizeMenu({ main: [{ title: '--- Über uns! ---', href: '.' }, { title: '-'.repeat(50000) + 'x', href: '.' }] });
	assert.equal(result.main[0].id, 'ber-uns');
	assert.equal(result.main[1].id, 'x');
});
