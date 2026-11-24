import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function Cabecalho({ titulo, voltar, acao }: { titulo: string; voltar?: () => void; acao?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-[var(--papel)]/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)] backdrop-blur">
      {voltar && (
        <button onClick={voltar} aria-label="Voltar" className="-ml-2 rounded-full p-2 active:bg-black/5">
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className="flex-1 truncate text-xl font-bold tracking-tight">{titulo}</h1>
      {acao}
    </header>
  );
}

export function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        ativo
          ? 'border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]'
          : 'border-[var(--linha)] bg-[var(--cartao)] text-[var(--tinta)] active:bg-black/5'
      }`}
    >
      {children}
    </button>
  );
}

export function Selo({ children, cor = 'neutro' }: { children: ReactNode; cor?: 'neutro' | 'vermelho' | 'verde' }) {
  const cls =
    cor === 'vermelho'
      ? 'bg-[var(--vermelho)]/10 text-[var(--vermelho)]'
      : cor === 'verde'
        ? 'bg-emerald-600/10 text-emerald-700'
        : 'bg-black/5 text-[var(--tinta-2)]';
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between px-4">
        <h2 className="text-base font-bold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function LinhaRolavel({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">{children}</div>;
}

export function BotaoPrincipal({
  children,
  onClick,
  variante = 'vermelho',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'vermelho' | 'tinta' | 'contorno';
  className?: string;
}) {
  const v =
    variante === 'vermelho'
      ? 'bg-[var(--vermelho)] text-white shadow-lg shadow-[var(--vermelho)]/25'
      : variante === 'tinta'
        ? 'bg-[var(--tinta)] text-[var(--papel)]'
        : 'border border-[var(--linha)] bg-[var(--cartao)] text-[var(--tinta)]';
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold transition active:scale-[0.98] ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Nivel({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-end gap-0.5" aria-label={`Nível ${n}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${i <= n ? 'bg-[var(--vermelho)]' : 'bg-black/15'}`}
          style={{ height: 4 + i * 3 }}
        />
      ))}
    </span>
  );
}
