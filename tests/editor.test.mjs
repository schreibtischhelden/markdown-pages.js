// Integration tests: MarkdownPages.editor() with the vendored
// @schreibtischhelden/markdown-editor package (assets/vendor/markdown-editor/).
// The package has its own unit tests - these check that markdown-pages.js
// passes the site renderer and the defaults on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

function load({ withEditor }) {
	const sandbox = { URLSearchParams, URL };
	vm.createContext(sandbox);
	if (withEditor) {
		vm.runInContext(read('../assets/vendor/markdown-editor/markdown-editor.js'), sandbox);
	}
	vm.runInContext(read('../markdown-pages.js'), sandbox);
	return sandbox;
}

test('the vendored package is loadable and exposes the editor API', () => {
	// Act
	const { markdownEditor } = load({ withEditor: true });

	// Assert
	assert.equal(typeof markdownEditor, 'function');
	assert.equal(typeof markdownEditor.resolveOptions, 'function');
	assert.ok(markdownEditor.defaultToolbar.includes('bold'));
});

test('editor() explains which file is missing', () => {
	// Arrange
	const { MarkdownPages } = load({ withEditor: false });

	// Act + Assert
	assert.throws(() => MarkdownPages.editor({}), /assets\/vendor\/markdown-editor\/markdown-editor\.js/);
});

test('editor() merges editorOptions and uses the site renderer', async () => {
	// Arrange
	const sandbox = load({ withEditor: true });
	let received;
	sandbox.markdownEditor = (target, options) => {
		received = options;
		return {};
	};
	const { MarkdownPages } = sandbox;
	MarkdownPages.editorOptions = { toolbar: ['bold'], fileName: 'default.md' };

	// Act
	MarkdownPages.editor({}, { fileName: 'imprint.md' });

	// Assert
	assert.deepEqual([...received.toolbar], ['bold']);
	assert.equal(received.fileName, 'imprint.md', 'per-editor options win over editorOptions');
	assert.equal(typeof received.render, 'function');
	assert.equal(typeof received.afterRender, 'function');
	assert.equal(MarkdownPages.editorOptions.render, undefined, 'the defaults are not changed');
});

test('editor() keeps an own render function and still calls an own afterRender', async () => {
	// Arrange
	const sandbox = load({ withEditor: true });
	let received;
	sandbox.markdownEditor = (target, options) => {
		received = options;
		return {};
	};
	const render = () => '<p>x</p>';
	let calledWith = null;
	const element = { querySelectorAll: () => [] };

	// Act
	sandbox.MarkdownPages.editor({}, { render, afterRender: (el) => { calledWith = el; } });
	await received.afterRender(element, {});

	// Assert
	assert.equal(received.render, render);
	assert.equal(calledWith, element);
});
