import { Clock, Dumbbell, Heart, Pause, Play, Trash2 } from 'lucide-react';
import type { Navegacao, RefPrograma } from '../App';
import type { Loja } from '../lib/armazenamento';
import { BANDEIRAS, NIVEIS, OBJETIVOS } from '../lib/rotulos';
import { minutos, totalExercicios } from '../lib/sequencia';
import type { Treino } from '../lib/tipos';
import { ListaItens } from './ListaItens';
import { BotaoPrincipal, Cabecalho, Nivel, Selo } from './ui';

export function TreinoDetalhe({
  treino,
  programa,
  loja,
  nav,
}: {
  treino: Treino;
  programa?: RefPrograma;
  loja: Loja;
  nav: Navegacao;
}) {
  const fav = loja.estado.favoritos.includes(treino.id);
  const salvo = loja.estado.treinosSalvos.some((t) => t.id === treino.id);
  const ritmo = loja.estado.ajustes.ritmoDescanso;

  return (
    <div>
      <Cabecalho
        titulo=""
        voltar={nav.voltar}
        acao={
          <div className="flex">
            {salvo && (
              <button
                aria-label="Excluir treino salvo"
                onClick={() => {
                  if (confirm('Excluir este treino salvo?')) {
                    loja.removerTreinoSalvo(treino.id);
                    nav.voltar();
                  }
                }}
                className="rounded-full p-2 active:bg-black/5"
              >
                <Trash2 size={22} />
              </button>
            )}
            <button
              aria-label="Favoritar"
              onClick={() => (treino.gerado && !salvo ? loja.salvarTreino(treino) : loja.alternarFavorito(treino.id))}
              className="rounded-full p-2 active:bg-black/5"
            >
              <Heart size={22} className={fav ? 'fill-[var(--vermelho)] text-[var(--vermelho)]' : ''} />
            </button>
          </div>
        }
      />
      <div className="px-4">
        <div className="text-5xl">{treino.emoji}</div>
        {programa && (
          <div className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vermelho)]">Dia {programa.dia} do programa</div>
        )}
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{treino.nome}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--tinta-2)]">{treino.descricao}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-3">
            <Clock size={16} className="text-[var(--vermelho)]" />
            <div className="mt-1 text-lg font-extrabold">{minutos(treino, ritmo)} min</div>
            <div className="text-xs text-[var(--tinta-2)]">duração</div>
          </div>
          <div className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-3">
            <Dumbbell size={16} className="text-[var(--vermelho)]" />
            <div className="mt-1 text-lg font-extrabold">{totalExercicios(treino)}</div>
            <div className="text-xs text-[var(--tinta-2)]">exercícios</div>
          </div>
          <div className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-3">
            <Pause size={16} className="text-[var(--vermelho)]" />
            <div className="mt-1 text-lg font-extrabold">{Math.round(treino.descanso * ritmo)}s</div>
            <div className="text-xs text-[var(--tinta-2)]">descanso</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Selo>
            <Nivel n={treino.nivel} /> {NIVEIS[treino.nivel]}
          </Selo>
          {treino.origem && (
            <Selo>
              {BANDEIRAS[treino.origem]} {treino.origem}
            </Selo>
          )}
          {treino.objetivos.map((o) => (
            <Selo key={o} cor="vermelho">
              {OBJETIVOS[o].emoji} {OBJETIVOS[o].nome}
            </Selo>
          ))}
        </div>

        <h2 className="mb-2.5 mt-6 font-bold">Exercícios</h2>
        <ListaItens treino={treino} nav={nav} />
        <p className="mt-2 text-xs text-[var(--tinta-2)]">Toque num exercício para ver como fazer.</p>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+62px)] z-20 px-4 pb-3 pt-6 [background:linear-gradient(transparent,var(--papel)_40%)]">
        <div className="mx-auto max-w-xl">
          <BotaoPrincipal className="w-full" onClick={() => nav.ir({ nome: 'player', treino, programa })}>
            <Play size={20} fill="currentColor" /> Começar treino
          </BotaoPrincipal>
        </div>
      </div>
      <div className="h-24" />
    </div>
  );
}
