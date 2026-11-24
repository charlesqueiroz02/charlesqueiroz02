import { ChevronDown, ChevronUp, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Navegacao, RefPrograma } from '../App';
import { MAPA_EXERCICIOS } from '../data/exercicios';
import type { Loja } from '../lib/armazenamento';
import { bipe, calar, desbloquearAudio, falar, manterTelaAcesa } from '../lib/audio';
import { expandir, formatarTempo } from '../lib/sequencia';
import type { Treino } from '../lib/tipos';

type Fase = 'preparo' | 'rodando' | 'fim';

export function Player({ treino, programa, loja, nav }: { treino: Treino; programa?: RefPrograma; loja: Loja; nav: Navegacao }) {
  const { ajustes } = loja.estado;
  const etapas = useMemo(() => expandir(treino, ajustes.ritmoDescanso), [treino, ajustes.ritmoDescanso]);
  const totalEx = etapas.filter((e) => e.tipo === 'exercicio').length;

  const [fase, setFase] = useState<Fase>('preparo');
  const [idx, setIdx] = useState(0);
  const [restante, setRestante] = useState(ajustes.preparo);
  const [pausado, setPausado] = useState(false);
  const [voz, setVoz] = useState(ajustes.voz);
  const [verPassos, setVerPassos] = useState(false);
  const decorrido = useRef(0); // segundos efetivamente treinados
  const registrado = useRef(false);
  const [valeu, setValeu] = useState(false); // treino contou para o histórico?
  const ultimoSegundo = useRef<number>(-1);

  const etapa = etapas[idx];
  const ex = MAPA_EXERCICIOS[etapa?.exId];
  const duracaoFase = fase === 'preparo' ? ajustes.preparo : etapa?.segundos ?? 0;

  const dizer = useCallback((t: string) => voz && falar(t), [voz]);
  const tocar = useCallback((f?: number, d?: number) => ajustes.bipes && bipe(f, d), [ajustes.bipes]);

  // Mantém a tela acesa
  useEffect(() => {
    let soltar: () => void = () => {};
    void manterTelaAcesa().then((f) => (soltar = f));
    return () => {
      soltar();
      calar();
    };
  }, []);

  // Anúncio no início de cada fase/etapa
  useEffect(() => {
    if (fase === 'fim') return;
    const e = etapas[idx];
    const exAtual = MAPA_EXERCICIOS[e.exId];
    if (fase === 'preparo') {
      dizer(`Prepare-se. Primeiro exercício: ${exAtual.nome}.`);
    } else if (e.tipo === 'exercicio') {
      tocar(1046, 0.25);
      dizer(`${exAtual.nome}. ${e.segundos} segundos.`);
    } else {
      tocar(660, 0.2);
      dizer(`Descanse. A seguir: ${exAtual.nome}.`);
    }
    ultimoSegundo.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, idx]);

  const avancar = useCallback(() => {
    if (fase === 'preparo') {
      setFase('rodando');
      setRestante(etapas[0].segundos);
      return;
    }
    if (idx + 1 >= etapas.length) {
      setFase('fim');
      return;
    }
    setIdx(idx + 1);
    setRestante(etapas[idx + 1].segundos);
  }, [fase, idx, etapas]);

  const recuar = useCallback(() => {
    if (fase !== 'rodando') return;
    // volta para o início do exercício atual ou para o exercício anterior
    let alvo = idx;
    if (etapas[idx].segundos - restante < 3 || etapas[idx].tipo === 'descanso') {
      alvo = idx - 1;
      while (alvo > 0 && etapas[alvo].tipo === 'descanso') alvo--;
      alvo = Math.max(0, alvo);
    }
    setIdx(alvo);
    setRestante(etapas[alvo].segundos);
  }, [fase, idx, etapas, restante]);

  // Relógio
  useEffect(() => {
    if (fase === 'fim' || pausado) return;
    const passo = 250;
    const id = setInterval(() => {
      setRestante((r) => Math.max(0, r - passo / 1000));
      if (fase === 'rodando' && etapas[idx].tipo === 'exercicio') decorrido.current += passo / 1000;
    }, passo);
    return () => clearInterval(id);
  }, [fase, pausado, idx, etapas]);

  // Efeitos por segundo: contagem regressiva, troca de lado e fim da etapa
  useEffect(() => {
    if (fase === 'fim') return;
    const s = Math.ceil(restante);
    if (s === ultimoSegundo.current) return;
    ultimoSegundo.current = s;
    if (restante <= 0) {
      avancar();
      return;
    }
    if (s <= 3 && s >= 1) tocar(s === 1 ? 990 : 880, 0.1);
    const e = etapas[idx];
    if (fase === 'rodando' && e.tipo === 'exercicio' && MAPA_EXERCICIOS[e.exId].unilateral && s === Math.ceil(e.segundos / 2)) {
      tocar(1320, 0.15);
      dizer('Troque de lado.');
    }
    if (fase === 'rodando' && e.tipo === 'exercicio' && e.segundos >= 60 && s === 10) dizer('Faltam dez segundos.');
  }, [restante, fase, idx, etapas, avancar, tocar, dizer]);

  // Fim do treino
  useEffect(() => {
    if (fase !== 'fim' || registrado.current) return;
    registrado.current = true;
    // Só conta se a pessoa realmente treinou: metade do tempo de exercício ou pelo menos 3 minutos
    const tempoEx = etapas.filter((e) => e.tipo === 'exercicio').reduce((s, e) => s + e.segundos, 0);
    const conta = decorrido.current >= Math.min(tempoEx * 0.5, 180);
    setValeu(conta);
    if (!conta) {
      dizer('Treino encerrado.');
      return;
    }
    tocar(1046, 0.3);
    dizer('Treino concluído. Parabéns!');
    loja.registrar({
      treinoId: treino.id,
      nome: treino.nome,
      data: new Date().toISOString(),
      segundos: Math.round(decorrido.current),
      programa,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const sair = () => {
    if (fase === 'fim' || confirm('Sair do treino? O progresso deste treino não será salvo.')) {
      calar();
      nav.voltar();
    }
  };

  // Botão voltar do Android dentro do player pede confirmação para sair
  useEffect(() => {
    const w = window as unknown as { __calisSairPlayer?: () => void };
    w.__calisSairPlayer = sair;
    return () => {
      delete w.__calisSairPlayer;
    };
  });

  const ordemAtual = etapa?.tipo === 'exercicio' ? (etapa.ordem ?? 0) + 1 : (etapas.slice(0, idx).filter((e) => e.tipo === 'exercicio').length);
  const progressoGeral = fase === 'fim' ? 1 : fase === 'preparo' ? 0 : (idx + (1 - restante / Math.max(1, duracaoFase))) / etapas.length;
  const fracao = duracaoFase > 0 ? restante / duracaoFase : 0;
  const proximoEx = (() => {
    for (let j = idx + 1; j < etapas.length; j++) if (etapas[j].tipo === 'exercicio') return MAPA_EXERCICIOS[etapas[j].exId];
    return null;
  })();

  if (fase === 'fim') {
    const minutosFeitos = Math.round(decorrido.current / 60);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--tinta)] px-6 text-center text-[var(--papel)]">
        <div className="text-7xl">{valeu ? '🏆' : '⏭️'}</div>
        <h1 className="mt-4 text-3xl font-extrabold">{valeu ? 'Treino concluído!' : 'Treino encerrado'}</h1>
        <p className="mt-2 opacity-75">{treino.nome}</p>
        <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-3xl font-extrabold">{minutosFeitos}</div>
            <div className="text-sm opacity-70">{minutosFeitos === 1 ? 'minuto' : 'minutos'} de exercício</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-3xl font-extrabold">{totalEx}</div>
            <div className="text-sm opacity-70">exercícios</div>
          </div>
        </div>
        {!valeu && <p className="mt-6 max-w-xs text-sm opacity-80">Como a maior parte dos exercícios foi pulada, este treino não entrou no histórico.</p>}
        {valeu && programa && <p className="mt-6 font-semibold text-[var(--vermelho-claro)]">Dia {programa.dia} do programa marcado como feito ✓</p>}
        <p className="mt-6 max-w-xs text-sm opacity-70">Beba água e respire fundo. A constância é o que transforma o corpo.</p>
        <button onClick={() => nav.voltar()} className="mt-8 w-full max-w-sm rounded-2xl bg-[var(--vermelho)] py-4 text-lg font-bold text-white">
          Concluir
        </button>
      </div>
    );
  }

  const ehDescanso = fase === 'rodando' && etapa.tipo === 'descanso';
  const titulo = fase === 'preparo' ? 'Prepare-se' : ehDescanso ? 'Descanso' : ex.nome;
  const R = 110;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={`flex min-h-dvh flex-col text-[var(--papel)] transition-colors duration-500 ${
        ehDescanso || fase === 'preparo' ? 'bg-[#1d3b34]' : 'bg-[var(--tinta)]'
      }`}
      onPointerDown={desbloquearAudio}
    >
      {/* Topo */}
      <div className="flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button onClick={sair} aria-label="Sair" className="rounded-full p-2 active:bg-white/10">
          <X size={24} />
        </button>
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[var(--vermelho)] transition-[width] duration-300" style={{ width: `${progressoGeral * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs opacity-70">
            <span>
              Exercício {Math.max(1, ordemAtual)}/{totalEx}
            </span>
            {etapa.volta && fase === 'rodando' && (
              <span>
                Volta {etapa.volta}/{etapa.totalVoltas}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => { setVoz(!voz); if (voz) calar(); }} aria-label="Voz" className="rounded-full p-2 active:bg-white/10">
          {voz ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
      </div>

      {/* Centro */}
      <div className="flex flex-1 flex-col items-center px-6 pt-4">
        <div className="text-center text-sm font-semibold uppercase tracking-widest opacity-70">
          {fase === 'preparo' || ehDescanso ? 'A seguir' : ex.estilo ?? ex.origem}
        </div>
        <h1 className="mt-1 text-center text-2xl font-extrabold leading-tight">{fase === 'preparo' || ehDescanso ? ex.nome : titulo}</h1>
        {(fase === 'preparo' || ehDescanso) && <div className="mt-1 text-lg font-bold text-[var(--vermelho-claro)]">{titulo}</div>}

        <div className="relative mt-5 h-64 w-64">
          <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
            <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
            <circle
              cx="120"
              cy="120"
              r={R}
              fill="none"
              stroke={ehDescanso || fase === 'preparo' ? '#7fd1b9' : 'var(--vermelho)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fracao)}
              style={{ transition: 'stroke-dashoffset .25s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl">{ex.emoji}</div>
            <div className="mt-1 font-mono text-5xl font-bold tabular-nums">{formatarTempo(Math.ceil(restante))}</div>
            {pausado && <div className="mt-1 text-sm font-bold uppercase tracking-widest opacity-70">Pausado</div>}
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-5 w-full max-w-md rounded-2xl bg-white/[0.07] p-4">
          <button onClick={() => setVerPassos(!verPassos)} className="flex w-full items-center justify-between text-left text-sm font-bold">
            Como fazer {verPassos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {verPassos ? (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed opacity-90">
              {ex.passos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-1.5 line-clamp-2 text-sm opacity-80">{ex.dica}</p>
          )}
          {ex.unilateral && <p className="mt-2 text-xs font-semibold text-[var(--vermelho-claro)]">↔ Troque de lado na metade do tempo</p>}
        </div>

        {!ehDescanso && fase === 'rodando' && proximoEx && (
          <div className="mt-3 text-sm opacity-60">
            Próximo: {proximoEx.emoji} {proximoEx.nome}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-6 px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-4">
        <button onClick={recuar} aria-label="Anterior" className="rounded-full p-4 active:bg-white/10 disabled:opacity-30" disabled={fase !== 'rodando'}>
          <SkipBack size={28} />
        </button>
        <button
          onClick={() => {
            desbloquearAudio();
            setPausado(!pausado);
            if (!pausado) calar();
          }}
          aria-label={pausado ? 'Continuar' : 'Pausar'}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--papel)] text-[var(--tinta)] active:scale-95"
        >
          {pausado ? <Play size={34} fill="currentColor" /> : <Pause size={34} fill="currentColor" />}
        </button>
        <button onClick={avancar} aria-label="Pular" className="rounded-full p-4 active:bg-white/10">
          <SkipForward size={28} />
        </button>
      </div>
    </div>
  );
}
