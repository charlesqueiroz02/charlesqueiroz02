import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { HelpCircle, AlertTriangle, RefreshCw, BarChart3, Globe, Sparkles } from 'lucide-react';
import { StockData, ValuationResult, PortfolioItem } from './types';
import { Glossary } from './components/Glossary';
import { OpportunityRadar } from './components/OpportunityRadar';
import { TickerSelect } from './components/TickerSelect';
import { StockDirectory } from './components/StockDirectory';
import { useAuth } from './context/AuthContext';
import { PriceRuler } from './components/PriceRuler';
import { QuickAddModal } from './components/QuickAddModal';
import { ParamsPopover } from './components/ParamsPopover';
import { MobileNav } from './components/MobileNav';
import { InstallApp, OfflineBanner } from './components/InstallApp';
import { DataQualityNote } from './components/DataQualityNote';
import { TABS, TabId } from './lib/tabs';
import { computeValuation, brl } from './lib/valuation';
import { readJSON, readText, writeJSON, writeText, pruneCache, touchCache } from './lib/storage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchQuotes } from './lib/quotes';
import { useTheme } from './lib/theme';
import { ThemeToggle } from './components/ThemeToggle';

// Telas carregadas sob demanda: o app abre mais rápido (antes tudo vinha num arquivo de 557 KB)
const ValuationDisplay = lazy(() => import('./components/ValuationDisplay').then(m => ({ default: m.ValuationDisplay })));
const UpsideChart = lazy(() => import('./components/UpsideChart').then(m => ({ default: m.UpsideChart })));
const PriceHistoryChart = lazy(() => import('./components/PriceHistoryChart').then(m => ({ default: m.PriceHistoryChart })));
const PortfolioDashboard = lazy(() => import('./components/PortfolioDashboard').then(m => ({ default: m.PortfolioDashboard })));
const AIAnalyst = lazy(() => import('./components/AIAnalyst').then(m => ({ default: m.AIAnalyst })));
const StockComparator = lazy(() => import('./components/StockComparator').then(m => ({ default: m.StockComparator })));
const CompoundSimulator = lazy(() => import('./components/CompoundSimulator').then(m => ({ default: m.CompoundSimulator })));
const AssetXRay = lazy(() => import('./components/AssetXRay').then(m => ({ default: m.AssetXRay })));
const AllocationOptimizer = lazy(() => import('./components/AllocationOptimizer').then(m => ({ default: m.AllocationOptimizer })));
const RegistrationFlow = lazy(() => import('./components/RegistrationFlow').then(m => ({ default: m.RegistrationFlow })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ValuationLab = lazy(() => import('./components/ValuationLab').then(m => ({ default: m.ValuationLab })));
const BackupCard = lazy(() => import('./components/BackupCard').then(m => ({ default: m.BackupCard })));
const IncomeMachine = lazy(() => import('./components/IncomeMachine').then(m => ({ default: m.IncomeMachine })));

const TabLoading = () => (
  <div role="status" className="py-16 text-center text-sm text-zinc-500">Carregando…</div>
);

export function App() {
  const { user, isAuthenticated, syncPortfolio } = useAuth();
  // Tema no App: ao trocar, todas as telas (e gráficos) são redesenhadas com as cores novas
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    // Atalhos do app instalado abrem direto na tela (?tab=renda, ?tab=radar…)
    const fromUrl = new URLSearchParams(window.location.search).get('tab') as TabId | null;
    if (fromUrl && TABS.some(t => t.id === fromUrl)) return fromUrl;
    const saved = readText('valorize_tab') as TabId | null;
    return saved && TABS.some(t => t.id === saved) ? saved : 'radar';
  });
  const [bazinMode, setBazinMode] = useState<'5y' | '12m'>(() => (readText('valorize_bazin_mode') === '12m' ? '12m' : '5y'));
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => { writeText('valorize_tab', activeTab); }, [activeTab]);
  useEffect(() => { writeText('valorize_bazin_mode', bazinMode); }, [bazinMode]);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login' | 'profile'>('register');
  const [hasDismissedGuestBanner, setHasDismissedGuestBanner] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [triggeredAlerts, setTriggeredAlerts] = useState<string[]>([]);
  
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    // Leitura segura: dado corrompido não derruba mais o app
    const saved = readJSON<PortfolioItem[] | null>('valorize_portfolio', null);
    return Array.isArray(saved) ? saved : [
      { ticker: 'BBAS3', purchasePrice: 21.50, quantity: 150, addedAt: Date.now() - 30 * 86400000 },
      { ticker: 'TAEE11', purchasePrice: 35.20, quantity: 80, addedAt: Date.now() - 60 * 86400000 },
      { ticker: 'PETR4', purchasePrice: 42.10, quantity: 60, addedAt: Date.now() - 90 * 86400000 }
    ];
  });

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const parsed = readJSON<unknown>('valorize_recent_searches', []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return Array.from(new Set(parsed.map((t: any) => String(t || '').trim().toUpperCase()).filter((t: string) => t !== '')));
    }
    return ['BBAS3', 'PETR4', 'VALE3', 'TAEE11', 'ITUB4'];
  });

  useEffect(() => {
    writeJSON('valorize_recent_searches', recentSearches);
  }, [recentSearches]);

  const [stock, setStock] = useState<StockData>(() => {
    const saved = readJSON<StockData | null>('valorize_current_stock', null);
    if (saved && typeof saved === 'object' && typeof saved.ticker === 'string' && typeof saved.currentPrice === 'number') {
      return saved;
    }
    return {
      ticker: 'BBAS3',
      companyName: 'Banco do Brasil S.A.',
      currentPrice: 21.80,
      lpa: 2.53,
      vpa: 31.64,
      dividends: 0.65,
      avgDividends5y: 1.62,
      dividendHistory5y: [
        { year: 2021, amount: 0.28, dy: 3.5 },
        { year: 2022, amount: 2.09, dy: 11.2 },
        { year: 2023, amount: 1.89, dy: 8.8 },
        { year: 2024, amount: 2.19, dy: 9.1 },
        { year: 2025, amount: 1.65, dy: 7.6 }
      ],
      payoutConsistencyYears: 5,
      marginOfSafety: 20,
      minYield: 6,
      sector: {
        sectorName: 'Financeiro / Bancos',
        avgPL: 7.5,
        avgPVP: 0.9,
        avgDY: 7.8
      }
    };
  });

  useEffect(() => {
    writeJSON('valorize_current_stock', stock);
  }, [stock]);

  // Synchronize user-specific portfolio and risk preferences when logged in
  const previousUserId = React.useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    // Corrigido: ao sair da conta, a carteira da pessoa continuava na tela (modo convidado)
    if (!user && previousUserId.current) {
      setPortfolio([]);
      writeJSON('valorize_portfolio', []);
      setTriggeredAlerts([]);
    }
    previousUserId.current = user?.id ?? null;
    if (user && user.portfolio) {
      setPortfolio(user.portfolio);
      writeJSON('valorize_portfolio', user.portfolio);
      if (user.profile.defaultMarginOfSafety) {
        setStock(prev => ({
          ...prev,
          marginOfSafety: user.profile.defaultMarginOfSafety,
          minYield: user.profile.defaultMinYield || prev.minYield
        }));
      }
    }
  }, [user?.id]);

  // Ao abrir o app: confere os alertas de preço de toda a carteira (antes só ao abrir cada ação)
  useEffect(() => {
    const withAlert = portfolio.filter(p => p.alertPrice && p.alertCondition);
    if (!withAlert.length) return;
    fetchQuotes(withAlert.map(p => p.ticker), stock.minYield)
      .then(q => setTriggeredAlerts(withAlert
        .filter(p => q[p.ticker]?.price > 0 && (p.alertCondition === 'above' ? q[p.ticker].price >= p.alertPrice! : q[p.ticker].price <= p.alertPrice!))
        .map(p => p.ticker)))
      .catch(() => { /* sem conexão: tenta na próxima abertura */ });
    // Ao abrir: se a ação salva estiver com dados de mais de 30 min, atualiza em segundo plano
    if (!stock.lastUpdated || Date.now() - stock.lastUpdated > 30 * 60 * 1000) fetchStockData(stock.ticker, true);
    // Executa só uma vez, na abertura do app
  }, []);

  // Corrigido: antes dependia de um formulário que nunca era preenchido (botão não fazia nada).
  const addToPortfolio = (quantity: number, purchasePrice: number) => {
    if (purchasePrice <= 0 || quantity <= 0) return;
    const existing = portfolio.find(p => p.ticker === stock.ticker);
    const newItem: PortfolioItem = existing
      ? {
          ...existing,
          quantity: existing.quantity + quantity,
          purchasePrice: Number((((existing.purchasePrice * existing.quantity + purchasePrice * quantity) / (existing.quantity + quantity))).toFixed(2)),
        }
      : { ticker: stock.ticker, purchasePrice, quantity, addedAt: Date.now() };

    const newPortfolio = [...portfolio.filter(p => p.ticker !== stock.ticker), newItem];
    setPortfolio(newPortfolio);
    writeJSON('valorize_portfolio', newPortfolio);
    syncPortfolio(newPortfolio);
  };

  const removeFromPortfolio = (ticker: string) => {
    const newPortfolio = portfolio.filter(p => p.ticker !== ticker);
    setPortfolio(newPortfolio);
    writeJSON('valorize_portfolio', newPortfolio);
    syncPortfolio(newPortfolio);
    setTriggeredAlerts(prev => prev.filter(t => t !== ticker));
  };

  const updatePortfolioAlert = (ticker: string, price: number, condition: 'above' | 'below') => {
    const newPortfolio = portfolio.map(item => 
      item.ticker === ticker ? { ...item, alertPrice: price, alertCondition: condition } : item
    );
    setPortfolio(newPortfolio);
    writeJSON('valorize_portfolio', newPortfolio);
    syncPortfolio(newPortfolio);
  };

  const handleApplyPurchasesFromOptimizer = (purchases: { ticker: string; shares: number; price: number }[]) => {
    setPortfolio(prev => {
      let updated = [...prev];
      purchases.forEach(p => {
        const existingIdx = updated.findIndex(item => item.ticker === p.ticker);
        if (existingIdx >= 0) {
          const existing = updated[existingIdx];
          const totalCost = (existing.purchasePrice * existing.quantity) + (p.price * p.shares);
          const newQty = existing.quantity + p.shares;
          const newAvgPrice = totalCost / newQty;
          updated[existingIdx] = {
            ...existing,
            quantity: newQty,
            purchasePrice: Number(newAvgPrice.toFixed(2))
          };
        } else {
          updated.push({
            ticker: p.ticker,
            purchasePrice: p.price,
            quantity: p.shares,
            addedAt: Date.now()
          });
        }
      });
      writeJSON('valorize_portfolio', updated);
      syncPortfolio(updated);
      return updated;
    });
  };

  const fetchStockData = async (tickerOverride?: string, forceRefresh: boolean = false) => {
    if (isFetching) return;
    
    const tickerToFetch = (tickerOverride || stock.ticker).trim().toUpperCase().replace(/\.SA$/i, '');
    
    if (!tickerToFetch || tickerToFetch.length < 3) {
      setError("Por favor, insira um ticker válido (ex: BBAS3, PETR4, TAEE11).");
      return;
    }
    
    setError(null);
    setLoadingMessage("Consultando dados da B3...");

    // Check cache (30 min validity)
    if (!forceRefresh) {
      const cached = readJSON<{ data: StockData; timestamp: number } | null>(`stock_cache_${tickerToFetch}`, null);
      if (cached?.data && typeof cached.timestamp === 'number') {
        const isExpired = Date.now() - cached.timestamp > 1000 * 60 * 30;
        if (!isExpired && cached.data.currentPrice > 0) {
          // Mantém os parâmetros do usuário (yield/margem) ao reaproveitar o cache
          setStock(prev => ({ ...prev, ...cached.data, ticker: tickerToFetch, minYield: prev.minYield, marginOfSafety: prev.marginOfSafety }));
          setRecentSearches(prev => [tickerToFetch, ...prev.filter(t => t !== tickerToFetch)].slice(0, 10));
          return;
        }
      }
    }

    setIsFetching(true);

    try {
      setLoadingMessage(`Obtendo cotação e proventos de ${tickerToFetch}...`);
      const response = await fetch(`/api/stock/${encodeURIComponent(tickerToFetch)}`);
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Não foi possível carregar os dados para ${tickerToFetch}.`);
      }

      const allData = await response.json();

      if (!allData || !allData.currentPrice || allData.currentPrice <= 0) {
        throw new Error("Dados financeiros indisponíveis para este ativo.");
      }

      setStock(prev => {
        const updated: StockData = {
          ...prev,
          ticker: tickerToFetch,
          companyName: allData.companyName,
          currentPrice: allData.currentPrice,
          lpa: allData.lpa,
          vpa: allData.vpa,
          dividends: allData.dividends,
          avgDividends5y: allData.avgDividends5y || allData.dividends,
          dividendHistory5y: allData.dividendHistory5y,
          payoutConsistencyYears: allData.payoutConsistencyYears || 5,
          pl: allData.pl,
          pvp: allData.pvp,
          sector: allData.sector || prev.sector,
          quickSummary: allData.quickSummary || prev.quickSummary,
          historicalData: allData.historicalData?.length ? allData.historicalData : [],
          priceHistory: Array.isArray(allData.priceHistory) ? allData.priceHistory : [],
          dataQuality: allData.dataQuality,
          warnings: allData.warnings,
          lastUpdated: Date.now()
        };

        // Check alerts
        const portfolioItem = portfolio.find(p => p.ticker === tickerToFetch);
        if (portfolioItem?.alertPrice && portfolioItem.alertCondition) {
          const isTriggered = portfolioItem.alertCondition === 'above' 
            ? allData.currentPrice >= portfolioItem.alertPrice 
            : allData.currentPrice <= portfolioItem.alertPrice;
          
          if (isTriggered) {
            setTriggeredAlerts(p => [...new Set([...p, tickerToFetch])]);
          } else {
            setTriggeredAlerts(p => p.filter(t => t !== tickerToFetch));
          }
        }

        // Cache result
        writeJSON(`stock_cache_${tickerToFetch}`, { data: updated, timestamp: Date.now() });
        touchCache(`stock_cache_${tickerToFetch}`);
        pruneCache();

        return updated;
      });

      setRecentSearches(prev => [tickerToFetch, ...prev.filter(t => t !== tickerToFetch)].slice(0, 10));

    } catch (error: any) {
      console.error("Error fetching stock data:", error);
      setError(error.message || "Erro ao consultar dados da ação. Verifique o ticker e tente novamente.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectFromRadar = (ticker: string) => {
    fetchStockData(ticker);
    setActiveTab('raio-x');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Full Valuation Calculations
  const results = useMemo((): ValuationResult => {
    const v = computeValuation({
      price: stock.currentPrice, lpa: stock.lpa, vpa: stock.vpa,
      dividends12m: stock.dividends, avgDividends5y: stock.avgDividends5y,
      minYield: stock.minYield, margin: stock.marginOfSafety, bazinBase: bazinMode,
    });
    return {
      grahamFairPrice: v.grahamFair,
      grahamEntryPrice: v.grahamEntry,
      grahamUpside: v.grahamUpside,
      grahamStatus: v.grahamSignal,
      bazinCeilingPrice: v.bazinCeiling,
      bazinEntryPrice: v.bazinEntry,
      bazinUpside: v.bazinUpside,
      bazinStatus: v.bazinSignal,
      bazinCeilingPrice12m: v.bazinCeiling12m,
      bazinCeilingPrice5y: v.bazinCeiling5y,
    };
  }, [stock, bazinMode]);

  const currentPortfolioItem = useMemo(() => {
    return portfolio.find(p => p.ticker === stock.ticker);
  }, [portfolio, stock.ticker]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const upperValue = name === 'ticker' ? value.toUpperCase() : value;
    
    setStock(prev => ({
      ...prev,
      [name]: name === 'ticker' ? upperValue : parseFloat(value) || 0
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-28 md:pb-20 font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <Glossary isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
      <StockDirectory 
        isOpen={isDirectoryOpen} 
        onClose={() => setIsDirectoryOpen(false)} 
        onSelect={(ticker) => {
          fetchStockData(ticker);
          setActiveTab('raio-x');
        }} 
      />

      {triggeredAlerts.length > 0 && (
        <div role="alert" className="bg-amber-50 border-b border-amber-200 text-amber-900 py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-4">
          <AlertTriangle className="w-4 h-4" />
          <span>Alerta de Preço Atingido: {triggeredAlerts.join(', ')}</span>
          <button 
            onClick={() => setTriggeredAlerts([])}
            className="ml-4 bg-white border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Primary Header */}
      <header className="bg-white border-b border-zinc-200 py-3 md:py-4 px-4 sm:px-6 lg:px-8 md:sticky md:top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-emerald-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase font-mono">
                  Valorize AI
                </h1>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  Graham & Bazin Institutional Terminal
                </p>
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <button 
                onClick={() => setIsDirectoryOpen(true)}
                className="p-2 bg-zinc-100 rounded-lg hover:bg-zinc-200 text-zinc-700"
                title="Bolsa B3"
                aria-label="Abrir diretório da Bolsa B3"
              >
                <Globe className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Active Stock Selector Strip in Header */}
          <div className="flex flex-wrap md:flex-nowrap items-center justify-end gap-2 md:gap-3 w-full md:w-auto">
            <div className="order-last md:order-none basis-full md:basis-auto md:w-72 min-w-0">
              <TickerSelect 
                value={stock.ticker}
                onSelect={(ticker) => {
                  fetchStockData(ticker);
                  if (activeTab === 'radar') setActiveTab('raio-x');
                }}
                isFetching={isFetching}
                recentSearches={recentSearches}
              />
            </div>

            <button 
              onClick={() => setIsDirectoryOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-all text-xs font-bold uppercase tracking-tight"
            >
              <Globe className="w-3.5 h-3.5" />
              Bolsa
            </button>

            <InstallApp />

            <ThemeToggle mode={theme.mode} onCycle={theme.cycle} />

            <ParamsPopover
              minYield={stock.minYield}
              margin={stock.marginOfSafety}
              bazinMode={bazinMode}
              onChange={p => {
                if (p.bazinMode) setBazinMode(p.bazinMode);
                setStock(prev => ({
                  ...prev,
                  minYield: p.minYield ?? prev.minYield,
                  marginOfSafety: p.margin ?? prev.marginOfSafety,
                }));
              }}
            />

            <button 
              onClick={() => setIsGlossaryOpen(true)}
              className="p-2 bg-zinc-100 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
              title="Manual e Glossário de Métodos"
              aria-label="Abrir guia e glossário"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Auth CTA & Profile Controls in Header */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-zinc-200">
                <button
                  onClick={() => setActiveTab('cadastro')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg transition-colors border border-zinc-200"
                  title="Acessar Perfil do Investidor e Metas"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center">
                    {user.profile.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight truncate max-w-[100px]">
                      {user.profile.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {user.profile.strategy === 'dividendos_bazin' ? 'Bazin 6%' : user.profile.strategy === 'valor_graham' ? 'Graham' : 'Híbrido'}
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-200">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg text-xs font-mono font-bold uppercase tracking-tight transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-tight shadow-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Cadastrar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navegação desktop/tablet — no celular usamos a barra inferior (MobileNav) */}
        <div className="hidden md:block max-w-7xl mx-auto mt-4 pt-2 border-t border-zinc-100 overflow-x-auto scrollbar-none">
          <nav className="flex gap-1 min-w-max pb-1" aria-label="Telas">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                aria-current={activeTab === t.id ? 'page' : undefined}
                className={`relative px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  activeTab === t.id ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <t.icon className={`w-3.5 h-3.5 ${activeTab === t.id ? 'text-emerald-600' : 'text-zinc-400'}`} />
                {t.id === 'raio-x' ? `Raio-X (${stock.ticker})` : t.id === 'cadastro' && !isAuthenticated ? 'Cadastro' : t.label}
                {t.isNew && <span className="text-[10px] px-1.5 py-px rounded bg-emerald-500 text-white">novo</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Guest Onboarding Banner */}
        {!isAuthenticated && !hasDismissedGuestBanner && (
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 text-zinc-900 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  Crie seu Cadastro para Usar Todos os Recursos do App
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-mono px-2 py-0.5 rounded border border-emerald-200">
                    Gratuito
                  </span>
                </div>
                <div className="text-xs text-zinc-600 mt-0.5 max-w-2xl">
                  Salve sua carteira de ações na B3, receba alertas de Preço Teto de Décio Bazin e Graham, defina metas de renda passiva e personalize sua margem de segurança.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                Cadastrar Agora
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors"
              >
                Já Tenho Conta
              </button>
              <button
                onClick={() => setHasDismissedGuestBanner(true)}
                className="text-zinc-500 hover:text-zinc-800 text-xs px-2 py-1"
                title="Dispensar aviso"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay / Progress Notification */}
        {isFetching && (
          <div role="status" className="mb-6 p-4 bg-white border border-zinc-200 text-zinc-700 rounded-xl shadow-sm flex items-center justify-between font-mono text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{loadingMessage || "Atualizando dados da B3..."}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Consultando fontes</span>
          </div>
        )}

        <OfflineBanner />

        {error && !isFetching && (
          <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-bold shrink-0 hover:underline">Fechar</button>
          </div>
        )}

        <ErrorBoundary key={theme.resolved} resetKey={activeTab} area={TABS.find(t => t.id === activeTab)?.label}>
        <Suspense fallback={<TabLoading />}>
        {/* TAB 1: RADAR DE OPORTUNIDADES */}
        {activeTab === 'radar' && (
          <OpportunityRadar 
            onSelectStock={handleSelectFromRadar} 
            currentTicker={stock.ticker}
            minYield={stock.minYield}
            initialBazinMode={bazinMode}
          />
        )}

        {/* TAB 2: RAIO-X DO ATIVO */}
        {activeTab === 'raio-x' && (
          <div className="space-y-8">
            <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-serif italic text-xl text-zinc-900">Régua de valor de {stock.ticker}</h2>
                  <p className="text-xs text-zinc-500">Onde a cotação está em relação aos alvos de Graham e Bazin.</p>
                </div>
                <button onClick={() => setActiveTab('laboratorio')} className="text-xs font-bold text-emerald-700 hover:underline self-start">
                  Abrir no Laboratório
                </button>
              </div>
              <DataQualityNote stock={stock} />
              <PriceRuler
                price={stock.currentPrice}
                tracks={[
                  { label: 'Graham — preço justo', entry: results.grahamEntryPrice, target: results.grahamFairPrice },
                  { label: `Bazin — preço teto (${bazinMode === '5y' ? 'média 5a' : '12m'})`, entry: results.bazinEntryPrice, target: results.bazinCeilingPrice },
                ]}
              />
            </section>

            <AssetXRay 
              stock={stock}
              results={results}
              onUpdateStock={(field, val) => setStock(prev => ({ ...prev, [field]: val }))}
              onAddToPortfolio={() => setIsQuickAddOpen(true)}
              bazinMode={bazinMode}
              onToggleBazinMode={(mode) => setBazinMode(mode)}
            />

            {/* Cotação mensal com faixas de Graham/Bazin (velas anuais na alternância) */}
            <PriceHistoryChart
              ticker={stock.ticker}
              points={stock.priceHistory || []}
              annual={stock.historicalData}
              grahamFair={results.grahamFairPrice}
              grahamEntry={results.grahamEntryPrice}
              bazinCeiling={results.bazinCeilingPrice}
              bazinEntry={results.bazinEntryPrice}
              bazinLabel={`Bazin ${bazinMode === '5y' ? '5a' : '12m'}`}
            />

            {/* AI Qualitative Analysis Section */}
            <div className="mt-8">
              <AIAnalyst stockData={stock} />
            </div>

          </div>
        )}

        {/* TAB 3: CALCULADORA INTERATIVA */}
        {activeTab === 'calculadora' && (
          <div className="space-y-8">
            <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight">
                  Calculadora Fundamentalista Graham & Bazin
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Ajuste os parâmetros livres para calcular preços justos, margens de segurança e tetos de compra.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold px-2">Base Bazin:</span>
                <button
                  onClick={() => setBazinMode('5y')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    bazinMode === '5y' ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'
                  }`}
                >
                  Média 5 Anos ({brl((stock.avgDividends5y || stock.dividends))})
                </button>
                <button
                  onClick={() => setBazinMode('12m')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    bazinMode === '12m' ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'
                  }`}
                >
                  12 Meses ({brl(stock.dividends)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs */}
              <div className="lg:col-span-4 bg-white data-grid-border p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="font-serif italic text-lg text-zinc-900 pb-3 border-b border-zinc-100">
                  Dados do Ativo ({stock.ticker})
                </h3>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Preço Atual</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      name="currentPrice"
                      value={stock.currentPrice}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">LPA</label>
                    <input
                      type="number"
                      step="0.01"
                      name="lpa"
                      value={stock.lpa}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">VPA</label>
                    <input
                      type="number"
                      step="0.01"
                      name="vpa"
                      value={stock.vpa}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Proventos 12m</label>
                    <input
                      type="number"
                      step="0.01"
                      name="dividends"
                      value={stock.dividends}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Média 5 Anos</label>
                    <input
                      type="number"
                      step="0.01"
                      name="avgDividends5y"
                      value={stock.avgDividends5y || stock.dividends}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Margem de Segurança</span>
                      <span className="font-mono text-xs font-bold text-zinc-900">{stock.marginOfSafety}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="5"
                      name="marginOfSafety"
                      value={stock.marginOfSafety}
                      onChange={handleInputChange}
                      className="w-full accent-emerald-600 h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Yield Mínimo Desejado</span>
                      <span className="font-mono text-xs font-bold text-emerald-700">{stock.minYield}%</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="12"
                      step="0.5"
                      name="minYield"
                      value={stock.minYield}
                      onChange={handleInputChange}
                      className="w-full accent-emerald-600 h-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Valuation Display Output */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ValuationDisplay 
                    title="Valor Intrínseco"
                    method="Graham"
                    fairPrice={results.grahamFairPrice}
                    entryPrice={results.grahamEntryPrice}
                    upside={results.grahamUpside}
                    status={results.grahamStatus}
                    currentPrice={stock.currentPrice}
                    description="Calcula o valor justo por lucros e patrimônio. Ação barata pelo que possui e gera."
                    portfolioInfo={currentPortfolioItem}
                  />

                  <ValuationDisplay 
                    title={`Preço Teto (${bazinMode === '5y' ? 'Média 5a' : '12m'})`}
                    method="Bazin"
                    fairPrice={results.bazinCeilingPrice}
                    entryPrice={results.bazinEntryPrice}
                    upside={results.bazinUpside}
                    status={results.bazinStatus}
                    currentPrice={stock.currentPrice}
                    description={`Calcula o preço máximo para obter pelo menos ${stock.minYield}% ao ano em dividendos sem vender ativos.`}
                    portfolioInfo={currentPortfolioItem}
                  />
                </div>

                <UpsideChart 
                  grahamFairPrice={results.grahamFairPrice}
                  bazinCeilingPrice={results.bazinCeilingPrice}
                  currentPrice={stock.currentPrice}
                  ticker={stock.ticker}
                />
              </div>
            </div>

            {/* Live Multiples Comparator */}
            <div className="mt-8">
              <StockComparator
                currentTicker={stock.ticker}
                currentName={stock.companyName}
                currentPrice={stock.currentPrice}
                lpa={stock.lpa}
                vpa={stock.vpa}
                dividends={stock.dividends}
                avgDividends5y={stock.avgDividends5y}
                minYield={stock.minYield}
              />
            </div>
          </div>
        )}

        {/* NOVO: LABORATÓRIO DE VALUATION */}
        {activeTab === 'laboratorio' && (
          <ValuationLab stock={stock} minYield={stock.minYield} margin={stock.marginOfSafety} bazinBase={bazinMode} />
        )}

        {/* NOVO: MÁQUINA DE RENDA */}
        {activeTab === 'renda' && (
          <IncomeMachine
            minYield={stock.minYield}
            portfolio={portfolio}
            currentStock={stock}
            defaultGoal={user?.profile.monthlyDividendGoal || 2000}
            defaultMonthly={user?.profile.monthlyContribution || 1500}
          />
        )}

        {/* TAB 4: OTIMIZADOR DE APORTES */}
        {activeTab === 'otimizador' && (
          <AllocationOptimizer 
            portfolio={portfolio}
            onApplyPurchases={handleApplyPurchasesFromOptimizer}
            onSelectStock={handleSelectFromRadar}
            minYield={stock.minYield}
          />
        )}

        {/* TAB 5: JUROS COMPOSTOS & IPCA */}
        {activeTab === 'juros-compostos' && (
          <CompoundSimulator currentStock={stock} />
        )}

        {/* TAB 6: MEU PORTFÓLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <PortfolioDashboard
              portfolio={portfolio}
              onRemove={removeFromPortfolio}
              onSelect={(ticker) => {
                fetchStockData(ticker);
                setActiveTab('raio-x');
              }}
              onUpdateAlert={updatePortfolioAlert}
              onAlertsChecked={setTriggeredAlerts}
              isFetching={isFetching}
              minYield={stock.minYield}
              margin={stock.marginOfSafety}
              bazinMode={bazinMode}
            />
            <BackupCard />
          </div>
        )}

        {/* TAB 7: CADASTRO & PERFIL DO INVESTIDOR */}
        {activeTab === 'cadastro' && (
          <div className="space-y-6">
            <RegistrationFlow 
              initialMode={isAuthenticated ? 'profile' : 'register'}
              onSuccess={() => {}}
            />
            <BackupCard />
          </div>
        )}
        </Suspense>
        </ErrorBoundary>
      </main>

      <QuickAddModal
        open={isQuickAddOpen}
        ticker={stock.ticker}
        price={stock.currentPrice}
        onClose={() => setIsQuickAddOpen(false)}
        onConfirm={addToPortfolio}
      />

      <MobileNav active={activeTab} onChange={setActiveTab} />

      {/* Global Auth & Registration Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;

