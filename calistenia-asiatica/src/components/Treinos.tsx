import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Navegacao } from '../App';
import { PROGRAMAS } from '../data/programas';
import { TREINOS } from '../data/treinos';
import type { Loja } from '../lib/armazenamento';
import { NIVEIS, OBJETIVOS } from '../lib/rotulos';
import { minutos } from '../lib/sequencia';
import type { Nivel, Objetivo } from '../lib/tipos';
import { CartaoTreino } from './CartaoTreino';
import { Cabecalho, Chip, LinhaRolavel, Secao } from './ui';

const DURACOES = [
  { id: 'todas', nome: 'Qualquer duração', ok: () => true },
  { id: 'ate10', nome: 'Até 10 min', ok: (m: number) => m <= 10 },
  { id: '10a20', nome: '10–20 min', ok: (m: number) => m > 10 && m <= 20 },
  { id: 'mais20', nome: '+20 min', ok: (m: number) => m > 20 },
] as const;

export function Treinos({ loja, nav, objetivoInicial }: { loja: Loja; nav: Navegacao; objetivoInicial?: Objetivo }) {
  const { estado } = loja;
  const [objetivo, setObjetivo] = useState<Objetivo | 'todos' | 'favoritos'>(objetivoInicial ?? 'todos');
  const [nivel, setNivel] = useState<Nivel | 0>(0);
  const [duracao, setDuracao] = useState<(typeof DURACOES)[number]['id']>('todas');

  const todos = useMemo(() => [...estado.treinosSalvos, ...TREINOS], [estado.treinosSalvos]);

  const lista = todos.filter((t) => {
    if (objetivo === 'favoritos' && !estado.favoritos.includes(t.id)) return false;
    if (objetivo !== 'todos' && objetivo !== 'favoritos' && !t.objetivos.includes(objetivo)) return false;
    if (nivel && t.nivel !== nivel) return false;
    return DURACOES.find((d) => d.id === duracao)!.ok(minutos(t));
  });

  return (
    <div>
      <Cabecalho titulo="Treinos" />

      <LinhaRolavel>
        <Chip ativo={objetivo === 'todos'} onClick={() => setObjetivo('todos')}>Todos</Chip>
        <Chip ativo={objetivo === 'favoritos'} onClick={() => setObjetivo('favoritos')}>❤️ Favoritos</Chip>
        {(Object.keys(OBJETIVOS) as Objetivo[]).map((o) => (
          <Chip key={o} ativo={objetivo === o} onClick={() => setObjetivo(o)}>
            {OBJETIVOS[o].emoji} {OBJETIVOS[o].nome}
          </Chip>
        ))}
      </LinhaRolavel>
      <div className="mt-2">
        <LinhaRolavel>
          <Chip ativo={nivel === 0} onClick={() => setNivel(0)}>Todos os níveis</Chip>
          {([1, 2, 3] as Nivel[]).map((n) => (
            <Chip key={n} ativo={nivel === n} onClick={() => setNivel(n)}>{NIVEIS[n]}</Chip>
          ))}
        </LinhaRolavel>
      </div>
      <div className="mt-2">
        <LinhaRolavel>
          {DURACOES.map((d) => (
            <Chip key={d.id} ativo={duracao === d.id} onClick={() => setDuracao(d.id)}>{d.nome}</Chip>
          ))}
        </LinhaRolavel>
      </div>

      {objetivo === 'todos' && !nivel && duracao === 'todas' && (
        <Secao titulo="Programas">
          <div className="space-y-2 px-4">
            {PROGRAMAS.map((p) => {
              const feitos = estado.programas[p.id]?.length ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => nav.ir({ nome: 'programa', id: p.id })}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--tinta)] p-4 text-left text-[var(--papel)] active:scale-[0.99]"
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{p.nome}</span>
                    <span className="block text-xs opacity-75">
                      {p.dias.length} dias · {feitos > 0 ? `${feitos} concluídos` : 'não iniciado'}
                    </span>
                  </span>
                  <ChevronRight size={20} className="opacity-60" />
                </button>
              );
            })}
          </div>
        </Secao>
      )}

      <Secao titulo={`${lista.length} ${lista.length === 1 ? 'treino' : 'treinos'}`}>
        <div className="space-y-2.5 px-4">
          {lista.map((t) => (
            <CartaoTreino key={t.id} treino={t} favorito={estado.favoritos.includes(t.id)} onClick={() => nav.ir({ nome: 'treino', treino: t })} />
          ))}
          {lista.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--linha)] p-6 text-center text-sm text-[var(--tinta-2)]">
              Nenhum treino com esses filtros.
              <button onClick={() => nav.aba('gerador')} className="mt-2 block w-full font-semibold text-[var(--vermelho)]">
                Criar um no gerador →
              </button>
            </div>
          )}
        </div>
      </Secao>
    </div>
  );
}
