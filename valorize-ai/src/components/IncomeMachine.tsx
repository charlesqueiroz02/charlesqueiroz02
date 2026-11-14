import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Coins, Plus, X, Download, Target } from 'lucide-react';
import type { PortfolioItem, RadarStockItem, StockData } from '../types';
import { incomePlan, snowball, brl, num, toExcelCsv, downloadText } from '../lib/valuation';

interface IncomeMachineProps {
  minYield: number;
  portfolio: PortfolioItem[];
  currentStock: StockData;
  defaultGoal?: number;
  defaultMonthly?: number;
}

interface Pick { ticker: string; weight: number }

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number }> =
  ({ label, value, onChange, prefix, suffix, step = 1 }) => (
    <label className="block">
      <span className="text-xs text-zinc-600 block mb-1">{label}</span>
      <span className="relative block">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono">{prefix}</span>}
        <input
          type="number" inputMode="decimal" step={step} value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className={`w-full ${prefix ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'} py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-sm font-bold focus:ring-2 focus:ring-zinc-900 outline-none`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono">{suffix}</span>}
      </span>
    </label>
  );

export const IncomeMachine: React.FC<IncomeMachineProps> = ({ minYield, portfolio, currentStock, defaultGoal = 2000, defaultMonthly = 1500 }) => {
  const [universe, setUniverse] = useState<RadarStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(defaultGoal);
  const [monthly, setMonthly] = useState(defaultMonthly);
  const [initial, setInitial] = useState(0);
  const [growth, setGrowth] = useState(3);
  const [reinvest, setReinvest] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [adding, setAdding] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/stock/radar?minYield=${minYield}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: RadarStockItem[]) => { if (alive && Array.isArray(data)) setUniverse(data); })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [minYield]);

  // Universo = radar + ação aberta no momento (se não estiver no radar)
  const pool = useMemo(() => {
    const map = new Map(universe.map(u => [u.ticker, { ticker: u.ticker, name: u.name, price: u.price, div: u.avgDividends5y || u.dividends12m, score: u.score ?? 0 }]));
    if (currentStock.currentPrice > 0 && !map.has(currentStock.ticker)) {
      map.set(currentStock.ticker, {
        ticker: currentStock.ticker, name: currentStock.companyName || currentStock.ticker,
        price: currentStock.currentPrice, div: currentStock.avgDividends5y || currentStock.dividends, score: 0,
      });
    }
    return map;
  }, [universe, currentStock]);

  // Seleção inicial: carteira do usuário; se vazia, as 4 melhores notas
  useEffect(() => {
    if (picks.length || !pool.size) return;
    const fromPortfolio = portfolio.map(p => p.ticker).filter(t => pool.has(t));
    const base = fromPortfolio.length
      ? fromPortfolio
      : [...pool.values()].filter(p => p.div > 0).sort((a, b) => b.score - a.score).slice(0, 4).map(p => p.ticker);
    setPicks(base.map(t => ({ ticker: t, weight: Math.round(100 / base.length) })));
  }, [pool, portfolio, picks.length]);

  const plan = useMemo(() => incomePlan(
    picks.filter(p => pool.has(p.ticker)).map(p => {
      const a = pool.get(p.ticker)!;
      return { ticker: p.ticker, price: a.price, dividendPerShare: a.div, weight: p.weight };
    }),
    goal,
  ), [picks, pool, goal]);

  const ball = useMemo(() => snowball({
    initial, monthly, yieldPct: plan.blendedYield || minYield, growthPct: growth, goalMonthly: goal, reinvest,
  }), [initial, monthly, plan.blendedYield, minYield, growth, goal, reinvest]);

  const reachedLabel = ball.reachedAt === null
    ? 'mais de 40 anos'
    : ball.reachedAt < 12 ? `${ball.reachedAt} meses` : `${Math.floor(ball.reachedAt / 12)} anos e ${ball.reachedAt % 12} meses`;

  const available = [...pool.values()].filter(p => !picks.some(k => k.ticker === p.ticker));

  const exportPlan = () => downloadText(`plano-renda-${new Date().toISOString().slice(0, 10)}.csv`, toExcelCsv(plan.rows.map(r => ({
    Ticker: r.ticker, 'Peso %': r.weight, 'Preço R$': r.price, 'Provento/ação (média 5a) R$': r.dividendPerShare,
    'Yield %': r.yieldPct, 'Ações necessárias': r.shares, 'Capital R$': r.capital, 'Renda anual R$': r.shares * r.dividendPerShare,
  }))));

  return (
    <div className="space-y-6">
      <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
        <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-600" /> Máquina de Renda
        </h2>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
          Diga quanto quer receber por mês em dividendos. O app calcula quantas ações de cada empresa você precisa e em quanto tempo chega lá, usando a média de 5 anos de proventos (a base conservadora de Bazin).
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <NumberField label="Renda mensal desejada" value={goal} onChange={setGoal} prefix="R$" step={100} />
          <NumberField label="Aporte por mês" value={monthly} onChange={setMonthly} prefix="R$" step={100} />
          <NumberField label="Já investido" value={initial} onChange={setInitial} prefix="R$" step={1000} />
          <NumberField label="Crescimento ao ano" value={growth} onChange={setGrowth} suffix="%" step={0.5} />
          <label className="col-span-2 lg:col-span-1 flex items-center gap-2.5 self-end py-2.5 px-3 rounded-lg border border-zinc-200 cursor-pointer">
            <input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)} className="w-4 h-4 accent-zinc-900" />
            <span className="text-xs text-zinc-700">Reinvestir dividendos</span>
          </label>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'Capital necessário', v: brl(plan.capital, 0), sub: 'a preços de hoje' },
          { k: 'Yield da cesta', v: `${num(plan.blendedYield, 1)}%`, sub: plan.blendedYield >= minYield ? `acima dos ${num(minYield, 1)}% de Bazin` : `abaixo dos ${num(minYield, 1)}% de Bazin` },
          { k: 'Meta atingida em', v: reachedLabel, sub: reinvest ? 'reinvestindo' : 'sem reinvestir' },
          { k: 'Renda gerada', v: brl(plan.annualIncome / 12, 0), sub: 'por mês com as ações calculadas' },
        ].map(c => (
          <div key={c.k} className="bg-white data-grid-border rounded-xl p-4 shadow-sm">
            <div className="text-[11px] text-zinc-500">{c.k}</div>
            <div className="text-lg sm:text-xl font-mono font-bold text-zinc-950 mt-1 leading-tight">{c.v}</div>
            <div className="text-[10px] text-zinc-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Cesta */}
        <section className="xl:col-span-2 bg-white data-grid-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg text-zinc-900">Sua cesta de pagadoras</h3>
            <button onClick={exportPlan} disabled={!plan.rows.length}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>

          {loading && !pool.size && <p className="text-xs text-zinc-500">Carregando ações…</p>}
          {!loading && !pool.size && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Não foi possível carregar a lista de ações. Abra uma ação pela busca e ela aparecerá aqui.
            </p>
          )}

          <ul className="divide-y divide-zinc-100">
            {plan.rows.map(r => (
              <li key={r.ticker} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-sm text-zinc-950">{r.ticker}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{pool.get(r.ticker)?.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold">{r.shares.toLocaleString('pt-BR')} ações</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{brl(r.capital, 0)} · DY {num(r.yieldPct, 1)}%</div>
                  </div>
                  <button onClick={() => setPicks(p => p.filter(x => x.ticker !== r.ticker))}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded" aria-label={`Remover ${r.ticker}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input type="range" min={0} max={100} step={5} value={r.weight}
                    onChange={e => setPicks(p => p.map(x => x.ticker === r.ticker ? { ...x, weight: Number(e.target.value) } : x))}
                    className="flex-1 accent-emerald-600 h-2" aria-label={`Peso de ${r.ticker}`} />
                  <span className="text-[11px] font-mono w-10 text-right">{r.weight}%</span>
                </div>
              </li>
            ))}
          </ul>

          {available.length > 0 && (
            <div className="flex gap-2 mt-3">
              <select value={adding} onChange={e => setAdding(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono">
                <option value="">Adicionar ação…</option>
                {available.sort((a, b) => a.ticker.localeCompare(b.ticker)).map(a => (
                  <option key={a.ticker} value={a.ticker}>{a.ticker} — DY 5a {num(a.price > 0 ? (a.div / a.price) * 100 : 0, 1)}%</option>
                ))}
              </select>
              <button disabled={!adding}
                onClick={() => { setPicks(p => [...p, { ticker: adding, weight: 20 }]); setAdding(''); }}
                className="px-3 py-2 bg-zinc-950 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> Incluir
              </button>
            </div>
          )}
          <p className="text-[10px] text-zinc-400 mt-3">Pesos são relativos: o app normaliza para 100%.</p>
        </section>

        {/* Bola de neve */}
        <section className="xl:col-span-3 bg-white data-grid-border rounded-xl p-5 shadow-sm">
          <h3 className="font-serif italic text-lg text-zinc-900 flex items-center gap-2"><Target className="w-4 h-4 text-zinc-500" /> Caminho até a meta</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Patrimônio com aportes de {brl(monthly, 0)}/mês, yield de {num(plan.blendedYield || minYield, 1)}% e crescimento de {num(growth, 1)}% ao ano.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-emerald-600" />Patrimônio</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 border-t border-dashed border-zinc-400" />Do seu bolso</span>
            <span>Toque no gráfico para ver a renda mensal de cada ano</span>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ball.series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}a`} />
                <YAxis yAxisId="p" tick={{ fontSize: 10 }} width={52} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-2.5 text-[11px] font-mono">
                        <div className="font-bold text-zinc-900 mb-1">Ano {d.year}</div>
                        <div className="text-emerald-700">Patrimônio {brl(d.patrimonio, 0)}</div>
                        <div className="text-zinc-500">Do seu bolso {brl(d.investido, 0)}</div>
                        <div className="text-zinc-900 font-bold mt-1">Renda {brl(d.renda, 0)}/mês</div>
                      </div>
                    );
                  }}
                />
                <Area yAxisId="p" type="monotone" dataKey="patrimonio" stroke="#059669" strokeWidth={2} fill="url(#gPat)" />
                <Area yAxisId="p" type="monotone" dataKey="investido" stroke="#a1a1aa" strokeDasharray="4 3" fill="none" />
                {ball.reachedAt !== null && (
                  <ReferenceLine yAxisId="p" x={ball.series.find(s => s.month >= ball.reachedAt!)?.year} stroke="#18181b" strokeDasharray="3 3"
                    label={{ value: 'meta', position: 'top', fontSize: 10 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">Simulação educativa. Dividendos passados não garantem pagamentos futuros.</p>
        </section>
      </div>
    </div>
  );
};
