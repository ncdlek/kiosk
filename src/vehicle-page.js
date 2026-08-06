// Araç sayfası şablonu: hero + 4 sekme + emisyon popup'ı.
//
// Sekme içerikleri veriden sıralı bölüm listesi olarak gelir; bu fonksiyon
// yalnızca hangi blok fonksiyonunun çağrılacağını seçer.

const { txt, attr, formatStartingPrice, indent } = require('./format');
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
		case 'models':        return B.models(v.models);
		case 'specs':         return B.specs(v.specs);
		case 'featureBanner': return B.featureBanner(v.featured);
		case 'homeOptions':   return B.homeOptions(section, v.options);
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

function tabPanel(tabId, v, shared, isFirst) {
	const tab = v.tabs[tabId];
	const body = tab.sections
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

function hero(v, shared) {
	const buttons = shared.tabs.map((t, i) =>
		`<button class="tab${i === 0 ? ' active' : ''}" type="button" data-tab="${attr(t.id)}" data-hero-image="${attr(v.tabs[t.id].heroImage)}">
  ${txt(t.label)}
</button>`
	).join('\n\n');

	return `<section class="hero">
  <img class="hero__bg" src="${attr(v.tabs.anasayfa.heroImage)}" alt="${attr(v.heroAlt)}">

  <div class="hero__content">
    <div class="hero__copy">
      <h1 class="hero__title">${txt(v.name)}</h1>
      <p class="hero__subtitle">${txt(formatStartingPrice(v.startingPrice))}</p>
      <p class="hero__meta">${txt(v.meta)}</p>
    </div>
  </div>

  <div class="tabs-wrap">
    <div class="tabs">
${indent(buttons, 6)}
    </div>
  </div>
</section>`;
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

${indent(B.emissionPopup(v, shared), 2)}

  <script src="../assets/js/script.js"></script>

</body>
</html>
`;
}

module.exports = { vehiclePage };
