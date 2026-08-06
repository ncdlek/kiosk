#!/usr/bin/env bash
#
# Doğrula → push et → deploy'u izle.
#
# Push normalde iş akışını kendisi tetikler. Tetiklemezse bu betik elle
# tetikler. Her iki durumda da PUSH EDİLEN COMMIT'in çalışması izlenir —
# "en son çalışma"ya bakmak yanlış, çünkü araya başka bir çalışma girebilir.
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

# Bu commit için bir çalışma var mı? Push tetikleyicisi çalışıyorsa birkaç
# saniyede belirir.
run_for_sha() {
  gh api "repos/{owner}/{repo}/actions/workflows/deploy.yml/runs?per_page=20" \
    --jq "[.workflow_runs[] | select(.head_sha == \"$SHA\")] | first | .id // empty" 2>/dev/null || true
}

echo "▸ Çalışma bekleniyor"
RUN_ID=""
for _ in $(seq 1 6); do
  sleep 3
  RUN_ID=$(run_for_sha)
  [ -n "$RUN_ID" ] && { echo "  push tetikledi"; break; }
done

# Tetiklenmediyse elle tetikle.
if [ -z "$RUN_ID" ]; then
  echo "  push tetiklemedi, elle tetikleniyor"
  gh workflow run deploy.yml --ref main
  for _ in $(seq 1 15); do
    sleep 3
    RUN_ID=$(run_for_sha)
    [ -n "$RUN_ID" ] && break
  done
fi

if [ -z "$RUN_ID" ]; then
  echo "✗ $SHA için çalışma bulunamadı. Actions sekmesinden kontrol edin."
  exit 1
fi

echo "  https://github.com/ncdlek/kiosk/actions/runs/$RUN_ID"

# gh run watch iptal edilen çalışmalarda güvenilir bir çıkış kodu vermiyor;
# sonucu bittikten sonra kendimiz okuyoruz.
gh run watch "$RUN_ID" --interval 5 >/dev/null 2>&1 || true

CONCLUSION=$(gh api "repos/{owner}/{repo}/actions/runs/$RUN_ID" --jq .conclusion)
if [ "$CONCLUSION" != "success" ]; then
  echo
  echo "✗ Deploy başarısız: $CONCLUSION"
  echo "  https://github.com/ncdlek/kiosk/actions/runs/$RUN_ID"
  exit 1
fi

echo
echo "✓ Yayında: https://ncdlek.github.io/kiosk/"
