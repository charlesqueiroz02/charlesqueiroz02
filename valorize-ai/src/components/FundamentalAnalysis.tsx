import React, { useMemo } from 'react';
import { BookOpen, Target, Landmark, Coins, BarChart2, TrendingUp, Info } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { StockData } from '../types';
import { CandlestickChart } from './CandlestickChart';

interface FundamentalAnalysisProps {
  stockData: StockData;
  isLoading?: boolean;
}

const TrendChart: React.FC<{ 
  data: any[], 
  dataKey: string, 
  title: string, 
  color: string, 
  unit?: string 
}> = ({ data, dataKey, title, color, unit = "" }) => (
  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
    <h5 className="text-[10px] font-bold uppercase text-zinc-500 mb-4">{title}</h5>
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis 
            dataKey="year" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fill: '#a1a1aa' }}
          />
          <YAxis 
            hide 
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              fontSize: '10px', 
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              fontFamily: 'monospace'
            }}
            formatter={(value: number) => [`${value}${unit}`, title]}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2} 
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const safeToFixed = (val: any, decimals: number = 2): string => {
  const num = Number(val);
  if (val === undefined || val === null || isNaN(num) || !isFinite(num)) {
    return "0.00";
  }
  return num.toFixed(decimals);
};

export const FundamentalAnalysis: React.FC<FundamentalAnalysisProps> = ({ stockData, isLoading }) => {
  const sectorData = stockData.sector;

  const pl = stockData.lpa > 0 ? stockData.currentPrice / stockData.lpa : 0;
  const pvp = stockData.vpa > 0 ? stockData.currentPrice / stockData.vpa : 0;
  const dy = stockData.currentPrice > 0 ? (stockData.dividends / stockData.currentPrice) * 100 : 0;

  const chartData = useMemo(() => {
    if (!sectorData) return [];
    return [
      { name: 'P/L', 'Ação': Number(safeToFixed(pl)), 'Setor': Number(safeToFixed(sectorData.avgPL)) },
      { name: 'P/VP', 'Ação': Number(safeToFixed(pvp)), 'Setor': Number(safeToFixed(sectorData.avgPVP)) },
      { name: 'DY (%)', 'Ação': Number(safeToFixed(dy)), 'Setor': Number(safeToFixed(sectorData.avgDY)) }
    ];
  }, [pl, pvp, dy, sectorData]);

  const indicators = [
    {
      label: "P/L (Preço / Lucro)",
      value: safeToFixed(pl),
      sectorValue: sectorData ? safeToFixed(sectorData.avgPL) : undefined,
      icon: <Target className="w-4 h-4 text-blue-500" />,
      explanation: "Indica em quantos anos você recuperaria seu investimento através dos lucros da empresa. Um P/L de 10 significa que levaria 10 anos.",
      layman: "É o 'tempo de retorno'. Se fosse uma padaria, em quanto tempo o lucro dela pagaria o valor que você deu nela.",
      isBetter: pl > 0 && sectorData && typeof sectorData.avgPL === 'number' ? pl < sectorData.avgPL : null
    },
    {
      label: "P/VP (Preço / Valor Patrimonial)",
      value: safeToFixed(pvp),
      sectorValue: sectorData ? safeToFixed(sectorData.avgPVP) : undefined,
      icon: <Landmark className="w-4 h-4 text-purple-500" />,
      explanation: "Compara o preço da ação com o valor real dos bens da empresa (prédios, máquinas, caixa).",
      layman: "Se o P/VP for 0,80, é como se você comprasse uma nota de R$ 1,00 pagando apenas R$ 0,80. Se for 2,0, você está pagando o dobro do que a empresa vale fisicamente.",
      isBetter: pvp > 0 && sectorData && typeof sectorData.avgPVP === 'number' ? pvp < sectorData.avgPVP : null
    },
    {
      label: "Dividend Yield (DY)",
      value: `${safeToFixed(dy)}%`,
      sectorValue: sectorData ? `${safeToFixed(sectorData.avgDY)}%` : null,
      icon: <Coins className="w-4 h-4 text-emerald-500" />,
      explanation: "A porcentagem do preço da ação que foi distribuída aos acionistas em forma de dinheiro no último ano.",
      layman: "É o seu 'aluguel'. Se você investir R$ 1.000 e o DY for 10%, você recebeu R$ 100 de volta na conta sem precisar vender a ação.",
      isBetter: sectorData && typeof sectorData.avgDY === 'number' ? dy > sectorData.avgDY : null
    }
  ];

  const basics = [
    {
      label: "LPA (Lucro por Ação)",
      value: `R$ ${safeToFixed(stockData.lpa)}`,
      desc: "Quanto de lucro a empresa gerou para cada pedacinho (ação) dela.",
      layman: "Imagine que a empresa é uma pizza. O LPA é quanto de 'recheio' (lucro) tem em cada fatia."
    },
    {
      label: "VPA (Valor Patrimonial por Ação)",
      value: `R$ ${safeToFixed(stockData.vpa)}`,
      desc: "O valor contábil de cada ação baseado no patrimônio líquido.",
      layman: "Se a empresa fechasse as portas hoje, vendesse tudo e pagasse as dívidas, esse é o valor que cada fatia (ação) receberia."
    }
  ];

  return (
    <div className="bg-white data-grid-border p-6 rounded-lg shadow-sm mt-8">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-zinc-900" />
          <h3 className="font-serif italic text-xl">Raio-X Fundamentalista</h3>
        </div>
        {sectorData ? (
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-full">
            <BarChart2 className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-mono uppercase text-zinc-600">Setor: {sectorData.sectorName}</span>
          </div>
        ) : isLoading && (
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Buscando Médias Setoriais...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {indicators.map((item, idx) => (
          <div key={idx} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 group hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="col-header text-[10px]">{item.label}</span>
              </div>
            </div>
            
            <div className="flex items-baseline gap-4 mb-3">
              <div className="data-value text-2xl font-bold">{item.value}</div>
              {item.sectorValue && (
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-zinc-400 font-bold">Média Setor</span>
                  <div className={`text-[11px] font-mono font-bold ${
                    item.isBetter === true ? 'text-emerald-600' : 
                    item.isBetter === false ? 'text-amber-600' : 'text-zinc-500'
                  }`}>
                    {item.sectorValue}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 leading-tight">
                <span className="font-bold text-zinc-700 uppercase">O que é:</span> {item.explanation}
              </p>
              <p className="text-[10px] text-emerald-700 leading-tight bg-emerald-50 p-2 rounded border border-emerald-100">
                <span className="font-bold uppercase">Em termos simples:</span> {item.layman}
              </p>
            </div>
          </div>
        ))}
      </div>

      {sectorData && (
        <div className="mb-8 bg-zinc-50 p-6 rounded-xl border border-zinc-100">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
            <BarChart2 className="w-3 h-3" />
            Comparativo Visual: Ação vs. Setor
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#71717a' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', paddingBottom: '20px' }}
                />
                <Bar 
                  dataKey="Ação" 
                  fill="#18181b" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
                <Bar 
                  dataKey="Setor" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[10px] text-zinc-400 italic text-center">
            * O gráfico compara os indicadores da ação atual com a média das empresas do mesmo setor ({sectorData.sectorName}).
          </p>
        </div>
      )}

      {stockData.historicalData && stockData.historicalData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Histórico de Preços (Candlestick Anual)
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Alta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-rose-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Baixa</span>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-100 h-80">
            <CandlestickChart data={stockData.historicalData} />
          </div>
          <p className="mt-3 text-[9px] text-zinc-400 italic text-center uppercase tracking-tighter">
            * Cada vela (candle) representa a variação de preço entre Janeiro (Abertura) e Dezembro (Fechamento) de cada ano.
          </p>
        </div>
      )}

      {stockData.historicalData && stockData.historicalData.length > 0 && (
        <div className="mb-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            Tendências Históricas (5 Anos)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrendChart 
              data={stockData.historicalData} 
              dataKey="pl" 
              title="P/L Histórico" 
              color="#3b82f6" 
            />
            <TrendChart 
              data={stockData.historicalData} 
              dataKey="pvp" 
              title="P/VP Histórico" 
              color="#a855f7" 
            />
            <TrendChart 
              data={stockData.historicalData} 
              dataKey="dy" 
              title="DY Histórico (%)" 
              color="#10b981"
              unit="%"
            />
          </div>
        </div>
      )}

      <div className="bg-zinc-900 text-white p-6 rounded-xl">
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          Entendendo a Base (LPA e VPA)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {basics.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="font-serif italic text-lg text-emerald-400">{item.label}</span>
                <span className="font-mono font-bold text-xl">{item.value}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {item.desc}
              </p>
              <p className="text-[11px] text-zinc-300 italic bg-white/5 p-3 rounded-lg border border-white/5">
                💡 {item.layman}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
        <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">Dica para o Leigo:</span> Não olhe apenas um indicador. Uma ação com P/L baixo pode estar barata ou pode estar com problemas sérios. Use o <span className="italic">Analista IA</span> acima para entender o contexto por trás desses números!
        </p>
      </div>
    </div>
  );
};
