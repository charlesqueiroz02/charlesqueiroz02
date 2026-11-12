import React, { useState } from 'react';
import { BookOpen, Plus, X, Trash2, Check, Sparkles } from 'lucide-react';
import { useDialog } from '../lib/useDialog';
import { DictionaryItem } from '../types';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DictionaryItem[];
  onAddItem: (term: string, category?: string) => void;
  onRemoveItem: (id: string) => void;
}

const PRESET_PACKS = [
  {
    name: 'Tech & Engenharia',
    terms: ['Kubernetes', 'TypeScript', 'Docker', 'GraphQL', 'Next.js', 'PostgreSQL', 'CI/CD', 'API REST'],
  },
  {
    name: 'Negócios & Startups',
    terms: ['ROI', 'CAC', 'LTV', 'Churn', 'B2B', 'Pitch Deck', 'Product-Market Fit', 'Roadmap'],
  },
  {
    name: 'Português & Nomes Comuns',
    terms: ['São Paulo', 'João Pedro', 'Guilherme', 'WhatsApp', 'PIX', 'Boleto'],
  },
];

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddItem,
  onRemoveItem,
}) => {
  const [newTerm, setNewTerm] = useState('');
  const [duplicate, setDuplicate] = useState('');

  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const term = newTerm.trim();
    if (!term) return;
    if (items.some((i) => i.term.toLowerCase() === term.toLowerCase())) {
      setDuplicate(term);
      return;
    }
    onAddItem(term);
    setNewTerm('');
    setDuplicate('');
  };

  const handleAddPreset = (term: string) => {
    if (!items.some((i) => i.term.toLowerCase() === term.toLowerCase())) {
      onAddItem(term, 'Preset');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dlg-dict" tabIndex={-1} className="focus:outline-none w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 id="dlg-dict" className="font-bold text-zinc-100 text-base">
                Dicionário & Vocabulário Pessoal
              </h3>
              <p className="text-xs text-zinc-400">
                O Dicta reconhecerá perfeitamente esses termos técnicos e nomes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar dicionário"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Add custom term form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Adicionar nome, jargão ou termo (ex: Kubernetes, Dr. Carlos)"
                aria-label="Novo termo do dicionário"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!newTerm.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
            {duplicate && (
              <p role="status" className="text-xs text-amber-300">
                "{duplicate}" já está no dicionário.
              </p>
            )}
          </form>

          {/* Quick preset packs */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Pacotes Rápidos de Termos</span>
            </div>
            <div className="space-y-2">
              {PRESET_PACKS.map((pack, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-2">
                  <span className="text-xs font-medium text-zinc-300">{pack.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {pack.terms.map((term, tIdx) => {
                      const alreadyAdded = items.some(
                        (i) => i.term.toLowerCase() === term.toLowerCase()
                      );
                      return (
                        <button
                          key={tIdx}
                          onClick={() => handleAddPreset(term)}
                          disabled={alreadyAdded}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                            alreadyAdded
                              ? 'bg-purple-950/40 border-purple-800/40 text-purple-300 opacity-60'
                              : 'bg-zinc-900 border-zinc-700/60 text-zinc-300 hover:text-white hover:border-zinc-500'
                          }`}
                        >
                          {alreadyAdded && <Check className="w-3 h-3 text-emerald-400" />}
                          {term}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current saved terms list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Termos Salvos ({items.length})</span>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
                Nenhum termo cadastrado ainda. Adicione termos acima para precisão de 100%!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 group hover:border-purple-500/50 transition-colors"
                  >
                    <span>{item.term}</span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remover" aria-label={`Remover ${item.term}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
