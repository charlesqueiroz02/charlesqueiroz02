import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Rótulo da área protegida, mostrado na mensagem (ex.: "Radar"). */
  area?: string;
  /** Quando muda, o erro é limpo (ex.: troca de aba). */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Proteção contra erros: um erro numa tela não derruba o app inteiro (antes: tela branca).
 * Mostra uma mensagem amigável e permite tentar de novo.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro capturado pela proteção de tela:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="my-6 p-6 bg-white border border-amber-200 rounded-xl text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h2 className="font-semibold text-slate-800">
          Algo deu errado{this.props.area ? ` em ${this.props.area}` : ''}.
        </h2>
        <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
          O restante do app continua funcionando. Tente de novo; se o problema persistir, recarregue a página.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            <RotateCcw className="w-4 h-4" /> Tentar de novo
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
