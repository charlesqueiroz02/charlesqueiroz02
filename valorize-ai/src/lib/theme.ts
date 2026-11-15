import { useEffect, useState } from 'react';
import { readText, writeText } from './storage';

/**
 * Tema do app: 'auto' segue o modo do celular/computador; 'light' e 'dark' fixam.
 * Aplica <html data-theme="light|dark"> e ajusta a cor da barra do navegador.
 */
export type ThemeMode = 'auto' | 'light' | 'dark';
const KEY = 'valorize_theme';
const media = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export const readThemeMode = (): ThemeMode => {
  const v = readText(KEY);
  return v === 'light' || v === 'dark' ? v : 'auto';
};

export const resolveTheme = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'auto' ? (media()?.matches ? 'dark' : 'light') : mode;

export const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#12161a' : '#f6f7f5');
}

/** Estado do tema para o botão do topo; reage à troca de modo do sistema quando em 'auto'. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(readThemeMode()));

  useEffect(() => {
    applyTheme(mode);
    setResolved(resolveTheme(mode));
    writeText(KEY, mode);
    const m = media();
    if (mode !== 'auto' || !m) return;
    const onChange = () => { applyTheme('auto'); setResolved(resolveTheme('auto')); };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [mode]);

  const cycle = () => setMode(m => (m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto'));
  return { mode, resolved, setMode, cycle };
}
