/**
 * Backup e restauração dos dados do app (conta, carteira, alertas e preferências).
 * Os dados ficam no navegador, ligados ao ENDEREÇO do site: ao mudar de endereço
 * (ex.: Netlify → Vercel), exporte no endereço antigo e importe no novo.
 */
export const BACKUP_KEYS = [
  'valorize_users_database',   // contas locais (senhas só como hash)
  'valorize_active_user_id',   // conta conectada
  'valorize_portfolio',        // carteira e alertas
  'valorize_recent_searches',
  'valorize_current_stock',
  'valorize_theme',
  'valorize_tab',
  'valorize_bazin_mode',
] as const;

export interface ValorizeBackup {
  app: 'valorize';
  version: 1;
  exportedAt: string;
  data: Partial<Record<(typeof BACKUP_KEYS)[number], string>>;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB: muito acima de uma carteira real

export function createBackup(storage: Pick<Storage, 'getItem'> = localStorage, now = new Date()): ValorizeBackup {
  const data: ValorizeBackup['data'] = {};
  for (const k of BACKUP_KEYS) {
    const v = storage.getItem(k);
    if (v != null) data[k] = v;
  }
  return { app: 'valorize', version: 1, exportedAt: now.toISOString(), data };
}

/** Lê e valida um arquivo de backup. Lança erro com mensagem amigável se for inválido. */
export function parseBackup(text: string): ValorizeBackup {
  if (text.length > MAX_SIZE) throw new Error('Arquivo grande demais para ser um backup do Valorize.');
  let obj: any;
  try { obj = JSON.parse(text); } catch { throw new Error('O arquivo não é um backup válido (não é JSON).'); }
  if (!obj || obj.app !== 'valorize' || obj.version !== 1 || typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('Este arquivo não é um backup do Valorize.');
  }
  const data: ValorizeBackup['data'] = {};
  for (const k of BACKUP_KEYS) {
    const v = obj.data[k];
    if (v == null) continue;
    if (typeof v !== 'string') throw new Error(`Backup corrompido (campo ${k}).`);
    // Tudo, exceto textos simples (tema/aba/base), precisa ser JSON válido
    if (!['valorize_theme', 'valorize_tab', 'valorize_bazin_mode', 'valorize_active_user_id'].includes(k)) {
      try { JSON.parse(v); } catch { throw new Error(`Backup corrompido (campo ${k}).`); }
    }
    data[k] = v;
  }
  if (!Object.keys(data).length) throw new Error('O backup está vazio.');
  return { app: 'valorize', version: 1, exportedAt: String(obj.exportedAt || ''), data };
}

/** Grava o backup no armazenamento (substitui os dados atuais dessas chaves). */
export function restoreBackup(backup: ValorizeBackup, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage) {
  for (const k of BACKUP_KEYS) {
    const v = backup.data[k];
    if (v != null) storage.setItem(k, v);
    else storage.removeItem(k);
  }
}

/** Resumo para mostrar antes de confirmar a importação. */
export function describeBackup(b: ValorizeBackup) {
  const safe = <T,>(k: (typeof BACKUP_KEYS)[number], d: T): T => { try { return b.data[k] ? JSON.parse(b.data[k]!) : d; } catch { return d; } };
  const portfolio = safe<unknown[]>('valorize_portfolio', []);
  const users = safe<{ isDemo?: boolean }[]>('valorize_users_database', []);
  return {
    positions: Array.isArray(portfolio) ? portfolio.length : 0,
    accounts: Array.isArray(users) ? users.filter(u => !u?.isDemo).length : 0,
    exportedAt: b.exportedAt ? new Date(b.exportedAt) : null,
  };
}

/* ------------------ Importar carteira da planilha (CSV/Excel) ------------------ */
export interface CsvPosition { ticker: string; quantity: number; purchasePrice: number }

const parsePtNumber = (s: string) => {
  const t = s.replace(/R\$|\s/g, '');
  // "1.234,56" → 1234.56 ; "35,2" → 35.2 ; "35.2" → 35.2
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Lê a planilha exportada pela tela Carteira (botão "Excel"): separador ";", vírgula decimal.
 * Colunas usadas: Ticker, Quantidade e "Preço médio R$".
 */
export function parsePortfolioCsv(text: string): CsvPosition[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('A planilha está vazia.');
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const iT = head.findIndex(h => h === 'ticker');
  const iQ = head.findIndex(h => h.startsWith('quantidade'));
  const iP = head.findIndex(h => h.startsWith('preço médio') || h.startsWith('preco medio'));
  if (iT < 0 || iQ < 0 || iP < 0) {
    throw new Error('Planilha sem as colunas Ticker, Quantidade e Preço médio. Use o arquivo do botão "Excel" da Carteira.');
  }
  const out: CsvPosition[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
    const ticker = (c[iT] || '').toUpperCase();
    const quantity = parsePtNumber(c[iQ] || '');
    const purchasePrice = parsePtNumber(c[iP] || '');
    if (!/^[A-Z]{4}\d{1,2}[A-Z]?$/.test(ticker) || !(quantity > 0) || !(purchasePrice > 0)) continue;
    out.push({ ticker, quantity, purchasePrice });
  }
  if (!out.length) throw new Error('Nenhuma posição válida encontrada na planilha.');
  return out;
}

/**
 * Junta as posições da planilha à carteira salva (mesmo ticker: a planilha substitui).
 * Atualiza também a conta conectada, para a carteira não "voltar" no próximo login.
 */
export function importPortfolioPositions(positions: CsvPosition[], storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  const read = <T,>(k: string, d: T): T => { try { const v = storage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const merge = (current: any[]) => {
    const list = Array.isArray(current) ? current.filter(p => !positions.some(n => n.ticker === p?.ticker)) : [];
    return [...list, ...positions.map(p => ({ ...p, addedAt: Date.now() }))];
  };
  storage.setItem('valorize_portfolio', JSON.stringify(merge(read('valorize_portfolio', []))));
  const userId = storage.getItem('valorize_active_user_id');
  if (userId) {
    const users = read<any[]>('valorize_users_database', []);
    if (Array.isArray(users) && users.some(u => u?.id === userId)) {
      storage.setItem('valorize_users_database', JSON.stringify(users.map(u => (u?.id === userId ? { ...u, portfolio: merge(u.portfolio) } : u))));
    }
  }
}
