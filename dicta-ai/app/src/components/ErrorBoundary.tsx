import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Último recurso: se algum componente lançar erro ao renderizar, mostra uma
 * tela de recuperação em vez de deixar o app em branco.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro na interface do Dicta:', error, info.componentStack);
  }

  private resetHistory = () => {
    try {
      localStorage.removeItem('dicta_history');
    } catch {}
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-[#090A0F] text-zinc-100">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-lg font-bold">Algo deu errado</h1>
          <p className="text-sm text-zinc-400">
            O Dicta encontrou um erro inesperado. Seus dados continuam salvos no aparelho.
          </p>
          <p className="text-xs text-zinc-500 break-words">{this.state.error.message}</p>
          <button
            onClick={() => location.reload()}
            className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold"
          >
            Recarregar o app
          </button>
          <button
            onClick={this.resetHistory}
            className="w-full py-2.5 rounded-xl border border-rose-500/40 text-rose-300 text-xs font-semibold"
          >
            Se o erro continuar: apagar só o histórico e recarregar
          </button>
        </div>
      </div>
    );
  }
}
