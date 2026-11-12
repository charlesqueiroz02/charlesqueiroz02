#!/usr/bin/env bash
# Compila o APK do Dicta AI sem Gradle (aapt2 + javac + dx + apksigner)
set -euo pipefail
cd "$(dirname "$0")"
ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
KEYSTORE=${DICTA_KEYSTORE:-dicta-release.keystore}
: "${DICTA_KS_PASS:?Defina DICTA_KS_PASS com a senha do keystore (export DICTA_KS_PASS=...)}"
export DICTA_KS_PASS
# Versão lida do AndroidManifest.xml (fonte única)
VERSION_CODE=$(sed -n 's/.*android:versionCode="\([0-9]*\)".*/\1/p' AndroidManifest.xml)
VERSION_NAME=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' AndroidManifest.xml)
OUT=build; rm -rf $OUT; mkdir -p $OUT/res $OUT/classes $OUT/gen

echo "1/6 Web app -> assets/www"
( cd ../app && npx vite build >/dev/null )
rm -rf assets/www && mkdir -p assets && cp -r ../app/dist assets/www

echo "2/6 Recursos (aapt2)"
aapt2 compile --dir res -o $OUT/res/res.zip
aapt2 link -o $OUT/base.apk -I "$ANDROID_JAR" --manifest AndroidManifest.xml \
  --java $OUT/gen -A assets --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" $OUT/res/res.zip

echo "3/6 Java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" \
  -d $OUT/classes $(find src $OUT/gen -name '*.java')

echo "4/6 DEX"
dalvik-exchange --dex --min-sdk-version=24 --output=$OUT/classes.dex $OUT/classes

echo "5/6 Empacotar + alinhar"
cp $OUT/base.apk $OUT/unsigned.apk
( cd $OUT && zip -q -j unsigned.apk classes.dex )
zipalign -f -p 4 $OUT/unsigned.apk $OUT/aligned.apk

echo "6/6 Assinar"
# A senha vem SEMPRE de variável de ambiente — nunca escreva no script nem no README.
#   export DICTA_KS_PASS='sua-senha'
#   export DICTA_KEYSTORE=/caminho/fora/do/repo/dicta-release.keystore   (opcional)
if [ ! -f "$KEYSTORE" ]; then
  if [ "${DICTA_NEW_KEYSTORE:-0}" != "1" ]; then
    echo "ERRO: keystore não encontrado em $KEYSTORE." >&2
    echo "Aponte DICTA_KEYSTORE para o keystore original (atualizações precisam da MESMA chave)." >&2
    echo "Para criar uma chave nova de propósito, rode com DICTA_NEW_KEYSTORE=1." >&2
    exit 1
  fi
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias dicta -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass:env DICTA_KS_PASS -keypass:env DICTA_KS_PASS \
    -dname "CN=Dicta AI, O=Dicta, C=BR" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-pass env:DICTA_KS_PASS --key-pass env:DICTA_KS_PASS \
  --out $OUT/DictaAI-v$VERSION_NAME.apk $OUT/aligned.apk
apksigner verify --verbose $OUT/DictaAI-v$VERSION_NAME.apk | head -5
ls -lh $OUT/DictaAI-v$VERSION_NAME.apk
