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

const { vehiclePage, campaignOf, DESIGN_TABS } = require('./src/vehicle-page');
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

// ------------------------------------------------------------ taban dosya
//
// Aynı aracın donanımları içeriğin %85'ini paylaşıyor. Ortak kısım
// `data/<aile>.base.json`'da durur; varyant dosyası `"base": "<aile>"` yazıp
// yalnızca farkını tanımlar.
//
// Birleştirme kuralı bilerek iki maddelik:
//
//   nesneler  anahtar anahtar birleşir, varyant kazanır. `options` bir sözlük
//             olduğu için fiyat/açıklama tabanda, `packages` varyantta durabilir.
//   diziler   tamamen değişir. Yarı birleşmiş bir liste — sırası kaymış, kartı
//             tekrar etmiş — kimsenin dosyaya bakıp öngöremeyeceği bir sayfa
//             üretir. Varyant bir listeyi değiştirecekse tamamını yazar.
//
// Tek seviye: taban dosyanın kendisi base kullanamaz. İki seviye olsaydı bir
// alanın nereden geldiğini bulmak üç dosya açmayı gerektirirdi.
//
// Versiyonlar (kW) bu yüzden ayrı dosya DEĞİL, donanım dosyasının içinde
// `versions` dizisi: üçüncü bir dosya katmanı "taban → donanım → versiyon"
// zinciri kurardı. Dizide durunca bir donanımın bütün versiyonları tek ekranda
// okunur, zincir yine iki dosyada kalır. Bkz. expandVersions.

function isPlainObject(v) {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, over) {
	if (!isPlainObject(base) || !isPlainObject(over)) return over;

	const out = Object.assign({}, base);
	for (const [k, v] of Object.entries(over)) {
		out[k] = k in base ? merge(base[k], v) : v;
	}
	return out;
}

function loadVehicle(slug) {
	const file = path.join(DATA, `${slug}.json`);
	const v = readJson(file);
	if (!v.base) return v;

	const basePath = path.join(DATA, `${v.base}.base.json`);
	if (!fs.existsSync(basePath)) {
		throw new Error(`data/${slug}.json: base "${v.base}" belirtilmiş ama data/${v.base}.base.json yok`);
	}

	const base = readJson(basePath);
	if (base.base) {
		throw new Error(`data/${v.base}.base.json kendisi base kullanıyor — taban dosyalar tek seviye`);
	}

	return merge(base, v);
}

// ---------------------------------------------------------------- versiyon
//
// Donanım dosyası `versions` taşıyorsa her girdi ayrı bir sayfa olur:
//   slug = <donanım slug>-<id>   →   explorer-premium-250kw.html
//
// Girdi, donanımın (tabanla birleşmiş hâlinin) üstüne aynı `merge` kuralıyla
// biner. Versiyona göre değişecek her alan — options, tabs, emission, specs,
// models — bu yüzden ayrı kod gerektirmez: girdiye yazılır, gerisi miras.
//
// Meta alanlar (VERSION_META) içerik değil sayfanın kimliği; sayfa verisinde
// `version` altında durur ki bir gün aynı adlı bir içerik alanıyla çakışmasın.
// `versions` dizisi hiçbir sayfa verisine sızmaz.
//
// `hidePower: true`: donanımın tek versiyonu var; güç etiketi hero'da ve
// index düğmesinde gösterilmez, sayfa adı donanımın slug'ıdır.
//
// `disabled: true`: versiyonun içeriği güncel değil. Index'te düğme görünür ama
// dokunulamaz, sayfası üretilmez. Veri yerinde durur ve doğrulanmaya devam
// eder; içerik güncellenince tek satır (disabled) silinir, geri gelir.
const VERSION_META = ['id', 'power', 'price', 'campaign', 'placeholder', 'disabled', 'hidePower'];

// Versiyon girdisinin ezmemesi gereken alanlar: sayfanın kimliğini ve
// birleştirme zincirini bozarlar.
const VERSION_FORBIDDEN = ['slug', 'base', 'versions', 'trim'];

function withoutVersions(hw) {
	const out = Object.assign({}, hw);
	delete out.versions;
	return out;
}

// "Ford Explorer®" → "Ford Explorer": başlık ve GTM etiketinde ® istenmiyor
// (mevcut pageTitle/gtmModel değerlerinde de yok).
function plainName(name) {
	return String(name).replace(/[®™]/g, '').trim();
}

function expandVersions(hw) {
	return (hw.versions || []).map(entry => {
		const meta = {};
		const over = {};
		for (const [k, val] of Object.entries(entry)) {
			if (VERSION_META.includes(k)) meta[k] = val;
			// Yasak alanlar doğrulamada hata olarak raporlanır; burada atlanır ki
			// hata mesajı bile bozuk bir slug'la yazılmasın.
			else if (!VERSION_FORBIDDEN.includes(k)) over[k] = val;
		}

		// Türetilen kimlik alanları donanımınkini ezer; girdi isterse onu da ezer.
		const label = `${plainName(hw.name)} ${hw.trim}${meta.hidePower ? '' : ' ' + meta.power}`;
		const derived = {
			// hidePower: güç etiketi gösterilmeyen (tek versiyonlu) donanımın URL'sinde de yok.
			slug: meta.hidePower ? hw.slug : `${hw.slug}-${meta.id}`,
			pageTitle: `${label} Tasarım`,
			gtmModel: label,
			heroAlt: label,
			// hardware: hata mesajlarının kaynak dosyayı gösterebilmesi için.
			version: Object.assign({ hardware: hw.slug }, meta),
		};

		const page = merge(merge(withoutVersions(hw), derived), over);
		return versionSpecs(page, 'specs' in over);
	});
}

// Versiyon sayfasında teknik veri anasayfa sekmesinin en üstüne çıkar ve
// yalnızca o versiyonun değerlerini, kendi düzeninde ("stacked": sütun başlığı,
// altında büyük sayı, onun altında birim) gösterir.
//
// Değerler elle versiyona kopyalanmaz: ailenin tabanında `versionSpecs`
// sözlüğü güç etiketine göre tutulur, versiyon kendi `power`'ıyla bulur.
//
//   "versionSpecs": {
//     "columns": ["ŞEHİR İÇİ MENZİL (BİRLEŞİK)", ...],
//     "values": { "140KW": [{ "n": "619", "u": "KM" }, ...] }
//   }
//
// Aynı güç farklı donanımda farklı değer veriyorsa versiyon girdisi kendi
// `specs`'ini ({ "layout": "stacked", "columns": [...], "values": [...] })
// yazar; elle verilen kazanır. Sözlükte gücün karşılığı yoksa ya da bir değer
// null ise o hücre "—" olur ve build uyarı verir — eski iki satırlı tabloya
// düşmek, kioskta başka bir versiyonun verisini göstermek demekti.
function versionSpecs(page, explicit) {
	const out = Object.assign({}, page);

	const anasayfa = out.tabs && out.tabs.anasayfa;
	if (anasayfa && Array.isArray(anasayfa.sections)) {
		const sections = anasayfa.sections;
		const ordered = sections.filter(s => s.type === 'specs').concat(sections.filter(s => s.type !== 'specs'));
		out.tabs = Object.assign({}, out.tabs, { anasayfa: Object.assign({}, anasayfa, { sections: ordered }) });
	}

	const table = out.versionSpecs;
	delete out.versionSpecs;
	if (explicit || !table) return out;

	const values = table.values[out.version.power] || table.columns.map(() => null);
	out.specs = { layout: 'stacked', columns: table.columns, values };
	return out;
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

// Kıvrık tırnaklar sayfalar arasında karışık kullanılıyordu (aynı cümlede
// bile). Kuralı README'de anlatmak yerine burada zorunlu kılıyoruz —
// yazım tutarlılığı dikkate değil, build'e bağlı olsun.
const CURLY = { '‘': "'", '’': "'", '“': '"', '”': '"' };

function checkTypography(data, file, fail) {
	walkStrings(data, (s, where) => {
		for (const [curly, straight] of Object.entries(CURLY)) {
			if (s.includes(curly)) {
				fail(file, `${where}: kıvrık ${curly} yerine düz ${straight} kullanılmalı — ${s.slice(0, 60)}`);
			}
		}
	});
}

// Hata satırının göstereceği dosya. Versiyon sayfasının kendi dosyası yok;
// donanım dosyasını ve hangi sayfa olduğunu söyle.
function sourceFile(v) {
	return `data/${v.version.hardware}.json → ${v.slug}`;
}

function validate(vehicles, shared) {
	const errors = [];
	const fail = (file, msg) => errors.push(`${file}: ${msg}`);

	checkTypography(shared, 'data/shared.json', fail);

	for (const v of vehicles) {
		const file = sourceFile(v);

		// 1) Zorunlu alanlar — eksikse yarım sayfa üretilir, kimse fark etmez.
		for (const field of ['name', 'shortName', 'heroAlt', 'pageTitle', 'gtmModel', 'startingPrice', 'co2', 'productionPlace']) {
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
						if (!o.badge && !DESIGN_TABS.includes(t.id)) fail(file, `options.${id}.badge eksik (${where} görsel kart olarak kullanıyor)`);
						if (!o.desc) fail(file, `options.${id}.desc eksik (${where} görsel kart olarak kullanıyor)`);
					}
				}

				// Küçük özellik etiketleri
				for (const f of s.features || []) {
					if (s.hideNotes || DESIGN_TABS.includes(t.id) || f.note !== undefined) continue;
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

		// 6) Tipografi tekliği
		checkTypography(v, file, fail);

		// 7) Versiyon sayfası: hero'nun fiyat ve kampanya satırları buradan.
		checkVersionPage(v, shared, file, fail);
	}

	return errors;
}

// Versiyon sayfasının birleşmiş verisi. Hata dosya adını değil sayfa slug'ını
// da söylesin — beş versiyon aynı dosyada duruyor.
function checkVersionPage(v, shared, file, fail) {
	const ver = v.version;
	const where = `versions[${ver.id}]`;

	if (typeof ver.price !== 'number') {
		fail(file, `${where}.price sayı olmalı, ${JSON.stringify(ver.price)} verilmiş`);
	}
	for (const field of ['id', 'power']) {
		if (typeof ver[field] !== 'string' || !ver[field].trim()) fail(file, `${where}.${field} dolu bir metin olmalı`);
	}

	// Teknik veri: her sütunun bir değeri (ya da bilerek null) olmalı — kayan
	// bir dizi değerleri yanlış başlığın altına yazar.
	if (v.specs && v.specs.layout === 'stacked') {
		const { columns, values } = v.specs;
		if (!Array.isArray(values) || values.length !== columns.length) {
			fail(file, `teknik veri (versionSpecs.values["${ver.power}"]) ${columns.length} değer olmalı, ${Array.isArray(values) ? values.length : 'dizi değil'} verilmiş`);
		}
	}

	// Kampanya isteğe bağlı: yoksa hero'da kampanya bloğu hiç çıkmaz.
	if (ver.campaign === undefined) return;
	const c = campaignOf(v, shared);
	if (!c) {
		fail(file, `${where}.campaign "${ver.campaign}" ne shared.json ne araç verisindeki campaigns sözlüğünde var`);
		return;
	}
	const cw = `campaigns.${ver.campaign}`;
	if (!c.headline) fail(file, `${cw}.headline eksik`);
	if (c.infoOn !== 'headline' && c.infoOn !== 'note') {
		fail(file, `${cw}.infoOn "headline" ya da "note" olmalı, ${JSON.stringify(c.infoOn)} verilmiş`);
	}
	if (c.infoOn === 'note' && !c.note) fail(file, `${cw}.infoOn "note" ama note eksik — bilgi ikonu yerleşecek satır yok`);

	// Popup'sız bir bilgi ikonu dokununca hiçbir şey yapmaz; kioskta bu bozuk görünür.
	const p = c.popup;
	if (!isPlainObject(p) || !p.campaign || !Array.isArray(p.legal) || !p.legal.length) {
		fail(file, `${cw}.popup tanımlı olmalı: { "campaign": "...", "legal": ["..."] }`);
	}
}

// Donanım düzeyi: tekillik ve trim, sayfa açılmadan önce bilinmesi gerekenler.
// Her donanımın en az bir versiyonu olur: sayfalar yalnızca versiyondan
// üretilir. Tek versiyonlu donanım `hidePower: true` ile güç etiketini gizler.
function validateVersionDefs(hardware, fail) {
	for (const hw of hardware) {
		const file = `data/${hw.slug}.json`;

		// Index'teki satır etiketi ve versiyon sayfasının başlığı trim'den geliyor.
		if (!hw.trim) {
			fail(file, 'trim eksik — index satırının etiketi ve versiyon sayfası başlığı (trim + power) bu alandan geliyor');
		}

		if (!Array.isArray(hw.versions) || !hw.versions.length) {
			fail(file, 'versions boş olmayan bir dizi olmalı (tek versiyon için hidePower: true)');
			continue;
		}

		// hidePower'lı versiyonun sayfa adı donanımın slug'ı; ikinci bir
		// versiyon aynı sayfaya yazılırdı.
		if (hw.versions.length > 1 && hw.versions.some(v => v.hidePower)) {
			fail(file, 'hidePower yalnızca tek versiyonlu donanımda kullanılabilir — sayfa adları çakışırdı');
		}

		const seen = new Set();
		hw.versions.forEach((ver, i) => {
			const where = `versions[${i}]`;
			// id dosya adının parçası olduğu için URL'de güvenli olmalı.
			if (typeof ver.id !== 'string' || !/^[a-z0-9-]+$/.test(ver.id)) {
				fail(file, `${where}.id küçük harf, rakam ve tireden oluşmalı, ${JSON.stringify(ver.id)} verilmiş`);
			} else if (seen.has(ver.id)) {
				fail(file, `${where}.id "${ver.id}" tekrar ediyor — iki versiyon aynı sayfaya yazılırdı`);
			}
			seen.add(ver.id);

			for (const k of VERSION_FORBIDDEN) {
				if (k in ver) fail(file, `${where}.${k} versiyon girdisinde tanımlanamaz`);
			}
		});
	}
}

// Son güvence: hangi yoldan gelirse gelsin iki sayfa aynı dosyaya yazılmasın.
function validateUniqueSlugs(pages, fail) {
	const seen = new Map();
	for (const p of pages) {
		if (seen.has(p.slug)) fail(sourceFile(p), `sayfa adı "${p.slug}" ${sourceFile(seen.get(p.slug))} ile çakışıyor`);
		else seen.set(p.slug, p);
	}
}

// ------------------------------------------------------- katman uyarıları
//
// İki durum build'i durdurmaz ama listelenir:
//
//   ölü alan   donanım dosyasındaki bir alanı BÜTÜN versiyonlar eziyor.
//              Orayı düzenleyen kişi hiçbir sayfada değişiklik görmez.
//   tekrar     bir alan bütün versiyonlarda birebir aynı. Donanım seviyesine
//              taşınabilir; yerinde kalırsa bir değişiklik her kopyaya ayrı
//              ayrı yazılmak zorunda.

const isComment = k => k.startsWith('//');

function deadPaths(value, overs, trail) {
	if (!overs.length || overs.some(o => o === undefined)) return [];
	if (isPlainObject(value) && overs.every(isPlainObject)) {
		return Object.keys(value).filter(k => !isComment(k))
			.flatMap(k => deadPaths(value[k], overs.map(o => o[k]), trail.concat(k)));
	}
	return [trail.join('.')];
}

function repeatedPaths(overs, trail) {
	if (overs.length < 2 || overs.some(o => o === undefined)) return [];
	const first = JSON.stringify(overs[0]);
	if (overs.every(o => JSON.stringify(o) === first)) return [trail.join('.')];
	if (!overs.every(isPlainObject)) return [];
	const keys = new Set(overs.flatMap(o => Object.keys(o).filter(k => !isComment(k))));
	return Array.from(keys).flatMap(k => repeatedPaths(overs.map(o => o[k]), trail.concat(k)));
}

// Sayfanın sekmelerinde referans verilen opsiyon id'leri.
function referencedOptions(page) {
	const ids = new Set();
	for (const tab of Object.values(page.tabs || {})) {
		for (const s of tab.sections || []) {
			for (const ref of s.options || []) ids.add(typeof ref === 'string' ? ref : ref.id);
		}
	}
	return ids;
}

// Versiyon girdisinin içerik kısmı (kimlik alanları hariç).
function versionContent(ver) {
	return Object.fromEntries(Object.entries(ver).filter(([k]) => !VERSION_META.includes(k)));
}

function hardwareContent(raw) {
	const body = Object.assign({}, raw);
	for (const k of ['base', 'slug', 'trim', 'versions']) delete body[k];
	return body;
}

function layerWarnings(slugs) {
	const out = [];
	const families = new Map();   // base adı → { pages: [...içerik], refs: Set }

	for (const slug of slugs) {
		const file = `data/${slug}.json`;
		const raw = readJson(path.join(DATA, `${slug}.json`));
		// Devre dışı versiyon da donanım verisini kullanır (sayfası yeniden
		// açılınca); hesaba katılır.
		const overs = (raw.versions || []).map(versionContent);
		const body = hardwareContent(raw);

		for (const p of deadPaths(body, overs, [])) {
			out.push(`${file}: "${p}" hiçbir sayfaya ulaşmıyor — bütün versiyonlar eziyor`);
		}
		for (const p of repeatedPaths(overs, [])) {
			out.push(`${file}: versions[].${p} bütün versiyonlarda aynı — donanım seviyesine taşınabilir`);
		}

		const refs = new Set();
		for (const page of expandVersions(loadVehicle(slug))) referencedOptions(page).forEach(id => refs.add(id));
		const unused = Object.keys(body.options || {}).filter(id => !isComment(id) && !refs.has(id));
		for (const id of unused) out.push(`${file}: options.${id} hiçbir sayfada kullanılmıyor`);

		if (raw.base) {
			if (!families.has(raw.base)) families.set(raw.base, { pages: [], refs: new Set() });
			const fam = families.get(raw.base);
			overs.forEach(o => fam.pages.push(merge(body, o)));
			refs.forEach(id => fam.refs.add(id));
		}
	}

	// Taban: ailenin bütün sayfalarının ezdiği alan ya da kullanmadığı opsiyon.
	for (const [name, fam] of families) {
		const file = `data/${name}.base.json`;
		const base = readJson(path.join(DATA, `${name}.base.json`));
		for (const p of deadPaths(base, fam.pages, [])) {
			out.push(`${file}: "${p}" hiçbir sayfaya ulaşmıyor — bütün donanımlar eziyor`);
		}
		const unused = Object.keys(base.options || {}).filter(id => !isComment(id) && !fam.refs.has(id));
		for (const id of unused) out.push(`${file}: options.${id} hiçbir sayfada kullanılmıyor`);
	}
	return out;
}

// Yer tutucu içerik build'i durdurmaz — sayfalar önizlenebilsin — ama her
// build'in sonunda listelenir ki "geçici" fiyat sessizce kalıcı olmasın.
function placeholderWarnings(pages, shared) {
	const prices = [];
	const campaigns = new Set();
	for (const v of pages) {
		if (v.version.disabled) continue; // yayında değil; yer tutucu uyarısı gürültü olur
		if (v.version.placeholder) prices.push(`${v.slug}: fiyat yer tutucu (${v.version.price})`);
		if (v.specs && v.specs.layout === 'stacked') {
			const missing = v.specs.columns.filter((c, i) => !v.specs.values[i]);
			if (missing.length) prices.push(`${v.slug}: teknik veri eksik (${missing.join(', ')}) — sayfada "—" görünüyor`);
		}
		const c = campaignOf(v, shared);
		if (c && c.placeholder) campaigns.add(`campaigns.${v.version.campaign}: içerik yer tutucu`);
	}
	return prices.concat(Array.from(campaigns));
}

// ------------------------------------------------------------------- build

// Build edilen commit. Build ortamı SHA'yı ortam değişkeninde verir:
// Cloudflare Workers Builds WORKERS_CI_COMMIT_SHA, Cloudflare Pages
// CF_PAGES_COMMIT_SHA. Hiçbiri yoksa (yerel, GitHub Actions) git'ten okunur.
// O da olmazsa "unknown" — build.txt'in eksikliği build'i durdurmasın.
function buildSha() {
	const env = process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA;
	if (env) return env;
	try {
		return require('child_process')
			.execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'unknown';
	}
}

function main() {
	const checkOnly = process.argv.includes('--check');

	const shared = readJson(path.join(DATA, 'shared.json'));
	// İki liste, tek fark: index'te görünüp görünmemek. Önizleme araçlarının
	// sayfası normal üretilir ve aynı doğrulamadan geçer — yarım kalmış bir
	// sayfanın "nasıl olsa listede yok" diye kaçması mümkün olmasın.
	//
	// Doğrulama birleştirme SONRASI veri üzerinde çalışır: tabandan gelen bir
	// alanın eksikliği de varyantın kendi hatası kadar görünür olsun. Versiyon
	// sayfaları da öyle — donanım + versiyon birleşmiş hâliyle denetlenir.
	const listedHw = shared.vehicles.map(loadVehicle);
	const previewHw = (shared.previewVehicles || []).map(loadVehicle);
	const hardware = listedHw.concat(previewHw);

	const errors = [];
	const fail = (file, msg) => errors.push(`${file}: ${msg}`);
	validateVersionDefs(hardware, fail);

	// Sayfalar yalnızca versiyonlardan üretilir; donanımın kendi sayfası yok.
	const vehicles = errors.length ? [] : hardware.flatMap(expandVersions);
	validateUniqueSlugs(vehicles, fail);

	errors.push(...validate(vehicles, shared));
	if (errors.length) {
		console.error(`\n✗ Doğrulama başarısız — ${errors.length} hata:\n`);
		for (const e of errors) console.error(`  ${e}`);
		console.error('\ndist/ yazılmadı, deploy olmayacak.\n');
		process.exit(1);
	}

	const warnings = placeholderWarnings(vehicles, shared);
	const layers = layerWarnings(hardware.map(hw => hw.slug));
	const printWarnings = () => {
		if (warnings.length) {
			console.warn(`\n⚠ ${warnings.length} yer tutucu — içerik gelince güncellenmeli:\n`);
			for (const w of warnings) console.warn(`  ${w}`);
		}
		if (layers.length) {
			console.warn(`\n⚠ ${layers.length} katman uyarısı — veri tekrar ediyor ya da ölü:\n`);
			for (const w of layers) console.warn(`  ${w}`);
		}
		if (warnings.length || layers.length) console.warn('');
	};

	if (checkOnly) {
		console.log(`✓ ${vehicles.length} sayfa doğrulandı, hata yok.`);
		printWarnings();
		return;
	}

	// dist/ her seferinde sıfırdan: silinen bir aracın sayfası orada kalmasın.
	fs.rmSync(DIST, { recursive: true, force: true });
	fs.mkdirSync(path.join(DIST, 'vehicles'), { recursive: true });

	// Index donanım listesini versiyon sayfalarıyla birlikte alır: düğmeler
	// doğrudan versiyon sayfasına gider, slug kuralı tek yerde (expandVersions).
	const listed = listedHw.map(hw => ({ page: withoutVersions(hw), versions: expandVersions(hw) }));
	fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(listed, shared));

	// Devre dışı versiyonun sayfası yazılmaz: index'te dokunulamıyorsa doğrudan
	// URL ile de açılmasın (içerik güncel değil).
	const published = vehicles.filter(v => !v.version.disabled);
	for (const v of published) {
		const html = vehiclePage(prefixAssets(v, '../'), shared);
		fs.writeFileSync(path.join(DIST, 'vehicles', `${v.slug}.html`), html);
	}

	fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), {
		recursive: true,
		// Font kaynakları (.otf/.ttf, ~152 MB) repoda yok ama yerelde duruyor;
		// CSS yalnızca woff2 kullanıyor, deploy'a girmesinler.
		filter: src => !/\.(otf|ttf)$/i.test(src) && !/\.DS_Store$/.test(src),
	});

	// Yayındaki sürümün hangi commit olduğunu dışarıdan okunabilir kılar.
	// deploy.sh bunu yoklayarak push edilen commit'in gerçekten yayına
	// çıktığını anlar; Cloudflare'a API token'ı vermek gerekmez.
	fs.writeFileSync(path.join(DIST, 'build.txt'), `${buildSha()}\n`);

	console.log(`✓ dist/ üretildi — index.html + ${published.length} araç sayfası`);
	const off = vehicles.filter(v => v.version.disabled).map(v => v.slug);
	if (off.length) console.log(`  devre dışı (sayfa üretilmedi): ${off.join(', ')}`);
	printWarnings();
}

// Testler fonksiyonları require eder; build yalnızca doğrudan çalıştırılınca.
if (require.main === module) {
	try {
		main();
	} catch (e) {
		console.error(`\n✗ ${e.message}\n`);
		process.exit(1);
	}
}

module.exports = { merge, expandVersions, validateVersionDefs, validateUniqueSlugs, deadPaths, repeatedPaths, sourceFile };
