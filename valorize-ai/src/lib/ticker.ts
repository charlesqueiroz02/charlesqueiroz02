/**
 * Códigos de negociação da B3: 4 letras + 1 ou 2 dígitos, com sufixo opcional
 * (ex.: PETR4, TAEE11, AURA33, PETR4F para fracionário). Usado no app e no servidor.
 */
export const TICKER_RE = /^[A-Z]{4}\d{1,2}[A-Z]?$/;

/** Limpa o texto digitado (espaços, minúsculas, sufixo .SA do Yahoo). */
export function normalizeTicker(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/\.SA$/, '');
}

export function isValidTicker(raw: unknown): boolean {
  return TICKER_RE.test(normalizeTicker(raw));
}
