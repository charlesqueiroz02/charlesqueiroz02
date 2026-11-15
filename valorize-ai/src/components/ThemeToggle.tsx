import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../lib/theme';

const LABEL: Record<ThemeMode, string> = { auto: 'Automático', light: 'Claro', dark: 'Escuro' };
const NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' };

/** Botão do topo: alterna Automático → Claro → Escuro. */
export const ThemeToggle: React.FC<{ mode: ThemeMode; onCycle: () => void }> = ({ mode, onCycle }) => {
  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
  return (
    <button
      onClick={onCycle}
      className="flex items-center gap-1.5 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-xs font-semibold"
      title={`Tema: ${LABEL[mode]} (toque para mudar para ${LABEL[NEXT[mode]]})`}
      aria-label={`Tema ${LABEL[mode]}. Mudar para ${LABEL[NEXT[mode]]}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden 2xl:inline">{LABEL[mode]}</span>
    </button>
  );
};
