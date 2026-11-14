import React, { useState, useMemo } from 'react';
import { Search, X, ChevronRight, Globe, Factory, Landmark, ShoppingCart, Zap, Droplets, HeartPulse, HardHat, Car, Plane, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { POPULAR_TICKERS } from '../constants';
import { useEscape } from '../lib/useEscape';

interface StockDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ticker: string) => void;
}

interface SegmentData {
  icon: any;
  tickers: string[];
}

const STOCK_SEGMENTS: Record<string, SegmentData> = {
  "Financeiro": {
    icon: Landmark,
    tickers: ["BBAS3", "ITUB4", "BBDC4", "SANB11", "BPAC11", "B3SA3", "BBSE3", "CXSE3", "PSSA3", "ITSA4", "ABCB4", "BPAN4"]
  },
  "Energia Elétrica": {
    icon: Zap,
    tickers: ["ELET3", "ELET6", "CPFE3", "EGIE3", "TAEE11", "TRPL4", "CMIG4", "AURE3", "ENGI11", "NEOE3", "ALUP11", "EQTL3"]
  },
  "Petróleo, Gás e Biocombustíveis": {
    icon: Droplets,
    tickers: ["PETR4", "PETR3", "PRIO3", "RRRP3", "RECV3", "UGPA3", "VBBR3", "CSAN3", "ENAT3"]
  },
  "Mineração e Siderurgia": {
    icon: Factory,
    tickers: ["VALE3", "GGBR4", "CSNA3", "USIM5", "CMIN3", "BRAP4", "FESA4"]
  },
  "Varejo e Consumo": {
    icon: ShoppingCart,
    tickers: ["MGLU3", "BHIA3", "LREN3", "AMER3", "ARZZ3", "SOMA3", "CEAB3", "ALPA4", "PETZ3", "ZAMP3"]
  },
  "Saúde": {
    icon: HeartPulse,
    tickers: ["HAPV3", "RDOR3", "FLRY3", "PARD3", "VVEO3", "BLAU3", "DASA3", "ONCO3"]
  },
  "Saneamento": {
    icon: Droplets,
    tickers: ["SBSP3", "SAPR11", "CSMG3"]
  },
  "Alimentos e Bebidas": {
    icon: Factory,
    tickers: ["JBSS3", "BRFS3", "BEEF3", "MRFG3", "ABEV3", "MDIA3", "CAML3", "SMTO3"]
  },
  "Construção e Imobiliário": {
    icon: HardHat,
    tickers: ["CYRE3", "EZTC3", "MRVE3", "EVEN3", "DIRR3", "CURY3", "TEND3", "JHSF3", "LAVV3"]
  },
  "Transporte e Logística": {
    icon: Car,
    tickers: ["RAIL3", "CCRO3", "ECOR3", "STBP3", "VAMO3", "SIMH3", "LOGN3", "TGMA3"]
  },
  "Aéreo": {
    icon: Plane,
    tickers: ["AZUL4", "GOLL4", "EMBR3"]
  },
  "Tecnologia e Telecom": {
    icon: Smartphone,
    tickers: ["VIVT3", "TIMS3", "TOTS3", "LWSA3", "CASH3", "POSI3", "INTB3"]
  },
  "Papel e Celulose": {
    icon: Factory,
    tickers: ["SUZB3", "KLBN11", "RANI3"]
  },
  "Outros": {
    icon: Globe,
    tickers: [] // Will be populated with remaining popular tickers
  }
};

// Populate "Outros" with tickers not in other categories
const categorizedTickers = new Set(Object.values(STOCK_SEGMENTS).flatMap(s => s.tickers));
STOCK_SEGMENTS["Outros"].tickers = POPULAR_TICKERS.filter(t => !categorizedTickers.has(t));

export const StockDirectory: React.FC<StockDirectoryProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  useEscape(isOpen, onClose);

  const filteredSegments = useMemo(() => {
    if (!searchTerm) return STOCK_SEGMENTS;

    const result: typeof STOCK_SEGMENTS = {};
    (Object.entries(STOCK_SEGMENTS) as [string, SegmentData][]).forEach(([name, data]) => {
      const matchingTickers = data.tickers.filter(t => 
        t.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingTickers.length > 0 || name.toLowerCase().includes(searchTerm.toLowerCase())) {
        result[name] = { ...data, tickers: matchingTickers };
      }
    });
    return result;
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          role="dialog" aria-modal="true" aria-labelledby="dir-title"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div>
              <h2 id="dir-title" className="text-2xl font-serif italic text-zinc-900">Diretório da Bolsa</h2>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Explore ativos por segmento</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text"
                placeholder="Buscar por ticker ou segmento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-zinc-900"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.entries(filteredSegments) as [string, SegmentData][]).map(([name, data]) => {
                const Icon = data.icon;
                if (data.tickers.length === 0 && searchTerm) return null;
                
                return (
                  <div key={name} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                      <div className="p-1.5 bg-emerald-50 rounded-lg">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-tight">{name}</h3>
                      <span className="text-[10px] font-mono text-zinc-400 ml-auto">{data.tickers.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.tickers.map(ticker => (
                        <button
                          key={ticker}
                          onClick={() => {
                            onSelect(ticker);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-zinc-50 hover:bg-emerald-600 hover:text-white border border-zinc-200 rounded-lg text-xs font-bold transition-all"
                        >
                          {ticker}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center">
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
              Clique em um ticker para iniciar a análise automática
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
