# Dicta AI 2.0 — projeto-fonte

- `app/` → app web (React + Vite + Tailwind). IA via Gemini direto do aparelho.
- `android/` → casca nativa (WebView) + teclado de sistema (InputMethodService) em Java.

## Recompilar o APK (Linux/Ubuntu)
    sudo apt install openjdk-21-jdk-headless aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
    cd app && npm install && cd ..
    export DICTA_KS_PASS='senha-do-keystore'
    export DICTA_KEYSTORE=/caminho/seguro/dicta-release.keystore   # fora do repositório
    ./android/build-apk.sh      # gera android/build/DictaAI-v<versão>.apk

## IMPORTANTE — chave de assinatura
- O keystore (`*.keystore`) **não** fica no git: este repositório é público e qualquer
  pessoa com o arquivo + senha poderia assinar APKs como se fossem seus.
- Guarde o keystore e a senha em local seguro (gerenciador de senhas / backup offline).
  Atualizações futuras precisam ser assinadas com a MESMA chave, senão o Android não
  instala por cima.
- A senha é lida de `DICTA_KS_PASS`; nunca a escreva em arquivos versionados.
