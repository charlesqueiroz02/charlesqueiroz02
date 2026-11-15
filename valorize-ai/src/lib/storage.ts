/**
 * Acesso seguro ao localStorage.
 * O navegador pode bloquear o armazenamento (modo privado, cota cheia) ou o dado
 * pode estar corrompido. Nesses casos devolvemos o valor padrão em vez de derrubar o app.
 */

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cota cheia: libera o cache antigo e tenta uma vez mais.
    pruneCache(0);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento */ }
  }
}

export function writeText(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    pruneCache(0);
    try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ }
  }
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignora */ }
}

/** Prefixos de cache que podem ser apagados sem perder dados do usuário. */
const CACHE_PREFIXES = ['stock_cache_', 'ai_analysis_', 'ai_sources_'];

/**
 * Mantém só os `keep` itens de cache mais recentes por prefixo.
 * Evita que o cache de cotações e análises cresça para sempre.
 */
export function pruneCache(keep = 30): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && CACHE_PREFIXES.some(p => k.startsWith(p))) keys.push(k);
    }
    for (const prefix of CACHE_PREFIXES) {
      const group = keys.filter(k => k.startsWith(prefix));
      if (group.length <= keep) continue;
      // Sem data em todos os itens: removemos os mais antigos pela ordem de recência registrada.
      const order = readJSON<string[]>('valorize_cache_order', []);
      const rank = (k: string) => { const i = order.lastIndexOf(k); return i < 0 ? -1 : i; };
      group.sort((a, b) => rank(a) - rank(b));
      group.slice(0, group.length - keep).forEach(k => localStorage.removeItem(k));
    }
  } catch { /* ignora */ }
}

/** Registra que uma chave de cache foi usada agora (para a limpeza por recência). */
export function touchCache(key: string): void {
  const order = readJSON<string[]>('valorize_cache_order', []).filter(k => k !== key);
  order.push(key);
  try { localStorage.setItem('valorize_cache_order', JSON.stringify(order.slice(-200))); } catch { /* ignora */ }
}
