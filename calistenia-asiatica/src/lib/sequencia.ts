import { MAPA_EXERCICIOS } from '../data/exercicios';
import type { Treino } from './tipos';

export interface Etapa {
  tipo: 'exercicio' | 'descanso';
  exId: string;
  segundos: number;
  /** Volta atual (1-based) quando a etapa pertence ao bloco repetido. */
  volta?: number;
  totalVoltas?: number;
  /** Índice do exercício entre os exercícios (0-based) — só para tipo exercicio. */
  ordem?: number;
}

export function duracaoItem(exId: string, segundos: number): number {
  return segundos > 0 ? segundos : (MAPA_EXERCICIOS[exId]?.segundos ?? 30);
}

/** Expande o treino (com voltas) numa lista linear de etapas exercício/descanso. */
export function expandir(treino: Treino, ritmoDescanso = 1): Etapa[] {
  const lista: { ex: string; segundos: number; volta?: number; totalVoltas?: number }[] = [];
  const voltas = Math.max(1, treino.voltas ?? 1);
  const [ini, fim] = treino.blocoVolta ?? [-1, -1];
  const temBloco = voltas > 1 && ini >= 0 && fim >= ini && fim < treino.itens.length;

  treino.itens.forEach((it, i) => {
    if (temBloco && i === ini) {
      for (let v = 1; v <= voltas; v++) {
        for (let j = ini; j <= fim; j++) {
          const b = treino.itens[j];
          lista.push({ ex: b.ex, segundos: duracaoItem(b.ex, b.segundos), volta: v, totalVoltas: voltas });
        }
      }
    }
    if (temBloco && i >= ini && i <= fim) return;
    lista.push({ ex: it.ex, segundos: duracaoItem(it.ex, it.segundos) });
  });

  const descanso = Math.round(treino.descanso * ritmoDescanso);
  const etapas: Etapa[] = [];
  lista.forEach((it, i) => {
    etapas.push({ tipo: 'exercicio', exId: it.ex, segundos: it.segundos, volta: it.volta, totalVoltas: it.totalVoltas, ordem: i });
    const proximo = lista[i + 1];
    if (proximo && descanso > 0) {
      etapas.push({ tipo: 'descanso', exId: proximo.ex, segundos: descanso, volta: proximo.volta, totalVoltas: proximo.totalVoltas });
    }
  });
  return etapas;
}

export function duracaoTotal(treino: Treino, ritmoDescanso = 1): number {
  return expandir(treino, ritmoDescanso).reduce((s, e) => s + e.segundos, 0);
}

export function minutos(treino: Treino, ritmoDescanso = 1): number {
  return Math.max(1, Math.round(duracaoTotal(treino, ritmoDescanso) / 60));
}

export function totalExercicios(treino: Treino): number {
  return expandir(treino).filter((e) => e.tipo === 'exercicio').length;
}

export function formatarTempo(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.max(0, Math.floor(s % 60));
  return `${m}:${r.toString().padStart(2, '0')}`;
}
