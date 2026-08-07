# Ford Bayi Kiosk

Ford bayi showroom'larındaki dokunmatik kiosk uygulaması. Üç araç modelini (Puma, Explorer, Capri) dört sekmede tanıtır: Anasayfa, İç Tasarım, Dış Tasarım, Teknoloji.

**Canlı:** https://ford-kiosk.ferikoy.workers.dev · https://ncdlek.github.io/kiosk/ (geçiş dönemi, ikisi de aynı içerik)

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
| `wrangler.jsonc` | Cloudflare Worker yapılandırması: ad, servis edilen dizin |
| `.node-version` | Cloudflare build ortamının Node sürümü |

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

Veriyi doğrular, `main` dalına push eder ve push edilen commit **her iki yayında da** çıkana kadar bekler. Doğrulama başarısız olursa push yapılmadan durur; build başarısız olursa o yayın güncellenmez ve site son başarılı sürümde kalır.

### Geçiş dönemi: iki yayın birden

Site şu an iki yerde birden yayında:

| Yayın | Build eden | Adres |
|---|---|---|
| GitHub Pages | `.github/workflows/deploy.yml` | https://ncdlek.github.io/kiosk/ |
| Cloudflare Workers | Cloudflare (repoya bağlı) | https://ford-kiosk.ferikoy.workers.dev |

İkisi de aynı push'la tetiklenir ve ikisi de `node build.js` çalıştırır. Tek gerçek kaynak yine `data/` + `src/` olduğu için içerikleri ayrışmaz.

`deploy.sh` ikisi birden yayına çıkmadan başarılı saymaz. Ayrışmış iki yayın geçiş döneminin en tehlikeli durumu: bir bayide eski fiyatı gösteren bir kopya kalır. Biri geri kalırsa betik hangisi olduğunu ve log adresini yazar.

Geçiş bitince GitHub Pages kapatılır: `.github/workflows/deploy.yml` silinir, **Settings → Pages → Source = None** yapılır, `deploy.sh` içindeki `GH_URL` bloğu çıkarılır. Repo ancak bundan sonra private yapılabilir — GitHub Pages ücretsiz planda private repoda çalışmaz, taşınma sebebi de budur.

### Deploy nasıl izleniyor

`deploy.sh` ne `gh` ne de Cloudflare API token'ı kullanır. `build.js`, build ettiği commit'in SHA'sını `dist/build.txt` içine yazar (Cloudflare'da `WORKERS_CI_COMMIT_SHA`, GitHub Actions'ta `git rev-parse HEAD`); betik iki adresin `build.txt` dosyasını da push edilen SHA'ya dönene kadar yoklar. Yani "yayında" çıktısı bir panelin yeşiline değil, sitenin gerçekten yeni içeriği servis etmesine bakar.

Worker adı ya da hesap alt alanı değişirse `deploy.sh` içindeki `CF_URL` satırı güncellenir (ya da `CF_URL=https://<worker>.<hesap>.workers.dev ./deploy.sh`).

### Cloudflare yapılandırması

Cloudflare, Pages'i Workers ile birleştirdi: repoya bağlanan proje bir **Worker (Static Assets)** olarak kurulur, adres `*.pages.dev` değil `*.workers.dev` olur. Panelde **Workers & Pages → Create → Connect to Git**, sonra `ncdlek/kiosk`.

Panelde tutulan ayarlar:

| Ayar | Değer |
|---|---|
| Production branch | `main` |
| Build command | `node build.js` |
| Deploy command | `npx wrangler deploy` |

Gerisi repoda:

| Dosya | Belirlediği |
|---|---|
| `.node-version` | Build ortamının Node sürümü |
| `wrangler.jsonc` | Worker adı, servis edilecek dizin (`dist`), `compatibility_date` |

`wrangler.jsonc` repoda durmalı. Olmasaydı Wrangler her build'de bir tane üretir ve `compatibility_date` alanına build'in çalıştığı günü yazardı — aynı commit farklı günlerde farklı davranabilirdi.

Cloudflare `/vehicles/puma.html` isteğini `/vehicles/puma` adresine 307 ile yönlendirir. Bağlantılar ve varlık yolları göreli olduğu için bu davranış sayfaları etkilemez.

Preview URL'ler açık: `main` dışındaki her dal ve her sürüm ayrı bir adres alır. Kapatmak için `wrangler.jsonc` içinde `"preview_urls": false`.
