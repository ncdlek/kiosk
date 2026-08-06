// Metin ve fiyat biçimlendirme.
//
// Buradaki her fonksiyon saf: aynı girdi her zaman aynı byte'ları üretir.
// Bu, `git diff`in yalnızca gerçek içerik değişimini göstermesi için gerekli.

// Binlik ayırıcı elle yazılıyor, Intl.NumberFormat ile değil.
// Intl ICU verisine bağlıdır; Node derlemesine göre çıktısı değişebilir
// (ör. dar bant boşluğu vs nokta). Elle yazınca her ortamda aynı.
function thousands(n) {
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Fiyatın üç şekli var (bkz. plan §7). Aralık `[alt, üst]` dizisi olarak
// tutuluyor: tip kontrolüyle tek fiyattan ayrışıyor ve JSON'da kısa duruyor.
//   139600           → "139.600 TL"
//   [12700, 32400]   → "12.700 TL - 32.400 TL"
function formatPrice(price) {
	if (Array.isArray(price)) {
		return `${thousands(price[0])} TL - ${thousands(price[1])} TL`;
	}
	return `${thousands(price)} TL`;
}

// Başlangıç fiyatı ayrı bir fonksiyon (formatPrice'a suffix parametresi değil):
// çağrı yerinde ne üretildiği okunur kalıyor ve iki biçim birbirine karışmıyor.
// Kesme işareti DÜZ (U+0027) — proje genelinde tek standart.
function formatStartingPrice(n) {
	return `${thousands(n)} TL'den başlayan fiyatlarla*`;
}

// --- Kaçış ------------------------------------------------------------
//
// Metin ve attribute farklı kurallara tabi:
//   metin içinde `"` serbesttir  → <h3>14.6" SYNC® Move</h3>
//   attribute içinde değildir    → alt="14.6&quot; SYNC® Move"
// Tek bir esc() kullanmak başlıkları gereksiz yere &quot; ile doldururdu.
//
// Türkçe karakterler, ® ve ₂ olduğu gibi kalır (dosyalar UTF-8,
// sayfalar <meta charset="UTF-8">).

function txt(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function attr(s) {
	return txt(s).replace(/"/g, '&quot;');
}

// Başlık ve açıklama alanları dizi olabilir; satırlar <br> ile birleşir.
// Tek string verilirse tek satırlı sayılır.
function toLines(v) {
	return Array.isArray(v) ? v : [v];
}

// Görünen metin: "Park Sensörleri<br>(Ön &amp; Arka)"
// <br> kaçıştan SONRA ekleniyor, yoksa &lt;br&gt; olurdu.
function text(v) {
	return toLines(v).map(txt).join('<br>');
}

// İçinde <br> taşıyan attribute: data-desc="… ile<br>… sağlar."
// Satırlar attribute kurallarıyla kaçırılır, <br> literal kalır.
function richAttr(v) {
	return toLines(v).map(attr).join('<br>');
}

// alt="" değeri: <br> olamaz, satırlar boşlukla birleşir.
function plain(v) {
	return toLines(v).map(attr).join(' ');
}

// Bir HTML bloğunu n boşluk içeri al. Boş satırlar boş kalır.
function indent(str, n) {
	const pad = ' '.repeat(n);
	return str
		.split('\n')
		.map(line => (line ? pad + line : line))
		.join('\n');
}

module.exports = {
	thousands, formatPrice, formatStartingPrice,
	txt, attr, text, richAttr, plain, indent,
};
