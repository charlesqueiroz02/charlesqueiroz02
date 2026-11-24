import { Clock, Heart } from 'lucide-react';
import { minutos, totalExercicios } from '../lib/sequencia';
import { BANDEIRAS, NIVEIS, OBJETIVOS } from '../lib/rotulos';
import type { Treino } from '../lib/tipos';
import { Nivel } from './ui';

export function CartaoTreino({
  treino,
  favorito,
  onClick,
  compacto,
}: {
  treino: Treino;
  favorito?: boolean;
  onClick: () => void;
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <button
        onClick={onClick}
        className="flex w-40 shrink-0 flex-col rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-3.5 text-left active:scale-[0.98]"
      >
        <span className="text-3xl">{treino.emoji}</span>
        <span className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight">{treino.nome}</span>
        <span className="mt-1.5 flex items-center gap-1 text-xs text-[var(--tinta-2)]">
          <Clock size={12} /> {minutos(treino)} min
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-3.5 text-left active:scale-[0.99]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--papel)] text-3xl">
        {treino.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-bold">{treino.nome}</span>
          {favorito && <Heart size={14} className="shrink-0 fill-[var(--vermelho)] text-[var(--vermelho)]" />}
        </span>
        <span className="mt-0.5 line-clamp-1 text-sm text-[var(--tinta-2)]">{treino.descricao}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--tinta-2)]">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {minutos(treino)} min
          </span>
          <span className="flex items-center gap-1">
            <Nivel n={treino.nivel} /> {NIVEIS[treino.nivel]}
          </span>
          <span>{totalExercicios(treino)} exercícios</span>
          {treino.origem && <span>{BANDEIRAS[treino.origem]}</span>}
          <span>{treino.objetivos.map((o) => OBJETIVOS[o].emoji).join(' ')}</span>
        </span>
      </span>
    </button>
  );
}
