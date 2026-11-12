import { useEffect, useRef } from 'react';

/**
 * Comportamento acessível comum aos modais/gavetas:
 * - Esc fecha;
 * - ao abrir, o foco vai para o diálogo (leitores de tela anunciam o título);
 * - ao fechar, o foco volta para o elemento que abriu.
 * Chame antes de qualquer `return null` do componente.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen]);

  return ref;
}
