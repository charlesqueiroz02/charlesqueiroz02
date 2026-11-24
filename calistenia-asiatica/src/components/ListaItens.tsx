import { Repeat } from 'lucide-react';
import type { Navegacao } from '../App';
import { MAPA_EXERCICIOS } from '../data/exercicios';
import { duracaoItem, formatarTempo } from '../lib/sequencia';
import type { Treino } from '../lib/tipos';

/** Lista os exercícios de um treino, destacando o bloco que se repete. */
export function ListaItens({ treino, nav }: { treino: Treino; nav: Navegacao }) {
  const [ini, fim] = treino.blocoVolta ?? [-1, -1];
  const voltas = treino.voltas ?? 1;
  const temBloco = voltas > 1 && ini >= 0;

  const linha = (i: number) => {
    const it = treino.itens[i];
    const e = MAPA_EXERCICIOS[it.ex];
    if (!e) return null;
    return (
      <button
        key={i}
        onClick={() => nav.ir({ nome: 'exercicio', id: e.id })}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-black/5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--papel)] text-2xl">{e.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{e.nome}</span>
          <span className="block truncate text-xs text-[var(--tinta-2)]">
            {e.estilo ?? e.origem}
            {e.unilateral ? ' · troca de lado' : ''}
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums text-[var(--tinta-2)]">{formatarTempo(duracaoItem(it.ex, it.segundos))}</span>
      </button>
    );
  };

  const indices = treino.itens.map((_, i) => i);
  const antes = temBloco ? indices.slice(0, ini) : indices;
  const bloco = temBloco ? indices.slice(ini, fim + 1) : [];
  const depois = temBloco ? indices.slice(fim + 1) : [];

  return (
    <div className="divide-y divide-[var(--linha)] overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
      {antes.length > 0 && <div>{antes.map(linha)}</div>}
      {bloco.length > 0 && (
        <div className="bg-[var(--vermelho)]/[0.04]">
          <div className="flex items-center gap-1.5 px-3 pt-2.5 text-xs font-bold uppercase tracking-wide text-[var(--vermelho)]">
            <Repeat size={13} /> Circuito · repetir {voltas}×
          </div>
          {bloco.map(linha)}
        </div>
      )}
      {depois.length > 0 && <div>{depois.map(linha)}</div>}
    </div>
  );
}
