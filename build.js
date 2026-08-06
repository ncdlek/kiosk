#!/usr/bin/env node
//
// data/ + src/ → dist/
//
// Sıfır bağımlılık: npm paketi yok, package.json yok, `node build.js` yeter.
//
//   node build.js          üret
//   node build.js --check  yalnızca doğrula, dosya yazma
//
// Doğrulama hata bulursa build DURUR ve dist/ hiç yazılmaz. Bu kasıtlı:
// bozuk veri deploy edilmektense site son sağlam sürümde kalsın.

const fs = require('fs');
const path = require('path');

const { vehiclePage } = require('./src/vehicle-page');
const { indexPage } = require('./src/index-page');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const DIST = path.join(ROOT, 'dist');

const SECTION_TYPES = new Set([
	'models', 'specs', 'featureBanner', 'homeOptions', 'standardCards',
	'visualOptions', 'smallFeatures', 'techWide', 'mediaCards',
]);

// ---------------------------------------------------------------- yardımcı

function readJson(file) {
	const raw = fs.readFileSync(file, 'utf8');
	try {
		return JSON.parse(raw);
	} catch (e) {
		// JSON.parse'ın kendi mesajı satır numarası vermiyor; dosya adını ekle.
		throw new Error(`${path.relative(ROOT, file)}: geçersiz JSON — ${e.message}`);
	}
}

// Veri içindeki her string'i ziyaret et. Doğrulama ve yol öneki bunun üstünde.
function walkStrings(value, visit, trail = []) {
	if (typeof value === 'string') return visit(value, trail.join('.'));
	if (Array.isArray(value)) {
		value.forEach((v, i) => walkStrings(v, visit, trail.concat(i)));
	} else if (value && typeof value === 'object') {
		for (const [k, v] of Object.entries(value)) walkStrings(v, visit, trail.concat(k));
	}
}

// Araç sayfaları vehicles/ altında; oradan assets'e `../` ile çıkılır.
// Veri repo köküne göre yazılır ("assets/…"), önek burada eklenir — böylece
// aynı veri hem index (önek yok) hem araç sayfası (önek "../") için kullanılır.
function prefixAssets(value, prefix) {
	if (typeof value === 'string') {
		return value.startsWith('assets/') ? prefix + value : value;
	}
	if (Array.isArray(value)) return value.map(v => prefixAssets(v, prefix));
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = prefixAssets(v, prefix);
		return out;
	}
	return value;
}

// -------------------------------------------------------------- doğrulama

function validate(vehicles, shared) {
	const errors = [];
	const fail = (file, msg) => errors.push(`${file}: ${msg}`);

	for (const v of vehicles) {
		const file = `data/${v.slug}.json`;

		// 1) Zorunlu alanlar — eksikse yarım sayfa üretilir, kimse fark etmez.
		for (const field of ['name', 'shortName', 'heroAlt', 'pageTitle', 'gtmModel', 'startingPrice', 'co2', 'meta']) {
			if (v[field] === undefined || v[field] === null || v[field] === '') {
				fail(file, `zorunlu alan eksik: ${field}`);
			}
		}
		if (typeof v.startingPrice !== 'number') {
			fail(file, `startingPrice sayı olmalı, "${v.startingPrice}" verilmiş`);
		}

		// 2) Fiyatlar sayı ya da [sayı, sayı] — "139.600 TL" string'i geri sızmasın.
		for (const [id, o] of Object.entries(v.options || {})) {
			const p = o.price;
			const ok = typeof p === 'number'
				|| (Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number'));
			if (!ok) fail(file, `options.${id}.price sayı ya da [sayı, sayı] olmalı, ${JSON.stringify(p)} verilmiş`);
		}

		// 3) shared.tags anahtarları
		if (v.defaultTag && !shared.tags[v.defaultTag]) {
			fail(file, `defaultTag "${v.defaultTag}" shared.json tags sözlüğünde yok`);
		}

		// 4) Her sekme var mı, bölümleri tutarlı mı
		for (const t of shared.tabs) {
			const tab = v.tabs && v.tabs[t.id];
			if (!tab) { fail(file, `sekme eksik: ${t.id}`); continue; }
			if (!tab.heroImage) fail(file, `tabs.${t.id}.heroImage eksik`);

			(tab.sections || []).forEach((s, i) => {
				const where = `tabs.${t.id}.sections[${i}]`;

				if (!SECTION_TYPES.has(s.type)) {
					fail(file, `${where}.type bilinmiyor: "${s.type}"`);
					return;
				}
				if (s.titleKey && !shared.sectionTitles[s.titleKey]) {
					fail(file, `${where}.titleKey "${s.titleKey}" shared.json sectionTitles'da yok`);
				}

				// Opsiyon id'leri sözlükte var mı — sessizce kaybolan kartı engeller.
				// Referans "id" ya da {id, title} olabilir (bkz. blocks.js optionRef).
				for (const ref of s.options || []) {
					const id = typeof ref === 'string' ? ref : ref.id;
					const o = v.options && v.options[id];
					if (!o) {
						fail(file, `${where} tanımsız opsiyona referans veriyor: "${id}"`);
						continue;
					}
					if (!o.images || !o.images[t.id]) {
						fail(file, `options.${id}.images.${t.id} eksik (${where} bu sekmede kullanıyor)`);
					}
					// Görsel opsiyon kartı badge ve desc olmadan yarım görünür.
					if (s.type === 'visualOptions') {
						if (!o.badge) fail(file, `options.${id}.badge eksik (${where} görsel kart olarak kullanıyor)`);
						if (!o.desc) fail(file, `options.${id}.desc eksik (${where} görsel kart olarak kullanıyor)`);
					}
				}

				// Küçük özellik etiketleri
				for (const f of s.features || []) {
					if (f.note !== undefined) continue;
					const key = f.tag || v.defaultTag;
					if (!key) fail(file, `${where} "${f.title}" için etiket yok (tag/note ver ya da araca defaultTag ekle)`);
					else if (!shared.tags[key]) fail(file, `${where} "${f.title}" bilinmeyen tag: "${key}"`);
				}
			});
		}

		// 5) Referans edilen her görsel diskte var mı — kioskta kırık görsel olmasın.
		walkStrings(v, (s, where) => {
			if (!s.startsWith('assets/')) return;
			if (!fs.existsSync(path.join(ROOT, s))) fail(file, `görsel bulunamadı: ${s} (${where})`);
		});
	}

	return errors;
}

// ------------------------------------------------------------------- build

function main() {
	const checkOnly = process.argv.includes('--check');

	const shared = readJson(path.join(DATA, 'shared.json'));
	const vehicles = shared.vehicles.map(slug => readJson(path.join(DATA, `${slug}.json`)));

	const errors = validate(vehicles, shared);
	if (errors.length) {
		console.error(`\n✗ Doğrulama başarısız — ${errors.length} hata:\n`);
		for (const e of errors) console.error(`  ${e}`);
		console.error('\ndist/ yazılmadı, deploy olmayacak.\n');
		process.exit(1);
	}

	if (checkOnly) {
		console.log(`✓ ${vehicles.length} araç doğrulandı, hata yok.`);
		return;
	}

	// dist/ her seferinde sıfırdan: silinen bir aracın sayfası orada kalmasın.
	fs.rmSync(DIST, { recursive: true, force: true });
	fs.mkdirSync(path.join(DIST, 'vehicles'), { recursive: true });

	fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(vehicles, shared));

	for (const v of vehicles) {
		const html = vehiclePage(prefixAssets(v, '../'), shared);
		fs.writeFileSync(path.join(DIST, 'vehicles', `${v.slug}.html`), html);
	}

	fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), {
		recursive: true,
		// Font kaynakları (.otf/.ttf, ~152 MB) repoda yok ama yerelde duruyor;
		// CSS yalnızca woff2 kullanıyor, deploy'a girmesinler.
		filter: src => !/\.(otf|ttf)$/i.test(src) && !/\.DS_Store$/.test(src),
	});

	console.log(`✓ dist/ üretildi — index.html + ${vehicles.length} araç sayfası`);
}

try {
	main();
} catch (e) {
	console.error(`\n✗ ${e.message}\n`);
	process.exit(1);
}
