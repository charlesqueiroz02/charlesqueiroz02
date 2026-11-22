import { useSyncExternalStore } from 'react';
import type { DB, User } from '../types';
import { DB_VERSION, buildSeed } from './seed';

/**
 * Armazenamento do MODO DEMONSTRAÇÃO: os dados ficam somente neste navegador
 * (localStorage). A camada de ações (actions.ts) reproduz as regras de
 * autorização que, em produção, são aplicadas pelo banco (RLS do Supabase).
 */
const KEY = 'talentoslocais:db';
const SESSION = 'talentoslocais:session';

let db: DB | null = null;
let sessionId: string | null = null;
const listeners = new Set<() => void>();
let snapshot = { db: null as DB | null, sessionId: null as string | null };

function emit() {
  snapshot = { db, sessionId };
  listeners.forEach((l) => l());
}

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export async function initStore() {
  const raw = safeGet(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) db = parsed;
    } catch {
      /* dados corrompidos: recria */
    }
  }
  if (!db) {
    db = await buildSeed();
    persist();
  }
  sessionId = safeGet(SESSION);
  if (sessionId && !db.users.some((u) => u.id === sessionId && u.status === 'active')) sessionId = null;
  emit();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError')
      throw new AppError('O armazenamento deste navegador está cheio. Remova algumas fotos do portfólio e tente novamente.');
  }
}

export class AppError extends Error {}

/** Executa uma alteração e salva. Em caso de erro, desfaz. */
export function commit<T>(fn: (d: DB) => T): T {
  if (!db) throw new AppError('Aplicativo ainda carregando.');
  const backup = JSON.stringify(db);
  try {
    const r = fn(db);
    db = { ...db };
    persist();
    emit();
    return r;
  } catch (e) {
    db = JSON.parse(backup);
    throw e;
  }
}

export function getDB(): DB {
  if (!db) throw new AppError('Aplicativo ainda carregando.');
  return db;
}

export function setSession(id: string | null) {
  sessionId = id;
  try {
    if (id) localStorage.setItem(SESSION, id);
    else localStorage.removeItem(SESSION);
  } catch {
    /* sem armazenamento: sessão só em memória */
  }
  emit();
}

export const getSessionId = () => sessionId;

export async function resetDemo() {
  db = await buildSeed();
  persist();
  setSession(null);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore() {
  const s = useSyncExternalStore(subscribe, () => snapshot);
  const me: User | undefined = s.db && s.sessionId ? s.db.users.find((u) => u.id === s.sessionId) : undefined;
  return { db: s.db as DB, me };
}
