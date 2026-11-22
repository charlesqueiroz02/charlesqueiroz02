import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'casa', name: 'Casa e Reparos', icon: 'Home', active: true },
  { id: 'solda', name: 'Soldagem e Metalurgia', icon: 'Flame', active: true },
  { id: 'auto', name: 'Automotivo', icon: 'Car', active: true },
  { id: 'costura', name: 'Costura e Artesanato', icon: 'Scissors', active: true },
  { id: 'instalacao', name: 'Instalação e Manutenção', icon: 'Wrench', active: true },
  { id: 'construcao', name: 'Construção e Reforma', icon: 'BrickWall', active: true },
  { id: 'tecnologia', name: 'Tecnologia', icon: 'Laptop', active: true },
  { id: 'gerais', name: 'Serviços Gerais', icon: 'Sparkles', active: true },
];

/**
 * Cidade de demonstração. As posições (em km, aproximadas a partir do Centro)
 * servem apenas para estimar "distância aproximada entre bairros".
 * Nunca usamos localização precisa do aparelho.
 */
export const DEMO_CITY = 'Campinas – SP';
export const NEIGHBORHOOD_POS: Record<string, [number, number]> = {
  Centro: [0, 0],
  Cambuí: [1.5, 0.5],
  Botafogo: [-0.5, 1],
  Castelo: [-1, 2.2],
  'Vila Industrial': [-1, -1.5],
  'Jardim Proença': [1.6, -2],
  Taquaral: [3, 3],
  'Barão Geraldo': [4, 10],
  Sousas: [10, 4],
  'Ouro Verde': [-5, -8],
};
export const DEFAULT_REGIONS = [{ city: DEMO_CITY, neighborhoods: Object.keys(NEIGHBORHOOD_POS) }];

export function approxDistanceKm(a: string, b: string): number | undefined {
  const pa = NEIGHBORHOOD_POS[a];
  const pb = NEIGHBORHOOD_POS[b];
  if (!pa || !pb) return undefined;
  return Math.round(Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) * 10) / 10;
}

/** Vocabulário usado pela busca em linguagem natural. */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  casa: ['reparo', 'conserto', 'chuveiro', 'torneira', 'fechadura', 'porta', 'vazamento', 'encanador', 'hidraulic', 'eletricist', 'tomada', 'disjuntor', 'fiacao', 'luz', 'montagem', 'movel', 'moveis', 'marido de aluguel'],
  solda: ['solda', 'soldador', 'portao', 'grade', 'serralheri', 'serralheiro', 'estrutura metalica', 'metal', 'ferro', 'cobertura metalica', 'corrimao', 'toldo'],
  auto: ['mecanic', 'carro', 'moto', 'motocicleta', 'freio', 'motor', 'barulho', 'oleo', 'suspensao', 'embreagem', 'veiculo', 'funilaria', 'auto eletrica'],
  costura: ['costur', 'ajuste', 'barra', 'vestido', 'calca', 'roupa', 'bainha', 'ziper', 'artesanato', 'croche', 'bordado', 'estofado'],
  instalacao: ['instala', 'manutencao', 'ar condicionado', 'ar-condicionado', 'refrigera', 'geladeira', 'maquina de lavar', 'equipamento', 'maquina', 'tecnico', 'aquecedor', 'antena'],
  construcao: ['pedreiro', 'alvenaria', 'reforma', 'pintura', 'pintor', 'piso', 'azulejo', 'gesso', 'telhado', 'muro', 'construcao', 'reboco', 'marcenaria', 'marceneiro'],
  tecnologia: ['computador', 'notebook', 'informatica', 'celular', 'formatar', 'wifi', 'wi-fi', 'rede', 'impressora', 'site', 'camera de seguranca'],
  gerais: ['limpeza', 'faxina', 'diarista', 'jardim', 'jardinagem', 'jardineiro', 'poda', 'mudanca', 'frete', 'piscina', 'grama'],
};

export const SEARCH_SUGGESTIONS = [
  'Eletricista perto de mim',
  'Soldador para portão',
  'Costureira para ajustes',
  'Mecânico de confiança',
  'Técnico para manutenção',
];

export const QUICK_REPLIES = [
  'Qual é o prazo estimado para conclusão?',
  'O material está incluído no valor?',
  'Você consegue atender nesta semana?',
  'Pode enviar fotos de trabalhos semelhantes?',
];

export const AVAILABILITY_LABEL: Record<string, string> = {
  hoje: 'Disponível hoje',
  semana: 'Disponível nesta semana',
  agenda: 'Agenda para as próximas semanas',
  indisponivel: 'Sem agenda no momento',
};

export const MODE_LABEL: Record<string, string> = {
  local: 'No local do cliente',
  estabelecimento: 'No meu estabelecimento',
  remoto: 'Remoto',
};

export const REPORT_REASONS = [
  'Perfil falso ou fraudulento',
  'Conteúdo impróprio ou ofensivo',
  'Avaliação falsa ou manipulada',
  'Spam ou propaganda',
  'Golpe ou pedido de pagamento suspeito',
  'Foto que não é do profissional',
  'Outro motivo',
];
