# Ford Bayi Kiosk

Ford bayi showroom'larındaki dokunmatik kiosk uygulaması. Üç araç modelini (Puma, Explorer, Capri) dört sekmede tanıtır: Anasayfa, İç Tasarım, Dış Tasarım, Teknoloji.

**Canlı:** https://ncdlek.github.io/kiosk/

Statik site; sunucu, veritabanı veya npm bağımlılığı yok. HTML elle yazılmaz, JSON verisinden üretilir.

```
data/*.json  +  src/*.js  ──▶  build.js  ──▶  dist/
```

## Gereksinimler

- Node.js 18+
- Python 3 (yalnızca yerel önizleme için)

## Kullanım

```bash
node build.js                                        # dist/ üret
node build.js --check                                # yalnızca veriyi doğrula
python3 -m http.server 8791 --directory dist         # http://localhost:8791
```

## Proje yapısı

| Yol | Açıklama |
|---|---|
| `data/shared.json` | Araçlar arası ortak içerik: sekme etiketleri, bölüm başlıkları, donanım etiketleri, emisyon yasal metni |
| `data/<slug>.json` | Bir sayfanın içeriği: fiyatlar, opsiyonlar, renkler, teknik veriler |
| `data/<aile>.base.json` | Aynı aracın donanımları arasındaki ortak içerik. Kendisi sayfaya dönüşmez |
| `src/format.js` | Fiyat ve metin biçimlendirme, HTML kaçış |
| `src/blocks.js` | Her HTML bloğu için saf fonksiyon |
| `src/vehicle-page.js` | Araç sayfası şablonu |
| `src/index-page.js` | Araç seçim ekranı şablonu |
| `build.js` | Doğrulama ve üretim |
| `tools/compare.js` | İki HTML dosyasını normalize edip karşılaştırır |
| `assets/` | CSS, JS, font, görseller — olduğu gibi kopyalanır |
| `dist/` | Üretilen site. Sürüm kontrolünde değil, her build'de sıfırdan yazılır |

`assets/css/style.css` ve `assets/js/script.js` şablon sisteminin dışındadır.

> `dist/` içindeki dosyalar bir sonraki build'de silinir. Değişiklikler `data/` ve `src/` üzerinde yapılır.

## İçerik güncelleme

### Fiyat ve metin

İlgili aracın JSON dosyası düzenlenir. Fiyatlar sayı olarak tutulur; binlik ayırıcı ve `TL` eki build sırasında eklenir.

```jsonc
{
  "startingPrice": 3211600,        // "3.211.600 TL'den başlayan fiyatlarla*"

  "options": {
    "isi-pompasi": {
      "title": "Isı Pompası",
      "price": 139600,             // "139.600 TL"
      "packages": "Premium"
    },
    "metalik-renk": {
      "price": [12700, 32400]      // "12.700 TL - 32.400 TL"
    }
  }
}
```

Opsiyonlar bir kez tanımlanır; sekmeler `id` ile referans verir. Bir fiyatın değiştirilmesi tek satırlık işlemdir ve aracın tüm sekmeleriyle araç seçim ekranını birlikte günceller.

### Donanım sayfaları ve taban dosya

Aynı aracın donanımları içeriğin yaklaşık %85'ini paylaşıyor. Ortak kısım `data/<aile>.base.json` içinde tek nüsha durur; her donanım dosyası `base` alanıyla ona bağlanır ve yalnızca farkını yazar.

```jsonc
// data/puma.base.json — teknik veriler, standart kartlar, teknoloji sekmesi, opsiyon fiyatları
// data/puma-st-line-x.json
{
  "base": "puma",
  "slug": "puma-st-line-x",
  "meta": "ST-Line X",
  "options": { "stepne": { "packages": "ST-Line X" } }   // fiyat ve açıklama tabandan
}
```

Birleştirme kuralı iki maddelik:

| | Davranış | Neden |
|---|---|---|
| Nesneler | Anahtar anahtar birleşir, varyant kazanır | `options` bir sözlük: fiyat tabanda, `packages` varyantta durabilir |
| Diziler | Tamamen değişir | Yarı birleşmiş bir liste — sırası kaymış, kartı tekrar etmiş — dosyaya bakıp öngörülemez |

Yani bir varyant altı kartlık listeden birini çıkaracaksa kalan beşini baştan yazar. Uzun ama okuyan herkes ekranda ne göreceğini dosyadan görür.

Taban dosyalar tek seviyedir: bir taban dosya kendisi `base` kullanamaz.

### Yeni sayfa

1. `data/<slug>.json` oluşturun — aynı araçtan bir donanım daha ekliyorsanız `base` ile mevcut tabana bağlanın, yeni bir araçsa mevcut bir dosyayı kopyalayın
2. Görselleri `assets/images/<araç>/` altına yerleştirin
3. `data/shared.json` içindeki `vehicles` dizisine `<slug>` ekleyin

Dizideki sıra, araç seçim ekranındaki kart sırasıdır. Araç sayfası ve seçim kartı otomatik üretilir.

### Index'te görünmeyen sayfa

`shared.json` iki liste tutar. Hangi `.html` dosyalarının üretileceğine **ikisinin toplamı** karar verir; aralarındaki tek fark araç seçim ekranında kart çıkıp çıkmamasıdır.

| Slug nerede | `.html` üretilir | Index kartı |
|---|---|---|
| `vehicles` | evet | var |
| `previewVehicles` | evet | yok |
| hiçbiri | hayır | yok |

Onaya sunulacak sayfalar `previewVehicles`'a konur, doğrudan URL ile açılır. Onaylanınca slug `vehicles`'a taşınır. Taban dosyalar hiçbir listede yer almadığı için sayfaya dönüşmez.

### Ortak içerik ve etiketler

Araçlar arası tekrar eden metinler `data/shared.json` içindedir. Bir aracın farklılaşması gerekirse kendi dosyasında aynı alanı tanımlayarak ortak değeri ezer.

Donanım etiketleri varsayılan/istisna mantığıyla çalışır: kartların çoğu etiket alanı taşımaz ve aracın `defaultTag` değerini alır. Farklı olan kart `tag` (sözlük anahtarı) veya `note` (serbest metin) belirtir.

## Doğrulama

`build.js` üretimden önce veriyi denetler. Hata bulunursa build durur ve `dist/` yazılmaz.

| Kontrol | Engellediği hata |
|---|---|
| Sekmedeki opsiyon id'leri tanımlı mı | Sessizce kaybolan opsiyon kartı |
| Referans edilen görseller diskte var mı | Kırık görsel |
| `price` sayı veya `[sayı, sayı]` mı | Biçimlendirilmiş fiyat string'i |
| Etiket anahtarı sözlükte var mı | Tutarsız donanım etiketi |
| Metinler düz tırnak kullanıyor mu | Karışık tipografi |
| Zorunlu alanlar dolu mu | Eksik içerikli sayfa |
| `base` gösterdiği taban dosya var mı | Sessizce yarım kalan sayfa |
| Taban dosyanın kendi `base`'i var mı | Alanın nereden geldiğini bulunamaz hâle getiren zincir |

Doğrulama birleştirme **sonrası** veri üzerinde çalışır: tabandan gelen bir eksiklik de varyantın kendi hatası kadar görünür olur. `previewVehicles` sayfaları da aynı denetimden geçer — "nasıl olsa index'te yok" diye kaçamaz.

Hata çıktısı dosya ve alan adı verir:

```
✗ Doğrulama başarısız — 1 hata:

  data/capri.json: options.isi-pompasi.price sayı ya da [sayı, sayı] olmalı, "139.600 TL" verilmiş

dist/ yazılmadı, deploy olmayacak.
```

## Deploy

```bash
./deploy.sh
```

Veriyi doğrular, `main` dalına push eder, GitHub Actions iş akışını tetikler ve sonucu bekler. Doğrulama başarısız olursa push yapılmadan durur; build başarısız olursa yayın yapılmaz ve site son başarılı sürümde kalır.

İş akışı `dist/` dizinini GitHub Pages'e yayınlar (`.github/workflows/deploy.yml`). Gereksinim: [GitHub CLI](https://cli.github.com) (`gh`).

> Deploy elle tetikleniyor. Bu repoda iş akışının `on: push` tetikleyicisi çalışmıyor — `workflow_dispatch` sorunsuz. Sebep tespit edilemedi; `deploy.sh` tetiklemeyi push'a bağlayarak adımın atlanmasını önlüyor. Alternatif elle tetikleme: **Actions → Deploy → Run workflow**

Pages yapılandırması: **Settings → Pages → Source = GitHub Actions**
