# Valorize AI — Graham & Bazin

Analisador de ações da B3 pelos métodos clássicos de **Benjamin Graham** e **Décio Bazin**, com radar de oportunidades, laboratório de valuation, carteira, planejamento de renda e análise qualitativa por IA (Gemini).

- **Graham:** Preço Justo = √(22,5 × LPA × VPA)
- **Bazin:** Preço Teto = Proventos ÷ Yield mínimo (padrão 6%, média de 5 anos)

> Ferramenta educativa. Nada aqui é recomendação de investimento.

## Telas

| Tela | O que faz |
|---|---|
| **Radar** | Screener com Nota Valorize (0–100), filtros, exportação para Excel e **Mapa de oportunidades** (dispersão Graham × Bazin) |
| **Raio-X** | Régua de Valor, cartões de Graham e Bazin, **gráfico de preço mensal com faixas de preço justo/teto e zona de compra**, proventos por ano com média e DY, checklist de Bazin + **filtros defensivos de Graham**, análise por IA |
| **Laboratório** | Nota Valorize explicada, engenharia reversa do preço, teste de estresse e mapa de sensibilidade |
| **Máquina de Renda** | Quantas ações e quanto capital para a renda mensal desejada, com bola de neve |
| **Carteira** | Valor atual, resultado, renda anual, *yield on cost*, distribuição por ativo/setor, resultado por posição, sinais e alertas de preço |
| **Calculadora** | Graham e Bazin com entradas livres, sensibilidade e comparador de múltiplos com gráfico |
| **Otimizador de aportes** | Quantas ações comprar de cada ativo da sua carteira para chegar às metas, priorizando quem está abaixo do teto |
| **Juros compostos** | Patrimônio nominal e real (IPCA), Número Mágico e marcos de renda, com gráfico |
| **Conta** | Cadastro local com perfil de investidor e metas |

**Meus parâmetros** (botão no topo): yield mínimo, margem de segurança e base do Bazin valem para todas as telas.

**Tema claro e escuro** (botão no topo): *Automático* segue o modo do celular ou computador; *Claro* e *Escuro* fixam a escolha, que fica salva no aparelho. Valores aparecem sempre no formato brasileiro (R$ 11,03 · 12,2%).

## Arquitetura

```
src/
  lib/
    valuation.ts    # TODAS as fórmulas (Graham, Bazin, Nota, estresse, renda, CSV)
    dividends.ts    # proventos: 12 meses e média de 5 anos (usado pelo servidor)
    ticker.ts       # validação de códigos da B3 (app e servidor)
    quotes.ts       # cotações de vários papéis (carteira, otimizador, alertas)
    radarCache.ts   # cache do Radar compartilhado entre telas
    storage.ts      # acesso seguro ao localStorage e limpeza de cache
    password.ts     # hash de senha (PBKDF2 / WebCrypto)
    chartTheme.ts   # cores de todos os gráficos
    tabs.ts         # ordem, nomes e ícones das telas
  components/       # uma tela ou bloco por arquivo
  context/AuthContext.tsx  # conta local (fica só no aparelho)
  index.css         # paleta de cores do app inteiro
server/
  api.ts            # cotações (Yahoo + Fundamentus), Radar, comparador e IA
  security.ts       # limite de requisições, cabeçalhos e validação de entrada
server.ts           # servidor Express (local, AI Studio / Cloud Run)
api/index.ts      # mesma API como função da Vercel
vercel.json       # build, rotas e cabeçalhos na Vercel
```

**Onde mexer**

| Quero mudar… | Arquivo |
|---|---|
| Uma fórmula, a Nota Valorize ou os cenários de estresse | `src/lib/valuation.ts` |
| As cores do app | `src/index.css` (tema claro e escuro) e `src/lib/chartTheme.ts` (gráficos, nos dois temas) |
| Como o tema é escolhido | `src/lib/theme.ts` |
| Ordem e nomes das telas | `src/lib/tabs.ts` |
| Lista de ações do Radar | `server/api.ts` → `KNOWN_B3_STOCKS` |
| Limites de uso da API e da IA | `server/api.ts` (chamadas `rateLimit`) |
| Modelo da IA | `.env` → `GEMINI_MODEL` |

**De onde vêm os dados:** cotação, proventos e histórico do Yahoo Finance; LPA, VPA e setor do Fundamentus. Quando uma fonte falha, o app usa uma tabela de referência interna e **mostra a origem de cada dado** (ao vivo, referência, estimado ou sem dado). Sem cotação real, o app não calcula nada.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # coloque sua GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com recarga (Express + Vite) |
| `npm run build` | Gera o site em `dist/` |
| `npm test` | Roda os testes automatizados (Vitest) |
| `npm run lint` | Checagem de tipos (TypeScript) |

### Testes

`src/lib/__tests__/` cobre as fórmulas de Graham e Bazin, a Nota Valorize, o estresse, o plano de renda, a bola de neve, a exportação CSV, a lógica de proventos, a validação de tickers, o hash de senha e o armazenamento local.

**Testes que ainda deveriam existir:**
- Rotas da API com `supertest`, simulando Yahoo e Fundamentus.
- Testes de componente (Testing Library) da busca, da carteira e do otimizador.
- Fluxo de ponta a ponta com Playwright: buscar ação, adicionar à carteira, ver o alerta.

## Publicar na Vercel

**Primeira publicação**
1. Entre em **vercel.com** e faça login com a conta do GitHub.
2. Toque em **Add New… → Project** e, em **Import Git Repository**, escolha `charlesqueiroz02/charlesqueiroz02`.
   Se ele não aparecer, toque em **Adjust GitHub App Permissions** e libere o repositório.
3. Na tela **Configure Project**:
   - **Root Directory:** toque em **Edit** e escolha `valorize-ai`.
   - **Framework Preset:** Vite (o `vercel.json` já define build e pasta `dist`).
   - **Environment Variables:** crie `GEMINI_API_KEY` com a sua chave e, se quiser, `GEMINI_MODEL`.
4. Toque em **Deploy** e espere o "Congratulations".
5. Teste `https://SEU-PROJETO.vercel.app/api/stock/search?q=petr`: deve aparecer uma lista em JSON.

**Depois disso:** cada mudança enviada ao branch de produção publica sozinha; branches e pull requests geram endereços de pré-visualização.
Ao publicar uma versão nova, aumente `VERSION` em `public/sw.js` para os aparelhos baixarem a atualização.

**Limites:** cada chamada da API pode rodar até 30 s (`vercel.json`). As cotações ficam guardadas pela CDN por 15 min, o que reduz o número de execuções da função.

**Mudança de endereço:** os dados do app ficam no navegador e são ligados ao endereço do site. Ao trocar de endereço, use **Exportar meus dados** no endereço antigo e **Importar backup** no novo (telas Carteira ou Minha conta). Se o endereço antigo não tiver esse botão, exporte a carteira pelo botão **Excel** e use **Importar carteira do Excel**.

**App Android (APK/TWA):** o APK abre um endereço fixo. Para usar o endereço da Vercel, gere um APK novo no PWABuilder com a URL nova e a **mesma chave de assinatura** (`signing.keystore`); o `public/.well-known/assetlinks.json` já tem a impressão digital dessa chave.

## Segurança e privacidade

- A chave do Gemini fica **só no servidor**; o navegador nunca a recebe.
- A API valida os códigos da B3, limita a comparação a 10 ações e aplica limite de uso por IP (120 consultas/min; 12 análises de IA a cada 10 min).
- O site publicado envia cabeçalhos de segurança (CSP, HSTS, nosniff).
- **A conta é local:** perfil e carteira ficam no `localStorage` deste aparelho, com a senha guardada como hash PBKDF2. Isso protege a senha de leitura casual, mas **não é um login com servidor**: não há sincronização entre aparelhos nem recuperação de senha por e-mail.

## Novidades das versões 2.5 e 2.6

Veja o histórico completo em `MELHORIAS.md`.
