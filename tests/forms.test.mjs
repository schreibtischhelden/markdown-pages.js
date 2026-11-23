// Integration tests: markdown-pages.js with the vendored
// @schreibtischhelden/showdown-forms package (assets/vendor/showdown-forms/).
// The package has its own unit tests - these check that markdown-pages.js
// wires it up with the expected options (ids, data attributes) and that the
// security relevant behaviour holds for the vendored version.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(read('../assets/vendor/showdown-forms/showdown-forms.js'), sandbox);
vm.runInContext(read('../markdown-pages.js'), sandbox);
const { MarkdownPages, showdownForms } = sandbox;
MarkdownPages.setupForms(showdownForms);

const filter = (markdown) => MarkdownPages.extensions.reduce((text, ext) => ext.filter(text), markdown);
const render = (body, attributes = '') => showdownForms.render(body, { ...MarkdownPages.formsOptions, attributes, id: 'mdp-form-1' });

test('setupForms registers the extension once with the markdown-pages options', () => {
	// Act
	MarkdownPages.setupForms(showdownForms);

	// Assert
	assert.equal(MarkdownPages.extensions.length, 1);
	assert.equal(MarkdownPages.formsOptions.dataPrefix, 'mdp');
	assert.equal(MarkdownPages.formsOptions.idPrefix, 'mdp-form');
});

test('renders all supported field types with mdp attributes', () => {
	// Arrange
	const body = [
		'Name* = ___',
		'E-Mail = ___:email',
		'Message = [___]:6',
		'Contact via = (x) e-mail () phone',
		'Topics = [x] Support [] Sales',
		'Country = {Germany, (Austria), ch -> Switzerland}',
		'[[ Send ]]',
	].join('\n');

	// Act
	const html = render(body);

	// Assert
	assert.match(html, /<input type="text" id="mdp-form-1-0" name="name" data-mdp-name="name" required>/);
	assert.match(html, /<input type="email"[^>]+name="e-mail"/);
	assert.match(html, /<textarea [^>]*name="message"[^>]*rows="6"/);
	assert.match(html, /<input type="radio"[^>]+value="e-mail" checked>/);
	assert.match(html, /<input type="checkbox"[^>]+value="Support" checked>/);
	assert.match(html, /<option value="Austria" selected>Austria<\/option>/);
	assert.match(html, /<option value="ch">Switzerland<\/option>/);
	assert.match(html, /<button type="submit">Send<\/button>/);
	assert.match(html, /data-mdp-form="local"/);
});

test('escapes labels, options and unknown lines', () => {
	// Act
	const html = render([
		'Na<b>me = ___',
		'X = {a"><script>alert(1)</script>, b}',
		'Y = (x) <svg onload=alert(1)> () b',
		'<img src=x onerror=alert(1)>',
		'[[ <img src=x onerror=alert(2)> ]]',
	].join('\n'));

	// Assert
	assert.doesNotMatch(html, /<script|<svg|<img|<b>/i);
	assert.match(html, /Na&lt;b&gt;me/);
	assert.match(html, /value="a&quot;&gt;&lt;script&gt;/);
});

test('keeps only safe action URLs and methods', async (t) => {
	const cases = [
		['action="https://example.com/send"', ' action="https://example.com/send"'],
		['action="mailto:info@example.com"', ' action="mailto:info@example.com"'],
		['action="contact.php" method="get"', ' action="contact.php"'],
		['action="javascript:alert(1)"', null],
		['action="data:text/html,x"', null],
		['action="//evil.example/x"', null],
		['action="java\tscript:alert(1)"', null],
	];
	for (const [attrs, expected] of cases) {
		await t.test(attrs, () => {
			const html = render('A = ___', attrs);
			if (expected) {
				assert.ok(html.includes(expected), html);
			} else {
				assert.doesNotMatch(html, / action=/);
				assert.match(html, /data-mdp-form="local"/);
			}
		});
	}
	assert.match(render('A = ___', 'method="DELETE"'), /method="post"/);
	assert.match(render('A = ___', 'method="get"'), /method="get"/);
});

test('the extension leaves fenced code blocks untouched and numbers forms per page', () => {
	// Arrange
	const markdown = '```text\n:::form\nA = ___\n:::\n```\n\n:::form\nB = ___\n:::\n\n:::form\nC = ___\n:::\n';

	// Act
	const result = filter(markdown);

	// Assert
	assert.ok(result.includes('```text\n:::form\nA = ___\n:::\n```'));
	assert.match(result, /<form id="mdp-form-\d+"[^>]+>.*name="b"/);
	assert.equal((result.match(/<form /g) || []).length, 2);
	const ids = [...result.matchAll(/<form id="(mdp-form-\d+)"/g)].map((m) => m[1]);
	assert.notEqual(ids[0], ids[1]);
});

test('the extension handles Windows line endings', () => {
	assert.match(filter(':::form\r\nA = ___\r\n:::\r\n'), /<form /);
});
