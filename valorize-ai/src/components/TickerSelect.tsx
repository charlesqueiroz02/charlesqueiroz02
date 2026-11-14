import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, TrendingUp, Sparkles } from 'lucide-react';
import { POPULAR_TICKERS, TOP_RECOMMENDED_STOCKS } from '../constants';
import { cn, escapeRegExp } from '../lib/utils';

interface TickerSelectProps {
  value: string;
  /** Opcional: avisa o texto digitado (não deve trocar a ação analisada). */
  onChange?: (value: string) => void;
  onSelect: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isFetching?: boolean;
  recentSearches?: string[];
}

interface DisplayItem {
  ticker: string;
  name?: string;
  sector?: string;
}

export const TickerSelect: React.FC<TickerSelectProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  onKeyDown,
  isFetching,
  recentSearches = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Map of known tickers to metadata for fast lookup
  const metaMap = useMemo(() => {
    const map = new Map<string, { name: string; sector: string }>();
    TOP_RECOMMENDED_STOCKS.forEach(s => map.set(s.ticker, { name: s.name, sector: s.sector }));
    return map;
  }, []);

  // Filter tickers by Ticker OR by Company Name OR by Sector
  const filteredItems = useMemo((): DisplayItem[] => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      // If empty, show recent searches first (with metadata if available), then top recommended stocks
      const cleanRecent = Array.from(new Set(recentSearches.map(t => (t || '').trim().toUpperCase()).filter(t => t !== '')));
      const recentItems: DisplayItem[] = cleanRecent.map(ticker => {
        const meta = metaMap.get(ticker);
        return { ticker, name: meta?.name, sector: meta?.sector };
      });

      const remainingTop = TOP_RECOMMENDED_STOCKS
        .filter(s => !cleanRecent.includes(s.ticker))
        .map(s => ({ ticker: s.ticker, name: s.name, sector: s.sector }));

      return [...recentItems, ...remainingTop].slice(0, 25);
    }

    // Search matching:
    // 1. Ticker exact start
    // 2. Company name match
    // 3. Ticker contains
    const exactTickerStarts: DisplayItem[] = [];
    const nameMatches: DisplayItem[] = [];
    const otherContains: DisplayItem[] = [];

    // Check top recommended first
    TOP_RECOMMENDED_STOCKS.forEach(s => {
      const tickerLow = s.ticker.toLowerCase();
      const nameLow = s.name.toLowerCase();
      const sectorLow = s.sector.toLowerCase();

      if (tickerLow.startsWith(term)) {
        exactTickerStarts.push({ ticker: s.ticker, name: s.name, sector: s.sector });
      } else if (nameLow.includes(term) || sectorLow.includes(term)) {
        nameMatches.push({ ticker: s.ticker, name: s.name, sector: s.sector });
      } else if (tickerLow.includes(term)) {
        otherContains.push({ ticker: s.ticker, name: s.name, sector: s.sector });
      }
    });

    // Check other popular tickers
    const addedTickers = new Set([
      ...exactTickerStarts.map(i => i.ticker),
      ...nameMatches.map(i => i.ticker),
      ...otherContains.map(i => i.ticker)
    ]);

    POPULAR_TICKERS.forEach(t => {
      if (addedTickers.has(t)) return;
      const tLow = t.toLowerCase();
      if (tLow.startsWith(term)) {
        exactTickerStarts.push({ ticker: t });
      } else if (tLow.includes(term)) {
        otherContains.push({ ticker: t });
      }
    });

    const combined = [...exactTickerStarts, ...nameMatches, ...otherContains];

    // If query looks like a custom ticker (e.g. 4+ letters) and not in list, add it on top
    const cleanTermUpper = term.toUpperCase();
    if (cleanTermUpper.length >= 3 && !combined.some(i => i.ticker === cleanTermUpper)) {
      combined.unshift({
        ticker: cleanTermUpper,
        name: `Buscar ação ${cleanTermUpper}`,
        sector: "B3"
      });
    }

    return combined.slice(0, 35);
  }, [searchTerm, recentSearches, metaMap]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredItems]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleSelect = (ticker: string) => {
    onSelect(ticker);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInternalKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filteredItems[activeIndex]) {
          handleSelect(filteredItems[activeIndex].ticker);
        } else if (searchTerm) {
          handleSelect(searchTerm);
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
    }

    if (onKeyDown) onKeyDown(e);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    // Corrigido: o texto digitado era usado cru na RegExp e "(" ou "[" derrubava o app.
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="relative flex-grow" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setSearchTerm(val);
            onChange?.(val);
            setIsOpen(true);
          }}
          onFocus={() => !isFetching && setIsOpen(true)}
          onKeyDown={handleInternalKeyDown}
          disabled={isFetching}
          className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={isFetching ? "Buscando dados na B3..." : "Ticker ou Empresa (ex: PETR4, Itaú, Vale)"}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button 
              type="button"
              onClick={() => {
                setSearchTerm('');
                onChange?.('');
                setIsOpen(true);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-150">
          <div ref={listRef} className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isSelected = value === item.ticker || activeIndex === index;
                return (
                  <button
                    key={`${item.ticker}-${index}`}
                    type="button"
                    onClick={() => handleSelect(item.ticker)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 text-sm",
                      isSelected ? "bg-emerald-50/70" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("font-mono font-bold text-zinc-900", isSelected && "text-emerald-700")}>
                        {highlightMatch(item.ticker, searchTerm)}
                      </span>
                      {item.name && (
                        <span className="text-xs text-zinc-500 truncate max-w-[180px]">
                          {highlightMatch(item.name, searchTerm)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.sector && (
                        <span className="text-[10px] uppercase font-bold tracking-tighter bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                          {item.sector}
                        </span>
                      )}
                      {value === item.ticker && (
                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-4 text-xs text-zinc-500 text-center">
                Pressione <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono">Enter</kbd> para buscar o código <strong className="text-zinc-900 font-mono">"{searchTerm}"</strong>
              </div>
            )}
          </div>
          
          <div className="bg-zinc-50 px-4 py-2 border-t border-zinc-100 flex justify-between items-center text-[10px] text-zinc-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Busca Inteligente por Código ou Nome
            </span>
            <span className="font-mono text-[10px]">Use ↑↓ e Enter</span>
          </div>
        </div>
      )}

      {/* Fast Quick Filter Chips for Brazilian Blue Chips */}
      <div className="flex md:flex-wrap items-center gap-1.5 mt-2.5 overflow-x-auto md:overflow-visible scrollbar-none -mx-1 px-1 [&>*]:shrink-0">
        <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Populares:
        </span>
        {[
          { ticker: "PETR4", label: "Petrobras" },
          { ticker: "VALE3", label: "Vale" },
          { ticker: "BBAS3", label: "Banco do Brasil" },
          { ticker: "ITUB4", label: "Itaú" },
          { ticker: "TAEE11", label: "Taesa" },
          { ticker: "BBDC4", label: "Bradesco" },
          { ticker: "WEGE3", label: "WEG" },
          { ticker: "CXSE3", label: "Caixa Seg." },
          { ticker: "SAPR11", label: "Sanepar" }
        ].map(item => (
          <button
            key={item.ticker}
            type="button"
            onClick={() => handleSelect(item.ticker)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border",
              value === item.ticker
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            {item.ticker}
          </button>
        ))}
      </div>
    </div>
  );
};
