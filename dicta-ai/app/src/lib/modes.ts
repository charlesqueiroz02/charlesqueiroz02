/**
 * Metadados de exibição dos estilos de ditado (rótulo, ícone, cor).
 * Usado pelo Estúdio, pelo Histórico e pelo simulador de teclado.
 * A lista de ids vem de DICTATION_MODES em types/index.ts.
 */
import { FileCheck, Flame, ListOrdered, Mail, MessageSquare, Users, Zap, type LucideIcon } from 'lucide-react';
import { DICTATION_MODES, DictationMode } from '../types';

export interface ModeInfo {
  id: DictationMode;
  label: string;
  /** rótulo curto para espaços pequenos (filtros, teclado) */
  short: string;
  icon: LucideIcon;
  color: string;
}

const INFO: Record<DictationMode, Omit<ModeInfo, 'id'>> = {
  casual: { label: 'WhatsApp / Chat', short: 'Chat', icon: MessageSquare, color: 'from-emerald-500 to-teal-600' },
  email: { label: 'E-mail', short: 'E-mail', icon: Mail, color: 'from-blue-500 to-indigo-600' },
  bullet: { label: 'Tópicos', short: 'Tópicos', icon: ListOrdered, color: 'from-purple-500 to-pink-600' },
  meeting: { label: 'Ata de Reunião', short: 'Ata', icon: Users, color: 'from-sky-500 to-cyan-600' },
  verbatim: { label: 'Literal Limpo', short: 'Literal', icon: FileCheck, color: 'from-amber-500 to-orange-600' },
  social: { label: 'LinkedIn', short: 'LinkedIn', icon: Flame, color: 'from-violet-500 to-purple-600' },
  summary: { label: 'Resumo', short: 'Resumo', icon: Zap, color: 'from-cyan-500 to-blue-600' },
};

/** Ordem de exibição no Estúdio */
const DISPLAY_ORDER: DictationMode[] = ['casual', 'email', 'bullet', 'meeting', 'verbatim', 'social', 'summary'];

export const MODES: ModeInfo[] = DISPLAY_ORDER.map((id) => ({ id, ...INFO[id] }));

export const modeInfo = (id: string): ModeInfo | undefined =>
  (DICTATION_MODES as readonly string[]).includes(id) ? { id: id as DictationMode, ...INFO[id as DictationMode] } : undefined;

export const modeShortLabel = (id: string) => modeInfo(id)?.short ?? id;
