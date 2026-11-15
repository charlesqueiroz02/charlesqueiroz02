import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, MinusCircle, HelpCircle, Briefcase } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { brl, num } from '../lib/valuation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ValuationDisplayProps {
  title: string;
  method: 'Graham' | 'Bazin';
  fairPrice: number;
  entryPrice: number;
  upside: number;
  status: 'COMPRA' | 'AGUARDAR' | 'VENDA';
  currentPrice: number;
  description: string;
  portfolioInfo?: {
    purchasePrice: number;
    quantity: number;
  };
}

export const ValuationDisplay: React.FC<ValuationDisplayProps> = ({
  title,
  method,
  fairPrice,
  entryPrice,
  upside,
  status,
  currentPrice,
  description,
  portfolioInfo
}) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'COMPRA': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'AGUARDAR': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'VENDA': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'COMPRA': return <CheckCircle2 className="w-5 h-5" />;
      case 'AGUARDAR': return <MinusCircle className="w-5 h-5" />;
      case 'VENDA': return <AlertCircle className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  const portfolioPerformance = portfolioInfo && portfolioInfo.purchasePrice > 0
    ? ((currentPrice / portfolioInfo.purchasePrice) - 1) * 100
    : 0;
  // Evita divisão por zero quando o método não se aplica (preço justo = 0)
  const ratio = (v: number) => (fairPrice > 0 ? Math.min(100, Math.max(0, (v / fairPrice) * 100)) : 0);

  return (
    <div className="bg-white data-grid-border p-6 rounded-lg shadow-sm flex flex-col h-full relative overflow-hidden">
      {portfolioInfo && (
        <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-800 border-b border-l border-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-lg flex items-center gap-2">
          <Briefcase className="w-2.5 h-2.5" />
          No Portfólio
        </div>
      )}
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-serif italic text-xl mb-1">{title}</h3>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">{method} Method</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-tighter",
          getStatusColor(status)
        )}>
          {getStatusIcon(status)}
          {status}
        </div>
      </div>

      {portfolioInfo && (
        <div className="mb-6 p-3 bg-zinc-50 rounded border border-zinc-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Seu Preço Médio</span>
            <span className="font-mono font-bold text-zinc-900">{brl(portfolioInfo.purchasePrice)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Performance</span>
            <div className={cn(
              "flex items-center gap-1 font-mono font-bold text-xs",
              portfolioPerformance >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {portfolioPerformance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {num(portfolioPerformance, 2)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border-r border-zinc-100 pr-4">
          <span className="col-header block mb-1">Preço Justo / Teto</span>
          <span className="data-value text-2xl font-bold">
            R$ {fairPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="pl-2">
          <span className="col-header block mb-1">Preço de Entrada</span>
          <span className="data-value text-2xl font-bold text-emerald-700">
            R$ {entryPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <span className="col-header">Potencial de Upside</span>
          <div className={cn(
            "flex items-center gap-1 font-mono font-bold",
            upside > 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            {upside > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {num(upside, 2)}%
          </div>
        </div>
        
        {/* Progress bar showing where current price is relative to entry and fair price */}
        <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden mb-6">
          <div 
            className="absolute h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${ratio(entryPrice)}%` }}
          />
          <div 
            className="absolute w-1 h-4 bg-zinc-700 top-1/2 -translate-y-1/2 z-10"
            style={{ left: `${ratio(currentPrice)}%` }}
            title="Preço Atual"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed italic border-t border-zinc-50 pt-4">
        {description}
      </p>
    </div>
  );
};
