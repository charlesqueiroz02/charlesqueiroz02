import { BarChart3, Dices, Dumbbell, Home, ListChecks } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ajustes } from './components/Ajustes';
import { ExercicioDetalhe } from './components/ExercicioDetalhe';
import { Exercicios } from './components/Exercicios';
import { Gerador } from './components/Gerador';
import { Inicio } from './components/Inicio';
import { Player } from './components/Player';
import { ProgramaDetalhe } from './components/ProgramaDetalhe';
import { Progresso } from './components/Progresso';
import { TreinoDetalhe } from './components/TreinoDetalhe';
import { Treinos } from './components/Treinos';
import { useEstado } from './lib/armazenamento';
import type { Objetivo, Treino } from './lib/tipos';

export type Aba = 'inicio' | 'treinos' | 'gerador' | 'exercicios' | 'progresso';
export type RefPrograma = { id: string; dia: number };

export type Tela =
  | { nome: Aba; objetivo?: Objetivo }
  | { nome: 'treino'; treino: Treino; programa?: RefPrograma }
  | { nome: 'exercicio'; id: string }
  | { nome: 'player'; treino: Treino; programa?: RefPrograma }
  | { nome: 'programa'; id: string }
  | { nome: 'ajustes' };

export interface Navegacao {
  ir: (t: Tela) => void;
  voltar: () => void;
  aba: (a: Aba, objetivo?: Objetivo) => void;
}

const ABAS: { id: Aba; nome: string; Icone: typeof Home }[] = [
  { id: 'inicio', nome: 'Início', Icone: Home },
  { id: 'treinos', nome: 'Treinos', Icone: ListChecks },
  { id: 'gerador', nome: 'Gerador', Icone: Dices },
  { id: 'exercicios', nome: 'Exercícios', Icone: Dumbbell },
  { id: 'progresso', nome: 'Progresso', Icone: BarChart3 },
];

export default function App() {
  const loja = useEstado();
  const [pilha, setPilha] = useState<Tela[]>([{ nome: 'inicio' }]);
  const tela = pilha[pilha.length - 1];
  const rolagem = useRef<Record<number, number>>({});

  const ir = useCallback((t: Tela) => {
    rolagem.current[pilha.length - 1] = window.scrollY;
    setPilha((p) => [...p, t]);
    try {
      history.pushState({ n: pilha.length }, '');
    } catch {
      /* ignora */
    }
    window.scrollTo(0, 0);
  }, [pilha.length]);

  const voltar = useCallback(() => {
    if (pilha.length > 1) history.back();
  }, [pilha.length]);

  const aba = useCallback((a: Aba, objetivo?: Objetivo) => {
    setPilha([{ nome: a, objetivo }]);
    window.scrollTo(0, 0);
  }, []);

  // Botão "voltar" do navegador / Android
  useEffect(() => {
    const onPop = () => {
      setPilha((p) => {
        if (p.length <= 1) return p;
        const nova = p.slice(0, -1);
        const y = rolagem.current[nova.length - 1] ?? 0;
        requestAnimationFrame(() => window.scrollTo(0, y));
        return nova;
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav: Navegacao = { ir, voltar, aba };
  const abaAtual = ABAS.find((a) => a.id === tela.nome)?.id;

  if (tela.nome === 'player') {
    return <Player treino={tela.treino} programa={tela.programa} loja={loja} nav={nav} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-[calc(env(safe-area-inset-bottom)+80px)]">
      {tela.nome === 'inicio' && <Inicio loja={loja} nav={nav} />}
      {tela.nome === 'treinos' && <Treinos key={'objetivo' in tela ? tela.objetivo ?? 'todos' : 'todos'} loja={loja} nav={nav} objetivoInicial={'objetivo' in tela ? tela.objetivo : undefined} />}
      {tela.nome === 'gerador' && <Gerador loja={loja} nav={nav} />}
      {tela.nome === 'exercicios' && <Exercicios nav={nav} />}
      {tela.nome === 'progresso' && <Progresso loja={loja} nav={nav} />}
      {tela.nome === 'treino' && <TreinoDetalhe treino={tela.treino} programa={tela.programa} loja={loja} nav={nav} />}
      {tela.nome === 'exercicio' && <ExercicioDetalhe id={tela.id} nav={nav} />}
      {tela.nome === 'programa' && <ProgramaDetalhe id={tela.id} loja={loja} nav={nav} />}
      {tela.nome === 'ajustes' && <Ajustes loja={loja} nav={nav} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--linha)] bg-[var(--cartao)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {ABAS.map(({ id, nome, Icone }) => {
            const ativo = abaAtual === id;
            return (
              <button
                key={id}
                onClick={() => aba(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  ativo ? 'text-[var(--vermelho)]' : 'text-[var(--tinta-2)]'
                }`}
              >
                <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} />
                {nome}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
