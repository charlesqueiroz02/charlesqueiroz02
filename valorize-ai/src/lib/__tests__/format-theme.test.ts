import { describe, it, expect, beforeEach } from 'vitest';
import { brl, num, pct } from '../valuation';
import { resolveTheme, readThemeMode } from '../theme';

describe('formato brasileiro', () => {
  it('moeda e números com vírgula decimal', () => {
    expect(brl(11.03).replace(/\s/g, ' ')).toBe('R$ 11,03');
    expect(brl(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(num(12.2, 1)).toBe('12,2');
    expect(pct(5.25, 1)).toBe('+5,3%');
  });
  it('valores inválidos viram zero em vez de "NaN"', () => {
    expect(num(NaN, 2)).toBe('0,00');
    expect(brl(Infinity).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
});

describe('tema', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k), key: () => null, length: 0,
    };
  });
  it('sem escolha salva usa Automático', () => {
    expect(readThemeMode()).toBe('auto');
  });
  it('Claro/Escuro fixos ignoram o sistema', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
  it('Automático segue o modo do sistema', () => {
    (globalThis as any).window = { matchMedia: () => ({ matches: true }) };
    expect(resolveTheme('auto')).toBe('dark');
    (globalThis as any).window = { matchMedia: () => ({ matches: false }) };
    expect(resolveTheme('auto')).toBe('light');
  });
});
