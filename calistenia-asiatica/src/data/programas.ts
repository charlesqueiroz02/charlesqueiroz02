import type { DiaPrograma, Programa } from '../lib/tipos';

const d = (treino: string | null, nota?: string): DiaPrograma => ({ treino, nota });

export const PROGRAMAS: Programa[] = [
  {
    id: 'desafio-28',
    nome: 'Desafio 28 dias',
    emoji: '🏆',
    nivel: 1,
    descricao:
      'Do zero ao intermediário em 4 semanas. Começa leve, em pé e sem impacto, e aumenta aos poucos a intensidade.',
    dias: [
      // Semana 1 – adaptação
      d('rajio-taiso'), d('calistenia-asiatica-iniciante'), d('shuai-shou-10'), d('postura-costas'),
      d('barriga-em-pe'), d('tai-chi-equilibrio'), d(null, 'Descanso ativo: caminhe 20 minutos.'),
      // Semana 2 – base
      d('calistenia-asiatica-iniciante'), d('bracos-sem-peso'), d('baduanjin'), d('express-10'),
      d('pernas-gluteos'), d('qigong-ativacao'), d(null, 'Descanso: faça o alongamento se quiser.'),
      // Semana 3 – progressão
      d('queima-em-pe'), d('core-chao'), d('baduanjin'), d('pernas-gluteos'),
      d('caminhada-japonesa'), d('quadril-cocoras'), d(null, 'Descanso ativo.'),
      // Semana 4 – consolidação
      d('intermediario-30'), d('forca-kung-fu'), d('alongamento-completo'), d('queima-em-pe'),
      d('barriga-em-pe'), d('saudacao-sol'), d('intermediario-30', 'Último dia: compare com o dia 1!'),
    ],
  },
  {
    id: 'equilibrio-14',
    nome: '14 dias de equilíbrio (60+)',
    emoji: '🌿',
    nivel: 1,
    descricao: 'Programa gentil para idosos e iniciantes: cadeira, Tai Chi e Qigong para força, equilíbrio e disposição.',
    dias: [
      d('cadeira-60'), d('qigong-ativacao'), d('tai-chi-equilibrio'), d('pausa-escritorio'),
      d('cadeira-60'), d('respiracao-relax'), d(null, 'Descanso: passeio leve.'),
      d('baduanjin'), d('cadeira-60'), d('tai-chi-equilibrio'), d('shuai-shou-10'),
      d('cadeira-60'), d('alongamento-completo'), d('baduanjin', 'Parabéns pela constância!'),
    ],
  },
  {
    id: 'mente-corpo-21',
    nome: '21 dias mente e corpo',
    emoji: '☯️',
    nivel: 1,
    descricao: 'Uma prática diária de Qigong, Tai Chi e yoga para reduzir o estresse e ganhar flexibilidade.',
    dias: [
      d('baduanjin'), d('antes-dormir'), d('shuai-shou-10'), d('tai-chi-equilibrio'), d('respiracao-relax'),
      d('alongamento-completo'), d(null, 'Descanso.'),
      d('baduanjin'), d('saudacao-sol'), d('qigong-ativacao'), d('postura-costas'), d('tai-chi-equilibrio'),
      d('toalha-postura'), d(null, 'Descanso.'),
      d('baduanjin'), d('saudacao-sol'), d('quadril-cocoras'), d('tai-chi-equilibrio'), d('shuai-shou-10'),
      d('alongamento-completo'), d('baduanjin', 'Ciclo completo!'),
    ],
  },
];
