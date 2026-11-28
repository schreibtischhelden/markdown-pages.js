// Tests for the extended syntax of markdown-pages.js (footnotes, definition
// lists, highlight, sub- and superscript, custom heading ids) with the
// vendored Showdown. DOMPurify needs a DOM and is not part of these tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(read('../assets/vendor/showdown/showdown.min.js'), sandbox);
vm.runInContext(read('../markdown-pages.js'), sandbox);
const { MarkdownPages, showdown } = sandbox;

function convert(markdown) {
	const converter = new showdown.Converter({ extensions: MarkdownPages.extendedSyntax });
	Object.keys(MarkdownPages.showdownOptions).forEach((key) => converter.setOption(key, MarkdownPages.showdownOptions[key]));
	return converter.makeHtml(markdown);
}

test('highlight, subscript and superscript', async (t) => {
	const cases = [
		['I need to ==highlight== this', '<p>I need to <mark>highlight</mark> this</p>'],
		['==two words==', '<p><mark>two words</mark></p>'],
		['H~2~O', '<p>H<sub>2</sub>O</p>'],
		['X^2^', '<p>X<sup>2</sup></p>'],
		['~~strike~~', '<p><del>strike</del></p>'],
		['a == b == c', '<p>a == b == c</p>'],
		['about ~5 to ~10 minutes', '<p>about ~5 to ~10 minutes</p>'],
		['/~user/~x and 2^10', '<p>/~user/~x and 2^10</p>'],
		['`a==b==c` and `H~2~O`', '<p><code>a==b==c</code> and <code>H~2~O</code></p>'],
	];
	for (const [markdown, expected] of cases) {
		await t.test(markdown, () => {
			// Act + Assert
			assert.equal(convert(markdown), expected);
		});
	}
});

test('highlight is not applied in code blocks', () => {
	// Act
	const html = convert('```\n==x== H~2~O X^2^\n```');

	// Assert
	assert.match(html, /<code>==x== H~2~O X\^2\^\n<\/code>/);
});

test('custom heading ids with {#id}', () => {
	// Act + Assert
	assert.equal(convert('### My Great Heading {#custom-id}'), '<h3 id="custom-id">My Great Heading</h3>');
	assert.equal(convert('## Quick start'), '<h2 id="quick-start">Quick start</h2>');
});

test('footnotes are numbered in order of use and listed at the end', () => {
	// Arrange
	const markdown = [
		'A[^note] and B[^1] and A again[^note].',
		'',
		'[^1]: First.',
		'[^note]: The **note**.',
		'',
		'    Second paragraph.',
	].join('\n');

	// Act
	const html = convert(markdown);

	// Assert
	assert.match(html, /A<sup class="footnote-ref"><a href="#fn-note" id="fnref-note">1<\/a><\/sup>/);
	assert.match(html, /B<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">2<\/a><\/sup>/);
	assert.match(html, /again<sup class="footnote-ref"><a href="#fn-note" id="fnref-note-2">1<\/a><\/sup>/);
	assert.match(html, /<section class="footnotes"[^>]*><hr>\n<ol>\n<li><p><span id="fn-note"><\/span>The <strong>note<\/strong>.<\/p>\n<p>Second paragraph. <a href="#fnref-note" class="footnote-backref"/);
	assert.match(html, /<li><p><span id="fn-1"><\/span>First\. <a href="#fnref-1"/);
	assert.ok(html.indexOf('fn-note') < html.indexOf('id="fn-1"'), 'notes in order of first use');
});

test('footnotes without definition and in code stay as text', () => {
	// Act
	const html = convert('A[^x] and `[^1]`\n\n```\n[^1]: code\n```\n\n[^1]: Note.');

	// Assert
	assert.match(html, /A\[\^x\] and <code>\[\^1\]<\/code>/);
	assert.match(html, /<code>\[\^1\]: code\n<\/code>/);
	assert.doesNotMatch(html, /class="footnotes"/);
});

test('footnote ids keep only safe characters', () => {
	// Act
	const html = convert('A[^a"b]\n\n[^a"b]: Note.');

	// Assert
	assert.match(html, /href="#fn-a-b" id="fnref-a-b"/);
	assert.doesNotMatch(html, /"b"/);
});

test('definition lists', () => {
	// Arrange
	const markdown = 'First Term\n: The **first** definition.\n\nSecond Term\n: One.\n: Two.';

	// Act
	const html = convert(markdown);

	// Assert
	assert.equal(html, [
		'<dl>',
		'<dt>First Term</dt>',
		'<dd>The <strong>first</strong> definition.</dd>',
		'</dl>',
		'<dl>',
		'<dt>Second Term</dt>',
		'<dd>One.</dd>',
		'<dd>Two.</dd>',
		'</dl>',
	].join('\n'));
});

test('a colon line without a term, lists and headings are not definitions', () => {
	// Act + Assert
	assert.equal(convert(': not a definition'), '<p>: not a definition</p>');
	assert.doesNotMatch(convert('- item\n: x'), /<dl>/);
	assert.doesNotMatch(convert('```\nTerm\n: in code\n```'), /<dl>/);
});

test('without simpleLineBreaks definition lists still work', () => {
	// Arrange
	const converter = new showdown.Converter({ extensions: MarkdownPages.extendedSyntax });

	// Act
	const html = converter.makeHtml('Term\n: Definition');

	// Assert
	assert.equal(html, '<dl>\n<dt>Term</dt>\n<dd>Definition</dd>\n</dl>');
});

test('long unusual input is converted quickly (no ReDoS)', () => {
	// Arrange
	const [lang, output] = MarkdownPages.extendedSyntax;
	const n = 50000;
	const inputs = [
		() => lang.filter('a[^1]\n\n[^1]: x' + ' '.repeat(n) + 'y'),
		() => lang.filter('[^'.repeat(n)),
		() => output.filter('<'.repeat(n)),
		() => output.filter('<p>' + '~a'.repeat(n) + '</p>'),
	];

	// Act
	const start = Date.now();
	inputs.forEach((run) => run());

	// Assert
	assert.ok(Date.now() - start < 1000, `took ${Date.now() - start} ms`);
});
