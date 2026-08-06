// Her HTML bloğu için bir saf fonksiyon.
//
// Hiçbiri global duruma bakmaz; ihtiyaç duyduğu her şeyi parametreyle alır.
// Sonuç: tek tek denenebilir, çıktı deterministik.
//
// Ürettikleri class'lar `assets/css/style.css`'in beklediğiyle birebir aynı
// olmak zorunda — CSS bu refactor'da hiç değişmiyor.

const { formatPrice, txt, attr, text, richAttr, plain, indent } = require('./format');

// --- Küçük yardımcılar -------------------------------------------------

// Başlıklı bölüm sarmalayıcısı: <section><h2 class="section-title">…</h2> …
function titled(title, body) {
	return `<section>
  <h2 class="section-title">${txt(title)}</h2>

${indent(body, 2)}
</section>`;
}

// Sekmeler opsiyonlara ya id ile ya da {id, title} ile referans verir.
// title yalnızca aynı ürünün sekmeye göre farklı yazıldığı yerde gerekiyor
// (Puma: Anasayfa'da "16\" Çelik Stepne", İç/Dış Tasarım'da "Stepne").
// Fiyat her hâlükârda tek yerden — override yalnızca görünen başlığı değiştirir.
function optionRef(ref) {
	return typeof ref === 'string' ? { id: ref } : ref;
}

// Aynı opsiyonun sekmeye göre farklı fotoğrafı var; bu kasıtlı (bkz. plan §4).
// Tekilleştirilen şey fiyat ve metin, görsel değil.
function resolveOption(options, ref, tab) {
	const r = optionRef(ref);
	const o = options[r.id];
	return Object.assign({}, o, { image: o.images[tab] }, r.title ? { title: r.title } : {});
}

// --- Anasayfa: model kartları -----------------------------------------

// Capri düzeni: tek paket, renk swatch'ları + kayan carousel.
// Slide sırası = swatch sırası; seçili slide .is-center alır.
function modelsCarousel(models) {
	const pkg = models.packages[0];
	// Carousel slide alt'ları paket adını değil araç adını taşır
	// ("Capri Düş Mavisi"): tek paketli sayfada paket adı bilgi vermiyor.
	const prefix = pkg.imageAltPrefix || pkg.name;

	const dots = pkg.colors.map((c, i) => `<button class="color-btn js-carousel-btn${i === pkg.activeColor ? ' active' : ''}" type="button" data-index="${i}">
  <img src="${attr(c.swatch)}" alt="${plain(c.label)}">
</button>`).join('\n');

	const slides = pkg.colors.map((c, i) =>
		`<div class="carousel__slide${i === pkg.activeColor ? ' is-center' : ''}"><img class="model-img" src="${attr(c.image)}" alt="${plain(prefix + ' ' + c.label)}"></div>`
	).join('\n');

	return `<section class="models models--single">
  <article class="model-card">
    <h2 class="model-name">${txt(pkg.name)}</h2>

    <div class="color-dots">
${indent(dots, 6)}
    </div>

    <div class="carousel js-carousel">
      <div class="carousel__track js-carousel__track">
${indent(slides, 8)}
      </div>
    </div>
  </article>
</section>`;
}

// Puma / Explorer düzeni: iki paket yan yana, her kartta tek görsel.
// script.js buton üzerindeki data-image'i okuyup .js-model-img'i değiştirir.
function modelsSwitcher(models) {
	const cards = models.packages.map(pkg => {
		const dots = pkg.colors.map((c, i) => `<button class="color-btn${i === pkg.activeColor ? ' active' : ''}" type="button" data-image="${attr(c.image)}" data-alt="${plain(pkg.name + ' ' + c.label)}">
  <img src="${attr(c.swatch)}" alt="${plain(c.label)}">
</button>`).join('\n\n');

		const active = pkg.colors[pkg.activeColor];

		return `<article class="model-card js-color-switcher">
  <h2 class="model-name">${txt(pkg.name)}</h2>

  <div class="color-dots">
${indent(dots, 4)}
  </div>

  <img class="model-img js-model-img" src="${attr(active.image)}" alt="${plain(pkg.name)}">
</article>`;
	}).join('\n\n');

	return `<section class="models">
${indent(cards, 2)}
</section>`;
}

function models(m) {
	return m.layout === 'carousel' ? modelsCarousel(m) : modelsSwitcher(m);
}

// --- Anasayfa: teknik veri satırları ----------------------------------

// Tek satırlı düzen (Capri, Puma): dört etiket/değer çifti.
function specsSimple(specs) {
	const rows = specs.rows.map(r => `<div class="spec">
  <span class="spec-label">${txt(r.label)}</span>
  <span class="spec-value">${txt(r.value)}</span>
</div>`).join('\n');

	return `<section class="specs-section">
  <div class="specs">
${indent(rows, 4)}
  </div>
</section>`;
}

// Değer segmentleri: [{n:"140",u:"kW"},{n:"190",u:"PS"}] →
//   140 <span class="unit">kW</span> <span class="sep">/</span> 190 <span class="unit">PS</span>
function dualValue(segments) {
	return segments
		.map(s => `${txt(s.n)} <span class="unit">${txt(s.u)}</span>`)
		.join(' <span class="sep">/</span> ');
}

// İki menzil satırlı düzen (Explorer): üstte sütun başlıkları, altta
// "Standart Menzil" / "Uzun Menzil" satırları, aralarında ayraç.
function specsDual(specs) {
	const head = ['<span class="specs--dual__spacer"></span>']
		.concat(specs.columns.map(c => `<span class="spec-label">${txt(c)}</span>`))
		.join('\n');

	const rows = specs.rows.map(r => {
		const values = r.values.map(v => `<span class="spec-value">${dualValue(v)}</span>`).join('\n');
		return `<div class="specs--dual__row">
  <span class="specs--dual__row-label">${txt(r.label)}</span>
${indent(values, 2)}
</div>`;
	}).join('\n<hr class="specs--dual__divider">\n');

	return `<section class="specs-section specs-section--dual">
  <div class="specs specs--dual">
    <div class="specs--dual__head">
${indent(head, 6)}
    </div>
${indent(rows, 4)}
  </div>
</section>`;
}

function specs(s) {
	return s.layout === 'dual' ? specsDual(s) : specsSimple(s);
}

// --- Anasayfa: öne çıkan özellik banner'ı -----------------------------

// Banner arka planı ve alt yazısı İLK pill'den türetilir — bugün elle
// kopyalandığı için pill değişince alt yazının unutulması mümkün.
function featureBanner(pills) {
	const first = pills[0];

	const buttons = pills.map((p, i) =>
		`<button type="button" class="pill${i === 0 ? ' active' : ''}" data-image="${attr(p.image)}" data-desc="${richAttr(p.desc)}">${text(p.title)}</button>`
	).join('\n');

	return `<section class="feature-banner">
  <img class="feature-banner__bg" src="${attr(first.image)}" alt="Öne Çıkan Özellikler">
  <div class="feature-banner__overlay"></div>

  <div class="feature-banner__content">
    <div class="feature-pills">
${indent(buttons, 6)}
    </div>

    <div class="feature-copy">
      <h3>${text(first.desc)}</h3>
    </div>
  </div>
</section>`;
}

// --- Anasayfa: opsiyon kartları ---------------------------------------

function homeOption(o) {
	return `<article class="home-option">
  <img src="${attr(o.image)}" alt="${plain(o.title)}">
  <div>
    <h3>${text(o.title)}</h3>
    <strong>${txt(formatPrice(o.price))}</strong>
    <p>${txt(o.packages)}</p>
  </div>
</article>`;
}

// layout "compact": altı opsiyonlu Explorer ızgarası (.home-options--compact)
function homeOptions(section, options) {
	const cls = section.layout === 'compact' ? 'home-options home-options--compact' : 'home-options';
	const cards = section.options.map(ref => homeOption(resolveOption(options, ref, 'anasayfa'))).join('\n\n');

	return titled(section.title, `<div class="${cls}">
${indent(cards, 2)}
</div>`);
}

// --- İç / Dış Tasarım: standart donanım kartları -----------------------

function standardCard(c) {
	return `<article class="standard-card">
  <img src="${attr(c.image)}" alt="${plain(c.title)}">
  <h3>${text(c.title)}</h3>
  <p>${text(c.desc)}</p>
</article>`;
}

function standardCards(section) {
	const cards = section.cards.map(standardCard).join('\n\n');
	return titled(section.title, `<div class="standard-grid">
${indent(cards, 2)}
</div>`);
}

// --- İç / Dış Tasarım: görsel opsiyon kartları -------------------------

// overlay "light": açık zeminli görselde metnin okunması için farklı overlay.
// Opsiyona ait bir özellik (sekmeye değil) — aynı opsiyon her sekmede aynı.
function visualOptionCard(o) {
	const light = o.overlay === 'light' ? ' visual-option-overlay--light' : '';

	return `<article class="visual-option-card visual-option-card--bordered">
  <img src="${attr(o.image)}" alt="${plain(o.title)}">
  <div class="visual-option-overlay${light}">
    <span>${txt(o.badge)}</span>
    <div>
      <h3>${text(o.title)}</h3>
      <p>${text(o.desc)}</p>
      <strong>${txt(formatPrice(o.price))}</strong>
    </div>
  </div>
</article>`;
}

function visualOptions(section, options, tab) {
	const cards = section.options.map(ref => visualOptionCard(resolveOption(options, ref, tab))).join('\n\n');
	return titled(section.title, `<div class="option-feature-grid">
${indent(cards, 2)}
</div>`);
}

// --- Küçük özellik kartları -------------------------------------------

// Etiket üç kaynaktan gelebilir, öncelik sırasıyla:
//   1. `note`  — serbest metin (Puma Teknoloji'de açıklama cümlesi)
//   2. `tag`   — shared.tags sözlüğündeki anahtar (istisna, açıkça yazılır)
//   3. aracın `defaultTag`'i (varsayılan, kartlarda hiç yazılmaz)
// Böylece 20+ kart etiket alanı taşımıyor VE yazım kayması imkânsız oluyor.
function featureNote(f, shared, defaultTag) {
	if (f.note !== undefined) return text(f.note);
	return txt(shared.tags[f.tag || defaultTag]);
}

function smallFeature(f, shared, defaultTag) {
	return `<article class="small-feature">
  <img src="${attr(f.image)}" alt="${plain(f.title)}">
  <div><h3>${text(f.title)}</h3><p>${featureNote(f, shared, defaultTag)}</p></div>
</article>`;
}

function smallFeatures(section, shared, defaultTag) {
	const cards = section.features.map(f => smallFeature(f, shared, defaultTag)).join('\n');
	return titled(section.title, `<div class="small-feature-grid">
${indent(cards, 2)}
</div>`);
}

// --- Teknoloji sekmesi -------------------------------------------------

function techWide(section) {
	const c = section.card;
	return titled(section.title, `<article class="tech-wide-card">
  <img src="${attr(c.image)}" alt="${plain(c.title)}">
  <div>
    <h3>${text(c.title)}</h3>
    <p>${text(c.desc)}</p>
  </div>
</article>`);
}

function mediaCards(section) {
	const cards = section.cards.map(c => `<article class="media-card">
  <img src="${attr(c.image)}" alt="${plain(c.title)}">
  <div><h3>${text(c.title)}</h3><p>${text(c.desc)}</p></div>
</article>`).join('\n');

	return titled(section.title, `<div class="media-card-grid">
${indent(cards, 2)}
</div>`);
}

// --- Her sekmenin altındaki ortak blok --------------------------------

// CO₂ değeri tek aralık ya da iki segment olabilir (Puma: G ve H sınıfı).
function co2Value(co2) {
	if (typeof co2 === 'string') return txt(co2);
	return `<span class="seg-a">${txt(co2.from)}</span><span class="seg-b"> - ${txt(co2.to)}</span>`;
}

// Bu blok hiç veri olarak yazılmaz; her sekmede çağrılır.
// 12 kopya (3 araç × 4 sekme) tek fonksiyona iniyor.
function panelFooter(v, shared) {
	return `<footer class="panel-footer">
  <div class="co2" role="button" tabindex="0" data-emisyon="${attr(v.emissionImage)}">
    <img src="${attr(v.emissionImage)}" alt="">
    <div>
      <p class="co2-title">CO₂<br>Emisyon Değerleri</p>
      <p class="co2-value">${co2Value(v.co2)}</p>
    </div>
  </div>

  <button type="button" class="brochure-btn" data-qr="${attr(v.qrImage)}">Teknik Broşür</button>
</footer>
<div class="disclaimer-text">${txt(shared.disclaimer)}</div>`;
}

// --- CO₂ emisyon popup'ı ----------------------------------------------

// Yasal metin ve "Çevresel Bilgi" paragrafı üç araçta da birebir aynı →
// shared.json'da. Bir araç farklılaşırsa kendi alanını tanımlayıp ezer.
function emissionPopup(v, shared) {
	const legalText = v.emissionText || shared.emissionText;
	const legalParagraphs = v.emissionLegal || shared.emissionLegal;
	const paragraphs = legalParagraphs.map(p => `<p>${txt(p)}</p>`).join('\n');

	const cols = v.emission.map(e => `<div class="emission-col">
  <h3 class="emission-model-name">${txt(e.package)}</h3>
  <img class="emission-img" src="${attr(e.image)}" alt="${plain(`${v.shortName} ${e.package} emisyon değerleri`)}">
  <div class="emission-info">
    <p class="emission-heading">${txt(shared.emissionHeading)}</p>
    <p class="emission-text">${txt(legalText)}</p>
    <p class="emission-value">Ortalama CO₂ Emisyonu: ${txt(e.value)}</p>
    <div class="emission-legal">
${indent(paragraphs, 6)}
    </div>
  </div>
</div>`).join('\n');

	// Sütun sayısı düzeni belirler — elle senkron tutulacak bir alan değil.
	const variant = v.emission.length > 1 ? 'dual' : 'single';

	return `<template id="emission-popup-content">
  <div class="emission-grid emission-grid--${variant}">
${indent(cols, 4)}
  </div>
</template>`;
}

module.exports = {
	models, specs, featureBanner, homeOptions, standardCards,
	visualOptions, smallFeatures, techWide, mediaCards,
	panelFooter, emissionPopup,
};
