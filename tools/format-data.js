#!/usr/bin/env node
//
// data/*.json dosyalarını tek bir biçime getirir.
//
//   node tools/format-data.js           dosyaları yeniden yazar
//   node tools/format-data.js --check   yalnızca denetler; biçimsiz dosya varsa çıkış kodu 1
//
// Kural tek: bir değer (anahtarıyla birlikte) 100 karaktere sığıyorsa tek
// satırda, sığmıyorsa her eleman kendi satırında. Girinti 2 boşluk. Elle
// hizalama yok — kim düzenlerse düzenlesin aynı dosya aynı byte'ları üretir
// ve git diff'te yalnızca içerik değişikliği görünür.

const fs = require('fs');
const path = require('path');

const WIDTH = 100;
const INDENT = '  ';

function isPlainObject(v) {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Tek satırlık gösterim: { "a": 1, "b": [1, 2] }
function inline(v) {
	if (Array.isArray(v)) return v.length ? `[${v.map(inline).join(', ')}]` : '[]';
	if (isPlainObject(v)) {
		const entries = Object.entries(v);
		return entries.length ? `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}';
	}
	return JSON.stringify(v);
}

// prefix: aynı satırda değerden önce gelen metin (girinti + anahtar).
function render(v, depth, prefix) {
	const one = inline(v);
	if (prefix.length + one.length <= WIDTH || (!Array.isArray(v) && !isPlainObject(v))) return one;

	const pad = INDENT.repeat(depth + 1);
	const close = INDENT.repeat(depth);
	if (Array.isArray(v)) {
		return `[\n${v.map(x => pad + render(x, depth + 1, pad)).join(',\n')}\n${close}]`;
	}
	const lines = Object.entries(v).map(([k, x]) => {
		const head = `${pad}${JSON.stringify(k)}: `;
		return head + render(x, depth + 1, head);
	});
	return `{\n${lines.join(',\n')}\n${close}}`;
}

function format(value) {
	return render(value, 0, '') + '\n';
}

function dataFiles(root) {
	const dir = path.join(root, 'data');
	return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => path.join(dir, f));
}

// Biçimi bozuk dosyaların listesi (göreli yol).
function unformatted(root) {
	return dataFiles(root).filter(file => {
		const raw = fs.readFileSync(file, 'utf8');
		return raw !== format(JSON.parse(raw));
	}).map(file => path.relative(root, file));
}

if (require.main === module) {
	const root = path.join(__dirname, '..');
	if (process.argv.includes('--check')) {
		const bad = unformatted(root);
		if (bad.length) {
			console.error(`✗ Biçimsiz veri dosyası: ${bad.join(', ')}\n  Düzeltmek için: node tools/format-data.js`);
			process.exit(1);
		}
		console.log('✓ Veri dosyaları biçimli.');
	} else {
		for (const file of dataFiles(root)) {
			fs.writeFileSync(file, format(JSON.parse(fs.readFileSync(file, 'utf8'))));
		}
		console.log('✓ data/*.json biçimlendi.');
	}
}

module.exports = { format, unformatted };
