# Ford Bayi Kiosk

Bayi showroom'larındaki dokunmatik kiosk sitesi. Statik; GitHub Pages'te yayınlanıyor.

**https://ncdlek.github.io/kiosk/**

## Nasıl çalışıyor

HTML elle yazılmıyor, **üretiliyor**:

```
data/*.json  +  src/*.js   →   build.js   →   dist/
```

- `data/` — tek gerçek kaynak. Fiyatlar, opsiyonlar, metinler, görsel yolları.
- `src/` — şablonlar. Her HTML bloğu için bir saf fonksiyon.
- `dist/` — üretilen site. **Commit'lenmiyor** (`.gitignore`), her build'de sıfırdan yazılıyor.

`assets/css/style.css` ve `assets/js/script.js` bu yapının dışında; olduğu gibi kopyalanıyorlar.

> `dist/` içindeki dosyaları düzenlemeyin — bir sonraki build'de silinir.

## Fiyat / metin güncelleme

İlgili aracın JSON'unu düzenleyip push edin. Fiyatlar **sayı** olarak yazılır, `TL` ve binlik ayırıcı build sırasında eklenir:

```jsonc
// data/capri.json
"isi-pompasi": {
  "title": "Isı Pompası",
  "price": 139600,           // → "139.600 TL"
  "packages": "Premium"
}

"price": [12700, 32400]      // → "12.700 TL - 32.400 TL"
"startingPrice": 3211600     // → "3.211.600 TL'den başlayan fiyatlarla*"
```

Bir opsiyon **bir kez** tanımlanır, sekmeler `id` ile referans verir. Yani bir fiyatı değiştirmek tek satır — anasayfa, iç tasarım, dış tasarım ve araç seçim ekranı birlikte güncellenir.

## Yeni araç ekleme

1. `data/<slug>.json` oluşturun (en yakın aracı kopyalayıp düzenlemek en hızlısı)
2. Görselleri `assets/images/<slug>/` altına koyun
3. `data/shared.json` içindeki `vehicles` listesine slug'ı ekleyin — sıra, araç seçim ekranındaki sıradır

Araç sayfası ve seçim ekranı kartı otomatik üretilir.

## Yerel önizleme

```bash
node build.js && python3 -m http.server 8791 --directory dist
```

Sonra http://localhost:8791/ — Node dışında bir şey gerekmiyor, `npm install` yok.

Yalnızca veriyi denetlemek için:

```bash
node build.js --check
```

## Doğrulama

`build.js` üretmeden önce veriyi denetler. Hata bulursa **build durur ve `dist/` yazılmaz** — yani bozuk veri yayına çıkmaz, site son sağlam sürümde kalır.

Yakalananlar:

| Kontrol | Engellediği |
|---|---|
| Sekmedeki her opsiyon id'si tanımlı mı | Sessizce kaybolan opsiyon kartı |
| Referans edilen her görsel diskte var mı | Kioskta kırık görsel |
| `price` sayı ya da `[sayı, sayı]` mı | `"139.600 TL"` string'inin geri sızması |
| Etiket anahtarı `shared.json`'da var mı | Yazım kayması |
| Zorunlu alanlar dolu mu | Yarım sayfa |

Hata mesajı dosya ve alan adını verir:

```
✗ Doğrulama başarısız — 1 hata:

  data/capri.json: options.isi-pompasi.price sayı ya da [sayı, sayı] olmalı, "139.600 TL" verilmiş

dist/ yazılmadı, deploy olmayacak.
```

## Deploy

`main`'e push → GitHub Actions `node build.js` çalıştırır → `dist/` Pages'e gider.
(Pages kaynağı: Settings → Pages → Source = **GitHub Actions**.)

Build kırmızıya dönerse deploy olmaz. Push'tan sonra Actions sekmesine bakma alışkanlığı gerekiyor.

Elle tetikleme: Actions → Deploy → Run workflow.

## Ortak içerik

`data/shared.json` araçlar arası tekrar eden her şeyi tutar — sekme etiketleri, bölüm başlıkları, donanım etiketleri, CO₂ emisyon yasal metni, fiyat dipnotu. Bir aracın farklılaşması gerekirse kendi dosyasında aynı alanı tanımlayıp ezer.

Donanım etiketleri varsayılan + istisna mantığıyla çalışır: kartların çoğu etiket alanı taşımaz, aracın `defaultTag`'ini alır; farklı olan kart `tag` (sözlükten) ya da `note` (serbest metin) yazar.

## Yazım standardı

Build çıktısı tutarlılığı garanti eder, ama JSON'a girerken dikkat:

- Kesme işareti **düz** `'` — `TL'den`, `Premium'da` (kıvrık `'` kullanmayın)
- Çift tırnak **düz** `"` — `14.6" SYNC Move` (JSON içinde `\"` olarak kaçırılır)
