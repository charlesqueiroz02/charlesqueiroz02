import { Clock, Dices, Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Navegacao } from '../App';
import { ORIGENS } from '../data/treinos';
import type { Loja } from '../lib/armazenamento';
import { gerarTreino, type OpcoesGerador } from '../lib/gerador';
import { AREAS, BANDEIRAS, NIVEIS, OBJETIVOS, POSICOES } from '../lib/rotulos';
import { minutos, totalExercicios } from '../lib/sequencia';
import type { Area, Nivel, Objetivo, Posicao } from '../lib/tipos';
import { ListaItens } from './ListaItens';
import { BotaoPrincipal, Cabecalho, Chip, LinhaRolavel } from './ui';

const TEMPOS = [5, 10, 15, 20, 30, 45, 60];

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-2 px-4 text-sm font-bold">{titulo}</div>
      {children}
    </div>
  );
}

export function Gerador({ loja, nav }: { loja: Loja; nav: Navegacao }) {
  const [op, setOp] = useState<OpcoesGerador>({
    minutos: 15,
    nivel: 1,
    objetivo: 'emagrecer',
    posicoes: ['em-pe'],
    foco: 'qualquer',
    origem: 'todas',
    semente: Date.now() % 1_000_000,
  });
  const set = (p: Partial<OpcoesGerador>) => setOp((o) => ({ ...o, ...p }));
  const treino = useMemo(() => gerarTreino(op), [op]);
  const salvo = loja.estado.treinosSalvos.some((t) => t.id === treino.id);

  const alternarPos = (p: Posicao) => {
    const tem = op.posicoes.includes(p);
    const nova = tem ? op.posicoes.filter((x) => x !== p) : [...op.posicoes, p];
    if (nova.length) set({ posicoes: nova });
  };

  return (
    <div>
      <Cabecalho titulo="Gerador de treinos" />
      <p className="px-4 text-sm leading-relaxed text-[var(--tinta-2)]">
        Combine objetivo, tempo, nível e local para criar um treino novo a cada toque. São milhares de combinações possíveis.
      </p>

      <Grupo titulo="Objetivo">
        <LinhaRolavel>
          {(Object.keys(OBJETIVOS) as Objetivo[]).map((o) => (
            <Chip key={o} ativo={op.objetivo === o} onClick={() => set({ objetivo: o })}>
              {OBJETIVOS[o].emoji} {OBJETIVOS[o].nome}
            </Chip>
          ))}
        </LinhaRolavel>
      </Grupo>
      <Grupo titulo="Tempo">
        <LinhaRolavel>
          {TEMPOS.map((t) => (
            <Chip key={t} ativo={op.minutos === t} onClick={() => set({ minutos: t })}>
              {t} min
            </Chip>
          ))}
        </LinhaRolavel>
      </Grupo>
      <Grupo titulo="Nível">
        <LinhaRolavel>
          {([1, 2, 3] as Nivel[]).map((n) => (
            <Chip key={n} ativo={op.nivel === n} onClick={() => set({ nivel: n })}>
              {NIVEIS[n]}
            </Chip>
          ))}
        </LinhaRolavel>
      </Grupo>
      <Grupo titulo="Onde (pode marcar mais de um)">
        <LinhaRolavel>
          {(Object.keys(POSICOES) as Posicao[]).map((p) => (
            <Chip key={p} ativo={op.posicoes.includes(p)} onClick={() => alternarPos(p)}>
              {POSICOES[p]}
            </Chip>
          ))}
        </LinhaRolavel>
      </Grupo>
      <Grupo titulo="Foco">
        <LinhaRolavel>
          <Chip ativo={op.foco === 'qualquer'} onClick={() => set({ foco: 'qualquer' })}>Equilibrado</Chip>
          {(Object.keys(AREAS) as Area[]).filter((a) => a !== 'corpo-todo').map((a) => (
            <Chip key={a} ativo={op.foco === a} onClick={() => set({ foco: a })}>{AREAS[a]}</Chip>
          ))}
        </LinhaRolavel>
      </Grupo>
      <Grupo titulo="Estilo">
        <LinhaRolavel>
          <Chip ativo={op.origem === 'todas'} onClick={() => set({ origem: 'todas' })}>Misturar tudo</Chip>
          {ORIGENS.filter((o) => o !== 'Universal').map((o) => (
            <Chip key={o} ativo={op.origem === o} onClick={() => set({ origem: o })}>{BANDEIRAS[o]} {o}</Chip>
          ))}
        </LinhaRolavel>
      </Grupo>

      <div className="mt-6 px-4">
        <div className="rounded-2xl bg-[var(--tinta)] p-4 text-[var(--papel)]">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{OBJETIVOS[op.objetivo].emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-extrabold">{treino.nome}</div>
              <div className="flex items-center gap-3 text-sm opacity-75">
                <span className="flex items-center gap-1"><Clock size={14} /> {minutos(treino, loja.estado.ajustes.ritmoDescanso)} min</span>
                <span>{totalExercicios(treino)} exercícios</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => set({ semente: Math.floor(Math.random() * 1_000_000) })} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-bold active:bg-white/20">
              <Dices size={18} /> Gerar outro
            </button>
            <button
              onClick={() => (salvo ? loja.removerTreinoSalvo(treino.id) : loja.salvarTreino(treino))}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-bold active:bg-white/20"
            >
              <Heart size={18} className={salvo ? 'fill-[var(--vermelho)] text-[var(--vermelho)]' : ''} /> {salvo ? 'Salvo' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ListaItens treino={treino} nav={nav} />
        </div>
        <BotaoPrincipal className="mt-4 w-full" onClick={() => nav.ir({ nome: 'player', treino })}>
          <Play size={20} fill="currentColor" /> Começar este treino
        </BotaoPrincipal>
      </div>
      <div className="h-6" />
    </div>
  );
}
