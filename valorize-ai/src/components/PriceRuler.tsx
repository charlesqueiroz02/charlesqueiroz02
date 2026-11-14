import React from 'react';
import { brl, pct, upsidePct } from '../lib/valuation';

interface Track {
  label: string;
  entry: number; // preço com margem de segurança
  target: number; // preço justo (Graham) ou teto (Bazin)
}

interface PriceRulerProps {
  price: number;
  tracks: Track[];
  compact?: boolean;
}

/**
 * Régua de Valor — a peça visual central do Valorize.
 * Cada método vira uma faixa: verde (abaixo da entrada), âmbar (entre entrada e alvo),
 * vermelho (acima do alvo). Uma linha vertical marca o preço de hoje em todas as faixas.
 */
export const PriceRuler: React.FC<PriceRulerProps> = ({ price, tracks, compact }) => {
  const valid = tracks.filter(t => t.target > 0);
  const values = [price, ...valid.flatMap(t => [t.entry, t.target])].filter(v => v > 0);
  if (!values.length) return null;

  const lo = Math.min(...values) * 0.8;
  const hi = Math.max(...values) * 1.15;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const pricePos = pos(price);

  return (
    <div className="relative select-none" role="img" aria-label={`Preço atual ${brl(price)} comparado aos alvos de Graham e Bazin`}>
      {/* marcador do preço atual */}
      <div className="relative h-7 mb-1">
        <div
          className="absolute -translate-x-1/2 top-0 bg-zinc-950 text-white text-[11px] font-mono font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-sm"
          style={{ left: `clamp(48px, ${pricePos}, calc(100% - 48px))` }}
        >
          Hoje {brl(price)}
        </div>
      </div>

      <div className="relative space-y-4">
        <div className="absolute top-[-6px] bottom-[-6px] w-0.5 bg-zinc-950 z-10 rounded" style={{ left: pricePos }} />

        {valid.map(t => {
          const up = upsidePct(t.target, price);
          return (
            <div key={t.label}>
              <div className="flex items-baseline justify-between mb-1.5 gap-2">
                <span className="text-xs font-semibold text-zinc-700">{t.label}</span>
                <span className={`text-xs font-mono font-bold ${up >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {pct(up)} até o alvo
                </span>
              </div>
              <div className={`relative ${compact ? 'h-3' : 'h-4'} rounded-full overflow-hidden bg-rose-100`}>
                <div className="absolute inset-y-0 left-0 bg-emerald-400/80" style={{ width: pos(t.entry) }} />
                <div
                  className="absolute inset-y-0 bg-amber-300/80"
                  style={{ left: pos(t.entry), width: `calc(${pos(t.target)} - ${pos(t.entry)})` }}
                />
              </div>
              {!compact && (
                <div className="relative h-8 mt-1 text-[10px] font-mono text-zinc-500">
                  <span className="absolute -translate-x-1/2 text-center leading-tight" style={{ left: pos(t.entry) }}>
                    entrada<br /><b className="text-emerald-700">{brl(t.entry)}</b>
                  </span>
                  <span className="absolute -translate-x-1/2 text-center leading-tight" style={{ left: pos(t.target) }}>
                    alvo<br /><b className="text-zinc-900">{brl(t.target)}</b>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Zona de compra</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-amber-300" />Entre entrada e alvo</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-rose-200" />Acima do alvo</span>
      </div>
    </div>
  );
};
