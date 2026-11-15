import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes do Tailwind resolvendo conflitos (antes copiado em 3 componentes). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Escapa caracteres especiais para usar texto digitado dentro de uma RegExp. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Formata número com segurança (NaN/Infinity viram "0.00"). */
export const safeToFixed = (val: unknown, decimals = 2): string => {
  const n = Number(val);
  if (val === undefined || val === null || !isFinite(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
};
