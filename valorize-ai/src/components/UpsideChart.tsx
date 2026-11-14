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
    const points = [];
    const range = 0.3; // +/- 30%
    const basePrice = currentPrice || 1;
    for (let i = -range; i <= range; i += 0.05) {
      const price = basePrice * (1 + i);
      const grahamUpside = price > 0 ? ((grahamFairPrice / price) - 1) * 100 : 0;
      const bazinUpside = price > 0 ? ((bazinCeilingPrice / price) - 1) * 100 : 0;
      points.push({
        label: `${(i * 100).toFixed(0)}%`,
        price: safeToFixed(price, 2),
        graham: safeToFixed(grahamUpside, 1),
        bazin: safeToFixed(bazinUpside, 1),
        isCurrent: Math.abs(i) < 0.01
      });
    }
    return points;
  }, [currentPrice, grahamFairPrice, bazinCeilingPrice]);

  const currentUpsideGraham = ((grahamFairPrice / currentPrice) - 1) * 100;

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
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-mono uppercase">Graham</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-400 rounded-full" />
            <span className="text-[10px] font-mono uppercase">Bazin</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <defs>
              <linearGradient id="colorGraham" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#a1a1aa' }}
            >
              <Label 
                value="Variação de Preço do Ativo (%)" 
                offset={-20} 
                position="insideBottom" 
                style={{ fill: '#71717a', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
            </XAxis>
            <YAxis 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#a1a1aa' }}
              unit="%"
            >
              <Label 
                value="Potencial de Upside (%)" 
                angle={-90} 
                position="insideLeft" 
                offset={10}
                style={{ fill: '#71717a', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
            </YAxis>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: 'none', 
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#71717a', marginBottom: '4px' }}
              formatter={(value: any) => [`${value}%`, 'Upside']}
              labelFormatter={(label) => `Variação de Preço: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="graham" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorGraham)" 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="bazin" 
              stroke="#71717a" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              dot={false}
            />
            <ReferenceLine x="0%" stroke="#000" strokeWidth={1} label={{ value: 'PREÇO ATUAL', position: 'top', fontSize: 9, fill: '#000', fontWeight: 'bold' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-zinc-400 mt-0.5" />
        <p className="text-xs text-zinc-500 leading-relaxed italic">
          Este gráfico mostra como o seu potencial de lucro (Upside) muda conforme o preço da ação oscila. 
          A linha verde representa o método de Graham. Se o preço cair 10%, seu upside sobe para 
          <span className="font-bold text-emerald-600"> {currentPrice > 0 ? safeToFixed(((grahamFairPrice / (currentPrice * 0.9)) - 1) * 100, 1) : "0.0"}%</span>.
        </p>
      </div>
    </div>
  );
};
