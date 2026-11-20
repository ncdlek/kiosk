# Ford Kiosk — ajan kuralları

Mimari ve komutlar için `README.md`. Bu dosya yalnızca içerik değişikliği yaparken uyulacak kuralları içerir.

## Değişiklik kapsamı

Kullanıcı bir model, donanım veya versiyon adı verdiyse (ör. "Capri Premium 140 kW", "Explorer Select") değişiklik **yalnızca o sayfayı** etkilemeli. Başka sayfalara yansıması istenmiyorsa yansımamalı.

- `data/<aile>.base.json` aynı ailedeki **tüm** donanım/versiyon sayfalarını besler. Orada yapılan her değişiklik hepsine gider.
- Tek bir donanım için `data/<aile>-<donanım>.json` düzenlenir. Tek bir versiyon için o dosyadaki `versions[].tabs` override'ı kullanılır. Bölüm listeleri dizi olduğu için override'da dizinin **tamamı** yazılır (bkz. `capri-premium.json`, 140KW).
- Bir dosyayı düzenlemeden önce hangi sayfaları besleyeceğini belirle. Hedef dışındaki sayfaları da etkiliyorsa base'e yazma, override kullan.
- İstek hangi versiyonları kapsadığını belirtmiyorsa (ör. sadece "Premium'da") ve etkilenen sayfa birden fazlaysa, yazmadan önce sor.
- "Sadece X'te" ile "X'te de" farklıdır. Kullanıcı bir değişikliğin başka modelde olacağını söylemediyse olmadığını varsay.

## Doğrulama

Değişiklikten sonra `node build.js` yerine şunu çalıştır:

```bash
node tools/changed-pages.js
```

Build'i yapar ve içeriği değişen sayfaları listeler. Liste, kullanıcının istediği sayfalarla birebir örtüşmeli. Fazladan sayfa varsa kapsamı aştın: değişikliği geri alıp override'a taşı.

`dist/` üretilir ve commit'lenmez. Elle düzenleme.

## Kullanıcıya bildirme

Bitirince hangi sayfaların değiştiğini söyle. Kullanıcının istemediği bir sayfaya dokunmadığını `changed-pages.js` çıktısına dayanarak belirt.
