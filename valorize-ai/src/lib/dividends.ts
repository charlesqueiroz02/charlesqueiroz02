/**
 * Proventos: soma dos últimos 12 meses e histórico/média de 5 anos.
 * Funções puras (sem fetch) usadas pelo servidor e cobertas por testes.
 */

export interface DividendEvent {
  /** Data do pagamento em segundos (padrão do Yahoo). */
  date: number;
  amount: number;
}

export interface DividendYearPoint {
  year: number;
  amount: number;
  dy?: number;
}

export interface DividendSummary {
  dividends12m: number;
  dividendHistory5y: DividendYearPoint[];
  avgDividends5y: number;
  /** Anos considerados na média (exclui anos antes de a ação começar a ser negociada). */
  yearsInAverage: number;
}

const r2 = (n: number) => Number(n.toFixed(2));

/** Últimos `n` anos completos, do mais antigo ao mais recente (ex.: 2021–2025 em 2026). */
export function lastFullYears(now: Date = new Date(), n = 5): number[] {
  const last = now.getFullYear() - 1;
  return Array.from({ length: n }, (_, i) => last - (n - 1) + i);
}

/**
 * @param events     pagamentos individuais
 * @param now        data de referência (hoje)
 * @param firstTradeYear primeiro ano com cotação; anos anteriores não entram na média
 *
 * Correções em relação à versão anterior:
 *  - 12 meses contam a partir de HOJE (antes contavam a partir do último pagamento,
 *    então uma empresa que parou de pagar continuava com DY alto);
 *  - a média de 5 anos inclui os anos SEM provento (antes eles eram ignorados,
 *    o que inflava o preço teto de Bazin).
 */
export function summarizeDividends(
  events: DividendEvent[],
  now: Date = new Date(),
  firstTradeYear?: number,
): DividendSummary {
  const nowSec = Math.floor(now.getTime() / 1000);
  const cutoff = nowSec - 365 * 24 * 60 * 60;
  const valid = events.filter(e => Number.isFinite(e.amount) && e.amount > 0 && Number.isFinite(e.date));

  const dividends12m = valid
    .filter(e => e.date >= cutoff && e.date <= nowSec)
    .reduce((acc, e) => acc + e.amount, 0);

  const years = lastFullYears(now);
  const totals: Record<number, number> = {};
  valid.forEach(e => {
    const yr = new Date(e.date * 1000).getUTCFullYear();
    totals[yr] = (totals[yr] || 0) + e.amount;
  });

  const dividendHistory5y = years.map(year => ({ year, amount: r2(totals[year] || 0) }));
  const eligible = dividendHistory5y.filter(d => firstTradeYear == null || d.year >= firstTradeYear);
  const avgDividends5y = eligible.length
    ? r2(eligible.reduce((acc, d) => acc + d.amount, 0) / eligible.length)
    : 0;

  return {
    dividends12m: r2(dividends12m),
    dividendHistory5y,
    avgDividends5y,
    yearsInAverage: eligible.length,
  };
}
