import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Info, 
  Coins, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  Sliders,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { StockData, ValuationResult, DividendYearPoint } from '../types';

interface AssetXRayProps {
  stock: StockData;
  results: ValuationResult;
  onUpdateStock: (field: keyof StockData, val: any) => void;
  onAddToPortfolio: () => void;
  bazinMode: '5y' | '12m';
  onToggleBazinMode: (mode: '5y' | '12m') => void;
}

export const AssetXRay: React.FC<AssetXRayProps> = ({
  stock,
  results,
  onUpdateStock,
  onAddToPortfolio,
  bazinMode,
  onToggleBazinMode,
}) => {
  // Corrigido: antes eram cópias locais congeladas; agora seguem os "Meus parâmetros" globais.
  const minYield = stock.minYield || 6;
  const marginOfSafety = stock.marginOfSafety ?? 20;

  // Histórico real de 5 anos. Corrigido: antes, sem histórico, o app INVENTAVA valores de 2021–2025.
  const dividendHistory: DividendYearPoint[] = stock.dividendHistory5y || [];
  const hasHistory = dividendHistory.length > 0;

  // Bazin vem do núcleo de cálculo (valuation.ts) — antes era refeito aqui à mão
  const activeDividend = bazinMode === '5y'
    ? (stock.avgDividends5y || stock.dividends)
    : stock.dividends;
  const activeCeilingPrice = results.bazinCeilingPrice;
  const activeEntryPriceBazin = results.bazinEntryPrice;
  const activeUpsideBazin = results.bazinUpside;

  const grahamFair = results.grahamFairPrice;
  const grahamEntry = results.grahamEntryPrice;
  const grahamUpside = results.grahamUpside;

  // Bazin Criteria Checklist
  const currentDy = stock.currentPrice > 0 && stock.dividends > 0 
    ? (stock.dividends / stock.currentPrice) * 100 
    : 0;

  const criteria = useMemo(() => {
    const hasConsistentDividends = hasHistory && dividendHistory.filter(d => d.amount > 0).length >= 4;
    const dyAboveMin = currentDy >= minYield;
    const priceBelowCeiling = stock.currentPrice <= activeCeilingPrice;
    const priceBelowGraham = stock.currentPrice <= grahamFair;
    const isPlHealthy = (stock.pl || (stock.lpa > 0 ? stock.currentPrice / stock.lpa : 0)) <= 15;

    return [
      {
        id: 1,
        title: `Dividend Yield ≥ ${minYield}% (Regra de Ouro)`,
        desc: `O retorno anual em proventos é de ${currentDy.toFixed(1)}%, ${dyAboveMin ? 'atendendo' : 'abaixo do'} patamar de ${minYield}%.`,
        passed: dyAboveMin
      },
      {
        id: 2,
        title: "Histórico Consistente em 5 Anos",
        desc: hasHistory
          ? `Pagou proventos em ${dividendHistory.filter(d => d.amount > 0).length} dos últimos ${dividendHistory.length} anos.`
          : 'Histórico de proventos indisponível para este ativo.',
        passed: hasConsistentDividends
      },
      {
        id: 3,
        title: "Cotação Abaixo do Preço Teto Bazin",
        desc: `Cotação de R$ ${stock.currentPrice.toFixed(2)} vs Teto Bazin de R$ ${activeCeilingPrice.toFixed(2)}.`,
        passed: activeCeilingPrice > 0 && priceBelowCeiling
      },
      {
        id: 4,
        title: "Margem de Lucro e Múltiplos (Graham)",
        desc: `P/L saudável (${(stock.pl || 0).toFixed(1)}x) e preço com ${grahamUpside >= 0 ? '+' : ''}${grahamUpside.toFixed(1)}% de margem frente ao valor intrínseco.`,
        passed: grahamFair > 0 && isPlHealthy && priceBelowGraham
      }
    ];
  }, [currentDy, minYield, dividendHistory, stock.currentPrice, activeCeilingPrice, stock.pl, stock.lpa, grahamFair, grahamUpside]);

  const maxDivAmount = Math.max(...dividendHistory.map(d => d.amount), 0.1);

  return (
    <div className="space-y-6">
      {/* Asset Hero Header */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-zinc-900 tracking-tight">{stock.ticker}</span>
              <span className="text-xs uppercase font-bold px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded">
                {stock.sector?.sectorName || "B3 Brasil"}
              </span>
              {activeUpsideBazin > 0 && grahamUpside > 0 && (
                <span className="text-xs font-bold uppercase tracking-tight px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Margem Dupla
                </span>
              )}
            </div>
            <h2 className="text-sm text-zinc-600 font-sans mt-0.5">
              {stock.companyName || stock.ticker}
            </h2>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">Cotação Atual</span>
              <span className="font-mono text-3xl font-bold text-zinc-900">
                R$ {stock.currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-right pl-3 border-l border-zinc-200">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">DY Atual</span>
              <span className="font-mono text-xl font-bold text-emerald-600">
                {currentDy.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Fundamental Multiples Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-4 text-xs font-mono">
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">LPA (Lucro/Ação)</span>
            <span className="text-sm font-bold text-zinc-900">R$ {stock.lpa.toFixed(2)}</span>
          </div>
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">VPA (Patr./Ação)</span>
            <span className="text-sm font-bold text-zinc-900">R$ {stock.vpa.toFixed(2)}</span>
          </div>
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">P/L</span>
            <span className="text-sm font-bold text-zinc-900">{stock.pl ? stock.pl.toFixed(1) : (stock.lpa > 0 ? (stock.currentPrice / stock.lpa).toFixed(1) : '-')}</span>
          </div>
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">P/VP</span>
            <span className="text-sm font-bold text-zinc-900">{stock.pvp ? stock.pvp.toFixed(2) : (stock.vpa > 0 ? (stock.currentPrice / stock.vpa).toFixed(2) : '-')}</span>
          </div>
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Proventos 12m</span>
            <span className="text-sm font-bold text-emerald-700">R$ {stock.dividends.toFixed(2)}</span>
          </div>
          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Média 5 Anos Bazin</span>
            <span className="text-sm font-bold text-emerald-700">R$ {(stock.avgDividends5y || stock.dividends).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Valuation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Bazin Card */}
        <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-lg text-zinc-900">Preço Teto de Décio Bazin</h3>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Foco em Fluxo de Renda Passiva</p>
                </div>
              </div>

              {/* Mode Toggle inside Bazin Card */}
              <div className="bg-zinc-100 p-0.5 rounded-lg flex items-center border border-zinc-200">
                <button
                  onClick={() => onToggleBazinMode('5y')}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    bazinMode === '5y'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Média dos últimos 5 anos de dividendos (Recomendado por Bazin)"
                >
                  Média 5 Anos
                </button>
                <button
                  onClick={() => onToggleBazinMode('12m')}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    bazinMode === '12m'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Últimos 12 meses acumulados"
                >
                  Últimos 12m
                </button>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg mb-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs uppercase font-bold text-zinc-500 font-mono">Preço Teto Máximo ({minYield}%)</span>
                <span className={`text-xs font-mono font-bold ${activeUpsideBazin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {activeUpsideBazin >= 0 ? '+' : ''}{activeUpsideBazin.toFixed(1)}% Margem
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-zinc-900">
                R$ {activeCeilingPrice.toFixed(2)}
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 font-mono flex items-center justify-between border-t border-zinc-200 pt-2">
                <span>Com Margem de Segurança ({marginOfSafety}%):</span>
                <strong className="text-zinc-900">R$ {activeEntryPriceBazin.toFixed(2)}</strong>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              Pelo critério de Décio Bazin, para obter no mínimo <strong>{minYield}%</strong> ao ano de dividendos sem vender suas ações, o preço máximo a pagar é <strong>R$ {activeCeilingPrice.toFixed(2)}</strong> com base na {bazinMode === '5y' ? 'média histórica de 5 anos (R$ ' + activeDividend.toFixed(2) + '/ação)' : 'última distribuição de 12 meses (R$ ' + activeDividend.toFixed(2) + '/ação)'}.
            </p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-800 font-medium">Status no Preço Atual:</span>
            <span className={`font-bold ${activeUpsideBazin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {activeUpsideBazin >= 0 ? 'ABAIXO DO TETO (COMPRAR)' : 'ACIMA DO TETO (AGUARDAR)'}
            </span>
          </div>
        </div>

        {/* Method Benjamin Graham Card */}
        <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-lg text-zinc-900">Preço Justo de Benjamin Graham</h3>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Valor Intrínseco por Lucro e Patrimônio</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded uppercase">
                √(22.5 × LPA × VPA)
              </span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg mb-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs uppercase font-bold text-zinc-500 font-mono">Valor Intrínseco Justo</span>
                <span className={`text-xs font-mono font-bold ${grahamUpside >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {grahamUpside >= 0 ? '+' : ''}{grahamUpside.toFixed(1)}% Desconto
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-zinc-900">
                R$ {grahamFair.toFixed(2)}
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 font-mono flex items-center justify-between border-t border-zinc-200 pt-2">
                <span>Preço Teto com Margem ({marginOfSafety}%):</span>
                <strong className="text-zinc-900">R$ {grahamEntry.toFixed(2)}</strong>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              O método de Graham avalia a empresa como um todo combinando Lucro por Ação (R$ {stock.lpa.toFixed(2)}) e Valor Patrimonial (R$ {stock.vpa.toFixed(2)}). Com margem de segurança de <strong>{marginOfSafety}%</strong>, o preço recomendado para entrada é de até <strong>R$ {grahamEntry.toFixed(2)}</strong>.
            </p>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
            <span className="text-blue-800 font-medium">Status de Valor Intrínseco:</span>
            <span className={`font-bold ${grahamUpside >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {grahamUpside >= 0 ? 'SUBVALORIZADA (DESCONTO)' : 'SOBREVALORIZADA'}
            </span>
          </div>
        </div>
      </div>

      {/* 5-Year Dividend History & Chart */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-zinc-900">Histórico de Proventos dos Últimos 5 Anos</h3>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                Análise da consistência de pagamento e evolução dos dividendos por ação
              </p>
            </div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-zinc-500">Média 5 Anos: </span>
            <strong className="text-emerald-700 font-bold">R$ {(stock.avgDividends5y || stock.dividends).toFixed(2)} / ano</strong>
          </div>
        </div>

        {!hasHistory ? (
          <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
            Não encontramos o histórico de proventos deste ativo. O Bazin usa os proventos de 12 meses
            {stock.dividends > 0 ? ` (R$ ${stock.dividends.toFixed(2)})` : ''} até o histórico ficar disponível.
          </p>
        ) : (<>
        {/* Visual Bar Chart for 5 Years */}
        <div className="mb-6 bg-zinc-50/70 border border-zinc-200 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono block mb-4">
            Distribuição Anual (R$ por ação)
          </span>
          <div className="flex items-end gap-3 sm:gap-6 h-36 px-2">
            {dividendHistory.map((item, idx) => {
              const heightPct = Math.max(15, (item.amount / maxDivAmount) * 100);
              const isLatest = idx === dividendHistory.length - 1;

              return (
                <div key={item.year} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[11px] font-mono font-bold text-zinc-800 mb-1.5 group-hover:text-emerald-600 transition-colors">
                    R$ {item.amount.toFixed(2)}
                  </span>
                  <div className="w-full bg-zinc-200 rounded-t-md overflow-hidden flex items-end">
                    <div 
                      className={`w-full transition-all duration-700 rounded-t-md ${
                        isLatest ? 'bg-emerald-600' : 'bg-zinc-800 group-hover:bg-zinc-900'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 mt-2 font-bold">
                    {item.year}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-400 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Ano</th>
                <th className="py-2.5 px-3">Proventos (Dividendos + JCP)</th>
                <th className="py-2.5 px-3">Yield Histórico Estimado</th>
                <th className="py-2.5 px-3">Teto Bazin (com base no ano)</th>
                <th className="py-2.5 px-3 text-right">Consistência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {dividendHistory.map((item) => {
                // Corrigido: usava 6% fixo; agora segue o yield mínimo do usuário
                const yearCeiling = item.amount / (minYield / 100);
                return (
                  <tr key={item.year} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-3 font-bold text-zinc-900">{item.year}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">R$ {item.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-zinc-600">{item.dy ? `${item.dy.toFixed(1)}%` : stock.currentPrice > 0 ? `${((item.amount / stock.currentPrice) * 100).toFixed(1)}%*` : '—'}</td>
                    <td className="py-3 px-3 text-zinc-800">R$ {yearCeiling.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">
                      {item.amount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded font-bold uppercase">
                          Sem provento
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-zinc-500 mt-2">* Sem cotação do ano: yield calculado sobre a cotação atual. Teto por ano com yield mínimo de {minYield}%.</p>
        </div>
        </>)}
      </div>

      {/* Checklist Décio Bazin & Graham */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 mb-4">
          <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-zinc-900">Checklist de Aprovação (Bazin & Graham)</h3>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
              Critérios rigorosos para aprovar a compra para carteiras de renda e valor
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criteria.map((crit) => (
            <div 
              key={crit.id}
              className={`p-4 rounded-xl border transition-all ${
                crit.passed 
                  ? 'bg-emerald-50/40 border-emerald-200 text-zinc-900' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
              }`}
            >
              <div className="flex items-start gap-3">
                {crit.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-zinc-900 font-sans mb-1">
                    {crit.title}
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                    {crit.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
