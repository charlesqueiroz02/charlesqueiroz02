#!/usr/bin/env bash
# Gera o APK do Calistenia Asiática.
# Requisitos: JDK 17+, Node.js 20+, Android SDK com platforms;android-36 (ANDROID_HOME).
# Assinatura (sempre pelo ambiente, nunca em arquivo versionado):
#   export CALIS_KEYSTORE=/caminho/fora/do/repo/calistenia.keystore
#   export CALIS_KS_PASS='senha'
#   ./android/build.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:?Defina ANDROID_HOME com o caminho do Android SDK}"
: "${CALIS_KEYSTORE:?Defina CALIS_KEYSTORE}"
: "${CALIS_KS_PASS:?Defina CALIS_KS_PASS}"

echo "1/3 App web -> assets/www"
( cd .. && npm ci --silent && npm run build --silent >/dev/null )
rm -rf assets/www && mkdir -p assets && cp -r ../dist assets/www

echo "2/3 Gradle"
./gradlew --no-daemon -q assembleRelease

echo "3/3 Saída"
VERSION=$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' build.gradle.kts)
mkdir -p build/dist
cp build/outputs/apk/release/*-release.apk "build/dist/CalisteniaAsiatica-v$VERSION.apk"
ls -lh build/dist/
