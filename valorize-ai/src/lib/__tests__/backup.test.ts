import { describe, it, expect } from 'vitest';
import { createBackup, parseBackup, restoreBackup, describeBackup } from '../backup';

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

describe('backup', () => {
  const origem = mem({
    valorize_portfolio: JSON.stringify([{ ticker: 'TAEE11', quantity: 80, purchasePrice: 35.2, addedAt: 1 }]),
    valorize_users_database: JSON.stringify([{ id: 'u1', profile: {} }, { id: 'd', isDemo: true, profile: {} }]),
    valorize_theme: 'dark',
    stock_cache_PETR4: '{"x":1}', // cache não entra no backup
  });

  it('exporta só os dados do usuário (sem cache) e reimporta igual', () => {
    const b = createBackup(origem, new Date('2026-11-15T10:00:00Z'));
    expect(Object.keys(b.data).sort()).toEqual(['valorize_portfolio', 'valorize_theme', 'valorize_users_database']);
    const destino = mem({ valorize_portfolio: '[]', valorize_tab: 'radar' });
    restoreBackup(parseBackup(JSON.stringify(b)), destino);
    expect(destino.m.get('valorize_portfolio')).toBe(origem.getItem('valorize_portfolio'));
    expect(destino.m.get('valorize_theme')).toBe('dark');
    expect(destino.m.has('valorize_tab')).toBe(false); // substitui: o que não veio no backup é limpo
  });

  it('resume carteira e contas (sem contar demos)', () => {
    const d = describeBackup(createBackup(origem));
    expect(d.positions).toBe(1);
    expect(d.accounts).toBe(1);
  });

  it('rejeita arquivos inválidos com mensagem clara', () => {
    expect(() => parseBackup('isto não é json')).toThrow(/não é um backup válido/);
    expect(() => parseBackup('{"app":"outro","version":1,"data":{}}')).toThrow(/não é um backup do Valorize/);
    expect(() => parseBackup('{"app":"valorize","version":1,"data":{"valorize_portfolio":"{quebrado"}}')).toThrow(/corrompido/);
    expect(() => parseBackup('{"app":"valorize","version":1,"data":{}}')).toThrow(/vazio/);
  });

  it('ignora chaves desconhecidas (não grava nada fora do app)', () => {
    const b = parseBackup(JSON.stringify({ app: 'valorize', version: 1, data: { valorize_theme: 'light', outra_chave: 'x' } }));
    expect(Object.keys(b.data)).toEqual(['valorize_theme']);
  });
});

import { parsePortfolioCsv, importPortfolioPositions } from '../backup';

describe('importar carteira da planilha', () => {
  const csv = '﻿Ticker;Quantidade;Preço médio R$;Cotação R$\r\nBBAS3;150;21,5;22,1\r\nTAEE11;80;35,2;35,8\r\nlixo;x;y;z\r\n';

  it('lê o arquivo do botão Excel da Carteira (; e vírgula decimal)', () => {
    expect(parsePortfolioCsv(csv)).toEqual([
      { ticker: 'BBAS3', quantity: 150, purchasePrice: 21.5 },
      { ticker: 'TAEE11', quantity: 80, purchasePrice: 35.2 },
    ]);
  });

  it('avisa quando faltam colunas', () => {
    expect(() => parsePortfolioCsv('a;b\n1;2')).toThrow(/Ticker, Quantidade e Preço médio/);
  });

  it('junta à carteira atual e atualiza a conta conectada', () => {
    const m = new Map<string, string>([
      ['valorize_portfolio', JSON.stringify([{ ticker: 'BBAS3', quantity: 1, purchasePrice: 10 }, { ticker: 'VALE3', quantity: 5, purchasePrice: 60 }])],
      ['valorize_active_user_id', 'u1'],
      ['valorize_users_database', JSON.stringify([{ id: 'u1', portfolio: [] }])],
    ]);
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    importPortfolioPositions(parsePortfolioCsv(csv), st);
    const p = JSON.parse(m.get('valorize_portfolio')!);
    expect(p.map((x: any) => x.ticker).sort()).toEqual(['BBAS3', 'TAEE11', 'VALE3']);
    expect(p.find((x: any) => x.ticker === 'BBAS3').quantity).toBe(150);
    expect(JSON.parse(m.get('valorize_users_database')!)[0].portfolio).toHaveLength(2);
  });
});
