// Unit tests for the forms extension of markdown-pages.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../markdown-pages.js', import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { renderForm, formsExtension } = sandbox.MarkdownPages;

test('renders all supported field types', () => {
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
	const html = renderForm('', body);

	// Assert
	assert.match(html, /<input type="text" id="[^"]+" name="name" data-mdp-name="name" required>/);
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
	const html = renderForm('', [
		'Na<b>me = ___',
		'X = {a"><script>alert(1)</script>, b}',
		'Y = (x) <svg onload=alert(1)> () b',
		'<img src=x onerror=alert(1)>',
		'[[ <img src=x onerror=alert(2)> ]]',
	].join('\n'));

	// Assert
	assert.doesNotMatch(html, /<script|<svg|<img|<b>/);
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
			const html = renderForm(attrs, 'A = ___');
			if (expected) {
				assert.ok(html.includes(expected), html);
			} else {
				assert.doesNotMatch(html, / action=/);
				assert.match(html, /data-mdp-form="local"/);
			}
		});
	}
	assert.match(renderForm('method="DELETE"', 'A = ___'), /method="post"/);
	assert.match(renderForm('method="get"', 'A = ___'), /method="get"/);
});

test('the Showdown extension leaves fenced code blocks untouched', () => {
	// Arrange
	const markdown = '```text\n:::form\nA = ___\n:::\n```\n\n:::form\nB = ___\n:::\n';

	// Act
	const result = formsExtension.filter(markdown);

	// Assert
	assert.ok(result.includes('```text\n:::form\nA = ___\n:::\n```'));
	assert.match(result, /<form [^>]+>.*name="b"/);
	assert.equal((result.match(/<form /g) || []).length, 1);
});

test('the Showdown extension handles Windows line endings', () => {
	const result = formsExtension.filter(':::form\r\nA = ___\r\n:::\r\n');
	assert.match(result, /<form /);
});
