import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { bazinCeilingPrice, grahamFairPrice, upsidePct, num, brl } from '../lib/valuation';
import { safeToFixed } from '../lib/utils';
import { CHART, axisTick, tooltipStyle } from '../lib/chartTheme';

interface ComparedStock {
  ticker: string;
  name: string;
  price: number;
  lpa: number;
  vpa: number;
  pl: number;
  pvp: number;
  dy: number;
  grahamFair: number;
  bazinFair: number;
  bazinFair5y?: number;
  upside: number;
}

interface StockComparatorProps {
  currentTicker: string;
  currentName?: string;
  currentPrice: number;
  lpa: number;
  vpa: number;
  dividends: number;
  avgDividends5y?: number;
  minYield: number;
}

const DEFAULT_PEERS = ['VALE3', 'PETR4'];

/**
 * Comparativo de múltiplos lado a lado.
 * Corrigido: antes começava com cotações fixas e antigas, usava Bazin a 6% fixo
 * e recalculava LPA/VPA de forma indireta. Agora tudo vem da API, com o yield do usuário.
 */
export const StockComparator: React.FC<StockComparatorProps> = ({
  currentTicker, currentName, currentPrice, lpa, vpa, dividends, avgDividends5y, minYield,
}) => {
  const [peers, setPeers] = useState<string[]>(DEFAULT_PEERS);
  const [rows, setRows] = useState<ComparedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputTicker, setInputTicker] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (list: string[]) => {
    const tickers = list.filter(t => t !== currentTicker);
    if (!tickers.length) { setRows([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/compare?tickers=${encodeURIComponent(tickers.join(','))}&minYield=${minYield}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Não foi possível atualizar o comparativo.');
      if (Array.isArray(data)) {
        setRows(data);
        const missing = tickers.filter(t => !data.some((d: ComparedStock) => d.ticker === t));
        if (missing.length) setErrorMessage(`Sem cotação agora para: ${missing.join(', ')}.`);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Não foi possível atualizar o comparativo.');
    } finally {
      setLoading(false);
    }
  }, [currentTicker, minYield]);

  // Recarrega ao trocar a ação em foco ou o yield mínimo
  useEffect(() => { load(peers); }, [load]);

  const current: ComparedStock = useMemo(() => {
    const g = grahamFairPrice(lpa, vpa);
    return {
      ticker: currentTicker,
      name: currentName || 'Ação em análise',
      price: currentPrice, lpa, vpa,
      pl: lpa > 0 ? currentPrice / lpa : 0,
      pvp: vpa > 0 ? currentPrice / vpa : 0,
      dy: currentPrice > 0 ? (dividends / currentPrice) * 100 : 0,
      grahamFair: g,
      bazinFair: bazinCeilingPrice(dividends, minYield),
      bazinFair5y: bazinCeilingPrice(avgDividends5y || dividends, minYield),
      upside: upsidePct(g, currentPrice),
    };
  }, [currentTicker, currentName, currentPrice, lpa, vpa, dividends, avgDividends5y, minYield]);

  const visibleList = [current, ...rows.filter(r => r.ticker !== currentTicker)];

  const chartData = visibleList.map(s => ({
    ticker: s.ticker,
    Graham: Number(safeToFixed(s.upside, 1)),
    Bazin: Number(safeToFixed(upsidePct(s.bazinFair5y || s.bazinFair, s.price), 1)),
  }));

  const addTickerToCompare = async () => {
    const clean = inputTicker.trim().toUpperCase().replace(/\.SA$/i, '');
    setErrorMessage(null);
    if (!clean) return;
    if (!/^[A-Z]{4}\d{1,2}[A-Z]?$/.test(clean)) {
      setErrorMessage('Use o código da B3, ex.: BBAS3, TAEE11.');
      return;
    }
    if (clean === currentTicker || peers.includes(clean)) { setInputTicker(''); return; }
    if (peers.length >= 8) { setErrorMessage('Compare até 8 ações por vez.'); return; }
    const next = [...peers, clean];
    setPeers(next);
    setInputTicker('');
    await load(next);
  };

  const removeTicker = (t: string) => {
    setPeers(p => p.filter(x => x !== t));
    setRows(r => r.filter(x => x.ticker !== t));
  };

  return (
    <section className="bg-white data-grid-border p-5 sm:p-6 rounded-xl shadow-sm mt-8" aria-labelledby="cmp-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 id="cmp-title" className="font-serif italic text-xl tracking-tight text-zinc-900">Comparativo de múltiplos</h3>
            <p className="text-xs text-zinc-500">Bazin com yield mínimo de {num(minYield, 1)}% · média de 5 anos</p>
          </div>
        </div>

        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); addTickerToCompare(); }}>
          <input
            type="text"
            placeholder="Adicionar (ex: BBAS3)"
            aria-label="Código da ação para comparar"
            value={inputTicker}
            onChange={e => { setInputTicker(e.target.value.toUpperCase()); setErrorMessage(null); }}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono uppercase bg-zinc-50 w-40 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="submit" disabled={loading || !inputTicker.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 disabled:opacity-50" aria-label="Adicionar ao comparativo">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => load(peers)} disabled={loading}
            className="p-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-100" aria-label="Atualizar cotações">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {errorMessage && <p role="status" className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-4">{errorMessage}</p>}

      {visibleList.length > 1 && (
        <div className="h-56 mb-6" role="img" aria-label="Gráfico de barras com o potencial até o preço justo de Graham e o preço teto de Bazin de cada ação">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="ticker" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${num(v, 1)}%`, `Até o alvo ${n}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke={CHART.neutral} />
              <Bar dataKey="Graham" fill={CHART.graham} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Bazin" fill={CHART.bazin} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-[11px] uppercase text-zinc-500">
              <th scope="col" className="py-2.5 pr-3">Ticker</th>
              <th scope="col" className="py-2.5 pr-3">Preço</th>
              <th scope="col" className="py-2.5 pr-3">LPA</th>
              <th scope="col" className="py-2.5 pr-3">VPA</th>
              <th scope="col" className="py-2.5 pr-3">P/L</th>
              <th scope="col" className="py-2.5 pr-3">P/VP</th>
              <th scope="col" className="py-2.5 pr-3">DY 12m</th>
              <th scope="col" className="py-2.5 pr-3">Graham</th>
              <th scope="col" className="py-2.5 pr-3">Bazin 5a</th>
              <th scope="col" className="py-2.5 pr-3">Até Graham</th>
              <th scope="col" className="py-2.5 text-right"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800">
            {visibleList.map(stk => (
              <tr key={stk.ticker} className={stk.ticker === currentTicker ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-zinc-50/60'}>
                <td className="py-3 pr-3">
                  <div className="font-bold text-zinc-900">{stk.ticker}</div>
                  <div className="text-[10px] text-zinc-500 font-sans font-normal truncate max-w-[130px]">{stk.name}</div>
                </td>
                <td className="py-3 pr-3">{brl(stk.price)}</td>
                <td className="py-3 pr-3 text-zinc-600">{brl(stk.lpa)}</td>
                <td className="py-3 pr-3 text-zinc-600">{brl(stk.vpa)}</td>
                <td className="py-3 pr-3">{stk.pl > 0 ? num(stk.pl, 1) : 'N/D'}</td>
                <td className="py-3 pr-3">{stk.pvp > 0 ? num(stk.pvp, 2) : 'N/D'}</td>
                <td className="py-3 pr-3 text-emerald-700 font-bold">{num(stk.dy, 2)}%</td>
                <td className="py-3 pr-3">{stk.grahamFair > 0 ? `${brl(stk.grahamFair)}` : 'N/A'}</td>
                <td className="py-3 pr-3">{(stk.bazinFair5y || stk.bazinFair) > 0 ? `${brl(stk.bazinFair5y || stk.bazinFair)}` : 'N/A'}</td>
                <td className={`py-3 pr-3 font-bold ${stk.upside >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {stk.grahamFair > 0 ? `${stk.upside >= 0 ? '+' : ''}${num(stk.upside, 1)}%` : '—'}
                </td>
                <td className="py-3 text-right">
                  {stk.ticker !== currentTicker ? (
                    <button onClick={() => removeTicker(stk.ticker)}
                      className="text-zinc-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50" aria-label={`Remover ${stk.ticker}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 font-bold">Foco</span>
                  )}
                </td>
              </tr>
            ))}
            {loading && rows.length === 0 && (
              <tr><td colSpan={11} className="py-6 text-center text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando comparativo…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
