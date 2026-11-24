import type { Navegacao } from '../App';
import type { Loja } from '../lib/armazenamento';
import { falar } from '../lib/audio';
import { Cabecalho, Chip, LinhaRolavel } from './ui';

function Interruptor({ ligado, onChange, rotulo, descricao }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; descricao: string }) {
  return (
    <button onClick={() => onChange(!ligado)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="flex-1">
        <span className="block font-semibold">{rotulo}</span>
        <span className="block text-sm text-[var(--tinta-2)]">{descricao}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${ligado ? 'bg-[var(--vermelho)]' : 'bg-black/15'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Ajustes({ loja, nav }: { loja: Loja; nav: Navegacao }) {
  const a = loja.estado.ajustes;
  return (
    <div>
      <Cabecalho titulo="Ajustes" voltar={nav.voltar} />
      <div className="mx-4 divide-y divide-[var(--linha)] overflow-hidden rounded-2xl border border-[var(--linha)] bg-[var(--cartao)]">
        <Interruptor
          ligado={a.voz}
          onChange={(v) => {
            loja.atualizarAjustes({ voz: v });
            if (v) falar('Voz ativada.');
          }}
          rotulo="Instrutor por voz"
          descricao="Anuncia cada exercício, descanso e troca de lado."
        />
        <Interruptor ligado={a.bipes} onChange={(v) => loja.atualizarAjustes({ bipes: v })} rotulo="Bipes" descricao="Contagem regressiva nos 3 últimos segundos." />
      </div>

      <h2 className="mb-2 mt-6 px-4 font-bold">Tempo de preparação</h2>
      <LinhaRolavel>
        {[5, 10, 15, 20].map((s) => (
          <Chip key={s} ativo={a.preparo === s} onClick={() => loja.atualizarAjustes({ preparo: s })}>{s} segundos</Chip>
        ))}
      </LinhaRolavel>

      <h2 className="mb-2 mt-6 px-4 font-bold">Descanso entre exercícios</h2>
      <LinhaRolavel>
        {[
          [0.5, 'Curto (½)'],
          [1, 'Normal'],
          [1.5, 'Longo (1,5×)'],
          [2, 'Bem longo (2×)'],
        ].map(([v, n]) => (
          <Chip key={v} ativo={a.ritmoDescanso === v} onClick={() => loja.atualizarAjustes({ ritmoDescanso: v as number })}>{n}</Chip>
        ))}
      </LinhaRolavel>

      <div className="mx-4 mt-8 rounded-2xl border border-[var(--linha)] bg-[var(--cartao)] p-4 text-sm leading-relaxed text-[var(--tinta-2)]">
        <p className="font-semibold text-[var(--tinta)]">Seus dados ficam só neste aparelho.</p>
        <p className="mt-1">O app funciona offline e não envia nada para a internet.</p>
        <button
          onClick={() => confirm('Apagar todo o histórico, favoritos e progresso dos programas?') && loja.apagarTudo()}
          className="mt-3 font-semibold text-[var(--vermelho)]"
        >
          Apagar todos os dados
        </button>
      </div>
      <p className="px-6 pt-6 text-center text-xs text-[var(--tinta-2)]">Calistenia Asiática · versão 1.0.0</p>
    </div>
  );
}
