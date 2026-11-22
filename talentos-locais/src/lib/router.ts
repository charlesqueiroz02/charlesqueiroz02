import { useEffect, useState } from 'react';

/** Roteador por hash: funciona em hospedagem estática e como PWA. */
export function useRoute() {
  // Guarda o hash completo (com ?query) para que buscas novas na mesma tela re-renderizem.
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => {
      setHash(location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return (hash.replace(/^#/, '') || '/').split('?')[0]!;
}

export const go = (path: string) => {
  location.hash = path;
};

export const query = () => new URLSearchParams(location.hash.split('?')[1] ?? '');

export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.startsWith(':')) out[a[i]!.slice(1)] = decodeURIComponent(b[i]!);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}
