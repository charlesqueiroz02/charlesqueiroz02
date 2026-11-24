import { describe, expect, it } from 'vitest';
import { EXERCICIOS, MAPA_EXERCICIOS } from '../data/exercicios';
import { PROGRAMAS } from '../data/programas';
import { TREINOS } from '../data/treinos';
import { gerarTreino, PESOS } from './gerador';
import { duracaoTotal, expandir } from './sequencia';
import type { Area, Nivel, Objetivo, Origem, Posicao } from './tipos';

describe('dados', () => {
  it('ids de exercícios são únicos e completos', () => {
    expect(new Set(EXERCICIOS.map((e) => e.id)).size).toBe(EXERCICIOS.length);
    for (const e of EXERCICIOS) {
      expect(e.passos.length, e.id).toBeGreaterThan(0);
      expect(e.areas.length, e.id).toBeGreaterThan(0);
      expect(e.segundos, e.id).toBeGreaterThan(0);
    }
  });

  it('treinos só usam exercícios existentes e têm blocos válidos', () => {
    expect(new Set(TREINOS.map((t) => t.id)).size).toBe(TREINOS.length);
    for (const t of TREINOS) {
      for (const i of t.itens) expect(MAPA_EXERCICIOS[i.ex], `${t.id} → ${i.ex}`).toBeDefined();
      if (t.blocoVolta) {
        const [a, b] = t.blocoVolta;
        expect(a, t.id).toBeGreaterThanOrEqual(0);
        expect(b, t.id).toBeLessThan(t.itens.length);
        expect(a, t.id).toBeLessThanOrEqual(b);
      }
    }
  });

  it('programas só apontam para treinos existentes', () => {
    const ids = new Set(TREINOS.map((t) => t.id));
    for (const p of PROGRAMAS) for (const d of p.dias) if (d.treino) expect(ids.has(d.treino), `${p.id} → ${d.treino}`).toBe(true);
  });
});

describe('sequência', () => {
  it('repete o bloco do circuito', () => {
    const t = TREINOS.find((x) => x.id === 'barriga-em-pe')!;
    const ex = expandir(t).filter((e) => e.tipo === 'exercicio');
    const [a, b] = t.blocoVolta!;
    expect(ex.length).toBe(t.itens.length + (b - a + 1) * ((t.voltas ?? 1) - 1));
    expect(ex.filter((e) => e.volta === 3).length).toBe(b - a + 1);
  });

  it('não há descanso depois do último exercício e o ritmo altera o descanso', () => {
    const t = TREINOS[0];
    const e = expandir(t);
    expect(e[e.length - 1].tipo).toBe('exercicio');
    expect(duracaoTotal(t, 2)).toBeGreaterThan(duracaoTotal(t, 1));
  });
});

describe('gerador', () => {
  const objetivos = Object.keys(PESOS) as Objetivo[];
  const posicoes: Posicao[][] = [['em-pe'], ['chao'], ['cadeira'], ['em-pe', 'chao', 'cadeira']];
  const focos: (Area | 'qualquer')[] = ['qualquer', 'abdomen', 'pernas', 'bracos'];
  const origens: (Origem | 'todas')[] = ['todas', 'China', 'Japão', 'Coreia', 'Índia'];

  it('gera treinos válidos em todas as combinações', () => {
    let n = 0;
    for (const objetivo of objetivos)
      for (const nivel of [1, 2, 3] as Nivel[])
        for (const p of posicoes)
          for (const foco of focos)
            for (const origem of origens)
              for (const minutos of [5, 15, 30, 60]) {
                const t = gerarTreino({ objetivo, nivel, posicoes: p, foco, origem, minutos, semente: n++ });
                expect(t.itens.length).toBeGreaterThan(0);
                const ids = t.itens.map((i) => i.ex);
                expect(new Set(ids).size).toBe(ids.length); // sem repetidos
                for (const id of ids) {
                  const e = MAPA_EXERCICIOS[id];
                  expect(e.nivel).toBeLessThanOrEqual(nivel);
                  expect(p).toContain(e.posicao);
                }
              }
  });

  it('respeita aproximadamente o tempo pedido', () => {
    for (const minutos of [10, 20, 30, 45]) {
      const t = gerarTreino({ objetivo: 'emagrecer', nivel: 2, posicoes: ['em-pe', 'chao'], foco: 'qualquer', origem: 'todas', minutos, semente: 42 });
      const real = duracaoTotal(t) / 60;
      expect(real).toBeGreaterThan(minutos * 0.6);
      expect(real).toBeLessThan(minutos * 1.3);
    }
  });

  it('é determinístico pela semente', () => {
    const op = { objetivo: 'tonificar' as const, nivel: 2 as const, posicoes: ['em-pe' as const], foco: 'qualquer' as const, origem: 'todas' as const, minutos: 20, semente: 7 };
    expect(gerarTreino(op)).toEqual(gerarTreino(op));
  });
});
