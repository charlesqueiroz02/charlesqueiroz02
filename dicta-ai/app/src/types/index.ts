export type DictationMode = 
  | 'casual' 
  | 'email' 
  | 'bullet' 
  | 'verbatim' 
  | 'social' 
  | 'meeting' 
  | 'summary';

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

export interface AppPreset {
  id: DictationMode;
  name: string;
  labelPt: string;
  icon: string;
  description: string;
  color: string;
  sampleInput: string;
}
