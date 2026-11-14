import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { RegistrationFlow } from './RegistrationFlow';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'register' | 'login' | 'profile';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'register',
  onSuccess
}) => {
  // Trava a rolagem da página de fundo enquanto o modal está aberto
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Corrigido: antes o conteúdo era centralizado com flex e o topo ficava fora da tela no celular.
    // Agora a camada externa rola e o conteúdo começa no topo; no desktop continua centralizado.
    <div className="fixed inset-0 z-[70] bg-zinc-900/40 backdrop-blur-xs overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="min-h-full flex items-start sm:items-center justify-center px-3 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="relative w-full max-w-3xl sm:my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:-top-3 sm:-right-3 z-10 p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-full shadow-lg border border-zinc-700 transition-colors"
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <RegistrationFlow
          initialMode={initialMode}
          onClose={onClose}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            // Optional delay before closing modal on success
            setTimeout(() => onClose(), 800);
          }}
        />
      </div>
      </div>
    </div>
  );
};
