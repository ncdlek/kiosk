# 🚗 Yeni Araç Ekleme Yönergesi

Bu yönerge, projeye yeni bir Ford modeli eklemek isteyen herkes için hazırlanmıştır. Kod bilgisi gerekmez — sadece dosya kopyalama ve metin değiştirme yapmanız yeterli.

---

## 📋 Ön Hazırlık

Başlamadan önce elinizde şu malzemeler olmalı:

- [ ] Aracın hero görseli (anasayfa, iç tasarım, dış tasarım, teknoloji için ayrı ayrı)
- [ ] Model kart görselleri (her paket × her renk için ayrı ayrı)
- [ ] Renk swatch görselleri (renk seçim butonları için küçük kare görseller)
- [ ] Standart özellik, opsiyon ve diğer özellik görselleri
- [ ] CO2 emisyon görseli
- [ ] Teknik broşür QR kod görseli (`popup/qr.png`)
- [ ] Araç adı, fiyatları, özellik açıklamaları, teknik veriler

---

## Adım 1: Görsel Klasörünü Oluşturun

`assets/images/` klasörü altında aracın adıyla yeni bir klasör oluşturun.

**Örnek:** Kuga için `assets/images/kuga/`

Aşağıdaki alt klasör yapısını oluşturun (Puma klasörünü referans alabilirsiniz):

```
assets/images/kuga/
├── anasayfa/
│   ├── hero/                    ← Anasayfa hero görseli
│   ├── featured/                ← Öne çıkan özellikler banner görseli
│   ├── models/
│   │   ├── titanium/            ← Titanium paketinin her renk görseli
│   │   ├── st-line-x/          ← ST-Line X paketinin her renk görseli
│   │   └── swatches/            ← Renk butonlarının küçük görselleri
│   └── options/                 ← Opsiyon görselleri
├── ic-tasarim/
│   ├── hero/                    ← İç tasarım hero görseli
│   ├── standard/                ← Standart özellik görselleri
│   ├── options/                 ← Opsiyon görselleri
│   └── other/                   ← Diğer özellik görselleri
├── dis-tasarim/                 ← (ic-tasarim ile aynı alt yapı)
├── teknoloji/                   ← (ic-tasarim ile aynı alt yapı)
└── popup/                       ← emisyon.png + qr.png (tüm sekmelerde ortak)
```

Görselleri bu klasörlere yerleştirin. Dosya isimlerini küçük harf ve tire ile yazın (ör: `okyanus-mavi.png`).

> **İpucu:** Görselleri tek bir formatta (`.png` veya `.jpg`) koyun ve HTML'de aynı uzantıyı kullanın. Başka formatların kopyalarını eklemeyin — kullanılmayan görseller projeyi şişirir.

---

## Adım 2: Araç Sayfasını Oluşturun

1. `vehicles/puma.html` dosyasını kopyalayın
2. Yeni dosyayı `vehicles/kuga.html` olarak adlandırın
3. Dosyayı bir metin editöründe açın (VS Code, Notepad++, hatta Notepad bile olur)

### Değiştirilecek alanlar:

| Ne değişecek | Nerede | Örnek |
|---|---|---|
| `<title>` | Sayfanın en üstü | `Ford Kuga Tasarım` |
| Hero görsel yolu | `<img class="hero__bg" src="...">` | `../assets/images/kuga/anasayfa/hero/anasayfa.png` |
| Hero başlık | `<h1 class="hero__title">` | `Ford Kuga'da %3 indirim` |
| Hero alt başlık | `<p class="hero__subtitle">` | `₺1.850.000'den başlayan fiyatlarla*` |
| Hero meta | `<p class="hero__meta">` | `Titanium - 2.5L Duratec Benzin` |
| Tab `data-hero-image` | Her tab butonunda | `../assets/images/kuga/ic-tasarim/hero/ic-tasarim.png` |
| Model adı | `<h2 class="model-name">` | `Titanium` (farklıysa değiştirin) |
| Model görsel yolları | `src="..."` ve `data-image="..."` | `../assets/images/kuga/anasayfa/models/titanium/...` |
| Renk swatch yolları | `<img src="...">` (swatch) | `../assets/images/kuga/anasayfa/models/swatches/...` |
| Spec değerleri | `<span class="spec-value">` | Güç, yakıt, CO2, bagaj |
| Feature pills | `<button type="button" class="pill">` | Araca özel özellik isimleri |
| Feature banner görseli | `feature-banner__bg` src | `../assets/images/kuga/anasayfa/featured/...` |
| Feature copy | `<div class="feature-copy">` | Araca özel tanıtım yazısı |
| Opsiyonlar | `.home-option` içerikleri | Görsel, başlık, fiyat, alt yazı |
| Standart özellikler | `.standard-card` içerikleri | Görsel, başlık, açıklama |
| Opsiyon kartları | `.visual-option-card` | Görsel, başlık, açıklama, fiyat |
| Diğer özellikler | `.small-feature` içerikleri | Görsel, başlık, açıklama |
| CO2 görsel ve değer | `.co2` bölümü | Görsel yolu ve değer |
| Tüm `../assets/images/puma/` | Sayfanın tamamında | `../assets/images/kuga/` ile değiştir |

> **En kolay yöntem:** Dosyadaki tüm `puma` yazan yerleri `kuga` ile değiştirin (bul-değiştir), sonra sadece metin ve fiyatları güncelleyin.

---

## Adım 3: Araç Seçim Sayfasına Ekleyin

`index.html` dosyasını açın. `vs-grid` div'i içindeki yorum satırının altına yeni kartı ekleyin:

```html
<a href="vehicles/kuga.html" class="vs-card">
  <img src="assets/images/kuga/anasayfa/hero/anasayfa.png" alt="Ford Kuga">
  <div class="vs-card__info">
    <h2>Ford Kuga</h2>
    <p>₺1.850.000'den başlayan fiyatlarla*</p>
  </div>
</a>
```

---

## ✅ Kontrol Listesi

Sayfayı tarayıcıda açmadan önce:

- [ ] Tüm görseller doğru klasörlerde mi?
- [ ] HTML'deki tüm görsel yolları `../assets/images/kuga/...` şeklinde mi?
- [ ] CSS ve JS yolları `../assets/css/style.css` ve `../assets/js/script.js` mi?
- [ ] Fiyatlar, model adları, özellikler doğru mu?
- [ ] `<title>` etiketi güncellendi mi?

Tarayıcıda kontrol edin:

- [ ] `vehicles/kuga.html` açılıyor mu?
- [ ] 4 tab (Anasayfa, İç Tasarım, Dış Tasarım, Teknoloji) geçişi çalışıyor mu?
- [ ] Renk değiştirici butonları çalışıyor mu?
- [ ] Kırık görsel (404) yok mu? (Tarayıcı konsolunu kontrol edin)
- [ ] `index.html`'deki araç kartı tıklanabilir ve doğru sayfaya yönlendiriyor mu?

---

## 📞 Sorun Giderme

| Sorun | Çözüm |
|---|---|
| Görseller görünmüyor | Yolları kontrol edin. `../` ile başlamalı ve `assets/images/kuga/...` ile devam etmeli |
| Sayfa boş görünüyor | CSS yolu `../assets/css/style.css` olmalı |
| Tab'lar çalışmıyor | JS yolu `../assets/js/script.js` olmalı |
| Renk butonları çalışmıyor | `data-image` attribute'lerinde görsel yollarını kontrol edin |
| 404 hatası | Dosya isimlerinde büyük/küçük harf duyarlılığı olabilir — küçük harf kullanın |
