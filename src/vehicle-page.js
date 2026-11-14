// Araç sayfası şablonu: hero + 4 sekme + emisyon popup'ı (+ versiyon sayfasında kampanya popup'ı).
//
// Sekme içerikleri veriden sıralı bölüm listesi olarak gelir; bu fonksiyon
// yalnızca hangi blok fonksiyonunun çağrılacağını seçer.

const { txt, attr, formatPrice, formatStartingPrice, indent } = require('./format');
const B = require('./blocks');

// Bölüm başlığı iki kaynaktan gelebilir:
//   `titleKey` — shared.sectionTitles'daki anahtar (araçlar arası tekrar edenler:
//                "OPSİYONLAR", "DİĞER ÖZELLİKLER") → yazım kayması imkânsız
//   `title`    — araca özgü başlık ("TÜM CAPRI'LERDE STANDART")
function withTitle(section, shared) {
	if (section.titleKey === undefined) return section;
	return Object.assign({}, section, { title: shared.sectionTitles[section.titleKey] });
}

// Bir bölümü tipine göre ilgili blok fonksiyonuna yönlendir.
function renderSection(raw, v, shared, tab) {
	const section = withTitle(raw, shared);
	switch (section.type) {
		case 'models':        return B.models(v.models, v.modelFrame);
		case 'specs':         return B.specs(v.specs);
		case 'featureBanner': return B.featureBanner(v.featured);
		case 'homeOptions':   return B.homeOptions(section, v.options, !v.version)  // versiyon sayfasında paket etiketi (Select/Premium) yok;
		case 'standardCards': return B.standardCards(section);
		case 'visualOptions': return B.visualOptions(section, v.options, tab);
		case 'smallFeatures': return B.smallFeatures(section, shared, v.defaultTag);
		case 'techWide':      return B.techWide(section);
		case 'mediaCards':    return B.mediaCards(section);
		default:
			// build.js doğrulaması bunu zaten yakalar; buraya düşmesi bir kod hatası.
			throw new Error(`Bilinmeyen bölüm tipi: ${section.type}`);
	}
}

// İç ve Dış Tasarım sekmelerinin ortak yerleşimi — tüm araçlar için şablonda,
// veri dosyalarında değil:
//   sıra       standart özellikler → diğer özellikler → opsiyonlar
//   standart   başlık her zaman shared.sectionTitles.standard
//   diğer      başlıksız, kart altında etiket/açıklama yok
//   opsiyon    rozetsiz, metin kartın üstünde
// Veri yalnızca içeriği (kartlar, özellikler, opsiyon listesi) tanımlar.
const DESIGN_TABS = ['ic-tasarim', 'dis-tasarim'];
const DESIGN_ORDER = { standardCards: 0, smallFeatures: 1, visualOptions: 2 };

function designLayout(sections, shared) {
	const rank = s => (s.type in DESIGN_ORDER ? DESIGN_ORDER[s.type] : 3);
	return sections
		.map((s, i) => ({ s, i }))
		.sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)   // kararlı sıralama
		.map(({ s }) => {
			if (s.type === 'standardCards') return Object.assign({}, s, { title: shared.sectionTitles.standard });
			if (s.type === 'smallFeatures') return Object.assign({}, s, { title: undefined, titleKey: undefined, hideNotes: true });
			if (s.type === 'visualOptions') return Object.assign({}, s, { textTop: true });
			return s;
		});
}

function tabPanel(tabId, v, shared, isFirst) {
	const tab = v.tabs[tabId];
	const sections = DESIGN_TABS.includes(tabId) ? designLayout(tab.sections, shared) : tab.sections;
	const body = sections
		.map(s => renderSection(s, v, shared, tabId))
		.concat(B.panelFooter(v, shared))
		.join('\n\n');

	// İlk sekme açık gelir; diğerleri `hidden` — script.js DOMContentLoaded'da
	// bunu kendi de senkronlar ama JS yüklenmeden önce de doğru olsun.
	const attrs = isFirst ? 'class="tab-panel active" id="tab-' + tabId + '"' : 'class="tab-panel" id="tab-' + tabId + '" hidden';

	return `<section ${attrs}>
  <div class="content">
${indent(body, 4)}
  </div>
</section>`;
}

// Kampanyalar `options` gibi bir sözlük: ortak tanım shared.json'da, araç
// verisi aynı anahtarla tanımlarsa o kampanyanın TAMAMINI değiştirir (alan
// alan birleştirme yok — bir kampanyanın yarısı ortaktan yarısı araçtan
// gelirse hangi koşulun kioskta göründüğü dosyaya bakıp anlaşılmaz).
// build.js doğrulaması da aynı fonksiyonu kullanır.
function campaignOf(v, shared) {
	const key = v.version && v.version.campaign;
	if (key === undefined) return null;
	const own = v.campaigns || {};
	if (key in own) return own[key];
	return (shared.campaigns || {})[key] || null;
}

// Bilgi ikonu: daire içinde "i". Satır yüksekliğini bozmasın diye CSS'te
// negatif margin'le hizalanır; dokunma alanı 44px (bkz. .hero__info).
// assets/images/info-icon.svg: beyaz daire + lacivert "i", vektör. 27px'de
// (.hero__info-icon) her ekran yoğunluğunda keskin.
const INFO_ICON = '<span class="hero__info-icon"><img src="../assets/images/info-icon.svg" alt=""></span>';

// Popup içeriği <template id="campaign-popup-content">'te durur; script.js
// emisyon popup'ıyla aynı mekanizmayla açar (data-popup-template).
function infoButton(c) {
	return `<button type="button" class="hero__info" data-popup="campaign" data-popup-template="campaign-popup-content" aria-label="${attr(c.headline)} — kampanya koşulları">${INFO_ICON}</button>`;
}

function heroCampaign(c, shared) {
	if (!c) return '';
	const headline = txt(c.headline) + (c.infoOn === 'headline' ? ' ' + infoButton(c) : '');
	const note = c.note
		? `\n<p class="hero__campaign-note">${txt(c.note)}${c.infoOn === 'note' ? ' ' + infoButton(c) : ''}</p>`
		: '';

	return `
<div class="hero__campaign">
  <p class="hero__label">${txt(shared.heroCampaignLabel)}</p>
  <p class="hero__campaign-headline">${headline}</p>${indent(note, 2)}
</div>`;
}

// Versiyon sayfası hero metni. Donanım adı BÜYÜK harf: toUpperCase yerel
// ayardan bağımsız ("Premium" → "PREMIUM"); tr-TR kuralıyla "PREMİUM" olurdu,
// marka adında istenmeyen bu.
function heroVersionCopy(v, shared) {
	const ver = v.version;
	return `<div class="hero__copy hero__copy--version">
  <h1 class="hero__title">${txt(v.name)}</h1>
  <p class="hero__trim"><strong>${txt(String(v.trim).toUpperCase())}</strong> ${txt(ver.power)}</p>
  <p class="hero__label">${txt(shared.heroPriceLabel)}</p>
  <p class="hero__price">${txt(formatPrice(ver.price))}</p>${indent(heroCampaign(campaignOf(v, shared), shared), 2)}
</div>`;
}

// Versiyonsuz sayfaların (aile, donanım) eski hero metni — çıktısı değişmesin.
function heroCopy(v) {
	return `<div class="hero__copy">
  <h1 class="hero__title">${txt(v.name)}</h1>
  <p class="hero__subtitle">${txt(formatStartingPrice(v.startingPrice))}</p>
  <p class="hero__meta">${txt(v.meta)}</p>
</div>`;
}

function hero(v, shared) {
	const copy = v.version ? heroVersionCopy(v, shared) : heroCopy(v);
	const contentCls = v.version ? 'hero__content hero__content--version' : 'hero__content';

	const buttons = shared.tabs.map((t, i) =>
		`<button class="tab${i === 0 ? ' active' : ''}" type="button" data-tab="${attr(t.id)}" data-hero-image="${attr(v.tabs[t.id].heroImage)}">
  ${txt(t.label)}
</button>`
	).join('\n\n');

	// Versiyon sayfalarında home butonu yok; fallback sayfalarında duruyor.
	const home = v.version ? '' : `  <a class="hero__home" href="../index.html" aria-label="Araç seçim ekranına dön">
    <img src="../assets/images/home-icon.png" alt="">
  </a>

`;

	return `<section class="hero">
  <img class="hero__bg" src="${attr(v.tabs.anasayfa.heroImage)}" alt="${attr(v.heroAlt)}">

${home}  <div class="${contentCls}">
${indent(copy, 4)}
  </div>

  <div class="tabs-wrap">
    <div class="tabs">
${indent(buttons, 6)}
    </div>
  </div>
</section>`;
}

// Emisyon dışındaki popup şablonları. Versiyonsuz sayfada boş string —
// eski sayfaların çıktısı bir satır bile değişmesin.
function plainShort(n) { return String(n).replace(/[®™]/g, '').replace(/^Ford\s+/, '').trim(); }

function popups(v, shared) {
	const c = campaignOf(v, shared);
	if (!c) return '';
	return `\n\n${indent(B.campaignPopup(c, v.shortName || plainShort(v.name)), 2)}`;
}

function vehiclePage(v, shared) {
	const panels = shared.tabs
		.map((t, i) => tabPanel(t.id, v, shared, i === 0))
		.join('\n\n');

	const body = [hero(v, shared), panels].join('\n\n');

	return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${shared.gtmId}');</script>
  <!-- End Google Tag Manager -->
  <title>${txt(v.pageTitle)}</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>

<body data-gtm-model="${attr(v.gtmModel)}">
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${shared.gtmId}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div class="page">

${indent(body, 4)}

  </div>

${indent(B.emissionPopup(v, shared), 2)}${popups(v, shared)}

  <script src="../assets/js/script.js"></script>

</body>
</html>
`;
}

module.exports = { vehiclePage, campaignOf, DESIGN_TABS };
