# Play Console — passo a passo para o teste fechado do Dicta AI

Arquivo a enviar: **`DictaAI-v2.1.0.aab`** (pacote `com.dictaai.app`, versão 2.1.0, código 22).
Os nomes dos menus do Play Console mudam de vez em quando; se algum não bater exatamente,
procure pelo termo parecido no menu da esquerda.

---

## 1. Criar o app
**Todos os apps › Criar app**
- **Nome do app:** `Dicta AI: Teclado de Voz`
- **Idioma padrão:** Português (Brasil) – pt-BR
- **App ou jogo:** App
- **Gratuito ou pago:** **Gratuito** ← importante: app "pago" não pode ter assinaturas, e
  um app gratuito nunca pode virar pago depois. O plano Pro será vendido *dentro* do app.
- Marque as declarações (políticas do programa e leis de exportação dos EUA) › **Criar app**.

## 2. Publicar a política de privacidade (obrigatória: o app usa o microfone)
1. Preencha **nome do responsável** e **e-mail de contato** em
   `dicta-ai/docs/politica-de-privacidade.md` (campos `{{...}}`) — ou me envie os dois e eu
   preencho, gero a página e envio para o GitHub.
2. Gere a página: `./dicta-ai/docs/gerar-site.sh` (cria `docs/privacidade.html` na raiz do
   repositório) e envie ao GitHub.
3. No GitHub: repositório **charlesqueiroz02** › **Settings › Pages** › *Build and
   deployment*: **Source: Deploy from a branch** › Branch:
   **`claude/app-analysis-improvement-st3x75`** e pasta **`/docs`** › **Save**.
   (Quando a branch for unida à `main`, troque aqui para `main`.)
4. Em 1–5 minutos a página fica no ar em:
   **`https://charlesqueiroz02.github.io/charlesqueiroz02/privacidade.html`**

## 3. Configurar o app (Painel › "Configure seu app")
Responda cada item:

| Item | Resposta |
|---|---|
| **Política de privacidade** | a URL do passo 2 |
| **Acesso ao app** | *Todas ou algumas funcionalidades são restritas* → instruções abaixo |
| **Anúncios** | Não, o app não contém anúncios |
| **Classificação do conteúdo** | Questionário: categoria de utilitário/produtividade; "Não" para violência, sexo, linguagem, drogas, apostas; usuários **não** interagem entre si; se perguntar sobre **IA generativa**: Sim, o app gera texto com IA a partir da fala do próprio usuário |
| **Público-alvo** | 18 anos ou mais |
| **App de notícias** | Não |
| **Apps governamentais / recursos financeiros / saúde** | Não |
| **Segurança dos dados** | respostas na seção 4 |

**Acesso ao app — chave para a revisão do Google.** A revisão precisa conseguir usar a IA:
1. Em **aistudio.google.com/apikey**, crie uma chave nova num **projeto separado**
   (ex.: "dicta-revisao") **sem faturamento** — assim não há nenhum custo para você.
2. No campo de instruções do Play Console, cole:
   > O app usa a API Google Gemini. Abra o app, toque no ícone de engrenagem
   > (Preferências), cole a chave `COLE-A-CHAVE-AQUI` no campo "Chave da IA" e toque em
   > "Pronto". Depois toque em "Reunião e Prazos" (teste sem microfone) ou no botão "Ditar".
   > Para o teclado: aba "Teclado" › siga os 4 passos.
3. Essa chave só é vista pelo Google. Revogue-a quando o app estiver aprovado.

## 4. Segurança dos dados (Painel › Segurança dos dados)
**Visão geral**
- O app coleta ou compartilha algum dos tipos de dados exigidos? **Sim**
- Todos os dados coletados são criptografados em trânsito? **Sim**
- Contas: o app **não** permite criar conta (não é preciso link de exclusão de conta).

**Tipos de dados** (marque só estes):

| Categoria › tipo | Coletado | Compartilhado | Processado de forma efêmera | Obrigatório ou opcional | Finalidade |
|---|---|---|---|---|---|
| Áudio › Gravações de voz ou som | Sim | Não | Não | Obrigatório | Funcionalidade do app |
| Áudio › Outros arquivos de áudio | Sim | Não | Não | Opcional (só ao importar) | Funcionalidade do app |
| Atividade no app › Outro conteúdo gerado pelo usuário (texto ditado e texto antes do cursor no teclado) | Sim | Não | Não | Obrigatório | Funcionalidade do app |

- "Compartilhado = Não" porque o Google Gemini atua como **prestador de serviço** que processa
  os dados para o app funcionar (é a definição usada pelo próprio Play Console).
- **Não** marque: localização, contatos, identificadores do dispositivo, informações
  financeiras, histórico de navegação, fotos — o app não acessa nada disso.

## 5. Teste fechado
**Testar e lançar › Testes › Teste fechado › Criar faixa** (ou use a faixa "Alpha" pronta).

**5.1 Testadores — use um Grupo do Google**
1. Em **groups.google.com › Criar grupo**: nome "Dicta AI testadores", e-mail do grupo
   ex.: `dicta-ai-testadores@googlegroups.com`; em *Quem pode participar*:
   "Qualquer pessoa pode pedir para participar" (você aprova) ou adicione os e-mails direto.
2. No Play Console, aba **Testadores** › **Grupos do Google** › cole o e-mail do grupo ›
   **Salvar**. Preencha também o **e-mail ou URL de feedback** (pode ser o seu e-mail).
3. Convide **15 a 20 pessoas** (o mínimo é 12 por 14 dias seguidos; folga evita recomeçar).

**5.2 Países:** aba **Países/regiões** › Brasil.

**5.3 Criar a versão**
1. **Criar nova versão**.
2. **Assinatura do app:** na primeira vez o Console pergunta como assinar — escolha
   **"Usar chave de assinatura gerada pelo Google"** (Play App Signing). O seu
   `dicta-release.keystore` passa a ser só a chave de envio; o Google registra o
   certificado dela neste primeiro envio.
3. **Enviar** o arquivo `DictaAI-v2.1.0.aab`.
4. **Nome da versão:** `2.1.0 (22)`.
5. **Notas da versão** (pt-BR):
   ```
   <pt-BR>
   Primeira versão de teste do Dicta AI na Play Store: ditado com IA, teclado de voz em
   qualquer app, 7 estilos de texto e edição por voz.
   </pt-BR>
   ```
6. **Avançar › Salvar › Enviar para revisão** (na tela "Visão geral da publicação").

A revisão costuma levar de algumas horas a poucos dias.

## 6. Pegar o link de participação
Depois de aprovado: **Teste fechado › aba Testadores** › seção **"Como os testadores
participam"** › copie o link **"Participar no Android"**. Formato:
`https://play.google.com/apps/testing/com.dictaai.app`

Mande o link junto com a mensagem pronta de `guia-testadores.md`.

## 7. Durante os 14 dias
- Confira em **Teste fechado › Testadores** quantos estão inscritos (precisa ficar ≥ 12).
- Atualizações (ex.: plano Pro, servidor) chegam aos testadores pela Play Store — cada AAB
  novo precisa de `versionCode` maior (está em `android/build.gradle.kts`).
- Ao completar 14 dias, o Painel mostra **"Solicitar acesso à produção"**: o Google pergunta
  como foi o teste (quantas pessoas, que feedback recebeu, o que mudou). Anote os
  comentários dos testadores durante o teste para responder.

## 8. Recomendado antes da produção
O teclado envia à IA até 600 caracteres do texto antes do cursor quando você toca no
microfone. Isso está na política de privacidade, mas a política de dados do Google Play
costuma exigir também um **aviso dentro do app, com consentimento**, quando o dado não é
óbvio para o usuário. Vale incluir esse aviso na próxima atualização (antes de pedir a
produção) para evitar rejeição.
