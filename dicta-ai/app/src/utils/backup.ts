/**
 * Validação de dados vindos de fora (arquivo de backup) ou do localStorage.
 * Tudo que não tiver o formato esperado é descartado ou corrigido, para que
 * um arquivo malformado nunca derrube a interface.
 */
import { DictationNote, DictionaryItem, ToneSettings, isDictationMode } from '../types';
import { newId } from './id';

export const MAX_HISTORY = 500;
export const MAX_DICTIONARY = 1000;
const MAX_TEXT = 100_000;
const MAX_INSTRUCTION = 2_000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = MAX_TEXT): string | undefined => (typeof v === 'string' ? v.slice(0, max) : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

export function sanitizeNote(raw: unknown): DictationNote | null {
  if (!isObj(raw)) return null;
  const refinedText = str(raw.refinedText);
  if (!refinedText) return null;
  const fillers = Array.isArray(raw.fillerWordsRemoved)
    ? raw.fillerWordsRemoved.filter((f): f is string => typeof f === 'string').slice(0, 200)
    : [];
  return {
    id: str(raw.id, 100) || newId(),
    timestamp: num(raw.timestamp) ?? Date.now(),
    rawText: str(raw.rawText) ?? '',
    refinedText,
    mode: isDictationMode(raw.mode) ? raw.mode : 'casual',
    detectedLanguage: str(raw.detectedLanguage, 80),
    fillerWordsRemoved: fillers,
    durationSeconds: Math.max(0, num(raw.durationSeconds) ?? 0),
    wordCount: Math.max(0, num(raw.wordCount) ?? refinedText.trim().split(/\s+/).filter(Boolean).length),
    isPinned: raw.isPinned === true,
  };
}

export function sanitizeNotes(raw: unknown): DictationNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeNote)
    .filter((n): n is DictationNote => n !== null)
    .slice(0, MAX_HISTORY);
}

export function sanitizeDictionary(raw: unknown): DictionaryItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: DictionaryItem[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const term = str(item.term, 120)?.trim();
    if (!term || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    out.push({ id: str(item.id, 100) || newId(), term, category: str(item.category, 60), createdAt: num(item.createdAt) });
    if (out.length >= MAX_DICTIONARY) break;
  }
  return out;
}

/** Só aceita chaves conhecidas com o tipo certo. A chave da IA nunca vem do backup. */
export function sanitizeSettings(raw: unknown): Partial<ToneSettings> {
  if (!isObj(raw)) return {};
  const out: Partial<ToneSettings> = {};
  const f = num(raw.formality);
  if (f !== undefined) out.formality = clamp(f, 1, 5);
  const b = num(raw.brevity);
  if (b !== undefined) out.brevity = clamp(b, 1, 5);
  const lang = str(raw.language, 20);
  if (lang && /^(auto|[a-z]{2,3}(-[A-Za-z]{2,4})?)$/.test(lang)) out.language = lang;
  const model = str(raw.model, 80);
  if (model && /^[a-z0-9.\-]+$/i.test(model)) out.model = model;
  const ci = str(raw.customInstruction, MAX_INSTRUCTION);
  if (ci !== undefined) out.customInstruction = ci;
  for (const k of ['autoCopy', 'hapticFeedback', 'soundEffects'] as const) {
    if (typeof raw[k] === 'boolean') out[k] = raw[k] as boolean;
  }
  return out;
}

export interface BackupData {
  settings: Partial<ToneSettings>;
  dictionary: DictionaryItem[] | null;
  history: DictationNote[] | null;
}

/** Lança erro se o arquivo não for um backup do Dicta. */
export function parseBackup(text: string): BackupData {
  const data = JSON.parse(text);
  if (!isObj(data) || data.app !== 'dicta-ai') throw new Error('Arquivo não é um backup do Dicta AI');
  return {
    settings: sanitizeSettings(data.settings),
    dictionary: Array.isArray(data.dictionary) ? sanitizeDictionary(data.dictionary) : null,
    history: Array.isArray(data.history) ? sanitizeNotes(data.history) : null,
  };
}
