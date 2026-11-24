import { Check, Moon, RotateCcw } from 'lucide-react';
import type { Navegacao } from '../App';
import { PROGRAMAS } from '../data/programas';
import { TREINOS } from '../data/treinos';
import type { Loja } from '../lib/armazenamento';
import { minutos } from '../lib/sequencia';
import { Cabecalho } from './ui';

export function ProgramaDetalhe({ id, loja, nav }: { id: string; loja: Loja; nav: Navegacao }) {
  const p = PROGRAMAS.find((x) => x.id === id);
  if (!p) return <Cabecalho titulo="Programa não encontrado" voltar={nav.voltar} />;
  const feitos = new Set(loja.estado.programas[p.id] ?? []);
  const proximo = p.dias.findIndex((_, i) => !feitos.has(i + 1)) + 1;

  const semanas: number[][] = [];
  for (let i = 0; i < p.dias.length; i += 7) semanas.push(p.dias.slice(i, i + 7).map((_, j) => i + j + 1));

  return (
    <div>
      <Cabecalho
        titulo=""
        voltar={nav.voltar}
        acao={
          feitos.size > 0 ? (
            <button
              aria-label="Reiniciar programa"
              onClick={() => confirm('Reiniciar o programa e desmarcar todos os dias?') && loja.reiniciarPrograma(p.id)}
              className="rounded-full p-2 active:bg-black/5"
            >
              <RotateCcw size={20} />
            </button>
          ) : undefined
        }
      />
      <div className="px-4">
        <div className="text-5xl">{p.emoji}</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{p.nome}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--tinta-2)]">{p.descricao}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full bg-[var(--vermelho)]" style={{ width: `${(feitos.size / p.dias.length) * 100}%` }} />
          </div>
          <span className="text-sm font-bold">
            {feitos.size}/{p.dias.length}
          </span>
        </div>

        {semanas.map((dias, s) => (
          <div key={s} className="mt-6">
            <h2 className="mb-2 font-bold">Semana {s + 1}</h2>
            <div className="divide-y divide-[var(--linha)] overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
              {dias.map((n) => {
                const dia = p.dias[n - 1];
                const t = dia.treino ? TREINOS.find((x) => x.id === dia.treino) : undefined;
                const feito = feitos.has(n);
                const atual = n === proximo;
                return (
                  <div key={n} className={`flex items-center gap-3 px-3 py-2.5 ${atual ? 'bg-[var(--vermelho)]/[0.05]' : ''}`}>
                    <button
                      aria-label={feito ? 'Desmarcar dia' : 'Marcar dia como feito'}
                      onClick={() => loja.marcarDia(p.id, n, !feito)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        feito
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : atual
                            ? 'border-[var(--vermelho)] text-[var(--vermelho)]'
                            : 'border-[var(--linha)] text-[var(--tinta-2)]'
                      }`}
                    >
                      {feito ? <Check size={18} strokeWidth={3} /> : n}
                    </button>
                    {t ? (
                      <button
                        onClick={() => nav.ir({ nome: 'treino', treino: t, programa: { id: p.id, dia: n } })}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="text-xl">{t.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-semibold ${feito ? 'text-[var(--tinta-2)] line-through' : ''}`}>{t.nome}</span>
                          <span className="text-xs text-[var(--tinta-2)]">{minutos(t)} min{dia.nota ? ` · ${dia.nota}` : ''}</span>
                        </span>
                      </button>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Moon size={18} className="text-[var(--tinta-2)]" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">Descanso</span>
                          <span className="block truncate text-xs text-[var(--tinta-2)]">{dia.nota}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-4 text-xs text-[var(--tinta-2)]">
          Ao terminar um treino aberto a partir do programa, o dia é marcado automaticamente. Você também pode marcar à mão.
        </p>
      </div>
      <div className="h-6" />
    </div>
  );
}
