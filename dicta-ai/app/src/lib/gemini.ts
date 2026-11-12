/**
 * Cliente Gemini direto do aparelho (sem servidor).
 * A chave fica salva somente no celular do usuário.
 */
import { DictationMode } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const LAST_GOOD_MODEL_KEY = 'dicta_last_good_model';
const UNAVAILABLE_KEY = 'dicta_unavailable_models';

/**
 * Fila automática: Flash-Lite primeiro (mais barato e rápido), depois Flash.
 * Os modelos 2.5 deixaram de ser liberados para chaves novas (erro "no longer
 * available to new users"), por isso saíram da lista.
 * Mesma lista em android/.../Gemini.java — mude as duas juntas.
 */
export const AUTO_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest'];

export const MODEL_OPTIONS = [
  { id: 'auto', label: 'Automático (recomendado)' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (rápido e econômico)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (mais caprichado)' },
  { id: 'gemini-flash-lite-latest', label: 'Flash-Lite (sempre o mais recente)' },
  { id: 'gemini-flash-latest', label: 'Flash (sempre o mais recente)' },
];

/** Modelos antigos (1.x/2.x) que o Google não libera mais para chaves novas */
export const isRetiredModel = (id: string) => /^gemini-(1|2)\./.test(id);

/** Modelo salvo nas Preferências que não existe mais vira "auto" */
export function normalizeModelSetting(id: unknown): string {
  if (typeof id !== 'string' || !id || isRetiredModel(id)) return 'auto';
  return id;
}

/** Identifica a chave sem guardá-la: a lista de modelos indisponíveis vale só para ela */
function keyTag(apiKey: string): string {
  let h = 0;
  for (let i = 0; i < apiKey.length; i++) h = (h * 31 + apiKey.charCodeAt(i)) | 0;
  return String(h);
}

function readUnavailable(apiKey: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(UNAVAILABLE_KEY) || 'null');
    return v && v.key === keyTag(apiKey) && Array.isArray(v.models) ? v.models : [];
  } catch {
    return [];
  }
}

function markUnavailable(apiKey: string, model: string) {
  try {
    const models = [...new Set([...readUnavailable(apiKey), model])];
    localStorage.setItem(UNAVAILABLE_KEY, JSON.stringify({ key: keyTag(apiKey), models }));
  } catch {}
}

/** Resposta da API dizendo que o modelo não existe / não está liberado para esta chave */
export function isModelUnavailable(status: number, msg: string): boolean {
  if (status === 404) return true;
  if (status !== 400 && status !== 403) return false;
  if (/api key/i.test(msg) && !/model/i.test(msg)) return false;
  return /no longer available|not found|not supported|unsupported|deprecated|is not available|does not exist|retired/i.test(msg);
}

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

export function modelQueue(preferred?: string, apiKey = ''): string[] {
  const pref = normalizeModelSetting(preferred);
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_GOOD_MODEL_KEY);
  } catch {}
  if (last && isRetiredModel(last)) last = null;
  const first = pref !== 'auto' ? pref : last;
  const queue = first ? [first, ...AUTO_MODELS.filter((m) => m !== first)] : [...AUTO_MODELS];
  const skip = apiKey ? readUnavailable(apiKey) : [];
  const usable = queue.filter((m) => !skip.includes(m));
  // Se tudo foi marcado indisponível (ex.: Google liberou de novo), tenta a lista inteira
  return usable.length ? usable : queue;
}

/**
 * Limites para o usuário não esperar minutos em caso de falha: no máximo 3
 * modelos que respondam de fato (modelo inexistente não conta), 45 s cada e
 * 120 s no total.
 */
export const MAX_ATTEMPTS = 3;
export const PER_MODEL_TIMEOUT_MS = 45_000;
export const TOTAL_BUDGET_MS = 120_000;
/** Se o Google pedir para esperar até isso em um 429, esperamos e tentamos de novo */
const MAX_RETRY_WAIT_MS = 10_000;

/** Quanto maior, mais útil para o usuário: é esse erro que aparece no fim */
const PRIORITY = { unavailable: 1, empty: 2, busy: 3, timeout: 4, unknown: 4, rateLimit: 5 } as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(body: any): number | null {
  const details = Array.isArray(body?.error?.details) ? body.error.details : [];
  for (const d of details) {
    const m = typeof d?.retryDelay === 'string' && d.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
    if (m) return Math.ceil(parseFloat(m[1]) * 1000);
  }
  return null;
}

async function callGemini({ apiKey, model, parts, json = true }: CallOpts): Promise<string> {
  if (!apiKey) throw new GeminiError('Configure sua chave gratuita do Gemini em Preferências para usar a IA.', true);
  let best: { err: GeminiError; rank: number } | null = null;
  const keep = (err: GeminiError, rank: number) => {
    if (!best || rank >= best.rank) best = { err, rank };
  };
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let attempts = 0;

  for (const m of modelQueue(model, apiKey)) {
    if (attempts >= MAX_ATTEMPTS) break;
    let retried429 = false;
    // laço curto: só repete o mesmo modelo uma vez, quando o Google pede espera curta
    for (;;) {
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
          attempts++;
          const data = await resp.json();
          const text = (data?.candidates?.[0]?.content?.parts || [])
            .map((p: any) => p.text || '')
            .join('')
            .trim();
          if (!text) {
            keep(new GeminiError('A IA não retornou texto. Tente falar novamente.'), PRIORITY.empty);
            break;
          }
          try {
            localStorage.setItem(LAST_GOOD_MODEL_KEY, m);
          } catch {}
          return text;
        }

        const body = await resp.json().catch(() => null);
        const msg: string = body?.error?.message || `HTTP ${resp.status}`;

        if (isModelUnavailable(resp.status, msg)) {
          // não gasta tentativa: o modelo simplesmente não existe para esta chave
          console.warn(`Modelo ${m} indisponível:`, msg);
          markUnavailable(apiKey, m);
          keep(new GeminiError('Nenhum modelo de IA disponível para a sua chave. Escolha "Automático" em Preferências › Modelo de IA.'), PRIORITY.unavailable);
          break;
        }
        attempts++;
        if (resp.status === 400 && /api key/i.test(msg)) {
          throw new GeminiError('Chave do Gemini inválida. Confira em Preferências › Chave da IA.', true);
        }
        if (resp.status === 401 || resp.status === 403) {
          throw new GeminiError('Chave sem permissão para a API Gemini. Gere uma nova em aistudio.google.com/apikey.', true);
        }
        if (resp.status === 429) {
          const wait = retryDelayMs(body);
          if (!retried429 && wait !== null && wait <= MAX_RETRY_WAIT_MS && Date.now() + wait < deadline) {
            retried429 = true;
            await sleep(wait);
            continue;
          }
          keep(new GeminiError('Limite gratuito do Gemini atingido no momento. Aguarde 1 minuto e tente de novo.'), PRIORITY.rateLimit);
        } else if (resp.status >= 500) {
          keep(new GeminiError('Servidores da IA ocupados. Tente novamente em instantes.'), PRIORITY.busy);
        } else {
          // Mensagem da API em inglês fica só no console; na tela, texto em português
          console.warn(`Gemini ${m} HTTP ${resp.status}:`, msg);
          keep(new GeminiError(`A IA recusou o pedido (código ${resp.status}). Tente de novo ou troque o modelo em Preferências.`), PRIORITY.unknown);
        }
        break;
      } catch (err: any) {
        clearTimeout(timer);
        if (err instanceof GeminiError && err.fatal) throw err;
        if (err?.name === 'AbortError') {
          attempts++;
          keep(new GeminiError('A IA demorou demais para responder. Verifique sua internet.'), PRIORITY.timeout);
          break;
        }
        if (err instanceof TypeError) {
          throw new GeminiError('Sem conexão com a internet. Verifique o Wi-Fi ou dados móveis.');
        }
        attempts++;
        console.warn('Falha ao chamar a IA:', err);
        keep(new GeminiError('Falha inesperada ao falar com a IA. Tente de novo.'), PRIORITY.unknown);
        break;
      }
    }
  }
  throw (best as { err: GeminiError } | null)?.err || new GeminiError('Nenhum modelo de IA disponível.');
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
