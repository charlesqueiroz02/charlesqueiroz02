/**
 * Cliente Gemini direto do aparelho (sem servidor).
 * A chave fica salva somente no celular do usuário.
 */
import { DictationMode } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const LAST_GOOD_MODEL_KEY = 'dicta_last_good_model';

export const AUTO_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

export const MODEL_OPTIONS = [
  { id: 'auto', label: 'Automático (recomendado)' },
  { id: 'gemini-flash-latest', label: 'Gemini Flash (mais recente)' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite (mais rápido)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (máxima qualidade)' },
];

export const SYSTEM_PROMPT = `You are Dicta AI, an expert speech-to-text editor and voice keyboard.
Convert spoken speech into flawless, well formatted written text.
1. Remove fillers, hesitations, repetitions and stuttering (PT: "humm", "tipo assim", "né", "ééé", "então...", "aí", "sabe?"; EN: "um", "uh", "like", "you know").
2. Resolve self-corrections ("às duas, não, às três e meia" -> "às três e meia").
3. Respect the user's personal dictionary spelling exactly.
4. Apply the requested style without meta-commentary, never answer questions contained in the speech — only rewrite them.
5. Preserve the author's voice, intent and language.`;

export function getModeGuideline(mode: string, formality = 3, brevity = 3): string {
  const f = formality <= 2 ? 'casual and conversational' : formality >= 4 ? 'formal, executive and polished' : 'natural and professional';
  const b = brevity <= 2 ? 'expand clearly with full details' : brevity >= 4 ? 'ultra-concise, zero fluff' : 'balanced length';
  switch (mode) {
    case 'email':
      return `Format as an email with greeting, structured paragraphs and polite sign-off. Tone: ${f}. Length: ${b}.`;
    case 'casual':
    case 'chat':
      return `Format as a clear, direct chat message (WhatsApp/Telegram). Natural phrasing, emojis only if natural. Tone: ${f}. Length: ${b}.`;
    case 'bullet':
      return `Format as structured bullet points / checklist, grouped logically. Length: ${b}.`;
    case 'verbatim':
      return `Keep the exact words and structure; only fix spelling, punctuation, capitalization and remove stutters/fillers. Do not paraphrase.`;
    case 'social':
      return `Format as an engaging social post (LinkedIn/Instagram) with a hook and readable line breaks. Tone: ${f}.`;
    case 'meeting':
      return `Format as meeting minutes with sections: Pontos discutidos, Decisões, Próximas ações (com responsáveis e prazos quando citados).`;
    case 'summary':
      return `Provide an executive TL;DR summary in 1 to 3 punchy sentences.`;
    default:
      return `Refine into clean, grammatically impeccable text. Tone: ${f}. Length: ${b}.`;
  }
}

export class GeminiError extends Error {
  fatal: boolean;
  constructor(msg: string, fatal = false) {
    super(msg);
    this.fatal = fatal;
  }
}

interface CallOpts {
  apiKey: string;
  model?: string; // 'auto' ou id
  parts: any[];
  json?: boolean;
}

export function modelQueue(preferred?: string): string[] {
  if (preferred && preferred !== 'auto') return [preferred, ...AUTO_MODELS.filter((m) => m !== preferred)];
  const last = localStorage.getItem(LAST_GOOD_MODEL_KEY);
  return last ? [last, ...AUTO_MODELS.filter((m) => m !== last)] : AUTO_MODELS;
}

/**
 * Limites para o usuário não esperar minutos em caso de falha: antes eram até
 * 6 modelos x 90 s cada (~9 min). Agora: no máximo 3 modelos, 45 s cada e
 * 120 s no total.
 */
export const MAX_ATTEMPTS = 3;
export const PER_MODEL_TIMEOUT_MS = 45_000;
export const TOTAL_BUDGET_MS = 120_000;

async function callGemini({ apiKey, model, parts, json = true }: CallOpts): Promise<string> {
  if (!apiKey) throw new GeminiError('Configure sua chave gratuita do Gemini em Preferências para usar a IA.', true);
  let lastErr: GeminiError | null = null;
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const m of modelQueue(model).slice(0, MAX_ATTEMPTS)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(PER_MODEL_TIMEOUT_MS, remaining));
    try {
      const resp = await fetch(`${API_BASE}/${m}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: 'application/json' } : {}) },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (resp.ok) {
        const data = await resp.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p.text || '')
          .join('')
          .trim();
        if (!text) {
          lastErr = new GeminiError('A IA não retornou texto. Tente falar novamente.');
          continue;
        }
        localStorage.setItem(LAST_GOOD_MODEL_KEY, m);
        return text;
      }

      const body = await resp.json().catch(() => null);
      const msg: string = body?.error?.message || `HTTP ${resp.status}`;
      if (resp.status === 400 && /api key/i.test(msg)) {
        throw new GeminiError('Chave do Gemini inválida. Confira em Preferências › Chave da IA.', true);
      }
      if (resp.status === 403) {
        throw new GeminiError('Chave sem permissão para a API Gemini. Gere uma nova em aistudio.google.com/apikey.', true);
      }
      if (resp.status === 429) {
        lastErr = new GeminiError('Limite gratuito do Gemini atingido no momento. Aguarde 1 minuto e tente de novo.');
      } else if (resp.status >= 500) {
        lastErr = new GeminiError('Servidores da IA ocupados. Tente novamente em instantes.');
      } else {
        lastErr = new GeminiError(msg);
      }
      // 404 (modelo inexistente), 429, 5xx → tenta próximo modelo
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof GeminiError && err.fatal) throw err;
      if (err?.name === 'AbortError') {
        lastErr = new GeminiError('A IA demorou demais para responder. Verifique sua internet.');
        continue;
      }
      if (err instanceof TypeError) {
        throw new GeminiError('Sem conexão com a internet. Verifique o Wi-Fi ou dados móveis.');
      }
      lastErr = err instanceof GeminiError ? err : new GeminiError(err?.message || 'Falha desconhecida');
    }
  }
  throw lastErr || new GeminiError('Nenhum modelo de IA disponível.');
}

export function parseJson<T>(text: string, fallback: T): T {
  try {
    const clean = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return { ...fallback, ...JSON.parse(clean) };
  } catch {
    return fallback;
  }
}

export interface AIContext {
  apiKey: string;
  model?: string;
  mode: DictationMode;
  formality: number;
  brevity: number;
  language: string;
  dictionary: string[];
  customInstruction?: string;
}

const dictLine = (d: string[]) => (d.length ? `User dictionary (exact spelling): ${d.join(', ')}.` : '');

export interface TranscribeResult {
  rawTranscript: string;
  refinedText: string;
  detectedLanguage: string;
  fillerWordsRemoved: string[];
  summary?: string;
}

export async function transcribeAudio(base64: string, mimeType: string, ctx: AIContext): Promise<TranscribeResult> {
  const lang =
    ctx.language && ctx.language !== 'auto'
      ? `The speech is in ${ctx.language}. Keep this language.`
      : 'Detect the spoken language automatically.';
  const prompt = `Transcribe this audio with extreme accuracy, then rewrite it.
${lang}
${dictLine(ctx.dictionary)}
Style: ${ctx.mode} — ${getModeGuideline(ctx.mode, ctx.formality, ctx.brevity)}
${ctx.customInstruction ? `Extra user instruction: ${ctx.customInstruction}` : ''}
If the audio has no intelligible speech, return empty strings.
Respond ONLY with JSON:
{"rawTranscript":"literal transcription","refinedText":"final polished text","detectedLanguage":"e.g. Português (pt-BR)","fillerWordsRemoved":["..."],"summary":"one sentence"}`;

  const text = await callGemini({
    apiKey: ctx.apiKey,
    model: ctx.model,
    parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }],
  });
  return parseJson<TranscribeResult>(text, {
    rawTranscript: text,
    refinedText: text,
    detectedLanguage: 'auto',
    fillerWordsRemoved: [],
  });
}

export interface RefineResult {
  refinedText: string;
  fillerWordsRemoved: string[];
  detectedLanguage?: string;
}

export async function refineText(raw: string, ctx: AIContext): Promise<RefineResult> {
  const lang = ctx.language && ctx.language !== 'auto' ? `Output language: ${ctx.language}.` : 'Keep the original language.';
  const prompt = `Polish this raw spoken transcript into pristine written text.
Raw transcript:
"""${raw}"""
Style: ${ctx.mode} — ${getModeGuideline(ctx.mode, ctx.formality, ctx.brevity)}
${ctx.customInstruction ? `Extra user instruction: ${ctx.customInstruction}` : ''}
${dictLine(ctx.dictionary)}
${lang}
Respond ONLY with JSON: {"refinedText":"...","fillerWordsRemoved":["..."],"detectedLanguage":"..."}`;
  const text = await callGemini({ apiKey: ctx.apiKey, model: ctx.model, parts: [{ text: prompt }] });
  return parseJson<RefineResult>(text, { refinedText: text, fillerWordsRemoved: [] });
}

export async function applyVoiceCommand(current: string, command: string, ctx: AIContext): Promise<string> {
  const prompt = `Apply this edit instruction to the text.
Text:
"""${current}"""
Instruction:
"""${command}"""
${dictLine(ctx.dictionary)}
Keep the same language unless asked to translate.
Respond ONLY with JSON: {"updatedText":"...","actionApplied":"short description"}`;
  const text = await callGemini({ apiKey: ctx.apiKey, model: ctx.model, parts: [{ text: prompt }] });
  return parseJson<{ updatedText: string }>(text, { updatedText: text }).updatedText;
}

/** Teste rápido da chave */
export async function testApiKey(apiKey: string, model?: string): Promise<string> {
  await callGemini({ apiKey, model, parts: [{ text: 'Reply with the single word: OK' }], json: false });
  return localStorage.getItem(LAST_GOOD_MODEL_KEY) || 'ok';
}

/** Comando de edição falado: a IA ouve o áudio da instrução e aplica no texto */
export async function applyVoiceCommandAudio(current: string, base64: string, mimeType: string, ctx: AIContext): Promise<{ updatedText: string; command: string }> {
  const prompt = `The attached audio contains a spoken EDIT INSTRUCTION (not content). Understand it and apply it to the text below.
Text:
"""${current}"""
${dictLine(ctx.dictionary)}
Keep the same language unless asked to translate.
Respond ONLY with JSON: {"command":"the instruction you heard","updatedText":"..."}`;
  const text = await callGemini({
    apiKey: ctx.apiKey,
    model: ctx.model,
    parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }],
  });
  return parseJson(text, { updatedText: current, command: '' });
}
