import React from 'react';
import {
  CartesianGrid, Cell, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import type { RadarStockItem } from '../types';
import { CHART, axisTick } from '../lib/chartTheme';
import { brl, num } from '../lib/valuation';

interface OpportunityMapProps {
  stocks: RadarStockItem[];
  bazinMode: '5y' | '12m';
  currentTicker?: string;
  onSelect: (ticker: string) => void;
}

const clampPct = (v: number) => Math.max(-80, Math.min(150, v));

/**
 * Mapa de oportunidades: cada ação é um ponto.
 *  - eixo X: quanto falta até o preço justo de Graham
 *  - eixo Y: quanto falta até o preço teto de Bazin
 *  - tamanho: Nota Valorize
 * O quadrante superior direito (verde) reúne as ações com "margem dupla".
 */
export const OpportunityMap: React.FC<OpportunityMapProps> = ({ stocks, bazinMode, currentTicker, onSelect }) => {
  const data = stocks
    .filter(s => s.grahamFair > 0 || (bazinMode === '5y' ? s.bazinCeiling5y : s.bazinCeiling12m) > 0)
    .map(s => {
      const bUp = bazinMode === '5y' ? s.bazinUpside5y : s.bazinUpside12m;
      return {
        ticker: s.ticker, name: s.name, price: s.price, score: s.score ?? 0,
        graham: clampPct(s.grahamUpside), bazin: clampPct(bUp),
        rawGraham: s.grahamUpside, rawBazin: bUp,
      };
    });

  if (!data.length) {
    return <p className="text-sm text-zinc-500 text-center py-10">Sem ações com alvos calculáveis para os filtros atuais.</p>;
  }

  const xs = data.map(d => d.graham), ys = data.map(d => d.bazin);
  // Limites arredondados em múltiplos de 20% (eixos com números redondos)
  const r20 = (v: number, up: boolean) => (up ? Math.ceil(v / 20) : Math.floor(v / 20)) * 20;
  const xDom: [number, number] = [r20(Math.min(-20, ...xs) - 5, false), r20(Math.max(40, ...xs) + 5, true)];
  const yDom: [number, number] = [r20(Math.min(-20, ...ys) - 5, false), r20(Math.max(40, ...ys) + 5, true)];
  const colorOf = (d: typeof data[number]) =>
    d.rawGraham > 0 && d.rawBazin > 0 ? CHART.positive : d.rawGraham > 0 || d.rawBazin > 0 ? CHART.amber : CHART.negative;

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 mb-2">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CHART.positive }} />Abaixo dos dois alvos</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CHART.amber }} />Abaixo de um alvo</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CHART.negative }} />Acima dos dois</span>
        <span>Tamanho = Nota Valorize · toque num ponto para abrir o Raio-X</span>
      </div>
      <div className="h-[380px]" role="img" aria-label="Mapa de dispersão das ações pelo potencial até o preço justo de Graham e até o preço teto de Bazin">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 24, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <ReferenceArea x1={0} x2={xDom[1]} y1={0} y2={yDom[1]} fill={CHART.buyZone} fillOpacity={0.55} />
            <XAxis type="number" dataKey="graham" domain={xDom} tick={axisTick} unit="%" name="Graham" allowDecimals={false} tickCount={7}
              label={{ value: 'Até o preço justo (Graham)', position: 'insideBottom', offset: -14, fontSize: 11, fill: CHART.axis }} />
            <YAxis type="number" dataKey="bazin" domain={yDom} tick={axisTick} unit="%" width={52} name="Bazin" allowDecimals={false} tickCount={7}
              label={{ value: `Até o teto Bazin (${bazinMode === '5y' ? '5a' : '12m'})`, angle: -90, position: 'left', offset: 2, fontSize: 11, fill: CHART.axis }} />
            <ZAxis type="number" dataKey="score" range={[50, 420]} domain={[0, 100]} />
            <ReferenceLine x={0} stroke={CHART.neutral} />
            <ReferenceLine y={0} stroke={CHART.neutral} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-2.5 text-xs">
                    <div className="font-mono font-bold text-zinc-900">{d.ticker} <span className="font-sans font-normal text-zinc-500">{d.name}</span></div>
                    <div className="text-zinc-600 mt-1">Cotação {brl(d.price)} · Nota {d.score}</div>
                    <div style={{ color: CHART.graham }}>Graham: {d.rawGraham > 0 ? '+' : ''}{num(d.rawGraham, 1)}%</div>
                    <div style={{ color: CHART.bazin }}>Bazin: {d.rawBazin > 0 ? '+' : ''}{num(d.rawBazin, 1)}%</div>
                  </div>
                );
              }}
            />
            <Scatter data={data} onClick={(p: any) => p?.ticker && onSelect(p.ticker)} cursor="pointer"
              label={{ dataKey: 'ticker', position: 'top', fontSize: 10, fill: CHART.axis }}>
              {data.map(d => (
                <Cell key={d.ticker} fill={colorOf(d)} fillOpacity={0.8}
                  stroke={d.ticker === currentTicker ? CHART.price : CHART.surface} strokeWidth={d.ticker === currentTicker ? 2.5 : 1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-zinc-500 mt-1">Valores extremos são limitados a −80% e +150% para caber no gráfico.</p>
    </div>
  );
};
