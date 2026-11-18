# Dicta AI — projeto-fonte

- `app/` → app web (React + Vite + Tailwind). IA via Gemini direto do aparelho. Ver `app/README.md`.
- `android/` → casca nativa (WebView) + teclado de sistema (InputMethodService) em Java.
- `docs/` → material da Play Store: passo a passo do Play Console, ficha da loja, política de
  privacidade, guia dos testadores e imagens. Ver `docs/README.md`.

## Gerar o app para a Play Store (AAB) e o APK de teste
Requisitos: JDK 17+, Node.js 20+ e Android SDK com `platforms;android-36` (Android Studio
instala tudo; sem ele, use o *command-line tools* e
`sdkmanager "platforms;android-36" "build-tools;36.1.0"`).

    export ANDROID_HOME=/caminho/do/android-sdk
    export DICTA_KEYSTORE=/caminho/seguro/dicta-release.keystore   # fora do repositório
    export DICTA_KS_PASS='senha-do-keystore'
    ./android/build.sh
    # gera android/build/dist/DictaAI-v<versão>.aab (Play Store) e .apk (instalar direto)

- Projeto Gradle em `android/` (AGP 9.5, Gradle 9.9 via `./gradlew`), mantendo
  `AndroidManifest.xml`, `src/`, `res/` e `assets/` nas mesmas pastas.
- Pacote: **`com.dictaai.app`** (permanente na Play Store). `targetSdk` 36, `minSdk` 24.
- **Versão:** em `android/build.gradle.kts` (`versionCode` e `versionName`). Aumente os dois
  a cada envio à Play Store.

## IMPORTANTE — chaves de assinatura
- **Play App Signing:** o Google gera e guarda a chave que assina o app entregue aos
  usuários. O seu `dicta-release.keystore` é só a **chave de envio** (upload key): é com
  ela que cada AAB precisa ser assinado para o Play Console aceitar. Se perdê-la, o Google
  permite registrar outra pelo Play Console (suporte).
- O keystore (`*.keystore`) **não** fica no git: este repositório é público.
- Guarde o keystore e a senha em local seguro (gerenciador de senhas / backup offline).
- A senha é lida de `DICTA_KS_PASS`; nunca a escreva em arquivos versionados.

## Testes
    cd app && npm run lint && npm test && npm run build

## Versão 2.1.0 — preparação para a Play Store
- Build com Gradle gerando **AAB** (formato exigido pela loja) e APK; `build-apk.sh`
  substituído por `build.sh`.
- Pacote novo `com.dictaai.app` (instala ao lado da versão antiga `com.charles.dicta`;
  desinstale a antiga depois de exportar o backup em Preferências).
- `targetSdk` 36 (exigência da Play Store desde 31/08/2026): tela de ponta a ponta com
  margens para barras do sistema e teclado; gesto voltar no Android 13+ pela API nova.
- Dados fora do backup na nuvem **e** da transferência para outro celular
  (`data_extraction_rules.xml`): no Android 12+, `allowBackup=false` sozinho não bloqueia
  a transferência, e a chave da IA iria junto.
- Correções do lint do Android (formatação de texto independente do idioma do aparelho).
- Histórico: datas sempre no formato brasileiro (dd/mm/aaaa 24 h) e filtro "E-mail" sem
  quebrar linha.

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
