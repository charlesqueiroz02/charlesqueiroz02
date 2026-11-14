import { describe, it, expect, beforeEach } from 'vitest';
import { isValidTicker, normalizeTicker } from '../ticker';
import { hashPassword, verifyPassword, isHashed } from '../password';
import { escapeRegExp } from '../utils';
import { readJSON, writeJSON, pruneCache, touchCache } from '../storage';

describe('ticker', () => {
  it('aceita códigos da B3', () => {
    ['PETR4', 'TAEE11', 'aura33', ' vale3.sa ', 'PETR4F'].forEach(t => expect(isValidTicker(t)).toBe(true));
  });
  it('rejeita entradas perigosas ou fora do padrão', () => {
    ['PETR(', '../etc', 'PE', 'PETR123', 'PETR4;DROP', ''].forEach(t => expect(isValidTicker(t)).toBe(false));
    expect(normalizeTicker(' vale3.sa ')).toBe('VALE3');
  });
});

describe('escapeRegExp', () => {
  it('impede que "(" quebre a busca', () => {
    expect(() => new RegExp(`(${escapeRegExp('PETR(')})`, 'gi')).not.toThrow();
    expect('ação PETR( teste'.split(new RegExp(`(${escapeRegExp('PETR(')})`, 'gi'))).toContain('PETR(');
  });
});

describe('senha', () => {
  it('gera hash com sal e confere', async () => {
    const a = await hashPassword('segredo1');
    const b = await hashPassword('segredo1');
    expect(isHashed(a)).toBe(true);
    expect(a).not.toBe(b); // sal aleatório
    expect(await verifyPassword('segredo1', a)).toBe(true);
    expect(await verifyPassword('outra', a)).toBe(false);
  });
  it('senha vazia nunca entra', async () => {
    expect(await verifyPassword('', await hashPassword('x123456'))).toBe(false);
    expect(await verifyPassword('', '')).toBe(false);
    expect(await verifyPassword('abc', undefined)).toBe(false);
  });
});

// localStorage mínimo em memória para os testes
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('storage seguro', () => {
  beforeEach(() => { (globalThis as any).localStorage = new MemoryStorage(); });

  it('dado corrompido devolve o padrão em vez de quebrar', () => {
    localStorage.setItem('x', '{quebrado');
    expect(readJSON('x', [1])).toEqual([1]);
    writeJSON('y', { a: 1 });
    expect(readJSON('y', null)).toEqual({ a: 1 });
  });

  it('pruneCache mantém só os mais recentes', () => {
    for (let i = 0; i < 5; i++) { localStorage.setItem(`stock_cache_T${i}`, '{}'); touchCache(`stock_cache_T${i}`); }
    localStorage.setItem('valorize_portfolio', '[]');
    pruneCache(2);
    expect(localStorage.getItem('stock_cache_T4')).not.toBeNull();
    expect(localStorage.getItem('stock_cache_T3')).not.toBeNull();
    expect(localStorage.getItem('stock_cache_T0')).toBeNull();
    expect(localStorage.getItem('valorize_portfolio')).toBe('[]'); // dados do usuário nunca são apagados
  });
});
