// Araç seçim ızgarası.
//
// Kartların tamamı araç JSON'larından türetilir — özellikle başlangıç fiyatı.
// Bu sayfanın araç sayfasıyla çelişmesi (plan §1'deki üç araçta da olan hata)
// artık yapısal olarak imkânsız: iki yer de aynı `startingPrice` alanını okuyor.

const { txt, attr, formatStartingPrice, indent } = require('./format');

function card(v) {
	return `<a href="vehicles/${attr(v.slug)}.html" class="vs-card">
  <img src="${attr(v.tabs.anasayfa.heroImage)}" alt="${attr(v.heroAlt)}">
  <div class="vs-card__info">
    <h2>${txt(v.name)}</h2>
    <p>${txt(formatStartingPrice(v.startingPrice))}</p>
  </div>
</a>`;
}

function indexPage(vehicles, shared) {
	const cards = vehicles.map(card).join('\n\n');

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
        data/ altına yeni bir araç JSON'u ekleyin, build.js gerisini yapar.
      -->

    </div>

  </div>

</body>
</html>
`;
}

module.exports = { indexPage };
