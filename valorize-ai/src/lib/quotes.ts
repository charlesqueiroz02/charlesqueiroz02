/**
 * Cotações de vários papéis de uma vez (Carteira, Otimizador e alertas).
 * Usa /api/stock/compare em lotes de até 10 ações (limite do servidor).
 */
export interface Quote {
  ticker: string;
  name: string;
  price: number;
  lpa: number;
  vpa: number;
  dividends: number;       // proventos 12 meses por ação
  avgDividends5y: number;  // média 5 anos por ação
  dy: number;
  pl: number;
  pvp: number;
  grahamFair: number;
  bazinFair: number;       // teto Bazin 12m
  bazinFair5y: number;     // teto Bazin média 5a
  sector?: string;
}

export async function fetchQuotes(tickers: string[], minYield: number): Promise<Record<string, Quote>> {
  const unique = Array.from(new Set(tickers.map(t => t.toUpperCase()))).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));
  const results = await Promise.all(chunks.map(async c => {
    const r = await fetch(`/api/stock/compare?tickers=${encodeURIComponent(c.join(','))}&minYield=${encodeURIComponent(minYield)}`);
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.error || 'Não foi possível atualizar as cotações.');
    return Array.isArray(body) ? (body as Quote[]) : [];
  }));
  const map: Record<string, Quote> = {};
  results.flat().forEach(q => { map[q.ticker] = q; });
  return map;
}
