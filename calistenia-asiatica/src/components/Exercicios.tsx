import { Search } from 'lucide-react';
import { useState } from 'react';
import type { Navegacao } from '../App';
import { EXERCICIOS } from '../data/exercicios';
import { AREAS, BANDEIRAS, CATEGORIAS, POSICOES } from '../lib/rotulos';
import type { Area, Categoria, Origem, Posicao } from '../lib/tipos';
import { ORIGENS } from '../data/treinos';
import { Cabecalho, Chip, LinhaRolavel, Nivel } from './ui';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Exercicios({ nav }: { nav: Navegacao }) {
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState<Categoria | 'todas'>('todas');
  const [area, setArea] = useState<Area | 'todas'>('todas');
  const [pos, setPos] = useState<Posicao | 'todas'>('todas');
  const [origem, setOrigem] = useState<Origem | 'todas'>('todas');

  const q = normalizar(busca.trim());
  const lista = EXERCICIOS.filter(
    (e) =>
      (cat === 'todas' || e.categoria === cat) &&
      (area === 'todas' || e.areas.includes(area)) &&
      (pos === 'todas' || e.posicao === pos) &&
      (origem === 'todas' || e.origem === origem) &&
      (!q || normalizar(`${e.nome} ${e.estilo ?? ''} ${e.origem}`).includes(q)),
  );

  return (
    <div>
      <Cabecalho titulo={`Exercícios`} />
      <div className="px-4">
        <label className="flex items-center gap-2 rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] px-3.5 py-3">
          <Search size={18} className="text-[var(--tinta-2)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre ${EXERCICIOS.length} exercícios`}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--tinta-2)]"
          />
        </label>
      </div>
      <div className="mt-3 space-y-2">
        <LinhaRolavel>
          <Chip ativo={cat === 'todas'} onClick={() => setCat('todas')}>Todas as categorias</Chip>
          {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
            <Chip key={c} ativo={cat === c} onClick={() => setCat(c)}>{CATEGORIAS[c]}</Chip>
          ))}
        </LinhaRolavel>
        <LinhaRolavel>
          <Chip ativo={area === 'todas'} onClick={() => setArea('todas')}>Todas as áreas</Chip>
          {(Object.keys(AREAS) as Area[]).map((a) => (
            <Chip key={a} ativo={area === a} onClick={() => setArea(a)}>{AREAS[a]}</Chip>
          ))}
        </LinhaRolavel>
        <LinhaRolavel>
          <Chip ativo={pos === 'todas' && origem === 'todas'} onClick={() => { setPos('todas'); setOrigem('todas'); }}>Qualquer</Chip>
          {(Object.keys(POSICOES) as Posicao[]).map((p) => (
            <Chip key={p} ativo={pos === p} onClick={() => setPos(pos === p ? 'todas' : p)}>{POSICOES[p]}</Chip>
          ))}
          {ORIGENS.map((o) => (
            <Chip key={o} ativo={origem === o} onClick={() => setOrigem(origem === o ? 'todas' : o)}>{BANDEIRAS[o]} {o}</Chip>
          ))}
        </LinhaRolavel>
      </div>

      <p className="px-4 pb-2 pt-4 text-sm font-semibold text-[var(--tinta-2)]">{lista.length} exercícios</p>
      <div className="mx-4 divide-y divide-[var(--linha)] overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
        {lista.map((e) => (
          <button key={e.id} onClick={() => nav.ir({ nome: 'exercicio', id: e.id })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-black/5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--papel)] text-2xl">{e.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{e.nome}</span>
              <span className="block truncate text-xs text-[var(--tinta-2)]">
                {BANDEIRAS[e.origem]} {e.estilo ?? e.origem} · {CATEGORIAS[e.categoria]} · {POSICOES[e.posicao]}
              </span>
            </span>
            <Nivel n={e.nivel} />
          </button>
        ))}
        {lista.length === 0 && <div className="p-6 text-center text-sm text-[var(--tinta-2)]">Nenhum exercício encontrado.</div>}
      </div>
    </div>
  );
}
