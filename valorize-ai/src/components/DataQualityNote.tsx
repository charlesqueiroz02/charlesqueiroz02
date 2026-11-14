import React from 'react';
import { Info } from 'lucide-react';
import type { StockData } from '../types';

const LABEL: Record<string, string> = {
  price: 'Cotação', fundamentals: 'LPA/VPA', dividends: 'Proventos 12m', history: 'Histórico 5 anos',
};
const TONE: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  reference: 'bg-amber-50 text-amber-800 border-amber-200',
  estimated: 'bg-orange-50 text-orange-800 border-orange-200',
  missing: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};
const WORD: Record<string, string> = { live: 'ao vivo', reference: 'referência', estimated: 'estimado', missing: 'sem dado' };

/** Mostra de onde veio cada dado. Transparência > valores inventados. */
export const DataQualityNote: React.FC<{ stock: StockData }> = ({ stock }) => {
  const q = stock.dataQuality;
  if (!q) return null;
  const allLive = Object.values(q).every(v => v === 'live');
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.entries(q) as [string, string][]).map(([k, v]) => (
          <span key={k} className={`text-[10px] px-2 py-0.5 rounded-full border ${TONE[v]}`}>
            {LABEL[k] || k}: {WORD[v]}
          </span>
        ))}
        {stock.lastUpdated && (
          <span className="text-[10px] text-zinc-400 ml-1">
            atualizado {new Date(stock.lastUpdated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>
      {!allLive && stock.warnings && stock.warnings.length > 0 && (
        <ul className="mt-2 text-[11px] text-amber-800 space-y-0.5">
          {stock.warnings.map(w => (
            <li key={w} className="flex gap-1.5"><Info className="w-3 h-3 mt-0.5 shrink-0" />{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
