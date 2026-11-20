#!/usr/bin/env node
//
// Build'i çalıştırır ve dist/ içinde hangi sayfaların değiştiğini listeler.
//
//   node tools/changed-pages.js
//
// Amaç: "yalnızca Capri 140 kW değişsin" gibi bir isteğin başka sayfalara
// sızıp sızmadığını build çıktısına bakarak görmek. Önceki dist/ yoksa
// (ilk build) tüm sayfalar "yeni" sayılır.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function snapshot() {
	const out = {};
	(function walk(dir) {
		if (!fs.existsSync(dir)) return;
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith('.html')) {
				out[path.relative(dist, p)] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
			}
		}
	})(dist);
	return out;
}

const before = snapshot();
const r = spawnSync('node', ['build.js'], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
const after = snapshot();

const changed = Object.keys(after).filter(f => before[f] !== after[f]);
const removed = Object.keys(before).filter(f => !(f in after));

console.log('\nDeğişen sayfalar (' + changed.length + '):');
changed.sort().forEach(f => console.log('  ~ ' + f + (f in before ? '' : '  (yeni)')));
removed.sort().forEach(f => console.log('  - ' + f + '  (silindi)'));
if (!changed.length && !removed.length) console.log('  (yok)');
