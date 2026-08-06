#!/usr/bin/env bash
#
# Doğrula → push et → deploy'u tetikle → sonucu bekle.
#
# `on: push` tetikleyicisi bu repoda çalışmıyor (sebebi tespit edilemedi),
# bu yüzden deploy elle tetikleniyor. Bu betik iki adımı birleştirip
# tetiklemenin unutulmasını engeller.
#
#   ./deploy.sh

set -euo pipefail

cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "✗ gh (GitHub CLI) bulunamadı: brew install gh"; exit 1; }

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "✗ main dalında değilsiniz (şu an: $BRANCH). Deploy yalnızca main'den yapılır."
  exit 1
fi

# 1) Veriyi doğrula — bozuksa push bile etme.
echo "▸ Doğrulanıyor"
node build.js --check

# 2) Commit'lenmemiş değişiklik varsa uyar.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Commit'lenmemiş değişiklik var. Önce commit'leyin:"
  git status --short
  exit 1
fi

# 3) Push (zaten güncelse git kendisi 'Everything up-to-date' der).
echo "▸ Push ediliyor"
git push origin main

# 4) Deploy'u tetikle.
echo "▸ Deploy tetikleniyor"
gh workflow run deploy.yml --ref main

# Çalışmanın kaydedilmesi bir iki saniye sürüyor.
echo "▸ Çalışma bekleniyor"
RUN_ID=""
for _ in $(seq 1 15); do
  sleep 2
  RUN_ID=$(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)
  [ -n "$RUN_ID" ] && break
done

if [ -z "$RUN_ID" ]; then
  echo "! Çalışma bulunamadı. Actions sekmesinden kontrol edin."
  exit 1
fi

# 5) Sonucu bekle. Build kırılırsa exit-status sıfırdan farklı döner.
gh run watch "$RUN_ID" --exit-status --interval 5

echo
echo "✓ Yayında: https://ncdlek.github.io/kiosk/"
