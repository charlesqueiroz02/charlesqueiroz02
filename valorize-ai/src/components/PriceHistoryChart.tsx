import React, { useMemo, useState } from 'react';
import {
  Area,
  ComposedChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import type { HistoricalPoint } from '../types';
import { brl, upsidePct, pct } from '../lib/valuation';
import { CHART, axisTick, tooltipStyle } from '../lib/chartTheme';
import { CandlestickChart } from './CandlestickChart';

interface PriceHistoryChartProps {
  ticker: string;
  points: { t: number; close: number }[];
  annual?: HistoricalPoint[];
  grahamFair: number;
  grahamEntry: number;
  bazinCeiling: number;
  bazinEntry: number;
  bazinLabel: string;
}

const PERIODS = [
  { id: 12, label: '1 ano' },
  { id: 36, label: '3 anos' },
  { id: 0, label: 'Tudo' },
] as const;

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

/**
 * Cotação mensal com as linhas de Preço Justo (Graham) e Preço Teto (Bazin) e a zona de compra
 * (abaixo do preço de entrada com margem). Mostra de relance se a ação já esteve barata e quando.
 */
export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  ticker, points, annual, grahamFair, grahamEntry, bazinCeiling, bazinEntry, bazinLabel,
}) => {
  const [period, setPeriod] = useState<number>(36);
  const [view, setView] = useState<'linha' | 'velas'>('linha');

  const data = useMemo(() => {
    const list = period ? points.slice(-period) : points;
    return list.map(p => ({ ...p, label: monthFmt.format(new Date(p.t)) }));
  }, [points, period]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const closes = data.map(d => d.close);
    const first = closes[0], last = closes[closes.length - 1];
    const buyLine = Math.max(grahamEntry, bazinEntry);
    const monthsInZone = buyLine > 0 ? closes.filter(c => c <= buyLine).length : 0;
    return {
      change: upsidePct(last, first),
      min: Math.min(...closes),
      max: Math.max(...closes),
      monthsInZone,
      total: closes.length,
    };
  }, [data, grahamEntry, bazinEntry]);

  const buyTop = Math.max(grahamEntry, bazinEntry);
  const values = [...data.map(d => d.close), grahamFair, bazinCeiling].filter(v => v > 0);
  const yMin = values.length ? Math.min(...values) * 0.85 : 0;
  const yMax = values.length ? Math.max(...values) * 1.08 : 1;

  const hasLine = points.length >= 3;
  const hasCandles = (annual?.length ?? 0) > 0;
  if (!hasLine && !hasCandles) return null;

  return (
    <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm" aria-labelledby="ph-title">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
        <div>
          <h3 id="ph-title" className="font-serif italic text-xl text-zinc-900 flex items-center gap-2">
            <LineIcon className="w-4 h-4 text-emerald-600" /> Preço de {ticker} vs. alvos de Graham e Bazin
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            A faixa verde é a zona de compra (abaixo do preço de entrada com margem de segurança).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasLine && hasCandles && (
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200" role="group" aria-label="Tipo de gráfico">
              {(['linha', 'velas'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${view === v ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'}`}>
                  {v === 'linha' ? 'Mensal' : 'Velas anuais'}
                </button>
              ))}
            </div>
          )}
          {view === 'linha' && hasLine && (
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200" role="group" aria-label="Período">
              {PERIODS.map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)} aria-pressed={period === p.id}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${period === p.id ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === 'velas' || !hasLine ? (
        <div className="h-72">
          <CandlestickChart data={annual || []} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 mb-2">
            <span className="flex items-center gap-1.5"><i className="w-3 h-0.5" style={{ background: CHART.price }} />Cotação</span>
            {grahamFair > 0 && <span className="flex items-center gap-1.5"><i className="w-3 border-t-2 border-dashed" style={{ borderColor: CHART.graham }} />Graham {brl(grahamFair)}</span>}
            {bazinCeiling > 0 && <span className="flex items-center gap-1.5"><i className="w-3 border-t-2 border-dashed" style={{ borderColor: CHART.bazin }} />{bazinLabel} {brl(bazinCeiling)}</span>}
            {buyTop > 0 && <span className="flex items-center gap-1.5"><i className="w-3 h-2.5 rounded-sm" style={{ background: CHART.buyZone }} />Zona de compra até {brl(buyTop)}</span>}
          </div>
          <div className="h-72" role="img"
            aria-label={`Gráfico da cotação mensal de ${ticker}. Preço justo de Graham ${brl(grahamFair)}, preço teto de Bazin ${brl(bazinCeiling)}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="phFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.price} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={CHART.price} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                {buyTop > 0 && <ReferenceArea y1={yMin} y2={Math.min(buyTop, yMax)} fill={CHART.buyZone} fillOpacity={0.7} ifOverflow="hidden" />}
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={[yMin, yMax]} tick={axisTick} axisLine={false} tickLine={false} width={56}
                  tickFormatter={v => `R$${Math.round(v)}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [brl(v), 'Fechamento']} />
                {grahamFair > 0 && <ReferenceLine y={grahamFair} stroke={CHART.graham} strokeDasharray="6 4" strokeWidth={1.5} ifOverflow="extendDomain" />}
                {bazinCeiling > 0 && <ReferenceLine y={bazinCeiling} stroke={CHART.bazin} strokeDasharray="6 4" strokeWidth={1.5} ifOverflow="extendDomain" />}
                <Area type="monotone" dataKey="close" stroke={CHART.price} strokeWidth={2} fill="url(#phFill)" dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {stats && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                <dt className="text-zinc-500">Variação no período</dt>
                <dd className={`font-mono font-bold mt-0.5 ${stats.change >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{pct(stats.change)}</dd>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                <dt className="text-zinc-500">Mínima mensal</dt>
                <dd className="font-mono font-bold text-zinc-900 mt-0.5">{brl(stats.min)}</dd>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                <dt className="text-zinc-500">Máxima mensal</dt>
                <dd className="font-mono font-bold text-zinc-900 mt-0.5">{brl(stats.max)}</dd>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                <dt className="text-zinc-500" title="Usa os alvos de hoje aplicados aos preços passados">Meses na zona (alvos de hoje)</dt>
                <dd className="font-mono font-bold text-zinc-900 mt-0.5">{stats.monthsInZone} de {stats.total}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </section>
  );
};
