#!/usr/bin/env bash
#
# Doğrula → push et → her iki yayının da çıkmasını bekle.
#
# Geçiş dönemi: site aynı anda iki yerde yayında.
#
#   GitHub Pages       .github/workflows/deploy.yml build eder
#   Cloudflare Workers repoya bağlı, kendi altyapısında build eder
#
# İkisi de aynı push'la tetiklenir, ikisi de `node build.js` çalıştırır. Tek
# gerçek kaynak yine data/ + src/ olduğu için içerikleri ayrışmaz.
#
# Beklemenin yolu build.txt: build.js, build ettiği commit'in SHA'sını
# dist/build.txt içine yazıyor. Her iki adresteki değer push edilen SHA'ya
# dönene kadar yokluyoruz. Ne `gh` ne de Cloudflare API token'ı gerekiyor —
# ve "yayında" derken bir panele değil, sitelerin kendisine bakmış oluyoruz.
#
#   ./deploy.sh
#
# Worker adı ya da hesap alt alanı değişirse:
#   CF_URL=https://<worker>.<hesap>.workers.dev ./deploy.sh

set -euo pipefail

cd "$(dirname "$0")"

GH_URL="${GH_URL:-https://ncdlek.github.io/kiosk}"
CF_URL="${CF_URL:-https://ford-kiosk.ferikoy.workers.dev}"
TIMEOUT=300   # saniye

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "✗ main dalında değilsiniz (şu an: $BRANCH). Deploy yalnızca main'den yapılır."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Commit'lenmemiş değişiklik var. Önce commit'leyin:"
  git status --short
  exit 1
fi

echo "▸ Doğrulanıyor"
node build.js --check

echo "▸ Push ediliyor"
git push origin main
SHA=$(git rev-parse HEAD)
echo "  $SHA"

# Sitedeki build.txt'i okur. Cache-buster + no-cache: edge'de duran eski bir
# kopyayı "yayına çıktı" sanmayalım.
live_sha() {
  curl -fsS -H 'Cache-Control: no-cache' "$1/build.txt?ts=$SECONDS" 2>/dev/null | tr -d '[:space:]' || true
}

echo "▸ Yayın bekleniyor"
echo "  GitHub      $GH_URL"
echo "  Cloudflare  $CF_URL"

DEADLINE=$(( SECONDS + TIMEOUT ))
GH_LIVE=""
CF_LIVE=""
GH_OK=0
CF_OK=0

while [ "$SECONDS" -lt "$DEADLINE" ]; do
  if [ "$GH_OK" -eq 0 ]; then
    GH_LIVE=$(live_sha "$GH_URL")
    if [ "$GH_LIVE" = "$SHA" ]; then GH_OK=1; echo "  ✓ GitHub"; fi
  fi
  if [ "$CF_OK" -eq 0 ]; then
    CF_LIVE=$(live_sha "$CF_URL")
    if [ "$CF_LIVE" = "$SHA" ]; then CF_OK=1; echo "  ✓ Cloudflare"; fi
  fi
  if [ "$GH_OK" -eq 1 ] && [ "$CF_OK" -eq 1 ]; then break; fi
  sleep 5
done

echo
if [ "$GH_OK" -eq 1 ] && [ "$CF_OK" -eq 1 ]; then
  echo "✓ Her ikisi de yayında:"
  echo "  $GH_URL/"
  echo "  $CF_URL/"
  exit 0
fi

# Biri çıkıp diğeri çıkmadıysa da hata veriyoruz: iki yayının ayrışmış olması
# geçiş döneminde en tehlikeli durum — bayiye eski fiyat gösteren bir kopya
# kalır. Hangisinin geri kaldığı aşağıda yazıyor.
echo "✗ $(( TIMEOUT / 60 )) dakikada iki yayın da çıkmadı. Beklenen: $SHA"
echo
if [ "$GH_OK" -eq 1 ]; then
  echo "  ✓ GitHub      $GH_URL/"
else
  echo "  ✗ GitHub      sürüm: ${GH_LIVE:-okunamadı}"
  echo "                https://github.com/ncdlek/kiosk/actions"
fi
if [ "$CF_OK" -eq 1 ]; then
  echo "  ✓ Cloudflare  $CF_URL/"
else
  echo "  ✗ Cloudflare  sürüm: ${CF_LIVE:-okunamadı}"
  echo "                https://dash.cloudflare.com/?to=/:account/workers/services/view/ford-kiosk"
fi
exit 1
