export type Origem = 'Japão' | 'China' | 'Coreia' | 'Índia' | 'Tailândia' | 'Universal';

export type Categoria =
  | 'aquecimento'
  | 'cardio'
  | 'forca'
  | 'core'
  | 'mobilidade'
  | 'alongamento'
  | 'equilibrio'
  | 'respiracao'
  | 'energia';

export type Area =
  | 'corpo-todo'
  | 'bracos'
  | 'ombros'
  | 'peito'
  | 'costas'
  | 'abdomen'
  | 'gluteos'
  | 'pernas'
  | 'quadril'
  | 'pescoco';

export type Posicao = 'em-pe' | 'chao' | 'cadeira';
export type Nivel = 1 | 2 | 3;

export interface Exercicio {
  id: string;
  nome: string;
  /** Nome original / estilo de referência (ex.: "Baduanjin", "Rajio Taiso"). */
  estilo?: string;
  origem: Origem;
  categoria: Categoria;
  areas: Area[];
  nivel: Nivel;
  posicao: Posicao;
  /** Duração padrão em segundos quando usado num treino. */
  segundos: number;
  emoji: string;
  passos: string[];
  dica: string;
  cuidado?: string;
  maisFacil?: string;
  maisDificil?: string;
  /** Exercício feito um lado de cada vez (o player avisa para trocar de lado). */
  unilateral?: boolean;
}

export type Objetivo =
  | 'emagrecer'
  | 'tonificar'
  | 'forca'
  | 'flexibilidade'
  | 'postura'
  | 'equilibrio'
  | 'relaxar'
  | 'energia';

export interface ItemTreino {
  ex: string;
  segundos: number;
}

export interface Treino {
  id: string;
  nome: string;
  descricao: string;
  nivel: Nivel;
  objetivos: Objetivo[];
  origem?: Origem;
  emoji: string;
  itens: ItemTreino[];
  /** Quantas vezes repetir o bloco principal (itens marcados entre inicioVolta e fimVolta). */
  voltas?: number;
  /** Índices [início, fim] (inclusive) do bloco que se repete. */
  blocoVolta?: [number, number];
  /** Descanso entre exercícios em segundos. */
  descanso: number;
  gerado?: boolean;
}

export interface DiaPrograma {
  treino: string | null; // null = descanso
  nota?: string;
}

export interface Programa {
  id: string;
  nome: string;
  descricao: string;
  nivel: Nivel;
  emoji: string;
  dias: DiaPrograma[];
}

export interface RegistroTreino {
  id: string;
  treinoId: string;
  nome: string;
  data: string; // ISO
  segundos: number;
  programa?: { id: string; dia: number };
}

export interface Ajustes {
  voz: boolean;
  bipes: boolean;
  preparo: number;
  /** Multiplicador de descanso: 0.5, 1, 1.5, 2 */
  ritmoDescanso: number;
}

export interface EstadoSalvo {
  historico: RegistroTreino[];
  favoritos: string[];
  programas: Record<string, number[]>; // dias concluídos
  ajustes: Ajustes;
  treinosSalvos: Treino[];
}
