import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';

interface ComparedStock {
  ticker: string;
  name: string;
  price: number;
  pl: number;
  pvp: number;
  dy: number;
  grahamFair: number;
  bazinFair: number;
  upside: number;
}

const safeToFixed = (val: any, decimals: number = 2): string => {
  const num = Number(val);
  if (val === undefined || val === null || isNaN(num) || !isFinite(num)) {
    return "0.00";
  }
  return num.toFixed(decimals);
};

export const StockComparator: React.FC<{ 
  currentTicker: string; 
  currentPrice: number; 
  lpa: number; 
  vpa: number; 
  dividends: number;
}> = ({
  currentTicker,
  currentPrice,
  lpa,
  vpa,
  dividends
}) => {
  const currentGraham = lpa > 0 && vpa > 0 ? Math.sqrt(22.5 * lpa * vpa) : 0;
  const currentBazin = dividends > 0 ? dividends / 0.06 : 0; // standard 6%
  const currentUpside = currentPrice > 0 && currentGraham > 0 ? ((currentGraham / currentPrice) - 1) * 100 : 0;

  const [compareList, setCompareList] = useState<ComparedStock[]>([
    {
      ticker: "VALE3",
      name: "Vale S.A.",
      price: 70.79,
      pl: 7.20,
      pvp: 1.40,
      dy: 7.92,
      grahamFair: 78.50,
      bazinFair: 93.50,
      upside: 10.9
    },
    {
      ticker: "PETR4",
      name: "Petróleo Brasileiro S.A.",
      price: 49.93,
      pl: 4.82,
      pvp: 1.34,
      dy: 7.33,
      grahamFair: 93.19,
      bazinFair: 61.00,
      upside: 86.6
    }
  ]);

  const [inputTicker, setInputTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real data for compareList on mount or when default stocks need real data
  useEffect(() => {
    async function loadRealData() {
      try {
        const tickersToLoad = compareList.map(c => c.ticker).filter(t => t !== currentTicker);
        if (tickersToLoad.length === 0) return;

        const res = await fetch(`/api/stock/compare?tickers=${tickersToLoad.join(',')}`);
        if (res.ok) {
          const list: ComparedStock[] = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setCompareList(list);
          }
        }
      } catch (e) {
        console.warn("Could not load initial compare list real data:", e);
      }
    }
    loadRealData();
  }, []);

  const currentStockItem: ComparedStock = {
    ticker: currentTicker,
    name: "Ação em Análise",
    price: currentPrice,
    pl: lpa > 0 ? currentPrice / lpa : 0,
    pvp: vpa > 0 ? currentPrice / vpa : 0,
    dy: currentPrice > 0 ? (dividends / currentPrice) * 100 : 0,
    grahamFair: currentGraham,
    bazinFair: currentBazin,
    upside: currentUpside
  };

  const visibleList = [
    currentStockItem,
    ...compareList.filter(item => item.ticker !== currentTicker)
  ];

  const addTickerToCompare = async () => {
    if (!inputTicker || isAdding) return;
    const cleanTicker = inputTicker.trim().toUpperCase().replace(/\.SA$/i, '');
    setErrorMessage(null);

    if (cleanTicker === currentTicker || compareList.some(s => s.ticker === cleanTicker)) {
      setInputTicker("");
      return;
    }

    setIsAdding(true);

    try {
      // Call backend API for real B3 market indicators
      const res = await fetch(`/api/stock/${encodeURIComponent(cleanTicker)}`);
      
      if (!res.ok) {
        throw new Error(`Ação ${cleanTicker} não encontrada na B3.`);
      }

      const d = await res.json();
      
      const price = d.currentPrice || 0;
      const targetLpa = d.lpa || 0;
      const targetVpa = d.vpa || 0;
      const targetDivs = d.dividends || 0;
      const compName = d.companyName || cleanTicker;

      const gFair = targetLpa > 0 && targetVpa > 0 ? Math.sqrt(22.5 * targetLpa * targetVpa) : 0;
      const bFair = targetDivs > 0 ? targetDivs / 0.06 : 0;
      const up = price > 0 && gFair > 0 ? ((gFair / price) - 1) * 100 : 0;

      const nextStock: ComparedStock = {
        ticker: cleanTicker,
        name: compName,
        price,
        pl: targetLpa > 0 ? price / targetLpa : 0,
        pvp: targetVpa > 0 ? price / targetVpa : 0,
        dy: price > 0 ? (targetDivs / price) * 100 : 0,
        grahamFair: gFair,
        bazinFair: bFair,
        upside: up
      };

      setCompareList(prev => [...prev.filter(s => s.ticker !== cleanTicker), nextStock]);
      setInputTicker("");
    } catch (err: any) {
      console.error("Failed adding comparator ticker:", err);
      setErrorMessage(err.message || `Não foi possível encontrar ${cleanTicker}.`);
    } finally {
      setIsAdding(false);
    }
  };

  const removeTicker = (tickerToRemove: string) => {
    if (tickerToRemove === currentTicker) return;
    setCompareList(compareList.filter(s => s.ticker !== tickerToRemove));
  };

  const refreshAll = async () => {
    setIsAdding(true);
    try {
      const tickers = compareList.map(c => c.ticker).filter(t => t !== currentTicker);
      if (tickers.length > 0) {
        const res = await fetch(`/api/stock/compare?tickers=${tickers.join(',')}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) setCompareList(list);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white data-grid-border p-6 rounded-lg shadow-sm mt-8 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-white rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl tracking-tight text-zinc-900">Comparativo de Múltiplos Reais</h3>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono">Dados oficiais da B3 side-by-side em tempo real</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {errorMessage && (
            <span className="text-[10px] text-red-500 font-bold">{errorMessage}</span>
          )}
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Adicionar Ticker (ex: BBAS3)" 
              value={inputTicker}
              onChange={(e) => {
                setInputTicker(e.target.value.toUpperCase());
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && addTickerToCompare()}
              disabled={isAdding}
              className="border border-zinc-300 rounded px-2.5 py-1.5 text-xs font-mono uppercase bg-zinc-50 w-44 outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
            />
            <button 
              onClick={addTickerToCompare}
              disabled={isAdding || !inputTicker.trim()}
              className="bg-black hover:bg-zinc-800 text-white rounded p-2 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Adicionar ação à tabela comparativa"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
            <button
              onClick={refreshAll}
              disabled={isAdding}
              className="p-2 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Atualizar cotações reais"
            >
              <RefreshCw className={`w-4 h-4 ${isAdding ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">Ticker</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">Preço Atual</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">LPA</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">VPA</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">P/L</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">P/VP</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">DY Real (%)</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">Graham Justo</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">Bazin Teto</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold">Upside</th>
              <th className="py-2.5 text-[9px] uppercase text-zinc-400 font-bold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs text-zinc-800">
            {visibleList.map((stk) => (
              <tr key={stk.ticker} className={stk.ticker === currentTicker ? "bg-emerald-50/60 font-bold" : "hover:bg-zinc-50/50"}>
                <td className="py-3 font-bold text-zinc-900">
                  <div className="flex flex-col">
                    <span>{stk.ticker}</span>
                    <span className="text-[9px] text-zinc-400 font-normal truncate max-w-[130px]">{stk.name}</span>
                  </div>
                </td>
                <td className="py-3">R$ {safeToFixed(stk.price)}</td>
                <td className="py-3 text-zinc-600">R$ {safeToFixed(stk.pl > 0 && stk.price > 0 ? stk.price / stk.pl : 0)}</td>
                <td className="py-3 text-zinc-600">R$ {safeToFixed(stk.pvp > 0 && stk.price > 0 ? stk.price / stk.pvp : 0)}</td>
                <td className="py-3">{stk.pl > 0 ? safeToFixed(stk.pl) : "N/D"}</td>
                <td className="py-3">{stk.pvp > 0 ? safeToFixed(stk.pvp) : "N/D"}</td>
                <td className="py-3 text-emerald-600 font-bold">{safeToFixed(stk.dy)}%</td>
                <td className="py-3 text-zinc-500">R$ {safeToFixed(stk.grahamFair)}</td>
                <td className="py-3 text-zinc-500">R$ {safeToFixed(stk.bazinFair)}</td>
                <td className={`py-3 font-bold ${stk.upside >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {stk.upside >= 0 ? "+" : ""}{safeToFixed(stk.upside, 1)}%
                </td>
                <td className="py-3 text-right">
                  {stk.ticker !== currentTicker ? (
                    <button 
                      onClick={() => removeTicker(stk.ticker)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                      title={`Remover ${stk.ticker}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  ) : (
                    <span className="text-[9px] uppercase tracking-tighter bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 font-bold">Foco</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
