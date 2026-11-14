import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, 
  Search, 
  Filter, 
  ArrowUpDown, 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Download
} from 'lucide-react';
import { toExcelCsv, downloadText, num } from '../lib/valuation';
import { RadarStockItem } from '../types';

interface OpportunityRadarProps {
  onSelectStock: (ticker: string) => void;
  currentTicker?: string;
  minYield?: number;
  initialBazinMode?: '5y' | '12m';
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({ onSelectStock, currentTicker, minYield = 6, initialBazinMode = '5y' }) => {
  const [stocks, setStocks] = useState<RadarStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [bazinMode, setBazinMode] = useState<'5y' | '12m'>(initialBazinMode);
  const [filterDiscountOnly, setFilterDiscountOnly] = useState(false);
  const [filterMinDy6, setFilterMinDy6] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'bazinUpside' | 'grahamUpside' | 'dy' | 'pl'>('score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/radar?minYield=${minYield}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStocks(data);
        }
      }
    } catch (e) {
      console.error("Failed to load radar data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, [minYield]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach(s => {
      const main = s.sector.split('/')[0].trim();
      set.add(main);
    });
    return ['TODOS', ...Array.from(set).sort()];
  }, [stocks]);

  const filteredAndSortedStocks = useMemo(() => {
    return stocks
      .filter(item => {
        const matchesSearch = 
          item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSector = 
          selectedSector === 'TODOS' || 
          item.sector.toLowerCase().includes(selectedSector.toLowerCase());

        const currentBazinUpside = bazinMode === '5y' ? item.bazinUpside5y : item.bazinUpside12m;
        const matchesDiscount = !filterDiscountOnly || (currentBazinUpside > 0 && item.grahamUpside > 0);
        const matchesMinDy = !filterMinDy6 || item.dy >= minYield;

        return matchesSearch && matchesSector && matchesDiscount && matchesMinDy;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortBy === 'score') {
          valA = a.score ?? 0;
          valB = b.score ?? 0;
        } else if (sortBy === 'bazinUpside') {
          valA = bazinMode === '5y' ? a.bazinUpside5y : a.bazinUpside12m;
          valB = bazinMode === '5y' ? b.bazinUpside5y : b.bazinUpside12m;
        } else if (sortBy === 'grahamUpside') {
          valA = a.grahamUpside;
          valB = b.grahamUpside;
        } else if (sortBy === 'dy') {
          valA = a.dy;
          valB = b.dy;
        } else if (sortBy === 'pl') {
          valA = a.pl > 0 ? a.pl : 999;
          valB = b.pl > 0 ? b.pl : 999;
        }

        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [stocks, searchTerm, selectedSector, bazinMode, filterDiscountOnly, filterMinDy6, sortBy, sortOrder, minYield]);

  const exportCsv = () => {
    const rows = filteredAndSortedStocks.map(s => ({
      Ticker: s.ticker, Empresa: s.name, Setor: s.sector, 'Nota Valorize': s.score ?? 0,
      'Preço R$': s.price, 'DY 12m %': s.dy, 'Proventos 12m R$': s.dividends12m, 'Média 5a R$': s.avgDividends5y,
      'Teto Bazin 5a R$': s.bazinCeiling5y, 'Upside Bazin 5a %': s.bazinUpside5y,
      'Teto Bazin 12m R$': s.bazinCeiling12m, 'Upside Bazin 12m %': s.bazinUpside12m,
      'Justo Graham R$': s.grahamFair, 'Upside Graham %': s.grahamUpside, 'P/L': s.pl, 'P/VP': s.pvp,
    }));
    downloadText(`radar-graham-bazin-${new Date().toISOString().slice(0, 10)}.csv`, toExcelCsv(rows));
  };

  const toggleSort = (column: 'score' | 'bazinUpside' | 'grahamUpside' | 'dy' | 'pl') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded">
              <Radar className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
              Screener Fundamentalista B3
            </span>
          </div>
          <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight">
            Radar de Oportunidades (Graham & Bazin)
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl mt-1">
            Scanner oficial que cruza o <strong>Preço Justo de Graham</strong> (lucro + patrimônio) e o <strong>Preço Teto de Bazin</strong> (método clássico com média de 5 anos de proventos ou 12m).
          </p>
        </div>

        {/* Bazin Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center border border-zinc-200">
            <button
              onClick={() => setBazinMode('5y')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                bazinMode === '5y'
                  ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Bazin Clássico: Média dos proventos dos últimos 5 anos (mais conservador e seguro)"
            >
              Média 5 Anos Bazin
            </button>
            <button
              onClick={() => setBazinMode('12m')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                bazinMode === '12m'
                  ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Bazin Recente: Dividendos pagos nos últimos 12 meses"
            >
              Últimos 12 Meses
            </button>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || !filteredAndSortedStocks.length}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-100 text-zinc-700 text-xs font-bold disabled:opacity-50"
            title="Baixar a lista filtrada para abrir no Excel"
          >
            <Download className="w-4 h-4" /> Excel
          </button>

          <button
            onClick={fetchRadarData}
            disabled={loading}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors disabled:opacity-50"
            title="Atualizar dados do mercado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white data-grid-border p-4 rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou nome (ex: BBAS3, Taesa, PETR4)..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Sector select & quick toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent font-medium text-zinc-800 outline-none text-xs cursor-pointer"
            >
              {sectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setFilterDiscountOnly(!filterDiscountOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filterDiscountOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Com Margem Dupla
          </button>

          <button
            onClick={() => setFilterMinDy6(!filterMinDy6)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filterMinDy6
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            DY ≥ {num(minYield, 1)}% (Bazin)
          </button>
        </div>
      </div>

      {/* Main Screener Table */}
      {/* Celular: cartões tocáveis em vez de tabela larga */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="py-10 text-center text-xs text-zinc-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Carregando scanner…</div>}
        {!loading && filteredAndSortedStocks.length === 0 && (
          <div className="py-10 text-center text-xs text-zinc-500 bg-white rounded-xl data-grid-border">
            {stocks.length === 0 ? 'Não foi possível carregar cotações agora. Toque em atualizar para tentar de novo.' : 'Nenhum ativo para esses filtros.'}
          </div>
        )}
        {!loading && filteredAndSortedStocks.map(stk => {
          const bUp = bazinMode === '5y' ? stk.bazinUpside5y : stk.bazinUpside12m;
          const bCeil = bazinMode === '5y' ? stk.bazinCeiling5y : stk.bazinCeiling12m;
          return (
            <button key={stk.ticker} onClick={() => onSelectStock(stk.ticker)}
              className={`w-full text-left bg-white data-grid-border rounded-xl p-4 active:bg-zinc-50 ${currentTicker === stk.ticker ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-base text-zinc-950">{stk.ticker}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{stk.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-zinc-950">R$ {stk.price.toFixed(2)}</div>
                  <div className={`text-[11px] font-mono ${stk.dy >= minYield ? 'text-emerald-700 font-bold' : 'text-zinc-500'}`}>DY {stk.dy.toFixed(1)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-100 font-mono">
                <div><div className="text-[10px] text-zinc-400 font-sans">Nota</div><ScorePill score={stk.score} grade={stk.grade} /></div>
                <div><div className="text-[10px] text-zinc-400 font-sans">Bazin</div>
                  <div className="text-xs font-bold">R$ {bCeil.toFixed(2)}</div>
                  <div className={`text-[11px] font-bold ${bUp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{bUp >= 0 ? '+' : ''}{bUp.toFixed(1)}%</div></div>
                <div><div className="text-[10px] text-zinc-400 font-sans">Graham</div>
                  <div className="text-xs font-bold">R$ {stk.grahamFair.toFixed(2)}</div>
                  <div className={`text-[11px] font-bold ${stk.grahamUpside >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{stk.grahamUpside >= 0 ? '+' : ''}{stk.grahamUpside.toFixed(1)}%</div></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block bg-white data-grid-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-3 cursor-pointer hover:text-zinc-700" onClick={() => toggleSort('score')} title="Nota Valorize 0–100">
                  <div className="flex items-center gap-1">
                    <span>Nota</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Preço Atual</th>
                <th className="py-3 px-3 cursor-pointer hover:text-zinc-700" onClick={() => toggleSort('dy')}>
                  <div className="flex items-center gap-1">
                    <span>DY Real</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Proventos {bazinMode === '5y' ? '(Média 5a)' : '(12m)'}</th>
                <th className="py-3 px-3 cursor-pointer hover:text-zinc-700" onClick={() => toggleSort('bazinUpside')}>
                  <div className="flex items-center gap-1">
                    <span>Teto Bazin ({num(minYield, 1)}%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-zinc-700" onClick={() => toggleSort('grahamUpside')}>
                  <div className="flex items-center gap-1">
                    <span>Justo Graham</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-zinc-700" onClick={() => toggleSort('pl')}>
                  <div className="flex items-center gap-1">
                    <span>P/L & P/VP</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Veredito / Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-300" />
                    Carregando scanner fundamentalista da B3...
                  </td>
                </tr>
              ) : filteredAndSortedStocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    Nenhum ativo encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedStocks.map((stk) => {
                  const bazinCeiling = bazinMode === '5y' ? stk.bazinCeiling5y : stk.bazinCeiling12m;
                  const bazinUpside = bazinMode === '5y' ? stk.bazinUpside5y : stk.bazinUpside12m;
                  const proventoBase = bazinMode === '5y' ? stk.avgDividends5y : stk.dividends12m;
                  const isCurrent = currentTicker === stk.ticker;

                  return (
                    <tr 
                      key={stk.ticker} 
                      className={`hover:bg-zinc-50/70 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-emerald-50/50 font-medium' : ''
                      }`}
                      onClick={() => onSelectStock(stk.ticker)}
                    >
                      {/* Ticker & Name */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 text-sm">{stk.ticker}</span>
                            {isCurrent && (
                              <span className="text-[10px] uppercase px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                                Ativo Atual
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans truncate max-w-[150px]">{stk.name}</span>
                          <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">{stk.sector.split('/')[0]}</span>
                        </div>
                      </td>

                      {/* Nota Valorize */}
                      <td className="py-3 px-3">
                        <ScorePill score={stk.score} grade={stk.grade} />
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-3 font-bold text-zinc-900">
                        R$ {stk.price.toFixed(2)}
                      </td>

                      {/* Dividend Yield */}
                      <td className="py-3 px-3">
                        <span className={`font-bold ${stk.dy >= minYield ? 'text-emerald-700' : 'text-zinc-600'}`}>
                          {stk.dy.toFixed(2)}%
                        </span>
                      </td>

                      {/* Proventos Base */}
                      <td className="py-3 px-3 text-zinc-600">
                        R$ {proventoBase.toFixed(2)}
                        {bazinMode === '5y' && stk.avgDividends5y !== stk.dividends12m && (
                          <span className="block text-[10px] text-zinc-400">12m: R$ {stk.dividends12m.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Teto Bazin */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">R$ {bazinCeiling.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold ${bazinUpside >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {bazinUpside >= 0 ? '+' : ''}{bazinUpside.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Justo Graham */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900">R$ {stk.grahamFair.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold ${stk.grahamUpside >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stk.grahamUpside >= 0 ? '+' : ''}{stk.grahamUpside.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Multiples P/L and P/VP */}
                      <td className="py-3 px-3 text-zinc-600 text-[11px]">
                        <div>P/L: <span className="font-bold text-zinc-800">{stk.pl > 0 ? stk.pl.toFixed(1) : '-'}</span></div>
                        <div>P/VP: <span className="font-bold text-zinc-800">{stk.pvp > 0 ? stk.pvp.toFixed(2) : '-'}</span></div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        {bazinUpside > 10 && stk.grahamUpside > 15 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Margem Dupla
                          </span>
                        ) : bazinUpside > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                            Abaixo do Teto
                          </span>
                        ) : stk.grahamUpside > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded">
                            Desconto Graham
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            Acima do Teto
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(stk.ticker);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded transition-colors"
                        >
                          Raio-X
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Exibindo <strong>{filteredAndSortedStocks.length}</strong> ativos da B3 classificados pelos métodos clássicos.
          </span>
          <span className="text-[10px] text-zinc-400">
            Dica: Clique em qualquer linha para abrir a análise detalhada no <strong>Raio-X do Ativo</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};


const ScorePill: React.FC<{ score?: number; grade?: string }> = ({ score, grade }) => {
  if (score == null) return <span className="text-zinc-300">—</span>;
  const tone = score >= 65 ? 'bg-emerald-600 text-white' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold font-mono ${tone}`} title="Nota Valorize (0–100)">
      {score}<span className="opacity-70 text-[10px]">{grade}</span>
    </span>
  );
};
