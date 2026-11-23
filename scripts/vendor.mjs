// Copies the runtime files of the third-party libraries from node_modules
// into assets/vendor/ so the site works without any external CDN.
//
// Usage: npm install --ignore-scripts && npm run vendor
//
// The versions are defined in package.json (managed by Dependabot).
// Never edit files in assets/vendor/ by hand - re-run this script instead.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'assets', 'vendor');

// package name -> { target folder, files: [source in package, target name] }
const manifest = {
	'showdown': {
		target: 'showdown',
		files: [['dist/showdown.min.js', 'showdown.min.js'], ['LICENSE', 'LICENSE']],
	},
	'dompurify': {
		target: 'dompurify',
		files: [['dist/purify.min.js', 'purify.min.js'], ['LICENSE', 'LICENSE']],
	},
	'@highlightjs/cdn-assets': {
		target: 'highlightjs',
		files: [
			['highlight.min.js', 'highlight.min.js'],
			['styles/stackoverflow-light.min.css', 'stackoverflow-light.min.css'],
			['styles/vs2015.min.css', 'vs2015.min.css'],
			['LICENSE', 'LICENSE'],
		],
	},
	'@picocss/pico': {
		target: 'pico',
		files: [['css/pico.min.css', 'pico.min.css'], ['LICENSE.md', 'LICENSE.md']],
	},
};

const versions = {};
rmSync(vendorDir, { recursive: true, force: true });

for (const [pkg, { target, files }] of Object.entries(manifest)) {
	const pkgDir = join(root, 'node_modules', ...pkg.split('/'));
	const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
	const outDir = join(vendorDir, target);
	mkdirSync(outDir, { recursive: true });
	for (const [from, to] of files) {
		cpSync(join(pkgDir, from), join(outDir, to));
	}
	versions[pkg] = version;
	console.log(`vendored ${pkg}@${version} -> assets/vendor/${target}/`);
}

writeFileSync(join(vendorDir, 'versions.json'), JSON.stringify(versions, null, '\t') + '\n');
