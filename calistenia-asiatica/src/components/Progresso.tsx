import { Flame, Settings, Timer, Trophy } from 'lucide-react';
import type { Navegacao } from '../App';
import { minutosPorDia, sequenciaDias, type Loja } from '../lib/armazenamento';
import { Cabecalho, Secao } from './ui';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function Progresso({ loja, nav }: { loja: Loja; nav: Navegacao }) {
  const h = loja.estado.historico;
  const seq = sequenciaDias(h);
  const totalMin = Math.round(h.reduce((s, r) => s + r.segundos, 0) / 60);
  const ultimos = minutosPorDia(h, 14);
  const max = Math.max(10, ...ultimos.map((d) => d.minutos));

  // Maior sequência já feita
  const diasUnicos = [...new Set(h.map((r) => new Date(r.data).toDateString()))].map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  let melhor = 0;
  let atual = 0;
  diasUnicos.forEach((t, i) => {
    atual = i > 0 && Math.round((t - diasUnicos[i - 1]) / 86_400_000) === 1 ? atual + 1 : 1;
    melhor = Math.max(melhor, atual);
  });

  const cards = [
    { Icone: Flame, valor: seq, rotulo: 'dias seguidos' },
    { Icone: Trophy, valor: melhor, rotulo: 'melhor sequência' },
    { Icone: Timer, valor: totalMin, rotulo: 'minutos no total' },
    { Icone: Trophy, valor: h.length, rotulo: 'treinos feitos' },
  ];

  return (
    <div>
      <Cabecalho
        titulo="Progresso"
        acao={
          <button onClick={() => nav.ir({ nome: 'ajustes' })} aria-label="Ajustes" className="rounded-full p-2 active:bg-black/5">
            <Settings size={22} />
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 px-4">
        {cards.map(({ Icone, valor, rotulo }) => (
          <div key={rotulo} className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-4">
            <Icone size={18} className="text-[var(--vermelho)]" />
            <div className="mt-1 text-3xl font-extrabold">{valor}</div>
            <div className="text-xs text-[var(--tinta-2)]">{rotulo}</div>
          </div>
        ))}
      </div>

      <Secao titulo="Minutos por dia (últimas 2 semanas)">
        <div className="mx-4 rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-4">
          <div className="flex h-36 items-end gap-1.5">
            {ultimos.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                {d.minutos > 0 && <span className="text-[10px] font-semibold text-[var(--tinta-2)]">{d.minutos}</span>}
                <div
                  className={`w-full rounded-t-md ${d.minutos > 0 ? 'bg-[var(--vermelho)]' : 'bg-black/5'}`}
                  style={{ height: `${Math.max(4, (d.minutos / max) * 100)}%` }}
                  title={`${d.dia.toLocaleDateString('pt-BR')}: ${d.minutos} min`}
                />
                <span className={`text-[10px] ${i === ultimos.length - 1 ? 'font-bold text-[var(--tinta)]' : 'text-[var(--tinta-2)]'}`}>
                  {DIAS[d.dia.getDay()]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Secao>

      <Secao titulo="Histórico">
        <div className="mx-4 divide-y divide-[var(--linha)] overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
          {h.slice(0, 50).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{r.nome}</div>
                <div className="text-xs text-[var(--tinta-2)]">
                  {new Date(r.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às{' '}
                  {new Date(r.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="shrink-0 text-sm font-bold">{Math.max(1, Math.round(r.segundos / 60))} min</div>
            </div>
          ))}
          {h.length === 0 && (
            <div className="p-6 text-center text-sm text-[var(--tinta-2)]">
              Nenhum treino ainda.
              <button onClick={() => nav.aba('inicio')} className="mt-2 block w-full font-semibold text-[var(--vermelho)]">
                Fazer o primeiro treino →
              </button>
            </div>
          )}
        </div>
      </Secao>
      <div className="h-6" />
    </div>
  );
}
