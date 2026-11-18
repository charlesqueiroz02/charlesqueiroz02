#!/usr/bin/env bash
# Gera o app do Dicta AI para a Play Store (AAB) e para instalar direto (APK).
#
# Requisitos: JDK 17+, Node.js 20+, Android SDK com platforms;android-36 (ANDROID_HOME).
# A chave de envio (upload key) vem SEMPRE do ambiente — nunca escreva a senha em arquivo:
#   export DICTA_KEYSTORE=/caminho/fora/do/repo/dicta-release.keystore
#   export DICTA_KS_PASS='senha-do-keystore'
#   ./android/build.sh
set -euo pipefail
cd "$(dirname "$0")"

: "${ANDROID_HOME:?Defina ANDROID_HOME com o caminho do Android SDK}"
: "${DICTA_KS_PASS:?Defina DICTA_KS_PASS com a senha do keystore (export DICTA_KS_PASS=...)}"
: "${DICTA_KEYSTORE:?Defina DICTA_KEYSTORE com o caminho do keystore (fora do repositório)}"
if [ ! -f "$DICTA_KEYSTORE" ]; then
  echo "ERRO: keystore não encontrado em $DICTA_KEYSTORE." >&2
  echo "A Play Store só aceita versões assinadas com a mesma chave de envio já registrada." >&2
  exit 1
fi
export DICTA_KEYSTORE DICTA_KS_PASS

echo "1/3 App web -> assets/www"
( cd ../app && npm ci --silent && npm run build --silent >/dev/null )
rm -rf assets/www && mkdir -p assets && cp -r ../app/dist assets/www

echo "2/3 Gradle: AAB (Play Store) + APK (instalação direta)"
./gradlew --no-daemon -q bundleRelease assembleRelease

echo "3/3 Saídas"
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' build.gradle.kts)
mkdir -p build/dist
cp build/outputs/bundle/release/*.aab "build/dist/DictaAI-v$VERSION.aab"
cp build/outputs/apk/release/*-release.apk "build/dist/DictaAI-v$VERSION.apk"
ls -lh build/dist/
