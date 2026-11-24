import type { Area, Categoria, Nivel, Objetivo, Origem, Posicao } from './tipos';

export const CATEGORIAS: Record<Categoria, string> = {
  aquecimento: 'Aquecimento',
  cardio: 'Cardio leve',
  forca: 'Força',
  core: 'Abdômen / core',
  mobilidade: 'Mobilidade',
  alongamento: 'Alongamento',
  equilibrio: 'Equilíbrio',
  respiracao: 'Respiração',
  energia: 'Qigong / energia',
};

export const AREAS: Record<Area, string> = {
  'corpo-todo': 'Corpo todo',
  bracos: 'Braços',
  ombros: 'Ombros',
  peito: 'Peito',
  costas: 'Costas',
  abdomen: 'Abdômen',
  gluteos: 'Glúteos',
  pernas: 'Pernas',
  quadril: 'Quadril',
  pescoco: 'Pescoço',
};

export const POSICOES: Record<Posicao, string> = {
  'em-pe': 'Em pé',
  chao: 'No chão',
  cadeira: 'Na cadeira',
};

export const NIVEIS: Record<Nivel, string> = { 1: 'Iniciante', 2: 'Intermediário', 3: 'Avançado' };

export const OBJETIVOS: Record<Objetivo, { nome: string; emoji: string }> = {
  emagrecer: { nome: 'Emagrecer', emoji: '🔥' },
  tonificar: { nome: 'Tonificar', emoji: '💪' },
  forca: { nome: 'Força', emoji: '🏋️' },
  flexibilidade: { nome: 'Flexibilidade', emoji: '🤸' },
  postura: { nome: 'Postura', emoji: '🧍' },
  equilibrio: { nome: 'Equilíbrio', emoji: '🦩' },
  relaxar: { nome: 'Relaxar', emoji: '🍃' },
  energia: { nome: 'Energia', emoji: '⚡' },
};

export const BANDEIRAS: Record<Origem, string> = {
  Japão: '🇯🇵',
  China: '🇨🇳',
  Coreia: '🇰🇷',
  Índia: '🇮🇳',
  Tailândia: '🇹🇭',
  Universal: '🌏',
};
