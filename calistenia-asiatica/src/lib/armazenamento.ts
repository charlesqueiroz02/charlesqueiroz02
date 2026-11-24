import { useCallback, useEffect, useState } from 'react';
import type { EstadoSalvo, RegistroTreino, Treino } from './tipos';

const CHAVE = 'calistenia-asiatica:v1';

export const ESTADO_INICIAL: EstadoSalvo = {
  historico: [],
  favoritos: [],
  programas: {},
  ajustes: { voz: true, bipes: true, preparo: 10, ritmoDescanso: 1 },
  treinosSalvos: [],
};

function carregar(): EstadoSalvo {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return ESTADO_INICIAL;
    const e = JSON.parse(bruto) as Partial<EstadoSalvo>;
    return {
      ...ESTADO_INICIAL,
      ...e,
      ajustes: { ...ESTADO_INICIAL.ajustes, ...(e.ajustes ?? {}) },
    };
  } catch {
    return ESTADO_INICIAL;
  }
}

export function useEstado() {
  const [estado, setEstado] = useState<EstadoSalvo>(carregar);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, [estado]);

  const registrar = useCallback((r: Omit<RegistroTreino, 'id'>) => {
    setEstado((e) => {
      const programas = { ...e.programas };
      if (r.programa) {
        const feitos = new Set(programas[r.programa.id] ?? []);
        feitos.add(r.programa.dia);
        programas[r.programa.id] = [...feitos].sort((a, b) => a - b);
      }
      return {
        ...e,
        programas,
        historico: [{ ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...e.historico],
      };
    });
  }, []);

  const alternarFavorito = useCallback((id: string) => {
    setEstado((e) => ({
      ...e,
      favoritos: e.favoritos.includes(id) ? e.favoritos.filter((f) => f !== id) : [...e.favoritos, id],
    }));
  }, []);

  const salvarTreino = useCallback((t: Treino) => {
    setEstado((e) => ({
      ...e,
      treinosSalvos: [t, ...e.treinosSalvos.filter((x) => x.id !== t.id)],
      favoritos: e.favoritos.includes(t.id) ? e.favoritos : [...e.favoritos, t.id],
    }));
  }, []);

  const removerTreinoSalvo = useCallback((id: string) => {
    setEstado((e) => ({
      ...e,
      treinosSalvos: e.treinosSalvos.filter((x) => x.id !== id),
      favoritos: e.favoritos.filter((f) => f !== id),
    }));
  }, []);

  const marcarDia = useCallback((programaId: string, dia: number, feito: boolean) => {
    setEstado((e) => {
      const s = new Set(e.programas[programaId] ?? []);
      if (feito) s.add(dia);
      else s.delete(dia);
      return { ...e, programas: { ...e.programas, [programaId]: [...s].sort((a, b) => a - b) } };
    });
  }, []);

  const reiniciarPrograma = useCallback((programaId: string) => {
    setEstado((e) => ({ ...e, programas: { ...e.programas, [programaId]: [] } }));
  }, []);

  const atualizarAjustes = useCallback((a: Partial<EstadoSalvo['ajustes']>) => {
    setEstado((e) => ({ ...e, ajustes: { ...e.ajustes, ...a } }));
  }, []);

  const apagarTudo = useCallback(() => setEstado(ESTADO_INICIAL), []);

  return {
    estado,
    registrar,
    alternarFavorito,
    salvarTreino,
    removerTreinoSalvo,
    marcarDia,
    reiniciarPrograma,
    atualizarAjustes,
    apagarTudo,
  };
}

export type Loja = ReturnType<typeof useEstado>;

// ── Estatísticas ──

export function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sequenciaDias(historico: RegistroTreino[], hoje = new Date()): number {
  const dias = new Set(historico.map((h) => chaveDia(new Date(h.data))));
  const d = new Date(hoje);
  if (!dias.has(chaveDia(d))) d.setDate(d.getDate() - 1); // ainda pode treinar hoje
  let n = 0;
  while (dias.has(chaveDia(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function minutosPorDia(historico: RegistroTreino[], dias: number, hoje = new Date()) {
  const mapa = new Map<string, number>();
  for (const h of historico) {
    const k = chaveDia(new Date(h.data));
    mapa.set(k, (mapa.get(k) ?? 0) + h.segundos / 60);
  }
  const res: { dia: Date; minutos: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    res.push({ dia: d, minutos: Math.round(mapa.get(chaveDia(d)) ?? 0) });
  }
  return res;
}
