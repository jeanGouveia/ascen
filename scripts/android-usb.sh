#!/usr/bin/env bash
# Android via USB: exige Metro em outro terminal; instala APK e abre em localhost:8081.
set -euo pipefail
cd "$(dirname "$0")/.."

METRO_PORT=8081
METRO_URL="http://127.0.0.1:${METRO_PORT}"
DEEP_LINK='exp+ascen://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'

metro_ready() {
  curl -sf "${METRO_URL}/status" >/dev/null 2>&1
}

echo "→ adb reverse tcp:${METRO_PORT}…"
adb reverse tcp:"${METRO_PORT}" tcp:"${METRO_PORT}" || {
  echo "Erro: conecte o celular com depuração USB."
  exit 1
}

export REACT_NATIVE_PACKAGER_HOSTNAME=localhost

if [[ "${1:-}" != "run" ]]; then
  echo ""
  echo "Metro em localhost:${METRO_PORT} — mantenha ESTE terminal aberto."
  echo "Em outro terminal, para compilar: npm run android"
  echo ""
  exec npx expo start --dev-client --localhost --port "${METRO_PORT}"
fi

shift || true

if ! metro_ready; then
  echo ""
  echo "❌ Metro não está rodando."
  echo ""
  echo "   Terminal 1:  npm run start:usb    (deixe aberto — é aqui que ficam os logs)"
  echo "   Terminal 2:  npm run android      (só compila e instala; pode fechar depois)"
  echo ""
  exit 1
fi

echo "→ Metro OK. Compilando e instalando…"
npx expo run:android --no-bundler "$@"

echo "→ Abrindo app em localhost:${METRO_PORT}…"
adb shell am force-stop com.anonymous.ascen 2>/dev/null || true
adb shell am start -a android.intent.action.VIEW -d "${DEEP_LINK}"

echo ""
echo "✓ APK instalado. O Metro continua no outro terminal (npm run start:usb)."
