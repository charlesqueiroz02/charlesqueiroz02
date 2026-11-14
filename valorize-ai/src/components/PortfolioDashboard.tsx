import React from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  MinusCircle,
  PlusCircle,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { PortfolioItem, StockData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PortfolioDashboardProps {
  portfolio: PortfolioItem[];
  onRemove: (ticker: string) => void;
  onSelect: (ticker: string) => void;
  onUpdateAlert: (ticker: string, price: number, condition: 'above' | 'below') => void;
  isFetching?: boolean;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ 
  portfolio, 
  onRemove,
  onSelect,
  onUpdateAlert,
  isFetching
}) => {
  const { user, isAuthenticated } = useAuth();

  if (portfolio.length === 0) {
    return (
      <div className="bg-white data-grid-border p-12 rounded-lg shadow-sm mt-8 text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
          <Briefcase className="w-8 h-8 text-zinc-300" />
        </div>
        <h3 className="font-serif italic text-xl text-zinc-900 mb-2">Seu Portfólio está vazio</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
          Adicione as ações que você já possui para acompanhar o desempenho e saber se o Método de Graham indica compra, manutenção ou venda.
        </p>
      </div>
    );
  }


  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-zinc-900" />
          <div>
            <h3 className="font-serif italic text-2xl">Meu Portfólio</h3>
            <p className="text-xs text-zinc-500">
              {isAuthenticated && user ? (
                <span className="text-emerald-700 font-medium">
                  Sincronizado com a conta de <strong>{user.profile.name}</strong> ({user.profile.strategy === 'dividendos_bazin' ? 'Bazin' : 'Graham'})
                </span>
              ) : (
                <span className="text-zinc-500">
                  Modo Convidado • Armazenamento local
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase bg-zinc-100 px-3 py-1 rounded-full text-zinc-600 font-bold">
            {portfolio.length} Ativos Cadastrados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {portfolio.map((item) => (
            <motion.div
              key={item.ticker}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white data-grid-border p-5 rounded-lg shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded flex items-center justify-center font-bold tracking-tighter">
                    {item.ticker}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-none mb-1">{item.ticker}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase">
                      Comprado por: R$ {item.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 flex-grow max-w-2xl">
                  <div>
                    <span className="col-header block mb-1">Preço Médio</span>
                    <span className="font-mono font-bold text-zinc-900">R$ {item.purchasePrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="col-header block mb-1">Quantidade</span>
                    <span className="font-mono font-bold text-zinc-900">{item.quantity} un.</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="col-header block mb-1">Total Investido</span>
                    <span className="font-mono font-bold text-zinc-900">R$ {(item.purchasePrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 border-l border-zinc-100 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className={cn("w-3 h-3", item.alertPrice ? "text-emerald-500" : "text-zinc-300")} />
                      <span className="col-header block">Alerta de Preço</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={item.alertCondition || 'above'}
                        onChange={(e) => onUpdateAlert(item.ticker, item.alertPrice || 0, e.target.value as 'above' | 'below')}
                        className="text-[10px] bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none font-bold uppercase"
                      >
                        <option value="above">Acima</option>
                        <option value="below">Abaixo</option>
                      </select>
                      <input 
                        type="number"
                        placeholder="R$ 0,00"
                        value={item.alertPrice || ''}
                        onChange={(e) => onUpdateAlert(item.ticker, parseFloat(e.target.value) || 0, item.alertCondition || 'above')}
                        className="w-16 text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelect(item.ticker)}
                    disabled={isFetching}
                    className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 px-4 py-2 rounded text-xs font-bold uppercase tracking-tighter transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetching ? 'Buscando...' : 'Analisar Agora'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item.ticker)}
                    className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                    title="Remover do Portfólio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">Como acompanhar:</span> Clique em "Analisar Agora" para ver o Preço Justo atualizado pelo Método de Graham. O sistema comparará o preço de mercado com o seu preço médio para indicar se vale a pena comprar mais ou realizar lucros.
        </p>
      </div>
    </div>
  );
};
