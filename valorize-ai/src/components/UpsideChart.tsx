import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  Label
} from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { CHART, tooltipStyle } from '../lib/chartTheme';

interface UpsideChartProps {
  ticker: string;
  currentPrice: number;
  grahamFairPrice: number;
  bazinCeilingPrice: number;
}

const safeToFixed = (val: any, decimals: number = 2): string => {
  const num = Number(val);
  if (val === undefined || val === null || isNaN(num) || !isFinite(num)) {
    return "0.00";
  }
  return num.toFixed(decimals);
};

export const UpsideChart: React.FC<UpsideChartProps> = ({ 
  ticker, 
  currentPrice, 
  grahamFairPrice, 
  bazinCeilingPrice 
}) => {
  // Generate sensitivity data: How upside changes if price moves
  const data = useMemo(() => {
    const points: { label: string; price: number; graham: number | null; bazin: number | null; isCurrent: boolean }[] = [];
    if (currentPrice <= 0) return points;
    // Corrigido: o passo em casas decimais gerava o rótulo "-0%" e a linha "Preço atual" sumia.
    for (let step = -30; step <= 30; step += 5) {
      const price = currentPrice * (1 + step / 100);
      points.push({
        label: `${step > 0 ? '+' : ''}${step}%`,
        price: Number(safeToFixed(price, 2)),
        graham: grahamFairPrice > 0 ? Number(safeToFixed(((grahamFairPrice / price) - 1) * 100, 1)) : null,
        bazin: bazinCeilingPrice > 0 ? Number(safeToFixed(((bazinCeilingPrice / price) - 1) * 100, 1)) : null,
        isCurrent: step === 0,
      });
    }
    return points;
  }, [currentPrice, grahamFairPrice, bazinCeilingPrice]);

  return (
    <div className="bg-white data-grid-border p-6 rounded-lg shadow-sm mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="font-serif italic text-xl">Sensibilidade de Upside</h3>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
            Projeção de Retorno vs Variação de Preço
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: CHART.graham }} />
            <span className="text-[10px] font-mono uppercase">Graham</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: CHART.bazin }} />
            <span className="text-[10px] font-mono uppercase">Bazin</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <defs>
              <linearGradient id="colorGraham" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART.graham} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={CHART.graham} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
            <XAxis 
              dataKey="label" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: CHART.axis }}
            >
              <Label 
                value="Variação de Preço do Ativo (%)" 
                offset={-20} 
                position="insideBottom" 
                style={{ fill: CHART.axis, fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
            </XAxis>
            <YAxis 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: CHART.axis }}
              unit="%"
            >
              <Label 
                value="Potencial de Upside (%)" 
                angle={-90} 
                position="insideLeft" 
                offset={10}
                style={{ fill: CHART.axis, fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
            </YAxis>
            <Tooltip 
              contentStyle={tooltipStyle}
              labelStyle={{ color: CHART.axis, marginBottom: '4px' }}
              formatter={(value: any, name: any) => [`${value}%`, name === 'graham' ? 'Até o preço justo (Graham)' : 'Até o preço teto (Bazin)']}
              labelFormatter={(label) => `Variação de Preço: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="graham" 
              stroke={CHART.graham} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorGraham)" 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="bazin" 
              stroke={CHART.bazin} 
              strokeWidth={2} 
              strokeDasharray="5 5"
              dot={false}
            />
            <ReferenceLine x="0%" stroke={CHART.price} strokeWidth={1} label={{ value: 'PREÇO ATUAL', position: 'top', fontSize: 10, fill: CHART.price, fontWeight: 'bold' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-zinc-400 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed italic">
          Este gráfico mostra como o seu potencial de lucro (Upside) muda conforme o preço da ação oscila. 
          A linha azul representa Graham e a tracejada verde, Bazin. Se o preço cair 10%, seu upside sobe para 
          <span className="font-bold text-emerald-600"> {currentPrice > 0 ? safeToFixed(((grahamFairPrice / (currentPrice * 0.9)) - 1) * 100, 1) : "0.0"}%</span>.
        </p>
      </div>
    </div>
  );
};
