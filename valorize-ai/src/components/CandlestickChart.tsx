import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { HistoricalPoint } from '../types';

interface CandlestickChartProps {
  data: HistoricalPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = (data.close || 0) >= (data.open || 0);
    
    return (
      <div className="bg-[#18181b] p-3 rounded-lg border border-zinc-800 shadow-xl font-mono text-[10px]">
        <p className="text-zinc-400 mb-2 uppercase tracking-widest font-bold">Ano {label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">FECHAMENTO:</span>
            <span className={isUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              R$ {data.close?.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">ABERTURA:</span>
            <span className="text-zinc-300">R$ {data.open?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-800 pt-1 mt-1">
            <span className="text-zinc-500">MÁXIMA:</span>
            <span className="text-zinc-300">R$ {data.high?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">MÍNIMA:</span>
            <span className="text-zinc-300">R$ {data.low?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CandlestickShape = (props: any) => {
  const {
    fill,
    x,
    y,
    width,
    height,
    payload,
  } = props;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';

  // Calculate coordinates
  // y and height provided by Recharts are for the 'body' [open, close]
  // We need to map high and low to the same coordinate system
  
  // Recharts provides 'y' as the top of the bar and 'height' as the length
  // For [open, close], if open > close (down), y is close, height is open - close
  // If close > open (up), y is open, height is close - open
  
  // However, we can use the internal Recharts math or just calculate from props
  // height = Math.abs(open - close) * scale
  // We need the scale. Recharts passes 'y' and 'height'.
  
  const diff = Math.abs(open - close) || 0.01;
  const ratio = height / diff;
  const wickTop = y - (isUp ? (high - close) : (high - open)) * ratio;
  const wickBottom = y + (isUp ? (open - low) : (close - low)) * ratio;
  const centerX = x + width / 2;

  return (
    <g>
      {/* Wick */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={2}
      />
    </g>
  );
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ data }) => {
  const validData = data.filter(d => 
    d.open !== undefined && 
    d.close !== undefined && 
    d.high !== undefined && 
    d.low !== undefined &&
    d.open !== 0
  );

  if (validData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50 rounded-lg border border-zinc-100 p-8">
        <p className="text-xs text-zinc-400 italic text-center">
          Dados históricos de preço não disponíveis para este ativo no momento.
        </p>
      </div>
    );
  }

  // Pre-process for Recharts Bar [min, max]
  const chartData = validData.map(d => ({
    ...d,
    range: [d.open, d.close]
  }));

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 30, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="year" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            domain={['auto', 'auto']}
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fill: '#a1a1aa' }}
            tickFormatter={(value) => `R$${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
          <Bar
            dataKey="range"
            shape={<CandlestickShape />}
            barSize={24}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
