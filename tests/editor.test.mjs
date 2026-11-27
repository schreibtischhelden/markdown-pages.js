// Unit tests for the pure text commands of markdown-pages-editor.js.
// Run with: npm test   (Node.js >= 20, no dependencies needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sandbox = { URLSearchParams, URL };
vm.createContext(sandbox);
vm.runInContext(read('../markdown-pages.js'), sandbox);
vm.runInContext(read('../markdown-pages-editor.js'), sandbox);
const editor = sandbox.MarkdownPages.editor;
const { commands, applyEdit, safeFileName } = editor;

/**
 * Runs a command on text with the selection marked by "|" (cursor) or
 * "[" and "]" (selection) and returns the result in the same notation.
 */
function run(name, marked) {
	let value = marked;
	let start;
	let end;
	if (value.includes('[')) {
		start = value.indexOf('[');
		value = value.replace('[', '');
		end = value.indexOf(']');
		value = value.replace(']', '');
	} else {
		start = end = value.indexOf('|');
		value = value.replace('|', '');
	}
	const edit = commands[name]({ value, start, end });
	const result = applyEdit(value, edit);
	if (edit.start === edit.end) {
		return result.slice(0, edit.start) + '|' + result.slice(edit.start);
	}
	return result.slice(0, edit.start) + '[' + result.slice(edit.start, edit.end) + ']' + result.slice(edit.end);
}

test('bold and italic wrap the selection and toggle it off again', async (t) => {
	const cases = [
		['bold', 'a [word] b', 'a **[word]** b'],
		['bold', 'a **[word]** b', 'a [word] b'],
		['bold', 'a [**word**] b', 'a [word] b'],
		['bold', 'a | b', 'a **[bold text]** b'],
		['italic', '[x]', '_[x]_'],
		['italic', '_[x]_', '[x]'],
	];
	for (const [name, input, expected] of cases) {
		await t.test(`${name}: ${input}`, () => {
			// Act + Assert
			assert.equal(run(name, input), expected);
		});
	}
});

test('code is inline for one line and fenced for several lines', () => {
	// Act + Assert
	assert.equal(run('code', 'call [fn()] now'), 'call `[fn()]` now');
	assert.equal(run('code', '[a = 1\nb = 2]'), '```\n[a = 1\nb = 2]\n```');
});

test('list prefixes toggle on all selected lines', async (t) => {
	const cases = [
		['list', '[one\ntwo]', '[- one\n- two]'],
		['list', '[- one\n- two]', '[one\ntwo]'],
		['list', 'on|e', '- one|'],
		['quote', 'x\n[y]\nz', 'x\n[> y]\nz'],
		['numbered', '[a\nb\nc]', '[1. a\n2. b\n3. c]'],
		['numbered', '[1. a\n2. b]', '[a\nb]'],
		// a selection that ends at the start of a line does not include that line
		['list', '[a\n]b', '[- a]\nb'],
	];
	for (const [name, input, expected] of cases) {
		await t.test(`${name}: ${JSON.stringify(input)}`, () => {
			// Act + Assert
			assert.equal(run(name, input), expected);
		});
	}
});

test('heading cycles through none, ## and ###', () => {
	// Act + Assert
	assert.equal(run('heading', 'Ti|tle'), '## Title|');
	assert.equal(run('heading', '## Ti|tle'), '### Title|');
	assert.equal(run('heading', '### Ti|tle'), 'Title|');
	assert.equal(run('heading', '# Ti|tle'), '## Title|');
});

test('link selects the part that is still missing', () => {
	// Act + Assert
	assert.equal(run('link', 'see [docs]'), 'see [docs]([https://])');
	assert.equal(run('link', '|'), '[link text]([https://])');
	assert.equal(run('link', '[https://example.org]'), '[[link text]](https://example.org)');
	assert.equal(run('link', '[?page=menu]'), '[[link text]](?page=menu)');
});

test('safeFileName keeps only a plain .md file name', async (t) => {
	const cases = [
		['impressum.md', 'impressum.md'],
		['impressum', 'impressum.md'],
		['pages/about.md', 'about.md'],
		['..\\..\\evil.md', 'evil.md'],
		['.hidden', 'hidden.md'],
		['a<b>:c?.md', 'abc.md'],
		['', 'page.md'],
		[undefined, 'page.md'],
		['notes.markdown', 'notes.markdown'],
	];
	for (const [input, expected] of cases) {
		await t.test(String(input), () => {
			// Act + Assert
			assert.equal(safeFileName(input), expected);
		});
	}
});
