export interface TextPart {
  text: string;
  isFiller: boolean;
}

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divide o texto marcando os vícios de linguagem removidos pela IA.
 * Usa limites de palavra Unicode: o \b do JavaScript só entende ASCII, então
 * "né" ou "ééé" nunca eram destacados.
 */
export function splitFillers(text: string, fillers: string[]): TextPart[] {
  const words = [...new Set(fillers.map((f) => f.trim()).filter(Boolean))]
    // os mais longos primeiro: "tipo assim" antes de "tipo"
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  if (!text) return [];
  if (!words.length) return [{ text, isFiller: false }];

  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${words.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: text.slice(last, i), isFiller: false });
    parts.push({ text: m[0], isFiller: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isFiller: false });
  return parts;
}
