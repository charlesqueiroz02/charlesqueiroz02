import { AlertTriangle, ArrowDown, ArrowUp, Lightbulb, Play } from 'lucide-react';
import type { Navegacao } from '../App';
import { MAPA_EXERCICIOS } from '../data/exercicios';
import { TREINOS } from '../data/treinos';
import { AREAS, BANDEIRAS, CATEGORIAS, NIVEIS, POSICOES } from '../lib/rotulos';
import type { Treino } from '../lib/tipos';
import { BotaoPrincipal, Cabecalho, Nivel, Selo } from './ui';

export function ExercicioDetalhe({ id, nav }: { id: string; nav: Navegacao }) {
  const e = MAPA_EXERCICIOS[id];
  if (!e) return <Cabecalho titulo="Exercício não encontrado" voltar={nav.voltar} />;
  const usadoEm = TREINOS.filter((t) => t.itens.some((i) => i.ex === id));

  const praticar = () => {
    const t: Treino = {
      id: `pratica-${e.id}`,
      nome: e.nome,
      descricao: 'Prática de um exercício.',
      nivel: e.nivel,
      objetivos: [],
      emoji: e.emoji,
      itens: [{ ex: e.id, segundos: e.segundos }],
      descanso: 0,
    };
    nav.ir({ nome: 'player', treino: t });
  };

  return (
    <div>
      <Cabecalho titulo="" voltar={nav.voltar} />
      <div className="px-4">
        <div className="flex h-40 items-center justify-center rounded-3xl bg-[var(--cartao)] text-8xl shadow-sm">{e.emoji}</div>
        <div className="mt-4 text-sm font-semibold text-[var(--vermelho)]">
          {BANDEIRAS[e.origem]} {e.estilo ? `${e.estilo} · ` : ''}
          {e.origem}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{e.nome}</h1>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Selo>
            <Nivel n={e.nivel} /> {NIVEIS[e.nivel]}
          </Selo>
          <Selo>{CATEGORIAS[e.categoria]}</Selo>
          <Selo>{POSICOES[e.posicao]}</Selo>
          <Selo>{e.segundos}s</Selo>
          {e.areas.map((a) => (
            <Selo key={a} cor="vermelho">
              {AREAS[a]}
            </Selo>
          ))}
        </div>

        <h2 className="mb-2 mt-6 font-bold">Como fazer</h2>
        <ol className="space-y-2.5">
          {e.passos.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tinta)] text-xs font-bold text-[var(--papel)]">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed">{p}</span>
            </li>
          ))}
        </ol>
        {e.unilateral && <p className="mt-3 text-sm font-semibold text-[var(--vermelho)]">↔ Faça um lado por vez: o app avisa a hora de trocar.</p>}

        <div className="mt-5 space-y-2.5">
          <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-3.5 text-sm leading-relaxed">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <span>{e.dica}</span>
          </div>
          {e.maisFacil && (
            <div className="flex gap-3 rounded-2xl bg-emerald-600/10 p-3.5 text-sm leading-relaxed">
              <ArrowDown size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <span>
                <b>Mais fácil:</b> {e.maisFacil}
              </span>
            </div>
          )}
          {e.maisDificil && (
            <div className="flex gap-3 rounded-2xl bg-sky-600/10 p-3.5 text-sm leading-relaxed">
              <ArrowUp size={18} className="mt-0.5 shrink-0 text-sky-700" />
              <span>
                <b>Mais difícil:</b> {e.maisDificil}
              </span>
            </div>
          )}
          {e.cuidado && (
            <div className="flex gap-3 rounded-2xl bg-[var(--vermelho)]/10 p-3.5 text-sm leading-relaxed">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--vermelho)]" />
              <span>
                <b>Cuidado:</b> {e.cuidado}
              </span>
            </div>
          )}
        </div>

        <BotaoPrincipal variante="tinta" className="mt-5 w-full" onClick={praticar}>
          <Play size={18} fill="currentColor" /> Praticar {e.segundos}s com cronômetro
        </BotaoPrincipal>

        {usadoEm.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 font-bold">Aparece nos treinos</h2>
            <div className="flex flex-wrap gap-2">
              {usadoEm.map((t) => (
                <button
                  key={t.id}
                  onClick={() => nav.ir({ nome: 'treino', treino: t })}
                  className="rounded-full border border-[var(--linha)] bg-[var(--cartao)] px-3 py-1.5 text-sm font-medium"
                >
                  {t.emoji} {t.nome}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="h-6" />
    </div>
  );
}
