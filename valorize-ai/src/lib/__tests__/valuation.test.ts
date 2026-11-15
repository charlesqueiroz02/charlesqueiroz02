import { describe, it, expect } from 'vitest';
import {
  grahamFairPrice,
  bazinCeilingPrice,
  upsidePct,
  entryPrice,
  signalFor,
  computeValuation,
  valorizeScore,
  reverseEngineer,
  applyShock,
  incomePlan,
  snowball,
  toExcelCsv,
  round,
} from '../valuation';

describe('Graham', () => {
  it('calcula √(22,5 × LPA × VPA)', () => {
    expect(grahamFairPrice(2, 20)).toBeCloseTo(Math.sqrt(22.5 * 40), 10); // 30
    expect(round(grahamFairPrice(2.53, 31.64))).toBe(42.44);
  });
  it('não se aplica a prejuízo ou patrimônio negativo', () => {
    expect(grahamFairPrice(-1, 20)).toBe(0);
    expect(grahamFairPrice(2, 0)).toBe(0);
  });
});

describe('Bazin', () => {
  it('preço teto = proventos ÷ yield mínimo', () => {
    expect(bazinCeilingPrice(1.8, 6)).toBeCloseTo(30);
    expect(bazinCeilingPrice(1.8, 8)).toBeCloseTo(22.5);
  });
  it('padrão de 6% e zero sem proventos', () => {
    expect(bazinCeilingPrice(3)).toBeCloseTo(50);
    expect(bazinCeilingPrice(0)).toBe(0);
    expect(bazinCeilingPrice(1, 0)).toBe(0);
  });
});

describe('sinais e margens', () => {
  it('upside, entrada e sinal', () => {
    expect(upsidePct(30, 20)).toBeCloseTo(50);
    expect(upsidePct(0, 20)).toBe(0);
    expect(entryPrice(30, 20)).toBeCloseTo(24);
    expect(signalFor(23, 30, 20)).toBe('COMPRA');
    expect(signalFor(27, 30, 20)).toBe('AGUARDAR');
    expect(signalFor(31, 30, 20)).toBe('VENDA');
    expect(signalFor(10, 0, 20)).toBe('AGUARDAR');
  });

  it('computeValuation escolhe a base do Bazin', () => {
    const base = { price: 20, lpa: 2, vpa: 20, dividends12m: 2.4, avgDividends5y: 1.2, minYield: 6, margin: 20 };
    expect(computeValuation({ ...base, bazinBase: '5y' }).bazinCeiling).toBeCloseTo(20);
    expect(computeValuation({ ...base, bazinBase: '12m' }).bazinCeiling).toBeCloseTo(40);
    const v = computeValuation(base);
    expect(v.dy).toBeCloseTo(12);
    expect(v.pl).toBeCloseTo(10);
    expect(v.pvp).toBeCloseTo(1);
  });

  it('média 5a ausente cai para 12 meses', () => {
    const v = computeValuation({ price: 10, lpa: 1, vpa: 10, dividends12m: 0.6 });
    expect(v.bazinCeiling5y).toBeCloseTo(10);
  });
});

describe('Nota Valorize', () => {
  it('fica entre 0 e 100 e a soma bate com as partes', () => {
    const s = valorizeScore({ price: 20, lpa: 3, vpa: 25, dividends12m: 2, avgDividends5y: 1.8, dividendYears: [1.5, 1.7, 1.8, 2, 2], sectorPL: 8, sectorPVP: 1.1 });
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(Math.abs(s.parts.reduce((a, p) => a + p.points, 0) - s.total)).toBeLessThan(1);
    s.parts.forEach(p => expect(p.points).toBeLessThanOrEqual(p.max));
  });
  it('empresa cara e sem proventos tira nota baixa', () => {
    const s = valorizeScore({ price: 100, lpa: 1, vpa: 5, dividends12m: 0, dividendYears: [0, 0, 0, 0, 0], sectorPL: 10, sectorPVP: 1.5 });
    expect(s.total).toBeLessThan(20);
    expect(s.grade).toBe('E');
  });
});

describe('engenharia reversa e estresse', () => {
  it('LPA implícito torna o preço igual ao justo', () => {
    const r = reverseEngineer(30, 2, 20, 1.8, 6);
    expect(grahamFairPrice(r.impliedLpa, 20)).toBeCloseTo(30);
    expect(r.impliedDividend).toBeCloseTo(1.8);
    expect(r.dividendCushionPct).toBeCloseTo(0);
  });
  it('choques percentuais', () => {
    const s = applyShock(2, 20, 1, { lpaPct: -50, vpaPct: 10, divPct: -40, minYield: 8 });
    expect(s.lpa).toBeCloseTo(1);
    expect(s.vpa).toBeCloseTo(22);
    expect(s.div).toBeCloseTo(0.6);
    expect(s.minYield).toBe(8);
  });
});

describe('renda passiva', () => {
  it('incomePlan arredonda ações para cima e normaliza pesos', () => {
    const p = incomePlan([
      { ticker: 'A', price: 10, dividendPerShare: 1, weight: 1 },
      { ticker: 'B', price: 20, dividendPerShare: 1, weight: 1 },
    ], 100); // 1.200/ano
    expect(p.rows[0].shares).toBe(600);
    expect(p.rows[1].shares).toBe(600);
    expect(p.annualIncome).toBe(1200);
    expect(p.capital).toBe(18000);
  });
  it('snowball atinge a meta e respeita o teto de anos', () => {
    const r = snowball({ initial: 100000, monthly: 0, yieldPct: 12, growthPct: 0, goalMonthly: 1000, reinvest: false });
    expect(r.reachedAt).toBe(0);
    const never = snowball({ initial: 0, monthly: 0, yieldPct: 6, growthPct: 0, goalMonthly: 1000, reinvest: true, maxYears: 2 });
    expect(never.reachedAt).toBeNull();
  });
});

describe('exportação CSV', () => {
  it('usa ; e vírgula decimal com BOM, e escapa aspas', () => {
    const csv = toExcelCsv([{ Nome: 'A;B "x"', Valor: 1.5 }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Nome;Valor');
    expect(csv).toContain('"A;B ""x""";1,5');
  });
});
