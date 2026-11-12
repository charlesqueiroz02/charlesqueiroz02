import React, { useState } from 'react';
import { Check, Copy, Volume2, Sparkles, AlertCircle, ArrowRight, FileDown, FileText, Share2, Pencil } from 'lucide-react';
import { nativeShareText } from '../lib/native';
import { speakText, soundEffects } from '../utils/audio';
import { copyToClipboard } from '../utils/clipboard';
import { exportDocumentToPDF } from '../utils/pdfExport';

interface DiffViewerProps {
  rawText: string;
  refinedText: string;
  fillerWordsRemoved: string[];
  detectedLanguage?: string;
  mode?: string;
  onCopy?: () => void;
  onEditText?: (t: string) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  rawText,
  refinedText,
  fillerWordsRemoved,
  detectedLanguage,
  mode = 'geral',
  onEditText,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'refined' | 'diff' | 'raw'>('refined');
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(refinedText);
    soundEffects.playSuccessSound();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!refinedText || !refinedText.trim()) return;
    setIsExportingPDF(true);
    try {
      soundEffects.playSuccessSound();
      exportDocumentToPDF({
        refinedText,
        rawText,
        mode,
        detectedLanguage,
        fillerWordsRemoved,
      });
    } catch (e) {
      console.error('Erro ao exportar PDF:', e);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 800);
    }
  };

  const handlePlayTTS = () => {
    setIsPlayingAudio(true);
    const lang = detectedLanguage?.toLowerCase().includes('en') ? 'en-US' : 'pt-BR';
    speakText(refinedText, lang);
    setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  // Build highlighted raw text marking removed filler words
  const renderHighlightedRaw = () => {
    if (!rawText) return null;
    if (!fillerWordsRemoved || fillerWordsRemoved.length === 0) {
      return <span>{rawText}</span>;
    }

    // Create a regex of filler words to highlight
    const escaped = fillerWordsRemoved
      .filter((w) => w.trim().length > 0)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (escaped.length === 0) return <span>{rawText}</span>;

    const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    const parts = rawText.split(regex);

    return (
      <div className="leading-relaxed">
        {parts.map((part, i) => {
          const isFiller = fillerWordsRemoved.some(
            (f) => f.toLowerCase() === part.toLowerCase()
          );
          if (isFiller) {
            return (
              <span
                key={i}
                className="inline-block bg-rose-500/20 text-rose-300 line-through decoration-rose-500 px-1 py-0.5 rounded mx-0.5 border border-rose-500/30 text-sm font-mono"
                title="Vício de linguagem / filler removido pelo Dicta"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  // Estimate typing time saved (average typing speed is 38 WPM, talking is 150 WPM)
  const words = refinedText.trim() ? refinedText.trim().split(/\s+/).length : 0;
  const typingTimeSeconds = Math.round((words / 38) * 60);
  const speakingTimeSeconds = Math.round((words / 140) * 60);
  const timeSavedSeconds = Math.max(0, typingTimeSeconds - speakingTimeSeconds);

  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl overflow-hidden transition-all">
      {/* Top Bar with Mode Switcher & Stats */}
      <div className="px-4 py-3 bg-zinc-950/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
          <button
            onClick={() => setViewMode('refined')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'refined'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Polido
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'diff'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Comparar ({fillerWordsRemoved.length})
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'raw'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bruto
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handlePlayTTS}
            className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800/80 rounded-lg transition-colors text-xs flex items-center gap-1"
            title="Ouvir leitura em voz alta"
          >
            <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-indigo-400 animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Ouvir</span>
          </button>
          <button
            onClick={() => nativeShareText(refinedText)}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 rounded-lg transition-colors"
            title="Compartilhar (WhatsApp, e-mail...)"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {onEditText && (
            <button
              onClick={() => { setViewMode('refined'); setIsEditing(!isEditing); }}
              className={`p-2 rounded-lg transition-colors ${isEditing ? 'text-purple-300 bg-purple-500/15' : 'text-zinc-400 hover:text-purple-400 hover:bg-zinc-800/80'}`}
              title="Editar texto"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-all border border-zinc-700/60"
            title="Copiar texto refinado"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!refinedText || isExportingPDF}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/40 cursor-pointer"
            title="Baixar texto refinado como documento estruturado em PDF"
          >
            <FileDown className={`w-3.5 h-3.5 ${isExportingPDF ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isExportingPDF ? 'Gerando...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 min-h-[160px] text-zinc-100">
        {viewMode === 'refined' && (
          <div className="space-y-4">
            {isEditing && onEditText ? (
              <textarea
                value={refinedText}
                onChange={(e) => onEditText(e.target.value)}
                rows={Math.min(14, Math.max(4, refinedText.split('\n').length + 2))}
                className="w-full bg-zinc-950 border border-purple-500/40 rounded-xl p-3 text-base leading-relaxed text-zinc-100 focus:outline-none focus:border-purple-400"
                autoFocus
              />
            ) : (
              <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-normal text-zinc-100 selection:bg-purple-500/30">
                {refinedText}
              </div>
            )}
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                As palavras em <strong className="text-rose-400 line-through">vermelho riscado</strong> foram identificadas como hesitações ou vícios de fala removidos automaticamente pelo Dicta.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  Fala Original Capturada
                </span>
                <div className="text-sm text-zinc-300 leading-relaxed">
                  {renderHighlightedRaw()}
                </div>
              </div>

              <div className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-900/30 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                  Resultado Dicta
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />
                </span>
                <div className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {refinedText}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'raw' && (
          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 text-sm font-mono text-zinc-300 whitespace-pre-wrap">
            {rawText || 'Nenhum texto bruto disponível.'}
          </div>
        )}
      </div>

      {/* Footer Metrics Banner */}
      <div className="px-5 py-2.5 bg-zinc-950/40 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-zinc-200">{words}</strong> palavras
          </span>
          <span>•</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            ⚡ ~{timeSavedSeconds}s economizados vs teclado
          </span>
          {fillerWordsRemoved.length > 0 && (
            <>
              <span>•</span>
              <span className="text-purple-400">
                {fillerWordsRemoved.length} fillers eliminados
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {detectedLanguage && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px]">
              {detectedLanguage}
            </span>
          )}
          <button
            onClick={handleExportPDF}
            disabled={!refinedText || isExportingPDF}
            className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar documento PDF estruturado"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
