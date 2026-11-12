import React, { useState } from 'react';
import { History, Search, Pin, Trash2, Copy, Check, X, FileDown, Sparkles } from 'lucide-react';
import { DictationNote, DictationMode } from '../types';
import { soundEffects } from '../utils/audio';
import { copyToClipboard } from '../utils/clipboard';
import { exportDocumentToPDF } from '../utils/pdfExport';
import { saveOrShareFile } from '../lib/native';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: DictationNote[];
  onSelectNote: (note: DictationNote) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DictationMode | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotes = notes.filter((n) => {
    const matchesFilter = selectedFilter === 'all' || n.mode === selectedFilter;
    const matchesSearch =
      n.refinedText.toLowerCase().includes(search.toLowerCase()) ||
      n.rawText.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort pinned first, then newest
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });

  const handleCopy = async (id: string, text: string) => {
    await copyToClipboard(text);
    soundEffects.playSuccessSound();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    const content = notes
      .map(
        (n) =>
          `# ${new Date(n.timestamp).toLocaleString()} (${n.mode.toUpperCase()})\n\n${n.refinedText}\n\n---\n*Fala bruta:* ${n.rawText}\n*Vícios removidos:* ${n.fillerWordsRemoved.join(', ') || 'Nenhum'}\n`
      )
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    saveOrShareFile(blob, `dicta-historico-${Date.now()}.md`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <History className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">
              Histórico de Voz ({notes.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
                title="Exportar Markdown"
              >
                <FileDown className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="p-4 space-y-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nas anotações de voz..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {(['all', 'casual', 'email', 'bullet', 'verbatim', 'social'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedFilter(mode)}
                className={`px-2.5 py-1 rounded-lg border transition-all uppercase font-medium ${
                  selectedFilter === mode
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'all' ? 'Todos' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Nenhuma anotação de voz encontrada.
            </div>
          ) : (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  onSelectNote(note);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                  note.isPinned
                    ? 'bg-purple-950/20 border-purple-800/40 hover:border-purple-600'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-purple-400">
                      {note.mode}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTogglePin(note.id)}
                      className={`p-1 rounded-md text-xs transition-colors ${
                        note.isPinned ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                      title={note.isPinned ? 'Desafixar' : 'Fixar no topo'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopy(note.id, note.refinedText)}
                      className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 transition-colors"
                      title="Copiar"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        exportDocumentToPDF({
                          refinedText: note.refinedText,
                          rawText: note.rawText,
                          mode: note.mode,
                          detectedLanguage: note.detectedLanguage,
                          fillerWordsRemoved: note.fillerWordsRemoved,
                        })
                      }
                      className="p-1 rounded-md text-zinc-600 hover:text-purple-400 transition-colors"
                      title="Baixar como PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1 rounded-md text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-200 line-clamp-3 leading-relaxed mb-2">
                  {note.refinedText}
                </p>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/40">
                  <span>{note.wordCount} palavras</span>
                  {note.fillerWordsRemoved.length > 0 && (
                    <span className="text-purple-400">
                      -{note.fillerWordsRemoved.length} fillers
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
