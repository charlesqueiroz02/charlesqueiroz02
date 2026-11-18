# Dicta AI — app web

Estúdio de ditado por voz com IA. Você fala do jeito que quiser e o Gemini devolve o texto
limpo (sem "né", "tipo assim", hesitações e autocorreções) no estilo escolhido: chat, e-mail,
tópicos, ata de reunião, literal, LinkedIn ou resumo.

Roda 100% no aparelho: não há servidor. A chave do Gemini fica só no `localStorage` do
navegador (ou do WebView, dentro do APK) e as chamadas vão direto para o Google.

## Rodar localmente

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Na primeira abertura o app pede uma chave gratuita do Gemini (Preferências › Chave da IA,
gerada em https://aistudio.google.com/apikey). Não é preciso `.env`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção em `dist/` (usado pelo APK) |
| `npm run lint` | checagem de tipos (`tsc --noEmit`) |
| `npm test` | testes unitários (Vitest) |

## Estrutura

```
src/
  App.tsx                 estado principal, gravação e chamadas à IA
  main.tsx                entrada (com ErrorBoundary)
  types/index.ts          tipos e lista única de estilos (DICTATION_MODES)
  lib/
    gemini.ts             cliente Gemini (fila de modelos, limites de tempo, prompts)
    modes.ts              rótulos/ícones/cores dos estilos
    native.ts             ponte com o app Android (window.DictaNative)
    useDialog.ts          Esc/foco para modais
  utils/
    speech.ts             gravação (MediaRecorder) e conversão para WAV 16 kHz
    audio.ts              sons e vibração (respeitam as Preferências)
    backup.ts             validação de backup e de dados salvos
    fillers.ts            destaque dos vícios removidos
    pdfExport.ts          exportação em PDF (jsPDF carregado sob demanda)
    stats.ts, id.ts, clipboard.ts
  components/             telas e modais
```

Os testes ficam ao lado do código (`*.test.ts`) e cobrem a lógica pura: parse da resposta da
IA, fila de modelos e limites de tentativas, validação de backup, regex de vícios, WAV,
preferências de som/vibração e validação de upload.

## Notas

- A lógica de prompt existe em duas cópias: `src/lib/gemini.ts` (app) e
  `android/src/com/dictaai/app/Gemini.java` (teclado nativo). Ao mudar uma, mude a outra.
- A lista de modelos (`AUTO_MODELS`) também existe nas duas cópias. Modelos 1.x/2.x são
  tratados como aposentados (`isRetiredModel`) e nunca são chamados.
- Uploads de áudio têm limite de 14 MB (o Gemini aceita ~20 MB por requisição em base64).
- Backups exportados nunca incluem a chave da IA; ao importar, tudo é validado.
