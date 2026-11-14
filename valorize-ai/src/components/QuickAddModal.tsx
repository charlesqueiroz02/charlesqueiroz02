import React, { useEffect, useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { brl } from '../lib/valuation';

interface QuickAddModalProps {
  open: boolean;
  ticker: string;
  price: number;
  onClose: () => void;
  onConfirm: (quantity: number, price: number) => void;
}

/** Corrige o botão "Adicionar à carteira" do Raio-X, que antes não fazia nada. */
export const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, ticker, price, onClose, onConfirm }) => {
  const [qty, setQty] = useState(100);
  const [p, setP] = useState(price);
  useEffect(() => { if (open) { setP(price); setQty(100); } }, [open, price]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-zinc-950/40 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="qa-title"
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 id="qa-title" className="font-bold text-zinc-950 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" /> Adicionar {ticker} à carteira
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-100" aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-600 block mb-1">Quantidade</span>
            <input autoFocus type="number" inputMode="numeric" min={1} value={qty} onChange={e => setQty(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-zinc-900 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600 block mb-1">Preço médio (R$)</span>
            <input type="number" inputMode="decimal" step="0.01" value={p} onChange={e => setP(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-zinc-900 outline-none" />
          </label>
        </div>
        <div className="text-xs text-zinc-500 mt-3">Total: <b className="font-mono text-zinc-900">{brl(qty * p)}</b></div>
        <button
          disabled={qty <= 0 || p <= 0}
          onClick={() => { onConfirm(qty, p); onClose(); }}
          className="w-full mt-4 py-3 bg-zinc-950 text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-zinc-800">
          Adicionar à carteira
        </button>
      </div>
    </div>
  );
};
