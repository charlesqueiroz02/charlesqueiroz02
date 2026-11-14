import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { num } from '../lib/valuation';

interface ParamsPopoverProps {
  minYield: number;
  margin: number;
  bazinMode: '5y' | '12m';
  onChange: (p: { minYield?: number; margin?: number; bazinMode?: '5y' | '12m' }) => void;
}

/** Parâmetros globais: valem para Radar, Raio-X, Calculadora, Laboratório e Renda. */
export const ParamsPopover: React.FC<ParamsPopoverProps> = ({ minYield, margin, bazinMode, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-700"
        title="Meus parâmetros de Graham e Bazin"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden lg:inline font-mono">{num(minYield, 1)}% · {margin}%</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 z-50">
          <div className="text-sm font-bold text-zinc-950">Meus parâmetros</div>
          <p className="text-[11px] text-zinc-500 mb-3">Valem para todas as telas.</p>
          <label className="block mb-3">
            <span className="flex justify-between text-xs mb-1"><span>Yield mínimo (Bazin)</span><b className="font-mono">{num(minYield, 1)}%</b></span>
            <input type="range" min={3} max={12} step={0.5} value={minYield} onChange={e => onChange({ minYield: Number(e.target.value) })} className="w-full accent-emerald-600" />
          </label>
          <label className="block mb-3">
            <span className="flex justify-between text-xs mb-1"><span>Margem de segurança</span><b className="font-mono">{margin}%</b></span>
            <input type="range" min={0} max={40} step={5} value={margin} onChange={e => onChange({ margin: Number(e.target.value) })} className="w-full accent-emerald-600" />
          </label>
          <div className="text-xs mb-1">Base de proventos do Bazin</div>
          <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-lg">
            {(['5y', '12m'] as const).map(m => (
              <button key={m} onClick={() => onChange({ bazinMode: m })}
                className={`py-1.5 rounded text-xs font-bold ${bazinMode === m ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'}`}>
                {m === '5y' ? 'Média 5 anos' : '12 meses'}
              </button>
            ))}
          </div>
          <button onClick={() => onChange({ minYield: 6, margin: 20, bazinMode: '5y' })}
            className="w-full mt-3 text-[11px] text-zinc-500 hover:text-zinc-900">Voltar ao clássico (6% · 20% · 5 anos)</button>
        </div>
      )}
    </div>
  );
};
