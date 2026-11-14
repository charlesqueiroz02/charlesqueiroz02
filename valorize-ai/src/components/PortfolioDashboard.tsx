import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase, Trash2, AlertCircle, ArrowRight, RefreshCw, Download, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bar, BarChart, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PortfolioItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { fetchQuotes, type Quote } from '../lib/quotes';
import { brl, num, pct, upsidePct, entryPrice, signalFor, toExcelCsv, downloadText } from '../lib/valuation';
import { CHART, axisTick, tooltipStyle } from '../lib/chartTheme';

interface PortfolioDashboardProps {
  portfolio: PortfolioItem[];
  onRemove: (ticker: string) => void;
  onSelect: (ticker: string) => void;
  onUpdateAlert: (ticker: string, price: number, condition: 'above' | 'below') => void;
  /** Avisa quais alertas de preço dispararam com as cotações atualizadas */
  onAlertsChecked?: (triggered: string[]) => void;
  isFetching?: boolean;
  minYield: number;
  margin: number;
  bazinMode: '5y' | '12m';
}

const signalLabel = { COMPRA: 'Zona de compra', AGUARDAR: 'Aguardar', VENDA: 'Acima do alvo' } as const;
const signalTone = {
  COMPRA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  AGUARDAR: 'bg-amber-50 text-amber-800 border-amber-200',
  VENDA: 'bg-rose-50 text-rose-700 border-rose-200',
} as const;

/**
 * Carteira com rentabilidade, renda e alocação.
 * Antes mostrava só preço médio e quantidade — sem cotação atual, resultado ou renda.
 */
export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  portfolio, onRemove, onSelect, onUpdateAlert, onAlertsChecked, isFetching, minYield, margin, bazinMode,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickersKey = portfolio.map(p => p.ticker).sort().join(',');

  const refresh = useCallback(async () => {
    if (!tickersKey) return;
    setLoading(true);
    setError(null);
    try {
      setQuotes(await fetchQuotes(tickersKey.split(','), minYield));
    } catch (e: any) {
      setError(e?.message || 'Não foi possível atualizar as cotações da carteira.');
    } finally {
      setLoading(false);
    }
  }, [tickersKey, minYield]);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo(() => portfolio.map(item => {
    const q = quotes[item.ticker];
    const invested = item.purchasePrice * item.quantity;
    const price = q?.price ?? 0;
    const value = price > 0 ? price * item.quantity : invested;
    const bazinTarget = bazinMode === '5y' ? (q?.bazinFair5y || 0) : (q?.bazinFair || 0);
    return {
      item, q, invested, price, value,
      result: price > 0 ? value - invested : 0,
      resultPct: price > 0 ? upsidePct(price, item.purchasePrice) : 0,
      income: (q?.dividends || 0) * item.quantity,
      yieldOnCost: item.purchasePrice > 0 ? ((q?.dividends || 0) / item.purchasePrice) * 100 : 0,
      grahamUp: q ? upsidePct(q.grahamFair, price) : 0,
      bazinUp: q ? upsidePct(bazinTarget, price) : 0,
      grahamSignal: q ? signalFor(price, q.grahamFair, margin) : null,
      bazinSignal: q ? signalFor(price, bazinTarget, margin) : null,
      bazinEntry: entryPrice(bazinTarget, margin),
      sector: q?.sector?.split('/')[0].trim() || 'Sem setor',
    };
  }), [portfolio, quotes, margin, bazinMode]);

  // Alertas conferidos para TODA a carteira (antes, só quando a ação era aberta no Raio-X)
  useEffect(() => {
    if (!onAlertsChecked || !Object.keys(quotes).length) return;
    const hit = rows
      .filter(r => r.price > 0 && r.item.alertPrice && r.item.alertCondition)
      .filter(r => (r.item.alertCondition === 'above' ? r.price >= r.item.alertPrice! : r.price <= r.item.alertPrice!))
      .map(r => r.item.ticker);
    onAlertsChecked(hit);
    // Só reage a cotações novas; editar o alerta não deve redisparar a checagem a cada tecla
  }, [quotes]);

  const totals = useMemo(() => {
    const invested = rows.reduce((a, r) => a + r.invested, 0);
    const value = rows.reduce((a, r) => a + r.value, 0);
    const income = rows.reduce((a, r) => a + r.income, 0);
    return {
      invested, value, income,
      result: value - invested,
      resultPct: invested > 0 ? (value / invested - 1) * 100 : 0,
      yieldOnCost: invested > 0 ? (income / invested) * 100 : 0,
      dy: value > 0 ? (income / value) * 100 : 0,
      priced: rows.filter(r => r.price > 0).length,
    };
  }, [rows]);

  const allocation = useMemo(() => rows
    .map(r => ({ name: r.item.ticker, value: Number(r.value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value), [rows]);

  const bySector = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => m.set(r.sector, (m.get(r.sector) || 0) + r.value));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const resultChart = rows
    .filter(r => r.price > 0)
    .map(r => ({ ticker: r.item.ticker, pct: Number(r.resultPct.toFixed(1)) }))
    .sort((a, b) => b.pct - a.pct);

  const exportCsv = () => downloadText(`carteira-${new Date().toISOString().slice(0, 10)}.csv`, toExcelCsv(rows.map(r => ({
    Ticker: r.item.ticker, Quantidade: r.item.quantity, 'Preço médio R$': r.item.purchasePrice, 'Cotação R$': r.price,
    'Investido R$': r.invested, 'Valor atual R$': r.value, 'Resultado R$': r.result, 'Resultado %': r.resultPct,
    'Renda anual R$': r.income, 'Yield on cost %': r.yieldOnCost, 'Até Graham %': r.grahamUp, 'Até Bazin %': r.bazinUp,
  }))));

  if (portfolio.length === 0) {
    return (
      <div className="bg-white data-grid-border p-12 rounded-xl shadow-sm mt-8 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Briefcase className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="font-serif italic text-xl text-zinc-900 mb-2">Sua carteira está vazia</h3>
        <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
          Abra uma ação no Raio-X e toque em "Adicionar à carteira" para acompanhar resultado, renda e os sinais de Graham e Bazin.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-emerald-700" />
          <div>
            <h3 className="font-serif italic text-2xl text-zinc-900">Minha carteira</h3>
            <p className="text-xs text-zinc-500">
              {isAuthenticated && user
                ? <span className="text-emerald-700 font-medium">Conta de <strong>{user.profile.name}</strong> · salva neste aparelho</span>
                : 'Modo convidado · salva neste aparelho'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700 text-xs font-semibold">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={refresh} disabled={loading} aria-label="Atualizar cotações da carteira"
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600 disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{error} Os valores abaixo usam o preço médio onde falta cotação.</span>
          <button onClick={refresh} className="text-xs font-bold hover:underline shrink-0">Tentar de novo</button>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'Valor atual', v: brl(totals.value, 0), sub: `investido ${brl(totals.invested, 0)}` },
          { k: 'Resultado', v: `${totals.result >= 0 ? '+' : ''}${brl(totals.result, 0)}`, sub: pct(totals.resultPct), tone: totals.result >= 0 ? 'text-emerald-700' : 'text-rose-600' },
          { k: 'Renda anual estimada', v: brl(totals.income, 0), sub: `${brl(totals.income / 12, 0)} por mês (proventos 12m)` },
          { k: 'Yield on cost', v: `${num(totals.yieldOnCost, 1)}%`, sub: `DY a preço de hoje ${num(totals.dy, 1)}%` },
        ].map(c => (
          <div key={c.k} className="bg-white data-grid-border rounded-xl p-4 shadow-sm">
            <div className="text-[11px] text-zinc-500">{c.k}</div>
            <div className={cn('text-lg sm:text-xl font-mono font-bold mt-1 leading-tight text-zinc-900', c.tone)}>
              {loading && !totals.priced ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : c.v}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white data-grid-border rounded-xl p-5 shadow-sm">
          <h4 className="font-serif italic text-lg text-zinc-900">Distribuição</h4>
          <p className="text-xs text-zinc-500 mb-2">Por ativo (anel externo) e por setor (anel interno), a preços de hoje.</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
            <div className="h-56" role="img" aria-label={'Distribuição da carteira: ' + allocation.map(a => `${a.name} ${num((a.value / (totals.value || 1)) * 100, 0)}%`).join(', ')}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySector} dataKey="value" nameKey="name" innerRadius="28%" outerRadius="50%" paddingAngle={1} stroke="#fff">
                    {bySector.map((_, i) => <Cell key={i} fill={CHART.series[(i + 3) % CHART.series.length]} fillOpacity={0.55} />)}
                  </Pie>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={1} stroke="#fff">
                    {allocation.map((_, i) => <Cell key={i} fill={CHART.series[i % CHART.series.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${brl(v, 0)} · ${num((v / (totals.value || 1)) * 100, 1)}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="text-xs space-y-1 min-w-[150px]">
              {allocation.map((a, i) => (
                <li key={a.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 font-mono font-semibold text-zinc-800">
                    <i className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART.series[i % CHART.series.length] }} />{a.name}
                  </span>
                  <span className="font-mono text-zinc-600">{num((a.value / (totals.value || 1)) * 100, 1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white data-grid-border rounded-xl p-5 shadow-sm">
          <h4 className="font-serif italic text-lg text-zinc-900">Resultado por posição</h4>
          <p className="text-xs text-zinc-500 mb-2">Cotação de hoje contra o seu preço médio.</p>
          {resultChart.length ? (
            <div className="h-56" role="img" aria-label={'Resultado por posição: ' + resultChart.map(r => `${r.ticker} ${r.pct}%`).join(', ')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultChart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tick={axisTick} unit="%" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="ticker" tick={axisTick} width={56} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v > 0 ? '+' : ''}${num(v, 1)}%`, 'Resultado']} />
                  <ReferenceLine x={0} stroke={CHART.neutral} />
                  <Bar dataKey="pct" radius={4} maxBarSize={18}>
                    {resultChart.map(r => <Cell key={r.ticker} fill={r.pct >= 0 ? CHART.positive : CHART.negative} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 py-16 text-center">{loading ? 'Carregando cotações…' : 'Sem cotações no momento.'}</p>
          )}
        </section>
      </div>

      {/* Posições */}
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {rows.map(r => (
            <motion.div
              key={r.item.ticker}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white data-grid-border p-4 sm:p-5 rounded-xl shadow-sm"
            >
              <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                <div className="flex items-center gap-3 xl:w-56 shrink-0">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg flex items-center justify-center font-mono font-bold text-[11px]">
                    {r.item.ticker}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-zinc-900 leading-none">{r.item.ticker}</h4>
                    <p className="text-[11px] text-zinc-500 truncate mt-1">{r.q?.name || '—'}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 flex-grow text-xs">
                  <div>
                    <dt className="text-zinc-500">Quantidade · médio</dt>
                    <dd className="font-mono font-bold text-zinc-900">{r.item.quantity} × {brl(r.item.purchasePrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Cotação · valor</dt>
                    <dd className="font-mono font-bold text-zinc-900">{r.price > 0 ? `${brl(r.price)} · ${brl(r.value, 0)}` : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Resultado</dt>
                    <dd className={cn('font-mono font-bold', r.result >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                      {r.price > 0 ? `${r.result >= 0 ? '+' : ''}${brl(r.result, 0)} (${pct(r.resultPct)})` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Renda anual · YoC</dt>
                    <dd className="font-mono font-bold text-zinc-900">{brl(r.income, 0)} · {num(r.yieldOnCost, 1)}%</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-2">
                    {r.grahamSignal && r.q && r.q.grahamFair > 0 && (
                      <span className={cn('px-2 py-0.5 rounded border text-[11px] font-semibold', signalTone[r.grahamSignal])}>
                        Graham: {signalLabel[r.grahamSignal]} ({pct(r.grahamUp, 0)})
                      </span>
                    )}
                    {r.bazinSignal && r.bazinEntry > 0 && (
                      <span className={cn('px-2 py-0.5 rounded border text-[11px] font-semibold', signalTone[r.bazinSignal])}>
                        Bazin {num(minYield, 1)}%: {signalLabel[r.bazinSignal]} ({pct(r.bazinUp, 0)})
                      </span>
                    )}
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 ml-auto">
                      <AlertCircle className={cn('w-3.5 h-3.5', r.item.alertPrice ? 'text-amber-600' : 'text-zinc-400')} />
                      Alerta
                      <select
                        value={r.item.alertCondition || 'above'}
                        onChange={e => onUpdateAlert(r.item.ticker, r.item.alertPrice || 0, e.target.value as 'above' | 'below')}
                        aria-label={`Condição do alerta de ${r.item.ticker}`}
                        className="bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none font-semibold"
                      >
                        <option value="above">acima de</option>
                        <option value="below">abaixo de</option>
                      </select>
                      <input
                        type="number" inputMode="decimal" min={0} step="0.01" placeholder="R$"
                        value={r.item.alertPrice || ''}
                        onChange={e => onUpdateAlert(r.item.ticker, Math.max(0, parseFloat(e.target.value) || 0), r.item.alertCondition || 'above')}
                        aria-label={`Preço do alerta de ${r.item.ticker}`}
                        className="w-20 font-mono bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:border-emerald-500"
                      />
                    </label>
                  </div>
                </dl>

                <div className="flex items-center gap-2 xl:justify-end">
                  <button
                    onClick={() => onSelect(r.item.ticker)}
                    disabled={isFetching}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    {isFetching ? 'Buscando…' : 'Analisar'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Remover ${r.item.ticker} da carteira?`)) onRemove(r.item.ticker); }}
                    className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    aria-label={`Remover ${r.item.ticker} da carteira`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-[11px] text-zinc-500">
        Renda estimada com os proventos pagos nos últimos 12 meses; não é garantia de pagamentos futuros.
        Sinais usam sua margem de segurança de {margin}% e o Bazin pela {bazinMode === '5y' ? 'média de 5 anos' : 'base de 12 meses'}.
      </p>
    </div>
  );
};
