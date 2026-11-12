/** Fonte única dos estilos de ditado (o teclado Java tem a mesma lista em DictaKeyboardService.MODES) */
export const DICTATION_MODES = ['casual', 'email', 'bullet', 'verbatim', 'social', 'meeting', 'summary'] as const;

export type DictationMode = (typeof DICTATION_MODES)[number];

export const isDictationMode = (v: unknown): v is DictationMode =>
  typeof v === 'string' && (DICTATION_MODES as readonly string[]).includes(v);

export interface DictationNote {
  id: string;
  timestamp: number;
  rawText: string;
  refinedText: string;
  mode: DictationMode;
  detectedLanguage?: string;
  fillerWordsRemoved: string[];
  durationSeconds: number;
  wordCount: number;
  tags?: string[];
  isPinned?: boolean;
}

export interface DictionaryItem {
  id: string;
  term: string;
  category?: string;
  createdAt?: number;
}

export interface ToneSettings {
  formality: number; // 1 to 5
  brevity: number; // 1 to 5
  language: string; // 'auto', 'pt-BR', 'en-US', 'es-ES', etc.
  autoCopy: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  apiKey: string; // chave Gemini guardada só no aparelho
  model: string; // 'auto' ou id do modelo
  customInstruction: string; // instrução fixa extra (ex.: assinatura)
}
