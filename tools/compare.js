#!/usr/bin/env node
//
// Üretilen HTML'i elle yazılmış HTML ile karşılaştırır.
//
//   node tools/compare.js vehicles/capri.html dist/vehicles/capri.html
//
// Planın kabul kriteri: "boşluk normalizasyonu sonrası birebir aynı".
// Bu araç normalizasyonu yapıp farkı satır satır gösterir; kalan her fark
// ya kasıtlı bir düzeltme (fiyat, tırnak birleştirme) ya da bir hatadır.
//
// Normalize edilenler — render'ı DEĞİŞTİRMEYEN farklar:
//   • girinti / satır sonu / etiketler arası boşluk
//   • HTML yorumları
//   • attribute sırası           (class="a" id="b"  ==  id="b" class="a")
//   • karakter referansları      (B&amp;O  ==  B&O)
//
// Geçici bir doğrulama aracı: geçiş bitip elle yazılmış HTML git'ten
// çıkınca (plan §6, adım 7) karşılaştıracak bir referans kalmaz.

const fs = require('fs');

function decodeEntities(s) {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&'); // en son: &amp;lt; gibi çift kaçışları bozmasın
}

// <tag a="1" b>  →  tag a="1" b   (attribute'lar alfabetik)
function canonicalTag(tag) {
	const self = /\/>$/.test(tag);
	const inner = tag.replace(/^<\/?/, '').replace(/\/?>$/, '');
	const close = /^<\//.test(tag) ? '/' : '';

	const m = inner.match(/^([a-zA-Z0-9!-]+)([\s\S]*)$/);
	if (!m) return `<${close}${inner}>`;

	const [, name, rest] = m;
	const attrs = [];
	const re = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
	let a;
	while ((a = re.exec(rest)) !== null) {
		const key = a[1];
		const val = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4];
		// class listesini de sırala: sınıf sırası render'ı etkilemez
		const norm = val === undefined
			? key
			: `${key}="${decodeEntities(val).replace(/\s+/g, ' ').trim()}"`;
		attrs.push(norm);
	}
	attrs.sort();
	return `<${close}${name.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}${self ? '/' : ''}>`;
}

function normalize(html) {
	const out = [];
	const stripped = html.replace(/<!--[\s\S]*?-->/g, '');

	for (const token of stripped.match(/<[^>]*>|[^<]+/g) || []) {
		if (token.startsWith('<')) {
			out.push(canonicalTag(token));
		} else {
			const text = decodeEntities(token).replace(/\s+/g, ' ').trim();
			if (text) out.push(text);
		}
	}
	return out;
}

function main() {
	const [a, b] = process.argv.slice(2);
	if (!a || !b) {
		console.error('kullanım: node tools/compare.js <eski.html> <yeni.html>');
		process.exit(2);
	}

	const oldTokens = normalize(fs.readFileSync(a, 'utf8'));
	const newTokens = normalize(fs.readFileSync(b, 'utf8'));

	// Basit LCS tabanlı fark. Dosyalar birkaç bin token; O(n·m) fazlasıyla yeterli.
	const n = oldTokens.length, m = newTokens.length;
	const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i][j] = oldTokens[i] === newTokens[j]
				? lcs[i + 1][j + 1] + 1
				: Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}

	const diffs = [];
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (oldTokens[i] === newTokens[j]) { i++; j++; }
		else if (lcs[i + 1][j] >= lcs[i][j + 1]) diffs.push(['-', oldTokens[i++]]);
		else diffs.push(['+', newTokens[j++]]);
	}
	while (i < n) diffs.push(['-', oldTokens[i++]]);
	while (j < m) diffs.push(['+', newTokens[j++]]);

	if (!diffs.length) {
		console.log(`✓ ${b} — ${a} ile normalize edilmiş halde birebir aynı (${n} token)`);
		return;
	}

	console.log(`${a} → ${b}`);
	console.log(`  ${n} token → ${m} token, ${diffs.length} fark\n`);
	for (const [sign, tok] of diffs) {
		console.log(`  ${sign} ${tok}`);
	}
	process.exitCode = 1;
}

main();
