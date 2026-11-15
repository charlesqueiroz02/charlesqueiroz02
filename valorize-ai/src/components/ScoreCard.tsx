import React from 'react';
import type { ScorePart } from '../lib/valuation';
import { CHART } from '../lib/chartTheme';
import { num } from '../lib/valuation';

interface ScoreCardProps {
  total: number;
  grade: string;
  parts: ScorePart[];
}

const gradeTone: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  B: 'text-emerald-700 bg-emerald-50/60 border-emerald-100',
  C: 'text-amber-700 bg-amber-50 border-amber-200',
  D: 'text-orange-700 bg-orange-50 border-orange-200',
  E: 'text-rose-700 bg-rose-50 border-rose-200',
};

export const ScoreCard: React.FC<ScoreCardProps> = ({ total, grade, parts }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // gauge de 270°
  const filled = arc * (total / 100);

  return (
    <div className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <div className="relative w-36 h-36 mx-auto sm:mx-0 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full rotate-[135deg]">
            <circle cx="60" cy="60" r={r} fill="none" stroke={CHART.track} strokeWidth="10" strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
            <circle
              cx="60" cy="60" r={r} fill="none" stroke={total >= 65 ? CHART.positive : total >= 50 ? CHART.amber : CHART.negative}
              strokeWidth="10" strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono text-zinc-950 leading-none">{total}</span>
            <span className={`mt-1.5 text-xs font-bold px-2 py-0.5 rounded border ${gradeTone[grade]}`}>Nota {grade}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif italic text-xl text-zinc-900">Nota Valorize</h3>
          <p className="text-xs text-zinc-500 mt-0.5 mb-4">
            Soma de seis filtros clássicos de Graham e Bazin. Toque em cada linha para ver de onde vêm os pontos.
          </p>
          <ul className="space-y-2.5">
            {parts.map(p => (
              <li key={p.key}>
                <details className="group">
                  <summary className="flex items-center gap-3 cursor-pointer list-none">
                    <span className="text-xs text-zinc-700 w-40 shrink-0 truncate">{p.label}</span>
                    <span className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <span className="block h-full bg-emerald-500 rounded-full" style={{ width: `${(p.points / p.max) * 100}%` }} />
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 w-12 text-right">{num(p.points, 0)}/{p.max}</span>
                  </summary>
                  <p className="text-[11px] text-zinc-500 mt-1 pl-1">{p.hint}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 mt-4 border-t border-zinc-100 pt-3">
        A nota resume critérios quantitativos e não é recomendação de investimento.
      </p>
    </div>
  );
};
