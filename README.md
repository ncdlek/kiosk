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
| `data/<slug>.json` | Araca ait tüm içerik: fiyatlar, opsiyonlar, renkler, teknik veriler |
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

### Yeni araç

1. `data/<slug>.json` oluşturun — mevcut bir araç dosyasını kopyalamak en pratiği
2. Görselleri `assets/images/<slug>/` altına yerleştirin
3. `data/shared.json` içindeki `vehicles` dizisine `<slug>` ekleyin

Dizideki sıra, araç seçim ekranındaki kart sırasıdır. Araç sayfası ve seçim kartı otomatik üretilir.

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

Hata çıktısı dosya ve alan adı verir:

```
✗ Doğrulama başarısız — 1 hata:

  data/capri.json: options.isi-pompasi.price sayı ya da [sayı, sayı] olmalı, "139.600 TL" verilmiş

dist/ yazılmadı, deploy olmayacak.
```

## Deploy

`main` dalına yapılan push, GitHub Actions üzerinden `node build.js` çalıştırır ve `dist/` dizinini GitHub Pages'e yayınlar (`.github/workflows/deploy.yml`).

Doğrulama başarısız olursa iş kırmızıya döner ve yayın yapılmaz; site son başarılı sürümde kalır. Push sonrası Actions sekmesinin kontrol edilmesi önerilir.

Elle tetikleme: **Actions → Deploy → Run workflow**

Pages yapılandırması: **Settings → Pages → Source = GitHub Actions**
