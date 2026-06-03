# Ford Puma Kiosk - Değişiklik Logu

Bu proje için yapılan tüm değişikliklerin dökümantasyonu.

## 📅 Proje Başlangıcı
- **Tarih:** 22 Mayıs 2025
- **Amaç:** Ford Puma kiosk uygulamasını GitHub Pages'te yayınlamak
- **Repo:** https://github.com/ncdlek/kiosk

---

## 🚀 Temel Değişiklikler

### 1. Git Repository Oluşturma
- `git init` ile repository başlatıldı
- İlk commit: "Initial commit - web page for GitHub Pages"
- GitHub remote: `https://github.com/ncdlek/kiosk.git`
- Default branch: `main` (master branch silindi)

### 2. GitHub Pages Deploy
- Repository GitHub'a pushlandı
- GitHub Pages aktif edildi (kaynak: main branch, root folder)
- **Site:** https://ncdlek.github.io/kiosk/

---

## 🎨 Kod Optimizasyonları

### 3. Font Optimizasyonu (En Büyük Kazanç)
**Öncesi:** 152 MB (11 font dosyası)
**Sonrası:** 34 KB (2 font dosyası)
**Tasarruf:** %99.98

**Yöntem:**
- Variable fontlar kullanıldı (FordF1VF.ttf, FordF1TCVF.ttf)
- WOFF2 formatına çevrildi (brotli compression)
- Subset oluşturuldu (sadece TR + EN karakterler)
- Eski OTF/TTF dosyaları silindi

**Font dosyaları:**
- `FordF1VF.woff2` - 17 KB
- `FordF1TCVF.woff2` - 17 KB

### 4. HTML Standartları
- ✅ `<!DOCTYPE html>` eklendi (öncesi yoktu)
- ✅ `lang="tr"` attribute'i korundu
- ✅ Semantic HTML (section, article, footer) zaten mevcuttu
- ✅ Alt attributes eksiklikleri giderildi

### 5. CSS Temizliği
- Gereksiz yorumlar ve boşluklar temizlendi
- Kullanılmayan `visual-option-card--light` styles düzeltildi
- `simple-option-card` styles tamamen yazıldı
- Format düzenlemesi yapıldı

### 6. JS Modernizasyonu
- Kod formatı düzeltildi
- Yorumlar eklendi (tab switching, color switcher, feature pills)
- Modern ES6 syntax kullanıldı
- Kod organizasyonu iyileştirildi

---

## 🔧 İçerik Düzeltmeleri

### 7. Hero Overlay Kaldırma
- Karartma efekti (gradient overlay) kaldırıldı
- Görseller artık filigransız görünüyor
- CSS: `.hero__overlay` silindi
- HTML: `<div class="hero__overlay"></div>` silindi

### 8. Tab Düzenlemeleri
- **AKSESUAR tabı** kaldırıldı (5'ten 4'e)
- Tab altı gölge efekti kaldırıldı (`box-shadow`)
- 4 tab eşit genişlikte:
  - ANASAYFA
  - İÇ TASARIM
  - DIŞ TASARIM
  - TEKNOLOJİ

### 9. Feature Pills Düzeltme
**Öncesi:** "80L MegaBox" 3 kez tekrarlanıyordu (kopyala hatası)
**Sonrası:** Unique pill'ler
- Dijital Kokpit
- Panoramik Cam Tavan
- Matrix LED Farlar
- 80L MegaBox

### 10. Viewport Meta Tag Kaldırma
Kiosk uygulaması olduğu için responsive gerekmiyor:
```html
<!-- Kaldırıldı -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## 📊 Dosya Özeti

### Yeni Dosyalar
- `CHANGES.md` - Bu dökümantasyon

### Değiştirilen Dosyalar
- `index.html` - DOCTYPE, overlay kaldırma, tab düzeltmeleri
- `assets/css/style.css` - Font referansları, overlay/tab shadow kaldırma
- `assets/js/script.js` - Modernizasyon ve yorumlar

### Silinen Dosyalar
- `assets/fonts/*.otf` - 9 dosya (FordF1, FordF1TC weights)
- `assets/fonts/*.ttf` - 2 dosya (Variable fontlar, WOFF2'a çevrildiler)

---

## 🌐 Canlı Site

**URL:** https://ncdlek.github.io/kiosk/

**Teknik Özellikler:**
- Fixed size: 1080px × 1920px (Kiosk)
- Format: Statik HTML/CSS/JS
- Fontlar: WOFF2 (34 KB toplam)
- Deploy: GitHub Pages

---

## 📝 Yapılacaklar (Gelecek)

- [ ] Görsel optimizasyonu (PNG → WebP dönüşümü, şu an 8.2MB)
- [ ] Fiyat bilgileri güncellemesi (mümkünse)
- [ ] CO2 görselleri alternatifleri (klasör yapısı kontrolü)

---

## 💡 Öğrenilenler

1. **Font optimizasyonu WOFF2 + subset ile inanılmaz tasarruf sağlar**
2. **DOCTYPE eksikliği quirks mode'a neden olur - kiosk için bile önemli**
3. **GitHub Pages statik site deploy için mükemmel**
4. **Variable fontlar disk alanında büyük ama subset ile çok küçülür**

---

*Son güncelleme: 3 Haziran 2026*
