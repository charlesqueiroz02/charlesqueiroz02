# Valorize AI — Versão 2.0

Graham e Bazin continuam sendo o coração do app, com as fórmulas clássicas:

- **Graham:** Preço Justo = √(22,5 × LPA × VPA)
- **Bazin:** Preço Teto = Proventos ÷ Yield mínimo (padrão 6%, base média de 5 anos)

## Onde mexer (fácil de manipular)

| Quero mudar… | Arquivo |
|---|---|
| Qualquer fórmula, a Nota Valorize, cenários de estresse | `src/lib/valuation.ts` |
| Ordem, nomes e ícones das telas / barra do celular | `src/lib/tabs.ts` |
| Modelo da IA | `.env` → `GEMINI_MODEL` |
| Lista de ações do Radar | `server.ts` → `KNOWN_B3_STOCKS` |

Todas as telas e o servidor usam `valuation.ts`. Altere a fórmula em um lugar e ela muda no app inteiro.

## Novas telas

- **Laboratório de Valuation**: inclui a Régua de Valor e a Nota Valorize (0–100, com cada ponto explicado). Mostra também "O que o preço de hoje já embute", o Teste de estresse com cenários prontos e o Mapa de sensibilidade de Graham e Bazin.
- **Máquina de Renda**: você informa a renda mensal desejada. A tela calcula as ações por empresa, o capital necessário e o prazo até a meta com bola de neve. Exporta para Excel.

## Melhorias nas telas existentes

- **Radar**: Nota Valorize com ordenação, exportação para Excel, cartões no celular e yield mínimo configurável.
- **Raio-X**: Régua de Valor no topo e selo de origem dos dados.
- **Meus parâmetros** (botão no topo): yield, margem e base do Bazin valem para todas as telas.
- **Responsivo**: barra inferior no celular, cabeçalho reorganizado e bundle dividido para carregar mais rápido.

## Bugs corrigidos

1. O botão "Adicionar à carteira" do Raio-X não fazia nada. Agora abre um modal e calcula o preço médio.
2. Mensagens de erro nunca apareciam. Agora aparece um aviso visível.
3. O Raio-X ignorava a margem e o yield definidos pelo usuário.
4. O servidor inventava cotações quando a fonte falhava. Agora recusa calcular sem preço real e informa a origem de cada dado.
5. Os anos estavam fixos de 2021 a 2025 e quebrariam em 2027. Agora são dinâmicos.
6. O Radar fixava o yield em 6% e ignorava a escolha do usuário.

## Rodar localmente

```
npm install
cp .env.example .env.local   # coloque sua GEMINI_API_KEY
npm run dev
```

## App instalável (PWA) — versão 2.1

| Arquivo | Função |
|---|---|
| `public/favicon.ico`, `public/favicon.svg` | Ícone da aba do navegador |
| `public/icons/` | Ícones 96, 192, 512, maskable (Android) e apple-touch-icon (iPhone) |
| `public/manifest.webmanifest` | Nome, cores, ícones e atalhos rápidos (Radar, Laboratório, Renda, Carteira) |
| `public/sw.js` | Faz o app abrir offline depois da 1ª visita com internet |
| `src/components/InstallApp.tsx` | Botão "Instalar app" + passo a passo do iPhone + aviso de offline |

**Como funciona o modo offline:** a tela, os ícones e as fontes ficam salvos. As cotações usam a rede quando há internet e, sem conexão, mostram a última consulta salva. A análise por IA funciona só online.

**Ao publicar uma versão nova:** aumente `VERSION` no `public/sw.js` (ex.: `valorize-v2.1.1`) para os aparelhos baixarem a atualização.

**Requisito:** a instalação só aparece com HTTPS, ou seja, no link publicado do AI Studio/Cloud Run. Na pré-visualização em iframe do editor ela não aparece.

## Publicar no Netlify (versão 2.2)

No Netlify, o app roda completo: o site e a API de cotações e IA, via Netlify Functions.

| Arquivo | Função |
|---|---|
| `netlify.toml` | Configura o build, as rotas `/api/*` e os cabeçalhos do PWA |
| `netlify/functions/api.ts` | Roda no Netlify a mesma API do `server.ts` |
| `server/api.ts` | Toda a lógica de cotações, Radar e IA, usada pelo Express e pelo Netlify |

**Passo a passo**
1. Envie o projeto para o GitHub e, no Netlify, use **Add new site → Import from Git**. O `netlify.toml` já preenche build e pasta de publicação.
   - Não arraste só a pasta `dist`: o arraste não publica a API.
2. Em **Site configuration → Environment variables**, crie `GEMINI_API_KEY` com a sua chave e, se quiser, `GEMINI_MODEL`.
3. Faça um novo deploy. Para testar, abra `https://SEU-SITE.netlify.app/api/stock/search?q=petr`: deve aparecer uma lista em JSON.

**Limites do plano grátis:** cada chamada da API tem cerca de 10 segundos. Por isso, os tempos de espera foram reduzidos automaticamente no Netlify. Se o Yahoo ou o Fundamentus demorarem, a ação aparece com aviso em vez de travar o app.

## APK Android (versão 2.3)

O APK foi gerado pelo PWABuilder e é um app "TWA" (`app.netlify.valorizza.twa`). O arquivo `public/.well-known/assetlinks.json` prova ao Android que o app e o site valorizza.netlify.app são do mesmo dono. Com isso, o app abre em tela cheia, sem barra de endereço.

**Teste:** https://valorizza.netlify.app/.well-known/assetlinks.json deve mostrar o texto com `app.netlify.valorizza.twa`.

**Não perca** os arquivos `signing.keystore` e `signing-key-info.txt` do pacote do PWABuilder. Sem eles você não consegue publicar atualizações do mesmo app.

## Versão 2.4: cadastro

- **Topo do cadastro cortado no celular (corrigido):** a janela agora rola desde o topo, e o botão de fechar fica sempre visível. A página de fundo não rola junto, e a janela fica acima da barra inferior.
- **Adicionar outros papéis:** no passo "Ativos iniciais" há o campo "Adicionar outro papel".
  - Sugere ações enquanto você digita.
  - Confere se o código existe na B3 antes de incluir e já usa a cotação real como preço da carteira inicial.
  - Os papéis incluídos aparecem como etiquetas que podem ser removidas no ×.
- **Sugestões em 2 colunas no celular:** menos rolagem.

Arquivos: `src/components/AddTickerField.tsx` (novo), `RegistrationFlow.tsx`, `AuthModal.tsx` e `context/AuthContext.tsx`.

## Versão 2.5: revisão completa (correções, segurança, paleta, gráficos e ferramentas)

**Correções críticas**
- Digitar `(` ou `[` na busca derrubava o app inteiro (tela branca). Corrigido, e agora há proteção contra erros em cada tela.
- Enquanto se digitava na busca, o Raio-X trocava o código da ação mas mantinha os dados da anterior.
- **A média de 5 anos do Bazin ignorava os anos sem provento**, inflando o preço teto. Agora os anos zerados contam.
- **Os "proventos 12 meses" eram contados a partir do último pagamento**, não de hoje: uma empresa que parou de pagar continuava com DY alto.
- O Raio-X inventava um histórico de proventos quando não havia dados; o Otimizador inventava preço, proventos e teto. Agora o app mostra que o dado falta.
- O yield de 6% estava fixo no Raio-X, no comparador, no otimizador, na IA e no Radar; agora segue "Meus parâmetros".
- O simulador de juros compostos fazia o yield crescer sobre o patrimônio, superestimando o resultado.
- O projeto não tinha `@types/react`: a checagem de tipos não validava nenhum componente.

**Segurança**
- O login aceitava senha vazia; as senhas estavam em texto puro. Agora há hash PBKDF2, migrado automaticamente.
- O botão demo podia abrir uma conta real sem senha.
- A API ganhou validação de ticker, limite de uso por IP, limite na comparação, erros sem detalhes internos e cabeçalhos de segurança.
- O aceite dos termos começa desmarcado (LGPD); a recuperação de senha não finge mais enviar e-mail; os perfis demo não usam pessoas reais.

**Visual:** nova paleta clara e suave (sálvia, ardósia, coral), sem blocos pretos e com contraste melhor nos textos pequenos.

**Gráficos novos:**
- Preço mensal com as linhas de Graham e Bazin e a zona de compra.
- Proventos por ano com média e DY.
- Mapa de oportunidades no Radar.
- Evolução do patrimônio no simulador.
- Distribuição e resultado da carteira.
- Comparador em barras.

**Ferramentas:**
- Carteira com resultado, renda e *yield on cost*.
- Otimizador a partir da carteira real.
- Filtros defensivos de Graham no checklist.
- Alertas de preço conferidos para toda a carteira.

**Desempenho:** telas carregadas sob demanda; os gráficos não são baixados na abertura (download inicial cerca de 50% menor).

**Testes:** 29 testes automatizados (`npm test`).

## Versão 2.6: tema escuro e formato brasileiro

- **Tema escuro próprio**, com botão no topo: Automático (segue o celular), Claro ou Escuro. A escolha fica salva no aparelho.
- O app declara que tem tema escuro (`color-scheme`), então o modo noturno do navegador (Brave/Chrome) não inverte mais as cores por conta própria.
- **Gráficos com cores próprias para o escuro** (`src/lib/chartTheme.ts`), legíveis nos dois temas.
- **Números no formato brasileiro em todas as telas**: R$ 11,03 e 12,2% (antes alguns cartões mostravam R$ 11.03).
- Fundo das janelas (modais) escurecido de forma consistente nos dois temas.
- Topo não quebra mais "Instalar app" e "6,0% · 20%" em duas linhas.
- 5 testes novos (formato brasileiro e escolha de tema): 34 no total.
