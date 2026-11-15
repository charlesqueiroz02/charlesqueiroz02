import { describe, it, expect } from 'vitest';
import { summarizeDividends, lastFullYears } from '../dividends';

const sec = (iso: string) => Date.parse(iso) / 1000;
const NOW = new Date('2026-11-14T12:00:00Z');

describe('lastFullYears', () => {
  it('devolve os 5 últimos anos completos', () => {
    expect(lastFullYears(NOW)).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(lastFullYears(new Date('2027-01-02T12:00:00Z'))).toEqual([2022, 2023, 2024, 2025, 2026]);
  });
});

describe('summarizeDividends', () => {
  it('soma 12 meses a partir de HOJE, não do último pagamento', () => {
    const s = summarizeDividends([
      { date: sec('2024-03-01'), amount: 2 }, // há mais de 12 meses
      { date: sec('2026-02-01'), amount: 0.5 },
      { date: sec('2026-08-01'), amount: 0.7 },
    ], NOW);
    expect(s.dividends12m).toBe(1.2);
  });

  it('empresa que parou de pagar fica com 12 meses zerado', () => {
    const s = summarizeDividends([{ date: sec('2023-05-01'), amount: 3 }], NOW);
    expect(s.dividends12m).toBe(0);
  });

  it('média de 5 anos inclui anos sem provento', () => {
    const s = summarizeDividends([
      { date: sec('2021-05-01'), amount: 1 },
      { date: sec('2022-05-01'), amount: 1 },
      { date: sec('2023-05-01'), amount: 1 },
    ], NOW);
    expect(s.dividendHistory5y.map(d => d.amount)).toEqual([1, 1, 1, 0, 0]);
    expect(s.avgDividends5y).toBe(0.6); // antes: 1,00 (ignorava os zeros)
  });

  it('soma vários pagamentos no mesmo ano', () => {
    const s = summarizeDividends([
      { date: sec('2025-03-01'), amount: 0.4 },
      { date: sec('2025-09-01'), amount: 0.6 },
    ], NOW);
    expect(s.dividendHistory5y.at(-1)).toEqual({ year: 2025, amount: 1 });
  });

  it('ação listada recentemente: média só dos anos em que existia', () => {
    const s = summarizeDividends([
      { date: sec('2024-05-01'), amount: 1 },
      { date: sec('2025-05-01'), amount: 2 },
    ], NOW, 2024);
    expect(s.yearsInAverage).toBe(2);
    expect(s.avgDividends5y).toBe(1.5);
  });

  it('ignora valores inválidos e pagamentos futuros no 12 meses', () => {
    const s = summarizeDividends([
      { date: sec('2026-06-01'), amount: NaN },
      { date: sec('2026-06-01'), amount: -1 },
      { date: sec('2027-06-01'), amount: 5 },
      { date: sec('2026-06-01'), amount: 1 },
    ], NOW);
    expect(s.dividends12m).toBe(1);
  });

  it('sem eventos devolve zeros', () => {
    const s = summarizeDividends([], NOW);
    expect(s.dividends12m).toBe(0);
    expect(s.avgDividends5y).toBe(0);
    expect(s.dividendHistory5y).toHaveLength(5);
  });
});
