import React, { useState, useEffect } from 'react';
import { Brain, Loader2, Sparkles, Newspaper, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { StockData } from '../types';
import { readJSON, readText, writeJSON, writeText, touchCache, pruneCache } from '../lib/storage';

interface AIAnalystProps {
  stockData: StockData;
  isLoading?: boolean;
}

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ stockData, isLoading }) => {
  const [analysis, setAnalysis] = useState<string | null>(() => readText(`ai_analysis_${stockData.ticker}`));
  const [sources, setSources] = useState<GroundingChunk[]>(() => readJSON<GroundingChunk[]>(`ai_sources_${stockData.ticker}`, []));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnalysis(readText(`ai_analysis_${stockData.ticker}`));
    const savedSources = readJSON<GroundingChunk[]>(`ai_sources_${stockData.ticker}`, []);
    setSources(Array.isArray(savedSources) ? savedSources : []);
  }, [stockData.ticker]);

  useEffect(() => {
    if (analysis) {
      writeText(`ai_analysis_${stockData.ticker}`, analysis);
      touchCache(`ai_analysis_${stockData.ticker}`);
      pruneCache();
    }
    if (sources.length > 0) {
      writeJSON(`ai_sources_${stockData.ticker}`, sources);
      touchCache(`ai_sources_${stockData.ticker}`);
    }
  }, [analysis, sources, stockData.ticker]);

  const analyzeStock = async () => {
    if (!stockData.ticker) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: stockData.ticker,
          companyName: stockData.companyName,
          currentPrice: stockData.currentPrice,
          lpa: stockData.lpa,
          vpa: stockData.vpa,
          dividends: stockData.dividends,
          avgDividends5y: stockData.avgDividends5y
        })
      });

      if (!response.ok) {
        throw new Error("Erro na resposta do servidor.");
      }

      const data = await response.json();
      setAnalysis(data.analysis || "Não foi possível gerar a análise.");
      setSources(data.sources || []);
    } catch (error) {
      console.error("AI Analysis error:", error);
      setAnalysis("Não foi possível carregar a análise da IA no momento. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white data-grid-border rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Brain className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl">Analista IA: Explicado de Forma Simples</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
              Entenda o que está acontecendo com a empresa
            </p>
          </div>
        </div>
        <button
          onClick={analyzeStock}
          disabled={loading || !stockData.ticker}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-all shadow-lg hover:shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {analysis ? 'Atualizar Análise' : 'Gerar Insights Estratégicos'}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none text-zinc-700 leading-relaxed font-sans">
            {analysis.split('\n').filter(p => p.trim()).map((para, i) => {
              const isHeader = para.toUpperCase() === para && para.length < 50;
              const Element = isHeader ? 'div' : 'p';
              return (
                <Element key={i} className={`${isHeader ? 'font-bold text-zinc-900 mt-6 mb-2 text-xs uppercase tracking-wider flex items-center gap-2' : 'mb-3 text-sm'}`}>
                  {isHeader && <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />}
                  {para}
                </Element>
              );
            })}
          </div>

          {sources.length > 0 && (
            <div className="pt-6 border-t border-zinc-100">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <Newspaper className="w-3 h-3" />
                Fontes e Notícias Recentes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.map((source, idx) => source.web && (
                  <a 
                    key={idx}
                    href={source.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-zinc-50 rounded border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group"
                  >
                    <span className="text-[10px] text-zinc-600 truncate max-w-[200px] font-medium">
                      {source.web.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-emerald-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (isLoading || stockData.quickSummary) ? (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Resumo Instantâneo</span>
            </div>
            {isLoading && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />}
          </div>
          {stockData.quickSummary ? (
            <p className="text-sm text-emerald-900 italic font-medium leading-relaxed">"{stockData.quickSummary}"</p>
          ) : (
            <div className="h-4 bg-emerald-100 animate-pulse rounded w-3/4" />
          )}
          <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
            <Brain className="w-2.5 h-2.5" />
            Clique no botão acima para uma análise completa de 1ª mão.
          </p>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50/50">
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-zinc-500 text-sm font-medium">
              Pronto para ir além dos números?
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Clique para buscar notícias recentes, fatos relevantes e análise de gestão para {stockData.ticker || 'sua ação'}.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[9px] font-bold uppercase text-zinc-500">Qualidade</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-[9px] font-bold uppercase text-zinc-500">Riscos</span>
        </div>
        <div className="ml-auto text-[9px] text-zinc-400 italic">
          Grounding via Google Search Ativo
        </div>
      </div>
    </div>
  );
};
