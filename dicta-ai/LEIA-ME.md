# Dicta AI 2.0 — projeto-fonte

- `app/` → app web (React + Vite + Tailwind). IA via Gemini direto do aparelho. Ver `app/README.md`.
- `android/` → casca nativa (WebView) + teclado de sistema (InputMethodService) em Java.

## Recompilar o APK (Linux/Ubuntu)
    sudo apt install openjdk-21-jdk-headless aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
    cd app && npm install && cd ..
    export DICTA_KS_PASS='senha-do-keystore'
    export DICTA_KEYSTORE=/caminho/seguro/dicta-release.keystore   # fora do repositório
    ./android/build-apk.sh      # gera android/build/DictaAI-v<versão>.apk

A versão (`versionCode`/`versionName`) é lida do `AndroidManifest.xml`: para lançar uma
atualização, aumente as duas lá.

## IMPORTANTE — chave de assinatura
- O keystore (`*.keystore`) **não** fica no git: este repositório é público e qualquer
  pessoa com o arquivo + senha poderia assinar APKs como se fossem seus.
- Guarde o keystore e a senha em local seguro (gerenciador de senhas / backup offline).
  Atualizações futuras precisam ser assinadas com a MESMA chave, senão o Android não
  instala por cima.
- A senha é lida de `DICTA_KS_PASS`; nunca a escreva em arquivos versionados.
- O script se recusa a criar uma chave nova se não encontrar o keystore. Para criar uma de
  propósito (perde a atualização por cima das instalações atuais): `DICTA_NEW_KEYSTORE=1`.

## Testes
    cd app && npm run lint && npm test && npm run build

## Versão 2.0.1 — correção do erro de modelo
- O Google deixou de liberar os modelos Gemini 2.5 para chaves novas ("This model
  models/gemini-2.5-flash is no longer available to new users"). A fila automática agora é
  3.5 Flash-Lite → Flash-Lite mais recente → 3.8 Flash → Flash mais recente (Flash-Lite
  primeiro por ser mais barato), no app e no teclado.
- Modelo indisponível é pulado sem contar como tentativa e fica lembrado para aquela chave.
- Preferência salva com modelo antigo volta sozinha para "Automático".
- Erros da IA aparecem sempre em português; o mais útil (ex.: limite atingido) é o mostrado.
- Limite 429 com espera curta indicada pelo Google é repetido automaticamente.

## Alterações da revisão de novembro/2026

Segurança
- Keystore e senha fora do repositório; script lê a senha do ambiente.
- `android:allowBackup="false"`: a chave do Gemini não vai mais para o backup do Android.
- Backup importado e dados do `localStorage` são validados (antes um arquivo malformado
  deixava a tela em branco); `ErrorBoundary` mostra uma tela de recuperação.

Correções
- Chamadas à IA: no máximo 3 modelos, 45 s cada, 120 s no total (antes até ~9 min).
- Microfone é liberado se a gravação não conseguir iniciar.
- Comando de edição que volta vazio não apaga mais o texto.
- Troca de estilo bloqueada enquanto a IA processa (respostas fora de ordem).
- "Arquivo processado" só aparece quando deu certo.
- Vícios com acento ("né", "ééé") agora são destacados na comparação.
- Filtro do histórico inclui Ata e Resumo.
- Preferências de som e vibração (agora separadas) valem em todo o app e no teclado.
- Upload de áudio: limite de 14 MB, erros visíveis, reenvio do mesmo arquivo.

Desempenho
- Volume durante a gravação atualiza a tela ~15×/s em vez de ~60×/s.
- jsPDF carregado só ao exportar: bundle inicial de 722 kB para 330 kB.
- Teclado nativo não relê/parseia a configuração a cada toque.

Acessibilidade
- Zoom liberado; modais com `role="dialog"`, Esc e retorno de foco; rótulos em todos os
  botões de ícone e campos; `aria-live` para status e avisos; contraste melhor.

Qualidade
- Vitest com testes da lógica pura; lista de estilos centralizada; código morto removido.
