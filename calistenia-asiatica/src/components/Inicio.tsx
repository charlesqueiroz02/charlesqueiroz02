import { ChevronDown, ChevronRight, Flame, Play, Settings, Timer } from 'lucide-react';
import { useState } from 'react';
import type { Navegacao } from '../App';
import { PROGRAMAS } from '../data/programas';
import { TREINOS } from '../data/treinos';
import { chaveDia, minutosPorDia, sequenciaDias, type Loja } from '../lib/armazenamento';
import { OBJETIVOS } from '../lib/rotulos';
import { minutos } from '../lib/sequencia';
import type { Objetivo } from '../lib/tipos';
import { CartaoTreino } from './CartaoTreino';
import { LinhaRolavel, Secao } from './ui';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function treinoDoDia() {
  const base = TREINOS.filter((t) => t.nivel === 1 && minutos(t) >= 8);
  const k = chaveDia(new Date());
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return base[h % base.length];
}

export function Inicio({ loja, nav }: { loja: Loja; nav: Navegacao }) {
  const { estado } = loja;
  const seq = sequenciaDias(estado.historico);
  const semana = minutosPorDia(estado.historico, 7).reduce((s, d) => s + d.minutos, 0);
  const hoje = treinoDoDia();
  const [sobre, setSobre] = useState(false);

  // Programa em andamento (o com dias concluídos mais recente), senão o Desafio 28
  const emAndamento =
    PROGRAMAS.find((p) => (estado.programas[p.id]?.length ?? 0) > 0 && (estado.programas[p.id]?.length ?? 0) < p.dias.length) ??
    PROGRAMAS[0];
  const feitos = new Set(estado.programas[emAndamento.id] ?? []);
  const proximoDia = emAndamento.dias.findIndex((_, i) => !feitos.has(i + 1)) + 1;
  const diaInfo = proximoDia > 0 ? emAndamento.dias[proximoDia - 1] : null;
  const treinoPrograma = diaInfo?.treino ? TREINOS.find((t) => t.id === diaInfo.treino) : undefined;

  const rapidos = TREINOS.filter((t) => minutos(t) <= 10);

  return (
    <div>
      <header className="flex items-start justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),18px)]">
        <div>
          <p className="text-sm text-[var(--tinta-2)]">{saudacao()} 🌸</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Calistenia <span className="text-[var(--vermelho)]">Asiática</span>
          </h1>
        </div>
        <button onClick={() => nav.ir({ nome: 'ajustes' })} aria-label="Ajustes" className="rounded-full p-2 active:bg-black/5">
          <Settings size={22} />
        </button>
      </header>

      {/* Estatísticas rápidas */}
      <div className="mt-2 grid grid-cols-2 gap-3 px-4">
        <div className="rounded-2xl bg-[var(--tinta)] p-4 text-[var(--papel)]">
          <div className="flex items-center gap-1.5 text-xs opacity-75">
            <Flame size={14} /> Sequência
          </div>
          <div className="mt-1 text-3xl font-extrabold">
            {seq} <span className="text-base font-semibold opacity-75">{seq === 1 ? 'dia' : 'dias'}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-4">
          <div className="flex items-center gap-1.5 text-xs text-[var(--tinta-2)]">
            <Timer size={14} /> Últimos 7 dias
          </div>
          <div className="mt-1 text-3xl font-extrabold">
            {semana} <span className="text-base font-semibold text-[var(--tinta-2)]">min</span>
          </div>
        </div>
      </div>

      {/* Programa */}
      <Secao titulo="Seu programa">
        <div className="px-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
            <button onClick={() => nav.ir({ nome: 'programa', id: emAndamento.id })} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="text-3xl">{emAndamento.emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">{emAndamento.nome}</span>
                <span className="text-sm text-[var(--tinta-2)]">
                  {feitos.size} de {emAndamento.dias.length} dias concluídos
                </span>
              </span>
              <ChevronRight size={20} className="text-[var(--tinta-2)]" />
            </button>
            <div className="mx-4 h-2 overflow-hidden rounded-full bg-black/5">
              <div className="h-full rounded-full bg-[var(--vermelho)]" style={{ width: `${(feitos.size / emAndamento.dias.length) * 100}%` }} />
            </div>
            {diaInfo && (
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--vermelho)]">Dia {proximoDia}</div>
                  <div className="truncate font-semibold">{treinoPrograma ? treinoPrograma.nome : 'Descanso 😌'}</div>
                  {!treinoPrograma && diaInfo.nota && <div className="text-sm text-[var(--tinta-2)]">{diaInfo.nota}</div>}
                </div>
                {treinoPrograma ? (
                  <button
                    onClick={() => nav.ir({ nome: 'treino', treino: treinoPrograma, programa: { id: emAndamento.id, dia: proximoDia } })}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--vermelho)] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <Play size={16} fill="currentColor" /> Começar
                  </button>
                ) : (
                  <button
                    onClick={() => loja.marcarDia(emAndamento.id, proximoDia, true)}
                    className="shrink-0 rounded-xl border border-[var(--linha)] px-4 py-2.5 text-sm font-bold"
                  >
                    Concluir dia
                  </button>
                )}
              </div>
            )}
            {!diaInfo && <div className="p-4 text-sm font-semibold text-emerald-700">Programa concluído! 🎉</div>}
          </div>
        </div>
      </Secao>

      {/* Treino do dia */}
      <Secao titulo="Sugestão de hoje">
        <div className="px-4">
          <CartaoTreino treino={hoje} favorito={estado.favoritos.includes(hoje.id)} onClick={() => nav.ir({ nome: 'treino', treino: hoje })} />
        </div>
      </Secao>

      {/* Objetivos */}
      <Secao titulo="Qual é o seu objetivo?">
        <div className="grid grid-cols-4 gap-2 px-4">
          {(Object.keys(OBJETIVOS) as Objetivo[]).map((o) => (
            <button
              key={o}
              onClick={() => nav.aba('treinos', o)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] px-1 py-3 active:scale-95"
            >
              <span className="text-2xl">{OBJETIVOS[o].emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">{OBJETIVOS[o].nome}</span>
            </button>
          ))}
        </div>
      </Secao>

      <Secao
        titulo="Rápidos (até 10 min)"
        acao={
          <button onClick={() => nav.aba('treinos')} className="text-sm font-semibold text-[var(--vermelho)]">
            Ver todos
          </button>
        }
      >
        <LinhaRolavel>
          {rapidos.map((t) => (
            <CartaoTreino key={t.id} compacto treino={t} onClick={() => nav.ir({ nome: 'treino', treino: t })} />
          ))}
        </LinhaRolavel>
      </Secao>

      {/* Sobre o método */}
      <Secao titulo="O que é a calistenia asiática?">
        <div className="px-4">
          <div className="rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-4 text-sm leading-relaxed text-[var(--tinta-2)]">
            <p>
              É o nome popular de rotinas de exercícios com o <b className="text-[var(--tinta)]">peso do próprio corpo</b>,
              de <b className="text-[var(--tinta)]">baixo impacto</b>, feitas em casa e quase sempre em pé, inspiradas em
              práticas tradicionais da Ásia.
            </p>
            {sobre && (
              <div className="mt-3 space-y-2">
                <p>🇯🇵 <b className="text-[var(--tinta)]">Rajio Taiso</b> – a ginástica do rádio japonesa, transmitida desde 1928 e feita por escolas e empresas.</p>
                <p>🇨🇳 <b className="text-[var(--tinta)]">Qigong e Baduanjin</b> – movimentos lentos com respiração; <b className="text-[var(--tinta)]">Shuai Shou</b> (balanço de braços) e <b className="text-[var(--tinta)]">Pai Da</b> (tapinhas).</p>
                <p>🇨🇳 <b className="text-[var(--tinta)]">Tai Chi e Kung Fu</b> – equilíbrio, posturas como a do cavalo e golpes controlados.</p>
                <p>🇰🇷 <b className="text-[var(--tinta)]">Treinos coreanos em pé</b> – abdominais em pé, chutes leves do taekwondo e sequências dançantes.</p>
                <p>🇮🇳🇹🇭 <b className="text-[var(--tinta)]">Yoga, pranayama e Ruesi Dadton</b> – mobilidade, alongamento e respiração.</p>
                <p>
                  Não é um método único e oficial: é uma combinação dessas práticas. O segredo está na <b className="text-[var(--tinta)]">constância</b> –
                  poucos minutos todos os dias valem mais que um treino pesado por semana.
                </p>
              </div>
            )}
            <button onClick={() => setSobre(!sobre)} className="mt-2 flex items-center gap-1 font-semibold text-[var(--vermelho)]">
              {sobre ? 'Mostrar menos' : 'Saiba mais'} <ChevronDown size={16} className={sobre ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </Secao>

      <p className="px-6 pb-4 pt-6 text-center text-xs leading-relaxed text-[var(--tinta-2)]">
        Este app não substitui orientação médica ou de um profissional de educação física. Em caso de dor, tontura ou falta
        de ar, pare o exercício. Gestantes, idosos e pessoas com condições de saúde devem consultar um médico antes.
      </p>
    </div>
  );
}
