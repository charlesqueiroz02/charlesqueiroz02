import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  DollarSign, 
  PieChart, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Coins, 
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { OptimizerAsset, OptimizerResult, PortfolioItem } from '../types';
import { fetchQuotes } from '../lib/quotes';
import { isValidTicker, normalizeTicker } from '../lib/ticker';
import { num } from '../lib/valuation';

interface AllocationOptimizerProps {
  portfolio: PortfolioItem[];
  onApplyPurchases: (purchases: { ticker: string; shares: number; price: number }[]) => void;
  onSelectStock: (ticker: string) => void;
  minYield: number;
}

export const AllocationOptimizer: React.FC<AllocationOptimizerProps> = ({
  portfolio,
  onApplyPurchases,
  onSelectStock,
  minYield
}) => {
  const [contributionAmount, setContributionAmount] = useState<number>(3000);
  const [prioritizeDiscount, setPrioritizeDiscount] = useState<boolean>(true);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  // Corrigido: antes começava com 5 ações fixas e preços antigos, ignorando a sua carteira.
  // Agora parte da carteira real, com cotações e tetos de Bazin atuais (yield do usuário).
  const [assets, setAssets] = useState<OptimizerAsset[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const portfolioKey = portfolio.map(p => `${p.ticker}:${p.quantity}`).join('|');

  useEffect(() => {
    if (!portfolio.length) return;
    let alive = true;
    setLoadingQuotes(true);
    setQuoteError(null);
    fetchQuotes(portfolio.map(p => p.ticker), minYield)
      .then(q => {
        if (!alive) return;
        setAssets(prev => {
          const extras = prev.filter(a => !portfolio.some(p => p.ticker === a.ticker));
          const fromPortfolio = portfolio.map(p => {
            const old = prev.find(a => a.ticker === p.ticker);
            const quote = q[p.ticker];
            return {
              id: old?.id || p.ticker,
              ticker: p.ticker,
              name: quote?.name || old?.name || p.ticker,
              currentPrice: quote?.price || old?.currentPrice || 0,
              currentShares: p.quantity,
              targetWeight: old?.targetWeight ?? Math.round(100 / portfolio.length),
              bazinCeiling: quote?.bazinFair5y || 0,
              grahamFair: quote?.grahamFair || 0,
            };
          });
          return [...fromPortfolio, ...extras];
        });
        const missing = portfolio.filter(p => !q[p.ticker]).map(p => p.ticker);
        if (missing.length) setQuoteError(`Sem cotação agora para ${missing.join(', ')}: esses ativos ficam fora da sugestão.`);
      })
      .catch(e => alive && setQuoteError(e?.message || 'Não foi possível buscar as cotações.'))
      .finally(() => alive && setLoadingQuotes(false));
    return () => { alive = false; };
  }, [portfolioKey, minYield]);

  const [newTickerInput, setNewTickerInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Rebalancing & Optimization Engine
  const optimization = useMemo((): OptimizerResult => {
    const totalCurrentValue = assets.reduce((acc, a) => acc + (a.currentShares * a.currentPrice), 0);
    const totalFutureValue = totalCurrentValue + contributionAmount;

    // Normalize weights
    const totalTargetWeight = assets.reduce((acc, a) => acc + a.targetWeight, 0) || 100;

    let remainingCash = contributionAmount;

    // Step 1: Calculate gap for each asset to reach ideal weight
    const recommendations = assets.map(asset => {
      const currentTotal = asset.currentShares * asset.currentPrice;
      const currentWeight = totalCurrentValue > 0 ? (currentTotal / totalCurrentValue) * 100 : 0;
      const normalizedTargetWeight = (asset.targetWeight / totalTargetWeight) * 100;
      const idealValue = totalFutureValue * (normalizedTargetWeight / 100);
      const gapValue = Math.max(0, idealValue - currentTotal);

      // Sem provento não há teto de Bazin: antes o app inventava um teto 15% acima da cotação
      const ceiling = asset.bazinCeiling || 0;
      const upside = asset.currentPrice > 0 && ceiling > 0 ? ((ceiling / asset.currentPrice) - 1) * 100 : 0;
      const isDiscounted = ceiling > 0 && upside > 0;

      return {
        ticker: asset.ticker,
        name: asset.name,
        currentPrice: asset.currentPrice,
        currentShares: asset.currentShares,
        currentTotal,
        currentWeight,
        targetWeight: normalizedTargetWeight,
        gapValue,
        bazinCeiling: ceiling,
        upside,
        isDiscounted,
        sharesToBuy: 0,
        investmentAmount: 0,
        newSharesTotal: asset.currentShares,
        newTotal: currentTotal,
        newWeight: 0
      };
    });

    // Step 2: Sort candidates to buy by gap distance and discount
    const sortedCandidates = [...recommendations].sort((a, b) => {
      if (prioritizeDiscount) {
        // Boost priority for stocks with higher discount
        const scoreA = a.gapValue * (1 + (Math.max(0, a.upside) / 50));
        const scoreB = b.gapValue * (1 + (Math.max(0, b.upside) / 50));
        return scoreB - scoreA;
      }
      return b.gapValue - a.gapValue;
    });

    // Step 3: Allocate integer shares greedily
    let allocatedTotal = 0;

    // Pass 1: Allocate according to gap value
    sortedCandidates.forEach(cand => {
      const rec = recommendations.find(r => r.ticker === cand.ticker);
      if (!rec || rec.currentPrice <= 0) return;

      const targetSpend = Math.min(remainingCash, cand.gapValue);
      const possibleShares = Math.floor(targetSpend / rec.currentPrice);

      if (possibleShares > 0) {
        const cost = possibleShares * rec.currentPrice;
        rec.sharesToBuy += possibleShares;
        rec.investmentAmount += cost;
        remainingCash -= cost;
        allocatedTotal += cost;
      }
    });

    // Pass 2: With any remaining cash, buy shares of the most discounted asset below target
    if (remainingCash > 0) {
      const topPick = sortedCandidates.find(c => c.isDiscounted && c.currentPrice <= remainingCash);
      if (topPick) {
        const rec = recommendations.find(r => r.ticker === topPick.ticker);
        if (rec) {
          const extraShares = Math.floor(remainingCash / rec.currentPrice);
          if (extraShares > 0) {
            const cost = extraShares * rec.currentPrice;
            rec.sharesToBuy += extraShares;
            rec.investmentAmount += cost;
            remainingCash -= cost;
            allocatedTotal += cost;
          }
        }
      }
    }

    // Update final resulting weights
    const finalPortfolioTotal = totalCurrentValue + allocatedTotal;
    recommendations.forEach(rec => {
      rec.newSharesTotal = rec.currentShares + rec.sharesToBuy;
      rec.newTotal = rec.newSharesTotal * rec.currentPrice;
      rec.newWeight = finalPortfolioTotal > 0 ? (rec.newTotal / finalPortfolioTotal) * 100 : 0;
    });

    return {
      totalContribution: contributionAmount,
      allocatedAmount: allocatedTotal,
      residualCash: remainingCash,
      recommendations
    };
  }, [assets, contributionAmount, prioritizeDiscount]);

  const handleApply = () => {
    const toBuy = optimization.recommendations
      .filter(r => r.sharesToBuy > 0)
      .map(r => ({
        ticker: r.ticker,
        shares: r.sharesToBuy,
        price: r.currentPrice
      }));

    if (toBuy.length === 0) return;

    onApplyPurchases(toBuy);

    // Update local state to reflect new shares
    setAssets(prev => prev.map(a => {
      const buyItem = toBuy.find(b => b.ticker === a.ticker);
      return buyItem ? { ...a, currentShares: a.currentShares + buyItem.shares } : a;
    }));

    setAppliedMessage(`Aporte de R$ ${optimization.allocatedAmount.toFixed(2)} efetivado com sucesso no seu portfólio!`);
    setTimeout(() => setAppliedMessage(null), 5000);
  };

  const [addError, setAddError] = useState<string | null>(null);
  const handleAddTicker = async () => {
    if (!newTickerInput.trim() || isAdding) return;
    const clean = normalizeTicker(newTickerInput);
    setAddError(null);
    if (!isValidTicker(clean)) { setAddError('Use o código da B3, ex.: EGIE3.'); return; }
    if (assets.some(a => a.ticker === clean)) {
      setNewTickerInput('');
      return;
    }

    setIsAdding(true);
    try {
      const q = (await fetchQuotes([clean], minYield))[clean];
      // Corrigido: antes, sem cotação, o app usava preço 25 e proventos 1,5 inventados
      if (!q || q.price <= 0) { setAddError(`Não encontramos cotação para ${clean}.`); return; }
      setAssets(prev => [
        ...prev,
        {
          id: `${clean}-${Date.now()}`,
          ticker: clean,
          name: q.name || clean,
          currentPrice: q.price,
          currentShares: 0,
          targetWeight: 10,
          bazinCeiling: q.bazinFair5y || 0,
          grahamFair: q.grahamFair || 0,
        }
      ]);
      setNewTickerInput('');
    } catch (e: any) {
      setAddError(e?.message || 'Não foi possível adicionar agora.');
    } finally {
      setIsAdding(false);
    }
  };

  const removeAsset = (id: string) => {
    if (assets.length <= 1) return;
    setAssets(assets.filter(a => a.id !== id));
  };

  const updateAssetWeight = (id: string, weight: number) => {
    setAssets(assets.map(a => a.id === id ? { ...a, targetWeight: Math.max(0, weight) } : a));
  };

  const updateAssetShares = (id: string, shares: number) => {
    setAssets(assets.map(a => a.id === id ? { ...a, currentShares: Math.max(0, shares) } : a));
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded">
              <Calculator className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
              Rebalanceamento de Carteira
            </span>
          </div>
          <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight">
            Otimizador de Aportes Inteligente
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl mt-1">
            Descubra a quantidade exata de ações para comprar hoje, rebalanceando sua carteira rumo às metas percentuais e <strong>priorizando ativos com maior margem de segurança</strong>.
          </p>
        </div>

        {/* Contribution Presets */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">Valor Disponível para Aporte</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400">R$</span>
              <input
                type="number"
                step="100"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(Math.max(0, Number(e.target.value)))}
                className="pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-44"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Amount Pills & Algorithm Toggle */}
      <div className="bg-white data-grid-border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 mr-1">Atalhos de Aporte:</span>
          {[1000, 2000, 3000, 5000, 10000, 20000].map(val => (
            <button
              key={val}
              onClick={() => setContributionAmount(val)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                contributionAmount === val 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              R$ {val.toLocaleString('pt-BR')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prioritizeDiscount}
              onChange={(e) => setPrioritizeDiscount(e.target.checked)}
              className="accent-emerald-600 rounded"
            />
            <span className="text-xs text-zinc-700 font-medium">
              Priorizar ativos abaixo do <strong>Preço Teto</strong>
            </span>
          </label>
        </div>
      </div>

      {(loadingQuotes || quoteError || addError || (!portfolio.length && !assets.length)) && (
        <div role="status" className={`p-3 rounded-xl text-xs border ${quoteError || addError ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-zinc-200 text-zinc-600'}`}>
          {loadingQuotes ? 'Buscando cotações da sua carteira…'
            : addError || quoteError
            || 'Sua carteira está vazia. Adicione ativos abaixo (ex.: TAEE11) e defina a meta de cada um.'}
        </div>
      )}

      {appliedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {appliedMessage}
        </div>
      )}

      {/* Allocation Recommendations Table */}
      <div className="bg-white data-grid-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif italic text-lg text-zinc-900">Sugestão de Compra para o Aporte</h3>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
              Teto de Bazin com yield mínimo de {num(minYield, 1)}% · média de 5 anos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Adicionar ativo (ex: EGIE3)"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg font-mono text-xs uppercase w-44 outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddTicker}
              disabled={isAdding || !newTickerInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
              title="Adicionar à carteira de otimização"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-3">Cotação Atual</th>
                <th className="py-3 px-3">Cotas Atuais</th>
                <th className="py-3 px-3">Meta (%)</th>
                <th className="py-3 px-3">Alocação Atual</th>
                <th className="py-3 px-3">Teto Bazin</th>
                <th className="py-3 px-3 bg-emerald-50/70 text-emerald-900 font-bold">Comprar Agora</th>
                <th className="py-3 px-3 bg-emerald-50/70 text-emerald-900 font-bold">Total a Gastar</th>
                <th className="py-3 px-3">Nova Alocação</th>
                <th className="py-3 px-4 text-right">Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {optimization.recommendations.map(rec => {
                const asset = assets.find(a => a.ticker === rec.ticker);
                return (
                  <tr key={rec.ticker} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <button type="button" onClick={() => onSelectStock(rec.ticker)} className="font-bold text-zinc-900 hover:text-emerald-700 text-sm text-left" title={`Abrir ${rec.ticker} no Raio-X`}>{rec.ticker}</button>
                        <span className="text-[10px] text-zinc-400 font-sans truncate max-w-[130px]">{rec.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-800">
                      R$ {rec.currentPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        value={asset?.currentShares || 0}
                        onChange={(e) => asset && updateAssetShares(asset.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={asset?.targetWeight || 0}
                          onChange={(e) => asset && updateAssetWeight(asset.id, parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        />
                        <span className="text-zinc-400">%</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-zinc-600">
                      {rec.currentWeight.toFixed(1)}%
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span>{rec.bazinCeiling > 0 ? `R$ ${rec.bazinCeiling.toFixed(2)}` : 'sem proventos'}</span>
                        <span className={`text-[10px] font-bold ${rec.upside >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {rec.upside >= 0 ? '+' : ''}{rec.upside.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Recommendation highlight */}
                    <td className="py-3 px-3 bg-emerald-50/40 font-bold">
                      {rec.sharesToBuy > 0 ? (
                        <span className="text-sm font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded">
                          +{rec.sharesToBuy} cotas
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-normal text-xs">
                          0 cotas
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 bg-emerald-50/40 font-bold text-zinc-900">
                      {rec.investmentAmount > 0 ? `R$ ${rec.investmentAmount.toFixed(2)}` : '-'}
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-800">
                      {rec.newWeight.toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 text-right">
                      {asset && (
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="text-zinc-400 hover:text-rose-600 p-1 rounded transition-colors"
                          title="Remover ativo"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="p-4 bg-emerald-50/60 border-t border-emerald-100 text-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total do Aporte</span>
              <span className="text-lg font-bold">R$ {optimization.totalContribution.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Efetivamente Alocado</span>
              <span className="text-lg font-bold text-emerald-700">R$ {optimization.allocatedAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Sobra em Caixa</span>
              <span className="text-lg font-bold text-zinc-700">R$ {optimization.residualCash.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleApply}
            disabled={optimization.allocatedAmount <= 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-30 shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            Efetivar Compras no Portfólio
          </button>
        </div>
      </div>
    </div>
  );
};
