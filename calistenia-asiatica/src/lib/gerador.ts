import { EXERCICIOS } from '../data/exercicios';
import { duracaoTotal } from './sequencia';
import type { Area, Categoria, Exercicio, ItemTreino, Nivel, Objetivo, Origem, Posicao, Treino } from './tipos';

export interface OpcoesGerador {
  minutos: number;
  nivel: Nivel;
  objetivo: Objetivo;
  posicoes: Posicao[];
  foco: Area | 'qualquer';
  origem: Origem | 'todas';
  semente: number;
}

export const PESOS: Record<Objetivo, Partial<Record<Categoria, number>>> = {
  emagrecer: { cardio: 4, core: 2, forca: 2, energia: 1 },
  tonificar: { forca: 4, core: 3, cardio: 1 },
  forca: { forca: 5, core: 2, equilibrio: 1 },
  flexibilidade: { mobilidade: 4, alongamento: 4 },
  postura: { mobilidade: 3, alongamento: 2, core: 2, forca: 1 },
  equilibrio: { equilibrio: 5, forca: 1, mobilidade: 1 },
  relaxar: { alongamento: 3, respiracao: 3, mobilidade: 2, energia: 1 },
  energia: { energia: 4, cardio: 2, mobilidade: 1 },
};

const NOMES_OBJETIVO: Record<Objetivo, string> = {
  emagrecer: 'Queima',
  tonificar: 'Tonificação',
  forca: 'Força',
  flexibilidade: 'Flexibilidade',
  postura: 'Postura',
  equilibrio: 'Equilíbrio',
  relaxar: 'Relaxamento',
  energia: 'Energia',
};

/** PRNG determinístico (mulberry32) para que a mesma semente gere o mesmo treino. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sortearPonderado<T>(itens: T[], peso: (t: T) => number, rnd: () => number): T | undefined {
  const total = itens.reduce((s, t) => s + peso(t), 0);
  if (total <= 0) return undefined;
  let r = rnd() * total;
  for (const t of itens) {
    r -= peso(t);
    if (r <= 0) return t;
  }
  return itens[itens.length - 1];
}

function escolher(
  pool: Exercicio[],
  qtd: number,
  peso: (e: Exercicio) => number,
  rnd: () => number,
  usados: Set<string>,
): Exercicio[] {
  const res: Exercicio[] = [];
  let restantes = pool.filter((e) => !usados.has(e.id));
  while (res.length < qtd && restantes.length) {
    const e = sortearPonderado(restantes, peso, rnd);
    if (!e) break;
    res.push(e);
    usados.add(e.id);
    restantes = restantes.filter((x) => x.id !== e.id);
  }
  return res;
}

const leve = (o: Objetivo) => o === 'relaxar' || o === 'flexibilidade';

export function gerarTreino(op: OpcoesGerador): Treino {
  const rnd = prng(op.semente);
  const posOk = (e: Exercicio) => op.posicoes.includes(e.posicao);
  const origemOk = (e: Exercicio) => op.origem === 'todas' || e.origem === op.origem || e.origem === 'Universal';
  const base = EXERCICIOS.filter((e) => e.nivel <= op.nivel && posOk(e));
  const usados = new Set<string>();

  const bonus = (e: Exercicio) =>
    (op.foco !== 'qualquer' && e.areas.includes(op.foco) ? 3 : 1) *
    (op.origem !== 'todas' && e.origem === op.origem ? 3 : 1);

  const alvo = Math.max(5, op.minutos) * 60;
  const descanso = leve(op.objetivo) ? 5 : op.nivel === 3 ? 20 : 15;

  // Aquecimento (~12%) e volta à calma (~12%)
  const aqPool = base.filter((e) => e.categoria === 'aquecimento' || (e.categoria === 'energia' && e.nivel === 1));
  const calmaPool = base.filter((e) => e.categoria === 'alongamento' || e.categoria === 'respiracao');
  const nAq = op.minutos <= 8 ? 1 : op.minutos <= 20 ? 2 : 3;
  const nCalma = op.minutos <= 8 ? 1 : op.minutos <= 25 ? 2 : 3;
  const aquecimento = escolher(aqPool.filter(origemOk), nAq, bonus, rnd, usados);
  if (aquecimento.length < nAq) aquecimento.push(...escolher(aqPool, nAq - aquecimento.length, () => 1, rnd, usados));

  const pesos = PESOS[op.objetivo];
  const pesoPrincipal = (e: Exercicio) => (pesos[e.categoria] ?? 0) * bonus(e);
  let principalPool = base.filter((e) => (pesos[e.categoria] ?? 0) > 0 && origemOk(e));
  if (principalPool.length < 4) principalPool = base.filter((e) => (pesos[e.categoria] ?? 0) > 0);

  // Cálculo do bloco principal
  const tAq = aquecimento.reduce((s, e) => s + e.segundos + descanso, 0);
  const tCalmaEstimado = nCalma * (45 + descanso);
  const tPrincipal = Math.max(60, alvo - tAq - tCalmaEstimado);
  const segBase = leve(op.objetivo) ? 0 : op.nivel === 1 ? 35 : op.nivel === 2 ? 40 : 45;
  const durMedia = segBase || 50;
  const porItem = durMedia + descanso;
  const totalItens = Math.max(3, Math.round(tPrincipal / porItem));
  const voltasDesejadas = leve(op.objetivo) || totalItens < 8 ? 1 : totalItens >= 24 ? 3 : 2;
  const k = Math.min(principalPool.length, Math.max(3, Math.round(totalItens / voltasDesejadas)));
  const principal = escolher(principalPool, k, pesoPrincipal, rnd, usados);

  // Mistura cardio/força para não repetir categorias seguidas quando possível
  principal.sort((a, b) => (a.categoria === b.categoria ? 0 : rnd() - 0.5));

  const calma = escolher(calmaPool.filter(origemOk), nCalma, bonus, rnd, usados);
  if (calma.length < nCalma) calma.push(...escolher(calmaPool, nCalma - calma.length, () => 1, rnd, usados));

  const segPrincipal = (e: Exercicio) => {
    if (!segBase) return e.segundos;
    // Isometrias e respirações mantêm a duração própria
    if (['equilibrio', 'respiracao', 'mobilidade'].includes(e.categoria)) return Math.min(e.segundos, 60);
    if (e.unilateral) return Math.max(segBase, 40);
    return segBase;
  };

  // Quantas voltas no circuito para chegar perto do tempo pedido (repete quando há poucos exercícios)
  const tBloco = principal.reduce((acc, e) => acc + segPrincipal(e) + descanso, 0);
  const voltas = Math.min(8, Math.max(1, Math.round(tPrincipal / Math.max(1, tBloco))));

  const itens: ItemTreino[] = [
    ...aquecimento.map((e) => ({ ex: e.id, segundos: Math.min(e.segundos, 60) })),
    ...principal.map((e) => ({ ex: e.id, segundos: segPrincipal(e) })),
    ...calma.map((e) => ({ ex: e.id, segundos: Math.min(e.segundos, 90) })),
  ];

  const treino: Treino = {
    id: `gerado-${op.semente}`,
    nome: `${NOMES_OBJETIVO[op.objetivo]} ${op.minutos} min${op.foco !== 'qualquer' ? ' · foco' : ''}`,
    descricao: 'Treino criado pelo gerador com base nas suas escolhas.',
    nivel: op.nivel,
    objetivos: [op.objetivo],
    emoji: '🎲',
    itens,
    voltas,
    blocoVolta: voltas > 1 ? [aquecimento.length, aquecimento.length + principal.length - 1] : undefined,
    descanso,
    gerado: true,
    origem: op.origem === 'todas' ? undefined : op.origem,
  };

  // Ajuste fino: se passou muito do alvo, remove itens do bloco principal
  while (duracaoTotal(treino) > alvo * 1.2 && principal.length > 3) {
    const idx = aquecimento.length + principal.length - 1;
    treino.itens.splice(idx, 1);
    principal.pop();
    if (treino.blocoVolta) treino.blocoVolta = [aquecimento.length, idx - 1];
  }
  return treino;
}
