// Araç seçim ekranı: aile başına bir kart, kartta donanım başına bir satır,
// satırda versiyon başına bir düğme.
//
// Kartların tamamı veriden türetilir. Aile gruplaması donanımın `base`
// alanından gelir (elle bir "aile listesi" tutulmaz); kart ve satır sırası
// shared.vehicles'taki sıradır. Kart görseli bilerek link değil: bir aile
// kartı artık tek bir sayfaya karşılık gelmiyor, hedef düğmelerde.

const { txt, attr, formatStartingPrice, indent } = require('./format');

// Kartın "X TL'den başlayan" satırı. Yer tutucu bir versiyon fiyatı en düşük
// diye seçilirse yanlış bir rakam ilan edilir; o yüzden yer tutucunun yerine
// donanımın kendi startingPrice'ı aday olur. Bütün fiyatlar gelince satır
// kendiliğinden gerçek en düşük versiyon fiyatını gösterir.
function familyPrice(items) {
	const candidates = items.flatMap(({ page, versions }) => {
		if (!versions.length) return [page.startingPrice];
		return versions.map(v => (v.version.placeholder ? page.startingPrice : v.version.price));
	});
	return Math.min(...candidates);
}

// Aynı base'i paylaşan donanımları ilk görünüş sırasıyla grupla.
function groupByFamily(listed) {
	const families = new Map();
	for (const item of listed) {
		const key = item.page.base || item.page.slug;
		if (!families.has(key)) families.set(key, []);
		families.get(key).push(item);
	}
	return Array.from(families.values());
}

function trimRow({ page, versions }, shared) {
	const buttons = versions.length
		? versions.map(v => `<a class="vs-btn" href="vehicles/${attr(v.slug)}.html">${txt(v.version.power)}</a>`)
		: [`<a class="vs-btn" href="vehicles/${attr(page.slug)}.html">${txt(shared.indexOpenLabel)}</a>`];

	return `<li class="vs-trim">
  <span class="vs-trim__label">${txt(page.trim)}</span>
  <div class="vs-trim__buttons">
${indent(buttons.join('\n'), 4)}
  </div>
</li>`;
}

function card(items, shared) {
	const first = items[0].page;
	const rows = items.map(item => trimRow(item, shared)).join('\n');

	return `<article class="vs-card">
  <img src="${attr(first.tabs.anasayfa.heroImage)}" alt="${attr(first.name)}">
  <div class="vs-card__info">
    <h2>${txt(first.name)}</h2>
    <p>${txt(formatStartingPrice(familyPrice(items)))}</p>
    <ul class="vs-trims">
${indent(rows, 6)}
    </ul>
  </div>
</article>`;
}

// listed: [{ page, versions }] — page donanımın sayfa verisi, versions onun
// versiyon sayfaları (build.js expandVersions). Sıra shared.vehicles'tır.
function indexPage(listed, shared) {
	const cards = groupByFamily(listed).map(items => card(items, shared)).join('\n\n');

	return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${txt(shared.indexTitle)}</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/vehicle-select.css">
</head>

<body>
  <div class="page vehicle-select-page">

    <header class="vs-header">
      <h1 class="vs-title">${txt(shared.indexHeading)}</h1>
      <p class="vs-subtitle">${txt(shared.indexSubheading)}</p>
    </header>

    <div class="vs-grid">

${indent(cards, 6)}

      <!--
        YENİ ARAÇ EKLEMEK İÇİN:
        Bu dosya ÜRETİLİR — elle düzenlemeyin (dist/ .gitignore'da).
        data/ altına yeni bir donanım JSON'u ekleyip slug'ı shared.json
        vehicles dizisine yazın, build.js gerisini yapar.
      -->

    </div>

  </div>

</body>
</html>
`;
}

module.exports = { indexPage };
