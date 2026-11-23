// Unit tests for the pure functions of markdown-pages.js.
// Run with: npm test   (Node.js >= 20, no dependencies needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// load the browser script in a sandbox without document -> it only defines MarkdownPages
const source = readFileSync(new URL('../markdown-pages.js', import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { resolvePage, isSafePath } = sandbox.MarkdownPages;

test('resolvePage maps the query string to Markdown files', async (t) => {
	const cases = [
		['', 'README.md'],
		['?', 'README.md'],
		['?page=sample-page', 'pages/sample-page.md'],
		['?page=sample-page.md', 'pages/sample-page.md'],
		['?about', 'about.md'],
		['?about.md', 'about.md'],
		['?docs=intro', 'docs/intro.md'],
		['?docs=guide/setup', 'docs/guide/setup.md'],
		['?page=v1.2-notes', 'pages/v1.2-notes.md'],
	];
	for (const [search, expected] of cases) {
		await t.test(search || '(empty)', () => {
			// Act + Assert
			assert.equal(resolvePage(search), expected);
		});
	}
});

test('resolvePage rejects paths that could leave the site directory or origin', async (t) => {
	const attacks = [
		'?//evil.example/x',                 // protocol-relative URL
		'?https:=//evil.example/x',          // absolute URL split into key/value
		'?page=//evil.example/x',
		'?page=https://evil.example/x',
		'?javascript:alert(1)',
		'?page=../index',                    // path traversal
		'?page=a/../../secret',
		'?.git/config',                      // hidden files
		'?page=.env',
		'?page=a%2F..%2F..%2Fx',
		'?page=a\b',                        // backslash
		'?page=%00',                         // null byte
		'?page=' + 'a'.repeat(300),          // overly long
		'?page=a%20b',                       // whitespace
	];
	for (const search of attacks) {
		await t.test(search.slice(0, 40), () => {
			// Act + Assert
			assert.equal(resolvePage(search), null);
		});
	}
});

test('isSafePath accepts nested relative paths only', () => {
	// Arrange
	const good = ['a', 'a/b', 'A_b-c.d/e'];
	const bad = ['', '/a', 'a/', 'a//b', '..', 'a/..', '.hidden', 'a:b', 'a?b', 'a#b'];

	// Act + Assert
	good.forEach((p) => assert.equal(isSafePath(p), true, p));
	bad.forEach((p) => assert.equal(isSafePath(p), false, p));
});
