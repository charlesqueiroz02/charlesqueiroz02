import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, RotateCcw, Grid3x3, ScanSearch } from 'lucide-react';
import type { StockData } from '../types';
import {
  computeValuation,
  valorizeScore,
  reverseEngineer,
  applyShock,
  STRESS_PRESETS,
  StressShock,
  grahamFairPrice,
  bazinCeilingPrice,
  upsidePct,
  brl,
  pct,
  num,
  BazinBase,
} from '../lib/valuation';
import { PriceRuler } from './PriceRuler';
import { ScoreCard } from './ScoreCard';
import { DataQualityNote } from './DataQualityNote';

interface ValuationLabProps {
  stock: StockData;
  minYield: number;
  margin: number;
  bazinBase: BazinBase;
}

const signalTone = {
  COMPRA: 'bg-emerald-600 text-white',
  AGUARDAR: 'bg-amber-100 text-amber-800',
  VENDA: 'bg-rose-100 text-rose-700',
} as const;

const signalLabel = { COMPRA: 'Compra', AGUARDAR: 'Aguardar', VENDA: 'Acima do alvo' } as const;

export const ValuationLab: React.FC<ValuationLabProps> = ({ stock, minYield, margin, bazinBase }) => {
  const div5y = stock.avgDividends5y || stock.dividends;
  const baseDiv = bazinBase === '5y' ? div5y : stock.dividends;

  const base = useMemo(() => computeValuation({
    price: stock.currentPrice, lpa: stock.lpa, vpa: stock.vpa,
    dividends12m: stock.dividends, avgDividends5y: div5y, minYield, margin, bazinBase,
  }), [stock, div5y, minYield, margin, bazinBase]);

  const score = useMemo(() => valorizeScore({
    price: stock.currentPrice, lpa: stock.lpa, vpa: stock.vpa,
    dividends12m: stock.dividends, avgDividends5y: div5y,
    dividendYears: stock.dividendHistory5y?.map(d => d.amount),
    sectorPL: stock.sector?.avgPL, sectorPVP: stock.sector?.avgPVP, minYield,
  }), [stock, div5y, minYield]);

  const reverse = useMemo(
    () => reverseEngineer(stock.currentPrice, stock.lpa, stock.vpa, baseDiv, minYield),
    [stock, baseDiv, minYield],
  );

  /* ---------------- Teste de estresse ---------------- */
  const [shock, setShock] = useState<StressShock>({ lpaPct: 0, vpaPct: 0, divPct: 0, minYield });
  const [presetId, setPresetId] = useState('base');
  // Corrigido: o cenário não acompanhava a mudança do yield mínimo em "Meus parâmetros"
  useEffect(() => {
    setShock(p => ({ ...p, minYield }));
    setPresetId(id => (id === 'base' ? 'base' : ''));
  }, [minYield]);
  const stressed = useMemo(() => {
    const s = applyShock(stock.lpa, stock.vpa, baseDiv, shock);
    const g = grahamFairPrice(s.lpa, s.vpa);
    const b = bazinCeilingPrice(s.div, s.minYield);
    return {
      graham: g, bazin: b,
      grahamUp: upsidePct(g, stock.currentPrice),
      bazinUp: upsidePct(b, stock.currentPrice),
    };
  }, [stock, baseDiv, shock]);

  const setSlider = (k: keyof StressShock, v: number) => { setPresetId(''); setShock(p => ({ ...p, [k]: v })); };

  /* ---------------- Mapa de sensibilidade ---------------- */
  const [heat, setHeat] = useState<'bazin' | 'graham'>('bazin');
  const steps = [-40, -30, -20, -10, 0, 10, 20];
  const yields = [4, 5, 6, 7, 8, 9, 10];
  const grid = useMemo(() => {
    if (heat === 'bazin') {
      return yields.map(y => steps.map(d => bazinCeilingPrice(baseDiv * (1 + d / 100), y)));
    }
    return steps.slice().reverse().map(v => steps.map(l => grahamFairPrice(stock.lpa * (1 + l / 100), stock.vpa * (1 + v / 100))));
  }, [heat, baseDiv, stock.lpa, stock.vpa]);
  const rowLabels = heat === 'bazin' ? yields.map(y => `${y}%`) : steps.slice().reverse().map(v => pct(v, 0));

  const cellTone = (val: number) => {
    const up = upsidePct(val, stock.currentPrice);
    if (val <= 0) return 'bg-zinc-100 text-zinc-400';
    if (up >= 30) return 'bg-emerald-600 text-white';
    if (up >= 10) return 'bg-emerald-300 text-emerald-950';
    if (up >= 0) return 'bg-emerald-100 text-emerald-900';
    if (up >= -15) return 'bg-amber-100 text-amber-900';
    return 'bg-rose-200 text-rose-900';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-600" /> Laboratório de Valuation
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {stock.companyName || stock.ticker} <span className="font-mono font-bold text-zinc-800">{stock.ticker}</span> — veja onde o preço está, o que ele já embute e como reage a choques.
            </p>
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            Yield mín. {num(minYield, 1)}% · Margem {margin}% · Bazin {bazinBase === '5y' ? 'média 5 anos' : '12 meses'}
          </div>
        </div>
        <DataQualityNote stock={stock} />
        <PriceRuler
          price={stock.currentPrice}
          tracks={[
            { label: 'Graham — preço justo', entry: base.grahamEntry, target: base.grahamFair },
            { label: `Bazin — preço teto (${bazinBase === '5y' ? 'média 5a' : '12m'})`, entry: base.bazinEntry, target: base.bazinCeiling },
          ]}
        />
        {base.grahamFair === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3">
            Graham não se aplica: a empresa tem LPA ou VPA negativo.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoreCard {...score} />

        {/* Engenharia reversa */}
        <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-serif italic text-xl text-zinc-900 flex items-center gap-2">
            <ScanSearch className="w-4 h-4 text-zinc-500" /> O que o preço de hoje já embute?
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 mb-4">Invertemos as fórmulas: em vez de calcular o preço justo, descobrimos a exigência escondida na cotação.</p>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500 mb-1">Pela fórmula de Graham</div>
              {stock.vpa > 0 ? (
                <p className="text-sm text-zinc-800 leading-relaxed">
                  Basta a empresa lucrar <b className="font-mono">{brl(reverse.impliedLpa)}</b> por ação para {brl(stock.currentPrice)} ser preço justo.
                  O lucro atual é <b className="font-mono">{brl(stock.lpa)}</b>, então ele pode{' '}
                  {reverse.lpaCushionPct >= 0
                    ? <>cair <b className="text-emerald-700">{num(reverse.lpaCushionPct, 0)}%</b> antes de a ação ficar cara.</>
                    : <>precisa <b className="text-rose-600">subir {num(-reverse.lpaCushionPct, 0)}%</b> para justificar o preço.</>}
                </p>
              ) : <p className="text-sm text-zinc-500">VPA negativo: não há leitura possível.</p>}
            </div>

            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="text-xs text-zinc-500 mb-1">Pela regra de Bazin ({num(minYield, 1)}% ao ano)</div>
              <p className="text-sm text-zinc-800 leading-relaxed">
                Comprando hoje, você precisa receber <b className="font-mono">{brl(reverse.impliedDividend)}</b> por ação ao ano.
                A base usada é <b className="font-mono">{brl(baseDiv)}</b> ({bazinBase === '5y' ? 'média 5 anos' : '12 meses'}), o que rende{' '}
                <b className="font-mono">{num(reverse.yieldAtPrice, 1)}%</b>.{' '}
                {reverse.dividendCushionPct >= 0
                  ? <>Os proventos podem cair <b className="text-emerald-700">{num(reverse.dividendCushionPct, 0)}%</b> e ainda assim você bate a meta.</>
                  : <>Faltam <b className="text-rose-600">{num(-reverse.dividendCushionPct, 0)}%</b> de proventos para atingir a meta.</>}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Teste de estresse */}
      <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif italic text-xl text-zinc-900">Teste de estresse</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Escolha um cenário pronto ou mova os controles. Os preços-alvo se recalculam na hora.</p>
          </div>
          <button
            onClick={() => { setPresetId('base'); setShock({ lpaPct: 0, vpaPct: 0, divPct: 0, minYield }); }}
            className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Zerar
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
          {STRESS_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => { setPresetId(p.id); setShock(p.id === 'selic' ? p.shock : { ...p.shock, minYield }); }}
              className={`shrink-0 text-left px-3 py-2 rounded-lg border transition-colors ${presetId === p.id ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              <div className="text-xs font-bold">{p.label}</div>
              <div className={`text-[10px] ${presetId === p.id ? 'text-zinc-300' : 'text-zinc-500'}`}>{p.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {([
              ['lpaPct', 'Variação do lucro (LPA)', -60, 60, 5, '%'],
              ['vpaPct', 'Variação do patrimônio (VPA)', -40, 40, 5, '%'],
              ['divPct', 'Variação dos proventos', -80, 60, 5, '%'],
              ['minYield', 'Yield mínimo exigido', 3, 12, 0.5, '%'],
            ] as const).map(([k, label, min, max, step]) => (
              <label key={k} className="block">
                <span className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-600">{label}</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {k === 'minYield' ? `${num(shock[k], 1)}%` : pct(shock[k], 0)}
                  </span>
                </span>
                <input
                  type="range" min={min} max={max} step={step} value={shock[k]}
                  onChange={e => setSlider(k, Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2"
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              { name: 'Graham', val: stressed.graham, up: stressed.grahamUp, before: base.grahamFair },
              { name: 'Bazin', val: stressed.bazin, up: stressed.bazinUp, before: base.bazinCeiling },
            ].map(r => {
              const sig = r.val <= 0 ? 'AGUARDAR' : stock.currentPrice <= r.val * (1 - margin / 100) ? 'COMPRA' : stock.currentPrice > r.val ? 'VENDA' : 'AGUARDAR';
              return (
                <div key={r.name} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-xs text-zinc-500">{r.name} no cenário</div>
                  <div className="text-2xl font-mono font-bold text-zinc-950 mt-1">{r.val > 0 ? brl(r.val) : '—'}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">antes {r.before > 0 ? brl(r.before) : '—'}</div>
                  <div className={`text-xs font-mono font-bold mt-2 ${r.up >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{pct(r.up)} vs. cotação</div>
                  <span className={`inline-block mt-2 text-[11px] font-bold px-2 py-0.5 rounded ${signalTone[sig]}`}>{signalLabel[sig]}</span>
                </div>
              );
            })}
            <div className="col-span-2">
              <PriceRuler
                compact
                price={stock.currentPrice}
                tracks={[
                  { label: 'Graham no cenário', entry: stressed.graham * (1 - margin / 100), target: stressed.graham },
                  { label: 'Bazin no cenário', entry: stressed.bazin * (1 - margin / 100), target: stressed.bazin },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mapa de sensibilidade */}
      <section className="bg-white data-grid-border rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif italic text-xl text-zinc-900 flex items-center gap-2"><Grid3x3 className="w-4 h-4 text-zinc-500" /> Mapa de sensibilidade</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {heat === 'bazin'
                ? 'Preço teto para cada combinação de yield exigido (linhas) e variação dos proventos (colunas).'
                : 'Preço justo para cada combinação de variação do patrimônio (linhas) e do lucro (colunas).'}
              {' '}Verde = acima da cotação de {brl(stock.currentPrice)}.
            </p>
          </div>
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 self-start">
            {(['bazin', 'graham'] as const).map(h => (
              <button key={h} onClick={() => setHeat(h)}
                className={`px-3 py-1.5 rounded text-xs font-bold ${heat === h ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-zinc-600'}`}>
                {h === 'bazin' ? 'Bazin' : 'Graham'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[11px] font-mono">
            <thead>
              <tr>
                <th className="w-20 text-left text-zinc-400 font-normal pr-2 leading-tight">{heat === 'bazin' ? 'yield ↓ prov. →' : 'VPA ↓ LPA →'}</th>
                {steps.map(s => <th key={s} className="text-zinc-500 font-normal">{pct(s, 0)}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i}>
                  <th className="text-left text-zinc-500 font-normal pr-2">{rowLabels[i]}</th>
                  {row.map((v, j) => {
                    const isBase = heat === 'bazin' ? (yields[i] === Math.round(minYield) && steps[j] === 0) : (steps[steps.length - 1 - i] === 0 && steps[j] === 0);
                    return (
                      <td key={j} className={`text-center py-2 rounded-md ${cellTone(v)} ${isBase ? 'ring-2 ring-zinc-950' : ''}`}>
                        {v > 0 ? num(v, v >= 100 ? 0 : 2) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
