import React from 'react';
import {
  MicOff,
  X,
  Play,
  Lock,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryDemo: () => void;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onTryDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <MicOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Como Liberar o Microfone
              </h3>
              <p className="text-xs text-zinc-400">
                O navegador bloqueou a captura de áudio para este site
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              O navegador precisa da sua autorização para ouvir sua voz e enviar para a IA do Dicta.
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>No Google Chrome, Edge ou Brave (Computador):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1 leading-relaxed">
                <li>Clique no ícone de <strong>cadeado</strong> ou <strong>ajustes</strong> à esquerda da barra de endereço (onde fica o link).</li>
                <li>Ative a opção <strong>Microfone</strong> (mude para <em>Permitir</em>).</li>
                <li>Recarregue a página para começar a falar.</li>
              </ol>
            </div>

            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>No Celular (Android / iOS):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1 leading-relaxed">
                <li>Toque no ícone de microfone ou configurações no topo do navegador.</li>
                <li>Verifique se o microfone não está bloqueado nas configurações do sistema do aparelho.</li>
                <li>Permita o acesso nesta sessão.</li>
              </ol>
            </div>
          </div>

          <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-2">
            <div className="font-bold text-purple-200 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400" />
              <span>Deseja testar sem microfone agora?</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Você pode usar nossa simulação de voz realista para experimentar a transcrição com IA e a eliminação de vícios de fala sem precisar do microfone.
            </p>
            <button
              onClick={() => {
                onClose();
                onTryDemo();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar Demonstração de Voz Simulada</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recarregar página após permitir</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
