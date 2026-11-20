#!/usr/bin/env node
//
// Build'i çalıştırır ve dist/ içinde hangi sayfaların değiştiğini listeler.
//
//   node tools/changed-pages.js
//
// Amaç: "yalnızca Capri 140 kW değişsin" gibi bir isteğin başka sayfalara
// sızıp sızmadığını build çıktısına bakarak görmek. Önceki dist/ yoksa
// (ilk build) tüm sayfalar "yeni" sayılır.
//
// Yalnızca HTML'e bakmak yetmez: aynı adla değiştirilen bir görsel HTML'i
// değiştirmez ama sayfayı değiştirir. Bu yüzden dist/ altındaki her dosya
// karşılaştırılır; değişen bir görsel onu kullanan sayfaları, değişen CSS/JS
// bütün sayfaları etkilenmiş sayar.
//
// Dikkat: karşılaştırma diskteki önceki dist/ ile yapılır. O build başka bir
// daldan ya da eski bir commit'ten kaldıysa liste o farkı da içerir — emin
// olmak için değişiklikten önce bir kez `node build.js` çalıştırın.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// build.txt her build'de değişir (commit SHA); sayfa içeriği değil.
const IGNORED = new Set(['build.txt']);

function snapshot() {
	const out = {};
	(function walk(dir) {
		if (!fs.existsSync(dir)) return;
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			const rel = path.relative(dist, p).split(path.sep).join('/');
			if (e.isDirectory()) walk(p);
			else if (!IGNORED.has(rel)) out[rel] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
		}
	})(dist);
	return out;
}

const before = snapshot();
const r = spawnSync(process.execPath, ['build.js'], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
const after = snapshot();

const isPage = f => f.endsWith('.html');
const pages = Object.keys(after).filter(isPage).sort();
const changed = Object.keys(after).filter(f => before[f] !== after[f]);
const removed = Object.keys(before).filter(f => !(f in after));

// Sayfa → neden değişti
const reasons = new Map();
const mark = (page, why) => {
	if (!reasons.has(page)) reasons.set(page, []);
	reasons.get(page).push(why);
};

for (const f of changed) {
	if (isPage(f)) mark(f, f in before ? 'HTML' : 'yeni');
	else if (/\.(css|js)$/.test(f)) pages.forEach(p => mark(p, f));
	else {
		// Görsel: onu kaynak gösteren sayfalar. Araç sayfaları "../assets/…",
		// index "assets/…" yazar; ikisi de bu alt dizeyi içerir.
		for (const p of pages) {
			if (fs.readFileSync(path.join(dist, p), 'utf8').includes(f)) mark(p, f);
		}
	}
}

const list = Array.from(reasons.keys()).sort();
console.log(`\nDeğişen sayfalar (${list.length}):`);
for (const p of list) console.log(`  ~ ${p}  (${reasons.get(p).join(', ')})`);
for (const f of removed.sort()) console.log(`  - ${f}  (silindi)`);
if (!list.length && !removed.length) console.log('  (yok)');
