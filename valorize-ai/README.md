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
server.ts           # servidor Express (AI Studio / Cloud Run)
netlify/functions/api.ts  # mesma API no Netlify
```

**Onde mexer**

| Quero mudar… | Arquivo |
|---|---|
| Uma fórmula, a Nota Valorize ou os cenários de estresse | `src/lib/valuation.ts` |
| As cores do app | `src/index.css` (tema) e `src/lib/chartTheme.ts` (gráficos) |
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

## Publicar no Netlify

1. Envie o projeto para o GitHub e, no Netlify, use **Add new site → Import from Git**. Se o app estiver numa subpasta do repositório (ex.: `valorize-ai/`), informe-a em **Base directory**. O `netlify.toml` preenche o build e a pasta de publicação.
2. Em **Site configuration → Environment variables**, crie `GEMINI_API_KEY` e, se quiser, `GEMINI_MODEL`.
3. Faça o deploy e teste `https://SEU-SITE.netlify.app/api/stock/search?q=petr`.

As funções do Netlify têm cerca de 10 segundos de limite; os tempos de espera das fontes já são menores nesse ambiente. Ao publicar uma versão nova, aumente `VERSION` em `public/sw.js` para os aparelhos baixarem a atualização. O APK Android (TWA) continua funcionando: veja `MELHORIAS.md`.

## Segurança e privacidade

- A chave do Gemini fica **só no servidor**; o navegador nunca a recebe.
- A API valida os códigos da B3, limita a comparação a 10 ações e aplica limite de uso por IP (120 consultas/min; 12 análises de IA a cada 10 min).
- O site publicado envia cabeçalhos de segurança (CSP, HSTS, nosniff).
- **A conta é local:** perfil e carteira ficam no `localStorage` deste aparelho, com a senha guardada como hash PBKDF2. Isso protege a senha de leitura casual, mas **não é um login com servidor**: não há sincronização entre aparelhos nem recuperação de senha por e-mail.

## Novidades da versão 2.5

Veja o histórico completo em `MELHORIAS.md`.
