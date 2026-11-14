/**
 * Valorize AI — Núcleo de Valuation
 * ------------------------------------------------------------------
 * Fonte ÚNICA de verdade para todos os cálculos do app.
 * Usado tanto pelo servidor (server.ts) quanto pelo front-end.
 * Funções puras: sem React, sem fetch, fáceis de testar.
 *
 * Métodos clássicos preservados:
 *  - Benjamin Graham:  Preço Justo = √(22,5 × LPA × VPA)
 *  - Décio Bazin:      Preço Teto  = Dividendos ÷ Yield mínimo (padrão 6%)
 */

export type Signal = 'COMPRA' | 'AGUARDAR' | 'VENDA';
export type BazinBase = '5y' | '12m';

export const GRAHAM_CONSTANT = 22.5; // 15 (P/L máx.) × 1,5 (P/VP máx.)
export const DEFAULT_MIN_YIELD = 6;
export const DEFAULT_MARGIN = 20;

const safe = (n: unknown): number => (typeof n === 'number' && isFinite(n) ? n : 0);
export const round = (n: number, d = 2) => Number(safe(n).toFixed(d));

/* ------------------------------ GRAHAM ------------------------------ */
export function grahamFairPrice(lpa: number, vpa: number): number {
  if (lpa <= 0 || vpa <= 0) return 0; // Graham não se aplica a prejuízo / PL negativo
  return Math.sqrt(GRAHAM_CONSTANT * lpa * vpa);
}

/* ------------------------------- BAZIN ------------------------------ */
export function bazinCeilingPrice(dividendsPerShare: number, minYieldPct = DEFAULT_MIN_YIELD): number {
  if (dividendsPerShare <= 0 || minYieldPct <= 0) return 0;
  return dividendsPerShare / (minYieldPct / 100);
}

/* ------------------------------ COMUNS ------------------------------ */
export function upsidePct(target: number, price: number): number {
  if (target <= 0 || price <= 0) return 0;
  return (target / price - 1) * 100;
}

export function entryPrice(target: number, marginPct: number): number {
  return target * (1 - marginPct / 100);
}

export function signalFor(price: number, target: number, marginPct: number): Signal {
  if (target <= 0 || price <= 0) return 'AGUARDAR';
  if (price <= entryPrice(target, marginPct)) return 'COMPRA';
  if (price > target) return 'VENDA';
  return 'AGUARDAR';
}

export interface ValuationInput {
  price: number;
  lpa: number;
  vpa: number;
  dividends12m: number;
  avgDividends5y?: number;
  minYield?: number;
  margin?: number;
  bazinBase?: BazinBase;
}

export interface ValuationOutput {
  grahamFair: number;
  grahamEntry: number;
  grahamUpside: number;
  grahamSignal: Signal;
  bazinCeiling12m: number;
  bazinCeiling5y: number;
  bazinCeiling: number; // conforme base escolhida
  bazinEntry: number;
  bazinUpside: number;
  bazinSignal: Signal;
  dy: number;
  pl: number;
  pvp: number;
}

export function computeValuation(i: ValuationInput): ValuationOutput {
  const minYield = i.minYield ?? DEFAULT_MIN_YIELD;
  const margin = i.margin ?? DEFAULT_MARGIN;
  const base = i.bazinBase ?? '5y';
  const div5y = i.avgDividends5y && i.avgDividends5y > 0 ? i.avgDividends5y : i.dividends12m;

  const grahamFair = grahamFairPrice(i.lpa, i.vpa);
  const bazinCeiling12m = bazinCeilingPrice(i.dividends12m, minYield);
  const bazinCeiling5y = bazinCeilingPrice(div5y, minYield);
  const bazinCeiling = base === '5y' ? bazinCeiling5y : bazinCeiling12m;

  return {
    grahamFair,
    grahamEntry: entryPrice(grahamFair, margin),
    grahamUpside: upsidePct(grahamFair, i.price),
    grahamSignal: signalFor(i.price, grahamFair, margin),
    bazinCeiling12m,
    bazinCeiling5y,
    bazinCeiling,
    bazinEntry: entryPrice(bazinCeiling, margin),
    bazinUpside: upsidePct(bazinCeiling, i.price),
    bazinSignal: signalFor(i.price, bazinCeiling, margin),
    dy: i.price > 0 ? (i.dividends12m / i.price) * 100 : 0,
    pl: i.lpa > 0 ? i.price / i.lpa : 0,
    pvp: i.vpa > 0 ? i.price / i.vpa : 0,
  };
}

/* ----------------------- NOTA VALORIZE (0–100) ---------------------- */
export interface ScorePart {
  key: string;
  label: string;
  points: number;
  max: number;
  hint: string;
}

export interface ScoreInput {
  price: number;
  lpa: number;
  vpa: number;
  dividends12m: number;
  avgDividends5y?: number;
  dividendYears?: number[]; // proventos por ano (últimos 5)
  sectorPL?: number;
  sectorPVP?: number;
  minYield?: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (v: number, from: number, to: number) => clamp((v - from) / (to - from), 0, 1);

/**
 * Nota transparente: cada ponto tem origem explicada.
 * Não é recomendação — é um resumo de quão bem a ação passa nos filtros de Graham e Bazin.
 */
export function valorizeScore(s: ScoreInput): { total: number; parts: ScorePart[]; grade: string } {
  const v = computeValuation({
    price: s.price, lpa: s.lpa, vpa: s.vpa,
    dividends12m: s.dividends12m, avgDividends5y: s.avgDividends5y,
    minYield: s.minYield, bazinBase: '5y',
  });

  const years = (s.dividendYears || []).filter(x => x >= 0);
  const paidYears = years.filter(x => x > 0).length;
  const mean = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 0;
  const sd = years.length ? Math.sqrt(years.reduce((a, b) => a + (b - mean) ** 2, 0) / years.length) : 0;
  const cv = mean > 0 ? sd / mean : 1; // coef. de variação (menor = mais estável)

  const parts: ScorePart[] = [
    {
      key: 'graham', label: 'Desconto Graham', max: 25,
      points: 25 * lerp(v.grahamUpside, -20, 40),
      hint: v.grahamFair > 0 ? `Upside de ${v.grahamUpside.toFixed(0)}% até o preço justo` : 'LPA ou VPA negativo: Graham não se aplica',
    },
    {
      key: 'bazin', label: 'Desconto Bazin (5 anos)', max: 25,
      points: 25 * lerp(v.bazinUpside, -20, 30),
      hint: v.bazinCeiling > 0 ? `Upside de ${v.bazinUpside.toFixed(0)}% até o preço teto` : 'Sem proventos registrados',
    },
    {
      key: 'consistencia', label: 'Regularidade dos proventos', max: 20,
      points: years.length ? 12 * (paidYears / Math.max(5, years.length)) + 8 * (1 - clamp(cv, 0, 1)) : 0,
      hint: years.length ? `Pagou em ${paidYears} de ${years.length} anos; variação ${(cv * 100).toFixed(0)}%` : 'Histórico indisponível',
    },
    {
      key: 'pl', label: 'P/L vs. setor', max: 10,
      points: v.pl > 0 && s.sectorPL ? 10 * lerp(s.sectorPL / v.pl, 0.6, 1.4) : 0,
      hint: v.pl > 0 ? `P/L ${v.pl.toFixed(1)} contra ${s.sectorPL?.toFixed(1) ?? '—'} do setor` : 'Empresa com prejuízo',
    },
    {
      key: 'pvp', label: 'P/VP vs. setor', max: 10,
      points: v.pvp > 0 && s.sectorPVP ? 10 * lerp(s.sectorPVP / v.pvp, 0.6, 1.4) : 0,
      hint: v.pvp > 0 ? `P/VP ${v.pvp.toFixed(2)} contra ${s.sectorPVP?.toFixed(2) ?? '—'} do setor` : 'Patrimônio negativo',
    },
    {
      key: 'dy', label: 'Yield atual', max: 10,
      points: 10 * lerp(v.dy, 2, (s.minYield ?? DEFAULT_MIN_YIELD) + 4),
      hint: `DY 12m de ${v.dy.toFixed(1)}%`,
    },
  ].map(p => ({ ...p, points: round(p.points, 1) }));

  const total = Math.round(parts.reduce((a, p) => a + p.points, 0));
  const grade = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 35 ? 'D' : 'E';
  return { total, parts, grade };
}

/* ------------------- ENGENHARIA REVERSA DO PREÇO -------------------- */
/** O que o preço de hoje já "embute"? */
export function reverseEngineer(price: number, lpa: number, vpa: number, div5y: number, minYield = DEFAULT_MIN_YIELD) {
  const impliedLpa = vpa > 0 ? (price * price) / (GRAHAM_CONSTANT * vpa) : 0; // LPA que torna preço = justo
  const impliedDividend = price * (minYield / 100); // provento necessário p/ render o mínimo
  const yieldAtPrice = price > 0 ? (div5y / price) * 100 : 0;
  return {
    impliedLpa,
    lpaCushionPct: lpa > 0 && impliedLpa > 0 ? (1 - impliedLpa / lpa) * 100 : 0, // quanto o lucro pode cair
    impliedDividend,
    dividendCushionPct: div5y > 0 ? (1 - impliedDividend / div5y) * 100 : 0, // quanto o provento pode cair
    yieldAtPrice,
  };
}

/* ----------------------- CENÁRIOS DE ESTRESSE ----------------------- */
export interface StressShock {
  lpaPct: number;
  vpaPct: number;
  divPct: number;
  minYield: number;
}

export const STRESS_PRESETS: { id: string; label: string; desc: string; shock: StressShock }[] = [
  { id: 'base', label: 'Cenário atual', desc: 'Sem choques', shock: { lpaPct: 0, vpaPct: 0, divPct: 0, minYield: 6 } },
  { id: 'recessao', label: 'Recessão', desc: 'Lucro −30%, proventos −40%', shock: { lpaPct: -30, vpaPct: -5, divPct: -40, minYield: 6 } },
  { id: 'selic', label: 'Selic alta', desc: 'Investidor exige 8% de yield', shock: { lpaPct: -10, vpaPct: 0, divPct: -10, minYield: 8 } },
  { id: 'corte', label: 'Corte de dividendos', desc: 'Proventos pela metade', shock: { lpaPct: 0, vpaPct: 0, divPct: -50, minYield: 6 } },
  { id: 'alta', label: 'Ciclo de alta', desc: 'Lucro +25%, proventos +20%', shock: { lpaPct: 25, vpaPct: 8, divPct: 20, minYield: 6 } },
];

export function applyShock(lpa: number, vpa: number, div: number, s: StressShock) {
  return {
    lpa: lpa * (1 + s.lpaPct / 100),
    vpa: vpa * (1 + s.vpaPct / 100),
    div: div * (1 + s.divPct / 100),
    minYield: s.minYield,
  };
}

/* ------------------------- RENDA PASSIVA ---------------------------- */
export interface IncomeAsset {
  ticker: string;
  price: number;
  dividendPerShare: number; // use média 5a para ser conservador
  weight: number; // %
}

/** Quantas ações / quanto capital para gerar `monthlyGoal` por mês. */
export function incomePlan(assets: IncomeAsset[], monthlyGoal: number) {
  const totalWeight = assets.reduce((a, x) => a + x.weight, 0) || 1;
  const annualGoal = monthlyGoal * 12;
  const rows = assets.map(a => {
    const share = a.weight / totalWeight;
    const incomeTarget = annualGoal * share;
    const shares = a.dividendPerShare > 0 ? Math.ceil(incomeTarget / a.dividendPerShare) : 0;
    return {
      ...a,
      incomeTarget,
      shares,
      capital: shares * a.price,
      yieldPct: a.price > 0 ? (a.dividendPerShare / a.price) * 100 : 0,
    };
  });
  const capital = rows.reduce((a, r) => a + r.capital, 0);
  const annualIncome = rows.reduce((a, r) => a + r.shares * r.dividendPerShare, 0);
  return { rows, capital, annualIncome, blendedYield: capital > 0 ? (annualIncome / capital) * 100 : 0 };
}

/** Bola de neve: meses até atingir a renda alvo, com aportes e reinvestimento. */
export function snowball(opts: {
  initial: number;
  monthly: number;
  yieldPct: number; // DY anual da carteira
  growthPct: number; // valorização anual esperada dos preços/proventos
  goalMonthly: number;
  reinvest: boolean;
  maxYears?: number;
}) {
  const months = (opts.maxYears ?? 40) * 12;
  const yM = opts.yieldPct / 100 / 12;
  const gM = Math.pow(1 + opts.growthPct / 100, 1 / 12) - 1;
  let equity = opts.initial;
  let invested = opts.initial;
  let reachedAt: number | null = null;
  const series: { month: number; year: number; patrimonio: number; investido: number; renda: number }[] = [];

  for (let m = 0; m <= months; m++) {
    const income = equity * yM;
    if (m % 6 === 0 || m === months) {
      series.push({ month: m, year: round(m / 12, 1), patrimonio: round(equity, 0), investido: round(invested, 0), renda: round(income, 0) });
    }
    if (reachedAt === null && income >= opts.goalMonthly) reachedAt = m;
    if (reachedAt !== null && m >= reachedAt + 24) break; // 2 anos após a meta é suficiente p/ gráfico
    equity = equity * (1 + gM) + opts.monthly + (opts.reinvest ? income : 0);
    invested += opts.monthly;
  }
  return { series, reachedAt };
}

/* ----------------------------- FORMATOS ----------------------------- */
export const brl = (n: number, d = 2) =>
  safe(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (n: number, d = 1, sign = true) =>
  `${sign && n > 0 ? '+' : ''}${safe(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
export const num = (n: number, d = 2) =>
  safe(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* --------------------------- EXPORTAÇÃO ----------------------------- */
/** CSV pronto para Excel em pt-BR (separador ; e vírgula decimal, com BOM). */
export function toExcelCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (v: string | number) => {
    if (typeof v === 'number') return isFinite(v) ? String(round(v, 4)).replace('.', ',') : '';
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [headers.join(';'), ...rows.map(r => headers.map(h => cell(r[h])).join(';'))].join('\r\n');
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
