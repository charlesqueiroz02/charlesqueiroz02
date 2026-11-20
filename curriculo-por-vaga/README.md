# Currículo por Vaga — v2.0

Gera um currículo e uma carta de apresentação ajustados a cada vaga: mede a aderência como um ATS mede, revisa o texto como um recrutador revisaria e guarda o histórico de candidaturas. Tudo roda no aparelho, sem conta e sem servidor.

## Estrutura
- `web/index.html`: o app completo em um arquivo. Abra no navegador (Chrome, Edge, Safari). É o mesmo arquivo usado dentro do APK.
- `android/projeto-apktool/`: código-fonte do app Android (WebView em smali).
  - `AndroidManifest.xml`: pacote `com.charles.curriculo`, versão 2.0 (code 2), minSdk 21, targetSdk 34.
  - `smali/.../MainActivity.smali`: WebView que carrega `assets/index.html`.
  - `smali/.../Bridge.smali` e `Task.smali`: ponte `Android.copy()`, `Android.print()` (PDF A4) e `Android.share()`.
  - `assets/index.html`: cópia de `web/index.html`.

## Avaliação da versão 1.0
| Ponto | Problema | Impacto |
|---|---|---|
| Dados pessoais fixos no código | Nome, telefone, e-mail, empresa e o histórico profissional estavam gravados no app, no resumo e na carta | Ninguém além do autor conseguia usar; quem instalasse o APK via os dados de contato dele |
| Dicionário só de PCP | Cerca de 45 termos de indústria | Para vagas de TI, vendas, finanças ou RH, a aderência ficava em 0% |
| Aderência medida na lista de competências | Bastava marcar a competência no perfil, mesmo que ela não aparecesse no currículo | O número não refletia o que o ATS lê |
| Requisito e diferencial com o mesmo peso | “Inglês será um diferencial” pesava igual a “ERP obrigatório” | Nota distorcida |
| Uma empresa só | Todos os cargos ficavam sob a mesma empresa | Não servia para quem trocou de emprego |
| Sem revisão de qualidade | Só contava os [colchetes] | Bullets sem número e verbos fracos passavam sem aviso |
| Dados só no navegador, sem backup | Limpar o cache ou trocar de celular apagava tudo | Perda de dados |
| Exclusão sem desfazer | “Confirmar” ficava armado para sempre | Risco de apagar sem querer |
| Sem PDF/.doc na versão web | Só copiar | Mais passos para enviar |
| Acessibilidade | Abas sem navegação por teclado; aviso (toast) não lido por leitor de tela | Fora do padrão WCAG |

## O que mudou na 2.0
- **Serve para qualquer pessoa.** Na primeira abertura aparece um exemplo fictício (Mariana Alves Ribeiro) e o botão “Começar o meu currículo”. Os dados de quem já usava a 1.0 são migrados automaticamente (mesma chave de armazenamento) e nada se perde.
- **Motor de palavras-chave novo:**
  - cerca de 110 termos de indústria, gestão, vendas, marketing, finanças, RH, TI e competências comportamentais;
  - detecção automática de siglas e ferramentas que não estão no dicionário (ex.: `FastAPI`, `C++`, `IATF`);
  - competências personalizadas: o que você adicionar vira palavra-chave.
- **Aderência como o ATS mede:**
  - conta só o que aparece no texto final do currículo;
  - separa “já está no currículo”, “está no seu perfil, mas não saiu” e “falta”;
  - requisito pesa 1, diferencial pesa 0,5 e o que aparece só em “Benefícios” ou “Sobre a empresa” é ignorado.
- **Várias experiências:**
  - cada cargo tem empresa, período e limite de bullets próprios, e dá para reordenar ou remover;
  - cargos seguidos na mesma empresa saem agrupados, mostrando a evolução de carreira.
- **Aba Revisão**, com avisos ordenados por gravidade:
  - [colchetes] não preenchidos e contato incompleto;
  - LinkedIn ausente;
  - aderência e requisitos sem menção;
  - bullets sem número (modelo XYZ), com verbo fraco (“Responsável por…”), longos ou curtos demais, e verbos repetidos;
  - resumo longo, número de páginas e formação vazia.
- **Resumo e carta gerados a partir dos seus dados:** anos de experiência calculados pelos períodos, cargo atual e a realização com número mais ligada à vaga.
- **3 modelos visuais seguros para ATS** (Clássico, Moderno e Compacto), todos em uma coluna e sem tabelas.
- **Exportação:** Copiar para Word, Copiar texto, Salvar PDF (também na web) e Baixar .doc. No Android, o botão Compartilhar.
- **Candidaturas:**
  - etapas Salva, Enviada, Entrevista, Proposta e Não avançou, com contagem por etapa;
  - guarda o texto exato enviado a cada empresa (“Copiar o que enviei”).
- **Backup:**
  - exportar e importar (por arquivo ou colando o texto) e “Apagar tudo”;
  - toda exclusão tem **Desfazer**.
- **Acessibilidade:** abas navegáveis por setas, Home e End; avisos com `aria-live`; respeita o modo escuro e a redução de movimento; margens seguras no celular.

## Como recompilar o APK
Requisitos: Java 11+, Apktool 2.10.0 e uber-apk-signer 1.3.0 (ambos no GitHub).

```
java -jar apktool_2.10.0.jar b android/projeto-apktool -o unsigned.apk
java -jar uber-apk-signer-1.3.0.jar -a unsigned.apk -o saida
```

Para mudar o app, edite `web/index.html`, copie para `android/projeto-apktool/assets/index.html` e recompile.

## Próximos passos para a Play Store
1. **targetSdk 35 ou mais**: a Play exige isso para apps novos e atualizações. No Android 15, o app passa a ocupar a tela inteira (edge-to-edge); o CSS já usa `safe-area-inset`, mas teste num aparelho com Android 15.
2. **Assinar com chave de release** (keystore própria) e gerar **AAB**. O caminho mais simples é migrar para um projeto Gradle, como o do `dicta-ai/android` neste repositório.
3. **Backup/importação nativos**: hoje, no Android, o backup sai por Compartilhar e a restauração é feita colando o texto. Um `DownloadListener` e um `onShowFileChooser` na WebView permitiriam salvar e abrir arquivos.
4. **Fontes offline**: as fontes vêm do Google Fonts; sem internet, o app usa as fontes do sistema. Para ficar idêntico offline, embuta os arquivos `.woff2` em `assets/`.
5. **IA opcional**: reescrever bullets no modelo XYZ e adaptar o resumo com um modelo de linguagem, com a chave do usuário ou um backend próprio.
